import { z } from "zod";
import type { AnswerLanguage, SourcePassage } from "./prompt";

// The model is never trusted. Whatever it returns is checked here against the passages it was given, and an answer that
// fails any check is thrown away: the caller then shows the reviewed passages instead. Each check says why it exists.
// The claim patterns are a backstop for the instructions in prompt.ts, not a complete list, and they err on the side of
// rejecting: a rejected answer costs the person nothing, because the reviewed passages are shown instead.

export type Answer = { answerable: boolean; answer: string; citations: string[]; followUps: string[] };
/**
 * Why an answer was thrown away: it is not the agreed shape, it is not grounded in the passages, it makes a claim a
 * model must not make, or it is not plain text of the right length and language.
 */
export type Rejection = "invalid-json" | "ungrounded" | "unsafe-claim" | "bad-format";
export type Verdict = { ok: true; answer: Answer } | { ok: false; reason: Rejection };

// Why: an empty reply or a wall of text is not a short answer, and the length limit also keeps the pattern checks cheap.
const answerLength = { min: 20, max: 900 };
const followUpLength = { min: 5, max: 90 };
const maxCitations = 6;
const maxFollowUps = 3;

// Unknown keys are rejected, so the model cannot carry anything else through. Follow-ups are checked one by one further
// down, because a bad suggestion should not cost the whole answer.
const answerShape = z.object({
  answerable: z.boolean(),
  answer: z.string(),
  citations: z.array(z.string()),
  followUps: z.array(z.unknown()),
}).strict();

/** The JSON Schema the provider is asked to follow. Citations may only be ids that were supplied. */
export function answerJsonSchema(passageIds: readonly string[]) {
  return {
    type: "object",
    properties: {
      answerable: { type: "boolean" },
      answer: { type: "string" },
      citations: { type: "array", items: { type: "string", enum: [...passageIds] }, maxItems: maxCitations },
      followUps: { type: "array", items: { type: "string" }, maxItems: maxFollowUps },
    },
    required: ["answerable", "answer", "citations", "followUps"],
    additionalProperties: false,
  };
}

/**
 * The text as the checks read it: compatibility forms folded (full-width digits, ligatures), invisible characters
 * removed and curly apostrophes made straight, so that none of them can hide a number, a link or a claim.
 */
export const canonical = (text: string) => text.normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/[\u2018\u2019\u02bc]/g, "'");

// Whole-word patterns. \b does not count letters such as ä and ö as word characters, so the boundaries are spelled out.
export const phrase = (source: string) => new RegExp("(?<![\\p{L}\\p{N}])(?:" + source + ")(?![\\p{L}\\p{N}])", "iu");
// Up to this many words in between.
export const gap = (max: number) => "(?:\\p{L}+\\s+){0," + max + "}";
// The same, but never a preposition or "and": "you have a rare cancer" is a claim, "you have questions about cancer" is not.
const modifiers = (max: number) => "(?:(?!(?:about|of|for|with|from|on|in|regarding|concerning|and|or|to|than|that)(?![\\p{L}]))\\p{L}+\\s+){0," + max + "}";

/** A use of validateAnswer that needs more room, or refuses more: the length it allows, and patterns that make an answer unsafe. */
export type AnswerRules = { maxLength?: number; refuse?: readonly RegExp[] };

/**
 * Checks what the model returned against the passages it was given. An accepted answer is trimmed and its follow-ups are
 * cleaned; a rejected one says why. An answer with answerable false is accepted only as a plain, empty refusal.
 */
