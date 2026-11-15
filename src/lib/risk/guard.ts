import { canonical, claimsDiagnosis, gap, givesTreatmentAdvice, isInLanguage, isPlainText, phrase } from "../ai/guard";
import type { Effect } from "../content/v2-types";
import { modelAuditSchema, modelItemSchema, modelOverallSchema, tierStrength, type Language, type ModelAudit, type ModelItem, type ModelOverall, type Tier } from "./types";

// The model is never trusted with a tier. What it returns is checked here against the passages it was given, and a reply that
// fails any check is thrown away (docs/design-v2.md section 6.4). The rules of the tiers are enforced by this code, not by
// the prompt: a passage or an interview answer that tells the model to give a tier cannot get one, because a raised or high
// tier needs a finding that cites a supplied passage of the right strength. The patterns are a backstop and err on the side
// of refusing: a refused reply costs one more try, never a wrong sentence on a person's screen.

export type Verdict<T> = { ok: true; value: T } | { ok: false; reason: string };
export type SuppliedPassage = { id: string; effect: Effect | null; text: string; heading?: string };

const ok = <T>(value: T): Verdict<T> => ({ ok: true, value });
const refuse = (reason: string): Verdict<never> => ({ ok: false, reason });

export const limits = {
  findings: 8, title: [3, 80], findingText: [10, 400], why: [10, 400], brief: [3, 80], tips: 3, tip: [10, 300], citations: 4,
  line: [10, 260], basis: [10, 500], drivers: 6, issue: [5, 300],
} as const;
const within = (text: string, [min, max]: readonly number[]) => text.length >= min && text.length <= max;

// ----------------------------------------------------------------------------------------------------- text checks

/** Medicine and treatment words. A model-written text may not use them, unless a passage it cites says the same word. */
const medicine = new RegExp(
  "(?<![\\p{L}\\p{N}])(?:medicin\\p{L}*|medication\\p{L}*|drugs?|pills?|tablets?|capsules?|dose\\p{L}*|dosage|treatment\\p{L}*|therap\\p{L}*|chemo\\p{L}*|radiation|surgery|surgical|prescri\\p{L}*|lääke\\p{L}*|lääkit\\p{L}*|lääkk\\p{L}*|hoito\\p{L}*|hoida\\p{L}*|leikkau\\p{L}*|annos\\p{L}*|annostu\\p{L}*|resepti\\p{L}*)(?![\\p{L}\\p{N}])", "giu");

const extraClaims = [
  phrase("you\\s+(?:will|are going to|'ll|shall)\\s+(?:definitely\\s+|certainly\\s+|probably\\s+|surely\\s+)?(?:get|develop|have|suffer from|be diagnosed)"),
  phrase("you\\s+have\\s+cancer"),
  phrase("you\\s+(?:are|'re)\\s+going\\s+to\\s+get"),
  phrase("tulet\\s+" + gap(2) + "(?:saamaan|sairastumaan)|sairastut|saat\\s+(?:varmasti\\s+)?syövän"),
  phrase("harmless|nothing serious|not serious|no cause for concern|nothing to be concerned about|vaaraton\\p{L}*|ei ole vakava\\p{L}*"),
  phrase("certain to|bound to|guaranteed|destined|sure to get"),
];
// An instruction that was written for a model and has been echoed back, or the model speaking about itself.
const injected = [
  phrase("ignore\\s+(?:all\\s+|any\\s+|the\\s+|your\\s+)?(?:previous|earlier|above|prior)?\\s*(?:instructions|rules|prompt)"),
  phrase("system prompt|as an ai|language model|jailbreak|developer mode|new instructions"),
  phrase("unohda\\s+(?:kaikki\\s+)?(?:aiemmat\\s+)?(?:ohjeet|säännöt)|järjestelmäkehote"),
];

