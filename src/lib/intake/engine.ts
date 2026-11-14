import { tr, type Copy, type Language } from "../survey";
import { ageOn, clock, isMarker, parseDate, val } from "./access";
import { bodyIds } from "./body";
import { modules, plan } from "./content";
import type { Answer, Answers, Field, Generator, ModuleId, Opt, Question } from "./types";

type Dynamic<T> = T | ((answers: Answers) => T);

/* ------------------------------------------------------------------ registry */

const expansions = new Map<string, Question[]>();
function expand(generator: Generator, option: Opt) {
  const key = generator.gen + ":" + option.id;
  let questions = expansions.get(key);
  if (!questions) expansions.set(key, questions = generator.make(option.id, option.label));
  return questions;
}

/** Every question the intake could ever ask, including all generated follow-ups, by id. */
export const registry: ReadonlyMap<string, Question> = (() => {
  const map = new Map<string, Question>();
  const add = (question: Question) => {
    if (map.has(question.id)) throw new Error("Duplicate question id " + question.id);
    map.set(question.id, question);
  };
  for (const entry of plan) {
    if (!("gen" in entry)) { add(entry); continue; }
    const source = map.get(entry.source);
    if (!source || source.type !== "multi") throw new Error("Generator source must be an earlier multi-choice question: " + entry.source);
    for (const option of source.options) if (!entry.skip?.includes(option.id)) expand(entry, option).forEach(add);
  }
  return map;
})();

/* ---------------------------------------------------------------------- flow */

/**
 * The questions this person will be asked, in order, given what they have answered so far.
 * Conditions only ever see answers to questions that are themselves shown, so changing an
 * earlier answer can never leave a hidden answer steering the rest of the interview.
 */
export function flow(answers: Answers): Question[] {
  const live: Answers = {};
  const out: Question[] = [];
  const push = (question: Question) => {
    out.push(question);
    const answer = answers[question.id];
    if (answer !== undefined) live[question.id] = answer;
  };
  for (const entry of plan) {
    if ("gen" in entry) {
      const picked = live[entry.source];
      const source = registry.get(entry.source);
      if (!Array.isArray(picked) || !source || source.type !== "multi") continue;
      for (const option of source.options) {
        if (!(picked as string[]).includes(option.id) || entry.skip?.includes(option.id)) continue;
        for (const question of expand(entry, option)) if (!question.show || question.show(live)) push(question);
      }
    } else if (!entry.show || entry.show(live)) push(entry);
  }
  return out;
}

export const missing = (answers: Answers) => flow(answers).filter(question => answers[question.id] === undefined);
export const isComplete = (answers: Answers) => missing(answers).length === 0;
export const firstOpen = (answers: Answers) => missing(answers)[0]?.id ?? null;

/** Keeps only answers to questions that are still part of the interview. */
export function prune(answers: Answers): Answers {
  const out: Answers = {};
  for (const question of flow(answers)) if (answers[question.id] !== undefined) out[question.id] = answers[question.id];
  return out;
}

/** The id to show after `id`, given the answers so far. "review" when nothing is left. */
export function after(answers: Answers, id: string): string {
  const questions = flow(answers);
  const index = questions.findIndex(question => question.id === id);
  if (index < 0) return firstOpen(answers) ?? "review";
  return questions[index + 1]?.id ?? "review";
}
export function before(answers: Answers, id: string): string | null {
  const questions = flow(answers);
  const index = id === "review" ? questions.length : questions.findIndex(question => question.id === id);
  return index > 0 ? questions[index - 1].id : null;
}

/** Roughly how many minutes remain, from `id` onwards. */
const seconds: Record<Question["type"], number> = { choice: 8, multi: 14, number: 10, year: 8, date: 15, scale: 8, text: 25, body: 20, form: 25, list: 45 };
export function minutesLeft(answers: Answers, id: string) {
  const questions = flow(answers);
  const start = Math.max(0, questions.findIndex(question => question.id === id));
  const total = questions.slice(start).reduce((sum, question) => sum + seconds[question.type], 0);
  return Math.max(1, Math.round(total / 60));
}

export function chapters(answers: Answers) {
  const questions = flow(answers);
  return modules.map(module => {
    const own = questions.filter(question => question.module === module.id);
    return { ...module, total: own.length, answered: own.filter(question => answers[question.id] !== undefined).length };
  });
}

/* --------------------------------------------------------------------- text */

export const copyOf = <T extends Copy>(value: Dynamic<T>, answers: Answers): T => typeof value === "function" ? value(answers) : value;

export function nameOf(answers: Answers) {
  const name = val(answers, "name");
  return typeof name === "string" ? name.trim() : "";
}
/** Fills in {name}. Without a name the surrounding comma goes too ("Thanks, {name}." becomes "Thanks."). */
export function fill(text: string, answers: Answers) {
  const name = nameOf(answers);
  return name ? text.replaceAll("{name}", name) : text.replace(/,?\s*\{name\}/g, "");
}
export const say = (value: Dynamic<Copy>, answers: Answers, language: Language) => fill(tr(language, copyOf(value, answers)), answers);
export const titleOf = (question: Question, answers: Answers, language: Language) => say(question.title, answers, language);
export const labelOf = (question: Question, answers: Answers, language: Language) => say(question.label ?? question.title, answers, language);
export const helpOf = (question: Question, answers: Answers, language: Language) => question.help ? say(question.help, answers, language) : undefined;
export const optionsOf = (question: Extract<Question, { options: Opt[] }>, answers: Answers) => question.options.filter(option => !option.when || option.when(answers));

