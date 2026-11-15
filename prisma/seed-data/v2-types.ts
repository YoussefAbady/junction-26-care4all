import type {
  Bilingual, BilingualList, Effect, FallbackTurn, MonitorRules, RiskFactorState, RiskInFinland, RiskRubric, SexScope,
} from "../../src/lib/content/v2-types";

// What the three design v2 seed modules export (docs/design-v2.md Appendix A, "Seed modules"):
//   risk-content.ts       riskSeed       owner: content, generated from the design by a one-off extraction script, never retyped
//   interview-content.ts  interviewSeed  owner: interview
//   monitor-content.ts    monitorSeed    owner: monitor
// The seed machinery (src/lib/content/rows.ts) turns them into table rows. Position columns come from the order of the arrays.
// Every text has both languages. The Finnish is a draft until `finnish` says reviewed.

/** Whether a native speaker has reviewed the Finnish of a module. It is written to ContentMeta.finnishReview. */
export type FinnishStatus = "unreviewed" | "reviewed";

/** One screen string (ContentString), in both languages. The module's own scope is the only one it may use. */
export type StringSeed<Scope extends "risk" | "monitor" | "interview"> = { scope: Scope; key: string; text: Bilingual };

// ---- risk ----------------------------------------------------------------------------------------------------------

/** A source the risk statements cite that the design's source list did not have: the design's SRC, with the shape of its SOURCES entries. */
export type RiskSourceSeed = { name: string; org: string; date: string; url: string; use: string };
export type RiskTypeSeed = { id: string; sex: SexScope; name: Bilingual; notCovered: BilingualList };
export type RiskFactorSeed = {
  key: string; name: Bilingual; short: Bilingual; tip: Bilingual | null; tipSourceIds: string[]; states: RiskFactorState[];
};
export type RiskFactSeed = {
  riskType: string; factor: string; state: string; effect: Effect; text: Bilingual; sourceIds: string[];
};
export type GuidelineSeed = { riskType: string; sourceIds: string[] };
export type RiskSeed = {
  /** The design's SRC: id -> source. They are added to the PWA's source list (listed) after the design's own sources, with the design's export date as `retrieved`. */
  sources: Record<string, RiskSourceSeed>;
  /** In the order of the overview. */
  types: RiskTypeSeed[];
  /** In the order of LIB. */
  factors: RiskFactorSeed[];
  /** For each cancer type in order, the statements of its rows in order. */
  facts: RiskFactSeed[];
  guidelines: GuidelineSeed[];
  rubric: RiskRubric;
  inFinland: RiskInFinland;
  strings: StringSeed<"risk">[];
  finnish: FinnishStatus;
};

// ---- interview -----------------------------------------------------------------------------------------------------

export type DomainSeed = {
  id: string; name: Bilingual; essential: boolean; appliesTo: SexScope; minAge: number | null; maxAge: number | null;
  /** What to find out, in English. */
  ask: string;
  fallback: { en: FallbackTurn; fi: FallbackTurn };
};
export type InterviewSeed = {
  /** ContentMeta interviewLimits. */
  limits: { min: number; max: number };
  /** In the order the coverage list shows and the bank asks. */
  domains: DomainSeed[];
  strings: StringSeed<"interview">[];
  finnish: FinnishStatus;
};

// ---- monitor -------------------------------------------------------------------------------------------------------

export type MonitorFlagSeed = { id: string; label: Bilingual; word: Bilingual };
export type MonitorSeed = {
  /** ContentMeta monitorRules. */
  rules: MonitorRules;
  /** The six check-in flags, in order. */
  flags: MonitorFlagSeed[];
  /** The wording of the "something serious right now" checkbox. */
  serious: Bilingual;
  strings: StringSeed<"monitor">[];
  finnish: FinnishStatus;
};