export function validateAnswer(raw: unknown, passages: readonly SourcePassage[], language: AnswerLanguage, rules: AnswerRules = {}): Verdict {
  const shape = answerShape.safeParse(raw);
  if (!shape.success) return reject("invalid-json");
  const { answerable, citations } = shape.data;
  const text = shape.data.answer.trim();
  const followUps = cleanFollowUps(shape.data.followUps, passages);
  if (!answerable) {
    // Text or citations next to "not answerable" would be an answer that skipped every check below.
    return text === "" && citations.length === 0 ? accept({ answerable: false, answer: "", citations: [], followUps }) : reject("invalid-json");
  }
  const cited = citedPassages(citations, passages);
  if (!cited) return reject("ungrounded");
  if (text.length < answerLength.min || text.length > (rules.maxLength ?? answerLength.max)) return reject("bad-format");
  const checked = canonical(text);
  if (!isPlainText(checked) || !isInLanguage(checked, language)) return reject("bad-format");
  if (claimsDiagnosis(checked) || givesTreatmentAdvice(checked) || rules.refuse?.some(pattern => pattern.test(checked))) return reject("unsafe-claim");
  if (!numbersAreCited(checked, cited)) return reject("ungrounded");
  return accept({ answerable: true, answer: text, citations: [...citations], followUps });
}

const accept = (answer: Answer): Verdict => ({ ok: true, answer });
const reject = (reason: Rejection): Verdict => ({ ok: false, reason });

/**
 * Why: a source is only trustworthy if the reader can see which passages it came from. So at least one citation, each
 * used once, none invented, and no more than six. Returns the cited passages, or null when a citation is not acceptable.
 */
function citedPassages(citations: readonly string[], passages: readonly SourcePassage[]): SourcePassage[] | null {
  if (citations.length === 0 || citations.length > maxCitations || new Set(citations).size !== citations.length) return null;
  const cited = citations.map(id => passages.find(passage => passage.id === id));
  return cited.every((passage): passage is SourcePassage => passage !== undefined) ? cited : null;
}

