import assert from "node:assert/strict";
import { test } from "node:test";
import { createLimiter, defaultLimits } from "../src/lib/ai/limits";
import type { JsonRequest, TextModel } from "../src/lib/ai/models";
import { answerChat, chatInput, planChat } from "../src/lib/chat";
import { citable, englishWordsOf, retrievalHint, type WrittenReply } from "../src/lib/chat-model";
import { summarizeChatContext } from "../src/lib/chat-personalization";
import { chatReply, type ChatDeps } from "../src/lib/chat-reply";
import type { ContentStore, PassageQuery, PassageSource, RetrievedPassage } from "../src/lib/content/types";
import { store } from "./content-store";

// The chat route's work after sign-in, run with a fake model, the in-memory content store and no network. A model that
// writes a reply is asked only for the typed question, the language and public passages, and every way it can fail leaves
// the reviewed, deterministic reply exactly as it was.

const fitQuestion = "How does the FIT stool test used in bowel cancer screening work?";
const nextAction = { id: "review_screening", title: "Review screening" };

type PassageOf = { id: string };
type Reply = null | string | object | ((passages: PassageOf[], request: JsonRequest) => unknown);
/** A model that records what it was asked and replies as told. */
function fakeModel(reply: Reply) {
  const requests: JsonRequest[] = [];
  const model: TextModel = {
    provider: "gemini", name: "fake-model",
    async generateJson(request) {
      requests.push(request);
      return typeof reply === "function" ? reply(JSON.parse(request.user).passages, request) : reply;
    },
  };
  return { model, requests };
}
const answerOf = (passages: PassageOf[], extra: Record<string, unknown> = {}) => ({
  answerable: true,
  answer: "The FIT is a stool sample test that people do at home, and the result is sent to them by the programme.",
  citations: [passages[0].id], followUps: [], ...extra,
});
const followUps = ["How is a stool sample taken?", "What happens after a positive result?", "Who is invited to bowel cancer screening?"];

const logs: string[] = [];
const deps = (overrides: Partial<ChatDeps> = {}): ChatDeps => ({ store, model: null, chosen: false, allow: () => true, log: line => logs.push(line), ...overrides });
function call(message: string, options: { language?: "en" | "fi"; topic?: string; context?: ReturnType<typeof summarizeChatContext>; accountKey?: string; signal?: AbortSignal } = {}) {
  const input = chatInput.parse({ message, language: options.language ?? "en", ...(options.topic ? { topic: options.topic } : {}) });
  const context = options.context ?? summarizeChatContext({}, undefined, [], input.language);
  return {
    input, initial: planChat(input), plan: planChat(input, context), context, nextAction,
    accountKey: options.accountKey ?? "fictional-account", signal: options.signal ?? AbortSignal.timeout(20_000),
  };
}
const onlyAfter = <T extends object>(base: T, change: object) => JSON.stringify({ ...base, ...change });
function generatedOf(reply: { generated?: { text: string; citations: string[]; provider: string; model: string } }) {
  assert.ok(reply.generated, "the reply has no generated block");
  return reply.generated;
}

