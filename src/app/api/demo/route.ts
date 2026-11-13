import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { changeSchema, initialState, profile, updateState } from "@/lib/model";
import { createSession, deleteSession, getSession, saveSession, sessionSeconds } from "@/lib/session-store";
import { briefFacts } from "@/lib/brief";
import { nextAction } from "@/lib/pathways";
import { mockProvider, verdaProvider } from "@/lib/ai-provider";

const cookieName = "care4all_demo";
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
const json = (data: unknown, status = 200) => Response.json(data, { headers, status });
const fail = (message: string, status: number) => json({ message }, status);
const requestSchema = z.union([
  z.object({ profile }),
  z.object({ revision: z.number().int().nonnegative(), change: changeSchema }),
  z.object({ ai: z.enum(["brief", "explanation"]) }),
]);
const unavailable = () => fail("The demo store is unavailable. Try again when the connection is restored.", 503);

function trusted(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  return origin === expected && request.headers.get("sec-fetch-site") !== "cross-site";
}
export async function GET() {
  try { return json({ state: await getSession((await cookies()).get(cookieName)?.value) }); }
  catch { return unavailable(); }
}
export async function POST(request: Request) {
  if (!trusted(request)) return fail("Request blocked.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Expected JSON.", 415);
  const raw = await request.text();
  if (raw.length > 16000) return fail("Request is too large.", 413);
  const parsed = requestSchema.safeParse(await new Response(raw).json().catch(() => null));
  if (!parsed.success) return fail("Check the entered details and try again.", 400);
  const input = parsed.data;
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  try {
    if ("profile" in input) {
      if (await getSession(token)) return fail("Reset your current demo before starting another.", 409);
      const state = initialState(input.profile);
      jar.set(cookieName, await createSession(state), { httpOnly: true, sameSite: "strict", path: "/", maxAge: sessionSeconds, secure: process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production" });
      return json({ state }, 201);
    }
    const state = await getSession(token);
    if (!state || !token) return fail("Start a demo session to continue.", 401);
    if ("ai" in input) {
      const action = nextAction(state.answers, state.complete);
      const lines = input.ai === "brief" ? briefFacts(state) : [action.why, ...(action.source ? [action.source.passage] : [])];
      const live = process.env.AI_PROVIDER === "verda";
      const provider = live ? verdaProvider({ base: process.env.VERDA_BASE_URL, key: process.env.VERDA_API_KEY, model: process.env.VERDA_MODEL }) : mockProvider;
      try { return json({ summary: (await provider.order(lines, input.ai)).map(i => lines[i]), provider: live ? "Verda" : "Demo AI" }); }
      catch { return fail("AI is unavailable. Your original information is still available.", 503); }
    }
    if (input.revision !== state.revision) return fail("This session changed in another tab. Reload to get the latest saved details.", 409);
    const next = updateState(state, input.change, randomUUID);
    if (!next) return fail("The requested update could not be applied.", 422);
    if (!(await saveSession(token, next))) return fail("This session changed. Reload before trying again.", 409);
    return json({ state: next });
  } catch { return unavailable(); }
}
export async function DELETE(request: Request) {
  if (!trusted(request)) return fail("Request blocked.", 403);
  try {
    const jar = await cookies();
    const token = jar.get(cookieName)?.value;
    if (token) await deleteSession(token);
    jar.delete(cookieName);
    return json({ state: null });
  } catch { return unavailable(); }
}
