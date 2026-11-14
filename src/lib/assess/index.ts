import { z } from "zod";
import type { TextModel } from "../ai";
import { answerJsonSchema, validateAnswer } from "../ai/guard";
import { createEvidence } from "../chat-evidence";
import { candidatePassages, interleave, shownPassage } from "../chat-model";
import type { ContentStore, RetrievedPassage } from "../content/types";
import { val } from "../intake/access";
import { prune } from "../intake/engine";
import type { Answers, Entry } from "../intake/types";
import { tr, type Language } from "../survey";
import { factsOf, type Facts } from "./facts";
import { questionJsonSchema, reviewRules, validateQuestion } from "./guard";
import { nextInstruction, nextTurn, reviewInstruction, reviewTurn, type HistoryItem } from "./prompt";

// The risk-factor review: an optional, consented step after the intake. A model may ask up to three more multiple-choice
// questions and then write a short review of risk factors the person could raise with a professional. It is told the
// person's non-identifying intake answers (facts.ts) and public passages, and nothing else. It is server-led and stateless:
// the answers come from the account's saved intake, never from the request. Any failure is "unavailable", and the person
// then sees the deterministic output.

const maxQuestions = 3;
const maxPassages = 12;
const timeoutMs = 12_000;

const choice = z.object({ id: z.string().min(1).max(40), label: z.string().min(1).max(200) }).strict();
// "unsure" is the person's "Not sure". It is not one of the options, because the PWA adds it itself.
const earlier = z.object({ q: z.string().min(1).max(200), options: z.array(choice).min(2).max(6), a: z.string().min(1).max(40) }).strict()
  .refine(item => item.a === "unsure" || item.options.some(option => option.id === item.a));
const request = z.object({
  consent: z.literal(true),
  language: z.enum(["en", "fi"]),
  step: z.enum(["next", "review"]),
  history: z.array(earlier).max(maxQuestions).default([]),
}).strict();

export type AssessDeps = {
  store: ContentStore;
  /** The model that writes, or null when none is configured. */
  model: TextModel | null;
  /** Whether this account may have another model call now. It counts the call when it says yes. */
  allow: (key: string) => boolean;
  /** The signed-in account's saved intake answers. They are never taken from the request. */
  loadAnswers: () => Promise<Answers>;
  /** Names the account for the rate limit only. The limiter keeps a keyed hash of it. */
  accountKey: string;
  /** Receives one line per request: the step and a reason code, nothing else. */
  log: (line: string) => void;
  /** Ends the request, whatever it is waiting for. */
  signal: AbortSignal;
  now?: Date;
};

type Outcome = { reason: string; body: object };
const refused = (reason: string): Outcome => ({ reason, body: { kind: "unavailable", reason } });

/** The earlier extra questions with the answer chosen, in words. "unsure" is told to the model as "Not sure". */
const historyOf = (items: z.infer<typeof request>["history"]): HistoryItem[] =>
  items.map(item => ({ question: item.q, answer: item.a === "unsure" ? "Not sure" : item.options.find(option => option.id === item.a)?.label ?? "Not sure" }));

export async function assess(deps: AssessDeps, body: unknown): Promise<{ status: number; body: object }> {
  const parsed = request.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: "invalid" } };
  const { language, step } = parsed.data;
  const history = historyOf(parsed.data.history);
  const outcome = await decide();
  deps.log("assess step=" + step + " reason=" + outcome.reason);
  return { status: 200, body: outcome.body };

  async function decide(): Promise<Outcome> {
    try {
      if (step === "next" && history.length >= maxQuestions) return { reason: "done", body: { kind: "done" } };
      const { model } = deps;
      if (!model) return refused("model-off");
      const answers = await deps.loadAnswers();
      const facts = factsOf(answers, deps.now);
      if (!facts.answers.length) return refused("no-intake");
      if (!deps.allow(deps.accountKey)) return refused("rate-limited");
      return step === "next" ? await askNext(model, language, facts, history, deps.signal) : await writeReview(deps, model, language, facts, answers, history);
    } catch {
      return refused("unavailable");
    }
  }
}

