import { createHash } from "node:crypto";
import { factsOf, type Facts } from "../assess/facts";
import type { RiskType } from "../content/v2-types";
import { ageOf, femaleBody, maleBody } from "../intake/access";
import type { Answers } from "../intake/types";
import type { Language } from "./types";

// What the risk model may be told about a person (docs/design-v2.md section 3). The basics come from assess/facts.ts, the one
// place that decides what may be sent: deny by default, by kind of answer. The interview adds its transcript: the area each
// question is about, the question and the answer in words. Never sent: a name, a username, any id, the date of birth, the
// place, the height or weight, or anything the person typed. The interview has no free text.

export type TranscriptLine = { domain: string; question: string; answer: string };
export type RiskFacts = {
  age?: number;
  inFinland?: boolean;
  bmiBand?: Facts["bmiBand"];
  /** True when BMI is 40 or more, once the intake says so. Until then `obese` means BMI 30 to 39.9 (docs/design-v2.md A.10). */
  severeObesity?: boolean;
  packYears?: number;
  /** The intake answers that may be sent: the question in English and the answer in words. */
  answers: { question: string; answer: string | string[] }[];
  interview: TranscriptLine[];
};

const maxText = 240;
const clip = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, maxText);

export function riskFactsOf(answers: Answers, transcript: readonly TranscriptLine[], now?: Date): RiskFacts {
  const { answers: basics, ...rest } = factsOf(answers, now) as Facts & { severeObesity?: boolean };
  const known = ["age", "inFinland", "bmiBand", "severeObesity", "packYears"] as const;
  const picked: Partial<RiskFacts> = {};
  // Copy by name, so a field added to factsOf later is not sent until this list is read and changed.
  for (const key of known) if (rest[key] !== undefined) Object.assign(picked, { [key]: rest[key] });
  return {
    ...picked,
    answers: basics.map(({ question, answer }) => ({ question, answer })),
    interview: transcript.map(line => ({ domain: clip(line.domain), question: clip(line.question), answer: clip(line.answer) })),
  };
}

/**
 * Which cancer types apply: `any` always, `female` and `male` by the intake's bodies rule on the saved basics (docs/design-v2.md
 * A.10), not by the profile. The rest are skipped.
 */
export function splitTypes(types: readonly RiskType[], answers: Answers): { applicable: RiskType[]; skipped: string[] } {
  const female = femaleBody(answers);
  const male = maleBody(answers);
  const applies = (type: RiskType) => type.sex === "any" || (type.sex === "female" && female) || (type.sex === "male" && male);
  return { applicable: types.filter(applies), skipped: types.filter(type => !applies(type)).map(type => type.id) };
}

/** The person's age in years, for the sentence of a factor state. */
export const ageInYears = (answers: Answers, now?: Date) => ageOf(answers, now);

/** Changes when the facts, the transcript, the content or the language change: that is what makes an assessment stale. */
export function inputHash(facts: RiskFacts, contentVersion: string, language: Language) {
  return createHash("sha256").update(JSON.stringify({ facts, contentVersion, language })).digest("hex");
}
