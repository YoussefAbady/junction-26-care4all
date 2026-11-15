import { z } from "zod";
import { basicsComplete, prune, sanitize } from "./engine";
import { importLegacyAnswers } from "./legacy";
import type { Progress } from "./types";

const snapshot = z.object({
  v: z.literal(2),
  answers: z.record(z.string().max(80), z.unknown()),
  cursor: z.string().max(80),
  complete: z.boolean(),
  confirmed: z.boolean(),
  acks: z.array(z.string().max(400)).max(80),
  language: z.enum(["en", "fi"]),
  revision: z.number().int().nonnegative(),
});

export const freshProgress = (language: "en" | "fi", revision = 0, upgraded = false): Progress =>
  ({ v: 2, answers: {}, cursor: "", complete: false, confirmed: false, acks: [], language, revision, ...(upgraded ? { upgraded: true } : {}) });

/**
 * Accepts a progress snapshot only if every answer belongs to a known question and is valid for it.
 * A finished questionnaire must be fully answered and confirmed, and is stored without answers to hidden branches.
 */
export function parseProgress(value: unknown): Progress | null {
  const parsed = snapshot.safeParse(value);
  if (!parsed.success) return null;
  const answers = sanitize(parsed.data.answers);
  if (!answers) return null;
  if (!parsed.data.complete) return { ...parsed.data, answers };
  // Finished means the basics are answered: the other chapters are replaced by the AI interview. Answers saved earlier are kept (prune uses the full plan).
  return basicsComplete(answers) && parsed.data.confirmed ? { ...parsed.data, answers: prune(answers) } : null;
}

/** Reads stored progress. Import compatible answers from the earlier questionnaire into a new draft. */
export function readProgress(stored: unknown, revision: number): Progress {
  const record = typeof stored === "object" && stored !== null ? stored as Record<string, unknown> : {};
  const language = record.language === "fi" ? "fi" : "en";
  if (record.v !== 2) return { ...freshProgress(language, revision), answers: importLegacyAnswers(record) };
  const current = parseProgress({ ...record, revision });
  if (current) return current;
  // A finished interview stops being finished when the questionnaire gains a question. Its answers are still good, so it is
  // reopened (the new questions are asked, then the person confirms again) instead of being thrown away.
  const reopened = parseProgress({ ...record, revision, complete: false, confirmed: false });
  return reopened ? { ...reopened, cursor: "" } : freshProgress(language, revision, true);
}
