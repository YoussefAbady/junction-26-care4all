import { sanitize } from "./engine";
import type { Answers } from "./types";

const mappings = {
  sex: ["sex", ["female", "male", "intersex"]],
  region: ["residence", ["uusimaa", "finland", "abroad"]],
  cancer: ["cancer_personal", ["yes", "no"]],
  // The old question covered first-degree relatives only. A negative answer cannot be transferred.
  family: ["fh_gate", ["yes"]],
  tobacco: ["smoke", ["never", "former", "current"]],
  alcohol: ["alc_freq", ["never"]],
  diet: ["diet_veg", [null, "weekly", null]],
} as const;

export function importLegacyAnswers(stored: Record<string, unknown>): Answers {
  const raw = stored.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const answers: Answers = {};
  for (const [oldId, [newId, options]] of Object.entries(mappings)) {
    const index = record[oldId];
    if (typeof index !== "number" || !Number.isInteger(index)) continue;
    const answer = options[index];
    if (answer) answers[newId] = answer;
  }
  return sanitize(answers) ?? {};
}
