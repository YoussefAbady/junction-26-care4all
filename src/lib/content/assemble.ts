import { z } from "zod";
import { exampleSchema, type DesignContent } from "./design";
import type { CatalogRows, DesignRows, EvidenceRow, EvidenceRows, MetaRow, SourceRow, TopicRow } from "./rows";
import {
  sectionKeys, type CatalogSource, type Catalog, type CatalogStatus, type Citation, type ContentVersion, type EvidenceEntry, type Residence,
} from "./types";

// Rows back into objects. assembleContent is the inverse of toRows for the PWA's content: the same keys and values as the
// seed's `content`, with maps and lists in the order of their `position` columns.

const text = z.string();
const languageSchema = z.enum(["en", "fi"]);
const statusSchema = z.enum(["awareness_only", "unavailable", "programme_information"]);
const residenceSchema = z.enum(["any", "finland", "abroad"]);
const sectionKeySchema = z.enum(sectionKeys);

export function metaValue<T>(meta: readonly MetaRow[], key: string, schema: z.ZodType<T>): T {
  const row = meta.find(item => item.key === key);
  if (!row) throw new Error("Content is incomplete: ContentMeta has no " + key);
  return schema.parse(row.value);
}

export function versionOf(rows: { meta: readonly MetaRow[] }): ContentVersion {
  const hash = metaValue(rows.meta, "contentVersion", text);
  const revision = metaValue(rows.meta, "contentRevision", z.number().int().nonnegative());
  return { version: revision > 0 ? hash + "." + revision : hash, retrieved: metaValue(rows.meta, "retrieved", text) };
}

const byPosition = <T extends { position: number }>(rows: readonly T[]) => [...rows].sort((a, b) => a.position - b.position);
function groupBy<T>(rows: readonly T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(key(row));
    if (group) group.push(row); else groups.set(key(row), [row]);
  }
  return groups;
}
function sourceLookup(sources: readonly SourceRow[]) {
  const byId = new Map(sources.map(source => [source.id, source]));
  return (id: string) => {
    const source = byId.get(id);
    if (!source) throw new Error("Content is inconsistent: there is no source " + id);
    return source;
  };
}

