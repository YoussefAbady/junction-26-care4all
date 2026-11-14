import assert from "node:assert/strict";
import { test } from "node:test";
import { answerChat, chatInput, planChat } from "../src/lib/chat";
import type { ContentStore } from "../src/lib/content/types";
import { geminiOrder } from "../src/lib/gemini";
import { expectChatRepliesMatchGolden } from "./content-checks";
import { store } from "./content-store";

const chat = (message: string, language: "en" | "fi" = "en") => chatInput.parse({ message, language });

test("chat renders bilingual, sourced catalog passages", async () => {
  const input = chat("Miten FIT-ulostenäyte toimii?", "fi");
  const result = await answerChat(store, input, planChat(input));
  assert.equal(result.kind, "education");
  assert.equal(result.topic, "colorectal");
  assert.equal(result.passages[0].id, "homeKit");
  assert.match(result.passages[0].sources[0].url, /^https:\/\/cancerregistry\.fi\//);
  assert.match(result.passages[0].items[0], /ulostenäytteen/);
});

test("personal questions, emergencies and logging bypass the educational route", () => {
  for (const [input, kind] of [
    [chat("Do I have breast cancer?"), "personal"],
    [chat("Log my symptom: I cannot breathe"), "emergency"],
    [chat("Kirjaa havainto", "fi"), "observation"],
    [chat("What is the dose of this medicine?"), "unsupported"],
  ] as const) assert.equal(planChat(input).kind, kind);
});

test("an emergency answer needs only the evidence, not the catalog", async () => {
  const withoutCatalog: ContentStore = { ...store, loadCatalog: async () => { throw new Error("catalog unavailable"); } };
  for (const language of ["en", "fi"] as const) {
    const input = chat(language === "en" ? "I cannot breathe" : "En saa henkeä", language);
    const result = await answerChat(withoutCatalog, input, planChat(input));
    assert.equal(result.kind, "emergency");
    assert.equal(result.action?.phone, "112");
    assert.match(result.passages[0].items[0], /112/);
  }
});

test("Gemini receives public IDs and cannot inject claims or citations", async () => {
  const stub = (answer: object, status = 200): typeof fetch => async (url, init) => {
    assert.match(String(url), /^https:\/\/generativelanguage\.googleapis\.com\//);
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), { topic: "breast", sections: ["symptoms", "riskFactors"] });
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(answer) }] } }] }, { status });
  };
  const config = { apiKey: "example-key", model: "gemini-example" };
  const call = (response: typeof fetch) => geminiOrder(config, "breast", ["symptoms", "riskFactors"], response);
  assert.deepEqual(await call(stub({ order: ["riskFactors", "symptoms"] })), ["riskFactors", "symptoms"]);
  assert.equal(await call(stub({ order: ["symptoms", "unverified"] })), null);
  assert.equal(await call(stub({ order: ["symptoms", "symptoms"] })), null);
  assert.equal(await call(stub({ order: ["symptoms", "riskFactors"], medicalAdvice: "injected" })), null);
  assert.equal(await call(stub({}, 429)), null);
});

test("source tiers rank Finnish, European, then international and replies always cite", async () => {
  const { rankedSources, preferredEvidence } = await import("../src/lib/chat-evidence");
  const citation = (title: string, url: string) => ({ title, url, language: "en", retrieved: "2026-11-14" });
  const international = citation("NCI", "https://www.cancer.gov/about-cancer/coping");
  const europe = citation("IARC", "https://cancer-code-europe.iarc.who.int/");
  const finland = citation("Finnish Cancer Registry", "https://cancerregistry.fi/screening/");
  assert.deepEqual(rankedSources([international, europe, finland, europe]).map(source => source.tier), ["finland", "europe", "international"]);
  const passage = (source: typeof finland) => ({ id: source.title, items: ["Example"], sources: [source] });
  assert.equal(preferredEvidence([passage(international), passage(europe), passage(finland)]).id, finland.title);
  for (const message of ["Lung cancer symptoms", "Cancer survivorship", "What is a rainbow?", "Log my symptom", "Is this cancer?", "I cannot breathe"]) {
    const input = chat(message);
    const result = await answerChat(store, input, planChat(input));
    assert.ok(result.sources.length);
    assert.match(result.shareText, /https:\/\//);
    assert.ok(result.passages.every(item => item.sources.length));
  }
});

test("Gemini chooses the conversational focus while required intake stays pinned", async () => {
  const { directChat } = await import("../src/lib/chat-director");
  const next = { id: "complete_intake", title: "Continue getting to know you" };
  const config = { apiKey: "example-key", model: "gemini-example" };
  const stub: typeof fetch = async (_url, init) => {
    const payload = JSON.parse(String(init?.body));
    const data = JSON.parse(payload.contents[0].parts[0].text);
    assert.equal(data.topic, "conversation_support");
    assert.ok(!JSON.stringify(data).includes("complete_intake"));
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ order: [...data.sections].reverse() }) }] } }] });
  };
  const result = await directChat(store, "en", { kind: "personal" }, next, config, stub);
  assert.equal(result.directorProvider, "gemini");
  assert.deepEqual(result.priority.request, { action: "start_intake", language: "en" });
  assert.equal(result.suggestedTopics.length, 3);
  const fallback = await directChat(store, "en", { kind: "personal" }, next, config, async () => new Response(null, { status: 503 }));
  assert.equal(fallback.directorFallback, true);
  assert.equal(fallback.suggestedTopics[0].id, "prepare_visit");
  const emergency = await directChat(store, "en", { kind: "emergency" }, next, config, async () => { throw new Error("unexpected provider call"); });
  assert.deepEqual(emergency.suggestedTopics, []);
  const topical = await directChat(store, "fi", { kind: "education", topic: "colorectal" }, next);
  assert.equal(topical.suggestedTopics[0].label, "Tutustu aiheeseen · Suolistosyöpä");
});

test("replies are what they were before the content moved to the database", async () => {
  await expectChatRepliesMatchGolden(store);
});
