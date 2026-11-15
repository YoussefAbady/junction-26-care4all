import "server-only";
import { randomUUID } from "node:crypto";
import { check, firstOpen, flow, livePlan, prune } from "./intake/engine";
import type { Answer, Progress } from "./intake/types";
import { privateJson } from "./account-session";
import { database } from "./database";
import { loadSurvey, saveSurvey } from "./survey-store";
import { intakeInteraction, nextAction, symptomDraft, symptomInteraction, type AiProgress, type JourneyInput } from "./chat-journey";
import { noteDetails } from "./design-contract";
import type { Language } from "./survey";
import { answerChat, chatInput, planChat } from "./chat";
import { createEvidence } from "./chat-evidence";
import { directChat } from "./chat-director";
import { contentStore } from "./content";
import { symptomOutcome } from "./monitor/outcome";

type Owner = { username: string; language: string };

/** Where the account is in the AI interview and the risk overview, for the next action (section 5.5). A risk assessment is current when it is complete, was made after the interview was completed, and used the content that is live now. */
async function aiProgress(username: string): Promise<AiProgress> {
  const db = database();
  const interview = await db.aiInterview.findUnique({ where: { username }, select: { status: true, completedAt: true } });
  if (!interview) return { interview: "none" };
  if (interview.status !== "complete") return { interview: "active" };
  const risk = await db.riskAssessment.findUnique({ where: { username }, select: { status: true, completedAt: true, contentVersion: true } });
  if (!risk) return { interview: "complete", risk: "none" };
  if (risk.status === "running") return { interview: "complete", risk: "running" };
  if (risk.status !== "complete") return { interview: "complete", risk: "failed" };
  const fresh = risk.completedAt !== null && interview.completedAt !== null && risk.completedAt >= interview.completedAt
    && risk.contentVersion === (await contentStore().contentVersion()).version;
  return { interview: "complete", risk: fresh ? "current" : "none" };
}
export async function actionFor(owner: Owner, language: Language, progress?: Progress) {
  const saved = progress ?? await loadSurvey(owner);
  const rows = saved.complete ? await database().healthObservation.findMany({
    where: { username: owner.username }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50,
    select: { kind: true, details: true },
  }) : [];
  const checks = rows.map(row => noteDetails.safeParse(row.details).data);
  const ai = saved.complete ? await aiProgress(owner.username) : {};
  const symptom = rows.some((row, index) => row.kind === "symptom" && checks[index]?.course !== "gone") || checks.some(check => check?.selfCheck === "change_noticed");
  return nextAction(saved, {
    symptom, checkTopic: checks.find(check => check?.selfCheck === "nothing_new")?.topic,
    outsideFinland: saved.answers.residence === "abroad", ...ai,
  }, language, createEvidence(await contentStore().loadEvidence()));
}
const invalid = () => privateJson({ error: "invalid" }, 400);
const conflict = () => privateJson({ error: "conflict" }, 409);
export async function handleJourney(owner: Owner, input: JourneyInput) {
  const { language } = input;
  const db = database();
  async function reply(interaction: unknown, progress?: Progress) {
    const nextAction = await actionFor(owner, language, progress);
    const kind = input.action.endsWith("intake") ? "intake" : "observation";
    // Opening or resuming a saved form should be independent of model latency.
    return privateJson({ interaction, nextAction, ...await directChat(contentStore(), language, { kind }, nextAction) });
  }
  if (input.action === "start_intake" || input.action === "answer_intake" || input.action === "finish_intake") {
    const progress = await loadSurvey(owner);
    const interaction = intakeInteraction(progress, language);
    if (input.action === "start_intake") return reply(interaction, progress);
    if (input.revision !== progress.revision) return conflict();
    if (input.action === "finish_intake" && interaction.type !== "review_intake") return invalid();
    const answers = { ...progress.answers };
    if (input.action === "answer_intake") {
      if (interaction.type !== "intake_question" || interaction.id !== input.questionId) return conflict();
      const question = flow(answers, livePlan).find(item => item.id === input.questionId)!;
      if (input.value === undefined || check(question, input.value)) return invalid();
      answers[question.id] = input.value as Answer;
    }
    const active = prune(answers);
    const complete = input.action === "finish_intake";
    const result = await saveSurvey(owner.username, {
      ...progress, answers: active, cursor: firstOpen(active, livePlan) ?? "review", complete, confirmed: complete, language,
    });
    if ("error" in result) return privateJson({ error: result.error }, result.status);
    return reply(intakeInteraction(result.progress, language), result.progress);
  }
  if (input.action === "start_symptom") {
    await db.chatSymptomDraft.createMany({
      data: { username: owner.username, id: randomUUID(), data: input.topic ? { topic: input.topic } : {} },
      skipDuplicates: true,
    });
    const row = await db.chatSymptomDraft.findUnique({ where: { username: owner.username } });
    if (!row) return conflict();
    return reply(symptomInteraction(row.id, symptomDraft.parse(row.data), language));
  }
  const row = await db.chatSymptomDraft.findFirst({ where: { id: input.id, username: owner.username } });
  if (!row) {
    const saved = input.action === "save_symptom"
      ? await db.healthObservation.findFirst({ where: { id: input.id, username: owner.username, kind: "symptom" }, select: { id: true, label: true, notes: true, details: true } })
      : null;
    if (saved) {
      return reply({ type: "symptom_saved", id: input.id, outcome: await symptomOutcome(db, contentStore(), owner.username, saved, language) });
    }
    if (input.action === "save_symptom" && await db.healthObservation.findFirst({ where: { id: input.id, username: owner.username }, select: { id: true } })) {
      return reply({ type: "symptom_saved", id: input.id });
    }
    return privateJson({ error: "not_found" }, 404);
  }
  const draft = symptomDraft.parse(row.data);
  const where = { id: row.id, username: owner.username, revision: row.revision };
  if (input.action === "cancel_symptom") {
    const deleted = await db.chatSymptomDraft.deleteMany({ where });
    return deleted.count ? reply({ type: "symptom_cancelled" }) : conflict();
  }
  const interaction = symptomInteraction(row.id, draft, language);
  if (input.action === "answer_symptom") {
    if (interaction.type !== "symptom_question" || interaction.step !== input.step) return conflict();
    if (input.value && (input.step === "label" || input.step === "notes")) {
      const message = chatInput.parse({ message: input.value, language });
      const plan = planChat(message);
      if (plan.kind === "emergency") return privateJson({ ...await answerChat(contentStore(), message, plan), interaction, nextAction: await actionFor(owner, language) });
    }
    const next = symptomDraft.safeParse({ ...draft, [input.step]: input.value });
    if (!next.success) return invalid();
    const updated = await db.chatSymptomDraft.updateMany({ where, data: { data: next.data, revision: { increment: 1 } } });
    return updated.count ? reply(symptomInteraction(row.id, next.data, language)) : conflict();
  }
  if (interaction.type !== "review_symptom" || !draft.label) return invalid();
  const { label, notes, ...details } = draft;
  if (!label) return invalid();
  const saved = await db.$transaction(async tx => {
    const deleted = await tx.chatSymptomDraft.deleteMany({ where });
    if (!deleted.count) return false;
    await tx.healthObservation.create({
      data: { id: row.id, username: owner.username, kind: "symptom", label, notes: notes ?? "", details },
    });
    return true;
  });
  if (!saved) return conflict();
  const outcome = await symptomOutcome(db, contentStore(), owner.username, { id: row.id, label, notes: notes ?? "", details }, language);
  return reply({ type: "symptom_saved", id: row.id, outcome });
}
