import { assembleCatalog, assembleContent, evidenceEntries, versionOf } from "./assemble";
import { assembleInterview, assembleMonitor, assembleRisk, contentSections } from "./assemble-v2";
import { assertConsistent } from "./check";
import { buildPassages, type PassageRow } from "./passages";
import { clampLimit, placeAnchors, retrievedPassages, searchTerms, topicAnchors } from "./retrieve";
import { toRows } from "./rows";
import { contentVersion, loadSeedInput } from "./seed-input";
import { canonicalTopic } from "./topic";
import type { ContentStore, PassageQuery, SeedInput } from "./types";
import { riskPassageKinds } from "./v2-types";

// Words the database's dictionaries leave out of a search: the commonest English and Finnish function words.
const fillerWords = new Set((
  "about after all also and any are because been but can could did does for from had has have how into its not our than that the their " +
  "them then there these they this was were what when where which who will with would you your " +
  "että kun mikä mitä miten missä mistä mutta myös ole oli olla saan sitä tai tämä voi voin"
).split(" "));
// A crude stemmer: the first five letters. It lets "changes" meet "change" and "screening" meet "screen".
const stems = (value: string, limit?: number) => searchTerms(value, limit).filter(word => word.length > 2 && !fillerWords.has(word)).map(word => word.slice(0, 5));
const words = (value: string) => new Set(stems(value, Infinity));

/**
 * Ranks like the database does, with a plain word match: passages of the question's language that share a word with it,
 * those of the topic first. Within a group a passage whose whole heading is made of words of the question comes first,
 * then the rest by relevance, divided by the logarithm of the passage's length. A word in more than half the passages
 * carries no weight. Not yet cut to the limit, so the topic's anchors can be placed first.
 */
function rankPassages(passages: readonly PassageRow[], query: PassageQuery): PassageRow[] {
  const terms = [...new Set(stems(query.question))];
  const asked = new Set(terms);
  const candidates = passages.filter(passage => passage.language === query.language).map(passage => ({
    passage, heading: words(passage.heading), body: words(passage.text), length: (passage.heading + " " + passage.text).split(/\s+/).length,
  }));
  const topic = query.topic ? canonicalTopic(query.topic) : undefined;
  const weight = new Map(terms.map(term => {
    const hits = candidates.filter(item => item.heading.has(term) || item.body.has(term)).length;
    return [term, Math.max(0, Math.log((candidates.length - hits + 0.5) / (hits + 0.5)))] as const;
  }));
  return candidates
    .map(item => ({
      passage: item.passage,
      covered: item.heading.size > 0 && [...item.heading].every(word => asked.has(word)),
      score: terms.reduce((sum, term) => sum + (weight.get(term) ?? 0) * ((item.heading.has(term) ? 2 : 0) + (item.body.has(term) ? 1 : 0)), 0) / (1 + Math.log(item.length)),
    }))
    .filter(item => item.score > 0 || item.covered)
    .sort((a, b) => Number(b.passage.topic === topic) - Number(a.passage.topic === topic) || Number(b.covered) - Number(a.covered) || b.score - a.score || (a.passage.id < b.passage.id ? -1 : 1))
    .map(item => item.passage);
}

/** The passages a question finds: the ranked ones, and the anchors of its topic placed among them. */
function findPassages(all: readonly PassageRow[], query: PassageQuery): PassageRow[] {
  if (!searchTerms(query.question).length) return [];
  // Without `kinds` a query never returns the risk statements (docs/design-v2.md A.8).
  const passages = all.filter(passage => (query.kinds ? query.kinds.includes(passage.kind as never) : !riskPassageKinds.includes(passage.kind as never)));
  const ranked = rankPassages(passages, query);
  const limit = clampLimit(query.limit);
  const topic = query.topic ? canonicalTopic(query.topic) : undefined;
  if (!topic || !ranked.length) return ranked.slice(0, limit);
  return placeAnchors(ranked, topicAnchors(passages.filter(passage => passage.language === query.language && passage.topic === topic), topic), topic, limit);
}

/**
 * A ContentStore built straight from the seed, with no database. Unit tests use it. It goes through the same row mapping
 * and assembly as the database store, so what it serves is what the database serves once it is seeded. Retrieval ranks
 * with a plain word match instead of full-text search.
 */
export function memoryContentStore(input: SeedInput = loadSeedInput()): ContentStore {
  const rows = toRows(input, contentVersion(input));
  assertConsistent(rows);
  const version = versionOf(rows);
  const content = { ...assembleContent(rows), ...contentSections(rows) };
  const risk = assembleRisk(rows);
  const interview = assembleInterview(rows);
  const monitor = assembleMonitor(rows);
  const catalog = assembleCatalog(rows);
  const evidence = evidenceEntries(rows);
  const passages = buildPassages(rows);
  const sources = new Map(rows.sources.map(source => [source.id, source]));
  return {
    contentVersion: async () => version,
    loadContent: async () => ({ ...version, content }),
    loadCatalog: async () => catalog,
    loadEvidence: async () => evidence,
    retrievePassages: async query => retrievedPassages(findPassages(passages, query), sources),
    loadRisk: async () => risk,
    loadInterview: async () => interview,
    loadMonitor: async () => monitor,
  };
}