async function askNext(model: TextModel, language: Language, facts: Facts, history: HistoryItem[], signal: AbortSignal): Promise<Outcome> {
  const raw = await model.generateJson({ system: nextInstruction, user: nextTurn({ language, facts, history }), jsonSchema: questionJsonSchema, maxOutputTokens: 1024, timeoutMs, signal });
  if (raw === null) return refused("unavailable");
  const verdict = validateQuestion(raw, language);
  if (!verdict.ok) return refused(verdict.reason);
  if (verdict.done) return { reason: "done", body: { kind: "done" } };
  // The ids are the server's, never the model's.
  return { reason: "question", body: { kind: "question", question: { title: verdict.title, options: verdict.options.map((label, index) => ({ id: "o" + (index + 1), label })) } } };
}

// ------------------------------------------------------------------------------------------- finding the passages

const topicOfCancer: Record<string, string> = {
  breast: "breast", cervical: "cervical", uterine: "womb", ovarian: "ovary", colorectal: "bowel", prostate: "prostate", lung: "lung",
  stomach: "stomach", pancreas: "pancreas", skin: "skin", kidney: "kidney", thyroid: "thyroid",
};
const topicOfConcern: Record<string, string> = { bowel: "bowel", breast: "breast", skin: "skin", breath: "lung" };

/** The public topics of the cancers in the family and of the concerns the person chose, at most three, from answers that are shown. */
export function topicsOf(answers: Answers): string[] {
  const live = prune(answers);
  const family = val(live, "fh_list");
  const concerns = val(live, "areas");
  const topics = [
    ...(Array.isArray(family) ? (family as Entry[]).map(entry => topicOfCancer[String(entry.type)]) : []),
    ...(Array.isArray(concerns) ? (concerns as string[]).map(concern => topicOfConcern[concern]) : []),
  ];
  return [...new Set(topics.filter(topic => topic !== undefined))].slice(0, 3);
}

const queryWords: [RegExp, string][] = [
  [/^(smoke|tobacco_other)/, "smoking tobacco"], [/^alc_/, "alcohol"], [/^diet_/, "diet"], [/^activity$/, "physical activity"],
  [/^fh_/, "family history"], [/^scr_/, "screening"],
];
/**
 * English words for what the facts show, to find public passages. They name kinds of risk factor, never a person's answers.
 * The extra questions are about check-ups, so once any was asked, screening is looked for too.
 */
export function reviewQuery(facts: Facts, asked = false) {
  const words = ["risk factors", ...queryWords.filter(([pattern]) => facts.answers.some(fact => pattern.test(fact.id))).map(([, text]) => text)];
  if (facts.bmiBand === "over" || facts.bmiBand === "obese") words.push("overweight weight");
  if (asked && !words.includes("screening")) words.push("screening");
  return words.join(" ");
}

async function reviewPassages(store: ContentStore, language: Language, facts: Facts, answers: Answers, asked: boolean) {
  const message = reviewQuery(facts, asked);
  const lists = await Promise.all([undefined, ...topicsOf(answers)].map(topic => candidatePassages({ store, message, language, topic, general: topic === undefined })));
  return interleave(lists).slice(0, maxPassages);
}

async function writeReview(deps: AssessDeps, model: TextModel, language: Language, facts: Facts, answers: Answers, history: HistoryItem[]): Promise<Outcome> {
  const passages = await reviewPassages(deps.store, language, facts, answers, history.length > 0);
  if (!passages.length) return refused("no-passages");
  const raw = await model.generateJson({
    system: reviewInstruction, user: reviewTurn({ language, facts, history, passages }), jsonSchema: answerJsonSchema(passages.map(passage => passage.id)),
    maxOutputTokens: 2048, timeoutMs, signal: deps.signal,
  });
  if (raw === null) return refused("unavailable");
  const verdict = validateAnswer(raw, passages, language, reviewRules);
  if (!verdict.ok) return refused(verdict.reason);
  const { answerable, answer, citations } = verdict.answer;
  if (!answerable) return refused("not-answerable");
  const byId = new Map(passages.map(passage => [passage.id, passage]));
  const evidence = createEvidence(await deps.store.loadEvidence());
  const safety = {
    text: tr(language, ["This is general information, not medical advice. In an emergency in Finland, call 112.", "Tämä on yleistä tietoa, ei lääketieteellistä neuvontaa. Hätätilanteessa Suomessa soita numeroon 112."]),
    source: evidence.emergency(language, false).sources[0],
  };
  return {
    reason: "review",
    body: {
      kind: "review",
      generated: { text: answer, citations, provider: model.provider, model: model.name },
      passages: citations.map(id => shownPassage(byId.get(id) as RetrievedPassage)),
      safety,
    },
  };
}
