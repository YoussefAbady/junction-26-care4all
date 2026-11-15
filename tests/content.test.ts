import assert from "node:assert/strict";
import { test } from "node:test";
import { aiStatus } from "../src/lib/ai-status";
import { createEvidence } from "../src/lib/chat-evidence";
import { assembleContent } from "../src/lib/content/assemble";
import { referenceProblems } from "../src/lib/content/check";
import { buildPassages } from "../src/lib/content/passages";
import { retrievedPassages, searchTerms } from "../src/lib/content/retrieve";
import { contentResponse } from "../src/lib/content/responses";
import { pageLanguage, toRows } from "../src/lib/content/rows";
import { contentVersion, loadSeedInput } from "../src/lib/content/seed-input";
import type { ContentStore } from "../src/lib/content/types";
import { expectCatalogMatchesGolden, expectContentMatchesSeed, expectRoutesMatchGolden } from "./content-checks";
import { store } from "./content-store";
import { expectGoldRecall, expectRankingRules } from "./retrieval-gold";

const seed = loadSeedInput();
const clone = () => structuredClone(seed);

test("the PWA content comes back from its table rows exactly as the seed has it", async () => {
  assert.equal(Object.keys(seed.design.content).length, 22);
  expectContentMatchesSeed(assembleContent(toRows(seed, "any")), seed.design.content);
  const { content, version, retrieved } = await store.loadContent();
  expectContentMatchesSeed(content, seed.design.content);
  assert.equal(version, contentVersion(seed));
  assert.equal(retrieved, seed.design.source.retrieved);
  // A regular expression travels as its source text and flags.
  assert.deepEqual(content.FAQ.find(item => item.q === "How can I lower my cancer risk?")?.re, { $regexp: "\\b(lower|reduce|cut|prevent|avoid)\\b.*\\b(risk|cancer)\\b|\\bprevent(ion)?\\b", flags: "i" });
});

test("every source, article, topic and scan a row names exists", () => {
  assert.deepEqual(referenceProblems(toRows(seed, "any")), []);
  const broken = toRows(seed, "any");
  broken.faqs[0] = { ...broken.faqs[0], sourceIds: ["no-such-source"] };
  broken.scans[0] = { ...broken.scans[0], topic: "no-such-topic" };
  assert.deepEqual(referenceProblems(broken), [
    "Scan mammogram names topic no-such-topic, which does not exist",
    "Question 0 names source no-such-source, which does not exist",
  ]);
});

test("a seed that breaks the table design is refused before anything is written", () => {
  const national = clone();
  national.design.content.NATIONAL = ["breast"];
  assert.throws(() => toRows(national, "any"), /NATIONAL/);
  const order = clone();
  order.design.content.TOPIC_ORDER = [...order.design.content.TOPIC_ORDER].reverse();
  assert.throws(() => toRows(order, "any"), /TOPIC_ORDER/);
  const hints = clone();
  hints.design.content.STEP_HINTS.breast.pop();
  assert.throws(() => toRows(hints, "any"), /STEP_HINTS\.breast/);
  const duplicate = clone();
  duplicate.evidence.sources[0] = { ...duplicate.evidence.sources[0], id: Object.keys(seed.design.content.SOURCES)[0] };
  assert.throws(() => toRows(duplicate, "any"), /source id is used twice/);
});

test("the content version hashes all seed input and nothing else", () => {
  const version = contentVersion(seed);
  assert.match(version, /^[0-9a-f]{16}$/);
  assert.equal(contentVersion(clone()), version);
  const design = clone();
  design.design.content.YEAR += 1;
  const catalog = clone();
  catalog.catalog.cards[0].summary = ["Changed", catalog.catalog.cards[0].summary[1]];
  const evidence = clone();
  evidence.evidence.passages[0] = { ...evidence.evidence.passages[0], text: "Changed" };
  assert.equal(new Set([version, contentVersion(design), contentVersion(catalog), contentVersion(evidence)]).size, 4);
  // Key order in the input does not matter.
  const reordered = clone();
  reordered.design.content.EXAMPLE = Object.fromEntries(Object.entries(reordered.design.content.EXAMPLE).reverse()) as typeof reordered.design.content.EXAMPLE;
  assert.equal(contentVersion(reordered), version);
});

