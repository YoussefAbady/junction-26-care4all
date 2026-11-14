import { database } from "@/lib/database";

/** Bumped when a release should be recognisable from outside. The earlier static survey had no version field. */
const version = "2.1.0-catalog-survey";
export async function GET() {
  try { await database().screeningSurvey.findFirst({ select: { username: true } }); return Response.json({ status: "ok", version }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ status: "unavailable", version }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
