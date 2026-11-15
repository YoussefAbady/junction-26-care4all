import { z } from "zod";
import type { TextModel } from "../ai";
import type { ContentStore } from "../content/types";
import { inputHash, riskFactsOf, splitTypes } from "./facts";
import { runRiskJob, type JobDeps } from "./job";
import { progressSchema, riskResultSchema, type Assessment, type RiskRepo, type RiskRow } from "./types";

// What GET and POST /api/risk do (docs/design-v2.md section 6.2), without the HTTP: the route only authenticates, checks the
// origin and answers. The job it starts is returned as `work`, and the route runs it after the response.

export type RiskDeps = {
  store: Pick<ContentStore, "loadRisk" | "contentVersion" | "retrievePassages">;
  /** The model that writes, or null when none is configured. */
  model: TextModel | null;
  repo: RiskRepo;
  /** Whether this account may start another run now. It counts the run when it says yes. */
  allow: (username: string) => boolean;
  now?: () => Date;
  log?: (line: string) => void;
  limits?: JobDeps["limits"];
};
export type Owner = { username: string };
export type Reply = { status: number; body: object; work?: () => Promise<void> };

const request = z.object({ consent: z.literal(true), language: z.enum(["en", "fi"]), action: z.literal("run") }).strict();

const toAssessment = (row: RiskRow, stale: boolean): Assessment => {
  const result = riskResultSchema.safeParse(row.result);
  const progress = progressSchema.safeParse(row.progress);
  return {
    id: row.id, status: row.status === "complete" || row.status === "failed" ? row.status : "running", language: row.language === "fi" ? "fi" : "en", stale,
    createdAt: row.createdAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null,
    progress: row.status === "running" && progress.success ? progress.data : null, failure: row.failure,
    result: row.status === "complete" && result.success ? result.data : null,
  };
};

export async function readRisk(deps: RiskDeps, owner: Owner): Promise<Reply> {
  const now = (deps.now ?? (() => new Date()))();
  const [ready, row] = await Promise.all([deps.repo.interviewComplete(owner.username), deps.repo.read(owner.username, now)]);
  return { status: 200, body: { enabled: deps.model !== null, ready, assessment: row ? toAssessment(row, row.status === "complete" ? await isStale(deps, owner, row) : false) : null } };
}

/** Stale: the answers, the interview, the content or the language no longer give the hash this assessment was made from. */
async function isStale(deps: RiskDeps, owner: Owner, row: RiskRow) {
  try {
    const language = row.language === "fi" ? "fi" : "en";
    const [answers, transcript, version] = await Promise.all([deps.repo.loadAnswers(owner.username), deps.repo.loadTranscript(owner.username), deps.store.contentVersion()]);
    return row.contentVersion !== version.version || row.inputHash !== inputHash(riskFactsOf(answers, transcript), version.version, language);
  } catch {
    return false;
  }
}

export async function startRisk(deps: RiskDeps, owner: Owner, body: unknown): Promise<Reply> {
  const parsed = request.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: "invalid" } };
  const { language } = parsed.data;
  const { model } = deps;
  const log = deps.log ?? ((line: string) => console.info(line));
  const now = deps.now ?? (() => new Date());
  if (!model) return { status: 200, body: { assessment: null, error: "unavailable" } };
  if (!(await deps.repo.interviewComplete(owner.username))) return { status: 409, body: { error: "interview" } };
  // A run in progress is returned as it is. It is not a new run, so it is not counted.
  const running = await deps.repo.read(owner.username, now());
  if (running?.status === "running") return { status: 200, body: { assessment: toAssessment(running, false) } };
  if (!deps.allow(owner.username)) return { status: 429, body: { error: "limited" } };

  const [answers, transcript, content] = await Promise.all([deps.repo.loadAnswers(owner.username), deps.repo.loadTranscript(owner.username), deps.store.loadRisk()]);
  const facts = riskFactsOf(answers, transcript, now());
  const { applicable, skipped } = splitTypes(content.types, answers);
  const started = await deps.repo.start({
    username: owner.username, language, inputHash: inputHash(facts, content.version, language), contentVersion: content.version,
    provider: model.provider, model: model.name, total: applicable.length + 2,
  }, now());
  if (!started.created) return { status: 200, body: { assessment: toAssessment(started.row, false) } };
  const work = () => runRiskJob(
    { store: deps.store, model, repo: deps.repo, now, log, limits: deps.limits },
    { id: started.row.id, language, facts, content, applicable, skipped },
  ).catch(() => log("risk step=job reason=error"));
  return { status: 200, body: { assessment: toAssessment(started.row, false) }, work };
}
