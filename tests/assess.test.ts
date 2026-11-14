import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAnswer } from "../src/lib/ai/guard";
import type { JsonRequest, TextModel } from "../src/lib/ai/models";
import type { SourcePassage } from "../src/lib/ai/prompt";
import { assess, reviewQuery, topicsOf, type AssessDeps } from "../src/lib/assess";
import { factsOf, mayBeSent, sendableFields, sendableTypes } from "../src/lib/assess/facts";
import { reviewRules, validateQuestion } from "../src/lib/assess/guard";
import { nextInstruction, reviewInstruction } from "../src/lib/assess/prompt";
import type { ContentStore, PassageQuery } from "../src/lib/content/types";
import { check, flow, missing, optionsOf, registry, type Answer, type Answers, type Entry, type Field, type Question } from "../src/lib/intake";
import { store } from "./content-store";

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

// -------------------------------------------------------------------------------------------------------- the contract

const picked = { id: "o1", label: "Yes, within the last two years" };
const earlier = (extra: object = {}) => ({ q: "Have you had a bowel cancer screening test before?", options: [picked, { id: "o2", label: "No, never" }], a: "o1", ...extra });
const call = { consent: true, language: "en", step: "next", history: [] as object[] };
const goodQuestion = { done: false, question: "Have you had a bowel cancer screening test before?", options: ["Yes, within the last two years", "Yes, longer ago", "No, never"] };

const logs: string[] = [];
/** A model that records what it was asked and replies as told. */
function fakeModel(reply: unknown | ((request: JsonRequest) => unknown)) {
  const requests: JsonRequest[] = [];
  const model: TextModel = {
    provider: "gemini", name: "fake-model",
    async generateJson(request) {
      requests.push(request);
      return typeof reply === "function" ? reply(request) : reply;
    },
  };
  return { model, requests };
}
function setup(overrides: Partial<AssessDeps> = {}) {
  const counts = { allow: [] as string[], loads: 0 };
  const deps: AssessDeps = {
    store, model: null, now, accountKey: username, signal: AbortSignal.timeout(20_000),
    allow: key => { counts.allow.push(key); return true; },
    loadAnswers: async () => { counts.loads++; return person(); },
    log: line => logs.push(line),
    ...overrides,
  };
  return { deps, counts };
}
const run = async (body: unknown, overrides: Partial<AssessDeps> = {}) => assess(setup(overrides).deps, body);

test("without consent, or with anything the contract does not allow, the answer is 400 and nothing happens", async () => {
  const { model, requests } = fakeModel(goodQuestion);
  const { deps, counts } = setup({ model });
  const long = (length: number) => "x".repeat(length);
  const bad: unknown[] = [
    undefined, null, "next", [], {}, { ...call, consent: false }, { ...call, consent: "yes" }, { language: "en", step: "next", history: [] },
    { ...call, language: "sv" }, { ...call, step: "done" }, { ...call, extra: true },
    { ...call, history: [earlier(), earlier(), earlier(), earlier()] },
    { ...call, history: [earlier({ q: long(201) })] }, { ...call, history: [earlier({ q: "" })] },
    { ...call, history: [earlier({ a: long(41) })] }, { ...call, history: [earlier({ a: "o9" })] }, { ...call, history: [earlier({ a: "" })] },
    { ...call, history: [earlier({ options: [{ id: long(41), label: "x" }, picked] })] },
    { ...call, history: [earlier({ options: [{ id: "o2", label: long(201) }, picked] })] },
    { ...call, history: [earlier({ options: [picked] })] },
    { ...call, history: [earlier({ options: [1, 2, 3, 4, 5, 6, 7].map(index => ({ id: "o" + index, label: "Option " + index })) })] },
    { ...call, history: [earlier({ extra: 1 })] }, { ...call, history: [{ q: "A question?", a: "o1" }] }, { ...call, history: "none" },
  ];
  for (const body of bad) {
    logs.length = 0;
    assert.deepEqual(await assess(deps, body), { status: 400, body: { error: "invalid" } }, JSON.stringify(body)?.slice(0, 80));
    assert.deepEqual(logs, []);
  }
  assert.equal(requests.length, 0);
  assert.equal(counts.loads, 0); // the saved answers are not even read
  assert.deepEqual(counts.allow, []);

  // The limits themselves are allowed, and so is "unsure", which is not one of the options.
  const exact = { ...call, history: [earlier({ q: long(200), a: "unsure", options: [{ id: long(40), label: long(200) }, picked] }), earlier(), earlier({ a: "o2" })] };
  assert.equal((await assess(deps, exact)).status, 200);
  assert.equal((await assess(deps, { ...call, history: undefined })).status, 200); // history may be left out
});

