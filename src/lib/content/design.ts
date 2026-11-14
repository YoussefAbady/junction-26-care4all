import { z } from "zod";

// The shape of the PWA's content: the `content` object of prisma/seed-data/design-content.json, which is also what
// GET /api/content returns. Every object is strict, so a change to the export fails loudly instead of being dropped.
// Keys are declared in the order the export writes them. A regular expression travels as { $regexp, flags }.

const text = z.string();
const ids = z.array(z.string());
const count = z.number().int();

export const statSchema = z.object({
  n: z.number().optional(), prefix: text.optional(), suffix: text.optional(), text: text.optional(), label: text,
}).strict();
export const columnSchema = z.object({ label: text, text }).strict();
export const linkSchema = z.object({ topic: text, anchor: text, label: text }).strict();
export const videoSchema = z.object({ url: text, org: text, title: text, lang: text, length: text }).strict();
export const letterSchema = z.object({ letter: text, word: text, t: text, src: text }).strict();
export const answerLabelsSchema = z.record(z.string(), text);

const section = z.object({
  id: text, h: text, lead: text.optional(), cols: z.array(columnSchema).optional(), stats: z.array(statSchema).optional(),
  list: z.array(text).optional(), steps: z.array(text).optional(), p: z.array(text), plain: z.array(text),
  link: linkSchema.optional(), src: ids,
}).strict();
const article = z.object({
  id: text, topic: text, minutes: count, title: text, inShort: text, sections: z.array(section), related: ids,
  about: z.boolean().optional(),
}).strict();

const symptom = z.object({ title: text, what: text, art: text, src: text }).strict();
const guideStep = z.object({ h: text, t: text, art: text, src: text, look: text.optional() }).strict();
const guide = z.object({
  title: text, text: z.array(text), steps: z.array(guideStep), normal: z.array(text), normalSrc: ids, found: text,
  videos: z.array(videoSchema), differ: text, differSrc: ids, abcde: z.array(letterSchema).nullable(), src: ids,
}).strict();
const kit = z.object({ title: text, text, src: ids, kind: text, video: videoSchema.optional() }).strict();
const topic = z.object({
  id: text, name: text, kicker: text, national: z.boolean(), pref: text.nullable(), blurb: text, lede: text, leadSrc: ids,
  programme: text, articles: ids,
  symptoms: z.object({ title: text, items: z.array(symptom), see: text, seeSrc: ids, note: text, contact: text, src: ids }).strict(),
  check: guide.nullable(), kit: kit.nullable(), organ: text, aboutId: text, screeningText: text, screeningSrc: ids,
  screenName: text.optional(),
}).strict();

const journeyStep = z.object({ h: text, t: text, art: text, src: text, tip: text.optional() }).strict();
const journey = z.object({
  intro: text, steps: z.array(journeyStep), benefits: z.array(text), downsides: z.array(text), unsure: text, src: ids,
}).strict();

const check = z.object({
  name: text, min: count, every: count, when: text, short: text, freq: text, rec: text, recSrc: ids, drawSrc: ids, note: text,
}).strict();
const scan = z.object({
  id: text, name: text, topic: text, kind: text, sex: text.optional(), type: text, who: text, every: count, freq: text, time: text,
  where: text, what: text, note: text, ans: text.optional(), ansMap: answerLabelsSchema.optional(), journey: text.optional(), src: ids,
}).strict();
const programme = z.object({ kind: text, test: text, ages: text, freq: text, scan: text, pick: text }).strict();
const stat = z.object({
  site: text, risk: z.number(), sex: text.optional(), both: count, m: count.optional(), f: count.optional(),
  share: z.object({ m: z.number().optional(), f: z.number().optional() }).strict().optional(), src: ids.optional(),
}).strict();
const vaccine = z.object({ name: text, protects: text, finland: text.optional(), src: ids }).strict();
const triage = z.object({ watchIntro: text, rules: z.array(z.object({ h: text, t: text, src: ids }).strict()), src: ids }).strict();
const regexp = z.object({ $regexp: text, flags: text }).strict();
const faq = z.object({ t: text.optional(), re: regexp.optional(), k: z.array(text), q: text, a: text, s: ids }).strict();

export const exampleSchema = z.object({ name: text, yob: count, sex: text, county: text }).strict();

export const designContentSchema = z.object({
  YEAR: count,
  COUNTIES: z.array(z.tuple([text, text])),
  SOURCES: z.record(z.string(), z.object({ name: text, org: text, date: text, url: text, use: text }).strict()),
  ARTICLES: z.record(z.string(), article),
  TOPICS: z.record(z.string(), topic),
  TOPIC_ORDER: ids,
  FAQ: z.array(faq),
  COPY: z.record(z.string(), text),
  I18N: z.record(z.string(), z.record(z.string(), text)),
  EXAMPLE: exampleSchema,
  JOURNEYS: z.record(z.string(), journey),
  NATIONAL: ids,
  STATS: z.record(z.string(), stat),
  STATS_SRC: ids,
  STATS_NOTE: text,
  VACC: z.record(z.string(), vaccine),
  TRIAGE: triage,
  CHECK_META: z.record(z.string(), check),
  SCANS: z.array(scan),
  NAT: z.record(z.string(), programme),
  STEP_HINTS: z.record(z.string(), z.array(z.object({ pose: text, move: text }).strict())),
  SUGGESTIONS: z.object({ topics: z.record(z.string(), z.array(text)), general: z.array(text) }).strict(),
}).strict();

/** Where the export came from: the artifact, its version and the day it was read. */
export const designSourceSchema = z.object({ artifact: text, url: text, version: text, retrieved: text }).strict();
/** The whole of design-content.json. */
export const designSeedSchema = z.object({ source: designSourceSchema, content: designContentSchema }).strict();

export type DesignContent = z.infer<typeof designContentSchema>;
export type DesignSeed = z.infer<typeof designSeedSchema>;
export type Stat = z.infer<typeof statSchema>;
export type Column = z.infer<typeof columnSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Video = z.infer<typeof videoSchema>;
export type Letter = z.infer<typeof letterSchema>;
