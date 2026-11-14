import assert from "node:assert/strict";
import { chatInput, planChat } from "../src/lib/chat";
import { candidatePassages, retrievalHint } from "../src/lib/chat-model";
import type { ContentStore } from "../src/lib/content/types";

// A gold set for retrieval: typical public questions, each with the passages a good answer needs. The passages are named
// by id and every one of them can be cited (it has a source on the chat's allow-list), so only the ranking can lose them.
// recall() asks the same question the chat route asks, with the topic and hint the route would derive, and looks at the
// first 8 and the first 12 passages that would reach the model.

export type GoldQuestion = { question: string; language: "en" | "fi"; needs: string[] };

export const gold: GoldQuestion[] = [
  { question: "How does the FIT stool test used in bowel cancer screening work?", language: "en", needs: ["scan:fit", "article:bowel-home-test", "catalog:colorectal:homeKit:en"] },
  { question: "When is breast cancer screening offered?", language: "en", needs: ["programme:breast", "topic:breast:screening", "catalog:breast:awareness:en"] },
  { question: "Who is invited to breast cancer screening and how often?", language: "en", needs: ["programme:breast", "article:breast-screening:who"] },
  { question: "What happens during a mammogram?", language: "en", needs: ["scan:mammogram", "article:breast-screening:what"] },
  { question: "Who is invited to bowel cancer screening?", language: "en", needs: ["programme:bowel", "article:bowel-home-test:who"] },
  { question: "How often is cervical screening done and who is invited?", language: "en", needs: ["programme:cervical", "article:cervical-screening:who"] },
  { question: "Does the HPV vaccine protect against cervical cancer?", language: "en", needs: ["article:cervical-about:prevent"] },
  { question: "How do I check my moles for skin cancer?", language: "en", needs: ["catalog:skin:selfExamination:en", "article:skin-about:see"] },
  { question: "What are the symptoms of skin cancer?", language: "en", needs: ["catalog:skin:symptoms:en", "article:skin-about:see"] },
  { question: "What is a PSA test and should men get screened for prostate cancer?", language: "en", needs: ["scan:psa", "topic:prostate:screening", "article:prostate-about:screen"] },
  { question: "How do I check for testicular cancer myself?", language: "en", needs: ["catalog:testicular:selfExamination:en", "article:testicular-about:see"] },
  { question: "Which symptoms should I see a doctor about?", language: "en", needs: ["evidence:symptoms:en"] },
  { question: "What are the risk factors for breast cancer?", language: "en", needs: ["article:breast-about:risk", "catalog:breast:riskFactors:en"] },
  { question: "What are the risk factors for prostate cancer?", language: "en", needs: ["article:prostate-about:risk", "catalog:prostate:riskFactors:en"] },
  { question: "How can I lower my cancer risk?", language: "en", needs: ["faq:10", "evidence:prevention:en"] },
  { question: "What is cancer?", language: "en", needs: ["faq:11", "article:what-is-cancer"] },
  { question: "Where can I get support or counselling for cancer?", language: "en", needs: ["evidence:cancer-support:en"] },
  { question: "What should I ask at my appointment?", language: "en", needs: ["evidence:visit-preparation:en"] },
  { question: "Is cancer screening free, and do I have to take part?", language: "en", needs: ["faq:4", "faq:5"] },
  { question: "What breast changes should I get checked by a doctor?", language: "en", needs: ["catalog:breast:symptoms:en", "topic:breast:see", "article:breast-about:see"] },
  { question: "What is cancer screening and what is it for?", language: "en", needs: ["article:what-screening-is", "evidence:screening:en"] },
  { question: "Mitä rintasyövän seulonta tarkoittaa?", language: "fi", needs: ["catalog:breast:awareness:fi"] },
  { question: "Mitkä ovat ihosyövän oireet?", language: "fi", needs: ["catalog:skin:symptoms:fi"] },
  { question: "Mistä saan syöpäneuvontaa?", language: "fi", needs: ["evidence:cancer-support:fi"] },
  { question: "Miten FIT-ulostenäyte toimii?", language: "fi", needs: ["catalog:colorectal:homeKit:fi"] },
  { question: "Mitä on HPV-rokote?", language: "fi", needs: ["article:cervical-about:prevent"] },
  { question: "Mitkä ovat eturauhassyövän riskitekijät?", language: "fi", needs: ["catalog:prostate:riskFactors:fi"] },
];

export type Recall = {
  /** Average share of the needed passages found, over all questions, in the first 8 and the first 12. */
  at8: number;
  at12: number;
  /** The questions whose needed passages were all found. */
  all8: number;
  all12: number;
  misses: { question: string; missing8: string[]; missing12: string[] }[];
};

