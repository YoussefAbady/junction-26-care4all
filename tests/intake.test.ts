import assert from "node:assert/strict";
import { test } from "node:test";
import {
  alerts, after, before, check, clock, derive, firstOpen, flow, isComplete, minutesLeft, missing, optionsOf, prune, registry, sanitize, summarise,
  type Answer, type Answers, type Entry, type Field, type Question,
} from "../src/lib/intake";

clock.now = () => new Date("2026-11-14T12:00:00Z");

const ids = (answers: Answers) => flow(answers).map(question => question.id);
const base: Answers = { dob: "1981-03-02", sex: "female" };

function entryFor(fields: Field[]) {
  const entry: Entry = {};
  for (const field of fields) {
    if (field.type === "text") entry[field.id] = "x";
    else if (field.type === "number") entry[field.id] = field.min;
    else if (field.type === "year") entry[field.id] = 2000;
    else if (field.type === "choice") entry[field.id] = field.options[0].id;
    else entry[field.id] = [field.options[0].id];
  }
  return entry;
}
function auto(question: Question, answers: Answers): Answer {
  switch (question.type) {
    case "choice": return question.options[0].id;
    case "multi": return [optionsOf(question, answers)[0].id];
    case "number": return question.min;
    case "year": return 2000;
    case "date": return "1980-05-17";
    case "scale": return 3;
    case "text": return "text";
    case "body": return ["head"];
    case "form": return entryFor(question.fields);
    case "list": return [entryFor(question.fields)];
  }
}
function finish(answers: Answers, pick: (question: Question, answers: Answers) => Answer = auto) {
  const out = { ...answers };
  for (let guard = 0; guard < 500 && !isComplete(out); guard++) {
    const question = missing(out)[0];
    const answer = pick(question, out);
    assert.equal(check(question, answer), null, "auto answer for " + question.id);
    out[question.id] = answer;
  }
  return out;
}

test("every question and option has English and Finnish text and unique ids", () => {
  assert.ok(registry.size > 80);
  for (const question of registry.values()) {
    const title = typeof question.title === "function" ? [question.title({}), question.title({ smoke: "former" })] : [question.title];
    for (const copy of title) assert.ok(copy[0].trim() && copy[1].trim(), question.id + " title");
    if ("options" in question) {
      assert.equal(new Set(question.options.map(option => option.id)).size, question.options.length, question.id + " option ids");
      for (const option of question.options) assert.ok(option.label[0].trim() && option.label[1].trim(), question.id + "/" + option.id);
    }
    if (question.tag) assert.ok(question.tag[0] && question.tag[1]);
  }
});

test("the interview adapts to sex, age and chosen concerns", () => {
  assert.deepEqual(ids({}).slice(0, 8), ["name", "dob", "sex", "gender", "body", "weight_change", "residence", "areas"]);
  assert.ok(!ids({}).includes("reason"), "'What brings you here today?' is no longer asked");
  assert.ok(!ids({}).includes("scr_cervix") && !ids({}).includes("scr_psa") && !ids({}).includes("scr_result"));
  assert.ok(ids(base).includes("pregnancy"));
  assert.ok(!ids({ ...base, dob: "1960-01-01" }).includes("pregnancy"));
  assert.ok(ids(base).includes("scr_cervix") && ids(base).includes("scr_mammo") && !ids(base).includes("scr_psa"));
  const man = { dob: "1975-06-06", sex: "male" } satisfies Answers;
  assert.ok(ids(man).includes("scr_psa") && !ids(man).includes("scr_cervix") && !ids(man).includes("pregnancy"));
  assert.ok(!ids({ dob: "2000-01-01", sex: "male" }).includes("scr_psa"));
  assert.ok(ids({ dob: "1990-01-01", sex: "intersex" }).includes("organs"));
  assert.ok(ids({ dob: "1990-01-01", sex: { $: "declined" } }).includes("organs"));
  assert.ok(!ids(base).includes("organs"));
  assert.ok(ids({ dob: "1990-01-01", sex: "intersex", organs: ["uterus"] }).includes("scr_cervix"));
});

