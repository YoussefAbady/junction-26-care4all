import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { Client } from "pg";
import type { PrismaClient } from "../src/generated/prisma/client";
import { buildPassages } from "../src/lib/content/passages";
import { contentResponse } from "../src/lib/content/responses";
import { toRows } from "../src/lib/content/rows";
import { contentVersion, loadSeedInput } from "../src/lib/content/seed-input";
import type { ContentStore } from "../src/lib/content/types";
import { expectCatalogMatchesGolden, expectChatRepliesMatchGolden, expectContentMatchesSeed, expectRoutesMatchGolden } from "./content-checks";
import { expectGoldRecall, expectRankingRules } from "./retrieval-gold";

// These tests need PostgreSQL. Point CONTENT_TEST_DATABASE_URL at a scratch database (never the one the app uses). Each run
// makes its own schema in it, applies every migration there, and drops the schema afterwards, so the tests cannot touch
// the public schema and do not depend on what the database held before.
const url = process.env.CONTENT_TEST_DATABASE_URL;

describe("content in PostgreSQL", { skip: url ? false : "set CONTENT_TEST_DATABASE_URL to a scratch database to run these" }, () => {
  const schema = "content_test_" + randomBytes(4).toString("hex");
  const seed = loadSeedInput();
  const hash = contentVersion(seed);
  let admin: Client;
  let client: PrismaClient;
  let store: ContentStore;
  let seedContent: typeof import("../src/lib/content/seed").seedContent;
  let reindexContent: typeof import("../src/lib/content/seed").reindexContent;
  let databaseContentStore: typeof import("../src/lib/content/store").databaseContentStore;
  const retrieve = (question: string, options: { language?: "en" | "fi"; topic?: string; limit?: number } = {}) =>
    store.retrievePassages({ question, language: options.language ?? "en", topic: options.topic, limit: options.limit ?? 6 });
  const storedVersion = async () => (await client.contentMeta.findUniqueOrThrow({ where: { key: "contentVersion" } })).value;
  const forceReseed = () => client.contentMeta.update({ where: { key: "contentVersion" }, data: { value: "edited-by-hand" } });

  before(async () => {
    assert.ok(url);
    admin = new Client({ connectionString: url, options: "-c search_path=" + schema });
    await admin.connect();
    await admin.query("CREATE SCHEMA " + schema);
    const migrations = readdirSync("prisma/migrations", { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    for (const name of migrations) await admin.query(readFileSync("prisma/migrations/" + name + "/migration.sql", "utf8"));
    const [{ PrismaClient }, { PrismaPg }] = await Promise.all([import("../src/generated/prisma/client"), import("@prisma/adapter-pg")]);
    const options = (url.includes("?") ? "&" : "?") + "options=" + encodeURIComponent("-c search_path=" + schema);
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url + options }, { schema }) });
    // Raw queries use the connection's search_path: make sure it is the scratch schema before anything is written.
    const [{ current }] = await client.$queryRaw<{ current: string }[]>`SELECT current_schema() AS current`;
    assert.equal(current, schema);
    ({ seedContent, reindexContent } = await import("../src/lib/content/seed"));
    ({ databaseContentStore } = await import("../src/lib/content/store"));
    // A zero TTL makes the store ask for the version on every call, so tests see changes at once.
    store = databaseContentStore(() => client, 0);
  });
  after(async () => {
    await client?.$disconnect();
    if (admin) {
      await admin.query("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
      await admin.end();
    }
  });

  it("refuses to serve before anything is seeded", async () => {
    await assert.rejects(store.contentVersion(), /no contentVersion/);
    assert.equal((await contentResponse(new Request("http://localhost:3000/api/content"), store)).status, 503);
  });

  it("loads the whole seed in one run and records its hash", async () => {
    assert.equal(await seedContent(client, seed), "seeded");
    const rows = toRows(seed, hash);
    assert.equal(await storedVersion(), hash);
    assert.equal(await client.contentSource.count(), rows.sources.length);
    assert.equal(await client.contentArticleSection.count(), rows.articleSections.length);
    assert.equal(await client.contentCatalogSection.count(), rows.catalogSections.length);
    assert.equal(await client.contentEvidence.count(), rows.evidence.length);
    assert.equal(await client.contentPassage.count(), buildPassages(rows).length);
  });

  it("serves the PWA content with the keys and values of the seed", async () => {
    const { content, version, retrieved } = await store.loadContent();
    expectContentMatchesSeed(content, seed.design.content);
    assert.equal(version, hash);
    assert.equal(retrieved, "2026-11-14");
  });

  it("serves the catalog, /api/cancers and /api/library as they were", async () => {
    await expectCatalogMatchesGolden(store);
    await expectRoutesMatchGolden(store);
  });

  it("answers chat exactly as before, reading its evidence from the database", async () => {
    await expectChatRepliesMatchGolden(store);
  });

  it("serves /api/content with its validator", async () => {
    const url = "http://localhost:3000/api/content";
    const first = await contentResponse(new Request(url), store);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("etag"), '"' + hash + '"');
    assert.equal(first.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=86400");
    const body = await first.json();
    assert.equal(body.version, hash);
    expectContentMatchesSeed(body.content, seed.design.content);
    assert.deepEqual(Object.keys(body.content).slice(-3), ["RISK", "MONITOR", "INTERVIEW"]);
    const again = await contentResponse(new Request(url, { headers: { "If-None-Match": '"' + hash + '"' } }), store);
    assert.equal(again.status, 304);
    assert.equal(await again.text(), "");
  });

  it("retrieves passages with full-text search, the detected topic first", async () => {
    const question = "Which breast changes need checking?";
    const inTopic = await retrieve(question, { topic: "breast" });
    assert.ok(inTopic.length > 2);
    assert.ok(inTopic.every(passage => passage.topic === "breast"));
    assert.ok(inTopic.some(passage => passage.id === "faq:1"));
    assert.deepEqual(Object.keys(inTopic[0]), ["id", "heading", "text", "topic", "language", "sources"]);
    for (const source of inTopic[0].sources) assert.match(source.url, /^https:\/\//);

    const lung = (await retrieve(question, { topic: "lung", limit: 20 })).map(passage => passage.topic);
    assert.equal(lung[0], "lung");
    const firstOther = lung.findIndex(topic => topic !== "lung");
    assert.ok(firstOther > 0 && lung.slice(firstOther).every(topic => topic !== "lung"));

    const bowel = "How do I take the FIT stool sample at home?";
    assert.deepEqual((await retrieve(bowel, { topic: "colorectal" })).map(passage => passage.id), (await retrieve(bowel, { topic: "bowel" })).map(passage => passage.id));
    assert.equal((await retrieve(bowel, { topic: "colorectal" }))[0].topic, "bowel");
  });

  it("stems, ranks by language and ignores filler words and odd input", async () => {
    const finnish = await retrieve("Mistä saan neuvontaa syövästä?", { language: "fi", limit: 10 });
    assert.ok(finnish.length && finnish.every(passage => passage.language === "fi"));
    const symptoms = await retrieve("rintasyövän oireet", { language: "fi", topic: "breast" });
    assert.ok(symptoms.some(passage => passage.id === "catalog:breast:symptoms:fi"));
    assert.ok((await retrieve("What number do I call in an emergency?", { limit: 3 })).some(passage => passage.id === "evidence:emergency:en:finland"));
    assert.ok((await retrieve("symptoms")).length >= 1, "a plural finds the singular");
    assert.deepEqual(await retrieve("the of and"), []);
    assert.deepEqual(await retrieve("???"), []);
    assert.ok((await retrieve("cancer", { limit: 500 })).length <= 20);
    await retrieve("'; DROP TABLE \"ContentPassage\"; -- & | ! ( ) :*");
    assert.ok(await client.contentPassage.count() > 500, "the table is still there");
  });

  it("ranks a question's own heading first and puts a topic's anchors among its best passages", async () => {
    await expectRankingRules(store);
  });

  // The regression test for retrieval. Typical questions and the passages a good answer needs are in tests/retrieval-gold.ts.
  // The thresholds sit just below what full-text search reaches on the seed. Run it with CONTENT_TEST_DATABASE_URL set to a
  // scratch database, like the rest of this file: npm.cmd test, or tsx --test tests/content-db.test.ts.
  it("finds the passages a good answer needs for typical questions", async () => {
    await expectGoldRecall(store, { at8: 0.8, at12: 0.85, all12: 20 });
  });

  it("does nothing when the seed has not changed, so edits made in the database survive", async () => {
    const stamp = () => client.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM "ContentSource" WHERE "id" = 'suomifi'`;
    const before = await stamp();
    await client.contentTopic.update({ where: { id: "breast" }, data: { name: "Edited by hand" } });
    assert.equal(await seedContent(client, seed), "unchanged");
    assert.equal((await client.contentTopic.findUniqueOrThrow({ where: { id: "breast" } })).name, "Edited by hand");
    assert.deepEqual(await stamp(), before, "no row was rewritten");
    assert.equal((await store.loadContent()).version, hash, "an edit is not published until the content is reindexed");
  });

  it("replaces everything when the seed changed, and a failure leaves the old content untouched", async () => {
    const changed = structuredClone(seed);
    changed.design.content.STATS_NOTE = "A changed note.";
    assert.equal(await seedContent(client, changed), "seeded");
    assert.equal(await storedVersion(), contentVersion(changed));
    assert.equal((await client.contentTopic.findUniqueOrThrow({ where: { id: "breast" } })).name, "Breast", "the hand edit was replaced");
    assert.equal((await store.loadContent()).content.STATS_NOTE, "A changed note.");
    assert.equal((await client.contentPassage.findUniqueOrThrow({ where: { id: "stats:note" } })).text, "A changed note.");

    // A row the database refuses, after the old rows were deleted and most new ones written: all of it rolls back.
    const broken = structuredClone(changed);
    broken.design.content.STATS_NOTE = "A note that is never stored.";
    broken.evidence.passages[0] = { ...broken.evidence.passages[0], language: "de" as never };
    const sources = await client.contentSource.count();
    await assert.rejects(seedContent(client, broken));
    assert.equal(await storedVersion(), contentVersion(changed));
    assert.equal(await client.contentSource.count(), sources);
    assert.equal((await store.loadContent()).content.STATS_NOTE, "A changed note.");

    assert.equal(await seedContent(client, seed), "seeded");
    expectContentMatchesSeed((await store.loadContent()).content, seed.design.content);
  });

  it("serializes two releases that start together", async () => {
    const changed = structuredClone(seed);
    changed.design.content.STATS_NOTE = "A note from a race.";
    const results = await Promise.all([seedContent(client, changed), seedContent(client, changed)]);
    assert.deepEqual([...results].sort(), ["seeded", "unchanged"]);
    assert.equal(await seedContent(client, seed), "seeded");
  });

  it("leaves what people reported about the content alone", async () => {
    await client.screeningAccount.create({ data: { username: "fictional_aino", password: "not-a-real-hash" } });
    await client.contentReport.create({ data: { id: "00000000-0000-4000-8000-000000000001", username: "fictional_aino", topic: "breast", message: "Fictional report" } });
    await forceReseed();
    assert.equal(await seedContent(client, seed), "seeded");
    assert.equal(await client.contentReport.count(), 1);
    assert.equal(await client.screeningAccount.count(), 1);
  });

  it("reindexes edited content, publishes it, and refuses content that points nowhere", async () => {
    await client.contentTopic.update({ where: { id: "breast" }, data: { lede: "A fictional edit about zebrafish." } });
    assert.deepEqual(await retrieve("zebrafish", { topic: "breast" }), [], "the index is stale until it is rebuilt");
    const published = await reindexContent(client);
    assert.equal(published.version, hash + ".1");
    assert.ok((await retrieve("zebrafish", { topic: "breast" })).some(passage => passage.id === "topic:breast:overview"));
    const { content, version } = await store.loadContent();
    assert.equal(version, hash + ".1");
    assert.equal(content.TOPICS.breast.lede, "A fictional edit about zebrafish.");
    // A browser holding the old validator gets the edited content.
    const refreshed = await contentResponse(new Request("http://localhost:3000/api/content", { headers: { "If-None-Match": '"' + hash + '"' } }), store);
    assert.equal(refreshed.status, 200);
    assert.equal(refreshed.headers.get("etag"), '"' + hash + '.1"');
    // The seed input has not changed, so the next release keeps the edit.
    assert.equal(await seedContent(client, seed), "unchanged");
    assert.equal((await store.loadContent()).content.TOPICS.breast.lede, "A fictional edit about zebrafish.");

    await client.contentTopic.update({ where: { id: "breast" }, data: { leadSourceIds: ["no-such-source"] } });
    await assert.rejects(reindexContent(client), /names source no-such-source/);
    assert.equal((await store.contentVersion()).version, hash + ".1");
    await client.contentTopic.update({ where: { id: "breast" }, data: { leadSourceIds: ["registry-breast"] } });
    assert.equal((await reindexContent(client)).version, hash + ".2");

    await forceReseed();
    assert.equal(await seedContent(client, seed), "seeded");
    assert.equal((await store.contentVersion()).version, hash);
  });

  it("rejects a hand edit that breaks a Json column instead of serving it", async () => {
    await client.$executeRaw`UPDATE "ContentGuide" SET "videos" = '"not a list"'::jsonb WHERE "topicId" = 'breast'`;
    await assert.rejects(reindexContent(client));
    await assert.rejects(databaseContentStore(() => client, 0).loadContent());
    await forceReseed();
    assert.equal(await seedContent(client, seed), "seeded");
  });

  it("keeps the last content it served while the database is unreachable", async () => {
    let down = false;
    const flaky = new Proxy(client, {
      get(target, property) {
        if (down && (property === "contentMeta" || property === "$transaction")) throw new Error("connection refused");
        return Reflect.get(target, property);
      },
    });
    const cached = databaseContentStore(() => flaky, 0);
    const first = await cached.loadContent();
    await cached.loadCatalog();
    await cached.loadEvidence();
    down = true;
    assert.equal((await cached.loadContent()).version, first.version);
    assert.deepEqual((await cached.loadCatalog()).cards.map(card => card.slug), ["breast", "colorectal", "cervical", "skin", "prostate", "testicular"]);
    assert.ok((await cached.loadEvidence()).length > 30);
    down = false;
    assert.equal((await cached.loadContent()).version, first.version);
    const cold = databaseContentStore(() => { throw new Error("connection refused"); }, 0);
    await assert.rejects(cold.loadContent(), /connection refused/);
  });
});