export function assembleContent(rows: DesignRows): DesignContent {
  const meta = <T>(key: string, schema: z.ZodType<T>) => metaValue(rows.meta, key, schema);
  const topics = byPosition(rows.topics);
  const strings = byPosition(rows.strings);
  const sectionsOf = groupBy(rows.articleSections, row => row.articleId);
  const symptomsOf = groupBy(rows.symptoms, row => row.topicId);
  const stepsOf = groupBy(rows.guideSteps, row => row.topicId);
  const journeyStepsOf = groupBy(rows.journeySteps, row => row.journeyId);
  const guideOf = new Map(rows.guides.map(guide => [guide.topicId, guide]));
  const kitOf = new Map(rows.kits.map(kit => [kit.topicId, kit]));

  const topicObject = (t: TopicRow) => {
    const guide = guideOf.get(t.id);
    const kit = kitOf.get(t.id);
    return {
      id: t.id, name: t.name, kicker: t.kicker, national: t.national, pref: t.pref, blurb: t.blurb, lede: t.lede,
      leadSrc: t.leadSourceIds, programme: t.programme, articles: t.articleIds,
      symptoms: {
        title: t.symptomsTitle,
        items: byPosition(symptomsOf.get(t.id) ?? []).map(item => ({ title: item.title, what: item.what, art: item.art, src: item.sourceId })),
        see: t.symptomsSee, seeSrc: t.symptomsSeeSourceIds, note: t.symptomsNote, contact: t.symptomsContact, src: t.symptomsSourceIds,
      },
      check: guide ? {
        title: guide.title, text: guide.text,
        steps: byPosition(stepsOf.get(t.id) ?? []).map(step => ({
          h: step.heading, t: step.text, art: step.art, src: step.sourceId, ...(step.look !== null ? { look: step.look } : {}),
        })),
        normal: guide.normal, normalSrc: guide.normalSourceIds, found: guide.found, videos: guide.videos, differ: guide.differ,
        differSrc: guide.differSourceIds, abcde: guide.abcde, src: guide.sourceIds,
      } : null,
      kit: kit ? { title: kit.title, text: kit.text, src: kit.sourceIds, kind: kit.kind, ...(kit.video ? { video: kit.video } : {}) } : null,
      organ: t.organ, aboutId: t.aboutId, screeningText: t.screeningText, screeningSrc: t.screeningSourceIds,
      ...(t.screenName !== null ? { screenName: t.screenName } : {}),
    };
  };

  const i18n: Record<string, Record<string, string>> = {};
  for (const row of strings) if (row.scope === "i18n") (i18n[row.language] ??= {})[row.key] = row.text;
  const suggestionTopics: Record<string, string[]> = {};
  const generalSuggestions: string[] = [];
  for (const row of byPosition(rows.suggestions)) {
    if (row.topic === "general") generalSuggestions.push(row.question);
    else (suggestionTopics[row.topic] ??= []).push(row.question);
  }

  return {
    YEAR: meta("year", z.number().int()),
    COUNTIES: byPosition(rows.counties).map(county => [county.id, county.name]),
    SOURCES: Object.fromEntries(byPosition(rows.sources.filter(source => source.listed)).map(source => [source.id, {
      name: source.name, org: source.organisation, date: source.published, url: source.url, use: source.use,
    }])),
    ARTICLES: Object.fromEntries(byPosition(rows.articles).map(article => [article.id, {
      id: article.id, topic: article.topic, minutes: article.minutes, title: article.title, inShort: article.inShort,
      sections: byPosition(sectionsOf.get(article.id) ?? []).map(section => ({
        id: section.key, h: section.heading, ...(section.lead !== null ? { lead: section.lead } : {}),
        ...(section.cols !== null ? { cols: section.cols } : {}), ...(section.stats !== null ? { stats: section.stats } : {}),
        ...(section.list.length ? { list: section.list } : {}), ...(section.steps.length ? { steps: section.steps } : {}),
        p: section.paragraphs, plain: section.plain, ...(section.link !== null ? { link: section.link } : {}), src: section.sourceIds,
      })),
      related: article.related, ...(article.about ? { about: true } : {}),
    }])),
    TOPICS: Object.fromEntries(topics.map(topic => [topic.id, topicObject(topic)])),
    TOPIC_ORDER: topics.map(topic => topic.id),
    FAQ: byPosition(rows.faqs).map(faq => ({
      ...(faq.topic !== null ? { t: faq.topic } : {}),
      ...(faq.pattern !== null ? { re: { $regexp: faq.pattern, flags: faq.patternFlags ?? "" } } : {}),
      k: faq.keywords, q: faq.question, a: faq.answer, s: faq.sourceIds,
    })),
    COPY: Object.fromEntries(strings.filter(row => row.scope === "copy").map(row => [row.key, row.text])),
    I18N: i18n,
    EXAMPLE: meta("example", exampleSchema),
    JOURNEYS: Object.fromEntries(byPosition(rows.journeys).map(journey => [journey.id, {
      intro: journey.intro,
      steps: byPosition(journeyStepsOf.get(journey.id) ?? []).map(step => ({
        h: step.heading, t: step.text, art: step.art, src: step.sourceId, ...(step.tip !== null ? { tip: step.tip } : {}),
      })),
      benefits: journey.benefits, downsides: journey.downsides, unsure: journey.unsure, src: journey.sourceIds,
    }])),
    NATIONAL: topics.filter(topic => topic.national).map(topic => topic.id),
    STATS: Object.fromEntries(byPosition(rows.stats).map(stat => [stat.id, {
      site: stat.site, risk: stat.riskPercent, ...(stat.sex !== null ? { sex: stat.sex } : {}), both: stat.casesBoth,
      ...(stat.casesMen !== null ? { m: stat.casesMen } : {}), ...(stat.casesWomen !== null ? { f: stat.casesWomen } : {}),
      ...(stat.shareMen !== null || stat.shareWomen !== null ? {
        share: { ...(stat.shareMen !== null ? { m: stat.shareMen } : {}), ...(stat.shareWomen !== null ? { f: stat.shareWomen } : {}) },
      } : {}),
      ...(stat.sourceIds.length ? { src: stat.sourceIds } : {}),
    }])),
    STATS_SRC: meta("statsSourceIds", z.array(text)),
    STATS_NOTE: meta("statsNote", text),
    VACC: Object.fromEntries(byPosition(rows.vaccines).map(vaccine => [vaccine.id, {
      name: vaccine.name, protects: vaccine.protects, ...(vaccine.finland !== null ? { finland: vaccine.finland } : {}), src: vaccine.sourceIds,
    }])),
    TRIAGE: {
      watchIntro: meta("triageIntro", text),
      rules: byPosition(rows.triageRules).map(rule => ({ h: rule.heading, t: rule.text, src: rule.sourceIds })),
      src: meta("triageSourceIds", z.array(text)),
    },
    CHECK_META: Object.fromEntries(byPosition(rows.checks).map(check => [check.id, {
      name: check.name, min: check.minutes, every: check.everyDays, when: check.remindIn, short: check.short, freq: check.frequency,
      rec: check.recommendation, recSrc: check.recommendationSourceIds, drawSrc: check.drawingSourceIds, note: check.note,
    }])),
    SCANS: byPosition(rows.scans).map(scan => ({
      id: scan.id, name: scan.name, topic: scan.topic, kind: scan.kind, ...(scan.sex !== null ? { sex: scan.sex } : {}), type: scan.type,
      who: scan.who, every: scan.everyYears, freq: scan.frequency, time: scan.duration, where: scan.place, what: scan.what, note: scan.note,
      ...(scan.intakeQuestion !== null ? { ans: scan.intakeQuestion } : {}),
      ...(scan.intakeAnswers !== null ? { ansMap: scan.intakeAnswers } : {}),
      ...(scan.journeyId !== null ? { journey: scan.journeyId } : {}), src: scan.sourceIds,
    })),
    NAT: Object.fromEntries(byPosition(rows.programmes).map(programme => [programme.id, {
      kind: programme.kind, test: programme.test, ages: programme.ages, freq: programme.frequency, scan: programme.scanId, pick: programme.pick,
    }])),
    STEP_HINTS: Object.fromEntries(topics.filter(topic => guideOf.has(topic.id)).map(topic => [
      topic.id, byPosition(stepsOf.get(topic.id) ?? []).map(step => ({ pose: step.pose, move: step.move })),
    ])),
    SUGGESTIONS: { topics: suggestionTopics, general: generalSuggestions },
  };
}