test("each source records the language of its page", () => {
  const rows = toRows(seed, "any").sources;
  const language = (id: string) => rows.find(source => source.id === id)?.language;
  assert.equal(language("cs-breast-about"), "fi");
  assert.equal(language("tk-pancreas"), "fi");
  assert.equal(language("stm-screening-liver"), "fi");
  assert.equal(language("stm"), "en");
  assert.equal(language("fimlab-crc"), "en");
  assert.equal(language("fimlab-bowel-screening-2026"), "fi");
  assert.equal(language("nhs-breast-symptoms"), "en");
  assert.equal(language("euromelanoma-how"), "en");
  assert.equal(pageLanguage("https://www.euromelanoma.eu/sk-sk/o-melanome/nashe-kampane/2025-campaign"), "sk");
  assert.equal(language("catalog-duodecim-breast"), "fi");
  assert.equal(language("catalog-fcr-breast-screening"), "en");
  assert.ok(rows.every(source => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(source.retrieved)));
  // The design's own sources, then the 18 that its risk script adds.
  assert.equal(rows.filter(source => source.listed).length, Object.keys(seed.design.content.SOURCES).length + Object.keys(seed.risk.sources).length);
});

test("the catalog is what it was when it lived in code", async () => {
  await expectCatalogMatchesGolden(store);
});

test("/api/cancers and /api/library answer byte for byte as before", async () => {
  await expectRoutesMatchGolden(store);
});