test("the extra question: the model is sent the language, the facts and the history, never the account or the request's own answers", async () => {
  const { model, requests } = fakeModel(goodQuestion);
  const body = { ...call, history: [earlier(), earlier({ q: "Do you drink alcohol most weeks?", a: "unsure" })] };
  const { deps, counts } = setup({ model });
  const result = await assess(deps, body);
  assert.deepEqual(result, {
    status: 200, body: { kind: "question", question: { title: goodQuestion.question, options: [
      { id: "o1", label: "Yes, within the last two years" }, { id: "o2", label: "Yes, longer ago" }, { id: "o3", label: "No, never" },
    ] } },
  });
  const [asked] = requests;
  assert.equal(asked.system, nextInstruction);
  const data = JSON.parse(asked.user);
  assert.deepEqual(Object.keys(data), ["language", "facts", "history"]);
  assert.equal(data.language, "en");
  assert.equal(data.facts.age, 55);
  assert.equal(data.facts.inFinland, true);
  // The earlier questions and the answers, in words. "Not sure" is told to the model as such. Ids and option lists are not.
  assert.deepEqual(data.history, [
    { question: "Have you had a bowel cancer screening test before?", answer: "Yes, within the last two years" },
    { question: "Do you drink alcohol most weeks?", answer: "Not sure" },
  ]);
  assert.deepEqual(data.facts, factsOf(person(), now)); // the facts are the account's saved answers, read on the server
  const everything = [asked.system, asked.user, JSON.stringify(asked.jsonSchema)].join("\n");
  for (const secret of [...typedQuestions().map(question => sentinel(question.id)), "SENTINEL", born, "1971", "tampere", "Tampere", username]) assert.ok(!everything.includes(secret), secret);
  assert.ok(everything.includes('"age":55') && everything.includes('"inFinland":true') && everything.includes('"id":"smoke"'));
  assert.deepEqual(counts.allow, [username]);
  assert.ok(asked.maxOutputTokens >= 1024 && asked.timeoutMs > 0);
  assert.equal(asked.signal, deps.signal);

  // The model finishing, and three earlier questions, are both "done". The third needs no model call and spends no budget.
  assert.deepEqual(await run(call, { model: fakeModel({ done: true, question: "", options: [] }).model }), { status: 200, body: { kind: "done" } });
  const idle = fakeModel(goodQuestion);
  const full = setup({ model: idle.model });
  assert.deepEqual(await assess(full.deps, { ...call, history: [earlier(), earlier(), earlier()] }), { status: 200, body: { kind: "done" } });
  assert.equal(idle.requests.length, 0);
  assert.deepEqual(full.counts, { allow: [], loads: 0 });
});