test("a grounded reply end to end: the cited passages, their sources, the follow-ups and the share text", async () => {
  logs.length = 0;
  const { model, requests } = fakeModel((passages) => answerOf(passages, { citations: [passages[1].id, passages[0].id], followUps }));
  const signal = AbortSignal.timeout(20_000);
  const reply = await chatReply(deps({ model, chosen: true }), call(fitQuestion, { signal }));
  const plain = await chatReply(deps(), call(fitQuestion));

  assert.equal(reply.kind, "education");
  assert.equal(reply.topic, "colorectal");
  assert.equal(reply.message, plain.message); // the card's name still heads a reply about a topic
  const generated = generatedOf(reply);
  const sent = JSON.parse(requests[0].user).passages as PassageOf[];
  assert.deepEqual(generated, { text: answerOf(sent).answer, citations: [sent[1].id, sent[0].id], provider: "gemini", model: "fake-model" });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].signal, signal);

  // The passages are exactly the cited ones, in the order of the citations, with allow-listed https sources and their tier.
  assert.deepEqual(reply.passages.map(item => item.id), generated.citations);
  for (const item of reply.passages) {
    assert.ok(item.items.length && item.items.every(line => typeof line === "string" && line.trim()));
    assert.ok(item.sources.length);
    for (const source of item.sources) {
      assert.deepEqual(Object.keys(source).sort(), ["language", "retrieved", "tier", "title", "url"]);
      assert.match(source.url, /^https:\/\//);
      assert.ok(["finland", "europe", "international"].includes(source.tier));
    }
  }
  assert.ok(reply.passages.flatMap(item => item.sources).every(source => reply.sources.some(known => known.url === source.url)));
  assert.equal(reply.provider, "gemini");
  assert.equal(reply.providerFallback, false);
  assert.deepEqual(reply.patientContext, plain.patientContext); // the account's own context is still shown to the person
  assert.deepEqual(logs, ["chat answer=written"]);

  // The share text carries the written text, says an AI wrote it, and numbers the cited sources and the safety notice.
  assert.ok(reply.shareText.startsWith(generated.text + " ["));
  assert.match(reply.shareText, /Written by an AI/);
  assert.ok(reply.shareText.includes(reply.safety.text));
  for (const [index, source] of reply.sources.entries()) assert.ok(reply.shareText.includes("[" + (index + 1) + "] " + source.title + " — " + source.url));
  assert.ok(!reply.shareText.includes("patientContext"));

  // The follow-ups come right after the focus, then the director's other suggestions, six at most.
  const [focus, ...rest] = reply.suggestedTopics;
  assert.equal(focus.id, reply.conversationFocus?.id);
  assert.deepEqual(rest.slice(0, 3).map(chip => [chip.id, chip.label, chip.request]), followUps.map((label, index) =>
    ["follow_up_" + (index + 1), label, { message: label, language: "en" }]));
  assert.equal(reply.suggestedTopics.length, 6);
  assert.ok(reply.suggestedTopics.length <= 6 && new Set(reply.suggestedTopics.map(chip => chip.id)).size === reply.suggestedTopics.length);
  assert.deepEqual(reply.suggestedTopics.slice(4).map(chip => chip.id), plain.suggestedTopics.slice(1).map(chip => chip.id));
});

test("without a model there is no generated block and nothing else changes", async () => {
  logs.length = 0;
  const reply = await chatReply(deps(), call(fitQuestion));
  assert.ok(!("generated" in reply));
  assert.equal(reply.provider, "catalog");
  assert.equal(reply.providerFallback, false);
  assert.deepEqual(logs, []); // no model chosen, nothing to explain
  // A provider that is chosen but not configured reports the fallback and says why, with the reason only.
  const unconfigured = await chatReply(deps({ chosen: true }), call(fitQuestion));
  assert.equal(JSON.stringify(unconfigured), onlyAfter(reply, { providerFallback: true }));
  assert.deepEqual(logs, ["chat answer=unconfigured"]);
});

test("every way the writing can fail leaves exactly the deterministic reply, apart from providerFallback", async () => {
  const plain = JSON.stringify(await chatReply(deps(), call(fitQuestion)));
  const failures: [string, string, Partial<ChatDeps>][] = [
    ["unavailable", "no JSON came back", { model: fakeModel(null).model }],
    ["unavailable", "the provider threw", { model: fakeModel(() => { throw new Error("provider exploded"); }).model }],
    ["invalid-json", "the wrong shape", { model: fakeModel({ answer: "text only" }).model }],
    ["ungrounded", "an invented citation", { model: fakeModel((passages) => answerOf(passages, { citations: ["invented"] })).model }],
    ["ungrounded", "an invented number", { model: fakeModel((passages) => answerOf(passages, { answer: "The kit is posted every four years to people aged 99." })).model }],
    ["unsafe-claim", "a diagnosis", { model: fakeModel((passages) => answerOf(passages, { answer: "You have cancer, so book a visit with a nurse." })).model }],
    ["bad-format", "a link", { model: fakeModel((passages) => answerOf(passages, { answer: "Read about it at www.example.org for the full answer." })).model }],
    ["not-answerable", "the passages do not answer", { model: fakeModel({ answerable: false, answer: "", citations: [], followUps }).model }],
    ["no-passages", "nothing was found", { model: fakeModel((passages) => answerOf(passages)).model, store: { ...store, retrievePassages: async () => [] } }],
    ["rate-limited", "the account is over its limit", { model: fakeModel((passages) => answerOf(passages)).model, allow: () => false }],
  ];
  for (const [reason, label, overrides] of failures) {
    logs.length = 0;
    const reply = await chatReply(deps({ chosen: true, ...overrides }), call(fitQuestion));
    assert.equal(JSON.stringify(reply), onlyAfter(JSON.parse(plain), { providerFallback: true }), label);
    assert.ok(!("generated" in reply), label);
    assert.deepEqual(logs, ["chat answer=" + reason], label);
  }
});

