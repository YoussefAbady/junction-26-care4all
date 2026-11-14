import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import { renderServiceWorker } from "../../scripts/render-sw.js";

const template = readFileSync(new URL("../../src/sw.js", import.meta.url), "utf8");
const urls = ["/", "/assets/index-abc.js", "/manifest.webmanifest"];

/** Runs the rendered worker the way a browser would, with just enough of the worker scope to load it. */
function load(source) {
  const listeners = {};
  const scope = { addEventListener: (type, handler) => { listeners[type] = handler; }, location: { origin: "http://localhost:8080" } };
  const context = vm.createContext({ self: scope, caches: {}, fetch() {}, URL, Response: class {} });
  const exported = vm.runInContext(source + "\n;({ VERSION, CACHE, PRECACHE })", context);
  return { ...exported, listeners };
}

test("the rendered worker loads, carries its version and precaches exactly the build's files", () => {
  const worker = load(renderServiceWorker(template, { version: "0123456789ab", urls }));
  assert.equal(worker.VERSION, "0123456789ab");
  assert.equal(worker.CACHE, "care4all-shell-0123456789ab");
  assert.deepEqual([...worker.PRECACHE], urls);
  assert.deepEqual(Object.keys(worker.listeners).sort(), ["activate", "fetch", "install", "message"]);
});

test("no placeholder survives, including in comments", () => {
  const source = renderServiceWorker(template, { version: "v1", urls });
  assert.doesNotMatch(source, /__VERSION__|__PRECACHE__/);
});

test("a template that lost a declaration is rejected instead of producing a broken worker", () => {
  assert.throws(() => renderServiceWorker("const VERSION = 1;", { version: "v", urls }), /declare VERSION and PRECACHE/);
});

test("the worker never answers or caches requests for the API", () => {
  const worker = load(renderServiceWorker(template, { version: "v1", urls }));
  let handled = false;
  const event = { request: { method: "GET", url: "http://localhost:8080/api/profile", mode: "cors" }, respondWith() { handled = true; } };
  worker.listeners.fetch(event);
  assert.equal(handled, false, "an /api/ request must fall through to the network untouched");
  const write = { request: { method: "POST", url: "http://localhost:8080/assets/x.js", mode: "cors" }, respondWith() { handled = true; } };
  worker.listeners.fetch(write);
  assert.equal(handled, false, "only GET requests are ever handled");
});
