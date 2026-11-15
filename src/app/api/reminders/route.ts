import { randomUUID } from "node:crypto";
import { z } from "zod";
import { privateJson } from "@/lib/account-session";
import { database } from "@/lib/database";
import { cancerTopic, idInput } from "@/lib/design-contract";
import { privateRoute } from "@/lib/private-route";
import { reminderCalendar } from "@/lib/reminder-calendar";

const create = z.object({
  kind: z.enum(["letter", "checkin", "read", "selfcheck", "gp", "recheck"]), topic: cancerTopic.nullable().default(null),
  dueAt: z.iso.datetime({ offset: true }),
}).strict();
const update = idInput.extend({ done: z.boolean() });
const select = { id: true, kind: true, topic: true, dueAt: true, done: true, createdAt: true } as const;
/** GET also says which note a recheck reminder belongs to: the observation id of its watch, else null. */
const withMonitor = { ...select, monitor: { select: { observationId: true } } } as const;

export const GET = privateRoute(async (request, owner) => {
  const calendar = new URL(request.url).searchParams.get("calendar");
  const db = database();
  if (calendar !== null) {
    if (!z.uuid().safeParse(calendar).success) return privateJson({ error: "invalid" }, 400);
    const reminder = await db.careReminder.findFirst({ where: { id: calendar, username: owner.username }, select: { id: true, dueAt: true } });
    if (!reminder) return privateJson({ error: "not_found" }, 404);
    return new Response(reminderCalendar(reminder, new Date()), {
      headers: { "Cache-Control": "private, no-store", "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="care4ll-reminder.ics"' },
    });
  }
  const reminders = await db.careReminder.findMany({ where: { username: owner.username }, select: withMonitor, orderBy: [{ dueAt: "asc" }, { id: "asc" }] });
  const now = Date.now();
  return privateJson({
    reminders: reminders.map(({ monitor, ...reminder }) => ({ ...reminder, monitor: monitor?.observationId ?? null, due: !reminder.done && reminder.dueAt.getTime() <= now })),
  });
});

export const POST = privateRoute(async (_request, owner, body) => {
  const parsed = create.safeParse(body);
  if (!parsed.success || Date.parse(parsed.data.dueAt) <= Date.now()) return privateJson({ error: "invalid" }, 400);
  const reminder = await database().careReminder.create({ data: { ...parsed.data, dueAt: new Date(parsed.data.dueAt), username: owner.username, id: randomUUID() }, select });
  return privateJson({ reminder }, 201);
}, true);

export const PATCH = privateRoute(async (_request, owner, body) => {
  const parsed = update.safeParse(body);
  if (!parsed.success) return privateJson({ error: "invalid" }, 400);
  const changed = await database().careReminder.updateMany({
    where: { username: owner.username, id: parsed.data.id }, data: { done: parsed.data.done },
  });
  return changed.count ? privateJson({ updated: true }) : privateJson({ error: "not_found" }, 404);
}, true);

export const DELETE = privateRoute(async (_request, owner, body) => {
  const parsed = idInput.safeParse(body);
  if (!parsed.success) return privateJson({ error: "invalid" }, 400);
  const removed = await database().careReminder.deleteMany({ where: { username: owner.username, id: parsed.data.id } });
  return removed.count ? privateJson({ deleted: true }) : privateJson({ error: "not_found" }, 404);
}, true);