test("the question guard accepts a plain, safe multiple-choice question and refuses the rest", () => {
  const ok = (question: string, options: string[], language: "en" | "fi" = "en") => validateQuestion({ done: false, question, options }, language);
  const yes = ["Yes, within the last two years", "Yes, longer ago", "No, never"];
  assert.deepEqual(ok("Have you had a bowel cancer screening test before?", yes), { ok: true, done: false, title: "Have you had a bowel cancer screening test before?", options: yes });
  assert.deepEqual(ok("  Have you had   a mammogram before?  ", [" Yes ", "No"]), { ok: true, done: false, title: "Have you had a mammogram before?", options: ["Yes", "No"] });
  // A low-dose CT scan is a screening test, not a dose. The app adds "Not sure" itself, so the model's own is dropped.
  assert.deepEqual(ok("Have you ever had a low-dose CT scan or other screening check-up of your lungs?", ["Yes, within the last year", "Yes, 1 to 5 years ago", "Never", "Not sure"]),
    { ok: true, done: false, title: "Have you ever had a low-dose CT scan or other screening check-up of your lungs?", options: ["Yes, within the last year", "Yes, 1 to 5 years ago", "Never"] });
  assert.deepEqual(ok("Have you had a mammogram before?", ["Yes", "No", "Unsure", "I don't know"]), { ok: true, done: false, title: "Have you had a mammogram before?", options: ["Yes", "No"] });
  assert.equal(ok("Have you had a mammogram before?", ["Yes", "Not sure"]).ok, false, "one real option is not a choice");
  assert.equal(ok("What dose of vitamin D do you take every day?", ["Low", "High"]).ok, false, "a dose is still refused");
  assert.equal(ok("Onko sinulla ollut suolistosyövän seulontatutkimus aiemmin?", ["Kyllä, viimeisen kahden vuoden aikana", "Kyllä, kauemmin sitten", "Ei koskaan"], "fi").ok, true);
  assert.deepEqual(validateQuestion({ done: true, question: "", options: [] }, "en"), { ok: true, done: true });

  const refused: [string, string, unknown][] = [
    ["not the shape", "invalid-json", { question: "Have you had a mammogram before?" }],
    ["unknown key", "invalid-json", { done: false, question: "Have you had a mammogram before?", options: ["Yes", "No"], extra: 1 }],
    ["not JSON", "invalid-json", "Have you had a mammogram before?"],
    ["too short", "bad-question", { done: false, question: "Smoker?", options: ["Yes", "No"] }],
    ["too long", "bad-question", { done: false, question: "Have you had a mammogram before? " + "x".repeat(150) + "?", options: ["Yes", "No"] }],
    ["not a question", "bad-question", { done: false, question: "Tell us whether you had a mammogram.", options: ["Yes", "No"] }],
    ["one option", "bad-question", { done: false, question: "Have you had a mammogram before?", options: ["Yes"] }],
    ["seven options", "bad-question", { done: false, question: "Have you had a mammogram before?", options: ["a", "b", "c", "d", "e", "f", "g"] }],
    ["an empty option", "bad-question", { done: false, question: "Have you had a mammogram before?", options: ["Yes", " "] }],
    ["a long option", "bad-question", { done: false, question: "Have you had a mammogram before?", options: ["Yes", "n".repeat(61)] }],
    ["repeated options", "bad-question", { done: false, question: "Have you had a mammogram before?", options: ["Yes", "yes"] }],
    ["a link", "bad-question", { done: false, question: "Have you read https://example.org/screening before?", options: ["Yes", "No"] }],
    ["markdown", "bad-question", { done: false, question: "Have you had a **mammogram** before?", options: ["Yes", "No"] }],
    ["a request to write", "bad-question", { done: false, question: "Please describe your family history of cancer?", options: ["Yes", "No"] }],
    ["a request to type", "bad-question", { done: false, question: "Can you type in what you have noticed lately?", options: ["Yes", "No"] }],
    ["a name", "bad-question", { done: false, question: "What is your name?", options: ["Anna", "Other"] }],
    ["an address", "bad-question", { done: false, question: "Which address do you live at?", options: ["Home", "Other"] }],
    ["a place", "bad-question", { done: false, question: "Which city do you live in?", options: ["Helsinki", "Tampere"] }],
    ["a phone number", "bad-question", { done: false, question: "May we have your phone number?", options: ["Yes", "No"] }],
    ["an id number", "bad-question", { done: false, question: "What is your social security number?", options: ["Yes", "No"] }],
    ["a date of birth", "bad-question", { done: false, question: "What is your date of birth?", options: ["Before 1980", "After 1980"] }],
    ["an exact date", "bad-question", { done: false, question: "On what exact date was your last check-up?", options: ["Yes", "No"] }],
    ["a diagnosis", "bad-question", { done: false, question: "Have you been diagnosed with bowel cancer?", options: ["Yes", "No"] }],
    ["a treatment", "bad-question", { done: false, question: "Are you taking chemotherapy at the moment?", options: ["Yes", "No"] }],
    ["a medicine", "bad-question", { done: false, question: "Which medicine do you use for your bowel?", options: ["None", "Some"] }],
    ["a diagnosis in an option", "bad-question", { done: false, question: "How would you describe your bowel health?", options: ["You have cancer", "Fine"] }],
    ["a treatment in an option", "bad-question", { done: false, question: "How would you handle a lump in your breast?", options: ["You should take two tablets", "See a nurse"] }],
    ["the wrong language", "bad-question", { done: false, question: "Onko sinulla ollut suolistosyövän seulontatutkimus aiemmin ja ovatko tulokset olleet normaaleja?", options: ["Kyllä, ja ne olivat normaaleja", "Ei koskaan"] }],
  ];
  for (const [label, reason, raw] of refused) assert.deepEqual(validateQuestion(raw, "en"), { ok: false, reason }, label);
});

