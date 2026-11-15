import { z } from "zod";
import { metaValue } from "./assemble";
import type { ContentRows } from "./rows";
import { v2Problems } from "./check-v2";
import { canonicalTopic } from "./topic";

/**
 * Every id one row holds for another, checked against the rows it should name. Source ids sit in text[] columns, which
 * the database cannot check, so the seed and the tests do. An empty list means the content is consistent.
 */
export function referenceProblems(rows: ContentRows): string[] {
  const problems: string[] = [];
  const idsOf = (list: readonly { id: string }[]) => new Set(list.map(item => item.id));
  const sources = idsOf(rows.sources);
  const topics = idsOf(rows.topics);
  const articles = idsOf(rows.articles);
  const scans = idsOf(rows.scans);
  const journeys = idsOf(rows.journeys);
  const need = (known: Set<string>, id: string, where: string, what: string) => {
    if (!known.has(id)) problems.push(where + " names " + what + " " + id + ", which does not exist");
  };
  const topicOrGeneral = (id: string, where: string) => { if (id !== "general") need(topics, id, where, "topic"); };
  const cites = (where: string, ids: readonly string[]) => ids.forEach(id => need(sources, id, where, "source"));

  for (const article of rows.articles) {
    topicOrGeneral(article.topic, "Article " + article.id);
    article.related.forEach(id => need(articles, id, "Article " + article.id, "article"));
  }
  for (const section of rows.articleSections) cites("Article " + section.articleId + " section " + section.key, section.sourceIds);
  for (const topic of rows.topics) {
    const where = "Topic " + topic.id;
    cites(where, [...topic.leadSourceIds, ...topic.screeningSourceIds, ...topic.symptomsSeeSourceIds, ...topic.symptomsSourceIds]);
    [...topic.articleIds, topic.aboutId].forEach(id => need(articles, id, where, "article"));
  }
  for (const symptom of rows.symptoms) cites("Topic " + symptom.topicId + " symptom " + symptom.position, [symptom.sourceId]);
  for (const guide of rows.guides) {
    cites("Guide " + guide.topicId, [...guide.normalSourceIds, ...guide.differSourceIds, ...guide.sourceIds, ...(guide.abcde ?? []).map(letter => letter.src)]);
  }
  for (const step of rows.guideSteps) cites("Guide " + step.topicId + " step " + step.position, [step.sourceId]);
  for (const kit of rows.kits) cites("Kit " + kit.topicId, kit.sourceIds);
  for (const journey of rows.journeys) cites("Journey " + journey.id, journey.sourceIds);
  for (const step of rows.journeySteps) cites("Journey " + step.journeyId + " step " + step.position, [step.sourceId]);
  for (const check of rows.checks) {
    need(topics, check.id, "Check " + check.id, "topic");
    cites("Check " + check.id, [...check.recommendationSourceIds, ...check.drawingSourceIds]);
  }
  for (const scan of rows.scans) {
    need(topics, scan.topic, "Scan " + scan.id, "topic");
    if (scan.journeyId !== null) need(journeys, scan.journeyId, "Scan " + scan.id, "journey");
    cites("Scan " + scan.id, scan.sourceIds);
  }
  for (const programme of rows.programmes) {
    need(topics, programme.id, "Programme " + programme.id, "topic");
    need(scans, programme.scanId, "Programme " + programme.id, "scan");
  }
  for (const stat of rows.stats) {
    need(topics, stat.id, "Statistic " + stat.id, "topic");
    cites("Statistic " + stat.id, stat.sourceIds);
  }
  for (const vaccine of rows.vaccines) cites("Vaccine " + vaccine.id, vaccine.sourceIds);
  for (const rule of rows.triageRules) cites("Triage rule " + rule.position, rule.sourceIds);
  for (const faq of rows.faqs) {
    if (faq.topic !== null) need(topics, faq.topic, "Question " + faq.position, "topic");
    cites("Question " + faq.position, faq.sourceIds);
  }
  for (const suggestion of rows.suggestions) topicOrGeneral(suggestion.topic, "Suggestion " + suggestion.position);
  for (const card of rows.catalogCards) {
    need(topics, canonicalTopic(card.slug), "Catalog card " + card.slug, "topic");
    cites("Catalog card " + card.slug, card.linkIds);
  }
  for (const section of rows.catalogSections) cites("Catalog " + section.cardSlug + "/" + section.key, section.sourceIds);
  for (const row of rows.evidence) {
    topicOrGeneral(row.topic, "Evidence " + row.id);
    cites("Evidence " + row.id + " (" + row.language + ", " + row.residence + ")", row.sourceIds);
  }
  const strings = z.array(z.string());
  cites("Statistics", metaValue(rows.meta, "statsSourceIds", strings));
  cites("Triage", metaValue(rows.meta, "triageSourceIds", strings));
  problems.push(...v2Problems(rows));
  return problems;
}

/** Throws, listing every problem, unless the content is consistent. */
export function assertConsistent(rows: ContentRows) {
  const problems = referenceProblems(rows);
  if (problems.length) throw new Error("The content is inconsistent:\n" + problems.join("\n"));
}
