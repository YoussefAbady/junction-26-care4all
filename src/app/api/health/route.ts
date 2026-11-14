import { aiStatus } from "@/lib/ai-status";
import { contentStore } from "@/lib/content";
import { database } from "@/lib/database";

/** Bumped when a release should be recognisable from outside. The earlier static survey had no version field. */
const version = "2.2.0-content-database";
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await database().screeningSurvey.findFirst({ select: { username: true } });
    // Content that was never seeded is as unusable as a database that is down.
    const { version: content } = await contentStore().contentVersion();
    return Response.json({ status: "ok", version, content, ai: aiStatus() }, { headers });
  } catch {
    return Response.json({ status: "unavailable", version }, { status: 503, headers });
  }
}