// ------------------------------------------------------------------------------------------------------- the review

const passages: SourcePassage[] = [
  { id: "rf:smoking", topic: "general", heading: "Smoking and cancer", text: "Smoking is a known risk factor for lung cancer and several other cancers. Stopping smoking lowers the risk over time." },
  { id: "rf:family", topic: "bowel", heading: "Family history", text: "A family history of bowel cancer is a known risk factor for bowel cancer. People with a close relative with bowel cancer can ask about screening." },
];
const review = "Smoking is a known risk factor for lung cancer and several other cancers. A family history of bowel cancer is also a known risk factor for bowel cancer. You could raise your smoking history and your family history with a professional, and ask about screening for your age group.";
const reviewOf = (answer: string, citations = ["rf:smoking", "rf:family"]) => validateAnswer({ answerable: true, answer, citations, followUps: [] }, passages, "en", reviewRules);
const reasonOf = (verdict: ReturnType<typeof reviewOf>) => (verdict.ok ? "accepted" : verdict.reason);

test("the review guard keeps every claim pattern, allows 1400 characters and hyphen lists, and adds the personal-risk rules", () => {
  assert.equal(reasonOf(reviewOf(review)), "accepted");
  const list = "- Smoking is a known risk factor for lung cancer.\n- A family history of bowel cancer is a known risk factor for bowel cancer.\n- You could raise both with a professional.";
  assert.equal(reasonOf(reviewOf(list)), "accepted");
  const long = review + " " + "Smoking is a known risk factor for lung cancer. ".repeat(14).trim();
  assert.ok(long.length > 900 && long.length < 1400);
  assert.equal(reasonOf(reviewOf(long)), "accepted");
  assert.equal(validateAnswer({ answerable: true, answer: long, citations: ["rf:smoking"], followUps: [] }, passages, "en").ok, false, "the chat's own budget is still 900");
  assert.equal(reasonOf(reviewOf(review + " " + "x".repeat(1400))), "bad-format");

  const refused: [string, string][] = [
    ["a diagnosis", "You have cancer, so book a visit."], ["whether they may have cancer", "You may have a tumour in your lung."],
    ["you are at risk", "You are at risk of lung cancer because you smoke."], ["you are at high risk", "You are at high risk of bowel cancer."],
    ["your risk", "Your risk is raised because smoking is a known risk factor."], ["your lung cancer risk", "Your lung cancer risk is something to raise with a professional."],
    ["a higher risk", "You have a higher risk of lung cancer than other people."], ["more likely", "You are more likely to develop bowel cancer."],
    ["a score", "Your risk score is something to raise with a professional."], ["a probability", "The probability of lung cancer is something to raise with a professional."],
    ["a percentage", "Smoking is a known risk factor for lung cancer in 30% of people."], ["a chance", "The chances of developing lung cancer are worth raising with a professional."],
    ["a number about the person", "You are 55 years old, so screening is worth raising with a professional."],
    ["a number that no passage has", "People of your age group could raise screening every 4 years with a professional."],
    ["a dose", "Smoking is a known risk factor for lung cancer. Take 500 mg of a vitamin every day."],
    ["treatment advice", "Smoking is a known risk factor for lung cancer. You should stop the medicine you take."],
    ["a link", "Smoking is a known risk factor for lung cancer, see https://example.org/smoking for more."],
    ["markdown", "## Smoking\nSmoking is a known risk factor for lung cancer."],
  ];
  const expected: Record<string, string> = { "a number about the person": "ungrounded", "a number that no passage has": "ungrounded", "a link": "bad-format", "markdown": "bad-format" };
  for (const [label, text] of refused) assert.equal(reasonOf(reviewOf(text, ["rf:smoking"])), expected[label] ?? "unsafe-claim", label);
  // The same rules in Finnish.
  const finnish = (answer: string) => reasonOf(validateAnswer({ answerable: true, answer, citations: ["rf:smoking"], followUps: [] }, passages, "fi", reviewRules));
  assert.equal(finnish("Tupakointi on tunnettu riskitekijä keuhkosyövälle, ja voit ottaa tupakointihistoriasi puheeksi ammattilaisen kanssa."), "accepted");
  for (const text of [
    "Riskisi on suurentunut, koska tupakointi on tunnettu syövän riskitekijä.", "Sinulla on suurentunut riski sairastua keuhkosyöpään, koska tupakoit.",
    "Olet riskiryhmässä, koska tupakointi on tunnettu riskitekijä.", "Sinulla on todennäköisesti keuhkosyöpä, koska tupakoit.",
  ]) assert.equal(finnish(text), "unsafe-claim", text);
  assert.equal(reasonOf(reviewOf(review, [])), "ungrounded", "no citation");
  assert.equal(reasonOf(reviewOf(review, ["rf:invented"])), "ungrounded", "an unknown citation");
  // Ordinary phrasing that mentions risk is fine: it is the person's own risk that is never stated.
  assert.equal(reasonOf(reviewOf("Alcohol, tobacco and family history are known risk factors for several cancers, and your risk factors could be raised with a professional.", ["rf:smoking"])), "accepted");
});