test("/api/content has a validator, caches for five minutes and answers 304", async () => {
  const url = "http://localhost:3000/api/content";
  const first = await contentResponse(new Request(url), store);
  assert.equal(first.status, 200);
  const etag = first.headers.get("etag") ?? "";
  assert.equal(etag, '"' + contentVersion(seed) + '"');
  assert.equal(first.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=86400");
  const body = await first.json();
  assert.deepEqual(Object.keys(body), ["version", "retrieved", "content"]);
  assert.equal(body.version, contentVersion(seed));
  assert.equal(body.retrieved, "2026-11-14");
  assert.deepEqual(Object.keys(body.content), [...Object.keys(seed.design.content), "RISK", "MONITOR", "INTERVIEW"]);

  for (const header of [etag, "W/" + etag, '"other", ' + etag, "*"]) {
    const same = await contentResponse(new Request(url, { headers: { "If-None-Match": header } }), store);
    assert.equal(same.status, 304, header);
    assert.equal(await same.text(), "");
    assert.equal(same.headers.get("etag"), etag);
    assert.equal(same.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=86400");
  }
  const stale = await contentResponse(new Request(url, { headers: { "If-None-Match": '"0000000000000000"' } }), store);
  assert.equal(stale.status, 200);
  assert.ok(!(first.headers.get("set-cookie") || first.headers.get("vary")?.toLowerCase().includes("cookie")), "public: no cookie");

  const down: ContentStore = { ...store, contentVersion: async () => { throw new Error("database unavailable"); } };
  const failed = await contentResponse(new Request(url), down);
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("cache-control"), "no-store");
  assert.deepEqual(await failed.json(), { error: "unavailable" });
});

const ask = (question: string, options: { language?: "en" | "fi"; topic?: string; limit?: number } = {}) =>
  store.retrievePassages({ question, language: options.language ?? "en", topic: options.topic, limit: options.limit ?? 6 });

test("retrieval ranks the detected topic first, then all topics, with sources", async () => {
  const question = "Which breast changes need checking?";
  const inTopic = await ask(question, { topic: "breast" });
  assert.equal(inTopic[0].id, "faq:1");
  assert.ok(inTopic.every(passage => passage.topic === "breast"));
  assert.ok((await ask(question, { limit: 20 })).some(passage => passage.topic !== "breast"), "without a topic, other topics compete");

  // The same question about another topic puts that topic's passages first and keeps the rest after them.
  const lungFirst = (await ask(question, { topic: "lung", limit: 20 })).map(passage => passage.topic);
  assert.equal(lungFirst[0], "lung");
  const firstOther = lungFirst.findIndex(topic => topic !== "lung");
  assert.ok(firstOther > 0, "other topics follow the lung passages");
  assert.ok(lungFirst.slice(firstOther).every(topic => topic !== "lung"), "no lung passage after another topic");

  // The chat calls the bowel topic colorectal.
  const bowel = "How do I take the FIT stool sample at home?";
  assert.deepEqual((await ask(bowel, { topic: "colorectal" })).map(passage => passage.id), (await ask(bowel, { topic: "bowel" })).map(passage => passage.id));
  assert.equal((await ask(bowel, { topic: "colorectal" }))[0].topic, "bowel");

  const [first] = inTopic;
  assert.deepEqual(Object.keys(first), ["id", "heading", "text", "topic", "language", "sources"]);
  assert.ok(first.sources.length);
  for (const source of first.sources) {
    assert.match(source.url, /^https:\/\//);
    assert.match(source.retrieved, /^2026-11-14$/);
    assert.ok(source.name && source.organisation && source.use);
  }
});

test("retrieval answers in the language asked, caps the count and ignores filler words", async () => {
  const finnish = await ask("Mistä saan syöpäneuvontaa?", { language: "fi" });
  assert.equal(finnish[0].id, "evidence:cancer-support:fi");
  assert.ok(finnish.every(passage => passage.language === "fi"));
  assert.match(finnish[0].sources[0].url, /kaikkisyovasta\.fi/);
  const english = (await ask("Where can I find cancer counselling?", { limit: 3 })).find(passage => passage.id === "evidence:cancer-support:en");
  assert.match(english?.sources[0].url ?? "", /allaboutcancer\.fi/);
  assert.ok((await ask("breast", { limit: 2 })).length <= 2);
  assert.ok((await ask("cancer", { limit: 500 })).length <= 20);
  assert.deepEqual(await ask("the of and"), []);
  assert.deepEqual(await ask("???"), []);
  assert.deepEqual(searchTerms("Is this cancer? It's 112, SYÖPÄ & 112"), ["is", "this", "cancer", "it", "s", "112", "syöpä"]);
  assert.deepEqual(searchTerms("x".repeat(5000)), ["x".repeat(64)]);
  // A passage whose sources are gone cannot be quoted, so it is not returned.
  assert.deepEqual(retrievedPassages([{ id: "x", heading: "H", text: "T", topic: "general", language: "en", sourceIds: ["gone"] }], new Map()), []);
  const emergency = (await ask("What number do I call in an emergency?", { limit: 3 })).map(passage => passage.id);
  assert.ok(emergency.includes("evidence:emergency:en:finland"));
});

test("passages are quotable: unique, sourced and in plain text", () => {
  const rows = toRows(seed, "any");
  const passages = buildPassages(rows);
  const sources = new Set(rows.sources.map(source => source.id));
  assert.equal(new Set(passages.map(passage => passage.id)).size, passages.length);
  for (const passage of passages) {
    assert.ok(["en", "fi"].includes(passage.language), passage.id);
    assert.ok(passage.text.trim() && passage.heading.trim(), passage.id);
    assert.ok(passage.sourceIds.length && passage.sourceIds.every(id => sources.has(id)), passage.id);
    assert.ok(!/<[a-z/][^>]*>/i.test(passage.text), passage.id + " has markup");
  }
  const kinds = new Set(passages.map(passage => passage.kind));
  for (const kind of ["article", "topic", "symptom", "guide", "kit", "journey", "scan", "programme", "stat", "vaccine", "triage", "faq", "catalog", "evidence"]) assert.ok(kinds.has(kind), kind);
  // Finnish passages come from the backend's own bilingual content only, and from the risk statements of design v2.
  assert.ok(passages.filter(passage => passage.language === "fi").every(passage => ["catalog", "evidence", "risk", "risk-tip"].includes(passage.kind)));
  assert.equal(passages.filter(passage => passage.kind === "risk").length, seed.risk.facts.length * 2);
  assert.equal(passages.filter(passage => passage.kind === "risk-tip").length, 4);
  // A passage without a source cannot be quoted: the triage rule and the question that cite nothing are left out.
  assert.ok(!passages.some(passage => passage.id === "triage:4" || passage.id === "faq:9"));
  // Every catalog section and every chat passage is indexed in both languages.
  assert.equal(passages.filter(passage => passage.kind === "catalog").length, rows.catalogSections.length * 2);
  assert.equal(passages.filter(passage => passage.kind === "evidence").length, rows.evidence.length);
});

test("chat evidence picks the passage for the language and residence, and fails loudly when one is missing", async () => {
  const evidence = createEvidence(await store.loadEvidence());
  assert.match(evidence.careOptions("en", false).sources[0].url, /suomi\.fi/);
  assert.match(evidence.careOptions("en", true).sources[0].url, /cancer\.gov/);
  assert.match(evidence.careOptions("fi", false).items[0], /sosiaali- ja terveyskeskukseen/);
  // Two candidates for prevention: the one with the Finnish source wins.
  assert.match(evidence.generalEvidence("en", "prevention").sources[0].url, /kaikkisyovasta\.fi/);
  assert.match(evidence.counselling("fi").sources[0].url, /kaikkisyovasta\.fi/);
  assert.match(evidence.counselling("en").sources[0].url, /allaboutcancer\.fi/);
  assert.equal(evidence.emergency("en", false).items[0], "If this is an emergency in Finland, call 112 now.");
  assert.match(evidence.emergency("fi", true).items[0], /EU:ssa soita numeroon 112/);
  const lung = evidence.additionalEvidence("fi", "lung", "symptoms");
  assert.equal(lung.heading, "Keuhkosyöpä");
  assert.equal(lung.passage.sources[0].title, "Cancer Society of Finland · Keuhkosyöpä");
  assert.equal(evidence.additionalEvidence("en", "lung", "overview").passage.sources[0].title, "Cancer Society of Finland · Lung cancer");
  assert.throws(() => createEvidence([]).emergency("en", false), /no passage emergency in en for finland/);
  assert.throws(() => createEvidence([]).generalEvidence("en", "prevention"), /no passage prevention/);
});

test("the health report names the provider and model, never a key", () => {
  const secret = "fictional-secret-key";
  assert.deepEqual(aiStatus({}), { provider: "catalog", model: null, configured: false });
  assert.deepEqual(aiStatus({ CHAT_PROVIDER: "catalog", GEMINI_MODEL: "gemini-3.8-flash", GEMINI_API_KEY: secret }), { provider: "catalog", model: null, configured: false });
  const gemini = aiStatus({ CHAT_PROVIDER: "gemini", GEMINI_MODEL: "gemini-3.8-flash", GEMINI_API_KEY: secret });
  assert.deepEqual(gemini, { provider: "gemini", model: "gemini-3.8-flash", configured: true });
  const verda = aiStatus({ CHAT_PROVIDER: "verda", VERDA_BASE_URL: "https://inference.example.invalid/v1", VERDA_MODEL: "fictional-model", VERDA_API_KEY: secret });
  assert.deepEqual(verda, { provider: "verda", model: "fictional-model", configured: true });
  assert.ok(![gemini, verda].some(status => JSON.stringify(status).includes(secret)));
  // Chosen but not fully configured: the provider is named and nothing more is claimed.
  assert.deepEqual(aiStatus({ CHAT_PROVIDER: "gemini", GEMINI_MODEL: "gemini-3.8-flash" }), { provider: "gemini", model: null, configured: false });
  assert.deepEqual(aiStatus({ CHAT_PROVIDER: "gemini", GEMINI_MODEL: secret, GEMINI_API_KEY: secret }), { provider: "gemini", model: null, configured: false });
  assert.deepEqual(aiStatus({ CHAT_PROVIDER: "verda", VERDA_BASE_URL: "http://insecure.example.invalid/v1", VERDA_MODEL: "fictional-model", VERDA_API_KEY: secret }), { provider: "verda", model: null, configured: false });
});

test("retrieval ranks a question's own heading first and puts a topic's anchors among its best passages", async () => {
  await expectRankingRules(store);
});

// Typical questions and the passages a good answer needs (tests/retrieval-gold.ts). The in-memory ranking is a stand-in for
// the database's, so the thresholds differ. tests/content-db.test.ts holds the ones for PostgreSQL.
test("the passages a good answer needs are found for typical questions", async () => {
  await expectGoldRecall(store, { at8: 0.85, at12: 0.88, all12: 21 });
});
