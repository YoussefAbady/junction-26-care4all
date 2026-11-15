import { z } from "zod";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { assembleCatalog, assembleContent, evidenceEntries, versionOf } from "./assemble";
import { assembleInterview, assembleMonitor, assembleRisk, contentSections } from "./assemble-v2";
import { answerLabelsSchema, columnSchema, letterSchema, linkSchema, statSchema, videoSchema } from "./design";
import type { CatalogRows, ContentRows, DesignRows, EvidenceRows, V2Rows } from "./rows";
import { anchorIds, clampLimit, placeAnchors, retrievedPassages, searchTerms, topicAnchors } from "./retrieve";
import { canonicalTopic } from "./topic";
import type { ContentStore, ContentVersion, PassageQuery, RetrievedPassage } from "./types";
import { riskPassageKinds } from "./v2-types";
import { domainFallbackSchema, riskFactorStatesSchema } from "./v2-schemas";

/** Either the client or the client of an open transaction. */
export type Db = PrismaClient | Prisma.TransactionClient;

const optional = <T>(schema: z.ZodType<T>, value: unknown) => (value === null ? null : schema.parse(value));

/** Meta, sources and strings: what every kind of content needs. */
const readShared = async (db: Db) => {
  const [meta, sources, strings] = await Promise.all([db.contentMeta.findMany(), db.contentSource.findMany(), db.contentString.findMany()]);
  return { meta, sources, strings };
};

/** The PWA's own content. The Json columns are checked on the way in, so a hand edit that breaks one fails here. */
async function readDesignTables(db: Db) {
  const [counties, articles, articleSections, topics, symptoms, guides, guideSteps, kits, journeys, journeySteps, checks, scans, programmes, stats, vaccines, triageRules, faqs, suggestions] =
    await Promise.all([
      db.contentCounty.findMany(), db.contentArticle.findMany(), db.contentArticleSection.findMany(), db.contentTopic.findMany(),
      db.contentSymptom.findMany(), db.contentGuide.findMany(), db.contentGuideStep.findMany(), db.contentKit.findMany(),
      db.contentJourney.findMany(), db.contentJourneyStep.findMany(), db.contentCheck.findMany(), db.contentScan.findMany(),
      db.contentProgramme.findMany(), db.contentStat.findMany(), db.contentVaccine.findMany(), db.contentTriageRule.findMany(),
      db.contentFaq.findMany(), db.contentSuggestion.findMany(),
    ]);
  return {
    counties, articles, topics, symptoms, guideSteps, journeys, journeySteps, checks, programmes, stats, vaccines, triageRules, faqs, suggestions,
    articleSections: articleSections.map(row => ({
      ...row, stats: optional(z.array(statSchema), row.stats), cols: optional(z.array(columnSchema), row.cols), link: optional(linkSchema, row.link),
    })),
    guides: guides.map(row => ({ ...row, videos: z.array(videoSchema).parse(row.videos), abcde: optional(z.array(letterSchema), row.abcde) })),
    kits: kits.map(row => ({ ...row, video: optional(videoSchema, row.video) })),
    scans: scans.map(row => ({ ...row, intakeAnswers: optional(answerLabelsSchema, row.intakeAnswers) })),
  };
}
const readCatalogTables = async (db: Db) => {
  const [catalogCards, catalogSections] = await Promise.all([db.contentCatalogCard.findMany(), db.contentCatalogSection.findMany()]);
  return { catalogCards, catalogSections };
};
const readEvidenceTable = async (db: Db) => ({ evidence: await db.contentEvidence.findMany() });

/** The design v2 tables: the risk rules, the interview domains and the monitoring flags. Their jsonb columns are checked on the way in. */
async function readV2Tables(db: Db): Promise<V2Rows> {
  const [riskTypes, riskFactors, riskFacts, guidelines, domains, monitorFlags] = await Promise.all([
    db.contentRiskType.findMany(), db.contentRiskFactor.findMany(), db.contentRiskFact.findMany(), db.contentGuideline.findMany(),
    db.contentAssessmentDomain.findMany(), db.contentMonitorFlag.findMany(),
  ]);
  return {
    riskTypes, riskFacts, guidelines, monitorFlags,
    riskFactors: riskFactors.map(row => ({ ...row, states: riskFactorStatesSchema.parse(row.states) })),
    domains: domains.map(row => ({ ...row, fallback: domainFallbackSchema.parse(row.fallback) })),
  };
}

