import type { Copy } from "../survey";

/** The six chapters of the intake, in the order a person meets them. */
export type ModuleId = "you" | "now" | "health" | "family" | "life" | "screen";

/** How urgently a reported symptom should be looked at. */
export type Level = "emergency" | "urgent" | "soon";

/** "I'm not sure", "Prefer not to say" and "Skip" are recorded explicitly so a clinician can tell them apart from a blank. */
export type Marker = { $: "unsure" | "declined" | "skipped" };
export type FieldValue = string | number | string[];
export type Entry = Record<string, FieldValue>;
export type Answer = string | number | string[] | Entry | Entry[] | Marker;
export type Answers = Record<string, Answer>;

export type Opt = {
  id: string;
  label: Copy;
  hint?: Copy;
  /** Name of an icon the interface knows how to draw. */
  icon?: string;
  /** Choosing this clears every other option (for example "None of these"). */
  exclusive?: boolean;
  /** Picking this option raises a safety message. */
  flag?: Level;
  /** Only offered when this returns true. */
  when?: (answers: Answers) => boolean;
};

export type Field =
  | { id: string; type: "text"; label: Copy; max?: number; optional?: boolean; placeholder?: Copy }
  | { id: string; type: "number"; label: Copy; min: number; max: number; soft?: [number, number]; decimals?: number; start?: number; unit?: Copy; optional?: boolean }
  | { id: string; type: "year"; label: Copy; optional?: boolean }
  | { id: string; type: "choice"; label: Copy; options: Opt[]; optional?: boolean }
  | { id: string; type: "multi"; label: Copy; options: Opt[]; optional?: boolean };

type Dynamic<T> = T | ((answers: Answers) => T);

type Base = {
  id: string;
  module: ModuleId;
  title: Dynamic<Copy>;
  /** Short noun phrase used in the review and the summary. Falls back to the title. */
  label?: Dynamic<Copy>;
  help?: Dynamic<Copy>;
  /** The "Why we ask" explanation. */
  why?: Copy;
  /** A small pill above the title, used to say which concern a follow-up is about. */
  tag?: Copy;
  /** May be skipped. */
  optional?: boolean;
  /** Offer "I'm not sure". Defaults to on for every type except free text, forms and lists. */
  unsure?: boolean;
  /** Offer "Prefer not to say". */
  decline?: boolean;
  /** Shown only when this returns true; it sees only the answers to questions that are themselves shown. */
  show?: (answers: Answers) => boolean;
};

export type Question = Base & (
  | { type: "choice"; options: Opt[]; layout?: "cards" | "list" | "pills" | "yesno" }
  | { type: "multi"; options: Opt[]; max?: number }
  | { type: "number"; min: number; max: number; soft?: [number, number]; decimals?: number; start?: number; unit: Copy; step?: number }
  | { type: "year" }
  | { type: "date" }
  | { type: "scale"; low: Copy; high: Copy }
  | { type: "text"; max?: number; placeholder?: Copy; short?: boolean }
  | { type: "body" }
  | { type: "form"; fields: Field[] }
  | { type: "list"; fields: Field[]; item: Copy; max: number }
);

/** Builds one follow-up block for every option the person picked in a multi-choice question. */
export type Generator = {
  gen: string;
  source: string;
  skip?: readonly string[];
  make: (key: string, label: Copy) => Question[];
};
export type Plan = Question | Generator;

export type ModuleInfo = { id: ModuleId; title: Copy; intro: Copy; blurb: Copy; icon: string; minutes: number };

export type Progress = {
  v: 2;
  answers: Answers;
  /** Id of the question being shown, "review", or "" before the first question. */
  cursor: string;
  complete: boolean;
  /** The person confirmed their answers are accurate. */
  confirmed: boolean;
  /** Safety messages the person has already seen and acknowledged. */
  acks: string[];
  language: "en" | "fi";
  revision: number;
  /** Set once when an older questionnaire was replaced. Never stored. */
  upgraded?: boolean;
};
