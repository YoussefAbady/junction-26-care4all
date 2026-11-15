import { z } from "zod";
import { cancerTopic } from "./design-contract";
import { bodyRegions } from "./intake/body";
import { basicsComplete, canDecline, canSkip, canUnsure, flow, helpOf, livePlan, missing, optionsOf, titleOf } from "./intake/engine";
import type { Field, Progress } from "./intake/types";
import type { Evidence } from "./chat-evidence";
import { tr, type Copy, type Language } from "./survey";

const language = z.enum(["en", "fi"]);
export const journeyInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start_intake"), language }).strict(),
  z.object({ action: z.literal("answer_intake"), language, revision: z.number().int().nonnegative(), questionId: z.string().max(80), value: z.unknown() }).strict(),
  z.object({ action: z.literal("finish_intake"), language, revision: z.number().int().nonnegative(), confirmed: z.literal(true) }).strict(),
  z.object({ action: z.literal("start_symptom"), language, topic: cancerTopic.optional() }).strict(),
  z.object({ action: z.literal("answer_symptom"), language, id: z.uuid(), step: z.enum(["label", "onset", "course", "impact", "notes"]), value: z.string().trim().max(1500) }).strict(),
  z.object({ action: z.literal("save_symptom"), language, id: z.uuid() }).strict(),
  z.object({ action: z.literal("cancel_symptom"), language, id: z.uuid() }).strict(),
]);
export type JourneyInput = z.infer<typeof journeyInput>;
export function intakeInteraction(progress: Progress, lang: Language) {
  if (progress.complete) return { type: "intake_complete", revision: progress.revision };
  // The live flow is the basics only (section 5.1). Answers saved to the retired chapters stay in the progress but are not asked.
  const unanswered = missing(progress.answers, livePlan);
  const questions = flow(progress.answers, livePlan);
  const question = unanswered.find(item => item.id === progress.cursor) ?? unanswered[0];
  if (!question) return { type: "review_intake", revision: progress.revision, title: tr(lang, ["Review and confirm your answers", "Tarkista ja vahvista vastauksesi"]), answers: progress.answers };
  function localField(field: Field) {
    return {
      ...field, label: tr(lang, field.label),
      ...("options" in field ? { options: field.options.map(item => ({ id: item.id, label: tr(lang, item.label), exclusive: item.exclusive ?? false })) } : {}),
      ...("unit" in field && field.unit ? { unit: tr(lang, field.unit) } : {}),
      ...("placeholder" in field && field.placeholder ? { placeholder: tr(lang, field.placeholder) } : {}),
    };
  }
  return {
    type: "intake_question", revision: progress.revision, id: question.id, input: question.type,
    title: titleOf(question, progress.answers, lang), help: helpOf(question, progress.answers, lang),
    progress: { answered: questions.length - unanswered.length, total: questions.length },
    markers: [
      ...(canUnsure(question) ? ["unsure"] : []), ...(canDecline(question) ? ["declined"] : []), ...(canSkip(question) ? ["skipped"] : []),
    ],
    options: "options" in question ? optionsOf(question, progress.answers).map(item => ({ id: item.id, label: tr(lang, item.label), exclusive: item.exclusive ?? false }))
      : question.type === "body" ? bodyRegions.map(item => ({ id: item.id, label: tr(lang, item.label) })) : undefined,
    fields: "fields" in question ? question.fields.map(localField) : undefined,
    min: "min" in question ? question.min : undefined, max: "max" in question ? question.max : undefined,
    decimals: "decimals" in question ? question.decimals : undefined,
    unit: "unit" in question ? tr(lang, question.unit) : undefined,
    low: question.type === "scale" ? tr(lang, question.low) : undefined,
    high: question.type === "scale" ? tr(lang, question.high) : undefined,
  };
}

const symptomQuestions = [
  { id: "label", title: ["What did you notice, and where?", "Mitä huomasit ja missä?"] },
  { id: "onset", title: ["When did you first notice it?", "Milloin huomasit sen ensimmäisen kerran?"], options: [
    ["today", "Today", "Tänään"], ["week", "In the past week", "Viimeisen viikon aikana"], ["weeks", "One to four weeks ago", "1–4 viikkoa sitten"], ["month", "More than a month ago", "Yli kuukausi sitten"], ["unsure", "Not sure", "En ole varma"],
  ] },
  { id: "course", title: ["How has it changed since you first noticed it?", "Miten se on muuttunut sen jälkeen, kun huomasit sen?"], options: [
    ["same", "About the same", "Suunnilleen ennallaan"], ["worse", "Getting worse", "Pahentunut"], ["better", "Getting better", "Helpottanut"], ["comes", "Comes and goes", "Tulee ja menee"], ["gone", "Gone", "Mennyt ohi"], ["unsure", "Not sure", "En ole varma"],
  ] },
  { id: "impact", title: ["How does it affect your daily activities?", "Miten se vaikuttaa arkeesi?"], options: [
    ["none", "No effect", "Ei vaikutusta"], ["some", "Some effect", "Jonkin verran"], ["limits", "Limits daily activities", "Rajoittaa arkea"], ["unsure", "Not sure", "En ole varma"],
  ] },
  { id: "notes", title: ["Anything else you want to share with your healthcare professional?", "Haluatko kertoa ammattilaiselle vielä jotain?"] },
] as const;
export const symptomDraft = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  onset: z.enum(["today", "week", "weeks", "month", "unsure"]).optional(),
  course: z.enum(["same", "worse", "better", "comes", "gone", "unsure"]).optional(),
  impact: z.enum(["none", "some", "limits", "unsure"]).optional(),
  notes: z.string().trim().max(1500).optional(),
  topic: cancerTopic.optional(),
}).strict();
type Draft = z.infer<typeof symptomDraft>;
export function symptomInteraction(id: string, draft: Draft, lang: Language) {
  const question = symptomQuestions.find(item => draft[item.id] === undefined && !(item.id === "impact" && draft.course === "gone"));
  if (!question) return { type: "review_symptom", id, title: tr(lang, ["Review your symptom note", "Tarkista oiremerkintäsi"]), draft };
  return {
    type: "symptom_question", id, step: question.id,
    title: question.id === "notes" && draft.course === "comes"
      ? tr(lang, ["When does it come back, and what else do you notice at the same time?", "Milloin oire palaa, ja mitä muuta huomaat samaan aikaan?"])
      : tr(lang, question.title),
    input: "options" in question ? "choice" : "text", optional: question.id === "notes",
    max: question.id === "label" ? 120 : question.id === "notes" ? 1500 : undefined,
    options: "options" in question ? question.options.map(([id, en, fi]) => ({ id, label: tr(lang, [en, fi]) })) : undefined,
  };
}

