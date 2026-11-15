import type { FallbackTurn, InterviewContent, InterviewDomain } from "../content/v2-types";
import { ageOf, femaleBody, maleBody } from "../intake/access";
import { basicsComplete } from "../intake/engine";
import type { Answers } from "../intake/types";
import { interviewFacts } from "./facts";
import { replyJsonSchema, validateReply } from "./guard";
import { instruction, userTurn, type Hint } from "./prompt";
import type { Action, Deps, Interview, InterviewRow, Language, Marker, NewTurn, Option, Result, StoredAnswer, Turn, TurnRow } from "./types";

// The interview engine (docs/design-v2.md section 5). Pure and injectable: the store, the content, the model and the clock
// come in through Deps, so the tests run it with a fake model and an in-memory store.
//
// How a question is made, in order: stop at `max`; work out which domains the model may name; ask the model (at most twice,
// the second time with a constant hint when its first reply was refused or said done too early); and if the model is off,
// refused, rate-limited, failing or out of time, ask the bank (the database's fallback question of the next uncovered
// domain). A model failure never fails the request, and the interview always progresses.

const modelTimeoutMs = 12_000;
/** A follow-up on the answer just given (a smoker is asked how much) may use a domain that is already covered, at most this many turns per domain. */
const turnsPerDomain = 3;

const markerWords: Record<Language, Record<Marker, string>> = {
  en: { unsure: "Not sure", declined: "Prefer not to say" },
  fi: { unsure: "En ole varma", declined: "En halua vastata" },
};
export const markers: Marker[] = ["unsure", "declined"];

/* ------------------------------------------------------------ who a domain applies to */

/** The bodies rule of the intake (femaleBody and maleBody) and the age in years, from the saved basics (Appendix A.10). */
export function applies(domain: Pick<InterviewDomain, "appliesTo" | "minAge" | "maxAge">, basics: Answers, now: Date): boolean {
  if (domain.appliesTo === "female" && !femaleBody(basics)) return false;
  if (domain.appliesTo === "male" && !maleBody(basics)) return false;
  const age = ageOf(basics, now);
  if (age === undefined) return true;
  return (domain.minAge === null || age >= domain.minAge) && (domain.maxAge === null || age <= domain.maxAge);
}

/* --------------------------------------------------------------------- answers */

const decimalsOk = (value: number, decimals = 0) => Number(value.toFixed(decimals)) === value;

/** Checks an answer against the open turn and words it. Null when it is not acceptable. */
export function answerOf(turn: TurnRow, input: { value?: unknown; marker?: unknown }, language: Language): { answer: StoredAnswer; label: string } | null {
  if ((input.value === undefined) === (input.marker === undefined)) return null;
  if (input.marker !== undefined) {
    return input.marker === "unsure" || input.marker === "declined" ? { answer: { marker: input.marker }, label: markerWords[language][input.marker] } : null;
  }
  const value = input.value;
  if (turn.kind === "choice") {
    const option = typeof value === "string" ? turn.options?.find(item => item.id === value) : undefined;
    return option ? { answer: { value: option.id }, label: option.label } : null;
  }
  if (turn.kind === "multi") {
    const options = turn.options ?? [];
    if (!Array.isArray(value) || value.length === 0 || value.length > options.length || new Set(value).size !== value.length) return null;
    if (value.some(item => typeof item !== "string" || !options.some(option => option.id === item))) return null;
    if (value.length > 1 && value.some(item => options.find(option => option.id === item)?.exclusive)) return null;
    const chosen = options.filter(option => value.includes(option.id));
    return { answer: { value: chosen.map(option => option.id) }, label: chosen.map(option => option.label).join(", ") };
  }
  const range = turn.range;
  if (!range || typeof value !== "number" || !Number.isFinite(value) || value < range.min || value > range.max || !decimalsOk(value, range.decimals)) return null;
  return { answer: { value }, label: String(value) + (range.unit ? " " + range.unit : "") };
}

/* ------------------------------------------------------------------------ view */

