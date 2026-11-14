import "server-only";
import { database } from "./database";
import { loadSurvey } from "./survey-store";
import { summarizeChatContext } from "./chat-personalization";
import type { Language } from "./survey";

export async function loadChatContext(account: { username: string; language: string }, language: Language, topic?: string) {
  const [survey, profile, observations] = await Promise.all([
    loadSurvey(account),
    database().careProfile.findUnique({ where: { username: account.username }, select: { profile: true } }),
    database().healthObservation.findMany({
      where: { username: account.username },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50,
      select: { kind: true, label: true, notes: true, details: true, observedAt: true, createdAt: true },
    }),
  ]);
  return summarizeChatContext(survey.answers, profile?.profile, observations, language, topic);
}
