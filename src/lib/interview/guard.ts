import { z } from "zod";
import { canonical, claimsDiagnosis, givesTreatmentAdvice, isInLanguage, isPlainText, phrase } from "../ai/guard";
import type { FallbackTurn } from "../content/v2-types";
import type { Kind, Language, NewTurn, Range } from "./types";

// The model is not trusted with the next question. What it writes is checked here and a question that fails any check is
// thrown away: the question then comes from the database bank. The patterns are a backstop for the instructions in prompt.ts,
// not a complete list, and they err on the side of refusing. Everything that passes is also fed back to the model as
// the transcript of later questions, so the checks cover that too (second-order injection): text that looks like an
// instruction, a role, markup or a structure is refused, and prompt.ts passes the transcript as JSON data only.

export const titleLength = { min: 10, max: 160 };
export const optionLength = { min: 1, max: 60 };
export const optionCount = { min: 2, max: 7 };
const helpMax = 200;
const unitMax = 20;
const numberBounds = { min: 0, max: 10_000 };

/** What the model replies. Everything but `done` is optional because a finished interview has no question. */
const optionShape = z.union([z.string(), z.object({ label: z.string(), exclusive: z.boolean().optional() }).strict()]);
const replyShape = z.object({
  done: z.boolean(),
  domain: z.string().optional(),
  kind: z.enum(["choice", "multi", "number"]).optional(),
  title: z.string().optional(),
  help: z.string().optional(),
  options: z.array(optionShape).max(20).optional(),
  number: z.object({
    min: z.number(), max: z.number(), unit: z.string().optional(), decimals: z.number().int().optional(),
  }).strict().optional(),
}).strict();

/** The JSON Schema the provider is asked to follow. The domain may only be one of those allowed now. */
export function replyJsonSchema(domains: readonly string[]) {
  return {
    type: "object",
    properties: {
      done: { type: "boolean" },
      domain: { type: "string", enum: [...domains] },
      kind: { type: "string", enum: ["choice", "multi", "number"] },
      title: { type: "string" },
      help: { type: "string" },
      options: {
        type: "array", maxItems: optionCount.max + 2,
        items: { type: "object", properties: { label: { type: "string" }, exclusive: { type: "boolean" } }, required: ["label"], additionalProperties: false },
      },
      number: {
        type: "object",
        properties: { min: { type: "number" }, max: { type: "number" }, unit: { type: "string" }, decimals: { type: "integer" } },
        required: ["min", "max"], additionalProperties: false,
      },
    },
    required: ["done"],
    additionalProperties: false,
  };
}

