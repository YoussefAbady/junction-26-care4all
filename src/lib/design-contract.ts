import { z } from "zod";

export const cancerTopics = ["breast", "cervical", "colorectal", "skin", "prostate", "testicular"] as const;
export const cancerTopic = z.enum(cancerTopics).or(z.literal("bowel")).transform(topic => topic === "bowel" ? "colorectal" as const : topic);
export const regions = [
  "etela-karjala", "etela-pohjanmaa", "etela-savo", "helsinki", "ita-uusimaa", "kainuu",
  "kanta-hame", "keski-pohjanmaa", "keski-suomi", "keski-uusimaa", "kymenlaakso", "lappi",
  "lansi-uusimaa", "pirkanmaa", "pohjanmaa", "pohjois-karjala", "pohjois-pohjanmaa", "pohjois-savo",
  "paijat-hame", "satakunta", "vantaa-kerava", "varsinais-suomi", "aland", "other", "unknown",
] as const;
export const profileFields = z.object({
  name: z.string().trim().max(40),
  yob: z.number().int().min(1910).refine(value => value <= new Date().getUTCFullYear() - 18),
  sex: z.enum(["female", "male", "intersex", "other", "declined", "none"]),
  county: z.enum(regions),
}).strict();
export const preferences = z.object({
  lang: z.enum(["en", "fi", "sv"]), scale: z.number().int().min(0).max(2),
  plain: z.boolean(), motion: z.boolean(),
}).strict();
export const noteDetails = z.object({
  topic: cancerTopic.optional(),
  symptoms: z.array(z.string().trim().min(1).max(150)).max(12).optional(),
  onset: z.enum(["today", "week", "weeks", "month", "unsure"]).optional(),
  course: z.enum(["same", "worse", "better", "comes", "gone", "unsure"]).optional(),
  impact: z.enum(["none", "some", "limits", "unsure"]).optional(),
  persistence: z.enum(["yes", "comes", "no"]).optional(),
  scanId: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/).optional(),
  selfCheck: z.enum(["nothing_new", "change_noticed"]).optional(),
}).strict();
export const idInput = z.object({ id: z.uuid() }).strict();
