import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { answerChat, chatInput, planChat } from "../src/lib/chat";
import { summarizeChatContext } from "../src/lib/chat-personalization";
import { cancerCards } from "../src/lib/content/catalog";
import type { DesignContent } from "../src/lib/content/design";
import { cancersResponse, libraryResponse } from "../src/lib/content/responses";
import type { ContentStore } from "../src/lib/content/types";
import type { ContentSections } from "../src/lib/content/v2-types";
import { riskSeed } from "../prisma/seed-data/risk-content";

// Checks shared by the tests that use the in-memory store and the tests that use PostgreSQL: both must serve exactly the
// content the seed holds, and exactly the responses captured before the content moved into the database.

const fixture = <T>(name: string): T => JSON.parse(readFileSync("tests/fixtures/" + name, "utf8"));

/** The maps whose key order the PWA iterates. STEP_HINTS is only looked up by topic id, so its order is free. */
const orderedMaps = ["SOURCES", "ARTICLES", "TOPICS", "JOURNEYS", "STATS", "VACC", "CHECK_META", "NAT", "COPY", "I18N"] as const;

/** The PWA content has the keys and values of the seed's content, in the same order where the order matters. */
export function expectContentMatchesSeed(served: DesignContent, seed: DesignContent) {
  // Design v2 adds RISK, MONITOR and INTERVIEW after the PWA's own keys: they are checked by their own tests.
  // SOURCES gains the design's risk sources after its own.
  const { RISK, MONITOR, INTERVIEW, ...rest } = served as DesignContent & Partial<ContentSections>;
  void RISK; void MONITOR; void INTERVIEW;
  const own = Object.keys(seed.SOURCES).length;
  assert.deepEqual(Object.keys(rest.SOURCES).slice(own), Object.keys(riskSeed.sources));
  const content = { ...rest, SOURCES: Object.fromEntries(Object.entries(rest.SOURCES).slice(0, own)) };
  assert.deepStrictEqual(content, seed);
  assert.deepEqual(Object.keys(content), Object.keys(seed));
  for (const name of orderedMaps) assert.deepEqual(Object.keys(content[name]), Object.keys(seed[name]), name);
  for (const language of Object.keys(seed.I18N)) assert.deepEqual(Object.keys(content.I18N[language]), Object.keys(seed.I18N[language]), "I18N." + language);
  assert.deepEqual(Object.keys(content.SUGGESTIONS.topics), Object.keys(seed.SUGGESTIONS.topics));
  assert.deepEqual(Object.keys(content.STEP_HINTS).sort(), Object.keys(seed.STEP_HINTS).sort());
}

type CatalogGolden = { version: string; notice: [string, string]; cards: Record<"en" | "fi", Record<string, unknown[]>> };

/** cancerCards, catalogVersion and catalogNotice return what they returned from code, for every slug in both languages. */
export async function expectCatalogMatchesGolden(store: ContentStore) {
  const golden = fixture<CatalogGolden>("catalog-cards.json");
  const catalog = await store.loadCatalog();
  const slugs = Object.keys(golden.cards.en);
  assert.equal(catalog.version, golden.version);
  assert.deepEqual([...catalog.notice], golden.notice);
  assert.deepEqual(catalog.cards.map(card => card.slug), slugs);
  for (const language of ["en", "fi"] as const) {
    for (const slug of slugs) {
      assert.equal(JSON.stringify(cancerCards(catalog, language, slug)), JSON.stringify(golden.cards[language][slug]), language + " " + slug);
    }
    // Without a slug, all cards in catalog order.
    assert.equal(JSON.stringify(cancerCards(catalog, language)), JSON.stringify(slugs.flatMap(slug => golden.cards[language][slug])), language);
    assert.deepEqual(cancerCards(catalog, language, "unknown"), []);
  }
}

type RouteGolden = { request: string; status: number; cacheControl: string | null; body: unknown };
async function replay(records: RouteGolden[], respond: (request: Request, store: ContentStore) => Promise<Response>, store: ContentStore) {
  assert.ok(records.length > 20);
  for (const record of records) {
    const response = await respond(new Request("http://localhost:3000" + record.request), store);
    assert.equal(response.status, record.status, record.request);
    assert.equal(response.headers.get("cache-control"), record.cacheControl, record.request);
    // Byte for byte: the text of the response is the text JSON.stringify makes of the captured body.
    assert.equal(await response.text(), JSON.stringify(record.body), record.request);
  }
}

/** /api/cancers and /api/library answer byte for byte as they did when the catalog lived in code. */
export async function expectRoutesMatchGolden(store: ContentStore) {
  await replay(fixture<RouteGolden[]>("cancers-route.json"), cancersResponse, store);
  await replay(fixture<RouteGolden[]>("library-route.json"), libraryResponse, store);
}

type ChatGolden = { input: object; context: string; ordered?: ("symptoms" | "riskFactors")[]; plan: object; reply: object };
const contexts: Record<string, () => ReturnType<typeof summarizeChatContext> | undefined> = {
  none: () => undefined,
  abroad: () => summarizeChatContext({ residence: "abroad" }, undefined, [], "en"),
  history: () => summarizeChatContext({ cancer_personal: "yes" }, { name: "Aino", yob: 1974, sex: "female", county: "pirkanmaa" }, [
    { kind: "symptom", label: "Fictional cramp", notes: "After lunch", details: { topic: "colorectal", symptoms: ["Cramp"], onset: "week", course: "worse" }, observedAt: null, createdAt: new Date("2026-11-10T10:00:00Z") },
  ], "en", "colorectal"),
  related: () => summarizeChatContext({}, undefined, [
    { kind: "observation", label: "Fictional check", notes: "", details: { topic: "breast", selfCheck: "nothing_new" }, observedAt: new Date("2026-11-01T08:00:00Z"), createdAt: new Date("2026-11-02T08:00:00Z") },
  ], "fi"),
};

/** Chat plans and replies are what they were before the content moved to the database. */
export async function expectChatRepliesMatchGolden(store: ContentStore) {
  const recorded = fixture<ChatGolden[]>("chat-replies.json");
  assert.ok(recorded.length > 40);
  for (const item of recorded) {
    const input = chatInput.parse(item.input);
    const context = contexts[item.context]();
    const plan = planChat(input, context);
    const label = JSON.stringify(item.input) + " with " + item.context + " context";
    assert.deepStrictEqual(JSON.parse(JSON.stringify(plan)), item.plan, label);
    const reply = JSON.parse(JSON.stringify(await answerChat(store, input, plan, item.ordered, context)));
    assert.deepStrictEqual(reply, item.reply, label);
    assert.equal(JSON.stringify(reply), JSON.stringify(item.reply), label + ": key order");
  }
}