/** A source as the backend's answers cite it, with the title in the given language. */
function citation(source: SourceRow, language: "en" | "fi"): Citation {
  return { title: language === "fi" ? source.nameFi ?? source.name : source.name, url: source.url, language: source.language, retrieved: source.retrieved };
}

export function assembleCatalog(rows: CatalogRows): Catalog {
  const source = sourceLookup(rows.sources);
  const catalogSource = (id: string): CatalogSource => {
    const row = source(id);
    return { title: [row.name, row.nameFi ?? row.name], url: row.url, language: row.language, retrieved: row.retrieved };
  };
  const sectionsOf = groupBy(rows.catalogSections, row => row.cardSlug);
  const notice = ["en", "fi"].map(language => {
    const row = rows.strings.find(item => item.scope === "catalog" && item.key === "notice" && item.language === language);
    if (!row) throw new Error("Content is incomplete: the catalog has no " + language + " notice");
    return row.text;
  });
  return {
    version: metaValue(rows.meta, "catalogVersion", text),
    notice: [notice[0], notice[1]],
    cards: byPosition(rows.catalogCards).map(card => {
      const sections = byPosition(sectionsOf.get(card.slug) ?? []).map(section => {
        if (section.itemsEn.length !== section.itemsFi.length) throw new Error("Content is inconsistent: " + card.slug + "/" + section.key + " has different numbers of English and Finnish items");
        const status: CatalogStatus | null = section.status === null ? null : statusSchema.parse(section.status);
        return {
          key: sectionKeySchema.parse(section.key), title: [section.titleEn, section.titleFi] as const, ...(status ? { status } : {}),
          items: section.itemsEn.map((en, index) => [en, section.itemsFi[index]] as const), sources: section.sourceIds.map(catalogSource),
        };
      });
      if (sections.length !== sectionKeys.length || sectionKeys.some(key => !sections.some(section => section.key === key))) {
        throw new Error("Content is incomplete: card " + card.slug + " does not have all five sections");
      }
      return { slug: card.slug, name: [card.nameEn, card.nameFi], summary: [card.summaryEn, card.summaryFi], sections, links: card.linkIds.map(catalogSource) };
    }),
  };
}

export function evidenceEntries(rows: EvidenceRows): EvidenceEntry[] {
  const source = sourceLookup(rows.sources);
  return rows.evidence.map((row: EvidenceRow) => {
    const language = languageSchema.parse(row.language);
    const residence: Residence = residenceSchema.parse(row.residence);
    return {
      id: row.id, language, residence, position: row.position, topic: row.topic, heading: row.heading, text: row.text,
      sources: row.sourceIds.map(id => citation(source(id), language)),
    };
  });
}
