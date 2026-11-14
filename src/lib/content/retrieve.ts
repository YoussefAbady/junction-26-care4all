import type { PassageRow } from "./passages";
import type { SourceRow } from "./rows";
import type { PassageSource, RetrievedPassage } from "./types";

// Retrieval pieces shared by the database store and the in-memory one. The database ranks with full-text search (store.ts).

const maxPassages = 20;
export const clampLimit = (limit: number) => Math.min(Math.max(Math.trunc(limit) || 1, 1), maxPassages);

/** The words of a question that can match a passage. Letters and digits only, so they are safe in a tsquery. */
export function searchTerms(question: string, limit = 32) {
  const words = question.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.map(word => word.slice(0, 64)))].slice(0, limit);
}

function passageSource(source: SourceRow, language: "en" | "fi"): PassageSource {
  return {
    id: source.id, name: language === "fi" ? source.nameFi ?? source.name : source.name, organisation: source.organisation, url: source.url,
    published: source.published, retrieved: source.retrieved, use: source.use, language: source.language,
  };
}

/** The passages with their sources, in order. A passage whose sources are gone cannot be quoted and is dropped. */
export function retrievedPassages(passages: readonly Pick<PassageRow, "id" | "heading" | "text" | "topic" | "language" | "sourceIds">[], sources: ReadonlyMap<string, SourceRow>): RetrievedPassage[] {
  return passages.flatMap(passage => {
    const language = passage.language === "fi" ? "fi" : "en";
    const cited = passage.sourceIds.flatMap(id => { const source = sources.get(id); return source ? [passageSource(source, language)] : []; });
    return cited.length ? [{ id: passage.id, heading: passage.heading, text: passage.text, topic: passage.topic, language, sources: cited }] : [];
  });
}

// A topic's anchors are the passages that state its core facts. A question about the topic gets them whatever its words are,
// because the national programme or the catalog summary rarely repeats a question's words as often as a long article does.
const anchorLead = 3; // The best ranked passages of the topic that stay in front of the anchors.

/** The ids of a topic's passages that state its core facts: the overview, the screening and the national programme. */
export const anchorIds = (topic: string) => ["topic:" + topic + ":overview", "topic:" + topic + ":screening", "programme:" + topic];

/**
 * A topic's anchors among some passages of its language: the core facts first, then the topic's catalog sections, which are
 * the reviewed summary of each cancer type.
 */
export function topicAnchors<T extends { id: string; kind: string }>(passages: readonly T[], topic: string): T[] {
  const core = anchorIds(topic).flatMap(id => passages.filter(passage => passage.id === id));
  return [...core, ...passages.filter(passage => passage.kind === "catalog").sort((a, b) => (a.id < b.id ? -1 : 1))];
}

/**
 * Ranked passages, those of the topic first, with the topic's anchors placed after the best three of them. A question that
 * matches no passage of the topic still gets its anchors, once it has matched something. The topic's passages never come
 * after another topic's.
 */
export function placeAnchors<T extends { id: string; topic: string }>(ranked: readonly T[], anchors: readonly T[], topic: string, limit: number): T[] {
  const inTopic = ranked.filter(passage => passage.topic === topic);
  const head = inTopic.slice(0, anchorLead);
  const placed = anchors.filter(anchor => !head.some(passage => passage.id === anchor.id));
  const rest = inTopic.slice(anchorLead).filter(passage => !placed.some(anchor => anchor.id === passage.id));
  return [...head, ...placed, ...rest, ...ranked.filter(passage => passage.topic !== topic)].slice(0, limit);
}
