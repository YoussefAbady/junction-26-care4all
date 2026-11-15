import { z } from "zod";
import { act, read } from "./engine";
import type { Action, Deps } from "./types";

// The request side of /api/interview (docs/design-v2.md section 5.3), free of Next imports so it can be tested directly. The
// route (src/app/api/interview/route.ts) does the account, the origin and the body size, then calls these.

/** The largest request body, in characters. */
export const maxBody = 4096;
/** The whole request ends after this, whatever it waits for. nginx cuts a proxied request at 30 seconds. */
export const requestSeconds = 20;

const language = z.enum(["en", "fi"]);
const body = z.discriminatedUnion("action", [
  z.object({ consent: z.literal(true), language, action: z.literal("start") }).strict(),
  z.object({ consent: z.literal(true), language, action: z.literal("restart") }).strict(),
  z.object({ consent: z.literal(true), language, action: z.literal("undo") }).strict(),
  z.object({
    consent: z.literal(true), language, action: z.literal("answer"), position: z.number().int().min(1).max(1000),
    value: z.union([z.string().max(40), z.array(z.string().max(40)).max(10), z.number().finite()]).optional(),
    marker: z.enum(["unsure", "declined"]).optional(),
  }).strict(),
]);

export type Reply = { status: number; body: object };

/** GET: the state of the interview. It reads and sends nothing to a model, so it needs no consent. */
export async function getInterview(deps: Pick<Deps, "store" | "loadContent" | "loadBasics" | "now"> & { enabled: boolean }, username: string): Promise<Reply> {
  const state = await read(deps, username);
  return { status: 200, body: { enabled: deps.enabled, basics: { complete: state.complete }, interview: state.interview } };
}

/** POST: consent first (nothing is read or sent without it), then the body, then the action. */
export async function postInterview(deps: Deps, username: string, raw: unknown): Promise<Reply> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { status: 400, body: { error: "invalid" } };
  if ((raw as { consent?: unknown }).consent !== true) return { status: 400, body: { error: "consent" } };
  const parsed = body.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { error: "invalid" } };
  const { language: lang, consent: _consent, ...action } = parsed.data;
  const result = await act(deps, username, lang, action as Action);
  return result.ok ? { status: 200, body: { interview: result.interview, outcome: result.outcome } } : { status: result.status, body: { error: result.error } };
}
