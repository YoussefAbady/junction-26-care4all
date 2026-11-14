import type { Column, Letter, Link, Stat, Video } from "./design";
import { sectionKeys, type SeedInput } from "./types";

// The content as table rows, one array per table of prisma/schema.prisma. toRows turns the seed into rows, assemble.ts
// turns rows back into the objects the API serves, and the database store reads and writes the same rows. Nothing here
// touches a database.

export type MetaRow = { key: string; value: unknown };
export type SourceRow = {
  id: string; listed: boolean; position: number; organisation: string; name: string; nameFi: string | null;
  url: string; published: string; retrieved: string; use: string; language: string;
};
export type StringRow = { scope: string; key: string; language: string; position: number; text: string };
export type CountyRow = { id: string; position: number; name: string };
export type ArticleRow = {
  id: string; position: number; topic: string; minutes: number; title: string; inShort: string; about: boolean; related: string[];
};
export type ArticleSectionRow = {
  articleId: string; position: number; key: string; heading: string; lead: string | null; paragraphs: string[]; plain: string[];
  list: string[]; steps: string[]; stats: Stat[] | null; cols: Column[] | null; link: Link | null; sourceIds: string[];
};
export type TopicRow = {
  id: string; position: number; name: string; kicker: string; national: boolean; pref: string | null; blurb: string; lede: string;
  leadSourceIds: string[]; programme: string; articleIds: string[]; organ: string; aboutId: string; screeningText: string;
  screeningSourceIds: string[]; screenName: string | null; symptomsTitle: string; symptomsSee: string; symptomsSeeSourceIds: string[];
  symptomsNote: string; symptomsContact: string; symptomsSourceIds: string[];
};
export type SymptomRow = { topicId: string; position: number; title: string; what: string; art: string; sourceId: string };
export type GuideRow = {
  topicId: string; title: string; text: string[]; normal: string[]; normalSourceIds: string[]; found: string; videos: Video[];
  differ: string; differSourceIds: string[]; abcde: Letter[] | null; sourceIds: string[];
};
export type GuideStepRow = {
  topicId: string; position: number; heading: string; text: string; art: string; sourceId: string; look: string | null;
  pose: string; move: string;
};
export type KitRow = { topicId: string; title: string; text: string; sourceIds: string[]; kind: string; video: Video | null };
export type JourneyRow = {
  id: string; position: number; intro: string; benefits: string[]; downsides: string[]; unsure: string; sourceIds: string[];
};
export type JourneyStepRow = {
  journeyId: string; position: number; heading: string; text: string; art: string; sourceId: string; tip: string | null;
};
export type CheckRow = {
  id: string; position: number; name: string; minutes: number; everyDays: number; remindIn: string; short: string; frequency: string;
  recommendation: string; recommendationSourceIds: string[]; drawingSourceIds: string[]; note: string;
};
export type ScanRow = {
  id: string; position: number; name: string; topic: string; kind: string; sex: string | null; type: string; who: string;
  everyYears: number; frequency: string; duration: string; place: string; what: string; note: string;
  intakeQuestion: string | null; intakeAnswers: Record<string, string> | null; journeyId: string | null; sourceIds: string[];
};
export type ProgrammeRow = {
  id: string; position: number; kind: string; test: string; ages: string; frequency: string; scanId: string; pick: string;
};
export type StatRow = {
  id: string; position: number; site: string; riskPercent: number; sex: string | null; casesBoth: number; casesMen: number | null;
  casesWomen: number | null; shareMen: number | null; shareWomen: number | null; sourceIds: string[];
};
export type VaccineRow = { id: string; position: number; name: string; protects: string; finland: string | null; sourceIds: string[] };
export type TriageRuleRow = { position: number; heading: string; text: string; sourceIds: string[] };
export type FaqRow = {
  position: number; topic: string | null; pattern: string | null; patternFlags: string | null; keywords: string[]; question: string;
  answer: string; sourceIds: string[];
};
export type SuggestionRow = { position: number; topic: string; question: string };
export type CatalogCardRow = {
  slug: string; position: number; nameEn: string; nameFi: string; summaryEn: string; summaryFi: string; linkIds: string[];
};
export type CatalogSectionRow = {
  cardSlug: string; key: string; position: number; titleEn: string; titleFi: string; status: string | null; itemsEn: string[];
  itemsFi: string[]; sourceIds: string[];
};
export type EvidenceRow = {
  id: string; language: string; residence: string; position: number; topic: string; heading: string | null; text: string;
  sourceIds: string[];
};

