import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mockProvider, verdaProvider } from "../src/lib/ai-provider";
import { briefFacts } from "../src/lib/brief";
import { initialState, updateState } from "../src/lib/model";
import { nextAction } from "../src/lib/pathways";
import { activeQuestions } from "../src/lib/questionnaire";

test("onboarding branches and refuses incomplete submissions", () => {
  assert.deepEqual(activeQuestions({ reason: "Symptoms" }).map(q => q.id), ["reason", "age", "family", "symptoms", "region", "language"]);
  assert.equal(updateState(initialState("aino"), { kind: "onboarding", answers: { reason: "Symptoms" }, step: 6, complete: true }, randomUUID), null);
});

test("unknown screening status never implies eligibility", () => {
  const action = nextAction({ reason: "Prevention", screening: "I don’t know" }, true);
  assert.match(action.why, /uncertain/);
  assert.match(action.uncertainty, /cannot assess eligibility/);
});

test("brief facts preserve reported symptoms and distinguish missing fields", () => {
  const state = updateState(initialState("mika"), { kind: "symptom", value: { name: "Fictional cramp", presence: "Absent", onset: "", duration: "Two days", change: "Improving", notes: "After lunch" } }, randomUUID)!;
  assert.ok(briefFacts(state).includes("Fictional cramp · Absent · Onset not reported · Duration Two days · Change improving · After lunch"));
  assert.equal(updateState(initialState("aino"), { kind: "symptom", id: state.symptoms[0].id, value: state.symptoms[0] }, randomUUID), null);
});

test("mock orders facts deterministically and provider rejects invented indexes", async () => {
  assert.deepEqual(await mockProvider.order(["fact", "fact 2"], "brief"), [0, 1]);
  const stub: typeof fetch = async () => Response.json({ choices: [{ message: { content: '{"order":[0,3]}' } }] });
  const verda = verdaProvider({ base: "https://example.invalid/v1", key: "fictional", model: "fictional" }, stub);
  await assert.rejects(verda.order(["fact", "fact 2"], "brief"), /unavailable/);
});

test("Verda retries transient failures twice and surfaces failure", async () => {
  let attempts = 0;
  const stub: typeof fetch = async () => { attempts++; return new Response(null, { status: 503 }); };
  await assert.rejects(verdaProvider({ base: "https://example.invalid/v1", key: "fictional", model: "fictional" }, stub).order(["fact"], "brief"), /unavailable/);
  assert.equal(attempts, 2);
  await assert.rejects(verdaProvider({}).order(["fact"], "brief"), /configuration unavailable/);
});
