import { generateGroundedAnswer, type TextModel } from "./ai";
import { rankedSources, type Citation, type Passage } from "./chat-evidence";
import { canonicalTopic } from "./content/topic";
import type { ContentStore, RetrievedPassage } from "./content/types";
import type { Language } from "./survey";

// Where the chat asks a model to write a reply. The model is given the typed question, the language, a public topic id
// and public passages from the content database, and nothing else. Nothing from an account is an input here, so nothing
// from an account can reach the model. Any failure is a reason, and the chat then answers from the reviewed passages.

/** The chat replies a model may write. Emergencies, personal questions, observations and the journeys never reach a model. */
const writtenKinds = ["education", "general", "additional", "clarify", "unsupported"];
export const mayWriteReply = (kind: string) => writtenKinds.includes(kind);

const retrievalLimit = 20; // Candidates asked of the content store, before the allow-list of sources removes some.
const passagesForModel = 12;

export type WrittenReply = {
  text: string;
  provider: TextModel["provider"];
  model: string;
  followUps: string[];
  /** The passages the answer cites, in the order of its citations, as the chat shows them. */
  cited: { heading: string; passage: Passage }[];
};
export type Writing = { ok: true; written: WrittenReply } | { ok: false; reason: string };

/** The passage's sources in the chat's shape. Only https links are ever shown. */
const citationsOf = (passage: RetrievedPassage): Citation[] =>
  passage.sources.filter(source => source.url.startsWith("https://"))
    .map(source => ({ title: source.name, url: source.url, language: source.language, retrieved: source.retrieved }));

const linesOf = (text: string) => text.split("\n").map(line => line.trim()).filter(Boolean);

/** A passage as the chat shows it: its lines, and its allow-listed https sources with their tier, nearest to Finland first. */
export const shownPassage = (passage: RetrievedPassage) => ({ id: passage.id, items: linesOf(passage.text), sources: rankedSources(citationsOf(passage)) });

/**
 * The passages the chat can show with at least one source from its allow-list (see rankedSources). A passage without one
 * is not given to the model, so every answer comes with a source link the reader can follow.
 */
export const citable = (passages: readonly RetrievedPassage[]) => passages.filter(passage => rankedSources(citationsOf(passage)).length > 0);

/**
 * The public words of a plan, in English, for finding English passages when a Finnish question has too few Finnish ones.
 * They come from the topic and the sections the question asked about, never from an account.
 */
const english: Record<string, string> = {
  breast: "breast", colorectal: "bowel colorectal", cervical: "cervical", skin: "skin", prostate: "prostate", testicular: "testicular",
  lung: "lung", ovarian: "ovarian ovary", pancreatic: "pancreatic pancreas",
  awareness: "screening", symptoms: "symptoms", selfExamination: "self-exam", homeKit: "kit sample", riskFactors: "risk factors",
  prevention: "prevention", guides: "guides", appointment: "appointment questions", support: "support counselling", screening: "screening", "follow-up": "follow-up survivorship",
};
export function retrievalHint(plan: { topic?: string; sections?: readonly string[]; intent?: string; focus?: string }) {
  return [plan.topic, ...(plan.sections ?? []), plan.intent, plan.focus].flatMap(word => (word && english[word] ? [english[word]] : [])).join(" ");
}

/**
 * English for the Finnish words that most often name what a question is about, so that the English passages that go with
 * a Finnish question can be found by them ("rokote" is never an English word). Only the words of the typed question are read.
 */
const finnishGlossary: [RegExp, string][] = [
  [/rokot/, "vaccine"], [/seulon/, "screening"], [/oire/, "symptoms"], [/riskitekij/, "risk factors"], [/neuvon/, "counselling support"],
  [/ulostenäy|ulostenay/, "stool sample"], [/kotitest|näytteenot/, "home test sample"], [/mammogra/, "mammogram"], [/luom/, "moles"],
];
export const englishWordsOf = (message: string) => finnishGlossary.filter(([pattern]) => pattern.test(message.normalize("NFKC").toLowerCase())).map(([, words]) => words).join(" ");

type WriteRequest = {
  store: ContentStore;
  model: TextModel;
  message: string;
  language: Language;
  /** A public topic id: the topic of the question or the one the screen was opened from. Never one taken from an account. */
  topic?: string;
  hint?: string;
  /** The question is not about one cancer type, so the general passages (what cancer is, screening, prevention, support) are searched too. */
  general?: boolean;
  signal: AbortSignal;
};

/** Ranked lists merged by taking turns, each passage once. */
export function interleave(lists: readonly RetrievedPassage[][]) {
  const seen = new Set<string>();
  const merged: RetrievedPassage[] = [];
  for (let index = 0; lists.some(list => index < list.length); index++) {
    for (const passage of lists.map(list => list[index])) {
      if (passage && !seen.has(passage.id)) { seen.add(passage.id); merged.push(passage); }
    }
  }
  return merged;
}

/**
 * The passages a model may be given, best first, with the allow-list applied. Not yet capped. A question about one topic
 * gets that topic's passages first. A question that is not about one topic is searched twice, as asked and among the
 * general passages, and the two lists take turns, so a short precise passage (what cancer is, the counselling service) is
 * not lost among the long articles that mention cancer more often. The PWA's articles are English, so a Finnish question
 * also gets English passages, after the Finnish ones, and the model writes Finnish from them.
 */
export async function candidatePassages({ store, message, language, topic, hint, general }: Pick<WriteRequest, "store" | "message" | "language" | "topic" | "hint" | "general">) {
  async function search(inLanguage: Language, question: string) {
    const find = async (about: string | undefined) => citable(await store.retrievePassages({ question, language: inLanguage, topic: about, limit: retrievalLimit }));
    return general ? interleave([await find(topic), await find("general")]) : find(topic);
  }
  const own = await search(language, message);
  if (language !== "fi") return own;
  const english = [...new Set(((hint ?? "") + " " + englishWordsOf(message)).split(/\s+/).filter(Boolean))].join(" ");
  return interleave([own, await search("en", [message, english].filter(Boolean).join(" "))]);
}

/** Asks the model for a reply written from the passages found for the question. Never throws. */
export async function writeReply(request: WriteRequest): Promise<Writing> {
  try {
    const found = (await candidatePassages(request)).slice(0, passagesForModel);
    const result = await generateGroundedAnswer({
      model: request.model, question: request.message, language: request.language, signal: request.signal,
      topic: request.topic && canonicalTopic(request.topic), passages: found,
    });
    if (!result.ok) return { ok: false, reason: result.reason };
    const byId = new Map(found.map(passage => [passage.id, passage]));
    const cited = result.citations.map(id => byId.get(id));
    if (!cited.every((passage): passage is RetrievedPassage => passage !== undefined)) return { ok: false, reason: "ungrounded" };
    return {
      ok: true,
      written: {
        text: result.text, provider: result.provider, model: result.model, followUps: result.followUps,
        cited: cited.map(passage => ({
          heading: passage.heading,
          passage: { id: passage.id, items: linesOf(passage.text), sources: citationsOf(passage) },
        })),
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
