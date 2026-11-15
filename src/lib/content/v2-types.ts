// Design v2 content: the words the interview, the risk assessment and close monitoring share, what the content store hands
// to their code (the read models) and what GET /api/content serves under RISK, MONITOR and INTERVIEW (the payload).
// docs/design-v2.md Appendix A explains every field. Types and fixed vocabularies only, plus the two passage id builders:
// a package that quotes a passage and the package that built it must agree on its id.

/** A text in both languages. A leaf of the JSON the content serves. Every text of design v2 has both. */
export type Bilingual = { en: string; fi: string };
/**
 * A list of texts in both languages. For a list that is translated item by item (ContentRiskType.notCovered) the two lists are
 * the same length, and the database checks it. A list of words to look for (MonitorTriage.categories[].words) is not
 * translated item by item: each language has the stems that fit it, and the two lists need not be the same length.
 */
export type BilingualList = { en: string[]; fi: string[] };

/** Who a cancer type or an interview domain applies to. */
export const sexScopes = ["any", "female", "male"] as const;
export type SexScope = (typeof sexScopes)[number];

/**
 * A risk level (`Tier` in docs/design-v2.md section 6.1). The order is the rank, highest first: it is the key order of
 * RISK.TIERS and the order a list of tags is sorted in.
 */
export const riskTiers = ["high", "raised", "average", "unknown"] as const;
export type RiskTier = (typeof riskTiers)[number];

/** How far a source ranks for a Finnish person: Finnish guidance first, then European, then the rest. Null: not a source an AI answer may cite. */
export const sourceTiers = ["finland", "europe", "international"] as const;
export type SourceTier = (typeof sourceTiers)[number];

/** How large an effect a risk statement describes (from the design's weight). The statement of a High tag must be large or very-large. */
export const effects = ["small", "moderate", "large", "very-large", "protective", "info"] as const;
export type Effect = (typeof effects)[number];

/** The kinds of ContentPassage. `risk` and `risk-tip` are new in design v2 and are never returned unless a query asks for them. */
export const passageKinds = [
  "article", "topic", "symptom", "guide", "kit", "journey", "scan", "programme", "stat", "vaccine", "triage", "faq", "catalog", "evidence",
  "risk", "risk-tip",
] as const;
export type PassageKind = (typeof passageKinds)[number];

/** The passage of one risk statement: risk:<cancer type>:<factor>:<state>, with :fi added for the Finnish passage. */
export const riskPassageId = (riskType: string, factor: string, state: string, language: "en" | "fi" = "en") =>
  "risk:" + riskType + ":" + factor + ":" + state + (language === "fi" ? ":fi" : "");
/** The passage of one factor's tip: risk-tip:<factor>, with :fi added for the Finnish passage. */
export const riskTipPassageId = (factor: string, language: "en" | "fi" = "en") => "risk-tip:" + factor + (language === "fi" ? ":fi" : "");

// ---------------------------------------------------------------------------------------------------------------------
// Close monitoring
// ---------------------------------------------------------------------------------------------------------------------

/** How a symptom compares with the last time, as the person says it. */
export const trends = ["gone", "better", "same", "worse"] as const;
export type Trend = (typeof trends)[number];
/** What the rules make of a check-in. */
export const monitorLevels = ["gone", "watch", "doctor", "emergency"] as const;
export type MonitorLevel = (typeof monitorLevels)[number];
/** How soon to act, lowest first. */
export const urgencies = ["weeks", "days", "today"] as const;
export type Urgency = (typeof urgencies)[number];
/** What a saved symptom note is told: the design's three outcomes. */
export const symptomOutcomes = ["emergency", "doctor", "watch"] as const;
export type SymptomOutcome = (typeof symptomOutcomes)[number];
export const monitorStatuses = ["active", "resolved", "escalated", "stopped"] as const;
export type MonitorStatus = (typeof monitorStatuses)[number];

/** The keys of MonitorRules.why: one sentence for each reason the rules can give. Placeholders are {level}, {from}, {to} and {flags}. */
export const monitorWhyKeys = ["serious", "worse", "strong", "rise", "newFlags", "stillThere", "noBetter", "watchBetter", "watchSame"] as const;
export type MonitorWhyKey = (typeof monitorWhyKeys)[number];

/**
 * The rules of close monitoring, ContentMeta key monitorRules. The check-in rules reproduce the design's A.monitorAssess.
 * The server evaluates them and the model has no part in the decision.
 */
