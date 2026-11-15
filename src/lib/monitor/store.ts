import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client";
import { cancerTopic, noteDetails } from "../design-contract";
import type { MonitorContent } from "../content/v2-types";
import { assessCheckin, nextDue, type Assessment, type CheckinInput, type Lang } from "./assess";

// Close monitoring on the database: the watch of a symptom note, its check-ins and the one recheck reminder of an active watch.
// The rules are pure and live in assess.ts; this file only reads and writes rows. No health data is logged.

type Db = Pick<PrismaClient, "symptomMonitor" | "monitorCheckin" | "careReminder" | "healthObservation">;
export type Client = Db & Pick<PrismaClient, "$transaction">;
export type Rules = Pick<MonitorContent, "rules" | "flags" | "serious">;

export type MonitorItem = {
  id: string; observationId: string; status: string; startedAt: string; dueAt: string; level0: number | null; trend0: string | null;
  checkins: { ts: string; trend: string; level: number | null; flags: string[]; result: string }[];
};
type Row = {
  id: string; observationId: string; status: string; startedAt: Date; dueAt: Date; level0: number | null; trend0: string | null;
  checkins: { ts: Date; trend: string; level: number | null; flags: string[]; result: string }[];
};
const include = { checkins: { orderBy: [{ ts: "asc" as const }, { id: "asc" as const }] } };
export const toItem = (row: Row): MonitorItem => ({
  id: row.id, observationId: row.observationId, status: row.status, startedAt: row.startedAt.toISOString(), dueAt: row.dueAt.toISOString(),
  level0: row.level0, trend0: row.trend0,
  checkins: row.checkins.map(item => ({ ts: item.ts.toISOString(), trend: item.trend, level: item.level, flags: item.flags, result: item.result })),
});
/** What GET /api/monitors says the PWA may offer: from the same rows as MONITOR.STEPS, TRENDS, FLAGS and SERIOUS. */
export const monitorConfig = (content: Rules) => ({
  steps: content.rules.steps,
  trends: content.rules.trends.map(trend => ({ id: trend.id, label: trend.label })),
  flags: content.flags.map(flag => ({ id: flag.id, label: flag.label })),
  serious: content.serious,
});

export const listMonitors = async (db: Db, username: string) =>
  (await db.symptomMonitor.findMany({ where: { username }, include, orderBy: [{ startedAt: "desc" }, { id: "asc" }] })).map(toItem);
export async function monitorsOf(db: Db, username: string, observationIds: string[]) {
  const rows = observationIds.length ? await db.symptomMonitor.findMany({ where: { username, observationId: { in: observationIds } }, include }) : [];
  return new Map(rows.map(row => [row.observationId, toItem(row)]));
}

const topicOf = (details: unknown) => {
  const parsed = noteDetails.safeParse(details);
  return parsed.success ? parsed.data.topic ?? null : null;
};
const courseOf = (details: unknown) => {
  const parsed = noteDetails.safeParse(details);
  return parsed.success ? parsed.data.course : undefined;
};
const trend0Of = (details: unknown) => {
  const course = courseOf(details);
  return course && course !== "gone" ? course : null;
};

/** One recheck reminder per active watch at dueAt, replaced on every change and removed when the watch is not active. */
export async function syncReminder(db: Db, monitor: { id: string; username: string; status: string; dueAt: Date }, topic: string | null) {
  await db.careReminder.deleteMany({ where: { monitorId: monitor.id } });
  if (monitor.status !== "active") return;
  await db.careReminder.create({ data: {
    id: randomUUID(), username: monitor.username, kind: "recheck", topic: cancerTopic.safeParse(topic).success ? topic : null,
    dueAt: monitor.dueAt, monitorId: monitor.id,
  } });
}

const symptomNote = (db: Db, username: string, observationId: string) =>
  db.healthObservation.findFirst({ where: { id: observationId, username, kind: "symptom" }, select: { id: true, details: true } });
export type Failure = "not_found" | "ended";
const itemOf = async (db: Db, id: string) => toItem(await db.symptomMonitor.findUniqueOrThrow({ where: { id }, include }));

/**
 * Start a watch on the account's own symptom note. Idempotent: an active watch is returned unchanged. A stopped one begins again on
 * the same row (older check-ins stay as history). Refused when the watch is resolved or escalated or the note's course is gone.
 */