test("emergencies, personal questions and observations never reach the model or spend the budget", async () => {
  let modelCalls = 0;
  let budgetAsks = 0;
  const { model } = fakeModel(() => { modelCalls++; throw new Error("the model must not be called"); });
  for (const [message, kind] of [["I cannot breathe", "emergency"], ["Do I have breast cancer?", "personal"], ["Log my symptom", "observation"]] as const) {
    logs.length = 0;
    const plain = JSON.stringify(await chatReply(deps(), call(message)));
    const reply = await chatReply(deps({ model, chosen: true, allow: () => { budgetAsks++; return true; } }), call(message));
    assert.equal(reply.kind, kind);
    assert.equal(JSON.stringify(reply), plain, kind);
    assert.ok(!("generated" in reply), kind);
    assert.equal(reply.providerFallback, false, kind);
    assert.deepEqual(logs, [], kind);
  }
  assert.equal(modelCalls, 0);
  assert.equal(budgetAsks, 0);

  // Even if a written reply were handed over, answerChat would not use it for these kinds.
  const written: WrittenReply = {
    text: "A written text that must not appear.", provider: "gemini", model: "fake-model", followUps: [],
    cited: [{ heading: "Heading", passage: { id: "x", items: ["Line."], sources: [{ title: "Registry", url: "https://cancerregistry.fi/screening/", language: "en", retrieved: "2026-11-14" }] } }],
  };
  for (const message of ["I cannot breathe", "Do I have breast cancer?", "Log my symptom"]) {
    const input = chatInput.parse({ message, language: "en" });
    const plan = planChat(input);
    assert.equal(JSON.stringify(await answerChat(store, input, plan, undefined, undefined, written)), JSON.stringify(await answerChat(store, input, plan)), message);
  }
});

test("the model is sent only the language, the question and public passages, and no account detail is an input", async () => {
  const secrets = ["Aino", "Secret", "pirkanmaa", "1974", "SECRET-OBSERVATION-TEXT", "Fictional cramp", "secret-username", "cancer_personal"];
  const context = summarizeChatContext({ cancer_personal: "yes", residence: "abroad" }, { name: "Aino Secret", yob: 1974, sex: "female", county: "pirkanmaa" }, [
    { kind: "symptom", label: "Fictional cramp", notes: "SECRET-OBSERVATION-TEXT", details: { topic: "colorectal", symptoms: ["Cramp"], onset: "week", course: "worse" }, observedAt: null, createdAt: new Date("2026-11-10T10:00:00Z") },
  ], "en", "colorectal");
  const queries: PassageQuery[] = [];
  const spy: ContentStore = { ...store, retrievePassages: async query => { queries.push(query); return store.retrievePassages(query); } };
  const { model, requests } = fakeModel((passages) => answerOf(passages));

  // A short follow-up, the one case where the saved topic of the account changes the deterministic plan.
  const message = "and what about symptoms?";
  const reply = await chatReply(deps({ store: spy, model, chosen: true }), call(message, { context, accountKey: "secret-username" }));
  assert.equal(planChat(chatInput.parse({ message, language: "en" }), context).kind, "education"); // the saved topic does steer the deterministic plan
  assert.equal(reply.kind, "general"); // but the written reply follows the plan made from the typed words alone
  assert.ok("generated" in reply);

  // Asked as typed, then among the general passages. No saved topic and nothing of the account is in either query.
  assert.deepEqual(queries, [
    { question: message, language: "en", topic: undefined, limit: 20 },
    { question: message, language: "en", topic: "general", limit: 20 },
  ]);
  const [asked] = requests;
  const everything = JSON.stringify([asked.system, asked.user, asked.jsonSchema, queries]);
  for (const secret of secrets) assert.ok(!everything.includes(secret), secret);
  const data = JSON.parse(asked.user);
  assert.deepEqual(Object.keys(data), ["language", "question", "passages"]);
  assert.equal(data.question, message);
  assert.ok(data.passages.length && data.passages.every((item: object) => JSON.stringify(Object.keys(item)) === '["id","topic","heading","text"]'));
  assert.deepEqual(Object.keys(asked).sort(), ["jsonSchema", "maxOutputTokens", "signal", "system", "timeoutMs", "user"]);
});