export type MonitorRules = {
  /** The days after the start on which an update is due: 3, 7, 14 and 21. */
  steps: number[];
  /** The local hour an update falls due at: 9. */
  reminderHour: number;
  /** The time zone "local" means on the server: Europe/Helsinki. */
  timeZone: string;
  /** After a check-in the next update is due no sooner than this many days away: 2. */
  minGapDays: number;
  /** "Remind me tomorrow" moves the due time this many days on: 1. */
  snoozeDays: number;
  /** strong: a level at or above this is strong (7). veryStrong: at or above this it is more urgent (9). rise: a rise of this much since the last log counts (2). */
  thresholds: { strong: number; veryStrong: number; rise: number };
  /** Still there after this many days from the start, with nothing else to say: see a doctor (21). */
  stillThereDays: number;
  /** About the same after this many days from the start: see a doctor (7). */
  noBetterDays: number;
  urgency: {
    /** The words, lowest first: weeks, days, today. The first is where a doctor outcome starts. */
    ladder: Urgency[];
    /** What the watch outcome says: weeks. */
    watch: Urgency;
    /** What a serious-now check-in says: today. */
    serious: Urgency;
    /** What each reason raises a doctor outcome to. The highest one that holds wins. */
    raise: { worse: Urgency; strong: Urgency; veryStrong: Urgency; rise: Urgency; newFlags: Urgency };
  };
  /** The four answers to "compared with last time". label: the radio label. word: inside a sentence. doctorWord: in the doctor PDF. */
  trends: { id: Trend; label: Bilingual; word: Bilingual; doctorWord: Bilingual }[];
  /** The sentences of the check-in result, with placeholders. */
  why: Record<MonitorWhyKey, Bilingual>;
  /** The rules for a symptom note that has just been saved (save_symptom): watch, or see a doctor. The existing emergency detection comes first. */
  triage: MonitorTriage;
};

export type MonitorTriage = {
  /** A symptom is mild, recent and improving when its saved onset, course and impact are each in these lists, and no warning category matches. Then the outcome is watch. */
  watch: { onset: string[]; course: string[]; impact: string[] };
  /**
   * Warning categories (the design's MUST_SEE and CATS). A word of `words` found in the symptom's label or notes adds the category's
   * `why` line and rules watch out. `words` are lower-case stems matched as substrings, in the language of the text: the English
   * and Finnish lists are independent and need not be the same length (a word list is not a translation).
   */
  categories: { id: string; words: BilingualList; why: Bilingual; urgency: Urgency }[];
  /** Reasons from the saved answers. Keys: onset:month, onset:weeks, course:worse, impact:limits. `urgency` is what the reason raises the outcome to. */
  reasons: { key: string; why: Bilingual; urgency: Urgency }[];
  /** Keyed lines: emergency, watch:1, watch:2 (the two lines of a watch outcome), notRecent, onsetUnknown, notBetter, courseUnknown, notMild, impactUnknown and cautious. */
  why: Record<string, Bilingual>;
};

// ---------------------------------------------------------------------------------------------------------------------
// Read models: what the backend packages get from the content store
// ---------------------------------------------------------------------------------------------------------------------

/** The sentence a risk factor state says about the person ("You smoke or use tobacco"). `{age}` stands for the age in years. */
export type RiskFactorState = { id: string; you: Bilingual };

/**
 * A source as the risk job needs it: with its tier. `name.fi` is the source's Finnish title, or its English name when it has none
 * (the design's sources have English titles only). `retrieved` is the day the design was exported, not the day the page was read.
 */
export type RiskSource = {
  id: string; organisation: string; name: Bilingual; url: string; published: string; retrieved: string;
  /** The language of the page itself, such as en or fi. */
  language: string;
  tier: SourceTier | null;
  /** True for the sources a fact, a guideline, a tip, the rubric or riskInFinland names (57 of them): the sources the risk tables themselves rest on. */
  guideline: boolean;
};
export type RiskType = {
  /** A ContentTopic id: lung, bowel, breast, prostate, skin, cervical, womb, ovary, bladder, kidney, liver, pancreas, stomach, mouththroat, thyroid or testicular. */
  id: string;
  position: number;
  sex: SexScope;
  /** The full name, such as Lung cancer. */
  name: Bilingual;
  /** What the questions cannot cover. The server copies it into every assessment. */
  notCovered: BilingualList;
};
export type RiskFactor = {
  key: string; position: number; name: Bilingual; short: Bilingual;
  /** What can help. Null for age. */
  tip: Bilingual | null;
  /** Sources that state the tip. Usually empty. */
  tipSourceIds: string[];
  states: RiskFactorState[];
};
export type RiskFact = {
  riskType: string; factor: string; state: string; position: number; effect: Effect; text: Bilingual;
  /** ContentSource ids, in display order. */
  sourceIds: string[];
  /** riskPassageId(riskType, factor, state): the id the model cites and ContentPassage holds. */
  passageId: string;
};
export type RiskGuideline = { riskType: string; sourceIds: string[] };

/** ContentMeta key riskRubric: what the tiers mean, as the model is told and as the PWA explains. */
export type RiskRubric = {
  /** The meaning of each tier (docs/design-v2.md section 6.1). */
  tiers: Record<RiskTier, Bilingual>;
  /** How the overall level is worked out. */
  overall: Bilingual;
  /** Who a tier compares the person with. */
  comparison: Bilingual;
  /** The sources shown under "How this is worked out". */
  sourceIds: string[];
};
/** ContentMeta key riskInFinland: the statistic that closes the overall card. */
export type RiskInFinland = { text: Bilingual; sourceIds: string[] };

