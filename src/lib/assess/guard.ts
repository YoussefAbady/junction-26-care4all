import { z } from "zod";
import { canonical, claimsDiagnosis, gap, givesTreatmentAdvice, isInLanguage, isPlainText, phrase, type AnswerRules } from "../ai/guard";
import type { AnswerLanguage } from "../ai/prompt";

// The model is not trusted with the extra question or the review. What it writes is checked here, and anything that fails
// is thrown away: the person then sees the deterministic output. The patterns are a backstop for the instructions in
// prompt.ts, not a complete list, and they err on the side of refusing.

// ---------------------------------------------------------------------------------------------------- the question

const questionShape = z.object({ done: z.boolean(), question: z.string(), options: z.array(z.string()) }).strict();

export const questionJsonSchema = {
  type: "object",
  properties: { done: { type: "boolean" }, question: { type: "string" }, options: { type: "array", items: { type: "string" }, maxItems: 6 } },
  required: ["done", "question", "options"],
  additionalProperties: false,
};

const titleLength = { min: 10, max: 160 };
const optionLength = { min: 1, max: 60 };

// Why: the person answers by choosing. A request to type or describe is a request for free text, which this flow never takes.
const asksForTyping = phrase("describe|explain|tell (?:us|me)|in your own words|type (?:in|your|the)|write|please specify|specify|elaborate|kuvaile\\p{L}*|kerro|selitä|kirjoita|täsmennä");
// Why: a name, an address, a phone number, an id number or an exact date identifies a person. None of it is asked or needed.
const asksForPersonalDetails = phrase("name|surname|address|street|postcode|post code|zip|city|town|where (?:do|did) you live|phone|telephone|mobile number|e-?mail|id number|identity|social security|passport|date of birth|birthday|birthdate|exact date|which date|what date|\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}|nimi|nimesi|osoite|katuosoite|postinumero|asuinpaikka|kotikaupunki|puhelin\\p{L}*|sähköposti\\p{L}*|henkilötunnus|syntymäaika|syntymäpäivä|tarkka päivämäärä");
// Why: the service gives information. A question that names a diagnosis or a treatment steps into medical advice.
const usesMedicalWording = phrase("diagnos\\p{L}*|treat\\p{L}*|therap\\p{L}*|chemo\\p{L}*|surgery|operation|medication|medicine|medicines|drug|drugs|(?<!low-)dose|dosage|prescri\\p{L}*|cure|diagnoo\\p{L}*|hoito\\p{L}*|hoida\\p{L}*|leikkau\\p{L}*|lääke\\p{L}*|lääkit\\p{L}*|annos|annostu\\p{L}*|resepti\\p{L}*|parann\\p{L}*");

// The app adds "Not sure" to every question itself, so an option of the model's that only says so is dropped.
const onlyNotSure = /^(?:not sure|unsure|i do not know|i don't know|do not know|don't know|no idea|en ole varma|en tiedä)[.!]?$/i;

export type QuestionVerdict =
  | { ok: true; done: true }
  | { ok: true; done: false; title: string; options: string[] }
  | { ok: false; reason: "invalid-json" | "bad-question" };

/** Checks the model's reply for the extra-question step. Done is always accepted. A question must be a plain, safe, multiple-choice one. */
export function validateQuestion(raw: unknown, language: AnswerLanguage): QuestionVerdict {
  const shape = questionShape.safeParse(raw);
  if (!shape.success) return { ok: false, reason: "invalid-json" };
  if (shape.data.done) return { ok: true, done: true };
  const tidy = (text: string) => text.trim().replace(/\s+/g, " ");
  const title = tidy(shape.data.question);
  const options = shape.data.options.map(tidy).filter(option => !onlyNotSure.test(canonical(option)));
  const texts = [title, ...options].map(canonical);
  const sound =
    title.length >= titleLength.min && title.length <= titleLength.max && /[?？]$/.test(title)
    && options.length >= 2 && options.length <= 6 && options.every(option => option.length >= optionLength.min && option.length <= optionLength.max)
    && new Set(options.map(option => option.toLowerCase())).size === options.length
    && texts.every(isPlainText) && isInLanguage(texts.join(" "), language)
    && !texts.some(text => asksForTyping.test(text) || asksForPersonalDetails.test(text) || usesMedicalWording.test(text) || claimsDiagnosis(text) || givesTreatmentAdvice(text));
  return sound ? { ok: true, done: false, title, options } : { ok: false, reason: "bad-question" };
}

// ----------------------------------------------------------------------------------------------------- the review

// Why: a review names risk factors a person could raise with a professional. It never scores, never gives a chance, and never
// says what the person's own risk is, because a model cannot know it and a number or a label would be taken as a verdict.
const personalRisk: RegExp[] = [
  phrase("risk score|probabilit(?:y|ies)|odds|likelihood|percent|per cent|chances?\\s+of"),
  /%/,
  phrase("your\\s+" + gap(2) + "risk(?!\\s+factors?)"),
  phrase("you\\s+" + gap(3) + "(?:higher|increased|elevated|greater|raised|lower|reduced|high|low)\\s+risk(?!\\s+factors?)"),
  phrase("you(?:'re|\\s+are)\\s+(?:more|less)\\s+likely"),
  phrase("you(?:'re|\\s+are)\\s+(?:\\p{L}+\\s+)?likely\\s+to"),
  phrase("riskisi|riskipiste\\p{L}*|todennäköisyy\\p{L}*|prosentti\\p{L}*|prosentin"),
  phrase("sinulla\\s+" + gap(3) + "(?:suurentunut|kohonnut|suurempi|pienempi|korkea|matala)\\s+riski"),
  phrase("olet\\s+riskiryhmä\\p{L}*"),
  phrase("olet\\s+(?:\\p{L}+\\s+)?todennäköisesti"),
];

/** The review is a little longer than a chat answer, and every claim pattern of the chat applies, with these added. */
export const reviewRules: AnswerRules = { maxLength: 1400, refuse: personalRisk };