test("the rate limit decides per account, and a refusal is only a reply from the passages", async () => {
  const { model, requests } = fakeModel((passages) => answerOf(passages));
  const limiter = createLimiter({ ...defaultLimits, limit: 2 });
  const withLimit = deps({ model, chosen: true, allow: key => limiter(key, 0) });
  const written = (reply: object) => "generated" in reply;
  assert.ok(written(await chatReply(withLimit, call(fitQuestion, { accountKey: "first-account" }))));
  assert.ok(written(await chatReply(withLimit, call(fitQuestion, { accountKey: "first-account" }))));
  logs.length = 0;
  const refused = await chatReply(withLimit, call(fitQuestion, { accountKey: "first-account" }));
  assert.ok(!written(refused));
  assert.equal(refused.providerFallback, true);
  assert.deepEqual(logs, ["chat answer=rate-limited"]);
  assert.ok(written(await chatReply(withLimit, call(fitQuestion, { accountKey: "second-account" }))));
  assert.equal(requests.length, 3);

  // The budget is asked once per request that could be written, with the account's key, and not when no model is chosen.
  const asked: string[] = [];
  await chatReply(deps({ model, chosen: true, allow: key => { asked.push(key); return true; } }), call(fitQuestion, { accountKey: "counted" }));
  await chatReply(deps({ allow: key => { asked.push(key); return true; } }), call(fitQuestion, { accountKey: "model-off" }));
  assert.deepEqual(asked, ["counted"]);
});

test("a written reply to a question no topic matched is headed by the first cited passage, with no placeholder", async () => {
  for (const [message, kind] of [["Tell me about breast and prostate cancer screening", "clarify"], ["What do vaccines protect against?", "unsupported"]] as const) {
    const { model } = fakeModel((passages) => answerOf(passages, { answer: "The passages describe what the programme offers to people." }));
    const plain = await chatReply(deps(), call(message));
    assert.equal(plain.kind, kind);
    assert.match(plain.message, /I don’t have a sourced answer/);
    assert.deepEqual(plain.passages.map(item => item.id), ["screening"]); // the placeholder the fallback carries

    const reply = await chatReply(deps({ model, chosen: true }), call(message));
    assert.equal(reply.kind, kind);
    const { citations } = generatedOf(reply);
    assert.doesNotMatch(reply.message, /sourced answer/);
    assert.deepEqual(reply.passages.map(item => item.id), citations); // exactly the cited passages, no placeholder
    assert.ok(reply.passages.every(item => item.items.length && item.sources.length));
    const [first] = (await store.retrievePassages({ question: message, language: "en", limit: 20 })).filter(item => item.id === citations[0]);
    assert.equal(reply.message, first.heading);
  }
});

const source = (url: string, language = "en"): PassageSource => ({
  id: "source:" + url, name: "Source " + url, organisation: "Example organisation", url, published: "2026-01-01", retrieved: "2026-11-14", use: "Example use", language,
});
const passage = (id: string, urls: string[], extra: Partial<RetrievedPassage> = {}): RetrievedPassage => ({
  id, heading: "Heading " + id, text: "First line of " + id + ".\n\nSecond line.", topic: "bowel", language: "en", sources: urls.map(url => source(url)), ...extra,
});
const storeOf = (retrieve: (query: PassageQuery) => RetrievedPassage[]): ContentStore => ({ ...store, retrievePassages: async query => retrieve(query) });
const plainAnswer = (passages: PassageOf[]) => answerOf(passages, { answer: "The first passage explains the topic in plain words." });