/** Every row of every content table, except the passage index, which is derived from them. */
export async function readRows(db: Db): Promise<ContentRows> {
  return { ...await readShared(db), ...await readDesignTables(db), ...await readCatalogTables(db), ...await readEvidenceTable(db), ...await readV2Tables(db) };
}

const json = (value: unknown) => (value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue));

/** Writes the rows, parents before children. */
export async function writeRows(tx: Prisma.TransactionClient, rows: ContentRows) {
  await tx.contentMeta.createMany({ data: rows.meta.map(row => ({ key: row.key, value: row.value as Prisma.InputJsonValue })) });
  await tx.contentSource.createMany({ data: rows.sources });
  await tx.contentString.createMany({ data: rows.strings });
  await tx.contentCounty.createMany({ data: rows.counties });
  await tx.contentArticle.createMany({ data: rows.articles });
  await tx.contentArticleSection.createMany({ data: rows.articleSections.map(row => ({ ...row, stats: json(row.stats), cols: json(row.cols), link: json(row.link) })) });
  await tx.contentTopic.createMany({ data: rows.topics });
  await tx.contentSymptom.createMany({ data: rows.symptoms });
  await tx.contentGuide.createMany({ data: rows.guides.map(row => ({ ...row, abcde: json(row.abcde) })) });
  await tx.contentGuideStep.createMany({ data: rows.guideSteps });
  await tx.contentKit.createMany({ data: rows.kits.map(row => ({ ...row, video: json(row.video) })) });
  await tx.contentJourney.createMany({ data: rows.journeys });
  await tx.contentJourneyStep.createMany({ data: rows.journeySteps });
  await tx.contentCheck.createMany({ data: rows.checks });
  await tx.contentScan.createMany({ data: rows.scans.map(row => ({ ...row, intakeAnswers: json(row.intakeAnswers) })) });
  await tx.contentProgramme.createMany({ data: rows.programmes });
  await tx.contentStat.createMany({ data: rows.stats });
  await tx.contentVaccine.createMany({ data: rows.vaccines });
  await tx.contentTriageRule.createMany({ data: rows.triageRules });
  await tx.contentFaq.createMany({ data: rows.faqs });
  await tx.contentSuggestion.createMany({ data: rows.suggestions });
  await tx.contentCatalogCard.createMany({ data: rows.catalogCards });
  await tx.contentCatalogSection.createMany({ data: rows.catalogSections });
  await tx.contentEvidence.createMany({ data: rows.evidence });
  // Design v2. The facts and the guidelines name a cancer type, and the facts a factor, so those come first.
  await tx.contentRiskType.createMany({ data: rows.riskTypes });
  await tx.contentRiskFactor.createMany({ data: rows.riskFactors.map(row => ({ ...row, states: row.states as Prisma.InputJsonValue })) });
  await tx.contentRiskFact.createMany({ data: rows.riskFacts });
  await tx.contentGuideline.createMany({ data: rows.guidelines });
  await tx.contentAssessmentDomain.createMany({ data: rows.domains.map(row => ({ ...row, fallback: row.fallback as Prisma.InputJsonValue })) });
  await tx.contentMonitorFlag.createMany({ data: rows.monitorFlags });
}

