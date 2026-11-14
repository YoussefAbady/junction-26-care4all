import { tr } from "../survey";
import { localizedSection, cancerCards, sectionOf, selectCards } from "./catalog";
import { sectionKeys, type ContentStore } from "./types";

// The responses of the public content routes, with the store passed in so tests can use the in-memory one. The route
// files only call these.

const catalogCache = "public, max-age=300";
const contentCache = "public, max-age=300, stale-while-revalidate=86400";
const unavailable = () => Response.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
const fold = (value: string) => value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");

/** GET /api/cancers */
export async function cancersResponse(request: Request, store: ContentStore) {
  const params = new URL(request.url).searchParams;
  const language = params.get("lang") ?? "en";
  const slug = params.get("slug");
  if ((language !== "en" && language !== "fi") || slug === "") return Response.json({ error: "invalid" }, { status: 400 });
  try {
    const catalog = await store.loadCatalog();
    const cancers = cancerCards(catalog, language, slug === "bowel" ? "colorectal" : slug ?? undefined);
    if (!cancers.length) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ version: catalog.version, language, notice: tr(language, catalog.notice), cancers }, { headers: { "Cache-Control": catalogCache } });
  } catch {
    return unavailable();
  }
}

/** GET /api/library */
export async function libraryResponse(request: Request, store: ContentStore) {
  const params = new URL(request.url).searchParams;
  const lang = params.get("lang") ?? "en";
  const topic = params.get("topic");
  const id = params.get("article");
  const query = params.get("q") ?? "";
  if (!["en", "fi", "sv"].includes(lang) || query.length > 100) return Response.json({ error: "invalid" }, { status: 400 });
  const language = lang === "fi" ? "fi" : "en";
  try {
    const catalog = await store.loadCatalog();
    const cards = selectCards(catalog, topic === "bowel" ? "colorectal" : topic ?? undefined);
    if (!cards.length) return Response.json({ error: "not_found" }, { status: 404 });
    const terms = fold(query).trim().split(/\s+/).filter(Boolean);
    const articles = cards.flatMap(card => sectionKeys.map(key => {
      const section = sectionOf(card, key);
      return { id: card.slug + "-" + key, topic: card.slug, title: tr(language, card.name) + " · " + tr(language, section.title), ...localizedSection(section, language) };
    })).filter(article => (!id || article.id === id) &&
      terms.every(term => fold([article.title, ...article.items].join(" ")).includes(term)));
    if (id && !articles.length) return Response.json({ error: "not_found" }, { status: 404 });
    const sources = [...new Map(articles.flatMap(article => article.sources).map(source => [source.url, source])).values()];
    const providerLinks = cards.flatMap(card => card.links.map(link => ({
      topic: card.slug, title: tr(language, link.title), url: link.url, language: link.language, retrieved: link.retrieved,
    })));
    return Response.json({
      version: catalog.version, language, requestedLanguage: lang, notice: tr(language, catalog.notice), articles, sources, providerLinks,
    }, { headers: { "Cache-Control": catalogCache } });
  } catch {
    return unavailable();
  }
}

function matchesEtag(header: string | null, etag: string) {
  return (header ?? "").split(",").map(value => value.trim()).some(value => value === "*" || value.replace(/^W\//, "") === etag);
}

/** GET /api/content: the PWA's content, with a validator so a browser revalidates for the price of a version read. */
export async function contentResponse(request: Request, store: ContentStore) {
  try {
    const current = await store.contentVersion();
    if (matchesEtag(request.headers.get("if-none-match"), '"' + current.version + '"')) {
      return new Response(null, { status: 304, headers: { ETag: '"' + current.version + '"', "Cache-Control": contentCache } });
    }
    const { version, retrieved, content } = await store.loadContent();
    return Response.json({ version, retrieved, content }, { headers: { ETag: '"' + version + '"', "Cache-Control": contentCache } });
  } catch {
    return unavailable();
  }
}