test("only passages that show an allow-listed https source are given to the model, and only those sources are shown", async () => {
  const found = [
    passage("odd-host", ["https://example.org/page"]),
    passage("registry", ["https://cancerregistry.fi/screening/"]),
    passage("mixed", ["https://example.org/other", "https://www.cancer.gov/about-cancer", "https://cancerregistry.fi/screening/"]),
    passage("plain-http", ["http://cancerregistry.fi/old"]),
  ];
  assert.deepEqual(citable(found).map(item => item.id), ["registry", "mixed"]);
  const { model, requests } = fakeModel((passages) => ({ ...plainAnswer(passages), citations: ["mixed"] }));
  const reply = await chatReply(deps({ model, chosen: true, store: storeOf(() => found) }), call(fitQuestion));
  assert.deepEqual((JSON.parse(requests[0].user).passages as PassageOf[]).map(item => item.id), ["registry", "mixed"]);
  assert.deepEqual(reply.passages.map(item => item.id), ["mixed"]);
  assert.deepEqual(reply.passages[0].sources.map(item => [item.url, item.tier]), [["https://cancerregistry.fi/screening/", "finland"], ["https://www.cancer.gov/about-cancer", "international"]]);

  // Nothing citable left: the model is not called and the reply is the deterministic one.
  const none = fakeModel((passages) => plainAnswer(passages));
  logs.length = 0;
  const fallback = await chatReply(deps({ model: none.model, chosen: true, store: storeOf(() => [found[0], found[3]]) }), call(fitQuestion));
  assert.equal(none.requests.length, 0);
  assert.ok(!("generated" in fallback));
  assert.deepEqual(logs, ["chat answer=no-passages"]);
});

test("a wide set is asked for, the filter runs on it, and at most twelve passages go to the model", async () => {
  const queries: PassageQuery[] = [];
  const crowd = Array.from({ length: 30 }, (_, index) => passage("p" + index, [index % 2 ? "https://example.org/x" : "https://cancerregistry.fi/screening/"]));
  const { model, requests } = fakeModel((passages) => plainAnswer(passages));
  await chatReply(deps({ model, chosen: true, store: storeOf(query => { queries.push(query); return crowd; }) }), call(fitQuestion));
  assert.deepEqual(queries.map(query => query.limit), [20]); // a question about one topic is searched once
  const sent = (JSON.parse(requests[0].user).passages as PassageOf[]).map(item => item.id);
  assert.deepEqual(sent, ["p0", "p2", "p4", "p6", "p8", "p10", "p12", "p14", "p16", "p18", "p20", "p22"]); // fifteen were citable, twelve went on, in rank order
});

test("a question that is not about one topic is also searched among the general passages, and the two lists take turns", async () => {
  const lists: Record<string, RetrievedPassage[]> = {
    asked: [passage("a1", ["https://cancerregistry.fi/a"]), passage("a2", ["https://cancerregistry.fi/b"]), passage("a3", ["https://example.org/c"]), passage("a4", ["https://cancerregistry.fi/d"])],
    general: [passage("g1", ["https://www.cancer.gov/e"]), passage("a2", ["https://cancerregistry.fi/b"]), passage("g3", ["https://www.suomi.fi/f"])],
  };
  const queries: PassageQuery[] = [];
  const { model, requests } = fakeModel((passages) => plainAnswer(passages));
  const asking = storeOf(query => { queries.push(query); return lists[query.topic === "general" ? "general" : "asked"]; });
  await chatReply(deps({ model, chosen: true, store: asking }), call("Where can I get support or counselling for cancer?"));
  assert.deepEqual(queries.map(query => query.topic), [undefined, "general"]);
  assert.deepEqual((JSON.parse(requests[0].user).passages as PassageOf[]).map(item => item.id), ["a1", "g1", "a2", "a4", "g3"]); // a3 has no allow-listed source, a2 is not repeated

  // A question about one topic is not searched among the general passages, and a topic the screen carries is kept.
  queries.length = 0;
  await chatReply(deps({ model, chosen: true, store: asking }), call("Where can I get support or counselling for cancer?", { topic: "breast" }));
  assert.deepEqual(queries.map(query => query.topic), ["breast", "general"]);
  queries.length = 0;
  await chatReply(deps({ model, chosen: true, store: asking }), call(fitQuestion));
  assert.deepEqual(queries.map(query => query.topic), ["colorectal"]);
});

