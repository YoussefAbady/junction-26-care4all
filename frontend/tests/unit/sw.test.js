import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import { renderServiceWorker } from "../../scripts/render-sw.js";

// A worker that never answers must fail a test, not hang the run.
const check = (name, body) => test(name, { timeout: 5000 }, body);

const template = readFileSync(new URL("../../src/sw.js", import.meta.url), "utf8");
const urls = ["/", "/assets/index-abc.js", "/manifest.webmanifest"];
const ORIGIN = "http://localhost:8080";
const CONTENT = ORIGIN + "/api/content";
const absolute = request => new URL(typeof request === "string" ? request : request.url, ORIGIN).href;

/** A CacheStorage that keeps responses in memory, keyed by absolute URL. */
function createCaches() {
  const stores = new Map();
  const open = async name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      match: async request => store.get(absolute(request))?.clone(),
      put: async (request, response) => { store.set(absolute(request), response); },
      addAll: async list => { for (const url of list) store.set(absolute(url), new Response("shell " + url)); },
    };
  };
  return {
    stores, open,
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    match: async request => { for (const store of stores.values()) if (store.has(absolute(request))) return store.get(absolute(request)).clone(); },
  };
}

/**
 * Runs the rendered worker the way a browser would, with just enough of the worker scope to load it. `network` stands
 * in for the server: replace network.answer to change what it says, or make it throw to be offline.
 */
function load(source) {
  const listeners = {};
  const caches = createCaches();
  const network = { calls: [], answer: async () => { throw new TypeError("offline"); } };
  const scope = { addEventListener: (type, handler) => { listeners[type] = handler; }, location: { origin: ORIGIN }, clients: { claim: async () => {} } };
  const context = vm.createContext({ self: scope, caches, fetch: request => { network.calls.push(request.url); return network.answer(request); }, URL, Response });
  const exported = vm.runInContext(source + "\n;({ VERSION, CACHE, CONTENT_CACHE, PRECACHE })", context);
  return { ...exported, listeners, caches, network };
}

const worker = () => load(renderServiceWorker(template, { version: "v1", urls }));
const reply = (body, status = 200) => async () => new Response(body, { status });

/**
 * Sends a request to the worker. `handled` says whether the worker took it over: when it did not, the browser goes to
 * the network by itself. `finished` settles when the work the worker asked to keep alive is done.
 */
function send(w, url, { method = "GET", mode = "cors" } = {}) {
  let answer;
  const lifetime = [];
  w.listeners.fetch({ request: { method, url, mode }, respondWith: promise => { answer = promise; }, waitUntil: promise => { lifetime.push(promise); } });
  return { handled: answer !== undefined, response: answer, finished: () => Promise.all(lifetime) };
}

const textOf = async response => (await response).text();
/** The text of the content the worker has kept, or undefined. */
const kept = async w => {
  const store = w.caches.stores.get(w.CONTENT_CACHE);
  return store && store.has(CONTENT) ? store.get(CONTENT).clone().text() : undefined;
};

check("the rendered worker loads, carries its version and precaches exactly the build's files", () => {
  const w = load(renderServiceWorker(template, { version: "0123456789ab", urls }));
  assert.equal(w.VERSION, "0123456789ab");
  assert.equal(w.CACHE, "care4all-shell-0123456789ab");
  assert.equal(w.CONTENT_CACHE, "care4all-content-0123456789ab");
  assert.deepEqual([...w.PRECACHE], urls);
  assert.deepEqual(Object.keys(w.listeners).sort(), ["activate", "fetch", "install", "message"]);
});

check("no placeholder survives, including in comments", () => {
  const source = renderServiceWorker(template, { version: "v1", urls });
  assert.doesNotMatch(source, /__VERSION__|__PRECACHE__/);
});

check("a template that lost a declaration is rejected instead of producing a broken worker", () => {
  assert.throws(() => renderServiceWorker("const VERSION = 1;", { version: "v", urls }), /declare VERSION and PRECACHE/);
});

check("the worker never answers or caches API requests other than the public content", async () => {
  const w = worker();
  w.network.answer = reply("private");
  const private_ = ["/api/profile", "/api/chat", "/api/account?view=identity", "/api/observations", "/api/reminders", "/api/cancers?lang=en", "/api/library?q=lump",
    "/api/content-reports", "/api/contents", "/api/content/extra", "/api/content.json", "/api/", "/api/Content"];
  for (const path of private_) {
    assert.equal(send(w, ORIGIN + path).handled, false, path + " must fall through to the network untouched");
    assert.equal(send(w, ORIGIN + path, { mode: "navigate" }).handled, false, path + " as a navigation");
  }
  assert.equal(send(w, "https://example.org/api/content").handled, false, "another origin is none of its business");
  assert.deepEqual(w.network.calls, [], "the worker itself made no request");
  assert.equal(w.caches.stores.size, 0, "and kept nothing");
});

