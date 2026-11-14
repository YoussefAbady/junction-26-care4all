import { randomUUID } from "node:crypto";
import { z } from "zod";
import { currentAccount, privateJson, sameOrigin } from "@/lib/account-session";
import { database } from "@/lib/database";
import { noteDetails } from "@/lib/design-contract";

const draft = z.object({
  kind: z.enum(["symptom", "observation"]),
  label: z.string().trim().min(1).max(120),
  details: noteDetails.optional(),
  notes: z.string().trim().max(1500).default(""),
  observedAt: z.iso.datetime({ offset: true }).nullable().default(null),
}).strict();
const select = { id: true, kind: true, label: true, notes: true, details: true, observedAt: true, createdAt: true } as const;

export async function GET(request: Request) {
  try {
    const account = await currentAccount();
    if (!account) return privateJson({ error: "expired" }, 401);
    const before = new URL(request.url).searchParams.get("before");
    const cursor = z.uuid().nullable().safeParse(before);
    if (!cursor.success) return privateJson({ error: "invalid" }, 400);
    const db = database();
    const anchor = cursor.data ? await db.healthObservation.findFirst({
      where: { username: account.username, id: cursor.data }, select: { id: true, createdAt: true },
    }) : null;
    if (cursor.data && !anchor) return privateJson({ error: "not_found" }, 404);
    const rows = await db.healthObservation.findMany({
      where: { username: account.username, ...(anchor ? { OR: [
        { createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ] } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, select,
    });
    const observations = rows.slice(0, 50);
    return privateJson({ observations, nextCursor: rows.length > 50 ? observations[49].id : null });
  } catch { return privateJson({ error: "unavailable" }, 503); }
}

async function mutate(request: Request, action: "save" | "delete") {
  if (!sameOrigin(request)) return privateJson({ error: "invalid" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return privateJson({ error: "invalid" }, 415);
  try {
    const account = await currentAccount();
    if (!account) return privateJson({ error: "expired" }, 401);
    const raw = await request.text();
    if (raw.length > 8192) return privateJson({ error: "invalid" }, 413);
    const data: unknown = JSON.parse(raw);
    if (action === "delete") {
      const parsed = z.object({ id: z.uuid() }).strict().safeParse(data);
      if (!parsed.success) return privateJson({ error: "invalid" }, 400);
      const removed = await database().healthObservation.deleteMany({ where: { username: account.username, id: parsed.data.id } });
      return removed.count ? privateJson({ deleted: true }) : privateJson({ error: "not_found" }, 404);
    }
    const parsed = draft.safeParse(data);
    if (!parsed.success) return privateJson({ error: "invalid" }, 400);
    const observation = await database().healthObservation.create({
      data: { ...parsed.data, id: randomUUID(), username: account.username, observedAt: parsed.data.observedAt ? new Date(parsed.data.observedAt) : null },
      select,
    });
    return privateJson({ observation }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return privateJson({ error: "invalid" }, 400);
    return privateJson({ error: "unavailable" }, 503);
  }
}

export const POST = (request: Request) => mutate(request, "save");
export const DELETE = (request: Request) => mutate(request, "delete");
