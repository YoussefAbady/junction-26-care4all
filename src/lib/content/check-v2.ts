import { assembleInterview, assembleMonitor, assembleRisk } from "./assemble-v2";
import type { ContentRows } from "./rows";
import type { FallbackTurn } from "./v2-types";

// Design v2 (docs/design-v2.md Appendix A.8, "Checks the content package adds"), run by referenceProblems, so by the seed and by
// db:reindex. Each check tolerates the empty skeleton of a module that has not been written yet.

const riskStringKeys = [
  "tier.high", "tier.raised", "tier.average", "tier.unknown", "lede", "note", "compare", "gate_title", "gate_body", "legend", "skipped",
  "how_title", "how_sub", "how_1", "how_2", "how_3", "how_4", "how_5", "how_6",
];
const monitorStringKeys = [
  "out.emergency", "out.doctor", "out.watch", "sex.female", "sex.male", "sex.intersex", "sex.none", "urgency.weeks", "urgency.days", "urgency.today",
  "gone_title", "gone_body", "emergency_title", "emergency_when", "doctor_title", "doctor_body", "watch_title", "watch_body", "suggestion",
  "privacy", "reminders", "due_why", "wait_why", "watching", "keep_eye",
];
const answerMarkers = new Set(["not sure", "prefer not to say", "en ole varma", "en halua vastata"]);
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function fallbackProblems(domain: string, language: string, turn: FallbackTurn) {
  const problems: string[] = [];
  const where = "Domain " + domain + " fallback " + language;
  if (turn.title.length < 10 || turn.title.length > 160) problems.push(where + " has a title of " + turn.title.length + " characters, not 10 to 160");
  if (turn.kind === "number") {
    const range = turn.number;
    if (!range || !(range.min < range.max) || range.min < 0 || range.max > 10000) problems.push(where + " has no number range with min below max inside 0 to 10000");
  } else {
    const options = turn.options ?? [];
    if (options.length < 2 || options.length > 7) problems.push(where + " has " + options.length + " options, not 2 to 7");
    for (const option of options) {
      if (option.label.length < 1 || option.label.length > 60) problems.push(where + " has an option of " + option.label.length + " characters, not 1 to 60");
      if (answerMarkers.has(option.label.trim().toLowerCase())) problems.push(where + " has an option named like an answer marker: " + option.label);
    }
  }
  return problems;
}