test("concerns open tailored follow-ups in option order, and only those", () => {
  const picked = { ...base, areas: ["skin", "bowel"] };
  const list = ids(picked);
  assert.ok(list.indexOf("sx:bowel:what") < list.indexOf("sx:skin:what"));
  assert.ok(list.includes("sx:skin:where") && list.includes("sx:bowel:freq") && !list.some(id => id.startsWith("sx:breast")));
  const nothing = ids({ ...base, areas: ["none"] });
  assert.ok(nothing.includes("areas") && !nothing.some(id => id.startsWith("sx:")) && !nothing.includes("sx_notes") && !nothing.includes("areas_other"), "'Nothing in particular' opens no follow-ups");
  assert.equal(check(registry.get("areas")!, ["none", "skin"]), "invalid", "'Nothing in particular' stands alone");
  assert.equal(check(registry.get("areas")!, ["none"]), null);
  assert.ok(ids({ ...picked, sx_unused: "" } as Answers).includes("sx_notes"));
  const weight = ids({ ...base, areas: ["general"], "sx:general:what": ["weight_loss"] });
  assert.ok(weight.includes("sx:general:loss"));
  assert.ok(!ids({ ...base, areas: ["general"], "sx:general:what": ["tired"] }).includes("sx:general:loss"));
  assert.ok(ids({ ...base, conditions: ["diabetes", "ibd"] }).includes("cond:diabetes") && ids({ ...base, conditions: ["diabetes", "ibd"] }).includes("cond:ibd"));
  assert.ok(ids({ ...base, cancer_personal: "yes" }).includes("cancer_list"));
  assert.ok(ids({ ...base, smoke: "former" }).includes("smoke_quit") && !ids({ ...base, smoke: "current" }).includes("smoke_quit"));
  assert.ok(!ids({ ...base, alc_freq: "never" }).includes("alc_amount") && ids({ ...base, alc_freq: "w2_3" }).includes("alc_amount"));
});

test("hidden answers never steer the interview and are dropped on finish", () => {
  const before = { dob: "1981-03-02", sex: "female", scr_colon: "y5", scr_cervix: "y5" } satisfies Answers;
  assert.ok(ids(before).includes("scr_colon_result"));
  const changed = { ...before, sex: "male" } as Answers;
  assert.ok(!ids(changed).includes("scr_cervix"));
  assert.ok(!("scr_cervix" in prune(changed)));
  const younger = { ...before, dob: "2002-03-02" } as Answers;
  assert.ok(!ids(younger).includes("scr_colon") && !ids(younger).includes("scr_colon_result"));
});

test("a complete interview can always be reached, with and without concerns", () => {
  const plain = finish({});
  assert.ok(isComplete(plain) && Object.keys(plain).length > 25);
  assert.equal(firstOpen(plain), null);
  const everything = finish({ dob: "1975-01-01", sex: "male", scr_gate: "yes", areas: ["bowel", "urinary", "andro"] });
  assert.ok(ids(everything).includes("scr_result"), "a screening letter to understand opens its details");
  assert.ok(isComplete(everything) && ids(everything).filter(id => id.startsWith("sx:")).length > 18);
  for (const sex of ["female", "male", "intersex"]) assert.ok(isComplete(finish({ dob: "1990-01-01", sex })));
  assert.deepEqual(Object.keys(prune(everything)).sort(), Object.keys(everything).sort());
  assert.ok(sanitize(everything) !== null);
});

test("navigation follows the live flow", () => {
  const answers = { ...base, name: "Aino" } as Answers;
  assert.equal(after(answers, "dob"), "sex");
  assert.equal(before(answers, "sex"), "dob");
  assert.equal(before(answers, "name"), null);
  assert.equal(after(finish({}), ids(finish({})).at(-1)!), "review");
  assert.equal(before(finish({}), "review"), ids(finish({})).at(-1));
  assert.equal(after({ ...base }, "nonexistent"), firstOpen(base));
  assert.ok(minutesLeft({}, "name") > minutesLeft(finish({}), "anything_else") - 1);
});