// Numbers: written in digits or in common words, compared by value.
const numberWords: Record<string, string> = {
  two: "2", twice: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", hundred: "100", thousand: "1000",
  kaksi: "2", kahden: "2", kolme: "3", kolmen: "3", neljä: "4", neljän: "4", viisi: "5", viiden: "5", kuusi: "6", kuuden: "6", seitsemän: "7",
  kahdeksan: "8", yhdeksän: "9", kymmenen: "10", sata: "100", tuhat: "1000",
};
const wordNumber = new RegExp("(?<![\\p{L}\\p{N}])(?:" + Object.keys(numberWords).join("|") + ")(?![\\p{L}\\p{N}])", "giu");
const numbersIn = (text: string) => {
  const found = new Set((text.match(/\d+(?:[.,]\d+)?/g) ?? []).map(number => number.replace(",", ".")));
  for (const word of text.match(wordNumber) ?? []) found.add(numberWords[word.toLowerCase()]);
  return found;
};
const noNumbers: ReadonlySet<string> = new Set();
/** The numbers written in the person's own facts (age, years smoked, days a week). A justification may repeat them. */
export const numbersOfFacts = (facts: unknown): ReadonlySet<string> => numbersIn(JSON.stringify(facts) ?? "");
// "5 %", "5 times", "tenfold", "2 in 10", "x-fold", "kertaa": ways to put a figure on a risk.
const riskFigure = phrase("\\d+(?:[.,]\\d+)?\\s*(?:%|per\\s*cent|percent|x|times|-?\\s*fold|kertaa|kertainen|kertaisen|prosenttia|prosentin)|\\d+\\s+(?:in|out of)\\s+\\d+|(?:one|two|three|four|five|ten)(?:\\s+|-)?(?:times|fold)|twice|double[sd]?|triple[sd]?|tenfold|kaksinkertai\\p{L}*|moninkertai\\p{L}*|%");
const aboutYou = phrase("you|your|yours|you're|you've|sinä|sinun|sinulla|sinua|sinut|sinulle|olet|oletko");

/**
 * The first problem with the texts a model wrote, or null. `cited` is what the texts may quote: the passages they cite.
 * Numbers must be written in a cited passage, and a figure of risk is never said about the person.
 */
export function textProblem(texts: readonly string[], language: Language, cited: readonly SuppliedPassage[], quoteMedicine = true, personNumbers: ReadonlySet<string> = noNumbers): string | null {
  const checked = texts.map(canonical);
  if (!checked.every(isPlainText)) return "format";
  if (!isInLanguage(checked.join(" "), language)) return "language";
  const quoted = canonical(cited.map(passage => passage.text + " " + (passage.heading ?? "")).join(" ")).toLowerCase();
  const knownNumbers = numbersIn(quoted);
  for (const text of checked) {
    if (claimsDiagnosis(text) || givesTreatmentAdvice(text) || extraClaims.some(pattern => pattern.test(text)) || injected.some(pattern => pattern.test(text))) return "unsafe";
    for (const word of text.match(medicine) ?? []) if (!quoteMedicine || !quoted.includes(word.toLowerCase())) return "unsafe";
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const numbers = numbersIn(sentence);
      if (numbers.size === 0 && !riskFigure.test(sentence)) continue;
      // A number must be written in a cited passage. The person's own numbers (age, years smoked, days a week) are allowed too,
      // but never as a figure of risk: a sentence with a percentage, a multiple or "n in m" can only quote a passage.
      const unquoted = [...numbers].filter(number => !knownNumbers.has(number));
      if (unquoted.length > 0 && (riskFigure.test(sentence) || unquoted.some(number => !personNumbers.has(number)))) return "number";
      if (riskFigure.test(sentence) && aboutYou.test(sentence)) return "number";
    }
  }
  return null;
}

// ------------------------------------------------------------------------------------------------------ one type

const strongEffects: ReadonlySet<Effect | null> = new Set(["large", "very-large"]);
const countingEffects: ReadonlySet<Effect | null> = new Set(["moderate", "large", "very-large"]);
const anyRaise: ReadonlySet<Effect | null> = new Set(["small", "moderate", "large", "very-large"]);

export type CheckedItem = ModelItem;

