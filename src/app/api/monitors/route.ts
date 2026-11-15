import { z } from "zod";
import { privateJson } from "@/lib/account-session";
import { contentStore } from "@/lib/content";
import { database } from "@/lib/database";
import { privateRoute } from "@/lib/private-route";
import { trends } from "@/lib/content/v2-types";
import { checkinMonitor, changeMonitor, listMonitors, monitorConfig, startMonitor } from "@/lib/monitor/store";

const language = z.enum(["en", "fi"]).optional();
const observationId = z.uuid();
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), observationId, language }).strict(),
  z.object({
    action: z.literal("checkin"), observationId, language, trend: z.enum(trends), level: z.number().int().min(0).max(10).nullable(),
    flags: z.array(z.string().min(1).max(40)).max(12), serious: z.boolean(),
  }).strict(),
  z.object({ action: z.literal("stop"), observationId, language }).strict(),
  z.object({ action: z.literal("snooze"), observationId, language }).strict(),
]);
const failure = (error: "not_found" | "ended") => error === "not_found" ? privateJson({ error: "not_found" }, 404) : privateJson({ error: "ended" }, 409);

export const GET = privateRoute(async (_request, owner) => {
  const content = await contentStore().loadMonitor();
  return privateJson({ monitors: await listMonitors(database(), owner.username), config: monitorConfig(content) });
});

export const POST = privateRoute(async (_request, owner, raw) => {
  if (JSON.stringify(raw ?? null).length > 4096) return privateJson({ error: "invalid" }, 413);
  const parsed = body.safeParse(raw);
  if (!parsed.success) return privateJson({ error: "invalid" }, 400);
  const input = parsed.data;
  const db = database();
  const content = await contentStore().loadMonitor();
  const lang = input.language ?? (owner.language === "fi" ? "fi" : "en");
  if (input.action === "start") {
    const done = await startMonitor(db, content, owner.username, input.observationId);
    return "error" in done ? failure(done.error) : privateJson({ monitor: done.monitor });
  }
  if (input.action === "checkin") {
    const known = new Set(content.flags.map(flag => flag.id));
    if (input.flags.some(flag => !known.has(flag))) return privateJson({ error: "invalid" }, 400);
    const done = await checkinMonitor(db, content, owner.username, input.observationId, {
      trend: input.trend, level: input.level, flags: [...new Set(input.flags)], serious: input.serious,
    }, lang);
    return "error" in done ? failure(done.error) : privateJson({ monitor: done.monitor, result: done.result });
  }
  const done = await changeMonitor(db, content, owner.username, input.observationId, input.action);
  return "error" in done ? failure(done.error) : privateJson({ monitor: done.monitor });
}, true);
