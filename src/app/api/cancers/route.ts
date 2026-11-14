import { cancerCards, catalogNotice, catalogVersion } from "@/lib/cancer-catalog";
import { tr } from "@/lib/survey";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const language = params.get("lang") ?? "en";
  const slug = params.get("slug");
  if ((language !== "en" && language !== "fi") || slug === "") {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const cancers = cancerCards(language, slug === "bowel" ? "colorectal" : slug ?? undefined);
  if (!cancers.length) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ version: catalogVersion, language, notice: tr(language, catalogNotice), cancers }, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
