import type { Bilingual, MonitorFlag, MonitorRules, Trend, Urgency } from "../content/v2-types";

// The check-in rules of close monitoring: a pure function of the rules in the database (ContentMeta monitorRules), the
// monitor's history and the clock. It reproduces the design's A.monitorAssess and A.monitorSave due-date maths
// (docs/design-v2.md section 7 and Appendix A.10). No sentence and no number of the rules is in this file.

export type Lang = "en" | "fi";
export const DAY = 864e5;

export type CheckinInput = { trend: Trend; level: number | null; flags: string[]; serious: boolean };
/** The monitor as the evaluation sees it: when it started, the strength at the start and the check-ins logged since. */
export type WatchState = { startedAt: Date | number; level0: number | null; checkins: { level: number | null }[] };
export type Assessment = { level: "gone" | "watch" | "doctor" | "emergency"; why: string[]; urgency: "" | Urgency };
type Rules = Pick<MonitorRules, "urgency" | "thresholds" | "stillThereDays" | "noBetterDays" | "why">;

const say = (text: Bilingual, lang: Lang) => text[lang];
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (hole, key: string) => key in values ? String(values[key]) : hole);
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const ms = (value: Date | number) => typeof value === "number" ? value : value.getTime();

export function assessCheckin(
  content: { rules: Rules; flags: Pick<MonitorFlag, "id" | "label">[] }, state: WatchState, input: CheckinInput, now: Date | number, lang: Lang,
): Assessment {
  const { rules } = content;
  const ladder = rules.urgency.ladder;
  if (input.serious) return { level: "emergency", why: [say(rules.why.serious, lang)], urgency: rules.urgency.serious };
  if (input.trend === "gone") return { level: "gone", why: [], urgency: "" };
  const why: string[] = [];
  let rank = 0;
  const raise = (word: Urgency) => { rank = Math.max(rank, ladder.indexOf(word)); };
  const last = state.checkins.length ? state.checkins[state.checkins.length - 1] : { level: state.level0 };
  const days = (ms(now) - ms(state.startedAt)) / DAY;
  if (input.trend === "worse") { why.push(say(rules.why.worse, lang)); raise(rules.urgency.raise.worse); }
  if (input.level !== null && input.level >= rules.thresholds.strong) {
    why.push(fill(say(rules.why.strong, lang), { level: input.level }));
    raise(input.level >= rules.thresholds.veryStrong ? rules.urgency.raise.veryStrong : rules.urgency.raise.strong);
  }
  if (input.level !== null && last.level !== null && input.level - last.level >= rules.thresholds.rise) {
    why.push(fill(say(rules.why.rise, lang), { from: last.level, to: input.level }));
    raise(rules.urgency.raise.rise);
  }
  if (input.flags.length) {
    const words = input.flags.map(id => lowerFirst(content.flags.find(flag => flag.id === id)?.label[lang] ?? id));
    why.push(fill(say(rules.why.newFlags, lang), { flags: words.join("; ") }));
    raise(rules.urgency.raise.newFlags);
  }
  if (!why.length) {
    if (days >= rules.stillThereDays) why.push(say(rules.why.stillThere, lang));
    else if (input.trend === "same" && days >= rules.noBetterDays) why.push(say(rules.why.noBetter, lang));
  }
  if (why.length) return { level: "doctor", why, urgency: ladder[rank] };
  return { level: "watch", why: [say(input.trend === "better" ? rules.why.watchBetter : rules.why.watchSame, lang)], urgency: rules.urgency.watch };
}

// ---- due dates -------------------------------------------------------------------------------------------------------

type Clock = Pick<MonitorRules, "steps" | "reminderHour" | "timeZone" | "minGapDays" | "snoozeDays">;
const zoneParts = (instant: number, timeZone: string) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(new Date(instant)).map(part => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
};
/** The offset of a zone from UTC at an instant, in milliseconds (positive when the zone is ahead). */
const offsetAt = (instant: number, timeZone: string) => {
  const p = zoneParts(instant, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
};
/** at(instant): the local calendar date of the instant in the rules' zone, at reminderHour:00 (the design's nineAm). */
export function atReminderHour(rules: Pick<Clock, "reminderHour" | "timeZone">, instant: number) {
  const p = zoneParts(instant, rules.timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, rules.reminderHour, 0, 0);
  let guess = wall - offsetAt(wall, rules.timeZone);
  guess = wall - offsetAt(guess, rules.timeZone);
  return guess;
}

export type DueRequest =
  | { kind: "start"; startedAt: Date | number }
  | { kind: "snooze"; now: Date | number }
  /** `checkins` is the number of check-ins since the start, including the one just logged. */
  | { kind: "checkin"; startedAt: Date | number; now: Date | number; checkins: number };
export function nextDue(rules: Clock, request: DueRequest): Date {
  const at = (instant: number) => atReminderHour(rules, instant);
  if (request.kind === "start") return new Date(at(ms(request.startedAt) + rules.steps[0] * DAY));
  if (request.kind === "snooze") return new Date(at(ms(request.now) + rules.snoozeDays * DAY));
  const step = rules.steps[Math.min(request.checkins, rules.steps.length - 1)];
  return new Date(Math.max(at(ms(request.startedAt) + step * DAY), at(ms(request.now) + rules.minGapDays * DAY)));
}
