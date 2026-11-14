import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { beforeEach, test } from "node:test";
import { fixture, payload } from "./content-fixture.js";

// The store reads display preferences when it loads, so the browser globals must exist before it is imported.
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => { storage.set(key, String(value)); },
  removeItem: key => { storage.delete(key); },
};
const { A } = await import("../../src/app.js");
const { ApiError } = await import("../../src/api/client.js");
const { S, svc } = await import("../../src/state/store.js");
const { checkContent, loadContent } = await import("../../src/state/content.js");

// What the app starts with: nothing is bundled, so the shared content object is empty until the loader fills it.
const atStart = { content: { ...A.D }, version: A.contentVersion };
const shared = A.D;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const settle = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };

const ACCOUNT = "GET account?view=identity";
const CONTENT = "GET content";
const profile = { name: "Aino", yob: 1974, sex: "female", county: "pirkanmaa" };
const prefs = { lang: "en", scale: 0, plain: false, motion: true };
const signedIn = {
  [ACCOUNT]: { account: { username: "aino", language: "en" } },
  "GET profile": { profile, preferences: prefs },
  "GET reminders": { reminders: [] },
  "GET observations": { observations: [], nextCursor: null },
  "GET chat/next-action?lang=en": { nextAction: { id: "complete_intake" }, suggestedTopics: [] },
};

