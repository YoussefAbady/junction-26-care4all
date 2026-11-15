// One-off, re-runnable extraction: reads the risk script of design v2 and writes prisma/seed-data/risk-content.ts.
//
//   node prisma/tools/extract-risk-content.mjs            (from the repository root; writes the file)
//   node prisma/tools/extract-risk-content.mjs --check    (extracts and checks, writes nothing)
//
// The data literals (SRC, LIB, RULES, ORDER, TIERS, SHORT) are evaluated inside node:vm in a context with no globals but
// stubs for A, D, S, esc and ic. Nothing from the design is retyped. What the design has only as prose inside functions (the
// rubric, the "In Finland" statistic and the screen copy) is written below from docs/design-v2.md Appendix A.4 and A.5, and
// the Finnish drafts come from risk-finnish.mjs. The tool stops when a source id used by RULES does not resolve, when a
// Finnish draft is missing, or when a count differs from the contract.
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { copyFi, factFi, factorFi, inFinlandFi, notCoveredFi, rubricFi, tiersFi, typeNameFi } from "./risk-finnish.mjs";

const designFile = "frontend/design/care4all.artifact.html";
const contentFile = "prisma/seed-data/design-content.json";
const outFile = "prisma/seed-data/risk-content.ts";

const html = readFileSync(designFile, "utf8");
const design = JSON.parse(readFileSync(contentFile, "utf8"));
const start = html.indexOf("/* ---------- sources added for this feature");
const end = html.indexOf("function join(list)");
if (start < 0 || end < start) throw new Error("The risk script was not found in " + designFile);

// ---- evaluate the data literals in a sandbox ---------------------------------------------------------------------
const sandbox = vm.createContext({ A: {}, D: { SOURCES: {} }, S: {}, esc: value => value, ic: value => value });
vm.runInContext(start === -1 ? "" : html.slice(start, end) + "\n;var __out = { SRC: SRC, LIB: LIB, RULES: RULES, ORDER: ORDER, TIERS: TIERS, SHORT: SHORT };", sandbox, { timeout: 5000 });
const { SRC, LIB, RULES, ORDER, TIERS, SHORT } = JSON.parse(JSON.stringify(sandbox.__out, (key, value) => (typeof value === "function" ? undefined : value)));
// LIB holds functions (the sentence for each state), which JSON drops, so the sentences are read from the live objects.
const live = sandbox.__out;

const fail = message => { throw new Error("extract-risk-content: " + message); };
const missing = what => fail("no Finnish draft for " + what);
const same = (actual, expected, what) => { if (actual !== expected) fail(what + ": expected " + expected + ", got " + actual); };

// ---- sources -----------------------------------------------------------------------------------------------------
const known = design.content.SOURCES;
for (const id of Object.keys(SRC)) if (known[id]) fail("source " + id + " is already in the design's own list");
const sources = Object.fromEntries(Object.entries(SRC).map(([id, s]) => [id, { name: s.name, org: s.org, date: s.date, url: s.url, use: s.use }]));
const allSources = new Set([...Object.keys(known), ...Object.keys(sources)]);

// The host table of src/lib/chat-evidence.ts plus www.freefromcancer.fi (docs/design-v2.md A.8), to order each guideline list.
const hostTier = {
  "cancerregistry.fi": 0, "syoparekisteri.fi": 0, "www.terveyskirjasto.fi": 0, "allaboutcancer.fi": 0, "kaikkisyovasta.fi": 0, "www.suomi.fi": 0,
  "www.kaypahoito.fi": 0, "www.syopajarjestot.fi": 0, "www.stuk.fi": 0, "thl.fi": 0, "www.freefromcancer.fi": 0,
  "cancer-code-europe.iarc.who.int": 1, "www.esmo.org": 1, "digital-strategy.ec.europa.eu": 1,
  "www.cancer.gov": 2, "www.cancerresearchuk.org": 2, "www.nhs.uk": 2, "www.who.int": 2,
};
const urlOf = id => (known[id] ?? sources[id]).url;
const rankOf = id => hostTier[new URL(urlOf(id)).hostname] ?? 3;