const turnOf = (turn: TurnRow): Turn => ({
  position: turn.position, kind: turn.kind, title: turn.title,
  ...(turn.help ? { help: turn.help } : {}),
  ...(turn.options ? { options: turn.options } : {}),
  ...(turn.range ? { number: turn.range } : {}),
  markers: [...markers],
  ...(turn.answer ? { answer: { ...("marker" in turn.answer ? { marker: turn.answer.marker } : { value: turn.answer.value }), label: turn.answerLabel ?? "" } } : {}),
  source: turn.source,
});

export function viewOf(row: InterviewRow, content: InterviewContent, basics: Answers, now: Date): Interview {
  const answered = row.turns.filter(turn => turn.answeredAt);
  const open = row.turns.find(turn => !turn.answeredAt);
  const covered = new Set(answered.map(turn => turn.domain));
  return {
    id: row.id, status: row.status, language: row.language, startedAt: row.startedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null,
    answered: answered.length, min: content.limits.min, max: content.limits.max,
    turns: answered.map(turnOf),
    current: row.status === "complete" || !open ? null : turnOf(open),
    coverage: content.domains.filter(domain => applies(domain, basics, now))
      .map(domain => ({ id: domain.id, name: domain.name[row.language], essential: domain.essential, covered: covered.has(domain.id) })),
  };
}

/* ------------------------------------------------------------- the next question */

/** The database's fallback question, with the server's option ids. */
export function bankTurn(domain: InterviewDomain, language: Language, position: number): NewTurn {
  const turn: FallbackTurn = domain.fallback[language];
  const options: Option[] | null = turn.options ? turn.options.map((option, index) => ({ id: "o" + (index + 1), label: option.label, ...(option.exclusive ? { exclusive: true } : {}) })) : null;
  return {
    position, domain: domain.id, kind: turn.kind, title: turn.title, help: turn.help ?? null, options: turn.kind === "number" ? null : options,
    range: turn.kind === "number" && turn.number ? { ...turn.number } : null, source: "bank", provider: null, model: null,
  };
}

type Settled = { row: InterviewRow; reason: string };

/**
 * Makes the next question of an active interview that has none open, or completes it. Never throws for a model problem.
 * Returns the interview as stored afterwards and a reason code for the log.
 */
async function settle(deps: Deps, content: InterviewContent, basics: Answers, row: InterviewRow, now: Date): Promise<Settled> {
  const open = row.turns.find(turn => !turn.answeredAt);
  if (row.status === "complete" || open) return { row, reason: "kept" };
  const finish = async (reason: string): Promise<Settled> => {
    await deps.store.complete(row.id, now);
    return { row: (await deps.store.load(row.username)) ?? row, reason };
  };
  const answered = row.turns.filter(turn => turn.answeredAt);
  if (answered.length >= content.limits.max) return finish("max");

  const applicable = content.domains.filter(domain => applies(domain, basics, now));
  const covered = new Set(answered.map(turn => turn.domain));
  const uncovered = applicable.filter(domain => !covered.has(domain.id));
  const perDomain = (id: string) => row.turns.filter(turn => turn.domain === id).length;
  const last = answered.at(-1);
  // A follow-up may not use up the turns that the uncovered domains still need, so `max` can never end an interview before every domain was asked.
  const spare = content.limits.max - answered.length - uncovered.length;
  const followUp = last && last.answer && "value" in last.answer && spare > 0 && applicable.some(domain => domain.id === last.domain) && perDomain(last.domain) < turnsPerDomain ? last.domain : null;
  const allowedIds = new Set(uncovered.map(domain => domain.id));
  if (followUp) allowedIds.add(followUp);
  const essentialsDone = applicable.filter(domain => domain.essential).every(domain => covered.has(domain.id));
  const mayFinish = essentialsDone && answered.length >= content.limits.min;
  // Everything is covered but too few questions were asked: any applicable domain may be deepened.
  if (uncovered.length === 0 && answered.length < content.limits.min) for (const domain of applicable) if (perDomain(domain.id) < turnsPerDomain) allowedIds.add(domain.id);
  const allowed = applicable.filter(domain => allowedIds.has(domain.id)).map(domain => domain.id);
  if (allowed.length === 0) return finish("covered");

  const position = (row.turns.at(-1)?.position ?? 0) + 1;
  const asked = async (turn: NewTurn, reason: string): Promise<Settled> => {
    const added = await deps.store.addTurn(row.id, turn, now);
    // Another request asked first: what is stored is the truth.
    return { row: (await deps.store.load(row.username)) ?? row, reason: added ? reason : "concurrent" };
  };

  let reason = "model-off";
  let hint: Hint | undefined;
  const { model } = deps;
  for (let attempt = 0; model && attempt < 2; attempt++) {
    if (deps.signal.aborted) { reason = "timeout"; break; }
    if (!deps.allow()) { reason = "rate-limited"; break; }
    const raw = await model.generateJson({
      system: instruction,
      user: userTurn({
        language: row.language, facts: interviewFacts(basics, now), domains: applicable, covered, allowed, answered, hint,
        min: content.limits.min, max: content.limits.max,
      }),
      jsonSchema: replyJsonSchema(allowed), maxOutputTokens: 1024, timeoutMs: modelTimeoutMs, signal: deps.signal,
    });
    if (raw === null) { reason = "unavailable"; break; }
    const verdict = validateReply(raw, row.language, allowed, row.turns.map(turn => turn.title));
    if (!verdict.ok) { reason = verdict.reason; hint = "invalid"; continue; }
    if (verdict.done) {
      if (mayFinish) return finish("done");
      reason = "early-done"; hint = "early"; continue;
    }
    const { domain, ...question } = verdict.question;
    // Section 13: a question about warning signs always carries the pointer to the symptom conversation and 112, whoever wrote it.
    const help = domain === "symptoms" ? content.copy.symptom_note?.[row.language] ?? question.help : question.help;
    return asked({ position, domain, ...question, help, source: "model", provider: model.provider, model: model.name }, "question");
  }

  const next = uncovered[0];
  if (!next) return finish("covered");
  return asked(bankTurn(next, row.language, position), "bank-" + reason);
}

