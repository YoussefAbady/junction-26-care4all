import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ApiError, request } from "../../src/api/client.js";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const reply = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("requests are same-origin, uncached, carry the cookie and send JSON bodies", async () => {
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return reply(200, { ok: true }); };
  const data = await request("reminders", { method: "POST", body: { kind: "letter" } });
  assert.deepEqual(data, { ok: true });
  assert.equal(seen.url, "/api/reminders");
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.cache, "no-store");
  assert.equal(seen.init.credentials, "same-origin");
  assert.equal(seen.init.headers["Content-Type"], "application/json");
  assert.equal(seen.init.body, JSON.stringify({ kind: "letter" }));
});

test("a GET sends no body and no content type", async () => {
  let init;
  globalThis.fetch = async (_url, options) => { init = options; return reply(200, {}); };
  await request("profile");
  assert.equal(init.body, undefined);
  assert.equal(init.headers["Content-Type"], undefined);
});

test("the backend's error string becomes the error code", async () => {
  globalThis.fetch = async () => reply(401, { error: "credentials" });
  await assert.rejects(request("account"), error => error instanceof ApiError && error.code === "credentials" && error.status === 401);
});

test("a write from an address the backend does not accept says which address it does", async () => {
  globalThis.fetch = async () => reply(403, { error: "origin", expected: "http://localhost:8080" });
  await assert.rejects(request("account?view=identity", { method: "POST", body: {} }),
    error => error instanceof ApiError && error.code === "origin" && error.status === 403 && error.expected === "http://localhost:8080");
  globalThis.fetch = async () => reply(403, { error: "credentials", expected: "http://other.example" });
  await assert.rejects(request("my-data", { method: "DELETE", body: {} }), error => error.code === "credentials" && error.expected === "", "only an origin refusal carries an address");
});

test("status codes without a body map to the codes the interface understands", async () => {
  for (const [status, code] of [[401, "expired"], [409, "conflict"], [429, "limited"], [400, "invalid"], [502, "unavailable"]]) {
    globalThis.fetch = async () => new Response("<html></html>", { status });
    await assert.rejects(request("anything"), error => error.code === code, String(status));
  }
});

test("an unreachable server is reported as offline, not as a bad request", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(request("profile"), error => error instanceof ApiError && error.code === "offline");
});

test("an aborted request keeps its own error so callers can ignore it", async () => {
  globalThis.fetch = async () => { throw new DOMException("aborted", "AbortError"); };
  await assert.rejects(request("library"), error => error.name === "AbortError");
});
