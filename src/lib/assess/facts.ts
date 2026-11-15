import { clock, isMarker, val } from "../intake/access";
import { copyOf, flow, fullPlan } from "../intake/engine";
import { derive, describe, type Derived } from "../intake/report";
import type { Answers, Field, Plan, Question } from "../intake/types";
import { tr } from "../survey";

// What a model may be told about a person when it asks a follow-up question or writes a risk-factor review. The person
// agreed to this: everything may be sent except what identifies them. So the allow-list is by kind of answer and denies by
// default. Only answers picked from a list, numbers, years, scales and body regions are sent. Nothing the person typed is,
// whatever the question, because a free-text answer can hold a name, a place or anything else. The name, the username and
// every id, the date of birth, the place of residence and the county are never read here at all.

/** The kinds of question whose answers are picked from a list or are numbers. Any other kind, text and date and any kind added later, is not sent. */
export const sendableTypes: ReadonlySet<string> = new Set(["choice", "multi", "number", "year", "scale", "body"]);
/** The same for the fields of a form or a list. A form or list with any other kind of field is not sent at all. */
export const sendableFields: ReadonlySet<string> = new Set(["choice", "multi", "number", "year"]);
/** Sent only as a coarser fact: the place of residence as inFinland, and the exact height and weight as a weight band. */
const replaced: ReadonlySet<string> = new Set(["residence", "body"]);
/** Mood scores are not risk factors for cancer, so they are not sent either. */
const unrelated: ReadonlySet<string> = new Set(["phq1", "phq2", "gad1", "gad2"]);

export type Fact = { id: string; question: string; answer: string | string[] };
export type Facts = {
  /** In years. The date of birth is never sent. */
  age?: number;
  /** Whether the person lives in Finland. Never where. */
  inFinland?: boolean;
  bmiBand?: Derived["bmiBand"];
  /** True when BMI is 40 or more (the risk statements tell 30 to 39.9 from 40 and over). Only the fact, never the height or the weight. */
  severeObesity?: true;
  packYears?: number;
  answers: Fact[];
};

const plainFields = (fields: readonly Field[]) => fields.every(field => sendableFields.has(field.type));
/** True when every answer to the question is a choice, a number or something else a person picks rather than types. */
export const mayBeSent = (question: Question) =>
  question.type === "form" || question.type === "list" ? plainFields(question.fields) : sendableTypes.has(question.type);

// The question's short name in English, read without the person's answers, so that nothing typed can come with it. A
// {name} placeholder is dropped, never filled in.
const wording = (question: Question) => tr("en", copyOf(question.label ?? question.title, {})).replace(/,?\s*\{name\}/g, "");

/** The facts a model may be told, from the answers a person saved. Hidden branches and "not sure" answers are left out. */
export function factsOf(answers: Answers, now = clock.now(), entries: readonly Plan[] = fullPlan): Facts {
  const derived = derive(answers, now);
  const residence = val(answers, "residence");
  const facts: Facts = {
    ...(derived.age !== undefined ? { age: derived.age } : {}),
    ...(typeof residence === "string" ? { inFinland: residence !== "abroad" } : {}),
    ...(derived.bmiBand ? { bmiBand: derived.bmiBand } : {}),
    ...(derived.severeObesity ? { severeObesity: true as const } : {}),
    ...(derived.packYears !== undefined ? { packYears: derived.packYears } : {}),
    answers: [],
  };
  for (const question of flow(answers, entries)) {
    const answer = answers[question.id];
    if (answer === undefined || isMarker(answer) || replaced.has(question.id) || unrelated.has(question.id) || !mayBeSent(question)) continue;
    facts.answers.push({ id: question.id, question: wording(question), answer: describe(question, answer, "en") });
  }
  return facts;
}