/** The problems of the design v2 tables. Never throws. */
export function v2Problems(rows: ContentRows): string[] {
  const problems: string[] = [];
  const idsOf = (list: readonly { id: string }[]) => new Set(list.map(item => item.id));
  const sources = idsOf(rows.sources);
  const topics = idsOf(rows.topics);
  const cites = (where: string, ids: readonly string[]) => ids.forEach(id => { if (!sources.has(id)) problems.push(where + " names source " + id + ", which does not exist"); });
  // A text with English and an empty Finnish is refused. A text with both empty is an unwritten skeleton and is tolerated.
  const both = (where: string, en: string, fi: string) => { if (en.trim() && !fi.trim()) problems.push(where + " has English but no Finnish"); };

  // ---- risk
  const types = idsOf(rows.riskTypes);
  const factors = new Map(rows.riskFactors.map(factor => [factor.key, factor]));
  for (const type of rows.riskTypes) {
    if (!topics.has(type.id)) problems.push("Risk type " + type.id + " is not a topic");
    both("Risk type " + type.id + " name", type.nameEn, type.nameFi);
    if (type.notCoveredEn.length !== type.notCoveredFi.length) problems.push("Risk type " + type.id + " has different numbers of English and Finnish notCovered texts");
    type.notCoveredEn.forEach((en, index) => both("Risk type " + type.id + " notCovered " + index, en, type.notCoveredFi[index] ?? ""));
  }
  for (const factor of rows.riskFactors) {
    both("Risk factor " + factor.key + " name", factor.nameEn, factor.nameFi);
    both("Risk factor " + factor.key + " short", factor.shortEn, factor.shortFi);
    if ((factor.tipEn === null) !== (factor.tipFi === null)) problems.push("Risk factor " + factor.key + " has a tip in one language only");
    both("Risk factor " + factor.key + " tip", factor.tipEn ?? "", factor.tipFi ?? "");
    cites("Risk factor " + factor.key + " tip", factor.tipSourceIds);
    for (const state of factor.states) both("Risk factor " + factor.key + " state " + state.id, state.you.en, state.you.fi);
  }
  const cited = new Map<string, Set<string>>();
  for (const fact of rows.riskFacts) {
    const where = "Risk fact " + fact.riskType + " " + fact.factor + " " + fact.state;
    if (!types.has(fact.riskType)) problems.push(where + " names a type that does not exist");
    const factor = factors.get(fact.factor);
    if (!factor) problems.push(where + " names a factor that does not exist");
    else if (!factor.states.some(state => state.id === fact.state)) problems.push(where + " names a state the factor does not have");
    both(where, fact.textEn, fact.textFi);
    cites(where, fact.sourceIds);
    const set = cited.get(fact.riskType) ?? new Set<string>();
    fact.sourceIds.forEach(id => set.add(id));
    cited.set(fact.riskType, set);
  }
  for (const type of rows.riskTypes) {
    const guideline = rows.guidelines.find(item => item.riskType === type.id);
    if (!guideline) { problems.push("Risk type " + type.id + " has no guideline"); continue; }
    for (const id of guideline.sourceIds) if (!cited.get(type.id)?.has(id)) problems.push("Guideline " + type.id + " names source " + id + ", which no statement of the type cites");
  }
  for (const guideline of rows.guidelines) {
    if (!types.has(guideline.riskType)) problems.push("A guideline names the type " + guideline.riskType + ", which does not exist");
    cites("Guideline " + guideline.riskType, guideline.sourceIds);
  }
  try {
    const risk = assembleRisk(rows);
    cites("The risk rubric", risk.rubric.sourceIds);
    cites("riskInFinland", risk.inFinland.sourceIds);
  } catch (error) {
    problems.push("The risk meta values do not parse: " + message(error));
  }

  // ---- interview
  const domainIds = new Set<string>();
  for (const domain of rows.domains) {
    if (domainIds.has(domain.id)) problems.push("Domain " + domain.id + " is listed twice");
    domainIds.add(domain.id);
    both("Domain " + domain.id + " name", domain.nameEn, domain.nameFi);
    const { en, fi } = domain.fallback;
    if (en.kind !== fi.kind) problems.push("Domain " + domain.id + " has a different kind of fallback in English and Finnish");
    else if ((en.options?.length ?? 0) !== (fi.options?.length ?? 0)) problems.push("Domain " + domain.id + " has different numbers of fallback options in English and Finnish");
    problems.push(...fallbackProblems(domain.id, "en", en), ...fallbackProblems(domain.id, "fi", fi));
  }
  try {
    const interview = assembleInterview(rows);
    if (interview.domains.length) {
      // An interview that runs from the bank alone must be able to finish, whatever the person's body and age.
      for (const body of ["female", "male", "neither"] as const) {
        for (const age of [29, 60]) {
          const count = interview.domains.filter(domain =>
            (domain.appliesTo === "any" || domain.appliesTo === body) && (domain.minAge === null || age >= domain.minAge) && (domain.maxAge === null || age <= domain.maxAge)).length;
          if (count < interview.limits.min) problems.push("For a " + body + " body aged " + age + " only " + count + " domains apply, fewer than the interview minimum of " + interview.limits.min);
        }
      }
    }
  } catch (error) {
    problems.push("The interview meta values do not parse: " + message(error));
  }

  // ---- monitor
  if (rows.monitorFlags.length) {
    const serious = rows.monitorFlags.filter(flag => flag.kind === "serious").length;
    if (serious !== 1) problems.push("The monitor flags have " + serious + " serious rows, not exactly one");
  }
  for (const flag of rows.monitorFlags) {
    both("Monitor flag " + flag.id + " label", flag.labelEn, flag.labelFi);
    both("Monitor flag " + flag.id + " word", flag.wordEn ?? "", flag.wordFi ?? "");
  }
  try {
    const { rules } = assembleMonitor(rows);
    if (rules.steps.some((step, index) => step <= 0 || (index > 0 && step <= rules.steps[index - 1]))) problems.push("monitorRules.steps are not positive and increasing");
    if (rules.urgency.ladder.join() !== "weeks,days,today") problems.push("monitorRules.urgency.ladder is not weeks, days, today");
    if (rules.thresholds.strong > rules.thresholds.veryStrong) problems.push("monitorRules.thresholds.strong is above veryStrong");
    for (const id of ["gone", "better", "same", "worse"]) if (!rules.trends.some(trend => trend.id === id)) problems.push("monitorRules has no trend " + id);
    for (const trend of rules.trends) {
      both("Trend " + trend.id + " label", trend.label.en, trend.label.fi);
      both("Trend " + trend.id + " word", trend.word.en, trend.word.fi);
      both("Trend " + trend.id + " doctorWord", trend.doctorWord.en, trend.doctorWord.fi);
    }
    for (const [key, text] of Object.entries(rules.why)) both("monitorRules.why." + key, text.en, text.fi);
  } catch (error) {
    problems.push("The monitor rules do not parse: " + message(error));
  }

  // ---- strings: a module that has any string has every key the contract pins for it, and both languages
  const stringProblems = (scope: string, pinned: readonly string[]) => {
    const own = rows.strings.filter(row => row.scope === scope);
    if (!own.length) return;
    const pairs = new Map<string, { en?: string; fi?: string }>();
    for (const row of own) pairs.set(row.key, { ...pairs.get(row.key), [row.language]: row.text });
    for (const key of pinned) if (!pairs.has(key)) problems.push("The " + scope + " strings have no key " + key);
    for (const [key, pair] of pairs) both("String " + scope + "." + key, pair.en ?? "", pair.fi ?? "");
  };
  stringProblems("risk", riskStringKeys);
  stringProblems("interview", ["consent"]);
  stringProblems("monitor", monitorStringKeys);
  return problems;
}
