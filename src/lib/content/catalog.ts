import { tr, type Language } from "../survey";
import type { Catalog, CatalogCard, CatalogSection, SectionKey } from "./types";

// The backend catalog as the API shows it. These functions return what src/lib/cancer-catalog.ts used to return, from a
// catalog loaded through the content store.

export function sectionOf(card: CatalogCard, key: SectionKey): CatalogSection {
  const section = card.sections.find(item => item.key === key);
  if (!section) throw new Error("Catalog card " + card.slug + " has no " + key + " section");
  return section;
}

/** The cards with this slug, or all of them when there is no slug. */
export function selectCards(catalog: Catalog, slug?: string) {
  return catalog.cards.filter(card => !slug || card.slug === slug);
}

export function localizedSection(section: CatalogSection, language: Language) {
  return {
    ...(section.status ? { status: section.status } : {}),
    items: section.items.map(item => tr(language, item)),
    sources: section.sources.map(source => ({ title: tr(language, source.title), url: source.url, language: source.language, retrieved: source.retrieved })),
  };
}

export function cancerCards(catalog: Catalog, language: Language, slug?: string) {
  return selectCards(catalog, slug).map(card => ({
    slug: card.slug,
    name: tr(language, card.name),
    summary: tr(language, card.summary),
    awareness: localizedSection(sectionOf(card, "awareness"), language),
    symptoms: localizedSection(sectionOf(card, "symptoms"), language),
    selfExamination: localizedSection(sectionOf(card, "selfExamination"), language),
    homeKit: localizedSection(sectionOf(card, "homeKit"), language),
    riskFactors: localizedSection(sectionOf(card, "riskFactors"), language),
  }));
}
