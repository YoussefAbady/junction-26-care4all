import { z } from "zod";
import { riskTiers, type RiskTier } from "../content/v2-types";

// The AI risk assessment (docs/design-v2.md section 6). RiskResult and Assessment are the shapes of sections 6.1 and 6.2.
// The zod schemas are where data crosses a boundary: what a model replies, and what is read back from the database.

export type Tier = RiskTier;
export type Language = "en" | "fi";
export const directions = ["up", "down", "none", "info"] as const;
export type Direction = (typeof directions)[number];

/** How far a tier reaches, for "at least as high as": unknown is the lowest because it says nothing. */
export const tierStrength: Record<Tier, number> = { unknown: 0, average: 1, raised: 2, high: 3 };
export const tierOfStrength = (strength: number): Tier => (["unknown", "average", "raised", "high"] as const)[Math.max(0, Math.min(3, strength))];
export const maxTier = (tiers: readonly Tier[]): Tier => tierOfStrength(Math.max(0, ...tiers.map(tier => tierStrength[tier])));

export type Finding = { direction: Direction; title: string; text: string; sources: string[] };
export type RiskItem = {
  cancer: string; tier: Tier; limited: boolean; why: string; brief: string; findings: Finding[]; tips: string[]; notCovered: string[];
};
export type RiskOverall = { tier: Tier; line: string; basis: string; drivers: { factor: string; cancers: string[] }[] };
export type RiskResult = {
  version: 1; generatedAt: string; language: Language; contentVersion: string;
  overall: RiskOverall; items: RiskItem[]; skipped: string[]; guidelines: string[]; audited: boolean;
};
export type Assessment = {
  id: string; status: "running" | "complete" | "failed"; language: Language;
  /** The answers or the content changed after it was made. */
  stale: boolean;
  createdAt: string; completedAt: string | null;
  progress: { done: number; total: number } | null;
  /** A reason code. */
  failure: string | null;
  result: RiskResult | null;
};

const tier = z.enum(riskTiers);
const language = z.enum(["en", "fi"]);

/** What a model writes for one cancer type. `citations` are passage ids; the server turns them into source ids. */
export const modelItemSchema = z.object({
  tier, limited: z.boolean(), why: z.string(), brief: z.string(),
  findings: z.array(z.object({ direction: z.enum(directions), title: z.string(), text: z.string(), citations: z.array(z.string()) }).strict()),
  tips: z.array(z.string()),
}).strict();
export type ModelItem = z.infer<typeof modelItemSchema>;

export const modelOverallSchema = z.object({
  tier, line: z.string(), basis: z.string(),
  drivers: z.array(z.object({ factor: z.string(), cancers: z.array(z.string()) }).strict()),
}).strict();
export type ModelOverall = z.infer<typeof modelOverallSchema>;

export const modelAuditSchema = z.object({
  ok: z.boolean(),
  issues: z.array(z.object({ cancer: z.string(), issue: z.string() }).strict()),
}).strict();
export type ModelAudit = z.infer<typeof modelAuditSchema>;

/** The stored result. Read back with this, so a hand-edited row cannot reach the PWA in another shape. */
export const riskResultSchema = z.object({
  version: z.literal(1), generatedAt: z.string(), language, contentVersion: z.string(),
  overall: z.object({
    tier, line: z.string(), basis: z.string(), drivers: z.array(z.object({ factor: z.string(), cancers: z.array(z.string()) }).strict()),
  }).strict(),
  items: z.array(z.object({
    cancer: z.string(), tier, limited: z.boolean(), why: z.string(), brief: z.string(),
    findings: z.array(z.object({ direction: z.enum(directions), title: z.string(), text: z.string(), sources: z.array(z.string()) }).strict()),
    tips: z.array(z.string()), notCovered: z.array(z.string()),
  }).strict()),
  skipped: z.array(z.string()), guidelines: z.array(z.string()), audited: z.boolean(),
}).strict();

export const progressSchema = z.object({ done: z.number().int().min(0), total: z.number().int().min(0) }).strict();

/** A row of RiskAssessment as the repository hands it over. */
export type RiskRow = {
  id: string; username: string; status: string; language: string; inputHash: string; contentVersion: string;
  result: unknown; progress: unknown; failure: string | null; provider: string | null; model: string | null;
  createdAt: Date; updatedAt: Date; completedAt: Date | null;
};

/**
 * Everything the risk code reads and writes in the database, so a test can inject a memory version. A job writes
 * through the id it was started with: when a newer run has replaced the row, its writes find nothing and return false.
 */
export type RiskRepo = {
  /** The saved basics of the account (raw intake answers). They decide which cancer types apply and are never sent as they are. */
  loadAnswers(username: string): Promise<import("../intake/types").Answers>;
  /** Answered turns of the interview in order: domain, title and the answer in words. Nothing else. */
  loadTranscript(username: string): Promise<{ domain: string; question: string; answer: string }[]>;
  interviewComplete(username: string): Promise<boolean>;
  /** The row. A running one that nobody wrote to for 3 minutes is marked failed (interrupted) first. */
  read(username: string, now: Date): Promise<RiskRow | null>;
  /** Replaces the row with a new running one. When one is already running, returns that and created false. */
  start(row: { username: string; language: Language; inputHash: string; contentVersion: string; provider: string; model: string; total: number }, now: Date):
    Promise<{ row: RiskRow; created: boolean }>;
  progress(id: string, progress: { done: number; total: number }, now: Date): Promise<boolean>;
  complete(id: string, result: RiskResult, now: Date): Promise<boolean>;
  fail(id: string, reason: string, now: Date): Promise<boolean>;
};

/** A running job that has not changed for this long is dead (the server restarted). */
export const interruptedAfterMs = 3 * 60_000;