export function startMonitor(
  client: Client, content: Rules, username: string, observationId: string, now = new Date(),
): Promise<{ monitor: MonitorItem } | { error: Failure }> {
  return client.$transaction(async tx => {
    const note = await symptomNote(tx, username, observationId);
    if (!note) return { error: "not_found" } as const;
    const existing = await tx.symptomMonitor.findUnique({ where: { observationId }, select: { id: true, status: true } });
    if (existing?.status === "active") return { monitor: await itemOf(tx, existing.id) };
    if (existing && existing.status !== "stopped") return { error: "ended" } as const;
    if (courseOf(note.details) === "gone") return { error: "ended" } as const;
    const dueAt = nextDue(content.rules, { kind: "start", startedAt: now });
    let id = existing?.id ?? randomUUID();
    if (existing) {
      await tx.symptomMonitor.update({ where: { id }, data: { status: "active", startedAt: now, dueAt, level0: null, trend0: trend0Of(note.details) } });
    } else {
      const created = await tx.symptomMonitor.createMany({
        data: { id, username, observationId, status: "active", startedAt: now, dueAt, level0: null, trend0: trend0Of(note.details) }, skipDuplicates: true,
      });
      if (!created.count) {
        // a concurrent start won: hand back what it made
        id = (await tx.symptomMonitor.findUniqueOrThrow({ where: { observationId }, select: { id: true } })).id;
        return { monitor: await itemOf(tx, id) };
      }
    }
    await syncReminder(tx, await tx.symptomMonitor.findUniqueOrThrow({ where: { id } }), topicOf(note.details));
    return { monitor: await itemOf(tx, id) };
  });
}

/** Start a watch for a note that has none (save_symptom). Never restarts a stopped watch and never throws. */
export async function startWatchOnce(client: Client, content: Rules, username: string, observationId: string, now = new Date()) {
  try {
    const exists = await client.symptomMonitor.findUnique({ where: { observationId }, select: { id: true } });
    if (!exists) await startMonitor(client, content, username, observationId, now);
  } catch { /* a note is never lost because a watch could not be started */ }
}

export function checkinMonitor(
  client: Client, content: Rules, username: string, observationId: string, input: CheckinInput, lang: Lang, now = new Date(),
): Promise<{ monitor: MonitorItem; result: Assessment } | { error: Failure }> {
  return client.$transaction(async tx => {
    const note = await symptomNote(tx, username, observationId);
    if (!note) return { error: "not_found" } as const;
    const found = await tx.symptomMonitor.findUnique({ where: { observationId }, select: { id: true } });
    if (!found) return { error: "ended" } as const;
    // writing the row takes its lock, so two check-ins of one watch are evaluated one after the other
    const locked = await tx.symptomMonitor.updateMany({ where: { id: found.id, username, status: "active" }, data: { status: "active" } });
    if (!locked.count) return { error: "ended" } as const;
    const monitor = await tx.symptomMonitor.findUniqueOrThrow({ where: { id: found.id } });
    const since = await tx.monitorCheckin.findMany({
      where: { monitorId: monitor.id, ts: { gte: monitor.startedAt } }, orderBy: [{ ts: "asc" }, { id: "asc" }], select: { level: true },
    });
    const result = assessCheckin(content, { startedAt: monitor.startedAt, level0: monitor.level0, checkins: since }, input, now, lang);
    await tx.monitorCheckin.create({ data: {
      id: randomUUID(), monitorId: monitor.id, ts: now, trend: input.trend, level: input.level, flags: input.flags, serious: input.serious, result: result.level,
    } });
    let data: { status?: string; dueAt?: Date };
    if (result.level === "gone") {
      data = { status: "resolved" };
      const details = note.details && typeof note.details === "object" && !Array.isArray(note.details) ? note.details : {};
      await tx.healthObservation.update({ where: { id: observationId }, data: { details: { ...details, course: "gone" } } });
    } else if (result.level === "doctor" || result.level === "emergency") data = { status: "escalated" };
    else data = { dueAt: nextDue(content.rules, { kind: "checkin", startedAt: monitor.startedAt, now, checkins: since.length + 1 }) };
    const updated = await tx.symptomMonitor.update({ where: { id: monitor.id }, data });
    await syncReminder(tx, updated, topicOf(note.details));
    return { monitor: await itemOf(tx, monitor.id), result };
  });
}

/** `stop` ends the watch (stopped) and `snooze` moves the next update to reminderHour tomorrow. Both need an active watch. */
export function changeMonitor(
  client: Client, content: Rules, username: string, observationId: string, action: "stop" | "snooze", now = new Date(),
): Promise<{ monitor: MonitorItem } | { error: Failure }> {
  return client.$transaction(async tx => {
    const note = await symptomNote(tx, username, observationId);
    if (!note) return { error: "not_found" } as const;
    const found = await tx.symptomMonitor.findUnique({ where: { observationId }, select: { id: true } });
    if (!found) return { error: "ended" } as const;
    const data = action === "stop" ? { status: "stopped" } : { dueAt: nextDue(content.rules, { kind: "snooze", now }) };
    const changed = await tx.symptomMonitor.updateMany({ where: { id: found.id, username, status: "active" }, data });
    if (!changed.count) return { error: "ended" } as const;
    await syncReminder(tx, await tx.symptomMonitor.findUniqueOrThrow({ where: { id: found.id } }), topicOf(note.details));
    return { monitor: await itemOf(tx, found.id) };
  });
}
