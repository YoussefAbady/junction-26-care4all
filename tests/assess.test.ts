import assert from "node:assert/strict";
import { test } from "node:test";
import { factsOf, mayBeSent, sendableFields, sendableTypes } from "../src/lib/assess/facts";
import { check, flow, missing, optionsOf, registry, type Answer, type Answers, type Entry, type Field, type Question } from "../src/lib/intake";

// No network and no database: the model is a stub, the content store is the in-memory one, and the person is fictional.
// The person's every typed answer, their date of birth and their place are unique sentinel strings, so a test can prove
// that none of them reaches the model.

const now = new Date("2026-11-14T12:00:00Z");
const born = "1971-04-09"; // 55 years old on that day
const sentinel = (id: string) => "SENTINEL-" + id.replace(/[^a-z0-9]/gi, "-") + "-x7q";
const username = "sentinel-username-x7q";

function entryFor(fields: Field[], prefix: string): Entry {
  const entry: Entry = {};
  for (const field of fields) {
    if (field.type === "text") entry[field.id] = sentinel(prefix + "." + field.id);
    else if (field.type === "number") entry[field.id] = field.min;
    else if (field.type === "year") entry[field.id] = 2001;
    else if (field.type === "choice") entry[field.id] = field.options[0].id;
    else entry[field.id] = [field.options[0].id];
  }
  return entry;
}
const chosen: Record<string, Answer> = {
  dob: born, sex: "male", residence: "tampere", areas: ["bowel", "skin", "other"], conditions: ["ibd", "other"], organs: ["prostate", "testes"], smoke: "former",
};
function pick(question: Question, answers: Answers): Answer {
  if (question.id in chosen) return chosen[question.id];
  switch (question.type) {
    case "text": return sentinel(question.id);
    case "date": return born;
    case "choice": return question.options[0].id;
    case "multi": return [optionsOf(question, answers)[0].id];
    case "number": return question.min;
    case "year": return 2001;
    case "scale": return 3;
    case "body": return ["head"];
    case "form": return entryFor(question.fields, question.id);
    case "list": return [entryFor(question.fields, question.id)];
  }
}
/** A fictional person who has answered every question that applies to them, typing a sentinel wherever words are asked for. */
function person(): Answers {
  const answers: Answers = {};
  for (let guard = 0; guard < 500 && missing(answers).length; guard++) {
    const question = missing(answers)[0];
    const answer = pick(question, answers);
    assert.equal(check(question, answer, now), null, "valid answer for " + question.id);
    answers[question.id] = answer;
  }
  return answers;
}
const typedQuestions = () => [...registry.values()].filter(question => question.type === "text" || question.type === "date" || (("fields" in question) && question.fields.some(field => field.type === "text")));

// ---------------------------------------------------------------------------------------------------- the allow-list

test("the allow-list is by kind of answer and denies by default", () => {
  assert.deepEqual([...sendableTypes].sort(), ["body", "choice", "multi", "number", "scale", "year"]);
  assert.deepEqual([...sendableFields].sort(), ["choice", "multi", "number", "year"]);
  for (const question of registry.values()) {
    if (question.type === "text" || question.type === "date") assert.equal(mayBeSent(question), false, question.id);
    if ("fields" in question && question.fields.some(field => field.type === "text")) assert.equal(mayBeSent(question), false, question.id);
  }
  for (const id of ["meds_list", "allergy_list", "surgery_list"]) assert.equal(mayBeSent(registry.get(id)!), false, id); // lists with typed fields
  for (const id of ["cancer_list", "fh_list", "smoke_amount", "scr_result"]) assert.equal(mayBeSent(registry.get(id)!), true, id); // lists and forms of choices and numbers
  assert.equal(mayBeSent({ ...registry.get("sex")!, type: "phone" } as unknown as Question), false); // a kind added later is not sent until someone decides it may be
});

test("a person whose every typed answer is a sentinel is sent as age, a few derived facts and coded answers, and nothing typed", () => {
  const answers = person();
  const shown = new Set(flow(answers).map(question => question.id));
  const typed = typedQuestions().filter(question => shown.has(question.id));
  assert.ok(typed.length >= 12, "the test person answered " + typed.length + " typed questions");
  for (const id of ["name", "dob", "areas_other", "sx_notes", "conditions_other", "anything_else", "meds_list", "allergy_list", "surgery_list"]) assert.ok(shown.has(id) && answers[id] !== undefined, id + " was answered");

  const facts = factsOf(answers, now);
  const json = JSON.stringify(facts);
  assert.ok(!json.includes("SENTINEL"), "no typed answer");
  assert.ok(!json.includes(born) && !json.includes("1971"), "no date of birth");
  assert.ok(!/tampere/i.test(json), "no place");
  assert.equal(facts.age, 55);
  assert.equal(facts.inFinland, true);
  assert.ok(facts.bmiBand !== undefined && facts.packYears !== undefined, "the derived measures that are not identifying are sent");
  assert.ok(facts.answers.length > 30);
  const sent = new Set(facts.answers.map(fact => fact.id));
  for (const id of ["name", "dob", "residence", "body", "areas_other", "sx_notes", "meds_list", "allergy_list", "surgery_list", "phq1", "gad2"]) assert.ok(!sent.has(id), id + " is not sent");
  for (const fact of facts.answers) {
    const question = registry.get(fact.id)!;
    assert.ok(question && mayBeSent(question), fact.id + " may be sent");
    assert.ok(shown.has(fact.id), fact.id + " is part of the interview");
  }
  for (const id of ["smoke", "cancer_list", "fh_list", "areas", "scr_gate"]) assert.ok(sent.has(id), id + " is sent as coded answers");
  // Nothing in a fact's wording can carry a name: the wording is read without the person's answers.
  assert.ok(facts.answers.every(fact => !fact.question.includes("{") && !fact.question.includes("SENTINEL")));
});

test("not sure, declined and skipped answers and hidden branches are left out, and a stranger abroad is not in Finland", () => {
  const facts = factsOf({ dob: born, sex: "female", residence: "abroad", smoke: { $: "unsure" }, alc_freq: "never", sleep: { $: "skipped" } } as Answers, now);
  assert.equal(facts.inFinland, false);
  assert.deepEqual(facts.answers.map(fact => fact.id).sort(), ["alc_freq", "sex"]);
  assert.deepEqual(factsOf({}, now), { answers: [] });
  assert.equal(factsOf({ residence: "finland" }, now).inFinland, true);
});
