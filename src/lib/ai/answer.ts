import { answerJsonSchema, validateAnswer, type Rejection } from "./guard";
import type { TextModel } from "./models";
import { buildUserTurn, systemInstruction, type AnswerLanguage, type SourcePassage } from "./prompt";

// The one entry point of the model layer: put the question and the passages into the prompt, call the model, read what it
// wrote and check it. Nothing about the person is an input, so nothing about the person can reach the model.

const maxQuestionLength = 1500; // The chat input's own limit.
const maxPassages = 12;
// An answer is about 500 tokens at most, and a thinking model spends tokens before it writes: leave room for both.
const maxOutputTokens = 2048;
const timeoutMs = 12_000;

export type GroundedInput = {
  /** From modelFromEnv. Null means the model is switched off. */
  model: TextModel | null;
  question: string;
  language: AnswerLanguage;
  /** The public topic id the person is reading about, in the same vocabulary as passage.topic. Its passages go first. */
  topic?: string;
  passages: readonly SourcePassage[];
  signal?: AbortSignal;
};

export type Failure = "model-off" | "bad-question" | "no-passages" | "unavailable" | "not-answerable" | Rejection;

export type GroundedAnswer =
  | { ok: true; text: string; citations: string[]; followUps: string[]; provider: TextModel["provider"]; model: string; ms: number }
  // "not-answerable" also carries follow-ups: questions the passages can answer, offered in place of an answer.
  | { ok: false; reason: Failure; followUps?: string[] };

const failed = (reason: Failure): GroundedAnswer => ({ ok: false, reason });

/**
 * Writes an answer from the passages and checks it. Never throws. The model is not called without a model, a question of
 * 1 to 1500 characters and at least one passage. Any failure is a reason, and the caller then shows the passages instead.
 */
export async function generateGroundedAnswer(input: GroundedInput): Promise<GroundedAnswer> {
  try {
    return await generate(input);
  } catch {
    return failed("unavailable");
  }
}

async function generate({ model, question, language, topic, passages, signal }: GroundedInput): Promise<GroundedAnswer> {
  if (!model) return failed("model-off");
  const asked = question.trim();
  if (!asked || asked.length > maxQuestionLength) return failed("bad-question");
  const chosen = choosePassages(passages, topic);
  if (chosen.length === 0) return failed("no-passages");

  const started = performance.now();
  const reply = await model.generateJson({
    system: systemInstruction,
    user: buildUserTurn({ language, question: asked, passages: chosen }),
    jsonSchema: answerJsonSchema(chosen.map(passage => passage.id)),
    maxOutputTokens, timeoutMs, signal,
  });
  if (reply === null) return failed("unavailable");
  const verdict = validateAnswer(reply, chosen, language);
  if (!verdict.ok) return failed(verdict.reason);
  const { answerable, answer, citations, followUps } = verdict.answer;
  if (!answerable) return { ok: false, reason: "not-answerable", followUps };
  return { ok: true, text: answer, citations, followUps, provider: model.provider, model: model.name, ms: Math.round(performance.now() - started) };
}

/** Each passage once (an id must mean one text), those of the topic first, and no more than the model needs. */
function choosePassages(passages: readonly SourcePassage[], topic: string | undefined): SourcePassage[] {
  const distinct: SourcePassage[] = [];
  for (const passage of passages) if (!distinct.some(other => other.id === passage.id)) distinct.push(passage);
  return [...distinct.filter(passage => passage.topic === topic), ...distinct.filter(passage => passage.topic !== topic)].slice(0, maxPassages);
}
