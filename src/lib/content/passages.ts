import { assembleContent } from "./assemble";
import type { Stat } from "./design";
import type { ContentRows } from "./rows";
import { canonicalTopic } from "./topic";
import { riskPassageId, riskTipPassageId } from "./v2-types";

/** One row of ContentPassage, without its generated search column. */
export type PassageRow = { id: string; kind: string; topic: string; language: string; heading: string; text: string; sourceIds: string[] };

const bullets = (items: readonly string[] | undefined) => (items ?? []).map(item => "- " + item);
const numbered = (items: readonly string[] | undefined) => (items ?? []).map((item, index) => index + 1 + ". " + item);
const unique = (ids: readonly string[]) => [...new Set(ids)];
const statLine = (stat: Stat) => [stat.text ?? (stat.prefix ?? "") + (stat.n ?? "") + (stat.suffix ?? ""), stat.label].join(" ");

/**
 * Every quotable passage of the content, as plain text with the sources it cites. A passage with no source cannot be
 * quoted, so it is left out. The PWA's passages are English. The catalog and the chat evidence have both languages.
 * Ids are stable: the same content gives the same ids.
 */
export function buildPassages(rows: ContentRows): PassageRow[] {
  const content = assembleContent(rows);
  const sourceById = new Map(rows.sources.map(source => [source.id, source]));
  const passages: PassageRow[] = [];
  function add(id: string, kind: string, topic: string, heading: string, parts: readonly (string | undefined)[], sourceIds: readonly string[], language = "en") {
    const text = parts.filter(part => part).join("\n");
    if (text && sourceIds.length) passages.push({ id, kind, topic, language, heading, text, sourceIds: unique(sourceIds) });
  }

  for (const article of Object.values(content.ARTICLES)) {
    add("article:" + article.id, "article", article.topic, article.title, [article.inShort], article.sections.flatMap(section => section.src));
    for (const section of article.sections) {
      add("article:" + article.id + ":" + section.id, "article", article.topic, article.title + " · " + section.h, [
        section.lead, ...section.p, ...bullets(section.list), ...numbered(section.steps),
        ...(section.cols ?? []).map(column => column.label + ": " + column.text), ...(section.stats ?? []).map(statLine),
      ], section.src);
    }
  }

  for (const topic of Object.values(content.TOPICS)) {
    const id = topic.id;
    add("topic:" + id + ":overview", "topic", id, topic.name + " · Overview", [topic.lede], topic.leadSrc);
    add("topic:" + id + ":screening", "topic", id, topic.name + " · Screening", [topic.programme, topic.screeningText], topic.screeningSrc);
    topic.symptoms.items.forEach((item, index) => add("topic:" + id + ":symptom:" + index, "symptom", id, topic.name + " · " + item.title, [item.what], [item.src]));
    add("topic:" + id + ":see", "symptom", id, topic.name + " · When to see a doctor", [topic.symptoms.see, topic.symptoms.note, topic.symptoms.contact],
      [...topic.symptoms.seeSrc, ...topic.symptoms.src]);
    const guide = topic.check;
    if (guide) {
      add("guide:" + id, "guide", id, topic.name + " · " + guide.title, guide.text, guide.src);
      guide.steps.forEach((step, index) => {
        const hint = content.STEP_HINTS[id][index];
        add("guide:" + id + ":step:" + index, "guide", id, topic.name + " · " + step.h, [step.t, step.look, hint.pose, hint.move], [step.src]);
      });
      add("guide:" + id + ":normal", "guide", id, topic.name + " · What is normal", bullets(guide.normal), guide.normalSrc);
      add("guide:" + id + ":found", "guide", id, topic.name + " · If you find a change", [guide.found], guide.src);
      add("guide:" + id + ":differ", "guide", id, topic.name + " · Where sources differ", [guide.differ], guide.differSrc);
      (guide.abcde ?? []).forEach((letter, index) => add("guide:" + id + ":abcde:" + index, "guide", id, topic.name + " · " + letter.letter + " for " + letter.word, [letter.t], [letter.src]));
    }
    if (topic.kit) add("kit:" + id, "kit", id, topic.name + " · " + topic.kit.title, [topic.kit.text], topic.kit.src);
  }

  for (const [id, journey] of Object.entries(content.JOURNEYS)) {
    const name = content.TOPICS[id]?.screenName ?? content.TOPICS[id]?.name ?? id;
    add("journey:" + id + ":intro", "journey", id, name + " · How it works", [journey.intro], journey.src);
    journey.steps.forEach((step, index) => add("journey:" + id + ":step:" + index, "journey", id, name + " · " + step.h, [step.t, step.tip], [step.src]));
    add("journey:" + id + ":benefits", "journey", id, name + " · Benefits", bullets(journey.benefits), journey.src);
    add("journey:" + id + ":downsides", "journey", id, name + " · Downsides", bullets(journey.downsides), journey.src);
    add("journey:" + id + ":unsure", "journey", id, name + " · If you are unsure", [journey.unsure], journey.src);
  }

  for (const scan of content.SCANS) {
    add("scan:" + scan.id, "scan", scan.topic, scan.name, [
      scan.type, "Who: " + scan.who, "How often: " + scan.freq, "Takes: " + scan.time, "Where: " + scan.where, scan.what, scan.note,
    ], scan.src);
  }
  for (const [id, programme] of Object.entries(content.NAT)) {
    const scan = content.SCANS.find(item => item.id === programme.scan);
    const topic = content.TOPICS[id];
    add("programme:" + id, "programme", id, (topic?.screenName ?? topic?.name ?? id) + " · National programme",
      [programme.test, programme.ages, programme.freq, programme.pick], scan?.src ?? []);
  }

  add("stats:note", "stat", "general", "About these figures", [content.STATS_NOTE], content.STATS_SRC);
  for (const [id, stat] of Object.entries(content.STATS)) {
    add("stat:" + id, "stat", id, stat.site + " · How common in Finland", [
      "Estimated cases in Finland: " + stat.both + " in total" + (stat.m !== undefined ? ", " + stat.m + " in men" : "") + (stat.f !== undefined ? ", " + stat.f + " in women" : "") + ".",
      "Chance of being diagnosed before age 75: " + stat.risk + "%.",
      stat.share?.m !== undefined ? "Share of all cancers in men: " + stat.share.m + "%." : undefined,
      stat.share?.f !== undefined ? "Share of all cancers in women: " + stat.share.f + "%." : undefined,
    ], [...content.STATS_SRC, ...(stat.src ?? [])]);
  }
  for (const [id, vaccine] of Object.entries(content.VACC)) add("vaccine:" + id, "vaccine", "general", vaccine.name, [vaccine.protects, vaccine.finland], vaccine.src);
  content.TRIAGE.rules.forEach((rule, index) => add("triage:" + index, "triage", "general", rule.h, [rule.t], rule.src));
  content.FAQ.forEach((faq, index) => add("faq:" + index, "faq", faq.t ?? "general", faq.q, [faq.a], faq.s));

  for (const card of rows.catalogCards) {
    for (const section of rows.catalogSections.filter(item => item.cardSlug === card.slug)) {
      const base = "catalog:" + card.slug + ":" + section.key + ":";
      add(base + "en", "catalog", canonicalTopic(card.slug), card.nameEn + " · " + section.titleEn, section.itemsEn, section.sourceIds, "en");
      add(base + "fi", "catalog", canonicalTopic(card.slug), card.nameFi + " · " + section.titleFi, section.itemsFi, section.sourceIds, "fi");
    }
  }

  for (const row of rows.evidence) {
    const source = sourceById.get(row.sourceIds[0]);
    const title = source && (row.language === "fi" ? source.nameFi ?? source.name : source.name);
    const id = ["evidence", row.id, row.language, ...(row.residence !== "any" || row.position > 0 ? [row.residence] : []), ...(row.position > 0 ? [String(row.position)] : [])].join(":");
    add(id, "evidence", row.topic, row.heading ?? title ?? row.id, [row.text], row.sourceIds, row.language);
  }

  // Design v2: each risk statement and each factor tip with sources, in both languages (docs/design-v2.md A.8). A query only
  // returns them when it asks for kinds risk and risk-tip. The statement's effect class is on the fact that has the same
  // passage id (RiskContent.facts), so the risk job reads it from there.
  const typeName = new Map(rows.riskTypes.map(type => [type.id, { en: type.nameEn, fi: type.nameFi }]));
  const factorOf = new Map(rows.riskFactors.map(factor => [factor.key, factor]));
  for (const fact of rows.riskFacts) {
    const factor = factorOf.get(fact.factor);
    const type = typeName.get(fact.riskType);
    if (!factor || !type) continue;
    const state = factor.states.find(item => item.id === fact.state);
    // The age statement has no state sentence worth searching for ("You are {age} years old"): its heading ends at the factor.
    const part = (language: "en" | "fi") => factor.key === "age" ? [] : state ? [state.you[language]] : [];
    add(riskPassageId(fact.riskType, fact.factor, fact.state), "risk", fact.riskType,
      [type.en, factor.nameEn, ...part("en")].join(" · "), [fact.textEn], fact.sourceIds);
    add(riskPassageId(fact.riskType, fact.factor, fact.state, "fi"), "risk", fact.riskType,
      [type.fi, factor.nameFi, ...part("fi")].join(" · "), [fact.textFi], fact.sourceIds, "fi");
  }
  for (const factor of rows.riskFactors) {
    if (factor.tipEn === null || factor.tipFi === null) continue;
    add(riskTipPassageId(factor.key), "risk-tip", "general", factor.nameEn + " · What can help", [factor.tipEn], factor.tipSourceIds);
    add(riskTipPassageId(factor.key, "fi"), "risk-tip", "general", factor.nameFi + " · Mikä auttaa", [factor.tipFi], factor.tipSourceIds, "fi");
  }
  return passages;
}
