import type { Language } from "./survey";
import type { Citation, EvidenceEntry, Residence } from "./content/types";

// How chat answers choose and rank the passages they quote. The passages themselves, their texts and their sources, are
// content: they live in the database and arrive through the content store as EvidenceEntry rows.

export type { Citation };
export type Tier = "finland" | "europe" | "international";
export type Passage = { id: string; items: string[]; sources: Citation[]; status?: string };
export type GeneralIntent = "symptoms" | "prevention" | "guides" | "appointment" | "support" | "screening" | "follow-up";
type AdditionalFocus = "symptoms" | "riskFactors" | "overview";

const tierOrder: Tier[] = ["finland", "europe", "international"];
export const tiers: Record<string, Tier> = {
  "cancerregistry.fi": "finland", "syoparekisteri.fi": "finland", "www.terveyskirjasto.fi": "finland",
  "allaboutcancer.fi": "finland", "kaikkisyovasta.fi": "finland", "www.suomi.fi": "finland",
  // Finnish clinical guidance and the Cancer Society, named by the design's risk overview (design v2).
  "www.kaypahoito.fi": "finland", "www.syopajarjestot.fi": "finland", "www.stuk.fi": "finland", "thl.fi": "finland",
  "cancer-code-europe.iarc.who.int": "europe", "www.esmo.org": "europe", "digital-strategy.ec.europa.eu": "europe",
  "www.cancer.gov": "international",
  // UK and WHO material, used only where Finnish and European sources give no figure (design v2).
  "www.cancerresearchuk.org": "international", "www.nhs.uk": "international", "www.who.int": "international",
};
export function rankedSources(sources: Citation[]) {
  return [...new Map(sources.map(source => [source.url, source])).values()].flatMap(source => {
    const tier = tiers[new URL(source.url).hostname];
    return tier ? [{ ...source, tier }] : [];
  }).sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
}
export function preferredEvidence(candidates: Passage[]) {
  return [...candidates].sort((a, b) => {
    const rank = (passage: Passage) => {
      const first = rankedSources(passage.sources)[0];
      return first ? tierOrder.indexOf(first.tier) : tierOrder.length;
    };
    return rank(a) - rank(b);
  })[0];
}

/** The passages chat answers quote, looked up in the evidence entries the content store loaded. */
export function createEvidence(entries: readonly EvidenceEntry[]) {
  function candidates(id: string, language: Language, residence: Residence = "any"): Passage[] {
    return entries
      .filter(entry => entry.id === id && entry.language === language && entry.residence === residence)
      .sort((a, b) => a.position - b.position)
      .map(entry => ({ id: entry.id, items: [entry.text], sources: entry.sources }));
  }
  const missing = (id: string, language: Language, residence?: Residence) =>
    new Error("The content has no passage " + id + " in " + language + (residence ? " for " + residence : ""));
  function passage(id: string, language: Language, residence?: Residence) {
    const [found] = candidates(id, language, residence);
    if (!found) throw missing(id, language, residence);
    return found;
  }
  const careOptions = (language: Language, outsideFinland: boolean) => passage("professional-care", language, outsideFinland ? "abroad" : "finland");
  const counselling = (language: Language) => passage("cancer-support", language);
  const visitPreparation = (language: Language) => passage("visit-preparation", language);
  return {
    careOptions, counselling, visitPreparation,
    emergency: (language: Language, outsideFinland: boolean) => passage("emergency", language, outsideFinland ? "abroad" : "finland"),
    generalEvidence(language: Language, intent: GeneralIntent) {
      switch (intent) {
        case "prevention": {
          const options = candidates("prevention", language);
          if (!options.length) throw missing("prevention", language);
          return preferredEvidence(options);
        }
        case "appointment": return visitPreparation(language);
        case "support": return counselling(language);
        default: return passage(intent, language);
      }
    },
    /** The passage about one focus of a cancer type the catalog has no card for, with the type's name. */
    additionalEvidence(language: Language, topic: string, focus: AdditionalFocus) {
      const found = passage(topic + "-" + focus, language);
      const heading = entries.find(entry => entry.id === found.id && entry.language === language)?.heading;
      if (!heading) throw new Error("The content has no name for " + topic + " in " + language);
      return { heading, passage: found };
    },
  };
}
export type Evidence = ReturnType<typeof createEvidence>;