// Why: the person answers by choosing or entering a number. A request to type or describe is a request for free text, which
// this interview never takes (docs/design-v2.md section 3).
const asksForTyping = phrase("describe|explain|tell (?:us|me)|in your own words|type (?:in|your|the)|write|please specify|specify|elaborate|kuvaile\\p{L}*|kerro|selitä|kirjoita|täsmennä");
// Why: a name, an address, a phone number, an id number or an exact date identifies a person. None of it is asked or needed.
const asksForPersonalDetails = phrase("name|surname|address|street|postcode|post code|zip|city|town|where (?:do|did) you live|phone|telephone|mobile number|e-?mail|id number|identity|social security|passport|date of birth|birthday|birthdate|exact date|which date|what date|\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}|nimi|nimesi|osoite|katuosoite|postinumero|asuinpaikka|kotikaupunki|puhelin\\p{L}*|sähköposti\\p{L}*|henkilötunnus|syntymäaika|syntymäpäivä|tarkka päivämäärä");
// Why: the service gives information. A question that names a treatment or a medicine steps into medical advice. "Diagnosed"
// is allowed because a history question has to say it ("has a close relative been diagnosed with cancer?").
const usesMedicalWording = phrase("diagnos(?!ed)\\p{L}*|treat\\p{L}*|therap\\p{L}*|chemo\\p{L}*|surgery|operation|medication|medicine|medicines|drug|drugs|(?<!low-)dose|dosage|prescri\\p{L}*|cure|diagnoo\\p{L}*|hoito\\p{L}*|hoida\\p{L}*|leikkau\\p{L}*|lääke\\p{L}*|lääkit\\p{L}*|annos|annostu\\p{L}*|resepti\\p{L}*|parann\\p{L}*");
// Why: text that is written to steer a model, or that names the machinery, has no place in a question for a person, and it
// would be read by the model again as part of the transcript.
const steersAModel = phrase("ignore|disregard|forget|override|bypass|jailbreak|system|prompt|instructions?|guidelines?|rules|previous|earlier answers?|you are (?:now|an?)|act as|pretend|role-?play|assistant|chatbot|json|schema|developer|admin|api|ohita\\p{L}*|unohda\\p{L}*|ohjeet|ohjeita|ohjeiden|järjestelmä\\p{L}*|kehote\\p{L}*|säännöt|säännöis\\p{L}*|esitä|apulainen|avustaja");
// Why: braces, brackets, angle brackets, backticks and backslashes are structure, not words.
const structure = /[{}[\]<>`\\]/;
// The app adds "Not sure" and "Prefer not to say" itself, so an option of the model's that only says so is dropped.
const answerMarker = /^(?:not sure|unsure|i do not know|i don't know|do not know|don't know|no idea|prefer not to say|prefer not to answer|rather not say|skip|en ole varma|en tiedä|en halua vastata|en halua sanoa|ohita)[.!]?$/i;
const noneOfThese = /^(?:none|none of these|none of the above|nothing|neither|no, none|ei mitään|ei mikään|ei yhtään|ei mitään näistä|ei mikään näistä|ei yksikään)[.!]?$/i;

const tidy = (text: string) => text.normalize("NFKC").replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/[‘’ʼ]/g, "'").replace(/\s+/g, " ").trim();
const sameTitle = (text: string) => canonical(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** True when the text, as the checks read it, is plain words that are safe to show and to tell a model later. */
function textIsSound(text: string) {
  const checked = canonical(text);
  return isPlainText(checked) && !structure.test(checked) && !steersAModel.test(checked) && !asksForPersonalDetails.test(checked)
    && !asksForTyping.test(checked) && !usesMedicalWording.test(checked) && !claimsDiagnosis(checked) && !givesTreatmentAdvice(checked);
}

export type QuestionCandidate = {
  kind: Kind; title: string; help?: string;
  options?: { label: string; exclusive?: boolean }[];
  number?: { min: number; max: number; unit?: string; decimals?: number };
};
export type Checked = Pick<NewTurn, "kind" | "title" | "help" | "options" | "range">;

/**
 * The rules of section 5.4 for one question, whoever wrote it: the model, or the bank (whose questions must pass too, so the
 * seed is checked with this function). Returns the question as it will be stored, with the server's option ids (o1, o2, ...),
 * or null when any rule fails.
 */
export function checkQuestion(candidate: QuestionCandidate, language: Language): Checked | null {
  const title = tidy(candidate.title);
  if (title.length < titleLength.min || title.length > titleLength.max || !/[?？]$/.test(title) || !textIsSound(title)) return null;
  let help: string | undefined;
  const wantedHelp = candidate.help === undefined ? "" : tidy(candidate.help);
  if (wantedHelp && wantedHelp.length <= helpMax && textIsSound(wantedHelp)) help = wantedHelp;
  const texts = [title, ...(help ? [help] : [])];

  if (candidate.kind === "number") {
    if (candidate.options?.length) return null;
    const range = candidate.number;
    if (!range) return null;
    const decimals = range.decimals ?? 0;
    const unit = range.unit === undefined ? undefined : tidy(range.unit);
    if (!Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min < numberBounds.min || range.max > numberBounds.max || range.min >= range.max) return null;
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 2) return null;
    if (Number(range.min.toFixed(decimals)) !== range.min || Number(range.max.toFixed(decimals)) !== range.max) return null;
    if (unit !== undefined && (unit.length === 0 ? false : unit.length > unitMax || !textIsSound(unit))) return null;
    if (unit) texts.push(unit);
    if (!isInLanguage(texts.join(" "), language)) return null;
    const out: Range = { min: range.min, max: range.max, ...(unit ? { unit } : {}), ...(decimals ? { decimals } : {}) };
    return { kind: "number", title, help: help ?? null, options: null, range: out };
  }

  if (candidate.number) return null;
  const options = (candidate.options ?? []).map(option => ({ label: tidy(option.label), exclusive: option.exclusive === true }))
    .filter(option => !answerMarker.test(canonical(option.label)));
  if (options.length < optionCount.min || options.length > optionCount.max) return null;
  if (options.some(option => option.label.length < optionLength.min || option.label.length > optionLength.max || !textIsSound(option.label))) return null;
  if (new Set(options.map(option => sameTitle(option.label))).size !== options.length) return null;
  texts.push(...options.map(option => option.label));
  if (!isInLanguage(texts.join(" "), language)) return null;
  // Only a multi-choice question has an exclusive option ("None of these"), at most one, and it is how the person says none apply.
  const marked = options.map(option => ({ ...option, exclusive: candidate.kind === "multi" && (option.exclusive || noneOfThese.test(canonical(option.label))) }));
  if (marked.filter(option => option.exclusive).length > 1) return null;
  return {
    kind: candidate.kind, title, help: help ?? null,
    options: marked.map((option, index) => ({ id: "o" + (index + 1), label: option.label, ...(option.exclusive ? { exclusive: true } : {}) })),
    range: null,
  };
}

/** A bank question (a domain's fallback turn) in the shape of a candidate. */
export const candidateOf = (turn: FallbackTurn): QuestionCandidate =>
  ({ kind: turn.kind, title: turn.title, help: turn.help, options: turn.options, number: turn.number });

export type Verdict =
  | { ok: true; done: true }
  | { ok: true; done: false; question: Checked & { domain: string } }
  | { ok: false; reason: "invalid-json" | "bad-question" | "bad-domain" | "repeat" };

/**
 * Checks the model's reply. `domains` are the ids the model may name now (uncovered ones, and a follow-up on the last answer),
 * `earlier` the titles already asked. Done is accepted here and gated by the engine, which knows the coverage.
 */
export function validateReply(raw: unknown, language: Language, domains: readonly string[], earlier: readonly string[]): Verdict {
  const shape = replyShape.safeParse(raw);
  if (!shape.success) return { ok: false, reason: "invalid-json" };
  const reply = shape.data;
  if (reply.done) return { ok: true, done: true };
  if (!reply.domain || !domains.includes(reply.domain)) return { ok: false, reason: "bad-domain" };
  if (!reply.kind || reply.title === undefined) return { ok: false, reason: "invalid-json" };
  const checked = checkQuestion({
    kind: reply.kind, title: reply.title, help: reply.help,
    options: reply.options?.map(option => typeof option === "string" ? { label: option } : option), number: reply.number,
  }, language);
  if (!checked) return { ok: false, reason: "bad-question" };
  const key = sameTitle(checked.title);
  if (earlier.some(title => sameTitle(title) === key)) return { ok: false, reason: "repeat" };
  return { ok: true, done: false, question: { ...checked, domain: reply.domain } };
}

/** The text of an earlier question or answer as it is told to a model again: one line, plain, and never longer than a question can be. */
export const forPrompt = (text: string, max = titleLength.max) => tidy(text).slice(0, max);
