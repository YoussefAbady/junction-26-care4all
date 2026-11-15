import { metaValue, versionOf } from "./assemble";
import type { ContentRows, StringRow, V2Rows } from "./rows";
import {
  interviewLimitsSchema, monitorRulesSchema, riskInFinlandSchema, riskRubricSchema,
} from "./v2-schemas";
import {
  riskPassageId, riskTiers, type Bilingual, type ContentSections, type InterviewContent, type InterviewSection, type MonitorContent,
  type MonitorSection, type RiskContent, type RiskSection, type RiskTier, type SexScope,
} from "./v2-types";

// Design v2: rows into the three read models the backend packages use (loadRisk, loadInterview, loadMonitor) and into the three
// sections of GET /api/content (RISK, MONITOR, INTERVIEW). Docs: docs/design-v2.md Appendix A.6 and A.8. Every Bilingual leaf has
// both languages; a screen string that is missing in a language is a broken content table, and these functions say so.

type V2Input = Pick<ContentRows, "meta" | "sources" | "strings"> & V2Rows;

const byPosition = <T extends { position: number }>(rows: readonly T[]) => [...rows].sort((a, b) => a.position - b.position);
const empty: Bilingual = { en: "", fi: "" };

/** The strings of one scope as { en, fi } by key, in the order of their rows. */
function scopeStrings(rows: readonly StringRow[], scope: string): Map<string, Bilingual> {
  const found = new Map<string, Partial<Bilingual>>();
  for (const row of byPosition(rows.filter(item => item.scope === scope))) {
    if (row.language !== "en" && row.language !== "fi") continue;
    found.set(row.key, { ...found.get(row.key), [row.language]: row.text });
  }
  const strings = new Map<string, Bilingual>();
  for (const [key, value] of found) {
    if (value.en === undefined || value.fi === undefined) throw new Error("Content is incomplete: string " + scope + "." + key + " is not in both languages");
    strings.set(key, { en: value.en, fi: value.fi });
  }
  return strings;
}
const pick = (strings: Map<string, Bilingual>, prefix: string) => Object.fromEntries([...strings].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value]));
const rest = (strings: Map<string, Bilingual>, prefixes: readonly string[]) =>
  Object.fromEntries([...strings].filter(([key]) => !prefixes.some(prefix => key.startsWith(prefix))));

export function assembleRisk(rows: V2Input): RiskContent {
  const version = versionOf(rows);
  const types = byPosition(rows.riskTypes);
  const strings = scopeStrings(rows.strings, "risk");
  const typePosition = new Map(types.map(type => [type.id, type.position]));
  const tierLabels = Object.fromEntries(riskTiers.map(tier => [tier, strings.get("tier." + tier) ?? empty])) as Record<RiskTier, Bilingual>;
  return {
    version: version.version,
    retrieved: version.retrieved,
    order: types.map(type => type.id),
    tierLabels,
    rubric: metaValue(rows.meta, "riskRubric", riskRubricSchema),
    inFinland: metaValue(rows.meta, "riskInFinland", riskInFinlandSchema),
    types: types.map(type => ({
      id: type.id, position: type.position, sex: type.sex as SexScope, name: { en: type.nameEn, fi: type.nameFi },
      notCovered: { en: type.notCoveredEn, fi: type.notCoveredFi },
    })),
    factors: byPosition(rows.riskFactors).map(factor => ({
      key: factor.key, position: factor.position, name: { en: factor.nameEn, fi: factor.nameFi }, short: { en: factor.shortEn, fi: factor.shortFi },
      tip: factor.tipEn !== null && factor.tipFi !== null ? { en: factor.tipEn, fi: factor.tipFi } : null,
      tipSourceIds: factor.tipSourceIds, states: factor.states,
    })),
    facts: [...rows.riskFacts].sort((a, b) => (typePosition.get(a.riskType) ?? 0) - (typePosition.get(b.riskType) ?? 0) || a.position - b.position).map(fact => ({
      riskType: fact.riskType, factor: fact.factor, state: fact.state, position: fact.position, effect: fact.effect as RiskContent["facts"][number]["effect"],
      text: { en: fact.textEn, fi: fact.textFi }, sourceIds: fact.sourceIds, passageId: riskPassageId(fact.riskType, fact.factor, fact.state),
    })),
    guidelines: [...rows.guidelines].sort((a, b) => (typePosition.get(a.riskType) ?? 0) - (typePosition.get(b.riskType) ?? 0))
      .map(guideline => ({ riskType: guideline.riskType, sourceIds: guideline.sourceIds })),
    // Every listed source with a tier, in position order: what a retrieved passage may cite.
    sources: byPosition(rows.sources.filter(source => source.listed && source.tier !== null)).map(source => ({
      id: source.id, organisation: source.organisation, name: { en: source.name, fi: source.nameFi ?? source.name }, url: source.url,
      published: source.published, retrieved: source.retrieved, language: source.language,
      tier: source.tier as NonNullable<RiskContent["sources"][number]["tier"]>, guideline: source.guideline,
    })),
  };
}

