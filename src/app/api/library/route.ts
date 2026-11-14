import { cancerCards, catalogNotice, catalogVersion } from "@/lib/cancer-catalog";
import { tr } from "@/lib/survey";

const sectionNames = {
  awareness: ["Overview and screening", "Tietoa ja seulonta"],
  symptoms: ["Possible symptoms", "Mahdolliset oireet"],
  selfExamination: ["Body awareness", "Omatarkkailu"],
  homeKit: ["Home sampling", "Kotinäytteenotto"],
  riskFactors: ["Risk factors", "Riskitekijät"],
} as const;
const links = [
  { topic: "colorectal", title: ["Fimlab · Bowel screening and kit instructions", "Fimlab · Suolistosyövän seulonta ja näytteenotto-ohjeet"], url: "https://fimlab.fi/suolistosyovan-seulonta/" },
  { topic: "cervical", title: ["Fimlab · 2026 HPV self-sampling study", "Fimlab · HPV-omanäytteenottotutkimus 2026"], url: "https://fimlab.fi/kohdunkaulan-syovan-seulonta/" },
] as const;
const fold = (value: string) => value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lang = params.get("lang") ?? "en";
  const topic = params.get("topic");
  const id = params.get("article");
  const query = params.get("q") ?? "";
  if (!["en", "fi", "sv"].includes(lang) || query.length > 100) return Response.json({ error: "invalid" }, { status: 400 });
  const language = lang === "fi" ? "fi" : "en";
  const cards = cancerCards(language, topic === "bowel" ? "colorectal" : topic ?? undefined);
  if (!cards.length) return Response.json({ error: "not_found" }, { status: 404 });
  const sections = Object.keys(sectionNames) as (keyof typeof sectionNames)[];
  const terms = fold(query).trim().split(/\s+/).filter(Boolean);
  const articles = cards.flatMap(card => sections.map(key => ({
    id: card.slug + "-" + key,
    topic: card.slug,
    title: card.name + " · " + tr(language, sectionNames[key]),
    ...card[key],
  }))).filter(article => (!id || article.id === id) &&
    terms.every(term => fold([article.title, ...article.items].join(" ")).includes(term)));
  if (id && !articles.length) return Response.json({ error: "not_found" }, { status: 404 });
  const sources = [...new Map(articles.flatMap(article => article.sources).map(source => [source.url, source])).values()];
  const providerLinks = links.filter(link => cards.some(card => card.slug === link.topic)).map(link => ({
    ...link, title: tr(language, link.title), language: "fi", retrieved: "2026-11-14",
  }));
  return Response.json({ version: catalogVersion, language, requestedLanguage: lang,
    notice: tr(language, catalogNotice), articles, sources, providerLinks,
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
