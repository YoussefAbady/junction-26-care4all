import type { InterviewSeed, MonitorSeed, RiskSeed } from "../../../prisma/seed-data/v2-types";
import type { Copy, Language } from "../survey";
import type { DesignContent, DesignSeed } from "./design";
import type { ContentSections, InterviewContent, MonitorContent, PassageKind, RiskContent } from "./v2-types";

// What the content layer hands to the rest of the backend. The database and the in-memory store (built from the seed,
// for tests) both implement ContentStore, so callers never know which one they hold.

export const sectionKeys = ["awareness", "symptoms", "selfExamination", "homeKit", "riskFactors"] as const;
export type SectionKey = (typeof sectionKeys)[number];
export type CatalogStatus = "awareness_only" | "unavailable" | "programme_information";
export type Residence = "any" | "finland" | "abroad";

/** A source as a chat answer carries it: the title is already in the language of the answer. */
export type Citation = { title: string; url: string; language: string; retrieved: string };

/** A source as the catalog API carries it: the title in both languages. */
export type CatalogSource = { title: Copy; url: string; language: string; retrieved: string };
export type CatalogSection = { key: SectionKey; title: Copy; status?: CatalogStatus; items: Copy[]; sources: CatalogSource[] };
export type CatalogCard = { slug: string; name: Copy; summary: Copy; sections: CatalogSection[]; links: CatalogSource[] };
/** The six-topic bilingual catalog behind /api/cancers and /api/library. */
export type Catalog = { version: string; notice: Copy; cards: CatalogCard[] };

/** One passage a chat answer can quote. Several entries can share an id: one per language and residence, and ranked candidates. */
export type EvidenceEntry = {
  id: string; language: Language; residence: Residence; position: number; topic: string;
  heading: string | null; text: string; sources: Citation[];
};

export type PassageQuery = {
  question: string;
  language: Language;
  /** A topic id of the PWA ("bowel") or of the chat ("colorectal"). Passages of this topic come first. */
  topic?: string;
  limit: number;
  /**
   * Only passages of these kinds. Without it a query returns what it always did: every kind except `risk` and `risk-tip`,
   * so chat answers never quote the risk statements. The risk job asks for them (docs/design-v2.md Appendix A).
   */
  kinds?: readonly PassageKind[];
};
export type PassageSource = {
  id: string; name: string; organisation: string; url: string; published: string; retrieved: string; use: string; language: string;
};
export type RetrievedPassage = {
  id: string; heading: string; text: string; topic: string; language: Language; sources: PassageSource[];
};

export type ContentVersion = {
  /** The seed's hash, plus ".<revision>" once the content was edited in place and published again. */
  version: string;
  /** The day the content was read from its sources. */
  retrieved: string;
};
/** The PWA's own content plus the three sections design v2 adds (RISK, MONITOR, INTERVIEW): what GET /api/content serves. */
export type LoadedContent = ContentVersion & { content: DesignContent & ContentSections };

export type ContentStore = {
  /** Cheap: no content is assembled. */
  contentVersion(): Promise<ContentVersion>;
  /** The PWA's content, with the same keys and values as the seed's `content`, and RISK, MONITOR and INTERVIEW after them. */
  loadContent(): Promise<LoadedContent>;
  loadCatalog(): Promise<Catalog>;
  loadEvidence(): Promise<EvidenceEntry[]>;
  /** Passages ranked for the question: those of the topic first, then the rest. Never an account's data. */
  retrievePassages(query: PassageQuery): Promise<RetrievedPassage[]>;
  /** Design v2: everything the risk job needs. Cached by content version like the rest. */
  loadRisk(): Promise<RiskContent>;
  /** Design v2: the coverage domains, their fallback questions and the limits of the AI interview. */
  loadInterview(): Promise<InterviewContent>;
  /** Design v2: the rules, the flags and the wording of close monitoring. */
  loadMonitor(): Promise<MonitorContent>;
};

/** A source the backend cites itself. The title is English unless titleFi is given. */
export type SourceSeed = {
  id: string; organisation: string; title: string; titleFi?: string; url: string; language: string; retrieved: string; use: string;
};
export type CatalogSeed = {
  version: string;
  notice: Copy;
  sectionTitles: Record<SectionKey, Copy>;
  sources: SourceSeed[];
  cards: {
    slug: string; name: Copy; summary: Copy;
    /** Source ids of official provider pages shown beside the card. */
    linkIds: string[];
    sections: Record<SectionKey, { status?: CatalogStatus; items: Copy[]; sourceIds: string[] }>;
  }[];
};
export type EvidenceSeed = {
  sources: SourceSeed[];
  passages: {
    id: string; language: Language; residence: Residence; position: number; topic: string;
    heading?: string; text: string; sourceIds: string[];
  }[];
};
/**
 * Everything the seed loads: the PWA's content, the backend's catalog and the chat evidence, and the three modules of design
 * v2 (prisma/seed-data/risk-content.ts, interview-content.ts and monitor-content.ts).
 */
export type SeedInput = { design: DesignSeed; catalog: CatalogSeed; evidence: EvidenceSeed; risk: RiskSeed; interview: InterviewSeed; monitor: MonitorSeed };