// Why: the app shows the answer as plain text. Links would send the reader to places nobody reviewed (the reviewed
// sources are shown next to the answer), and markup would appear as stray symbols or, worse, be rendered.
const linkPatterns = [
  /[a-z][a-z0-9+.-]*:\/\/|www\./i,
  /[\p{L}\p{N}-]+\.(?:com|org|net|eu|fi|se|int|gov|edu|info|io|uk)(?![\p{L}\p{N}])/iu,
];
const markupPatterns = [
  /<\/?[a-z][^>]*>|&(?:[a-z]+|#\d+);/i, // HTML tags and entities
  /^\s{0,3}#{1,6}\s/m, // markdown headings
  /^\s*\|.*\|\s*$|^\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+$/m, // markdown tables
  /^\s*(?:-{3,}|={3,}|\*{3,})\s*$/m, // rules and heading underlines
  /\*\*|__|`|\]\(/, // bold, code and markdown links
];
export const isPlainText = (text: string) => ![...linkPatterns, ...markupPatterns].some(pattern => pattern.test(text));

// Why: the reader asked for one language and the claim patterns below know only English and Finnish. Counting common
// words is crude but has no false alarms on short answers: it needs two words of the other language, and more of them.
const commonWords = {
  english: new Set(["the", "and", "of", "to", "is", "are", "in", "for", "with", "you", "your", "can", "may", "that", "this", "it", "be", "from", "about", "have", "not", "or", "by"]),
  finnish: new Set(["ja", "on", "ei", "että", "se", "ovat", "tai", "joka", "voi", "voit", "sinä", "sinun", "mutta", "kun", "jos", "myös", "kanssa", "tämä", "ole", "niin", "kuin", "vain", "sekä"]),
};
export function isInLanguage(text: string, language: AnswerLanguage) {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  const count = (known: ReadonlySet<string>) => words.filter(word => known.has(word)).length;
  const [wanted, other] = language === "fi" ? [count(commonWords.finnish), count(commonWords.english)] : [count(commonWords.english), count(commonWords.finnish)];
  return other < 2 || other <= wanted;
}

// Why: a model that writes "every three years" when the passage says "every two years" has invented a fact. Numbers are
// compared by value, whether written in digits or in words, and a decimal comma equals a decimal point. Names and
// months are not checked here; the instructions and the visible sources cover those.
const numberWords: Record<number, readonly string[]> = {
  2: ["two", "twice", "kaksi", "kahden", "kahta"], 3: ["three", "kolme", "kolmen", "kolmea"], 4: ["four", "neljä", "neljän", "neljää"],
  5: ["five", "viisi", "viiden", "viittä"], 6: ["six", "kuusi", "kuuden", "kuutta"], 7: ["seven", "seitsemän", "seitsemää"],
  8: ["eight", "kahdeksan", "kahdeksaa"], 9: ["nine", "yhdeksän", "yhdeksää"], 10: ["ten", "kymmenen", "kymmentä"],
  11: ["eleven"], 12: ["twelve"], 13: ["thirteen"], 14: ["fourteen"], 15: ["fifteen"], 16: ["sixteen"], 17: ["seventeen"],
  18: ["eighteen"], 19: ["nineteen"], 20: ["twenty"], 30: ["thirty"], 40: ["forty"], 50: ["fifty"], 60: ["sixty"],
  70: ["seventy"], 80: ["eighty"], 90: ["ninety"], 100: ["hundred"], 1000: ["thousand"], 1000000: ["million"],
};
const valueOfWord = new Map(Object.entries(numberWords).flatMap(([value, words]) => words.map(word => [word, value] as const)));
const digitNumber = /\d+(?:[.,]\d+)?/g;
const wordNumber = new RegExp("(?<![\\p{L}\\p{N}])(?:" + [...valueOfWord.keys()].join("|") + ")(?![\\p{L}\\p{N}])", "giu");

function numbersIn(text: string): Set<string> {
  const numbers = new Set((text.match(digitNumber) ?? []).map(number => number.replace(",", ".")));
  for (const word of text.match(wordNumber) ?? []) numbers.add(valueOfWord.get(word.toLowerCase()) ?? word);
  return numbers;
}
const passageContent = (passages: readonly SourcePassage[]) => canonical(passages.map(passage => passage.heading + "\n" + passage.text).join("\n"));
function numbersAreCited(text: string, cited: readonly SourcePassage[]) {
  const known = numbersIn(passageContent(cited));
  return [...numbersIn(text)].every(number => known.has(number));
}

// Why: telling a reader whether they have, or may have, cancer is a diagnosis. That is for a clinician, never for this
// service, whatever the question was. Reassurance such as "nothing to worry about" is a judgement about the reader too.
const cancerEnglish = "\\p{L}*(?:cancer|cancers|cancerous|carcinoma|carcinomas)|tumou?rs?|melanomas?|lymphomas?|leuk(?:a)?emia|malignan(?:t|cy)";
const cancerFinnish = "\\p{L}*(?:syöpä|syöpää|syöpään|syöpiä|syövän)|kasvain(?:ta)?|kasvaimen|(?:karsinooma|melanooma|lymfooma|leukemia)\\p{L}*";
// "You have a cancer screening invitation" and "have you had a bowel cancer test" are about checks, not about a diagnosis.
const cancerCompounds = "(?:screening|screenings|check|checks|checkup|check-up|test|tests|programme|program|invitation|invitations|registry|society|support|counselling|counseling|information|nurse|nurses|service|services|centre|center)";
const youHaveCancerEnglish = "you(?:\\s+(?:probably|likely|possibly|definitely|certainly|already|still|also|now|may|might|could|do|did|don't|didn't|not|never))*(?:\\s+(?:have|had|has)|'ve|\\s+got|\\s+developed)\\s+" + modifiers(2) + "(?:" + cancerEnglish + ")(?!\\s+" + cancerCompounds + ")";
const youHaveCancerFinnish = "sinulla\\s+" + gap(3) + "(?:on|ei ole|ei ollut|voi olla|saattaa olla|lienee|taitaa olla)\\s+" + gap(2) + "(?:" + cancerFinnish + ")";
// The reviewed sources themselves say "this does not mean you have cancer". That reassures and does not diagnose, so exactly
// that shape is let through. Anything else in the same sentence is still checked.
const notImplied = new RegExp("(?<![\\p{L}\\p{N}])(?:(?:does not|doesn't|do not|don't|not)\\s+(?:necessarily\\s+|definitely\\s+|always\\s+)?(?:mean|means|imply|implies)\\s+(?:that\\s+)?"
  + youHaveCancerEnglish + "|ei\\s+(?:\\p{L}+\\s+)?(?:tarkoita|merkitse),?\\s+(?:että\\s+)?" + youHaveCancerFinnish + ")(?![\\p{L}\\p{N}])", "giu");
const diagnosisPatterns = [
  // "you have cancer", "you do not have cancer", "you may have a tumour", "you've got breast cancer"
  phrase(youHaveCancerEnglish),
  phrase("you\\s+(?:probably|likely|possibly)\\s+have"),
  phrase("you(?:'ve|'re|\\s+(?:have|had|are|were))\\s+(?:been\\s+)?diagnosed\\s+with\\s+" + gap(2) + "(?:" + cancerEnglish + ")"),
  // "your lump is cancer", "your symptoms suggest cancer", "this sounds like cancer"
  phrase("your\\s+" + gap(2) + "(?:is|are|could be|may be|might be|suggests?|indicates?|points? to|means)\\s+" + gap(3) + "(?:" + cancerEnglish + ")"),
  phrase("(?:it|this|that|these|those)\\s+(?:sounds|looks|seems)\\s+like\\s+" + gap(2) + "(?:" + cancerEnglish + ")"),
  // "you are fine", "you are at risk", "nothing to worry about"
  phrase("you(?:'re|\\s+are)\\s+(?:probably\\s+|likely\\s+)?(?:fine|healthy|safe|cancer[- ]free|in the clear|not at risk|at\\s+" + gap(1) + "risk)"),
  phrase("nothing to worry about|nothing to be worried about|no need to worry|no reason to worry"),
  // "sinulla on syöpä", "sinulla ei ole syöpää", "sinulla on todennäköisesti rintasyöpä"
  phrase(youHaveCancerFinnish),
  phrase("(?:sairastat|sairastut|olet sairastunut)\\s+" + gap(2) + "(?:" + cancerFinnish + ")"),
  phrase("kyseessä\\s+(?:on|ei ole)\\s+" + gap(2) + "(?:" + cancerFinnish + ")"),
  phrase("(?:oireesi|tuloksesi|löydöksesi)\\s+" + gap(3) + "(?:viittaavat?|kertovat|tarkoittavat)\\s+" + gap(2) + "(?:" + cancerFinnish + ")"),
  phrase("ei ole syytä huoleen|ei ole mitään hätää|ei mitään hätää|ei hätää"),
];
export const claimsDiagnosis = (text: string) => {
  const rest = text.replace(notImplied, " ");
  return diagnosisPatterns.some(pattern => pattern.test(rest));
};

// Why: recommending, discouraging or dosing a treatment or medicine is medical advice. Doses in particular must never
// come from a model, so any quantity in milligrams or similar units is refused even when the passage contains it.
const treatmentEnglish = "surgery|operations?|chemotherapy|chemo|radiotherapy|radiation|immunotherapy|hormone therapy|medications?|medicines?|drugs?|antibiotics?|painkillers?|tablets?|pills?|capsules?|treatments?|therapy";
const medicineFinnish = "lääke\\p{L}*|lääkk\\p{L}*|lääkit\\p{L}*|tablett\\p{L}*|kapseli\\p{L}*|pilleri\\p{L}*|hoito|hoitoa|hoidon|leikkaus\\p{L}*|solunsalpaaj\\p{L}*";
const treatmentPatterns = [
  // "you should take", "you must stop", "you need to start"
  phrase("you\\s+(?:\\p{L}+\\s+)?(?:should|must|need to|ought to|have to|had better)\\s+(?:not\\s+|never\\s+)?(?:take|start|stop|skip|increase|decrease|reduce|double|discontinue)"),
  // "you should have surgery", "you should avoid chemotherapy", "I recommend chemotherapy"
  phrase("you\\s+(?:\\p{L}+\\s+)?(?:should|must|need to|ought to|have to)\\s+(?:not\\s+|never\\s+)?(?:have|get|undergo|choose|refuse|decline|avoid|go for|opt for)\\s+" + gap(2) + "(?:" + treatmentEnglish + ")"),
  phrase("(?:i|we)\\s+(?:strongly\\s+)?(?:recommend|advise|suggest|urge)\\s+" + gap(2) + "(?:" + treatmentEnglish + ")"),
  // "stop taking your medicine", "take two tablets"
  phrase("(?:stop|start|keep|continue)\\s+taking"),
  phrase("take\\s+(?:\\d+|one|two|three|a|an|the|your)\\s+(?:tablets?|pills?|capsules?|doses?|medicines?|medications?)"),
  // "you do not need treatment", "you do not need to see a doctor"
  phrase("you\\s+(?:do not|don't|dont)\\s+need\\s+(?:to see\\s+(?:a|an|the|your)\\s+\\p{L}+|" + gap(2) + "(?:" + treatmentEnglish + "))"),
  // "500 mg", "milligrams", "dosage", "annostus"
  phrase("\\d+(?:[.,]\\d+)?\\s*(?:mg|mcg|\u00b5g|\u03bcg|ml|iu)|milligrams?|milligramm\\p{L}*|dosage|dosing|annostu\\p{L}*|annostel\\p{L}*"),
  // "sinun pitäisi ottaa lääkettä", "ota lääkettä", "lopeta lääkitys"
  phrase("sinun\\s+(?:\\p{L}+\\s+)?(?:pitäisi|tulee|täytyy|kannattaa|pitää)\\s+(?:\\p{L}+\\s+)?(?:ottaa|aloittaa|lopettaa|jättää|lisätä|vähentää)\\s+" + gap(2) + "(?:" + medicineFinnish + ")"),
  phrase("(?:ota|syö|käytä|lopeta|aloita|jätä)\\s+" + gap(2) + "(?:" + medicineFinnish + ")"),
];
export const givesTreatmentAdvice = (text: string) => treatmentPatterns.some(pattern => pattern.test(text));

// Why: follow-ups become the next question in the Ask box. A suggestion that speaks as the reader ("my result") would
// lead to a personal question the service cannot answer, and a suggestion with a claim or a number from nowhere would
// put words in the reader's mouth. Such suggestions are dropped, and the answer is kept.
const firstPerson = phrase("i|i'm|i've|i'd|i'll|me|my|mine|myself|minä|minun|minulla|minulle|minut|minua|minusta|minuun|mulla|mun");

function cleanFollowUps(candidates: readonly unknown[], passages: readonly SourcePassage[]): string[] {
  const known = numbersIn(passageContent(passages));
  const kept = new Map<string, string>();
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || kept.size === maxFollowUps) continue;
    const text = candidate.replace(/\s+/g, " ").trim();
    if (!kept.has(text.toLowerCase()) && isUsableFollowUp(text, known)) kept.set(text.toLowerCase(), text);
  }
  return [...kept.values()];
}

function isUsableFollowUp(text: string, knownNumbers: ReadonlySet<string>) {
  const checked = canonical(text);
  return text.length >= followUpLength.min && text.length <= followUpLength.max
    && isPlainText(checked) && !firstPerson.test(checked) && !claimsDiagnosis(checked) && !givesTreatmentAdvice(checked)
    && [...numbersIn(checked)].every(number => knownNumbers.has(number));
}
