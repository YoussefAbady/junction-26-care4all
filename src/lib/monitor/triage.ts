import type { MonitorTriage, Urgency } from "../content/v2-types";
import type { Lang } from "./assess";

// What a saved symptom note is told (docs/design-v2.md section 7, last bullet). It ports the design's outcome() to what the
// backend saves: label, notes, onset, course and impact (no 0 to 10 strength). The rules and every sentence are in the
// database (monitorRules.triage). The default is "see a doctor": watch is a narrow exception, and a field that is missing
// or unsure never produces it. The existing emergency detection (planChat) is decided by the caller and comes first.

export type SymptomNote = {
  label: string; notes?: string | null; topic?: string | null;
  onset?: string | null; course?: string | null; impact?: string | null;
};
export type SymptomOutcome = { level: "emergency" | "doctor" | "watch"; urgency: Urgency; why: string[] };
type Rules = { urgency: { ladder: Urgency[]; watch: Urgency; serious: Urgency }; triage: MonitorTriage };

export function triageSymptom(rules: Rules, note: SymptomNote, lang: Lang, emergency: boolean): SymptomOutcome {
  const { triage } = rules;
  const line = (key: string) => triage.why[key]?.[lang] ?? "";
  const lines = (keys: string[]) => keys.map(line).filter(Boolean);
  if (emergency) return { level: "emergency", urgency: rules.urgency.serious, why: lines(["emergency"]) };
  const ladder = rules.urgency.ladder;
  let rank = 0;
  const raise = (word: Urgency) => { rank = Math.max(rank, ladder.indexOf(word)); };
  const why: string[] = [];
  const text = [note.label, note.notes ?? "", note.topic ?? ""].join(" ").toLowerCase();
  const matched = triage.categories.filter(category => category.words[lang].concat(category.words.en).some(word => word && text.includes(word.toLowerCase())));
  for (const category of matched) { why.push(category.why[lang]); raise(category.urgency); }
  // A note whose course is gone has nothing left to compare: it counts as getting better with no effect on daily life.
  const gone = note.course === "gone";
  const onset = note.onset ?? undefined;
  const course = gone ? "better" : note.course ?? undefined;
  const impact = note.impact ?? (gone ? "none" : undefined);
  for (const reason of triage.reasons) {
    const [field, value] = reason.key.split(":");
    const actual = field === "onset" ? onset : field === "course" ? note.course : field === "impact" ? impact : undefined;
    if (actual === value) { why.push(reason.why[lang]); raise(reason.urgency); }
  }
  const watch = onset !== undefined && triage.watch.onset.includes(onset) && course !== undefined && triage.watch.course.includes(course)
    && impact !== undefined && triage.watch.impact.includes(impact);
  if (watch && !why.length) return { level: "watch", urgency: rules.urgency.watch, why: lines(["watch:1", "watch:2"]) };
  if (!why.length) {
    if (!(onset !== undefined && triage.watch.onset.includes(onset))) why.push(line(onset === undefined || onset === "unsure" ? "onsetUnknown" : "notRecent"));
    if (!(course !== undefined && triage.watch.course.includes(course))) why.push(line(course === undefined || course === "unsure" ? "courseUnknown" : "notBetter"));
    if (!(impact !== undefined && triage.watch.impact.includes(impact))) why.push(line(impact === undefined || impact === "unsure" ? "impactUnknown" : "notMild"));
    why.push(line("cautious"));
  }
  return { level: "doctor", urgency: ladder[rank] ?? ladder[0], why: why.filter(Boolean) };
}