/** Empties every content table, children before parents. ContentReport holds people's reports and is never touched. */
export async function deleteContent(tx: Prisma.TransactionClient) {
  await tx.contentPassage.deleteMany();
  await tx.contentMonitorFlag.deleteMany();
  await tx.contentAssessmentDomain.deleteMany();
  await tx.contentGuideline.deleteMany();
  await tx.contentRiskFact.deleteMany();
  await tx.contentRiskFactor.deleteMany();
  await tx.contentRiskType.deleteMany();
  await tx.contentEvidence.deleteMany();
  await tx.contentCatalogSection.deleteMany();
  await tx.contentCatalogCard.deleteMany();
  await tx.contentSuggestion.deleteMany();
  await tx.contentFaq.deleteMany();
  await tx.contentTriageRule.deleteMany();
  await tx.contentVaccine.deleteMany();
  await tx.contentStat.deleteMany();
  await tx.contentProgramme.deleteMany();
  await tx.contentScan.deleteMany();
  await tx.contentCheck.deleteMany();
  await tx.contentJourneyStep.deleteMany();
  await tx.contentJourney.deleteMany();
  await tx.contentKit.deleteMany();
  await tx.contentGuideStep.deleteMany();
  await tx.contentGuide.deleteMany();
  await tx.contentSymptom.deleteMany();
  await tx.contentTopic.deleteMany();
  await tx.contentArticleSection.deleteMany();
  await tx.contentArticle.deleteMany();
  await tx.contentCounty.deleteMany();
  await tx.contentString.deleteMany();
  await tx.contentSource.deleteMany();
  await tx.contentMeta.deleteMany();
}

/** The version of the content in the database. Throws when nothing has been seeded. */
export async function readVersion(db: Db): Promise<ContentVersion> {
  return versionOf({ meta: await db.contentMeta.findMany({ where: { key: { in: ["contentVersion", "contentRevision", "retrieved"] } } }) });
}

type PassageRecord = { id: string; heading: string; text: string; topic: string; language: string; sourceIds: string[] };

/**
 * Full-text search over ContentPassage in the language of the question. Any word of the question can match. Passages of
 * the topic come first, then the rest. Within a group a passage whose whole heading is made of words of the question comes
 * first ("Breast · Screening", "What is cancer?"), then the rest by ts_rank_cd, divided by the logarithm of the passage's
 * length so that a short precise passage is not crowded out by long articles. When a topic is given and the question found
 * something, the topic's anchors (see placeAnchors) are added.
 */
async function retrieveFromDatabase(db: Db, query: PassageQuery): Promise<RetrievedPassage[]> {
  const terms = searchTerms(query.question);
  if (!terms.length) return [];
  const dictionary = query.language === "fi" ? Prisma.sql`'finnish'::regconfig` : Prisma.sql`'english'::regconfig`;
  const match = Prisma.sql`to_tsquery(${dictionary}, ${terms.join(" | ")})`;
  const topic = query.topic ? canonicalTopic(query.topic) : "";
  const limit = clampLimit(query.limit);
  const headingWords = Prisma.sql`tsvector_to_array(to_tsvector(${dictionary}, "heading"))`;
  // Without `kinds` a query never returns the risk statements, so chat answers and the retrieval gold set stay as they were.
  const kindFilter = query.kinds ? Prisma.sql`"kind" IN (${Prisma.join([...query.kinds])})` : Prisma.sql`"kind" NOT IN (${Prisma.join([...riskPassageKinds])})`;
  if (query.kinds && !query.kinds.length) return [];
  const ranked = await db.$queryRaw<PassageRecord[]>`
    SELECT "id", "heading", "text", "topic", "language", "sourceIds" FROM "ContentPassage"
    WHERE "language" = ${query.language} AND "search" @@ ${match} AND ${kindFilter}
    ORDER BY ("topic" = ${topic}) DESC,
      (cardinality(${headingWords}) > 0 AND ${headingWords} <@ tsvector_to_array(to_tsvector(${dictionary}, ${query.question}))) DESC,
      ts_rank_cd("search", ${match}, 1) DESC, "id"
    LIMIT ${limit}`;
  const anchors = topic && ranked.length ? topicAnchors(await db.$queryRaw<(PassageRecord & { kind: string })[]>`
    SELECT "id", "kind", "heading", "text", "topic", "language", "sourceIds" FROM "ContentPassage"
    WHERE "language" = ${query.language} AND "topic" = ${topic} AND ${kindFilter} AND ("id" IN (${Prisma.join(anchorIds(topic))}) OR "kind" = 'catalog')`, topic) : [];
  const found = anchors.length && topic ? placeAnchors(ranked, anchors, topic, limit) : ranked;
  const sources = await db.contentSource.findMany({ where: { id: { in: [...new Set(found.flatMap(passage => passage.sourceIds))] } } });
  const byId = new Map(sources.map(source => [source.id, source]));
  return retrievedPassages(found, byId);
}