/** Everything the risk job needs. Cached by content version like the other kinds. */
export type RiskContent = {
  /** The content version (ContentVersion.version): what a RiskResult records as contentVersion. */
  version: string;
  /** The day the design was exported. The statements come from it and were not read again from the pages. */
  retrieved: string;
  /** The cancer type ids in the order of the overview (the design's ORDER). */
  order: string[];
  /** The labels of the tiers, such as High and Korkea. */
  tierLabels: Record<RiskTier, Bilingual>;
  rubric: RiskRubric;
  inFinland: RiskInFinland;
  types: RiskType[];
  factors: RiskFactor[];
  facts: RiskFact[];
  guidelines: RiskGuideline[];
  /**
   * Every listed source (the design's and the ones the risk tables add) whose tier is not null, in position order. A passage the
   * risk job retrieves is citable when at least one of its sources is in this list, and a finding cites only ids from it.
   * `guideline` marks the ones the risk tables name.
   */
  sources: RiskSource[];
};

/** The question the server asks when the model cannot make one. Option ids are assigned by the server (o1, o2, ...). */
export type FallbackTurn = {
  kind: "choice" | "multi" | "number";
  title: string;
  help?: string;
  options?: { label: string; exclusive?: boolean }[];
  number?: { min: number; max: number; unit?: string; decimals?: number };
};
export type InterviewDomain = {
  /** tobacco, alcohol, activity, diet, family, conditions, sun, work, screening, vaccines, male-genital or symptoms. */
  id: string;
  position: number;
  name: Bilingual;
  essential: boolean;
  appliesTo: SexScope;
  minAge: number | null;
  maxAge: number | null;
  /** What to find out, in English. The model is told it. */
  ask: string;
  /** The question for the bank: the same kind and the same number of options in both languages. */
  fallback: { en: FallbackTurn; fi: FallbackTurn };
};
/** Everything the interview engine needs. */
export type InterviewContent = {
  version: string; retrieved: string;
  /** ContentMeta key interviewLimits: the interview cannot finish before `min` answers and always finishes at `max`. */
  limits: { min: number; max: number };
  domains: InterviewDomain[];
  /** Strings of scope interview, by key. */
  copy: Record<string, Bilingual>;
};

export type MonitorFlag = { id: string; position: number; label: Bilingual; word: Bilingual };
/** Everything the monitoring rules need. */
export type MonitorContent = {
  version: string; retrieved: string;
  rules: MonitorRules;
  /** The six check-in flags, in order. */
  flags: MonitorFlag[];
  /** The wording of the "something serious right now" checkbox. */
  serious: Bilingual;
};

// ---------------------------------------------------------------------------------------------------------------------
// The payload: the three new sections of GET /api/content, exactly as the PWA receives them
// ---------------------------------------------------------------------------------------------------------------------

/** D.RISK. Every Bilingual leaf is picked with the language of the screen. */
export type RiskSection = {
  /** The cancer type ids in the order of the overview. */
  ORDER: string[];
  /** The tier labels. The key order is the rank order: high, raised, average, unknown. */
  TIERS: Record<RiskTier, Bilingual>;
  TYPES: Record<string, { sex: SexScope; name: Bilingual; notCovered: BilingualList }>;
  FACTORS: Record<string, { name: Bilingual; short: Bilingual; tip: Bilingual | null }>;
  GUIDELINES: { type: string; sources: string[] }[];
  RUBRIC: { tiers: Record<RiskTier, Bilingual>; overall: Bilingual; comparison: Bilingual; sources: string[] };
  IN_FINLAND: { text: Bilingual; sources: string[] };
  COPY: Record<string, Bilingual>;
};
/** D.MONITOR. */
export type MonitorSection = {
  STEPS: number[];
  TRENDS: { id: Trend; label: Bilingual }[];
  /** The monitor script's TREND_WORD. */
  TREND_WORD: Record<Trend, Bilingual>;
  /** The doctor script's TREND_WORD. */
  DOCTOR_TREND_WORD: Record<Trend, Bilingual>;
  FLAGS: { id: string; label: Bilingual }[];
  FLAG_WORD: Record<string, Bilingual>;
  SERIOUS: Bilingual;
  OUT: Record<SymptomOutcome, Bilingual>;
  /** The doctor PDF's "sex registered at birth" words. The profile can say female, male or intersex; anything else is `none`. */
  SEX: Record<"female" | "male" | "intersex" | "none", Bilingual>;
  URGENCY: Record<Urgency, Bilingual>;
  COPY: Record<string, Bilingual>;
};
/** D.INTERVIEW. */
export type InterviewSection = { MIN: number; MAX: number; COPY: Record<string, Bilingual> };
/** What GET /api/content adds to the PWA's own content. */
export type ContentSections = { RISK: RiskSection; MONITOR: MonitorSection; INTERVIEW: InterviewSection };

/** The passage kinds a query without `kinds` never returns. */
export const riskPassageKinds = ["risk", "risk-tip"] as const;