export type ContentRows = {
  meta: MetaRow[]; sources: SourceRow[]; strings: StringRow[]; counties: CountyRow[];
  articles: ArticleRow[]; articleSections: ArticleSectionRow[];
  topics: TopicRow[]; symptoms: SymptomRow[]; guides: GuideRow[]; guideSteps: GuideStepRow[]; kits: KitRow[];
  journeys: JourneyRow[]; journeySteps: JourneyStepRow[];
  checks: CheckRow[]; scans: ScanRow[]; programmes: ProgrammeRow[]; stats: StatRow[];
  vaccines: VaccineRow[]; triageRules: TriageRuleRow[]; faqs: FaqRow[]; suggestions: SuggestionRow[];
  catalogCards: CatalogCardRow[]; catalogSections: CatalogSectionRow[]; evidence: EvidenceRow[];
};

/** What assembleContent reads: the PWA's own content, without the backend's catalog and the chat evidence. */
export type DesignRows = Omit<ContentRows, "catalogCards" | "catalogSections" | "evidence">;
/** What assembleCatalog reads. */
export type CatalogRows = Pick<ContentRows, "meta" | "sources" | "strings" | "catalogCards" | "catalogSections">;
/** What evidenceEntries reads. */
export type EvidenceRows = Pick<ContentRows, "sources" | "evidence">;

// The PWA's source list records no language for a page. Finnish pages are recognised by host, and by path on the hosts
// that publish both languages. A locale in the path, such as /en-intl/ or /sk-sk/, names the language.
const finnishHosts = new Set([
  "kaikkisyovasta.fi", "www.sttinfo.fi", "www.terveyskirjasto.fi", "www.kaypahoito.fi", "www.ilmansyopaa.fi", "tunnerintasi.fi",
  "www.syopajarjestot.fi", "www.mtvuutiset.fi", "yle.fi", "www.filha.fi",
]);
const bilingualHosts = new Set(["stm.fi", "fimlab.fi", "www.hus.fi"]);
export function pageLanguage(url: string) {
  const { hostname, pathname } = new URL(url);
  const locale = /\/([a-z]{2})-[a-z]{2,4}\//.exec(pathname)?.[1];
  if (locale) return locale;
  if (finnishHosts.has(hostname)) return "fi";
  if (bilingualHosts.has(hostname)) return /^\/en\/|-en-/.test(pathname) ? "en" : "fi";
  return "en";
}

function same(actual: readonly string[], expected: readonly string[], message: string) {
  if (actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) throw new Error(message);
}

/**
 * The seed as rows. It checks what the table design relies on and throws when the seed breaks it: topic and article keys
 * that differ from their ids, a topic order or national list that disagrees with the topics, self-check hints that do not
 * match the guide steps, and source ids used twice. References between rows are checked by referenceProblems.
 */
