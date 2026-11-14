import { randomBytes, scrypt as derive, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { z } from "zod";
import { database } from "@/lib/database";
import { cookieName as name, currentAccount, hashToken as hash, privateJson as reply, refuseOrigin, sameOrigin as trusted, sessionSeconds as seconds } from "@/lib/account-session";
import { loadSurvey, saveSurvey } from "@/lib/survey-store";

const scrypt = promisify(derive);
const language = z.enum(["en", "fi"]);
// A full interview with every optional list filled in stays well under this.
const maxBody = 128 * 1024;
const input = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["register", "login"]), username: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,30}$/), password: z.string().min(10).max(128), language }),
  z.object({ action: z.literal("save"), progress: z.unknown() }),
]);
const attempts = new Map<string, { count: number; until: number }>();
function allowAttempt(username: string) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const entry = attempts.get(username) ?? { count: 0, until: now + 60000 };
  if (entry.count >= 8 || (!attempts.has(username) && attempts.size >= 2000)) return false;
  entry.count++;
  attempts.set(username, entry);
  return true;
}
async function visible(account: { username: string; language: string }, identityOnly: boolean) {
  const identity = { username: account.username, language: account.language };
  return identityOnly ? identity : { ...identity, progress: await loadSurvey(account) };
}
// The default response retains the previous UI contract during the client handoff.
const identityOnly = (request: Request) => new URL(request.url).searchParams.get("view") === "identity";

export async function GET(request: Request) {
  try {
    const account = await currentAccount();
    return reply({ account: account ? await visible(account, identityOnly(request)) : null });
  } catch { return reply({ error: "unavailable" }, 503); }
}

export async function POST(request: Request) {
  if (!trusted(request)) return refuseOrigin(request);
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "invalid" }, 415);
    const body = await request.text();
    const parsed = input.safeParse(body.length <= maxBody ? JSON.parse(body) : null);
    if (!parsed.success) return reply({ error: "invalid" }, 400);
    const data = parsed.data;
    const db = database();
    const jar = await cookies();
    const token = jar.get(name)?.value;
    if (data.action === "save") {
      const account = await currentAccount();
      if (!account) return reply({ error: "expired" }, 401);
      const result = await saveSurvey(account.username, data.progress);
      return "error" in result
        ? reply({ error: result.error }, result.status)
        : reply({ account: { username: account.username, progress: result.progress } });
    }
    if (!allowAttempt(data.username)) return reply({ error: "limited" }, 429);
    const existing = await db.screeningAccount.findUnique({ where: { username: data.username } });
    if (data.action === "register" && existing) return reply({ error: "taken" }, 409);
    const [salt, expected] = existing?.password.split(":") ?? [randomBytes(16).toString("hex"), "0".repeat(128)];
    const key = await scrypt(data.password, salt, 64) as Buffer;
    if (data.action === "login" && (!timingSafeEqual(key, Buffer.from(expected, "hex")) || !existing)) return reply({ error: "credentials" }, 401);
    const fresh = randomBytes(32).toString("hex");
    const account = await db.$transaction(async tx => {
      const account = existing ?? await tx.screeningAccount.create({ data: {
        username: data.username, password: salt + ":" + key.toString("hex"),
        language: data.language,
      } });
      await tx.screeningLogin.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, ...(token ? [{ id: hash(token) }] : [])] } });
      await tx.screeningLogin.create({ data: { id: hash(fresh), username: account.username, expiresAt: new Date(Date.now() + seconds * 1000) } });
      return account;
    });
    attempts.delete(data.username);
    jar.set(name, fresh, { httpOnly: true, sameSite: "strict", path: "/", maxAge: seconds, secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false" });
    return reply({ account: await visible(account, identityOnly(request)) }, data.action === "register" ? 201 : 200);
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ error: "invalid" }, 400);
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return reply({ error: "taken" }, 409);
    return reply({ error: "unavailable" }, 503);
  }
}
export async function DELETE(request: Request) {
  if (!trusted(request)) return refuseOrigin(request);
  try {
    const jar = await cookies();
    const token = jar.get(name)?.value;
    if (token) await database().screeningLogin.deleteMany({ where: { id: hash(token) } });
    jar.delete(name);
    return reply({ account: null });
  } catch { return reply({ error: "unavailable" }, 503); }
}
