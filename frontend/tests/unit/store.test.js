import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { payload } from "./content-fixture.js";

// The store reads display preferences when it loads, so the browser globals must exist before it is imported.
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => { storage.set(key, String(value)); },
  removeItem: key => { storage.delete(key); },
};
const { A } = await import("../../src/app.js");
const { S, svc, apiTopic, designTopic } = await import("../../src/state/store.js");
const { errorText } = await import("../../src/state/text.js");
const { ApiError } = await import("../../src/api/client.js");

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A fake backend. Each entry is "METHOD path" and returns a body, or [status, body]. */
function backend(routes, calls = []) {
  globalThis.fetch = async (url, init = {}) => {
    const key = (init.method || "GET") + " " + url.replace(/^\/api\//, "");
    calls.push({ key, body: init.body ? JSON.parse(init.body) : undefined });
    const route = routes[key];
    if (!route) throw new Error("unexpected request: " + key);
    const [status, body] = Array.isArray(route) ? route : [200, route];
    return json(status, body);
  };
  return calls;
}

const profile = { name: "Aino", yob: 1974, sex: "female", county: "pirkanmaa" };
const prefs = { lang: "en", scale: 0, plain: false, motion: true };
const nextAction = { nextAction: { id: "complete_intake", title: "Continue getting to know you" }, suggestedTopics: [] };
// Start-up also loads the public content. Nothing is bundled, so every boot needs this route, with a small fictional fixture.
const content = { "GET content": payload() };
const signedIn = {
  ...content,
  "GET account?view=identity": { account: { username: "aino", language: "en" } },
  "GET profile": { profile, preferences: { ...prefs, lang: "fi", scale: 2 } },
  "GET reminders": { reminders: [] },
  "GET observations": { observations: [], nextCursor: null },
  "GET chat/next-action?lang=en": nextAction,
  "GET chat/next-action?lang=fi": nextAction,
};

beforeEach(() => {
  svc.reset();
  S.ready = false;
  // Display preferences deliberately survive signing out, so each test starts them from the defaults.
  Object.assign(S.prefs, { lang: "en", scale: 0, plain: false, motion: true, skin: 1 });
  storage.clear();
});

test("a refused address is named, with the address to open instead, in both languages", () => {
  globalThis.location = { origin: "http://example.invalid:9999" };
  try {
    S.prefs.lang = "en";
    assert.equal(errorText(new ApiError("origin", 403, "http://localhost:8080")),
      "The server does not accept requests from this address (http://example.invalid:9999). Open care4all at http://localhost:8080 instead.");
    assert.match(errorText(new ApiError("origin", 403)), /Open care4all at the address it was set up with\./);
    S.prefs.lang = "fi";
    assert.match(errorText(new ApiError("origin", 403, "http://localhost:8080")), /Avaa care4all osoitteessa http:\/\/localhost:8080\./);
    assert.notEqual(errorText(new ApiError("origin", 403)), errorText(new ApiError("invalid", 400)), "it is not the generic 'check the information' message");
  } finally { delete globalThis.location; }
});

test("the design's bowel topic is the backend's colorectal and unknown topics have no backend id", () => {
  assert.equal(apiTopic("bowel"), "colorectal");
  assert.equal(apiTopic("breast"), "breast");
  assert.equal(apiTopic("lung"), undefined);
  assert.equal(designTopic("colorectal"), "bowel");
  assert.equal(designTopic(undefined), "");
});

test("boot without a session leaves the app signed out and ready", async () => {
  backend({ ...content, "GET account?view=identity": { account: null } });
  await svc.boot();
  assert.equal(S.ready, true);
  assert.equal(S.account, null);
  assert.equal(S.profile, null);
  assert.equal(S.bootError, null);
  assert.equal(A.D.TOPICS.bowel.name, "Bowel", "the content came from the response and is there when boot is done");
});

test("boot with a session loads the profile, saved preferences and next action", async () => {
  backend(signedIn);
  await svc.boot();
  assert.equal(S.account.username, "aino");
  assert.deepEqual(S.profile, profile);
  assert.equal(S.prefs.lang, "fi");
  assert.equal(S.prefs.scale, 2);
  assert.equal(S.next.nextAction.id, "complete_intake");
});

test("an expired session at boot is treated as signed out", async () => {
  backend({ ...content, "GET account?view=identity": { account: { username: "aino", language: "en" } }, "GET profile": [401, { error: "expired" }], "GET reminders": [401, { error: "expired" }], "GET observations": [401, { error: "expired" }], "GET chat/next-action?lang=en": [401, { error: "expired" }] });
  await svc.boot();
  assert.equal(S.account, null);
  assert.equal(S.ready, true);
});

test("one dropped request at start-up is retried instead of showing 'no connection'", async () => {
  let identityCalls = 0;
  const routes = { ...signedIn };
  globalThis.fetch = async (url, init = {}) => {
    const key = (init.method || "GET") + " " + url.replace(/^\/api\//, "");
    if (key === "GET account?view=identity" && identityCalls++ === 0) return json(503, { error: "unavailable" });
    if (!routes[key]) throw new Error("unexpected request: " + key);
    return json(200, routes[key]);
  };
  await svc.boot();
  assert.equal(identityCalls, 2);
  assert.equal(S.bootError, null);
  assert.equal(S.account.username, "aino");
});

test("a backend that stays down is reported once, after a single retry", async () => {
  let identityCalls = 0;
  globalThis.fetch = async url => { if (url.includes("account")) identityCalls++; return json(503, { error: "unavailable" }); };
  await svc.boot();
  assert.equal(identityCalls, 2);
  assert.equal(S.bootError, "unavailable");
  assert.equal(S.ready, true);
  assert.equal(S.account, null);
});

test("an empty profile object from the server is no profile", async () => {
  backend({ ...signedIn, "GET profile": { profile: null, preferences: prefs } });
  await svc.boot();
  assert.equal(S.profile, null);
});

test("reminders arrive in the shape the design uses, with bowel instead of colorectal", async () => {
  const due = new Date(Date.now() + 86400000).toISOString();
  backend({ ...signedIn, "GET reminders": { reminders: [
    { id: "r1", kind: "letter", topic: "colorectal", dueAt: due, done: false, createdAt: due },
    { id: "r2", kind: "checkin", topic: null, dueAt: due, done: true, createdAt: due },
  ] } });
  await svc.boot();
  assert.equal(S.reminders[0].topic, "bowel");
  assert.equal(S.reminders[0].status, "active");
  assert.equal(S.reminders[0].due, Date.parse(due));
  assert.equal(S.reminders[1].topic, "");
  assert.equal(S.reminders[1].status, "done");
});

test("observations are sorted into symptom notes, self-check results and scan dates", async () => {
  const at = "2026-11-10T09:00:00.000Z";
  backend({ ...signedIn, "GET observations": { nextCursor: null, observations: [
    { id: "a", kind: "observation", label: "Skin", notes: "", createdAt: at, observedAt: null, details: { topic: "skin", selfCheck: "change_noticed", symptoms: ["A new mole"] } },
    { id: "b", kind: "observation", label: "Skin", notes: "", createdAt: "2026-11-01T09:00:00.000Z", observedAt: null, details: { topic: "skin", selfCheck: "nothing_new" } },
    { id: "c", kind: "observation", label: "Colorectal screening", notes: "", createdAt: at, observedAt: "2026-05-01T12:00:00.000Z", details: { scanId: "fit", topic: "colorectal" } },
    { id: "d", kind: "symptom", label: "Cough", notes: "At night", createdAt: at, observedAt: null, details: { topic: "colorectal", onset: "week", course: "comes", symptoms: ["Blood when I wipe"] } },
  ] } });
  await svc.boot();
  assert.deepEqual(S.checklog.map(item => [item.id, item.result]), [["a", "change"], ["b", "clear"]]);
  assert.equal(S.checks.skin.id, "a", "the newest result is the latest check");
  assert.equal(S.scans.fit.id, "c");
  assert.equal(S.scans.fit.ts, Date.parse("2026-05-01T12:00:00.000Z"));
  assert.equal(S.notes.length, 1);
  assert.deepEqual(S.notes[0], { id: "d", ts: Date.parse(at), kind: "symptom", topic: "bowel", symptoms: ["Blood when I wipe"], when: "In the past week", still: "Comes and goes", note: "At night" });
});

test("observations are read page by page until the cursor runs out", async () => {
  const calls = backend({ ...signedIn,
    "GET observations": { observations: [{ id: "x1", kind: "symptom", label: "One", notes: "", createdAt: "2026-11-02T00:00:00Z", observedAt: null }], nextCursor: "x1" },
    "GET observations?before=x1": { observations: [{ id: "x2", kind: "symptom", label: "Two", notes: "", createdAt: "2026-11-01T00:00:00Z", observedAt: null }], nextCursor: null },
  });
  await svc.boot();
  assert.deepEqual(S.notes.map(note => note.id), ["x1", "x2"]);
  assert.ok(calls.some(call => call.key === "GET observations?before=x1"));
});

test("registering saves the language and display choices made before sign-up, then loads the account", async () => {
  const calls = backend({
    "POST account?view=identity": [201, { account: { username: "aino", language: "en" } }],
    "PUT profile": { profile: null, preferences: prefs },
    "GET profile": { profile: null, preferences: prefs },
    "GET reminders": { reminders: [] }, "GET observations": { observations: [], nextCursor: null },
    "GET chat/next-action?lang=en": nextAction,
  });
  S.prefs.scale = 1;
  await svc.register("aino", "a long password");
  const order = calls.map(call => call.key);
  assert.ok(order.indexOf("POST account?view=identity") < order.indexOf("PUT profile"));
  assert.deepEqual(calls.find(call => call.key === "PUT profile").body, { profile: null, preferences: { lang: "en", scale: 1, plain: false, motion: true } });
  assert.equal(S.account.username, "aino");
});

test("a reminder is sent as an ISO time, and bowel becomes colorectal", async () => {
  const when = Date.now() + 7 * 86400000;
  const calls = backend({ ...signedIn, "POST reminders": [201, { reminder: { id: "n1" } }] });
  await svc.boot();
  await svc.addReminder({ kind: "letter", topic: "bowel", due: when });
  assert.deepEqual(calls.find(call => call.key === "POST reminders").body, { kind: "letter", topic: "colorectal", dueAt: new Date(when).toISOString() });
});

test("a reminder for a topic the backend does not know is sent without a topic", async () => {
  const calls = backend({ ...signedIn, "POST reminders": [201, { reminder: { id: "n1" } }] });
  await svc.boot();
  await svc.addReminder({ kind: "checkin", topic: "lung", due: Date.now() + 86400000 });
  assert.equal(calls.find(call => call.key === "POST reminders").body.topic, null);
});

test("the profile is sent with exactly the fields the backend accepts", async () => {
  const calls = backend({ ...signedIn, "PUT profile": { profile, preferences: prefs } });
  await svc.boot();
  await svc.saveProfile({ ...profile, example: true, consent: { v: 1 } });
  assert.deepEqual(calls.find(call => call.key === "PUT profile").body.profile, profile);
});

test("signing out clears everything personal", async () => {
  backend({ ...signedIn, "DELETE account": { account: null } });
  await svc.boot();
  await svc.logout();
  assert.equal(S.account, null);
  assert.equal(S.profile, null);
  assert.deepEqual(S.reminders, []);
  assert.equal(S.next, null);
});

test("only display preferences are ever written to browser storage", async () => {
  backend({ ...signedIn, "POST reminders": [201, { reminder: { id: "n1" } }], "POST observations": [201, { observation: { id: "o1" } }], "PUT profile": { profile, preferences: prefs } });
  await svc.boot();
  await svc.saveProfile(profile);
  await svc.addReminder({ kind: "letter", topic: "breast", due: Date.now() + 86400000 });
  await svc.addObservation({ kind: "symptom", label: "A private note", notes: "private words", details: { symptoms: ["private symptom"] } });
  await svc.savePrefs();
  assert.deepEqual([...storage.keys()], ["c4a:display"]);
  const saved = JSON.parse(storage.get("c4a:display"));
  assert.deepEqual(Object.keys(saved).sort(), ["dismissInstall", "lang", "motion", "plain", "scale", "skin"]);
  assert.doesNotMatch(storage.get("c4a:display"), /Aino|private|pirkanmaa|1974/);
});