/* --------------------------------------------------------------------- requests */

const stepOf = (action: Action) => action.action;

/** GET: the interview as stored, with no model call. */
export async function read(deps: Pick<Deps, "store" | "loadContent" | "loadBasics" | "now">, username: string) {
  const now = deps.now?.() ?? new Date();
  const [basics, content, row] = await Promise.all([deps.loadBasics(), deps.loadContent(), deps.store.load(username)]);
  return { complete: basicsComplete(basics), interview: row ? viewOf(row, content, basics, now) : null };
}

/** POST: one action. Failures of the model never fail it; the answers are the errors of section 5.3. */
export async function act(deps: Deps, username: string, language: Language, action: Action): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const [basics, content] = await Promise.all([deps.loadBasics(), deps.loadContent()]);
  const done = (row: InterviewRow, reason: string): Result => {
    deps.log("interview step=" + stepOf(action) + " reason=" + reason);
    const interview = viewOf(row, content, basics, now);
    return { ok: true, interview, outcome: interview.current ? "question" : "complete" };
  };
  const refuse = (status: 400 | 409, error: "invalid" | "basics" | "conflict"): Result => {
    deps.log("interview step=" + stepOf(action) + " reason=" + error);
    return { ok: false, status, error };
  };
  if (!basicsComplete(basics)) return refuse(409, "basics");

  if (action.action === "start" || action.action === "restart") {
    if (action.action === "restart") await deps.store.remove(username);
    const existing = action.action === "start" ? await deps.store.load(username) : null;
    // A resumed interview that lost its open question (a failure between two writes) is healed here.
    const row = existing ?? await deps.store.create(username, language);
    const settled = await settle(deps, content, basics, row, now);
    return done(settled.row, existing ? "resume" : settled.reason);
  }

  const row = await deps.store.load(username);
  if (!row) return refuse(409, "conflict");

  if (action.action === "undo") {
    await deps.store.undo(row.id);
    const fresh = (await deps.store.load(username)) ?? row;
    return done(fresh, "undo");
  }

  const open = row.turns.find(turn => !turn.answeredAt);
  if (row.status !== "active" || !open || open.position !== action.position) return refuse(409, "conflict");
  const checked = answerOf(open, { value: action.value, marker: action.marker }, row.language);
  if (!checked) return refuse(400, "invalid");
  if (!await deps.store.answerTurn(row.id, open.position, checked.answer, checked.label, now)) return refuse(409, "conflict");
  const settled = await settle(deps, content, basics, (await deps.store.load(username)) ?? row, now);
  return done(settled.row, settled.reason);
}