check("only GET requests are ever handled", async () => {
  const w = worker();
  w.network.answer = reply("x");
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
    assert.equal(send(w, CONTENT, { method }).handled, false, method + " /api/content");
    assert.equal(send(w, ORIGIN + "/assets/index-abc.js", { method }).handled, false, method + " of a static file");
  }
  assert.deepEqual(w.network.calls, []);
  assert.equal(w.caches.stores.size, 0);
});

check("the content is fetched and kept, then served again with the network gone", async () => {
  const w = worker();
  w.network.answer = reply('{"version":"1"}');
  const online = send(w, CONTENT);
  assert.equal(online.handled, true);
  assert.equal(await textOf(online.response), '{"version":"1"}', "nothing was kept yet, so the network answered");
  await online.finished();
  assert.equal(await kept(w), '{"version":"1"}');
  assert.deepEqual([...w.caches.stores.keys()], ["care4all-content-v1"], "in a cache of its own, not the shell's");

  w.network.answer = async () => { throw new TypeError("offline"); };
  const offline = send(w, CONTENT);
  assert.equal(await textOf(offline.response), '{"version":"1"}', "served from the cache while offline");
  await offline.finished();
});

check("the copy on hand answers at once and a fresh one replaces it for next time", async () => {
  const w = worker();
  w.network.answer = reply('{"version":"1"}');
  const first = send(w, CONTENT);
  await first.response;
  await first.finished();

  let release;
  const slow = new Promise(resolve => { release = resolve; });
  w.network.answer = async () => { await slow; return new Response('{"version":"2"}'); };
  const second = send(w, CONTENT);
  assert.equal(await textOf(second.response), '{"version":"1"}', "the stale copy answers without waiting for the network");
  assert.equal(await kept(w), '{"version":"1"}');

  release();
  await second.finished();
  assert.equal(await kept(w), '{"version":"2"}', "the fresh copy was kept in the background");
  const third = send(w, CONTENT);
  assert.equal(await textOf(third.response), '{"version":"2"}');
  await third.finished();
});

check("the content is cached whatever the query, and only a good response is kept", async () => {
  const w = worker();
  w.network.answer = reply("down", 503);
  const failed = send(w, CONTENT);
  assert.equal((await failed.response).status, 503, "the page still sees what the server said");
  await failed.finished();
  assert.equal(w.caches.stores.get(w.CONTENT_CACHE)?.size ?? 0, 0, "an error is not kept");

  w.network.answer = reply("fine");
  const query = send(w, CONTENT + "?lang=fi");
  assert.equal(query.handled, true, "a query string does not stop the content being handled");
  await query.response;
  await query.finished();
  assert.deepEqual([...w.caches.stores.get(w.CONTENT_CACHE).keys()], [CONTENT + "?lang=fi"]);

  w.network.answer = async () => { throw new TypeError("offline"); };
  const nothing = send(w, CONTENT);
  await assert.rejects(nothing.response, TypeError, "with nothing kept and no network the page sees an ordinary failure");
  await nothing.finished();
});

check("the app shell still opens offline, and a failed content refresh changes nothing about it", async () => {
  const w = worker();
  await new Promise(resolve => w.listeners.install({ waitUntil: promise => resolve(promise) }));
  assert.equal(await textOf(send(w, ORIGIN + "/assets/index-abc.js").response), "shell /assets/index-abc.js");
  assert.equal(await textOf(send(w, ORIGIN + "/some/page", { mode: "navigate" }).response), "shell /", "offline, any page opens the cached shell");
});

check("a new version deletes the shell and content caches of the old ones and nothing else", async () => {
  const w = worker();
  for (const name of ["care4all-shell-old", "care4all-content-old", "care4all-shell-v1", "care4all-content-v1", "another-app"]) await w.caches.open(name);
  let claimed = false;
  w.listeners.activate({ waitUntil: promise => { claimed = promise; } });
  await claimed;
  assert.deepEqual([...await w.caches.keys()].sort(), ["another-app", "care4all-content-v1", "care4all-shell-v1"]);
});
