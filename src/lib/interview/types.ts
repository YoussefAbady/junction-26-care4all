import type { TextModel } from "../ai";
import type { InterviewContent } from "../content/v2-types";
import type { Answers } from "../intake/types";

// The AI interview (docs/design-v2.md section 5): one question at a time, each made from the basics and every earlier question
// and answer. These are the shapes the engine, the store and the endpoint share.

export type Language = "en" | "fi";
export type Kind = "choice" | "multi" | "number";
export type Marker = "unsure" | "declined";
export type Option = { id: string; label: string; exclusive?: boolean };
export type Range = { min: number; max: number; unit?: string; decimals?: number };
/** What is stored in AiTurn.answer: exactly one key. */
export type StoredAnswer = { value: string | string[] | number } | { marker: Marker };

/** An AiTurn row, as the engine reads it. */
export type TurnRow = {
  position: number;
  domain: string;
  kind: Kind;
  title: string;
  help: string | null;
  options: Option[] | null;
  range: Range | null;
  source: "model" | "bank";
  provider: string | null;
  model: string | null;
  answer: StoredAnswer | null;
  answerLabel: string | null;
  askedAt: Date;
  answeredAt: Date | null;
};
export type NewTurn = Omit<TurnRow, "answer" | "answerLabel" | "askedAt" | "answeredAt">;

export type InterviewRow = {
  id: string;
  username: string;
  language: Language;
  status: "active" | "complete";
  startedAt: Date;
  completedAt: Date | null;
  /** In position order. */
  turns: TurnRow[];
};

/** The part of the database the engine uses. The Prisma store implements it, a test can use the in-memory one. */
export type InterviewStore = {
  load(username: string): Promise<InterviewRow | null>;
  /** Creates the interview, or returns the one that a concurrent request made first. */
  create(username: string, language: Language): Promise<InterviewRow>;
  /** False when that position is already taken (a concurrent request asked first). */
  addTurn(interviewId: string, turn: NewTurn, now: Date): Promise<boolean>;
  /** False unless that position is the open turn of the interview, so a double submit changes nothing the second time. */
  answerTurn(interviewId: string, position: number, answer: StoredAnswer, label: string, now: Date): Promise<boolean>;
  complete(interviewId: string, now: Date): Promise<void>;
  /** Clears the last answered turn and removes every turn after it; reopens a complete interview. False when nothing was answered. */
  undo(interviewId: string): Promise<boolean>;
  /** Deletes the interview and its turns. */
  remove(username: string): Promise<void>;
};

// ---- what the endpoint answers (section 5.3) ----------------------------------------------------------------------

export type Turn = {
  position: number;
  kind: Kind;
  title: string;
  help?: string;
  options?: Option[];
  number?: Range;
  markers: Marker[];
  answer?: { value?: string | string[] | number; marker?: Marker; label: string };
  source: "model" | "bank";
};
export type Interview = {
  id: string;
  status: "active" | "complete";
  language: Language;
  startedAt: string;
  completedAt: string | null;
  answered: number;
  min: number;
  max: number;
  turns: Turn[];
  current: Turn | null;
  coverage: { id: string; name: string; essential: boolean; covered: boolean }[];
};

export type Action =
  | { action: "start" }
  | { action: "restart" }
  | { action: "undo" }
  | { action: "answer"; position: number; value?: string | string[] | number; marker?: Marker };

export type Deps = {
  store: InterviewStore;
  loadContent: () => Promise<InterviewContent>;
  /** The saved basics of the account, read on the server. They are never taken from the request. */
  loadBasics: () => Promise<Answers>;
  /** The model that writes the questions, or null when none is configured (the bank is used). */
  model: TextModel | null;
  /** Whether this account may have another model call now. It counts the call when it says yes. */
  allow: () => boolean;
  /** One line per request: a step and a reason code, nothing else. */
  log: (line: string) => void;
  /** Ends the whole request. */
  signal: AbortSignal;
  now?: () => Date;
};

export type Outcome = "question" | "complete";
export type Result =
  | { ok: true; interview: Interview; outcome: Outcome }
  | { ok: false; status: 400 | 409; error: "invalid" | "basics" | "conflict" };