test("answers are validated by type, range and permission to say 'not sure'", () => {
  const q = (id: string) => registry.get(id)!;
  assert.equal(check(q("dob"), "2012-01-01"), "adult");
  assert.equal(check(q("dob"), "2027-01-01"), "date");
  assert.equal(check(q("dob"), "1990-02-30"), "date");
  assert.equal(check(q("dob"), "1890-02-03"), "range");
  assert.equal(check(q("dob"), "1990-02-03"), null);
  assert.equal(check(q("dob"), { $: "unsure" }), "invalid");
  assert.equal(check(q("sex"), { $: "declined" }), null);
  assert.equal(check(q("sex"), { $: "skipped" }), "invalid");
  assert.equal(check(q("name"), { $: "skipped" }), null);
  assert.equal(check(q("name"), "x".repeat(41)), "long");
  assert.equal(check(q("activity"), 8), "range");
  assert.equal(check(q("activity"), 2.5), "invalid");
  assert.equal(check(q("sleep"), 7.5), null);
  assert.equal(check(q("sleep"), 7.25), "invalid");
  assert.equal(check(q("smoke_quit"), 2031), "range");
  assert.equal(check(q("sx:pain:severity"), 11), "invalid");
  assert.equal(check(q("sx:pain:severity"), 7), null);
  assert.equal(check(q("sx:pain:where"), ["head", "nowhere"]), "invalid");
  assert.equal(check(q("sx:pain:where"), ["all", "head"]), "invalid");
  assert.equal(check(q("organs"), ["none", "uterus"]), "invalid");
  assert.equal(check(q("areas"), ["bowel", "skin", "pain", "head"]), "many");
  assert.equal(check(q("body"), { height: 172, weight: 70.5 }), null);
  assert.equal(check(q("body"), { height: 172 }), "required");
  assert.equal(check(q("body"), { height: 400, weight: 70 }), "range");
  assert.equal(check(q("body"), { height: 172, weight: 70, shoe: 42 }), "invalid");
  assert.equal(check(q("fh_list"), []), "required");
  assert.equal(check(q("fh_list"), [{ relative: "mother", type: "breast" }]), null);
  assert.equal(check(q("fh_list"), [{ relative: "mother", type: "breast", age: 200 }]), "range");
  assert.equal(check(q("cond:diabetes"), { year: 2010, status: "controlled" }), null);
  assert.equal(check(q("cond:diabetes"), { status: "mystery" }), "invalid");
  assert.equal(check(q("areas"), []), "required");
});

test("the server gate rejects unknown questions, wrong shapes and prototype tricks", () => {
  assert.deepEqual(sanitize({ name: "Aino", sex: "male" }), { name: "Aino", sex: "male" });
  assert.equal(sanitize({ nope: "x" }), null);
  assert.equal(sanitize({ sex: "robot" }), null);
  assert.equal(sanitize(JSON.parse('{"__proto__": "x"}')), null);
  assert.equal(sanitize(JSON.parse('{"constructor": "x"}')), null);
  assert.equal(sanitize([]), null);
  assert.equal(sanitize("sex"), null);
  assert.equal(sanitize({ "sx:bowel:what": ["blood_red"] }) !== null, true);
});

test("derived measures are plain arithmetic on the answers", () => {
  const measures = derive({
    ...base, body: { height: 170, weight: 72.3 }, smoke_amount: { per_day: 10, years: 20 },
    alc_freq: "w2_3", alc_amount: "d3_4", alc_binge: "monthly",
    phq1: "some", phq2: "half", gad1: "none", gad2: "some", activity: 4, sleep: 6.5,
  });
  assert.equal(measures.age, 45);
  assert.equal(measures.bmi, 25);
  assert.equal(measures.bmiBand, "over");
  assert.equal(measures.packYears, 10);
  assert.equal(measures.auditC, 3 + 1 + 2);
  assert.equal(measures.phq2, 3);
  assert.equal(measures.gad2, 1);
  assert.equal(derive({ ...base, alc_freq: "never" }).auditC, 0);
  assert.equal(derive({ ...base, alc_freq: "w4", alc_amount: { $: "unsure" } }).auditC, undefined);
  assert.equal(derive({ ...base, phq1: "none", phq2: { $: "declined" } }).phq2, undefined);
});