/**
 * What the account has done in the AI part (docs/design-v2.md section 5.5). Both are left out when they are not known, and the
 * next action is then what it was before the AI interview existed.
 * interview: none (not started), active, or complete. risk: none, running, failed, or current (a complete assessment made after
 * the interview was completed, with the current content).
 */
export type AiProgress = { interview?: "none" | "active" | "complete"; risk?: "none" | "running" | "failed" | "current" };

export function nextAction(progress: Progress, facts: { symptom: boolean; checkTopic?: string; outsideFinland: boolean } & AiProgress, lang: Language, evidence: Evidence) {
  const response = (id: string, title: Copy, why: Copy, source = evidence.careOptions(lang, facts.outsideFinland).sources, topic?: string) =>
    ({ id, version: "1.0.0", title: tr(lang, title), why: tr(lang, why), sources: source, ...(topic ? { topic } : {}) });
  if (!progress.complete || !progress.confirmed || !basicsComplete(progress.answers)) return response("complete_intake",
    ["Continue getting to know you", "Jatka esitietojen täyttämistä"],
    ["Your health history is incomplete. Finish and review it so you have a clearer record for your next conversation.", "Esitietosi ovat kesken. Täydennä ja tarkista ne seuraavaa keskustelua varten."]);
  // Basics are done: the AI interview, then the risk overview (section 5.5).
  if (facts.interview !== undefined && facts.interview !== "complete") return response("continue_interview",
    ["Continue with the AI questions", "Jatka tekoälykysymyksiin"],
    ["Your basic answers are saved. A few more questions, one at a time, let me build your overview of risk factors from your own answers.", "Perusvastauksesi on tallennettu. Muutama kysymys lisää kerrallaan auttaa laatimaan omiin vastauksiisi perustuvan riskitekijäyhteenvedon."]);
  if (facts.interview === "complete" && (facts.risk === "none" || facts.risk === "failed")) return response("run_risk",
    ["Get your risk overview", "Katso riskiyhteenvetosi"],
    ["Your questions are answered. An AI model works out your overview from your answers and from Finnish and European guidance. It is information, not a diagnosis.", "Kysymyksiin on vastattu. Tekoälymalli laatii yhteenvedon vastauksistasi sekä suomalaisista ja eurooppalaisista ohjeista. Se on tietoa, ei diagnoosi."]);
  if (facts.symptom || progress.answers.cancer_personal === "yes" || progress.answers.scr_pending === "yes") return response("contact_professional",
    ["Discuss your saved information with a healthcare professional", "Keskustele tallentamistasi tiedoista ammattilaisen kanssa"],
    ["Your account contains a symptom note or relevant health history. Bring your notes or questions to your health centre or existing care team.", "Tililläsi on oiremerkintä tai asiaan liittyviä esitietoja. Ota muistiinpanot tai kysymykset mukaan terveysasemalle tai hoitotiimille."]);
  if (facts.interview === "complete" && (facts.risk === "current" || facts.risk === "running")) return response("see_risk",
    ["See your risk overview", "Katso riskiyhteenvetosi"],
    ["Your overview compares you with other people of your age and sex. It is information, not a diagnosis and not a prediction.", "Yhteenveto vertaa sinua muihin samanikäisiin ja samaa sukupuolta oleviin. Se on tietoa, ei diagnoosi eikä ennuste."]);
  if (facts.checkTopic) return response("review_body_awareness",
    ["Review body-awareness guidance", "Tutustu omatarkkailuohjeisiin"],
    ["You saved a self-check. The library explains which changes to discuss with a healthcare professional.", "Tallensit omatarkkailumerkinnän. Kirjastosta löydät tietoa muutoksista, joista kannattaa keskustella ammattilaisen kanssa."], undefined, facts.checkTopic);
  return response("review_screening",
    ["Review official screening information", "Tutustu viralliseen seulontatietoon"],
    ["Use official screening information and ask your screening provider which invitations or follow-up apply to you.", "Tutustu viralliseen seulontatietoon ja kysy seulontayksiköltä, mitkä kutsut tai seuranta koskevat sinua."], evidence.generalEvidence(lang, "screening").sources);
}
