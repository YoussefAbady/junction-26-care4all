import type { Answer, Answers, Marker } from "./types";

/** Lets tests pin the date. */
export const clock = { now: () => new Date() };

export const isMarker = (value: unknown): value is Marker =>
  typeof value === "object" && value !== null && !Array.isArray(value) && "$" in value;

/** The recorded value, or undefined when unanswered or answered with "not sure" / "prefer not to say" / "skip". */
export function val(answers: Answers, id: string): Exclude<Answer, Marker> | undefined {
  const value = answers[id];
  return value === undefined || isMarker(value) ? undefined : value;
}
export const eq = (answers: Answers, id: string, expected: string) => val(answers, id) === expected;
export const oneOf = (answers: Answers, id: string, expected: readonly string[]) => {
  const value = val(answers, id);
  return typeof value === "string" && expected.includes(value);
};
export function has(answers: Answers, id: string, expected: string) {
  const value = val(answers, id);
  return Array.isArray(value) && (value as unknown[]).includes(expected);
}
export const hasAny = (answers: Answers, id: string, expected: readonly string[]) => expected.some(item => has(answers, id, item));
export function num(answers: Answers, id: string) {
  const value = val(answers, id);
  return typeof value === "number" ? value : undefined;
}
export function field(answers: Answers, id: string, key: string) {
  const value = val(answers, id);
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined;
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}
export function ageOn(birth: Date, now: Date) {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}
export function ageOf(answers: Answers, now = clock.now()) {
  const birth = parseDate(val(answers, "dob"));
  return birth ? ageOn(birth, now) : undefined;
}

/** Bodies, not identities: used only to decide which clinical questions apply. */
export const femaleBody = (answers: Answers) =>
  eq(answers, "sex", "female") || hasAny(answers, "organs", ["breasts", "uterus", "cervix", "ovaries"]);
export const maleBody = (answers: Answers) =>
  eq(answers, "sex", "male") || hasAny(answers, "organs", ["prostate", "testes"]);
export const olderThan = (answers: Answers, years: number) => (ageOf(answers) ?? 0) >= years;