// ---- types -------------------------------------------------------------------------------------------------------
const nameException = { ovary: "Ovarian cancer", pancreas: "Pancreatic cancer" };
const types = ORDER.map(id => {
  const topic = design.content.TOPICS[id];
  if (!topic) fail("no topic " + id);
  const notCovered = RULES[id].not;
  const fi = notCoveredFi[id] ?? missing("notCovered of " + id);
  same(fi.length, notCovered.length, "notCovered of " + id);
  return {
    id, sex: RULES[id].sex ?? "any",
    name: { en: nameException[id] ?? topic.name + " cancer", fi: typeNameFi[id] ?? missing("name of " + id) },
    notCovered: { en: notCovered, fi },
  };
});

// ---- factors -----------------------------------------------------------------------------------------------------
const states = {
  smoke: ["now", "past", "never"], alcohol: ["never", "rare", "weekly", "daily"], bmi: ["ok", "over", "ob", "ob2"], active: ["high", "some", "low"],
  sun: ["burns", "tans", "rare"], moles: ["many", "some", "few"], scrC: ["ok", "overdue"], age: ["any"],
  famBreast: ["early", "yes", "no"], famBowel: ["early", "yes", "no"], famProstate: ["early", "yes", "no"], famSkin: ["early", "yes", "no"],
};
const yesNo = ["meat", "sunbed", "outdoor", "work", "passive", "diab", "bp", "ibd", "liverd", "copd", "stomachd", "prior", "hbv", "hpv", "testisU", "testisR"];
for (const key of yesNo) states[key] = ["yes", "no"];
// The design computes the sentence of these two from a number, so they are written here (docs/design-v2.md A.3).
const writtenEn = { bmi: { ok: "Your BMI is under 25", over: "Your BMI is 25 to 29.9 (overweight)", ob: "Your BMI is 30 to 39.9 (obesity)", ob2: "Your BMI is 40 or more (severe obesity)" } };
const tipSources = { alcohol: ["ecac5-alcohol"], meat: ["ecac5-diet"] };

const factors = Object.keys(live.LIB).map(key => {
  const entry = live.LIB[key];
  const draft = factorFi[key] ?? missing("factor " + key);
  const ids = states[key] ?? fail("no states for factor " + key);
  const you = state => writtenEn[key]?.[state] ?? entry.you({ age: "{age}" }, state);
  const tip = entry.tip ?? null;
  return {
    key,
    name: { en: entry.name, fi: draft.name },
    short: { en: SHORT[key] ?? entry.name.toLowerCase(), fi: draft.short },
    tip: tip === null ? null : { en: tip, fi: draft.tip ?? missing("tip of " + key) },
    tipSourceIds: tipSources[key] ?? [],
    states: ids.map(id => ({ id, you: { en: you(id), fi: draft.you[id] ?? missing("sentence " + key + " " + id) } })),
  };
});
same(factors.length, 28, "factor count");

// ---- facts -------------------------------------------------------------------------------------------------------
const effectOf = (factor, w) => (factor === "age" ? "info" : w < 0 ? "protective" : w === 0 ? "info" : w < 2 ? "small" : w < 3 ? "moderate" : w < 4 ? "large" : "very-large");
const facts = [];
for (const id of ORDER) {
  for (const row of RULES[id].rows) {
    for (const state of Object.keys(row.w)) {
      const w = row.w[state];
      const text = row.f === "age" || w !== 0 ? row.t[state] ?? row.t.any : row.t[state];
      if (!text) continue;
      const factor = factors.find(item => item.key === row.f) ?? fail("rule names factor " + row.f);
      if (!factor.states.some(item => item.id === state)) fail(id + " " + row.f + " names state " + state + ", which the factor does not have");
      const key = id + " " + row.f + " " + state;
      facts.push({ riskType: id, factor: row.f, state, effect: effectOf(row.f, w), text: { en: text, fi: factFi[key] ?? missing("fact " + key) }, sourceIds: row.s });
    }
  }
}
same(facts.length, 116, "fact count");
const byEffect = {};
for (const fact of facts) byEffect[fact.effect] = (byEffect[fact.effect] ?? 0) + 1;
for (const [effect, count] of Object.entries({ "very-large": 6, large: 9, moderate: 20, small: 71, protective: 2, info: 8 })) same(byEffect[effect], count, "facts with effect " + effect);
const factKeys = new Set(Object.keys(factFi));
for (const fact of facts) factKeys.delete(fact.riskType + " " + fact.factor + " " + fact.state);
if (factKeys.size) fail("Finnish drafts for statements that do not exist: " + [...factKeys].join(", "));

