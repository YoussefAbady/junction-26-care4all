import { z } from "zod";
import { monitorWhyKeys, type Bilingual, type BilingualList, type FallbackTurn, type MonitorRules, type MonitorWhyKey, type RiskFactorState, type RiskInFinland, type RiskRubric } from "./v2-types";

// Checks for the jsonb columns of the design v2 content tables, so a hand edit that breaks one fails on the way in instead
// of reaching a screen. Strict, like the schemas in design.ts. Annotated with the read model types, so a type and its schema
// cannot drift apart without a compile error.

export const bilingualSchema: z.ZodType<Bilingual> = z.object({ en: z.string(), fi: z.string() }).strict();

/** ContentRiskFactor.states */
export const riskFactorStatesSchema: z.ZodType<RiskFactorState[]> = z.array(z.object({ id: z.string(), you: bilingualSchema }).strict());

const fallbackTurnSchema: z.ZodType<FallbackTurn> = z.object({
  kind: z.enum(["choice", "multi", "number"]),
  title: z.string(),
  help: z.string().optional(),
  options: z.array(z.object({ label: z.string(), exclusive: z.boolean().optional() }).strict()).optional(),
  number: z.object({ min: z.number(), max: z.number(), unit: z.string().optional(), decimals: z.number().int().optional() }).strict().optional(),
}).strict();

/** ContentAssessmentDomain.fallback */
export const domainFallbackSchema: z.ZodType<{ en: FallbackTurn; fi: FallbackTurn }> = z.object({ en: fallbackTurnSchema, fi: fallbackTurnSchema }).strict();

// ---- ContentMeta values (docs/design-v2.md Appendix A.4) ----------------------------------------------------------------

const bilingualListSchema: z.ZodType<BilingualList> = z.object({ en: z.array(z.string()), fi: z.array(z.string()) }).strict();
const ids = z.array(z.string());
const tierRecord = z.object({ high: bilingualSchema, raised: bilingualSchema, average: bilingualSchema, unknown: bilingualSchema }).strict();
const urgencySchema = z.enum(["weeks", "days", "today"]);

/** ContentMeta riskRubric */
export const riskRubricSchema: z.ZodType<RiskRubric> = z.object({
  tiers: tierRecord, overall: bilingualSchema, comparison: bilingualSchema, sourceIds: ids,
}).strict();
/** ContentMeta riskInFinland */
export const riskInFinlandSchema: z.ZodType<RiskInFinland> = z.object({ text: bilingualSchema, sourceIds: ids }).strict();
/** ContentMeta interviewLimits */
export const interviewLimitsSchema = z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict()
  .refine(limits => limits.min <= limits.max, "interviewLimits.min is above max");

const trendSchema = z.enum(["gone", "better", "same", "worse"]);
const whyShape = Object.fromEntries(monitorWhyKeys.map(key => [key, bilingualSchema])) as Record<MonitorWhyKey, typeof bilingualSchema>;
/** ContentMeta monitorRules */
export const monitorRulesSchema: z.ZodType<MonitorRules> = z.object({
  steps: z.array(z.number().positive()).min(1),
  reminderHour: z.number().int().min(0).max(23),
  timeZone: z.string().min(1),
  minGapDays: z.number().nonnegative(),
  snoozeDays: z.number().positive(),
  thresholds: z.object({ strong: z.number(), veryStrong: z.number(), rise: z.number() }).strict(),
  stillThereDays: z.number().positive(),
  noBetterDays: z.number().positive(),
  urgency: z.object({
    ladder: z.array(urgencySchema), watch: urgencySchema, serious: urgencySchema,
    raise: z.object({ worse: urgencySchema, strong: urgencySchema, veryStrong: urgencySchema, rise: urgencySchema, newFlags: urgencySchema }).strict(),
  }).strict(),
  trends: z.array(z.object({ id: trendSchema, label: bilingualSchema, word: bilingualSchema, doctorWord: bilingualSchema }).strict()),
  why: z.object(whyShape).strict(),
  triage: z.object({
    watch: z.object({ onset: z.array(z.string()), course: z.array(z.string()), impact: z.array(z.string()) }).strict(),
    categories: z.array(z.object({ id: z.string(), words: bilingualListSchema, why: bilingualSchema, urgency: urgencySchema }).strict()),
    reasons: z.array(z.object({ key: z.string(), why: bilingualSchema, urgency: urgencySchema }).strict()),
    why: z.record(z.string(), bilingualSchema),
  }).passthrough(),
}).passthrough();