type Loaded<T> = { version: ContentVersion; value: T };
const retryAfterFailureMs = 5000;

/**
 * Keeps what `load` returned for ttlMs. After that it asks `peek` for the version only, and loads again only when the
 * version changed. If the database cannot be reached it keeps serving the last copy it has, and tries again in a few seconds.
 */
function cachedByVersion<T>(ttlMs: number, peek: () => Promise<ContentVersion>, load: () => Promise<Loaded<T>>) {
  let entry: { loaded: Loaded<T>; expires: number } | undefined;
  let pending: Promise<Loaded<T>> | undefined;
  async function refresh() {
    try {
      const latest = await peek();
      if (entry && entry.loaded.version.version === latest.version) {
        entry.expires = Date.now() + ttlMs;
        return entry.loaded;
      }
      const loaded = await load();
      entry = { loaded, expires: Date.now() + ttlMs };
      return loaded;
    } catch (error) {
      if (!entry) throw error;
      entry.expires = Date.now() + retryAfterFailureMs;
      return entry.loaded;
    }
  }
  return () => {
    if (entry && entry.expires > Date.now()) return Promise.resolve(entry.loaded);
    return pending ??= refresh().finally(() => { pending = undefined; });
  };
}

/**
 * The content store over PostgreSQL. Each kind of content is assembled on first use and cached in memory by contentVersion
 * for ttlMs, so a failure in one kind, such as the PWA's content, does not stop another, such as the chat evidence.
 * The client is fetched when a call needs it, so a database that is not configured fails the call, not the store.
 */
export function databaseContentStore(getClient: () => PrismaClient, ttlMs = 30_000): ContentStore {
  const peek = async () => readVersion(getClient());
  // One transaction at one point in time, so a seed that commits meanwhile cannot leave a mixture of old and new rows.
  const snapshot = <T>(assemble: (tx: Prisma.TransactionClient) => Promise<Loaded<T>>) =>
    cachedByVersion(ttlMs, peek, async () => getClient().$transaction(assemble, { isolationLevel: "RepeatableRead", timeout: 15_000 }));
  const version = cachedByVersion(ttlMs, peek, async () => { const current = await peek(); return { version: current, value: current }; });
  const content = snapshot(async tx => {
    const rows: DesignRows & V2Rows = { ...await readShared(tx), ...await readDesignTables(tx), ...await readV2Tables(tx) };
    return { version: versionOf(rows), value: { ...assembleContent(rows), ...contentSections(rows) } };
  });
  // The three read models of design v2, each in its own snapshot: a broken kind of content does not stop another.
  const v2 = <T>(assemble: (rows: Pick<ContentRows, "meta" | "sources" | "strings"> & V2Rows) => T) => snapshot(async tx => {
    const rows = { ...await readShared(tx), ...await readV2Tables(tx) };
    return { version: versionOf(rows), value: assemble(rows) };
  });
  const risk = v2(assembleRisk);
  const interview = v2(assembleInterview);
  const monitor = v2(assembleMonitor);
  const catalog = snapshot(async tx => {
    const rows: CatalogRows = { ...await readShared(tx), ...await readCatalogTables(tx) };
    return { version: versionOf(rows), value: assembleCatalog(rows) };
  });
  const evidence = snapshot(async tx => {
    const rows: EvidenceRows & Pick<ContentRows, "meta"> = { ...await readShared(tx), ...await readEvidenceTable(tx) };
    return { version: versionOf(rows), value: evidenceEntries(rows) };
  });
  return {
    contentVersion: async () => (await version()).value,
    loadContent: async () => {
      const loaded = await content();
      return { ...loaded.version, content: loaded.value };
    },
    loadCatalog: async () => (await catalog()).value,
    loadEvidence: async () => (await evidence()).value,
    retrievePassages: async query => retrieveFromDatabase(getClient(), query),
    loadRisk: async () => (await risk()).value,
    loadInterview: async () => (await interview()).value,
    loadMonitor: async () => (await monitor()).value,
  };
}