/** Checks the model's reply for one cancer type against the passages it was given. */
export function validateItem(raw: unknown, input: { language: Language; passages: readonly SuppliedPassage[]; personNumbers?: ReadonlySet<string> }): Verdict<CheckedItem> {
  const shape = modelItemSchema.safeParse(raw);
  if (!shape.success) return refuse("shape");
  const item = shape.data;
  const supplied = new Map(input.passages.map(passage => [passage.id, passage]));
  const why = item.why.trim(), brief = item.brief.trim();
  if (!within(why, limits.why) || !within(brief, limits.brief) || (why.match(/[.!?](?:\s|$)/g)?.length ?? 0) > 3) return refuse("length");
  if (item.findings.length > limits.findings || item.tips.length > limits.tips) return refuse("length");
  const findings = item.findings.map(finding => ({ ...finding, title: finding.title.trim(), text: finding.text.trim() }));
  for (const finding of findings) {
    if (!within(finding.title, limits.title) || !within(finding.text, limits.findingText)) return refuse("length");
    if (finding.citations.length > limits.citations || new Set(finding.citations).size !== finding.citations.length) return refuse("citation");
    if (finding.citations.some(id => !supplied.has(id))) return refuse("citation");
    if ((finding.direction === "up" || finding.direction === "down") && finding.citations.length === 0) return refuse("citation");
  }
  const tips = item.tips.map(tip => tip.trim());
  if (tips.some(tip => !within(tip, limits.tip))) return refuse("length");

  // The rules of the tiers. A raised or high tier must rest on up findings that cite statements of the right strength.
  const up = findings.filter(finding => finding.direction === "up");
  const effectsOf = (finding: (typeof findings)[number]) => finding.citations.map(id => supplied.get(id)!.effect);
  const strong = up.some(finding => effectsOf(finding).some(effect => strongEffects.has(effect)));
  const moderate = up.some(finding => effectsOf(finding).some(effect => countingEffects.has(effect)));
  const smallOnes = new Set(up.flatMap(finding => finding.citations.filter(id => anyRaise.has(supplied.get(id)!.effect))));
  if (item.tier === "high" && !strong) return refuse("tier");
  if (item.tier === "raised" && !(moderate || smallOnes.size >= 2)) return refuse("tier");

  const cited = [...new Set(findings.flatMap(finding => finding.citations))].map(id => supplied.get(id)!);
  const problem = textProblem([why, brief, ...findings.flatMap(finding => [finding.title, finding.text])], input.language, cited, true, input.personNumbers)
    ?? textProblem(tips, input.language, input.passages, false);
  if (problem) return refuse(problem);
  return ok({ ...item, why, brief, findings, tips });
}

// ------------------------------------------------------------------------------------------------------- overall

/** Checks the model's overall reply against the finished items of the types. */
export function validateOverall(raw: unknown, input: { language: Language; items: readonly { cancer: string; tier: Tier }[]; factorKeys: readonly string[]; personNumbers?: ReadonlySet<string> }): Verdict<ModelOverall> {
  const shape = modelOverallSchema.safeParse(raw);
  if (!shape.success) return refuse("shape");
  const overall = { ...shape.data, line: shape.data.line.trim(), basis: shape.data.basis.trim() };
  if (!within(overall.line, limits.line) || !within(overall.basis, limits.basis) || overall.drivers.length > limits.drivers) return refuse("length");
  const strengths = input.items.map(item => tierStrength[item.tier]);
  const highest = Math.max(0, ...strengths);
  // At least as high as the highest tier of a type. Higher only when several types share it and together add up, and then by one step.
  if (tierStrength[overall.tier] < highest || (highest === 0 && overall.tier !== "unknown")) return refuse("overall");
  if (tierStrength[overall.tier] > highest && (tierStrength[overall.tier] > highest + 1 || strengths.filter(strength => strength === highest).length < 2)) return refuse("overall");
  const types = new Map(input.items.map(item => [item.cancer, item.tier]));
  for (const driver of overall.drivers) {
    if (!input.factorKeys.includes(driver.factor) || driver.cancers.length === 0 || driver.cancers.some(cancer => !types.has(cancer))) return refuse("driver");
  }
  if (overall.tier === "raised" || overall.tier === "high") {
    const driving = overall.drivers.flatMap(driver => driver.cancers);
    if (overall.drivers.length === 0 || driving.some(cancer => types.get(cancer) !== "raised" && types.get(cancer) !== "high")) return refuse("driver");
  }
  const problem = textProblem([overall.line, overall.basis], input.language, [], true, input.personNumbers);
  return problem ? refuse(problem) : ok(overall);
}

// --------------------------------------------------------------------------------------------------------- audit

export type CheckedAudit = { clean: boolean; issues: { cancer: string; issue: string }[] };

/** Checks the audit reply. The issue texts go back to a model as data, so they must be short, plain and in order. */
export function validateAudit(raw: unknown, input: { typeIds: readonly string[] }): Verdict<CheckedAudit> {
  const shape = modelAuditSchema.safeParse(raw);
  if (!shape.success) return refuse("shape");
  const audit: ModelAudit = shape.data;
  if (audit.issues.length > 8) return refuse("length");
  const issues: CheckedAudit["issues"] = [];
  for (const entry of audit.issues) {
    const issue = canonical(entry.issue).replace(/\s+/g, " ").trim();
    if (!within(issue, limits.issue) || !isPlainText(issue) || injected.some(pattern => pattern.test(issue))) continue;
    if (entry.cancer !== "overall" && !input.typeIds.includes(entry.cancer)) continue;
    issues.push({ cancer: entry.cancer, issue });
  }
  return ok({ clean: audit.ok && audit.issues.length === 0, issues });
}
