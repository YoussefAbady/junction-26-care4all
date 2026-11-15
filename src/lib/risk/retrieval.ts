import type { ContentStore } from "../content/types";
import { riskTipPassageId, sourceTiers, type Effect, type RiskContent, type RiskSource, type RiskType, type SourceTier } from "../content/v2-types";
import type { RiskFacts } from "./facts";
import type { Language } from "./types";

// The passages the model gets for one cancer type (docs/design-v2.md section 6.3, step 2): the type's own risk statements
// and tips first, from the content tables, then guideline and article passages found by full-text search on the person's
// strongest factors. Only passages with a source on the allow-list (a tiered source of RiskContent.sources) are used, and
// they are ordered Finland, Europe, international. Each passage has the id the model cites.

export const maxPassages = 14;
const maxTextChars = 700;
const searchKinds = ["guide", "article", "topic", "programme"] as const;

/** `effect` is set for a risk statement (its class from the design's weight) and null for a tip or a searched passage. */
export type Passage = { id: string; heading: string; text: string; effect: Effect | null; sourceIds: string[] };
export type RetrievalStore = Pick<ContentStore, "retrievePassages">;

const tierRank = (tier: SourceTier | null) => (tier ? sourceTiers.indexOf(tier) : sourceTiers.length);

/** The ids that are on the allow-list, best tier first, in the given order within a tier. */
export function citableSources(ids: readonly string[], sources: ReadonlyMap<string, RiskSource>): string[] {
  const known = [...new Set(ids)].filter(id => sources.has(id));
  return known.map((id, index) => ({ id, index })).sort((a, b) => tierRank(sources.get(a.id)!.tier) - tierRank(sources.get(b.id)!.tier) || a.index - b.index).map(item => item.id);
}
export const sourceMap = (content: RiskContent) => new Map(content.sources.filter(source => source.tier !== null).map(source => [source.id, source]));

const effectRank: Record<Effect, number> = { "very-large": 0, large: 1, moderate: 2, protective: 3, small: 4, info: 5 };

// Which interview area tells about each factor. Used only to choose what to search for, never to decide a rating.
const domainOfFactor: Record<string, string> = {
  smoke: "tobacco", passive: "tobacco", alcohol: "alcohol", active: "activity", meat: "diet", famBreast: "family", famBowel: "family",
  famProstate: "family", famSkin: "family", diab: "conditions", bp: "conditions", ibd: "conditions", liverd: "conditions", copd: "conditions",
  stomachd: "conditions", prior: "conditions", sunbed: "sun", outdoor: "sun", sun: "sun", moles: "sun", work: "work", scrC: "screening",
  hbv: "vaccines", hpv: "vaccines", testisU: "male-genital", testisR: "male-genital",
};

/** The factor keys worth searching for: the strongest statements of the type among the factors the person has told about. */
export function focusFactors(content: RiskContent, type: RiskType, facts: RiskFacts): string[] {
  const told = new Set(facts.interview.map(line => line.domain));
  const mine = content.facts.filter(fact => fact.riskType === type.id && fact.factor !== "age" && fact.effect !== "info" && fact.effect !== "protective");
  const byStrength = [...mine].sort((a, b) => effectRank[a.effect] - effectRank[b.effect] || a.position - b.position);
  const known = (key: string) => told.has(domainOfFactor[key] ?? "") || (key === "bmi" && facts.bmiBand !== undefined);
  const pool = byStrength.filter(fact => known(fact.factor));
  return [...new Set((pool.length ? pool : byStrength).map(fact => fact.factor))].slice(0, 3);
}

/** The statements and tips of one type, as passages. At most `maxPassages`, strongest statements first when there are more. */
export function ownPassages(content: RiskContent, type: RiskType, language: Language, age?: number): Passage[] {
  const sources = sourceMap(content);
  const factorOf = new Map(content.factors.map(factor => [factor.key, factor]));
  const facts = content.facts.filter(fact => fact.riskType === type.id).sort((a, b) => a.position - b.position).flatMap(fact => {
    const sourceIds = citableSources(fact.sourceIds, sources);
    if (!sourceIds.length) return [];
    const factor = factorOf.get(fact.factor);
    const state = factor?.states.find(item => item.id === fact.state)?.you[language].replace("{age}", age === undefined ? "" : String(age));
    const heading = [factor?.name[language] ?? fact.factor, state].filter(Boolean).join(" · ");
    return [{ id: fact.passageId, heading, text: fact.text[language], effect: fact.effect as Effect | null, sourceIds, position: fact.position }];
  });
  const kept = new Set([...facts].sort((a, b) => effectRank[a.effect!] - effectRank[b.effect!] || a.position - b.position).slice(0, maxPassages).map(fact => fact.id));
  const own: Passage[] = facts.filter(fact => kept.has(fact.id)).map(({ position: _position, ...passage }) => passage);
  const factorsOfType = new Set(content.facts.filter(fact => fact.riskType === type.id).map(fact => fact.factor));
  for (const factor of content.factors) {
    const tip = factor.tip?.[language];
    const sourceIds = citableSources(factor.tipSourceIds, sources);
    if (own.length < maxPassages && tip && sourceIds.length && factorsOfType.has(factor.key)) {
      own.push({ id: riskTipPassageId(factor.key), heading: factor.name[language] + " · " + (language === "fi" ? "Mikä voi auttaa" : "What can help"), text: tip, effect: null, sourceIds });
    }
  }
  return own;
}

const clipText = (text: string) => (text.length > maxTextChars ? text.slice(0, maxTextChars).replace(/\s+\S*$/, "") + "..." : text);

/** Everything the model may cite for one type, at most 14: own statements and tips, then searched passages on allow-listed sources. */
export async function passagesFor(
  store: RetrievalStore, content: RiskContent, type: RiskType, language: Language, facts: RiskFacts,
): Promise<Passage[]> {
  const passages = ownPassages(content, type, language, facts.age);
  if (passages.length >= maxPassages) return passages;
  const sources = sourceMap(content);
  const names = focusFactors(content, type, facts).map(key => content.factors.find(factor => factor.key === key)?.name[language] ?? key);
  try {
    const found = await store.retrievePassages({ question: [type.name[language], ...names].join(" "), language, topic: type.id, limit: 24, kinds: searchKinds });
    const taken = new Set(passages.map(passage => passage.id));
    const extra = found.flatMap(passage => {
      const sourceIds = citableSources(passage.sources.map(source => source.id), sources);
      if (!sourceIds.length || taken.has(passage.id) || /^risk(?:-tip)?:/.test(passage.id) || !passage.text.trim()) return [];
      taken.add(passage.id);
      return [{ id: passage.id, heading: passage.heading, text: clipText(passage.text), effect: null, sourceIds } satisfies Passage];
    });
    // Best tier first (the best of its sources), the search rank within a tier.
    const best = (passage: Passage) => tierRank(sources.get(passage.sourceIds[0])!.tier);
    extra.sort((a, b) => best(a) - best(b));
    return [...passages, ...extra].slice(0, maxPassages);
  } catch {
    return passages;
  }
}
