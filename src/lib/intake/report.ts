import { tr, type Copy, type Language } from "../survey";
import { ageOf, clock, field, isMarker, parseDate, val } from "./access";
import { bodyRegions } from "./body";
import { modules } from "./content";
import { flow, labelOf } from "./engine";
import type { Answer, Answers, Entry, Field, Level, Marker, ModuleId, Question } from "./types";

/* ------------------------------------------------------------------- numbers */

export type Derived = {
  age?: number; heightCm?: number; weightKg?: number; bmi?: number; bmiBand?: "under" | "healthy" | "over" | "obese";
  packYears?: number; auditC?: number; phq2?: number; gad2?: number; activityDays?: number; sleepHours?: number;
};

const round = (value: number, places = 1) => Math.round(value * 10 ** places) / 10 ** places;
const scoreOf = (answers: Answers, id: string, scale: readonly string[]) => {
  const value = val(answers, id);
  const index = typeof value === "string" ? scale.indexOf(value) : -1;
  return index < 0 ? undefined : index;
};
const sum = (parts: (number | undefined)[]) => parts.some(part => part === undefined) ? undefined : (parts as number[]).reduce((a, b) => a + b, 0);

/** Standard instrument scores and simple measures. Everything here is arithmetic on what the person said. */
export function derive(answers: Answers, now = clock.now()): Derived {
  const out: Derived = { age: ageOf(answers, now) };
  const height = field(answers, "body", "height");
  const weight = field(answers, "body", "weight");
  if (typeof height === "number") out.heightCm = height;
  if (typeof weight === "number") out.weightKg = weight;
  if (typeof height === "number" && typeof weight === "number") {
    out.bmi = round(weight / (height / 100) ** 2);
    out.bmiBand = out.bmi < 18.5 ? "under" : out.bmi < 25 ? "healthy" : out.bmi < 30 ? "over" : "obese";
  }
  const perDay = field(answers, "smoke_amount", "per_day");
  const years = field(answers, "smoke_amount", "years");
  if (typeof perDay === "number" && typeof years === "number") out.packYears = round((perDay / 20) * years);

  const freq = scoreOf(answers, "alc_freq", ["never", "monthly", "m2_4", "w2_3", "w4"]);
  if (freq === 0) out.auditC = 0;
  else if (freq !== undefined) out.auditC = sum([freq, scoreOf(answers, "alc_amount", ["d1_2", "d3_4", "d5_6", "d7_9", "d10"]), scoreOf(answers, "alc_binge", ["never", "lt_monthly", "monthly", "weekly", "daily"])]);

  const scale = ["none", "some", "half", "most"];
  out.phq2 = sum([scoreOf(answers, "phq1", scale), scoreOf(answers, "phq2", scale)]);
  out.gad2 = sum([scoreOf(answers, "gad1", scale), scoreOf(answers, "gad2", scale)]);
  const activity = val(answers, "activity");
  if (typeof activity === "number") out.activityDays = activity;
  const sleep = val(answers, "sleep");
  if (typeof sleep === "number") out.sleepHours = sleep;
  return out;
}

/* -------------------------------------------------------------------- alerts */

export type Alert = { key: string; level: Level; kind: "symptom" | "mood"; items: Copy[] };
const rank: Record<Level, number> = { emergency: 0, urgent: 1, soon: 2 };