// ---- guidelines, sources, tips -----------------------------------------------------------------------------------
const guidelines = ORDER.map(riskType => {
  const cited = [...new Set(facts.filter(fact => fact.riskType === riskType).flatMap(fact => fact.sourceIds))];
  return { riskType, sourceIds: cited.map((id, index) => ({ id, index })).sort((a, b) => rankOf(a.id) - rankOf(b.id) || a.index - b.index).map(item => item.id) };
});

const rubric = {
  tiers: {
    average: { en: "Nothing named by guidance raises it beyond what is typical for the age and sex, or only small factors that together stay typical.", fi: rubricFi.tiers.average },
    raised: { en: "At least one moderate factor (about 1.5 to 2.5 times the risk) or several small ones together.", fi: rubricFi.tiers.raised },
    high: { en: "At least one very large factor (about 4 times the risk or more, for example smoking for lung cancer or a damaged liver for liver cancer) or several large ones that add up. Small factors on their own never make High.", fi: rubricFi.tiers.high },
    unknown: { en: "Too little is known to say.", fi: rubricFi.tiers.unknown },
  },
  overall: { en: "The overall level is the model's own summary across the types, because no guideline combines cancers into one score. It must be at least as high as the highest type tier, and it names the types and factors that drive it.", fi: rubricFi.overall },
  comparison: { en: "A tier compares the person with other people of the same age and sex in Finland. It is information, not a diagnosis and not a prediction.", fi: rubricFi.comparison },
  sourceIds: ["ecac5", "kh-alcohol", "tk-lung", "syopa-risk"],
};
const inFinland = {
  text: { en: "About 34 in 100 cancers in men and 24 in 100 in women are linked to smoking, alcohol and overweight (Cancer Registry study, reported by the Cancer Society). These are the factors you can change.", fi: inFinlandFi },
  sourceIds: ["syopa-risk", "ecac5"],
};