test("safety alerts are raised by flagged answers, ranked, stable and never about diagnosis", () => {
  assert.deepEqual(alerts(base), []);
  const emergency = alerts({ ...base, areas: ["breath"], "sx:breath:what": ["chest_now", "cough3"] });
  assert.deepEqual(emergency.map(alert => alert.level), ["emergency", "soon"]);
  assert.equal(emergency[0].items.length, 1);
  assert.ok(emergency[0].items[0][0].includes("Chest pain"));
  assert.deepEqual(alerts({ ...base, areas: ["breath"], "sx:breath:what": ["chest_now", "cough3"] }).map(alert => alert.key), emergency.map(alert => alert.key));
  assert.equal(alerts({ ...base, weight_change: "loss_big" })[0].level, "soon");
  const severe = alerts({ ...base, areas: ["pain"], "sx:pain:severity": 9 });
  assert.equal(severe[0].level, "urgent");
  assert.equal(alerts({ ...base, areas: ["pain"], "sx:pain:severity": 8 }).length, 0);
  assert.equal(alerts({ ...base, phq1: "half", phq2: "half" })[0].kind, "mood");
  assert.equal(alerts({ ...base, phq1: "some", phq2: "some" }).length, 0);
  assert.equal(alerts({ ...base, areas: ["none"], "sx:breath:what": ["chest_now"] }).length, 0, "hidden answers raise nothing");
  assert.equal(alerts({ ...base, areas: ["pain"], "sx:breath:what": ["chest_now"] }).length, 0, "an area that was not chosen raises nothing");
  assert.equal(alerts({ ...base, areas: ["head"], "sx:head:sudden": "yes" })[0].level, "urgent");
});

test("the summary uses the chosen language, skips hidden answers and shows 'not sure' honestly", () => {
  const answers: Answers = {
    ...base, name: "Aino", sex: "female", body: { height: 170, weight: 70 }, smoke: "never", alc_freq: { $: "unsure" },
    areas: ["skin"], "sx:skin:what": ["changed"], "sx:skin:where": ["arm_l", "back_upper"], scr_psa: "y2",
    fh_gate: "yes", fh_list: [{ relative: "mother", type: "breast", age: 52 }],
  };
  const english = summarise(answers, "en");
  const flat = english.flatMap(section => section.items);
  assert.equal(flat.find(item => item.id === "dob")?.value, "2 March 1981");
  assert.equal(flat.find(item => item.id === "alc_freq")?.note, "unsure");
  assert.deepEqual(flat.find(item => item.id === "body")?.value, ["Height: 170 cm", "Weight: 70 kg"]);
  assert.equal(flat.find(item => item.id === "sx:skin:where")?.value, "Left arm or hand, Upper back");
  assert.deepEqual(flat.find(item => item.id === "fh_list")?.value, ["Who: Mother · Type of cancer: Breast · Age when diagnosed: 52 years"]);
  assert.ok(!flat.some(item => item.id === "scr_psa"));
  const finnish = summarise(answers, "fi").flatMap(section => section.items);
  assert.equal(finnish.find(item => item.id === "dob")?.value, "2. maaliskuuta 1981");
  assert.equal(finnish.find(item => item.id === "alc_freq")?.value, "En ole varma");
  assert.equal(finnish.find(item => item.id === "sx:skin:where")?.value, "Vasen käsivarsi tai käsi, Yläselkä");
});

test("{name} personalises text and disappears cleanly without one", async () => {
  const { fill } = await import("../src/lib/intake");
  assert.equal(fill("Thanks, {name}. Next.", { name: "Aino" }), "Thanks, Aino. Next.");
  assert.equal(fill("Thanks, {name}. Next.", {}), "Thanks. Next.");
  assert.equal(fill("Thanks, {name}. Next.", { name: { $: "skipped" } }), "Thanks. Next.");
});

test("earlier surveys import compatible answers without inferring missing clinical details", async () => {
  const { readProgress } = await import("../src/lib/intake/progress");
  const progress = readProgress({
    language: "fi", complete: true,
    answers: { age: 3, sex: 1, region: 0, family: 1, cancer: 1, tobacco: 0, alcohol: 2, diet: 1, screening: 0 },
  }, 4);
  assert.equal(progress.language, "fi");
  assert.equal(progress.revision, 4);
  assert.equal(progress.complete, false);
  assert.deepEqual(progress.answers, {
    sex: "male", residence: "uusimaa", cancer_personal: "no", smoke: "never", diet_veg: "weekly",
  });
});