/* ------------------------------------------------------------ what can be said */

export const canUnsure = (question: Question) => question.unsure ?? !(question.type === "text" || question.type === "form" || question.type === "list");
export const canDecline = (question: Question) => question.decline === true;
export const canSkip = (question: Question) => question.optional === true;

/* ---------------------------------------------------------------- validation */

export type Problem = "required" | "invalid" | "range" | "adult" | "date" | "long" | "many";

const decimalsOk = (value: number, decimals = 0) => Number(value.toFixed(decimals)) === value;
const numberOk = (value: unknown, min: number, max: number, decimals = 0): Problem | null =>
  typeof value !== "number" || !Number.isFinite(value) ? "invalid" : value < min || value > max ? "range" : !decimalsOk(value, decimals) ? "invalid" : null;
const yearOk = (value: unknown, now: Date): Problem | null =>
  typeof value !== "number" || !Number.isInteger(value) ? "invalid" : value < 1900 || value > now.getUTCFullYear() ? "range" : null;
const stringList = (value: unknown, allowed: readonly string[], exclusive: readonly string[], max = 40): Problem | null => {
  if (!Array.isArray(value) || value.length === 0) return "required";
  if (value.length > max) return "many";
  if (new Set(value).size !== value.length || value.some(item => typeof item !== "string" || !allowed.includes(item))) return "invalid";
  return value.length > 1 && value.some(item => exclusive.includes(item)) ? "invalid" : null;
};

function fieldProblem(field: Field, value: unknown, now: Date): Problem | null {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return field.optional ? null : "required";
  switch (field.type) {
    case "text": return typeof value !== "string" ? "invalid" : value.length > (field.max ?? 200) ? "long" : value.trim() ? null : "required";
    case "number": return numberOk(value, field.min, field.max, field.decimals);
    case "year": return yearOk(value, now);
    case "choice": return typeof value === "string" && field.options.some(option => option.id === value) ? null : "invalid";
    case "multi": return stringList(value, field.options.map(option => option.id), field.options.filter(option => option.exclusive).map(option => option.id));
  }
}
function entryProblem(fields: Field[], entry: unknown, now: Date): Problem | null {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return "invalid";
  const record = entry as Record<string, unknown>;
  if (Object.keys(record).some(key => !fields.some(field => field.id === key))) return "invalid";
  for (const field of fields) {
    const problem = fieldProblem(field, record[field.id], now);
    if (problem) return problem;
  }
  return null;
}

/** Checks one answer against its question. `null` means the answer is acceptable. */
export function check(question: Question, answer: unknown, now = clock.now()): Problem | null {
  if (isMarker(answer)) {
    const keys = Object.keys(answer);
    const kind = (answer as { $: unknown }).$;
    const allowed = (kind === "unsure" && canUnsure(question)) || (kind === "declined" && canDecline(question)) || (kind === "skipped" && canSkip(question));
    return keys.length === 1 && allowed ? null : "invalid";
  }
  switch (question.type) {
    case "choice": return typeof answer === "string" && question.options.some(option => option.id === answer) ? null : "invalid";
    case "multi": return stringList(answer, question.options.map(option => option.id), question.options.filter(option => option.exclusive).map(option => option.id), question.max ?? 40);
    case "number": return numberOk(answer, question.min, question.max, question.decimals);
    case "year": return yearOk(answer, now);
    case "scale": return typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer <= 10 ? null : "invalid";
    case "text": {
      if (typeof answer !== "string") return "invalid";
      if (answer.length > (question.max ?? 500)) return "long";
      return answer.trim() || question.optional ? null : "required";
    }
    case "date": {
      const birth = parseDate(answer);
      if (!birth) return "date";
      const age = ageOn(birth, now);
      return age < 0 ? "date" : age < 18 ? "adult" : age > 120 ? "range" : null;
    }
    case "body": return stringList(answer, bodyIds, ["all"], 19);
    case "form": return entryProblem(question.fields, answer, now);
    case "list": {
      if (!Array.isArray(answer) || answer.length === 0) return "required";
      if (answer.length > question.max) return "many";
      for (const entry of answer) { const problem = entryProblem(question.fields, entry, now); if (problem) return problem; }
      return null;
    }
  }
}

/**
 * Questions that used to be asked and no longer are. An answer saved to one is dropped, so that retiring a question never
 * makes a person's whole saved interview unreadable. "reason" was "What brings you here today?".
 */
const retired: ReadonlySet<string> = new Set(["reason"]);

/** Server-side gate: every key must be a known question and every value valid for it. */
export function sanitize(raw: unknown, now = clock.now()): Answers | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const entries = Object.entries(raw);
  if (entries.length > 400) return null;
  const out: Answers = {};
  for (const [id, answer] of entries) {
    if (retired.has(id)) continue;
    const question = registry.get(id);
    if (!question || check(question, answer, now)) return null;
    out[id] = answer as Answer;
  }
  return out;
}

export const moduleOf = (id: string): ModuleId | undefined => registry.get(id)?.module;
export const isQuestionId = (id: string) => registry.has(id);