/** A fake backend. Each route is a body, [status, body], or a function returning a Response. Every request is recorded. */
function backend(routes, calls = []) {
  globalThis.fetch = async (url, init = {}) => {
    const key = (init.method || "GET") + " " + url.replace(/^\/api\//, "");
    calls.push({ key, url, init });
    const route = routes[key];
    if (route === undefined) throw new Error("unexpected request: " + key);
    if (typeof route === "function") return route();
    const [status, body] = Array.isArray(route) ? route : [200, route];
    return json(status, body);
  };
  return calls;
}
const count = (calls, key) => calls.filter(call => call.key === key).length;
const emptyContent = () => { for (const key of Object.keys(A.D)) delete A.D[key]; A.contentVersion = null; };

beforeEach(() => {
  svc.reset();
  S.ready = false;
  S.bootError = null;
  emptyContent();
});

test("nothing is bundled: the shared content object starts empty", () => {
  assert.deepEqual(atStart.content, {});
  assert.equal(atStart.version, null);
});

test("loading fills the shared object in place, so modules that kept a reference see it", async () => {
  const captured = A.D;                      // what `var D = A.D` does at module load, before any content exists
  const calls = backend({ [CONTENT]: payload() });
  await loadContent();
  assert.equal(A.D, shared, "A.D is still the same object");
  assert.equal(captured, A.D);
  assert.equal(captured.TOPICS.bowel.name, "Bowel", "a reference taken before the load now sees the content");
  assert.deepEqual(Object.keys(A.D).sort(), Object.keys(fixture).sort());
  assert.equal(A.contentVersion, "test-1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/content", "a plain same-origin GET with no query");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
});

test("keys the interface does not read are kept as they came", async () => {
  backend({ [CONTENT]: payload({ FAQ: [{ q: "What is cancer?", re: { $regexp: "what is cancer", flags: "i" } }], TRIAGE: { rules: [] } }) });
  await loadContent();
  assert.equal(A.D.FAQ[0].q, "What is cancer?");
  assert.deepEqual(A.D.TRIAGE, { rules: [] });
});

test("a payload that is not the content is rejected, and says why, without touching what is loaded", async () => {
  backend({ [CONTENT]: payload() });
  await loadContent();
  const before = { ...A.D };

  const garbage = {
    "null": null,
    "an array": [],
    "an error page": "<html>Bad gateway</html>",
    "an empty object": {},
    "no version": { content: fixture },
    "an empty version": payload({}, { version: "" }),
    "no content": { version: "x" },
    "content that is a list": { version: "x", content: [] },
    "empty content": { version: "x", content: {} },
    "TOPICS of the wrong kind": payload({ TOPICS: [] }),
    "a topic order that names no topic": payload({ TOPIC_ORDER: ["bowel", "lung"] }),
    "an empty topic order": payload({ TOPIC_ORDER: [] }),
    "no English strings": payload({ I18N: { fi: {} } }),
    "no emergency text": payload({ COPY: { disclaimer: "x" } }),
    "incomplete suggestions": payload({ SUGGESTIONS: { topics: {} } }),
    "a year that is text": payload({ YEAR: "2026" }),
  };
  for (const [name, body] of Object.entries(garbage)) {
    assert.throws(() => checkContent(body), error => error instanceof ApiError && error.code === "unavailable" && typeof error.reason === "string" && error.reason.length > 0, name);
    backend({ [CONTENT]: [200, body] });
    await assert.rejects(loadContent(), error => error instanceof ApiError && error.code === "unavailable", name);
  }
  assert.deepEqual({ ...A.D }, before, "a rejected payload leaves the loaded content alone");
  assert.equal(A.contentVersion, "test-1");
});

test("every part of the content the interface reads is required", () => {
  for (const key of Object.keys(fixture)) {
    const rest = { ...fixture };
    delete rest[key];
    assert.throws(() => checkContent({ version: "x", content: rest }), error => error.code === "unavailable" && error.reason.startsWith(key), key);
  }
  assert.deepEqual(Object.keys(checkContent(payload()).content).sort(), Object.keys(fixture).sort());
});

// The seed file is the contract for what the backend serves: the same keys and values as `content`.
const seedFile = new URL("../../../prisma/seed-data/design-content.json", import.meta.url);
test("the seed the database is filled from passes the check", { skip: !existsSync(seedFile) && "prisma/seed-data is not here" }, () => {
  const { source, content } = JSON.parse(readFileSync(seedFile, "utf8"));
  assert.equal(checkContent({ version: "seed", retrieved: source.retrieved, content }).version, "seed");
});

test("a content request that keeps failing is retried once, then reported as no connection", async () => {
  for (const [name, route, code] of [["a server error", () => json(503, { error: "unavailable" }), "unavailable"], ["no network", () => { throw new TypeError("Failed to fetch"); }, "offline"], ["garbage", () => json(200, {}), "unavailable"]]) {
    const calls = backend({ [ACCOUNT]: { account: null }, [CONTENT]: route });
    svc.reset(); S.bootError = null;
    await svc.boot();
    assert.equal(count(calls, CONTENT), 2, name + ": one automatic retry, no more");
    assert.equal(count(calls, ACCOUNT), 1, name + ": the account check had no need to run twice");
    assert.equal(S.bootError, code, name);
    assert.equal(S.ready, true, name);
    assert.deepEqual({ ...A.D }, {}, name + ": nothing half-loaded");
  }
});

test("whatever goes wrong with the content, it is reported as no connection or unavailable, never as an account problem", async () => {
  const cases = [
    [401, { error: "expired" }, "unavailable"], [403, { error: "credentials" }, "unavailable"], [404, null, "unavailable"], [400, { error: "invalid" }, "unavailable"],
    [409, { error: "conflict" }, "unavailable"], [500, { error: "unavailable" }, "unavailable"], [502, null, "unavailable"], [429, { error: "limited" }, "limited"],
  ];
  for (const [status, body, code] of cases) {
    backend({ [CONTENT]: [status, body] });
    await assert.rejects(loadContent(), error => error instanceof ApiError && error.code === code, status + " should be " + code);
  }
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(loadContent(), error => error instanceof ApiError && error.code === "offline");

  // At start-up "expired" would mean a session that ended, which is not a failure: the content must never come back that way.
  backend({ ...signedIn, [CONTENT]: [401, { error: "expired" }] });
  await svc.boot();
  assert.equal(S.bootError, "unavailable");
});

test("one dropped content request is retried and the app starts normally", async () => {
  let attempts = 0;
  const calls = backend({ [ACCOUNT]: { account: null }, [CONTENT]: () => attempts++ === 0 ? json(502, {}) : json(200, payload()) });
  await svc.boot();
  assert.equal(count(calls, CONTENT), 2);
  assert.equal(S.bootError, null);
  assert.equal(A.D.TOPICS.skin.name, "Skin");
});

test("start-up failures are reported: no content is the one that counts, and an account failure shows as before", async () => {
  backend({ ...signedIn, [CONTENT]: [503, { error: "unavailable" }] });
  await svc.boot();
  assert.equal(S.bootError, "unavailable");
  assert.equal(S.account.username, "aino", "the account's records loaded, and are kept for the retry");

  const calls = backend({ [ACCOUNT]: [503, { error: "unavailable" }], [CONTENT]: payload() });
  svc.reset(); S.bootError = null;
  await svc.boot();
  assert.equal(count(calls, ACCOUNT), 2);
  assert.equal(S.bootError, "unavailable");
  assert.equal(A.D.TOPICS.bowel.name, "Bowel", "the content loaded, whatever the account did");

  backend({ [ACCOUNT]: [401, { error: "expired" }], [CONTENT]: [503, { error: "unavailable" }] });
  svc.reset(); S.bootError = null;
  await svc.boot();
  assert.equal(S.bootError, "unavailable", "no content is a failure even when the session also ended");
});

test("an ended session is not a failure, as before", async () => {
  backend({ [ACCOUNT]: [401, { error: "expired" }], [CONTENT]: payload() });
  await svc.boot();
  assert.equal(S.bootError, "expired");
  assert.equal(S.account, null);
  assert.equal(S.ready, true);
});

test("'try again' loads the content again", async () => {
  backend({ [ACCOUNT]: { account: null }, [CONTENT]: [503, { error: "unavailable" }] });
  await svc.boot();
  assert.equal(S.bootError, "unavailable");
  assert.deepEqual({ ...A.D }, {});

  const calls = backend({ [ACCOUNT]: { account: null }, [CONTENT]: payload() });
  S.bootError = null;                        // what the retry button does before it calls boot()
  await svc.boot();
  assert.equal(count(calls, CONTENT), 1);
  assert.equal(S.bootError, null);
  assert.equal(A.D.TOPICS.bowel.name, "Bowel");
  assert.equal(A.contentVersion, "test-1");
});

for (const [first, second] of [["account", "content"], ["content", "account"]]) {
  test(`boot waits for both requests, which start together: the ${first} answers first`, async () => {
    const gate = { account: deferred(), content: deferred() };
    const started = [];
    backend({
      [ACCOUNT]: async () => { started.push("account"); await gate.account.promise; return json(200, { account: null }); },
      [CONTENT]: async () => { started.push("content"); await gate.content.promise; return json(200, payload()); },
    });
    let finished = false;
    const booting = svc.boot().then(() => { finished = true; });
    await settle();
    assert.deepEqual(started.sort(), ["account", "content"], "neither waits for the other to start");

    gate[first].release();
    await settle();
    assert.equal(finished, false, "one answer is not enough: the first screen needs both");
    assert.equal(S.ready, false);

    gate[second].release();
    await booting;
    assert.equal(finished, true);
    assert.equal(S.ready, true);
    assert.equal(S.bootError, null);
    assert.equal(A.D.TOPICS.bowel.name, "Bowel", "the content is there when boot is done");
  });
}

test("a signed-in person's records load correctly while the content is still on its way", async () => {
  const content = deferred();
  const at = "2026-11-10T09:00:00.000Z";
  backend({
    ...signedIn,
    "GET observations": { nextCursor: null, observations: [{ id: "d", kind: "symptom", label: "Cough", notes: "", createdAt: at, observedAt: null, details: { topic: "colorectal", symptoms: ["A cough"] } }] },
    [CONTENT]: async () => { await content.promise; return json(200, payload()); },
  });
  const booting = svc.boot();
  await settle();
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(S.notes.length, 1, "the observations were read before any content existed");
  content.release();
  await booting;
  assert.equal(S.bootError, null);
  assert.equal(S.notes[0].topic, "bowel", "the topic is the design's id, with no need for the content to name it");
});