export function toRows(input: SeedInput, version: string): ContentRows {
  const { design, catalog, evidence } = input;
  const c = design.content;
  const topics = Object.values(c.TOPICS);
  const articles = Object.values(c.ARTICLES);

  for (const [key, topic] of Object.entries(c.TOPICS)) if (key !== topic.id) throw new Error("TOPICS." + key + " has the id " + topic.id);
  for (const [key, article] of Object.entries(c.ARTICLES)) if (key !== article.id) throw new Error("ARTICLES." + key + " has the id " + article.id);
  same(c.TOPIC_ORDER, Object.keys(c.TOPICS), "TOPIC_ORDER is not the order of TOPICS");
  same(c.NATIONAL, topics.filter(topic => topic.national).map(topic => topic.id), "NATIONAL is not the list of topics marked national");
  same(Object.keys(c.STEP_HINTS).sort(), topics.filter(topic => topic.check).map(topic => topic.id).sort(), "STEP_HINTS does not cover exactly the topics with a self-check");
  for (const topic of topics) {
    if (topic.check && c.STEP_HINTS[topic.id].length !== topic.check.steps.length) throw new Error("STEP_HINTS." + topic.id + " does not match the steps of its guide");
  }

  const designSources: SourceRow[] = Object.entries(c.SOURCES).map(([id, source], position) => ({
    id, listed: true, position, organisation: source.org, name: source.name, nameFi: null, url: source.url, published: source.date,
    retrieved: design.source.retrieved, use: source.use, language: pageLanguage(source.url),
  }));
  const ownSources: SourceRow[] = [...catalog.sources, ...evidence.sources].map((source, index) => ({
    id: source.id, listed: false, position: designSources.length + index, organisation: source.organisation, name: source.title,
    nameFi: source.titleFi ?? null, url: source.url, published: "", retrieved: source.retrieved, use: source.use, language: source.language,
  }));
  const sources = [...designSources, ...ownSources];
  if (new Set(sources.map(source => source.id)).size !== sources.length) throw new Error("A source id is used twice");

  const strings: Omit<StringRow, "position">[] = [
    ...Object.entries(c.COPY).map(([key, text]) => ({ scope: "copy" as const, key, language: "en", text })),
    ...Object.entries(c.I18N).flatMap(([language, table]) => Object.entries(table).map(([key, text]) => ({ scope: "i18n" as const, key, language, text }))),
    { scope: "catalog", key: "notice", language: "en", text: catalog.notice[0] },
    { scope: "catalog", key: "notice", language: "fi", text: catalog.notice[1] },
  ];
  const suggestions = [
    ...Object.entries(c.SUGGESTIONS.topics).flatMap(([topic, questions]) => questions.map(question => ({ topic, question }))),
    ...c.SUGGESTIONS.general.map(question => ({ topic: "general", question })),
  ];

  return {
    meta: [
      { key: "contentVersion", value: version },
      { key: "contentRevision", value: 0 },
      { key: "retrieved", value: design.source.retrieved },
      { key: "designSource", value: design.source },
      { key: "year", value: c.YEAR },
      { key: "example", value: c.EXAMPLE },
      { key: "statsNote", value: c.STATS_NOTE },
      { key: "statsSourceIds", value: c.STATS_SRC },
      { key: "triageIntro", value: c.TRIAGE.watchIntro },
      { key: "triageSourceIds", value: c.TRIAGE.src },
      { key: "catalogVersion", value: catalog.version },
    ],
    sources,
    strings: strings.map((row, position) => ({ ...row, position })),
    counties: c.COUNTIES.map(([id, name], position) => ({ id, position, name })),
    articles: articles.map((a, position) => ({
      id: a.id, position, topic: a.topic, minutes: a.minutes, title: a.title, inShort: a.inShort, about: a.about === true, related: a.related,
    })),
    articleSections: articles.flatMap(a => a.sections.map((s, position) => ({
      articleId: a.id, position, key: s.id, heading: s.h, lead: s.lead ?? null, paragraphs: s.p, plain: s.plain, list: s.list ?? [],
      steps: s.steps ?? [], stats: s.stats ?? null, cols: s.cols ?? null, link: s.link ?? null, sourceIds: s.src,
    }))),
    topics: topics.map((t, position) => ({
      id: t.id, position, name: t.name, kicker: t.kicker, national: t.national, pref: t.pref, blurb: t.blurb, lede: t.lede,
      leadSourceIds: t.leadSrc, programme: t.programme, articleIds: t.articles, organ: t.organ, aboutId: t.aboutId,
      screeningText: t.screeningText, screeningSourceIds: t.screeningSrc, screenName: t.screenName ?? null,
      symptomsTitle: t.symptoms.title, symptomsSee: t.symptoms.see, symptomsSeeSourceIds: t.symptoms.seeSrc,
      symptomsNote: t.symptoms.note, symptomsContact: t.symptoms.contact, symptomsSourceIds: t.symptoms.src,
    })),
    symptoms: topics.flatMap(t => t.symptoms.items.map((item, position) => ({
      topicId: t.id, position, title: item.title, what: item.what, art: item.art, sourceId: item.src,
    }))),
    guides: topics.flatMap(t => t.check ? [{
      topicId: t.id, title: t.check.title, text: t.check.text, normal: t.check.normal, normalSourceIds: t.check.normalSrc,
      found: t.check.found, videos: t.check.videos, differ: t.check.differ, differSourceIds: t.check.differSrc,
      abcde: t.check.abcde, sourceIds: t.check.src,
    }] : []),
    guideSteps: topics.flatMap(t => (t.check?.steps ?? []).map((step, position) => ({
      topicId: t.id, position, heading: step.h, text: step.t, art: step.art, sourceId: step.src, look: step.look ?? null,
      pose: c.STEP_HINTS[t.id][position].pose, move: c.STEP_HINTS[t.id][position].move,
    }))),
    kits: topics.flatMap(t => t.kit ? [{
      topicId: t.id, title: t.kit.title, text: t.kit.text, sourceIds: t.kit.src, kind: t.kit.kind, video: t.kit.video ?? null,
    }] : []),
    journeys: Object.entries(c.JOURNEYS).map(([id, j], position) => ({
      id, position, intro: j.intro, benefits: j.benefits, downsides: j.downsides, unsure: j.unsure, sourceIds: j.src,
    })),
    journeySteps: Object.entries(c.JOURNEYS).flatMap(([id, j]) => j.steps.map((step, position) => ({
      journeyId: id, position, heading: step.h, text: step.t, art: step.art, sourceId: step.src, tip: step.tip ?? null,
    }))),
    checks: Object.entries(c.CHECK_META).map(([id, m], position) => ({
      id, position, name: m.name, minutes: m.min, everyDays: m.every, remindIn: m.when, short: m.short, frequency: m.freq,
      recommendation: m.rec, recommendationSourceIds: m.recSrc, drawingSourceIds: m.drawSrc, note: m.note,
    })),
    scans: c.SCANS.map((s, position) => ({
      id: s.id, position, name: s.name, topic: s.topic, kind: s.kind, sex: s.sex ?? null, type: s.type, who: s.who, everyYears: s.every,
      frequency: s.freq, duration: s.time, place: s.where, what: s.what, note: s.note, intakeQuestion: s.ans ?? null,
      intakeAnswers: s.ansMap ?? null, journeyId: s.journey ?? null, sourceIds: s.src,
    })),
    programmes: Object.entries(c.NAT).map(([id, n], position) => ({
      id, position, kind: n.kind, test: n.test, ages: n.ages, frequency: n.freq, scanId: n.scan, pick: n.pick,
    })),
    stats: Object.entries(c.STATS).map(([id, s], position) => ({
      id, position, site: s.site, riskPercent: s.risk, sex: s.sex ?? null, casesBoth: s.both, casesMen: s.m ?? null, casesWomen: s.f ?? null,
      shareMen: s.share?.m ?? null, shareWomen: s.share?.f ?? null, sourceIds: s.src ?? [],
    })),
    vaccines: Object.entries(c.VACC).map(([id, v], position) => ({
      id, position, name: v.name, protects: v.protects, finland: v.finland ?? null, sourceIds: v.src,
    })),
    triageRules: c.TRIAGE.rules.map((rule, position) => ({ position, heading: rule.h, text: rule.t, sourceIds: rule.src })),
    faqs: c.FAQ.map((f, position) => ({
      position, topic: f.t ?? null, pattern: f.re?.$regexp ?? null, patternFlags: f.re?.flags ?? null, keywords: f.k, question: f.q,
      answer: f.a, sourceIds: f.s,
    })),
    suggestions: suggestions.map((row, position) => ({ position, ...row })),
    catalogCards: catalog.cards.map((card, position) => ({
      slug: card.slug, position, nameEn: card.name[0], nameFi: card.name[1], summaryEn: card.summary[0], summaryFi: card.summary[1],
      linkIds: card.linkIds,
    })),
    catalogSections: catalog.cards.flatMap(card => sectionKeys.map((key, position) => {
      const section = card.sections[key];
      return {
        cardSlug: card.slug, key, position, titleEn: catalog.sectionTitles[key][0], titleFi: catalog.sectionTitles[key][1],
        status: section.status ?? null, itemsEn: section.items.map(item => item[0]), itemsFi: section.items.map(item => item[1]),
        sourceIds: section.sourceIds,
      };
    })),
    evidence: evidence.passages.map(passage => ({
      id: passage.id, language: passage.language, residence: passage.residence, position: passage.position, topic: passage.topic,
      heading: passage.heading ?? null, text: passage.text, sourceIds: passage.sourceIds,
    })),
  };
}
