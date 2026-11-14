import { profileFields, noteDetails } from "./design-contract";
import { ageOf, eq, field, val } from "./intake/access";
import { summarise } from "./intake/report";
import type { Answers } from "./intake/types";
import { tr, type Language } from "./survey";

type SavedObservation = { kind: string; label: string; notes: string; details: unknown; observedAt: Date | null; createdAt: Date };

export function summarizeChatContext(answers: Answers, rawProfile: unknown, observations: SavedObservation[], language: Language, topic?: string) {
  const profile = profileFields.safeParse(rawProfile).data;
  const locale = language === "fi" ? "fi-FI" : "en-GB";
  const text = (en: string, fi: string) => tr(language, [en, fi]);
  const fmtDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Helsinki" });
  const summary = summarise(answers, language);
  const relatedIds: Record<string, string[]> = {
    breast: ["scr_mammo"], cervical: ["scr_cervix"], colorectal: ["scr_fit", "scr_colon", "scr_colon_result"], prostate: ["scr_psa"],
  };
  const preferred = new Set([...(relatedIds[topic ?? ""] ?? []), "scr_result", "scr_pending", "scr_pending_detail", "cancer_list", "fh_list", "conditions", "meds_list", "meds_key"]);
  const relevantSurvey = summary.filter(section => section.module !== "you").flatMap(section =>
    section.items.filter(item => !item.note).map(item => ({ ...item, chapter: section.module })))
    .sort((a, b) => Number(preferred.has(b.id)) - Number(preferred.has(a.id))).slice(0, 8)
    .map(item => ({ label: item.label, value: item.value, chapter: item.chapter }));
  const notes = observations.map(observation => ({ ...observation, detail: noteDetails.safeParse(observation.details).data }));
  const relevantNotes = [...notes].sort((a, b) => Number(Boolean(topic && b.detail?.topic === topic)) - Number(Boolean(topic && a.detail?.topic === topic))).slice(0, 4)
    .map(note => ({
      label: note.label, notes: note.notes, kind: note.kind, date: fmtDate.format(note.observedAt ?? note.createdAt),
      dateKind: note.observedAt ? "observed" : "logged",
      topic: note.detail?.topic ?? null, symptoms: note.detail?.symptoms ?? [], onset: note.detail?.onset ?? null,
      persistence: note.detail?.persistence ?? null, course: note.detail?.course ?? null,
      impact: note.detail?.impact ?? null, selfCheck: note.detail?.selfCheck ?? null,
    }));
  const demographics = {
    age: ageOf(answers) ?? null, birthYear: profile?.yob ?? null,
    sex: typeof val(answers, "sex") === "string" ? val(answers, "sex") : profile?.sex ?? null,
    region: profile?.county ?? (typeof val(answers, "residence") === "string" ? val(answers, "residence") : null),
  };
  const outsideFinland = eq(answers, "residence", "abroad");
  const hasCareHistory = eq(answers, "cancer_personal", "yes");
  const savedScreeningTopic = summary.some(section => section.items.some(item => item.id === "scr_result")) ? field(answers, "scr_result", "test") : undefined;
  const observationTopics = [...new Set(notes.map(note => note.detail?.topic).filter(value => value !== undefined))];
  const relatedTopic = typeof savedScreeningTopic === "string" && savedScreeningTopic !== "other"
    ? savedScreeningTopic : observationTopics.length === 1 ? observationTopics[0] : undefined;
  const prompts: string[] = [];
  if (relevantNotes.length) prompts.push(text("Which of my recorded changes should I describe first?", "Mistä kirjaamastani muutoksesta kannattaa kertoa ensin?"));
  if (summary.some(section => section.module === "screen")) prompts.push(text("Could you explain what my previous screening or result means for follow-up?", "Voisitko selittää, mitä aiempi seulonta tai sen tulos tarkoittaa seurannan kannalta?"));
  if (hasCareHistory || summary.some(section => section.module === "health" || section.module === "family")) {
    prompts.push(text("Which parts of my health history should I bring to the appointment?", "Mitkä terveystietoni kannattaa ottaa mukaan vastaanotolle?"));
  }
  if (demographics.age !== null || demographics.birthYear !== null || demographics.region !== null || demographics.sex !== null) {
    prompts.push(text("Which screening information applies to my age, circumstances and area?", "Mikä seulontatieto koskee ikääni, tilannettani ja asuinaluettani?"));
  }
  return {
    outsideFinland, hasCareHistory, relatedTopic,
    patientReported: { demographics, survey: relevantSurvey, observations: relevantNotes },
    questionsForProfessional: prompts,
  };
}