export function assembleInterview(rows: V2Input): InterviewContent {
  const version = versionOf(rows);
  return {
    version: version.version,
    retrieved: version.retrieved,
    limits: metaValue(rows.meta, "interviewLimits", interviewLimitsSchema),
    domains: byPosition(rows.domains).map(domain => ({
      id: domain.id, position: domain.position, name: { en: domain.nameEn, fi: domain.nameFi }, essential: domain.essential,
      appliesTo: domain.appliesTo as SexScope, minAge: domain.minAge, maxAge: domain.maxAge, ask: domain.ask, fallback: domain.fallback,
    })),
    copy: Object.fromEntries(scopeStrings(rows.strings, "interview")),
  };
}

export function assembleMonitor(rows: V2Input): MonitorContent {
  const version = versionOf(rows);
  const flags = byPosition(rows.monitorFlags);
  const serious = flags.find(flag => flag.kind === "serious");
  return {
    version: version.version,
    retrieved: version.retrieved,
    rules: metaValue(rows.meta, "monitorRules", monitorRulesSchema),
    flags: flags.filter(flag => flag.kind === "flag").map(flag => ({
      id: flag.id, position: flag.position, label: { en: flag.labelEn, fi: flag.labelFi }, word: { en: flag.wordEn ?? "", fi: flag.wordFi ?? "" },
    })),
    serious: serious ? { en: serious.labelEn, fi: serious.labelFi } : empty,
  };
}

/**
 * The three sections GET /api/content adds to the PWA's own content. Public: nothing in them belongs to a person. The rules of
 * monitoring (steps apart) and the risk statements are server only and are not here.
 */
export function contentSections(rows: V2Input): ContentSections {
  const risk = assembleRisk(rows);
  const monitor = assembleMonitor(rows);
  const interview = assembleInterview(rows);
  const riskStrings = scopeStrings(rows.strings, "risk");
  const monitorStrings = scopeStrings(rows.strings, "monitor");
  const typeOf = new Map(risk.types.map(type => [type.id, type]));
  const trendWord = (field: "word" | "doctorWord") => Object.fromEntries(monitor.rules.trends.map(trend => [trend.id, trend[field]]));

  const RISK: RiskSection = {
    ORDER: risk.order,
    TIERS: risk.tierLabels,
    TYPES: Object.fromEntries(risk.order.map(id => {
      const type = typeOf.get(id)!;
      return [id, { sex: type.sex, name: type.name, notCovered: type.notCovered }];
    })),
    FACTORS: Object.fromEntries(risk.factors.map(factor => [factor.key, { name: factor.name, short: factor.short, tip: factor.tip }])),
    GUIDELINES: risk.guidelines.map(guideline => ({ type: guideline.riskType, sources: guideline.sourceIds })),
    RUBRIC: { tiers: risk.rubric.tiers, overall: risk.rubric.overall, comparison: risk.rubric.comparison, sources: risk.rubric.sourceIds },
    IN_FINLAND: { text: risk.inFinland.text, sources: risk.inFinland.sourceIds },
    COPY: rest(riskStrings, ["tier."]),
  };
  const MONITOR: MonitorSection = {
    STEPS: monitor.rules.steps,
    TRENDS: monitor.rules.trends.map(trend => ({ id: trend.id, label: trend.label })),
    TREND_WORD: trendWord("word") as MonitorSection["TREND_WORD"],
    DOCTOR_TREND_WORD: trendWord("doctorWord") as MonitorSection["DOCTOR_TREND_WORD"],
    FLAGS: monitor.flags.map(flag => ({ id: flag.id, label: flag.label })),
    FLAG_WORD: Object.fromEntries(monitor.flags.map(flag => [flag.id, flag.word])),
    SERIOUS: monitor.serious,
    OUT: pick(monitorStrings, "out.") as MonitorSection["OUT"],
    SEX: pick(monitorStrings, "sex.") as MonitorSection["SEX"],
    URGENCY: pick(monitorStrings, "urgency.") as MonitorSection["URGENCY"],
    COPY: rest(monitorStrings, ["out.", "sex.", "urgency."]),
  };
  const INTERVIEW: InterviewSection = { MIN: interview.limits.min, MAX: interview.limits.max, COPY: interview.copy };
  return { RISK, MONITOR, INTERVIEW };
}
