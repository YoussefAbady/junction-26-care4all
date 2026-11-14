import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedOrigins, originAccepted } from "../src/lib/origin";

const asks = (origin: string | null, configured: string | undefined, extra: Record<string, string> = {}) => {
  const headers = new Headers(extra);
  if (origin !== null) headers.set("origin", origin);
  return originAccepted(headers, configured, "http://backend:3000/api/account");
};

test("a loopback origin also stands for the other two loopback names on the same scheme and port", () => {
  assert.deepEqual(allowedOrigins("http://localhost:8080").sort(), ["http://127.0.0.1:8080", "http://[::1]:8080", "http://localhost:8080"]);
  assert.deepEqual(allowedOrigins("http://127.0.0.1:8080").sort(), ["http://127.0.0.1:8080", "http://[::1]:8080", "http://localhost:8080"]);
  assert.deepEqual(allowedOrigins("http://[::1]:8080").sort(), ["http://127.0.0.1:8080", "http://[::1]:8080", "http://localhost:8080"]);
  assert.equal(allowedOrigins("http://localhost:8080")[0], "http://localhost:8080", "the configured origin comes first: it is the one the interface tells people to open");
});

test("the aliases keep the scheme and the port, and a public origin stands for itself only", () => {
  assert.equal(asks("http://127.0.0.1:8080", "http://localhost:8080"), true);
  assert.equal(asks("http://127.0.0.1:9090", "http://localhost:8080"), false, "another port is another service");
  assert.equal(asks("https://127.0.0.1:8080", "http://localhost:8080"), false, "another scheme is another origin");
  assert.deepEqual(allowedOrigins("https://care4all.example"), ["https://care4all.example"]);
  assert.equal(asks("https://care4all.example", "https://care4all.example"), true);
  assert.equal(asks("http://localhost:8080", "https://care4all.example"), false, "a public deployment does not accept loopback pages");
});

test("APP_ORIGIN may list several origins, with spaces and trailing slashes ignored", () => {
  const configured = " https://care4all.example/ , https://staging.care4all.example ";
  assert.deepEqual(allowedOrigins(configured), ["https://care4all.example", "https://staging.care4all.example"]);
  assert.equal(asks("https://staging.care4all.example", configured), true);
  assert.equal(asks("https://evil.example", configured), false);
});

test("without APP_ORIGIN the request's own origin is the one", () => {
  assert.deepEqual(allowedOrigins(undefined, "http://backend:3000/api/account"), ["http://backend:3000"]);
  assert.deepEqual(allowedOrigins("", "http://backend:3000/api/account"), ["http://backend:3000"]);
  assert.deepEqual(allowedOrigins(undefined), [], "nothing is accepted when there is nothing to compare with");
  assert.equal(asks("http://backend:3000", undefined), true);
  assert.equal(asks("http://localhost:8080", undefined), false);
});

test("a write needs an Origin header that is allowed, and not a cross-site fetch", () => {
  assert.equal(asks("http://localhost:8080", "http://localhost:8080"), true);
  assert.equal(asks(null, "http://localhost:8080"), false, "no Origin header, no write");
  assert.equal(asks("null", "http://localhost:8080"), false, "a sandboxed page sends the origin null");
  assert.equal(asks("http://example.invalid", "http://localhost:8080"), false);
  assert.equal(asks("http://localhost:8080", "http://localhost:8080", { "sec-fetch-site": "same-origin" }), true);
  assert.equal(asks("http://localhost:8080", "http://localhost:8080", { "sec-fetch-site": "cross-site" }), false);
  assert.equal(asks("http://127.0.0.1:8080", "http://localhost:8080", { "sec-fetch-site": "same-origin" }), true);
});

test("an origin that is not an address matches nothing a browser sends", () => {
  assert.deepEqual(allowedOrigins("not an address"), ["not an address"]);
  assert.equal(asks("http://localhost:8080", "not an address"), false);
});