/** What the chat route would pass to the model for the question: its plan's public topic and hint, then the candidates. */
export async function candidateIds(store: ContentStore, item: GoldQuestion) {
  const plan = planChat(chatInput.parse({ message: item.question, language: item.language }));
  const topic = plan.kind === "education" || plan.kind === "additional" ? plan.topic : undefined;
  const general = !(plan.kind === "education" || plan.kind === "additional");
  return (await candidatePassages({ store, message: item.question, language: item.language, topic, hint: retrievalHint(plan), general })).map(passage => passage.id);
}

export async function recall(store: ContentStore, items: readonly GoldQuestion[] = gold): Promise<Recall> {
  const result: Recall = { at8: 0, at12: 0, all8: 0, all12: 0, misses: [] };
  for (const item of items) {
    const ids = await candidateIds(store, item);
    const missing = (count: number) => item.needs.filter(id => !ids.slice(0, count).includes(id));
    const [missing8, missing12] = [missing(8), missing(12)];
    result.at8 += 1 - missing8.length / item.needs.length;
    result.at12 += 1 - missing12.length / item.needs.length;
    result.all8 += missing8.length === 0 ? 1 : 0;
    result.all12 += missing12.length === 0 ? 1 : 0;
    if (missing12.length || missing8.length) result.misses.push({ question: item.question, missing8, missing12 });
  }
  result.at8 /= items.length;
  result.at12 /= items.length;
  return result;
}

/** The passages a question finds, as ids. */
const found = async (store: ContentStore, question: string, options: { language?: "en" | "fi"; topic?: string; limit?: number } = {}) =>
  (await store.retrievePassages({ question, language: options.language ?? "en", topic: options.topic, limit: options.limit ?? 12 })).map(passage => passage.id);

/** What both stores promise about ranking, whichever way they rank. */
export async function expectRankingRules(store: ContentStore) {
  // A passage whose whole heading is made of words of the question comes first: a FAQ asked as it is written.
  assert.equal((await found(store, "Is screening free?"))[0], "faq:4");
  assert.ok((await found(store, "What is cancer?")).slice(0, 2).includes("faq:11"));

  // A topic's anchors come after its three best passages, whatever the words of the question, and the topic stays in front.
  const breast = await found(store, "When is breast cancer screening offered?", { topic: "breast", limit: 20 });
  for (const id of ["topic:breast:overview", "topic:breast:screening", "programme:breast", ...["awareness", "homeKit", "riskFactors", "selfExamination", "symptoms"].map(section => "catalog:breast:" + section + ":en")]) {
    assert.ok(breast.slice(0, 11).includes(id), id + " is among the first eleven");
  }
  const topics = (await store.retrievePassages({ question: "When is breast cancer screening offered?", language: "en", topic: "breast", limit: 20 })).map(passage => passage.topic);
  const firstOther = topics.findIndex(topic => topic !== "breast");
  assert.ok(firstOther === -1 || topics.slice(firstOther).every(topic => topic !== "breast"), "no breast passage after another topic's");
  assert.ok((await found(store, "Mitä rintasyövän seulonta tarkoittaa?", { language: "fi", topic: "breast" })).includes("catalog:breast:awareness:fi"), "in Finnish the anchors are the Finnish catalog sections");
  assert.ok(!(await found(store, "When is lung cancer screening offered?", { topic: "lung", limit: 20 })).some(id => id.startsWith("catalog:breast")));

  // A question that finds nothing finds nothing, anchors or not.
  assert.deepEqual(await found(store, "zebrafish", { topic: "breast" }), []);
  assert.deepEqual(await found(store, "the of and", { topic: "breast" }), []);
}

/** The gold set is found at least this well. The thresholds sit just below what the ranking reaches, so a worse ranking fails. */
export async function expectGoldRecall(store: ContentStore, minimum: { at8: number; at12: number; all12: number }) {
  const result = await recall(store);
  const report = " " + JSON.stringify({ at8: result.at8, at12: result.at12, all8: result.all8, all12: result.all12, misses: result.misses.map(miss => miss.question + " -> " + miss.missing12.join(", ")) });
  assert.ok(result.at8 >= minimum.at8, "recall@8 is at least " + minimum.at8 + report);
  assert.ok(result.at12 >= minimum.at12, "recall@12 is at least " + minimum.at12 + report);
  assert.ok(result.all12 >= minimum.all12, "at least " + minimum.all12 + " questions have everything they need in the first 12" + report);
}
