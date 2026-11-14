import { scrypt as derive, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { z } from "zod";
import { cookieName, privateJson } from "@/lib/account-session";
import { database } from "@/lib/database";
import { privateRoute } from "@/lib/private-route";

const scrypt = promisify(derive);
const confirmation = z.object({ confirm: z.literal(true), password: z.string().min(10).max(128) }).strict();

export const GET = privateRoute(async (_request, owner) => {
  const data = await database().screeningAccount.findUnique({
    where: { username: owner.username }, select: {
      username: true, language: true,
      chatSymptomDraft: { select: { data: true } },
      survey: { select: { progress: true, revision: true, legacyProgress: true } },
      profile: { select: { profile: true, preferences: true } },
      reminders: { select: { id: true, kind: true, topic: true, dueAt: true, done: true, createdAt: true } },
      observations: { select: { id: true, kind: true, label: true, notes: true, details: true, observedAt: true, createdAt: true } },
      reports: { select: { id: true, topic: true, message: true, createdAt: true } },
    },
  });
  if (!data) return privateJson({ error: "expired" }, 401);
  const response = privateJson({ exportedAt: new Date().toISOString(), data });
  response.headers.set("Content-Disposition", 'attachment; filename="care4ll-my-data.json"');
  return response;
});

export const DELETE = privateRoute(async (_request, owner, body) => {
  const parsed = confirmation.safeParse(body);
  if (!parsed.success) return privateJson({ error: "invalid" }, 400);
  const db = database();
  const account = await db.screeningAccount.findUnique({ where: { username: owner.username }, select: { password: true } });
  if (!account) return privateJson({ error: "expired" }, 401);
  const [salt, expected] = account.password.split(":");
  const actual = await scrypt(parsed.data.password, salt, 64) as Buffer;
  if (!expected || !/^[a-f0-9]{128}$/.test(expected) || !timingSafeEqual(actual, Buffer.from(expected, "hex"))) {
    return privateJson({ error: "credentials" }, 403);
  }
  const removed = await db.screeningAccount.deleteMany({ where: { username: owner.username, password: account.password } });
  if (!removed.count) return privateJson({ error: "expired" }, 401);
  (await cookies()).delete(cookieName);
  return privateJson({ deleted: true });
}, true);