/** Safety messages raised by what the person reported. These point to care; they never diagnose. */
export function alerts(answers: Answers): Alert[] {
  const found: Record<Level, { id: string; text: Copy }[]> = { emergency: [], urgent: [], soon: [] };
  for (const question of flow(answers)) {
    const answer = answers[question.id];
    if (answer === undefined || isMarker(answer)) continue;
    if (question.type === "choice" || question.type === "multi") {
      for (const picked of Array.isArray(answer) ? answer as string[] : [answer as string]) {
        const option = question.options.find(candidate => candidate.id === picked);
        if (option?.flag) found[option.flag].push({ id: question.id + "=" + option.id, text: question.tag ? [`${question.tag[0]}: ${option.label[0]}`, `${question.tag[1]}: ${option.label[1]}`] : option.label });
      }
    }
    if (question.type === "scale" && question.id.endsWith(":severity") && typeof answer === "number" && answer >= 9 && question.tag) {
      found.urgent.push({ id: question.id + "=" + answer, text: [`${question.tag[0]}: very severe (${answer} out of 10)`, `${question.tag[1]}: erittäin voimakas (${answer}/10)`] });
    }
  }
  const out: Alert[] = (["emergency", "urgent", "soon"] as const)
    .filter(level => found[level].length)
    .map(level => ({ key: level + ":" + found[level].map(item => item.id).join("+"), level, kind: "symptom" as const, items: found[level].map(item => item.text) }));
  const scores = derive(answers);
  const low = (scores.phq2 ?? 0) >= 3;
  const anxious = (scores.gad2 ?? 0) >= 3;
  if (low || anxious) out.push({ key: "mood:" + (low ? "d" : "") + (anxious ? "a" : ""), level: "soon", kind: "mood", items: [] });
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/* ------------------------------------------------------------------- summary */

export type SummaryItem = { id: string; label: string; value: string | string[]; note?: "unsure" | "declined" | "skipped" };
export type Section = { module: ModuleId; title: string; items: SummaryItem[] };

const markerText: Record<"unsure" | "declined" | "skipped", Copy> = {
  unsure: ["Not sure", "En ole varma"], declined: ["Prefers not to say", "Ei halua vastata"], skipped: ["Skipped", "Ohitettu"],
};
export const dateText = (iso: string, language: Language) => {
  const date = parseDate(iso);
  return date ? date.toLocaleDateString(language === "fi" ? "fi-FI" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : iso;
};

function fieldText(definition: Field, value: unknown, language: Language): string {
  if (Array.isArray(value)) return value.map(item => fieldText(definition, item, language)).join(", ");
  if (definition.type === "choice" || definition.type === "multi") return tr(language, definition.options.find(option => option.id === value)?.label ?? ["", ""]) || String(value);
  if (definition.type === "number") return `${value}${definition.unit ? " " + tr(language, definition.unit) : ""}`;
  return String(value);
}
const entryText = (fields: Field[], entry: Entry, language: Language) =>
  fields.filter(definition => entry[definition.id] !== undefined && entry[definition.id] !== "")
    .map(definition => `${tr(language, definition.label)}: ${fieldText(definition, entry[definition.id], language)}`).join(" · ");

/** A short human-readable form of one answer. */
export function describe(question: Question, answer: Exclude<Answer, Marker>, language: Language): string | string[] {
  switch (question.type) {
    case "choice": return tr(language, question.options.find(option => option.id === answer)?.label ?? ["", ""]);
    case "multi": return (answer as string[]).map(id => tr(language, question.options.find(option => option.id === id)?.label ?? [id, id])).join(", ");
    case "number": return `${answer} ${tr(language, question.unit)}`;
    case "scale": return `${answer} / 10`;
    case "date": return dateText(answer as string, language);
    case "body": return (answer as string[]).map(id => tr(language, bodyRegions.find(region => region.id === id)?.label ?? [id, id])).join(", ");
    case "form": return entryText(question.fields, answer as Entry, language).split(" · ");
    case "list": return (answer as Entry[]).map(entry => entryText(question.fields, entry, language));
    default: return String(answer);
  }
}

/** The answers that count, grouped by chapter, in the language chosen. Hidden branches are left out. */
export function summarise(answers: Answers, language: Language): Section[] {
  const questions = flow(answers);
  return modules.map(module => ({
    module: module.id,
    title: tr(language, module.title),
    items: questions.filter(question => question.module === module.id && answers[question.id] !== undefined).map(question => {
      const answer = answers[question.id];
      const label = labelOf(question, answers, language);
      if (isMarker(answer)) return { id: question.id, label, value: tr(language, markerText[answer.$]), note: answer.$ };
      return { id: question.id, label, value: describe(question, answer, language) };
    }),
  })).filter(section => section.items.length > 0);
}