test("a Finnish question also gets English passages, taking turns with the Finnish ones, and the model writes Finnish", async () => {
  const finnish = (id: string) => passage(id, ["https://kaikkisyovasta.fi/tietoa"], { language: "fi", text: "Suomenkielinen kappale " + id + "." });
  const queries: PassageQuery[] = [];
  const retrieve = (finnishCount: number) => storeOf(query => {
    queries.push(query);
    return query.language === "fi" ? Array.from({ length: finnishCount }, (_, index) => finnish("fi" + index)) : [passage("en0", ["https://www.cancer.gov/a"]), passage("en1", ["https://example.org/b"]), passage("en2", ["https://www.cancer.gov/c"])];
  });
  const question = "Mitä rintasyövän seulonta tarkoittaa?";
  const answer = (passages: PassageOf[]) => ({ ...plainAnswer(passages), answer: "Seulonta on tutkimus, jossa etsitään oireettomilta ihmisiltä sairauden merkkejä, ja se tarjotaan ilmaiseksi." });

  const few = fakeModel((passages) => answer(passages));
  const reply = await chatReply(deps({ model: few.model, chosen: true, store: retrieve(1) }), call(question, { language: "fi" }));
  assert.deepEqual(queries.map(query => [query.language, query.limit]), [["fi", 20], ["en", 20]]);
  assert.ok(queries[1].question.startsWith(question) && queries[1].question.endsWith("breast screening")); // the English hint is the public topic and sections
  assert.deepEqual((JSON.parse(few.requests[0].user).passages as PassageOf[]).map(item => item.id), ["fi0", "en0", "en2"]); // the odd host is dropped
  assert.equal(JSON.parse(few.requests[0].user).language, "fi");
  assert.ok("generated" in reply);
  assert.equal(retrievalHint(planChat(chatInput.parse({ message: question, language: "fi" }))), "breast screening");
  // The Finnish words that name what a question is about are looked up in English too, only from the typed question.
  assert.equal(englishWordsOf("Mitä on HPV-rokote?"), "vaccine");
  assert.equal(englishWordsOf("Mistä saan syöpäneuvontaa?"), "counselling support");
  assert.equal(englishWordsOf("Miten FIT-ulostenäyte toimii?"), "stool sample");
  assert.equal(englishWordsOf("What is cancer?"), "");
  const vaccine = fakeModel((passages) => answer(passages));
  queries.length = 0;
  await chatReply(deps({ model: vaccine.model, chosen: true, store: retrieve(3) }), call("Mitä on HPV-rokote?", { language: "fi" }));
  assert.ok(queries[1].language === "en" && queries[1].question.includes("vaccine"), "the English search can find a vaccine");

  queries.length = 0;
  const enough = fakeModel((passages) => answer(passages));
  await chatReply(deps({ model: enough.model, chosen: true, store: retrieve(2) }), call(question, { language: "fi" }));
  assert.deepEqual(queries.map(query => query.language), ["fi", "en"]); // English is searched however many Finnish passages there are
  assert.deepEqual((JSON.parse(enough.requests[0].user).passages as PassageOf[]).map(item => item.id), ["fi0", "en0", "fi1", "en2"]);
});

test("the public-id ordering of the saved sections is skipped when a reply is being written, and the director still runs", async () => {
  const gemini = { apiKey: "test-key", model: "gemini-example" };
  const topics: string[] = [];
  const http: typeof fetch = async (_url, init) => {
    const data = JSON.parse(JSON.parse(String(init?.body)).contents[0].parts[0].text);
    topics.push(data.topic);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ order: data.sections }) }] } }] });
  };
  const { model } = fakeModel((passages) => answerOf(passages));

  const writing = await chatReply(deps({ model, chosen: true, gemini, http }), call(fitQuestion));
  assert.deepEqual(topics, ["conversation_support"]);
  assert.equal(writing.provider, "gemini");
  assert.equal(writing.directorProvider, "gemini");

  // Not written (the account is over its limit): the order of the saved sections is asked for, as it always was.
  topics.length = 0;
  const ordered = await chatReply(deps({ model, chosen: true, gemini, http, allow: () => false }), call(fitQuestion));
  assert.deepEqual(topics.sort(), ["colorectal", "conversation_support"]);
  assert.equal(ordered.provider, "gemini"); // the order came from the provider
  assert.equal(ordered.providerFallback, true); // but the reply was not model-written
  assert.ok(!("generated" in ordered));
});