test("where do you live offers the larger cities, 'Another place in Finland' and 'Outside Finland', and keeps the earlier region answer valid", () => {
  const residence = registry.get("residence")!;
  assert.equal(residence.type, "choice");
  const question = residence as Extract<Question, { type: "choice" }>;
  const offered = optionsOf(question, {}).map(option => option.id);
  assert.deepEqual(offered.slice(0, 6), ["helsinki", "espoo", "tampere", "vantaa", "oulu", "turku"]);
  assert.ok(offered.length >= 30, "a real list of cities, not regions");
  assert.deepEqual(offered.slice(-2), ["finland", "abroad"], "the cities come first, then the catch-all, then abroad");
  assert.ok(!offered.includes("uusimaa"), "the old region is offered to nobody new");
  assert.ok(optionsOf(question, { residence: "uusimaa" }).some(option => option.id === "uusimaa"), "a person who gave it still sees it");
  assert.equal(check(question, "tampere"), null);
  assert.equal(check(question, "uusimaa"), null, "an answer saved before the change is still valid");
  assert.equal(check(question, "atlantis"), "invalid");
  for (const option of question.options) assert.ok(option.label[0].trim() && option.label[1].trim(), option.id);
});

test("a question that was retired is dropped from saved answers instead of failing them", () => {
  assert.deepEqual(sanitize({ name: "Aino", reason: ["checkup"] }), { name: "Aino" });
  assert.equal(registry.has("reason"), false);
  assert.equal(sanitize({ name: "Aino", not_a_question: "x" }), null, "anything else unknown is still refused");
});

test("a finished interview that has gained a question is reopened with its answers, not thrown away", async () => {
  const { readProgress } = await import("../src/lib/intake/progress");
  const answers = finish({ dob: "1975-01-01", sex: "male", cancer_personal: "no" });
  const saved = { v: 2, answers, cursor: "review", complete: true, confirmed: true, acks: [], language: "en", revision: 3 };
  assert.equal(readProgress(saved, 3).complete, true, "a finished interview that is still finished stays finished");
  // The same interview as it was saved before the questions about concerns and screening letters were asked this way.
  const older = Object.fromEntries(Object.entries(answers).filter(([id]) => id !== "areas" && id !== "scr_gate"));
  const reopened = readProgress({ ...saved, answers: { ...older, reason: ["checkup"] } }, 3);
  assert.equal(reopened.complete, false);
  assert.equal(reopened.confirmed, false);
  assert.equal(reopened.upgraded, undefined, "it is not a fresh start");
  assert.equal(reopened.answers.dob, "1975-01-01");
  assert.ok(!("reason" in reopened.answers), "the retired answer is gone");
  assert.equal(firstOpen(reopened.answers), "areas", "only what is new is asked");
  assert.equal(readProgress({ ...saved, answers: { sex: "robot" } }, 3).upgraded, true, "an answer that is simply wrong still starts over");
});

test("chat next action keeps incomplete intake first and switches after confirmation", async () => {
  const { freshProgress } = await import("../src/lib/intake/progress");
  const { intakeInteraction, nextAction, symptomInteraction } = await import("../src/lib/chat-journey");
  const { createEvidence } = await import("../src/lib/chat-evidence");
  const { store } = await import("./content-store");
  const evidence = createEvidence(await store.loadEvidence());
  const progress = { ...freshProgress("en"), answers: finish({ ...base, cancer_personal: "no", scr_pending: "no" }) };
  const facts = { symptom: true, outsideFinland: false };
  assert.equal(intakeInteraction(progress, "en").type, "review_intake");
  assert.equal(nextAction(progress, facts, "en", evidence).id, "complete_intake");
  const confirmed = { ...progress, complete: true, confirmed: true };
  assert.equal(nextAction(confirmed, facts, "en", evidence).id, "contact_professional");
  assert.equal(nextAction(confirmed, { ...facts, symptom: false, checkTopic: "skin" }, "fi", evidence).id, "review_body_awareness");
  assert.equal(nextAction(confirmed, { ...facts, symptom: false }, "en", evidence).id, "review_screening");
  const resolved = symptomInteraction("draft", { label: "Fictional symptom", onset: "today", course: "gone" }, "en");
  assert.equal(resolved.type === "symptom_question" && resolved.step, "notes");
});