function reviewModel(answer: (passages: { id: string }[]) => object) {
  return fakeModel((request: JsonRequest) => answer(JSON.parse(request.user).passages));
}
const goodReview = (found: { id: string }[]) => ({
  answerable: true, answer: "Smoking is a known risk factor for several cancers, and you could raise your smoking history with a professional.",
  citations: found.slice(0, 2).map(passage => passage.id).reverse(), followUps: [],
});

test("the review is written from public passages that show an allow-listed source, and comes with them and the safety notice", async () => {
  const queries: PassageQuery[] = [];
  const spy: ContentStore = { ...store, retrievePassages: async query => { queries.push(query); return store.retrievePassages(query); } };
  const { model, requests } = reviewModel(goodReview);
  const { deps, counts } = setup({ model, store: spy });
  const result = await assess(deps, { ...call, step: "review", history: [earlier()] });
  assert.equal(result.status, 200);
  const reply = result.body as { kind: string; generated: Record<string, unknown>; passages: { id: string; items: string[]; sources: Record<string, string>[] }[]; safety: { text: string; source: Record<string, string> } };
  assert.equal(reply.kind, "review");
  const [asked] = requests;
  assert.equal(asked.system, reviewInstruction);
  const data = JSON.parse(asked.user);
  assert.deepEqual(Object.keys(data), ["language", "facts", "history", "passages"]);
  assert.deepEqual(data.history, [{ question: "Have you had a bowel cancer screening test before?", answer: "Yes, within the last two years" }]);
  assert.ok(data.passages.length > 0 && data.passages.length <= 12);
  assert.ok(data.passages.every((item: object) => JSON.stringify(Object.keys(item)) === '["id","topic","heading","text"]'));

  assert.deepEqual(Object.keys(reply.generated), ["text", "citations", "provider", "model"]);
  assert.deepEqual(reply.generated.citations, data.passages.slice(0, 2).map((item: { id: string }) => item.id).reverse());
  assert.deepEqual(reply.passages.map(item => item.id), reply.generated.citations); // the cited passages, in the order of the citations
  for (const item of reply.passages) {
    assert.ok(item.items.length && item.items.every(line => line.trim()));
    assert.ok(item.sources.length);
    for (const source of item.sources) {
      assert.deepEqual(Object.keys(source).sort(), ["language", "retrieved", "tier", "title", "url"]);
      assert.match(source.url, /^https:\/\//);
      assert.ok(["finland", "europe", "international"].includes(source.tier));
    }
  }
  assert.deepEqual(Object.keys(reply.safety), ["text", "source"]); // the shape the chat's safety notice has
  assert.match(reply.safety.text, /112/);
  assert.deepEqual(Object.keys(reply.safety.source).sort(), ["language", "retrieved", "title", "url"]);

  // The searches are made from words for kinds of risk factor and from public topic ids, never from an answer.
  const everything = JSON.stringify([asked.system, asked.user, queries]);
  for (const secret of [...typedQuestions().map(question => sentinel(question.id)), born, "1971", "tampere", username]) assert.ok(!everything.includes(secret), secret);
  assert.ok(queries.length >= 2 && queries.every(query => /^risk factors/.test(query.question)));
  assert.deepEqual(counts.allow, [username]);
});

test("the review is searched for from the facts: words for kinds of risk factor, and the topics of the family and the concerns", () => {
  const answers = person();
  assert.deepEqual(topicsOf(answers), ["breast", "bowel", "skin"]);
  assert.deepEqual(topicsOf({}), []);
  assert.deepEqual(topicsOf({ ...answers, fh_gate: "no" }), ["bowel", "skin"], "an answer to a question that is no longer shown plays no part");
  const query = reviewQuery(factsOf(answers, now));
  assert.match(query, /^risk factors/);
  for (const words of ["smoking tobacco", "alcohol", "diet", "family history", "screening"]) assert.ok(query.includes(words), words);
  assert.ok(!/SENTINEL|tampere/i.test(query));
  assert.equal(reviewQuery({ answers: [] }), "risk factors");
  assert.equal(reviewQuery({ answers: [], bmiBand: "obese" }), "risk factors overweight weight");
  assert.equal(reviewQuery({ answers: [] }, true), "risk factors screening", "once an extra question was asked, screening is looked for");
  assert.equal(reviewQuery(factsOf(answers, now), true), query, "and not twice");
});

// ----------------------------------------------------------------------------------------------------------- failures

test("every failure is a 200 that says unavailable and why, and nothing is a 500", async () => {
  const review = { ...call, step: "review" };
  const unavailable = (reason: string) => ({ status: 200, body: { kind: "unavailable", reason } });
  const ok = fakeModel(goodQuestion).model;
  const boom = () => { throw new Error("provider exploded"); };

  assert.deepEqual(await run(call), unavailable("model-off"));
  assert.deepEqual(await run(review), unavailable("model-off"));
  assert.deepEqual(await run(call, { model: ok, loadAnswers: async () => ({}) }), unavailable("no-intake"));
  assert.deepEqual(await run(call, { model: ok, loadAnswers: async () => ({ residence: "tampere", dob: born }) }), unavailable("no-intake"));
  assert.deepEqual(await run(call, { model: ok, allow: () => false }), unavailable("rate-limited"));
  assert.deepEqual(await run(call, { model: ok, loadAnswers: async () => { throw new Error("database down"); } }), unavailable("unavailable"));
  assert.deepEqual(await run(call, { model: fakeModel(null).model }), unavailable("unavailable"));
  assert.deepEqual(await run(call, { model: fakeModel(boom).model }), unavailable("unavailable"));
  assert.deepEqual(await run(call, { model: fakeModel("not an answer").model }), unavailable("invalid-json"));
  assert.deepEqual(await run(call, { model: fakeModel({ done: false, question: "What is your name?", options: ["Anna", "Other"] }).model }), unavailable("bad-question"));

  assert.deepEqual(await run(review, { model: fakeModel(null).model }), unavailable("unavailable"));
  assert.deepEqual(await run(review, { model: fakeModel(boom).model }), unavailable("unavailable"));
  // The review has its own rules: a personal risk is refused whatever else is right, and it may be longer than a chat answer.
  assert.deepEqual(await run(review, { model: reviewModel(found => ({ ...goodReview(found), answer: "Your risk is raised, and smoking is a known risk factor for several cancers." })).model }), unavailable("unsafe-claim"));
  const longer = "Smoking is a known risk factor for several cancers, and you could raise your smoking history with a professional. ".repeat(9).trim();
  assert.ok(longer.length > 900 && longer.length < 1400);
  assert.equal(((await run(review, { model: reviewModel(found => ({ ...goodReview(found), answer: longer })).model })).body as { kind: string }).kind, "review");
  assert.deepEqual(await run(review, { model: reviewModel(() => ({ answerable: false, answer: "", citations: [], followUps: [] })).model }), unavailable("not-answerable"));
  assert.deepEqual(await run(review, { model: reviewModel(found => ({ ...goodReview(found), answer: "You are at risk of lung cancer because you smoke." })).model }), unavailable("unsafe-claim"));
  assert.deepEqual(await run(review, { model: reviewModel(found => ({ ...goodReview(found), citations: ["invented"] })).model }), unavailable("ungrounded"));
  assert.deepEqual(await run(review, { model: reviewModel(found => ({ ...goodReview(found), answer: "Read more at https://example.org/risk for details on your smoking history." })).model }), unavailable("bad-format"));
  assert.deepEqual(await run(review, { model: reviewModel(goodReview).model, store: { ...store, retrievePassages: async () => [] } }), unavailable("no-passages"));
  assert.deepEqual(await run(review, { model: reviewModel(goodReview).model, store: { ...store, loadEvidence: async () => { throw new Error("content down"); } } }), unavailable("unavailable"));
});

test("one line per request with a step and a reason code, and the budget is spent only when a model is called", async () => {
  logs.length = 0;
  const review = { ...call, step: "review" };
  const first = setup({ model: fakeModel(goodQuestion).model });
  await assess(first.deps, call);
  await assess(first.deps, { ...call, history: [earlier(), earlier(), earlier()] });
  const second = setup({ model: reviewModel(goodReview).model });
  await assess(second.deps, review);
  await assess(setup().deps, call);
  await assess(setup({ model: fakeModel(goodQuestion).model, allow: () => false }).deps, call);
  await assess(setup().deps, { ...call, consent: false });
  assert.deepEqual(logs, [
    "assess step=next reason=question", "assess step=next reason=done", "assess step=review reason=review",
    "assess step=next reason=model-off", "assess step=next reason=rate-limited",
  ]);
  assert.ok(logs.every(line => /^assess step=(next|review) reason=[a-z-]+$/.test(line)));
  assert.deepEqual(first.counts.allow, [username]); // "done" from three earlier questions spent nothing
  assert.deepEqual(second.counts.allow, [username]);
});