// The English of docs/design-v2.md A.5, as pinned there.
const copyEn = {
  lede: "Based on what you told me and Finnish and European guidance. Tap any tag to see the reasons.",
  note: "Worked out from your answers by an AI model, using Finnish and European guidance. It is not a diagnosis and not a prediction. It cannot see your genes or your test results.",
  compare: "You are compared with other people of your age and sex, so age alone does not change your tag.",
  gate_title: "Finish the questions first",
  gate_body: "Your risk overview is worked out from your answers, so I need them first. You can answer \"Not sure\" or \"Prefer not to say\" to any question and still see your overview.",
  legend: "The small badge on each icon is your risk tag:",
  skipped: "I left out cancers that depend on sex or on which organs you have (breast, cervical, ovary and womb, prostate and testicular), because your basic answers do not say. You can change them at any time.",
  how_title: "How this is worked out",
  how_sub: "Finnish and European guidance",
  how_1: "For each cancer type I look at the factors that Finnish guidance names first (Käypä hoito, Duodecim, the Cancer Society of Finland, the Finnish Cancer Registry, STUK), then European guidance (the European Code Against Cancer), then UK and WHO material where there is no Finnish or European figure.",
  how_2: "An AI model (Google Gemini) reads your answers and the guidance and writes each tag and its reasons, and a second pass checks them against the guidance. It is sent your age, sex, weight group and answers, and whether you live in Finland. It is never sent your name, exact date of birth, place of residence or any ID.",
  how_3: "A tag compares you with other people of your age and sex in Finland. Raised means at least one moderate factor (about 1.5 to 2.5 times the risk) or several small ones together. High is for a very strong factor, about four times the risk or more, such as smoking for lung cancer or a damaged liver for liver cancer, or for several strong factors that add up. Small factors on their own never make a tag High.",
  how_4: "Factors I cannot ask about, such as genes, are listed under each tag, and your doctor can look at them.",
  how_5: "No guideline combines cancer types into one score. The overall tag is care4all's own summary of the types: it is never lower than the highest tag of a type, and it names what drives it.",
  how_6: "A tag is not a diagnosis and not a prediction. Most people with a Raised or High tag never get these cancers, and some people with an Average tag do. Screening and knowing your body matter for everyone.",
};
const strings = [
  ...Object.entries(TIERS).map(([tier, en]) => ({ scope: "risk", key: "tier." + tier, text: { en, fi: tiersFi[tier] ?? missing("tier " + tier) } })),
  ...Object.entries(copyEn).map(([key, en]) => ({ scope: "risk", key, text: { en, fi: copyFi[key] ?? missing("copy " + key) } })),
];
same(JSON.stringify(Object.keys(TIERS)), JSON.stringify(["high", "raised", "average", "unknown"]), "TIERS order");
same(Object.keys(copyFi).length, Object.keys(copyEn).length, "copy keys");

// ---- checks against the contract ---------------------------------------------------------------------------------
const used = new Set([
  ...facts.flatMap(fact => fact.sourceIds), ...guidelines.flatMap(item => item.sourceIds), ...factors.flatMap(factor => factor.tipSourceIds),
  ...rubric.sourceIds, ...inFinland.sourceIds,
]);
const unresolved = [...used].filter(id => !allSources.has(id));
if (unresolved.length) fail("source ids that resolve to no source: " + unresolved.join(", "));
same(used.size, 57, "distinct source ids named by the risk tables");
same(Object.keys(sources).length, 18, "new sources");
same(types.length, 16, "type count");
for (const [type, count] of Object.entries({ lung: 7, bowel: 13, breast: 9, prostate: 8, skin: 7, cervical: 4, womb: 8, ovary: 8, bladder: 7, kidney: 8, liver: 12, pancreas: 9, stomach: 4, mouththroat: 5, thyroid: 4, testicular: 3 })) {
  same(facts.filter(fact => fact.riskType === type).length, count, "facts of " + type);
}

// ---- write -------------------------------------------------------------------------------------------------------
const header = `import type { RiskSeed } from "./v2-types";

// GENERATED by prisma/tools/extract-risk-content.mjs from ${designFile}, the risk script of design v2 (export date
// ${design.source.retrieved}, version ${design.source.version}). Do not edit by hand: change the design or the tool and run it again.
// The statements, their sources and the weights they were classed from come from the design and are not independently verified:
// they were not read again from the pages. Every source has retrieved = the design's export date.
// The Finnish is drafted for this product (prisma/tools/risk-finnish.mjs) and is not reviewed: finnish is "unreviewed".

export const riskSeed: RiskSeed = `;
const body = JSON.stringify({ sources, types, factors, facts, guidelines, rubric, inFinland, strings, finnish: "unreviewed" }, null, 2);
const text = header + body + ";\n";
const summary = types.length + " types, " + factors.length + " factors, " + facts.length + " facts, " + Object.keys(sources).length + " new sources, " +
  guidelines.length + " guidelines, " + used.size + " cited source ids";
if (process.argv.includes("--check")) console.log("ok (not written): " + summary);
else { writeFileSync(outFile, text); console.log("wrote " + outFile + ": " + summary); }
