import { z } from "zod";
import { questions, activeQuestions, relevantAnswers } from "./questionnaire";

export const kitStates = ["Not started", "Kit received", "Sample collected", "Sample returned", "Laboratory result pending", "Result recorded", "Unable to complete", "Invalid sample", "Unsure"] as const;
export const followStates = ["Not started", "Contact attempted", "Appointment booked", "Attended", "Results pending", "Clinician-advised follow-up", "Could not get an appointment", "Need help"] as const;
export const profiles = {
  aino: { name: "Aino", detail: "Explore a new care journey", answers: {} },
  mika: { name: "Mika", detail: "Explore a screening result", answers: { reason: "Screening result", age: "60–69", history: "I don’t know", screening: "Result received", region: "Helsinki-Uusimaa", language: "English" } },
  leena: { name: "Leena", detail: "Explore care team follow-up", answers: { reason: "Existing diagnosis", age: "60–69", region: "Elsewhere in Finland", language: "Finnish" } },
} as const;
export const profile = z.enum(["aino", "mika", "leena"]);
const symptomFields = z.object({
  name: z.string().trim().min(1).max(100),
  presence: z.enum(["Present", "Absent", "Not reported"]),
  onset: z.union([z.iso.date(), z.literal("")]),
  duration: z.string().trim().max(100),
  change: z.enum(["Not reported", "Unchanged", "Improving", "Worsening", "Unsure"]),
  notes: z.string().trim().max(1000),
});
export const symptom = symptomFields.extend({ id: z.uuid() });
const answerSchema = z.record(z.string(), z.string()).refine(answers =>
  Object.entries(answers).every(([key, value]) => questions.some(q => q.id === key && q.options.includes(value))));
export const stateSchema = z.object({
  profile, answers: answerSchema, step: z.number().int().min(0).max(questions.length),
  complete: z.boolean(), symptoms: z.array(symptom).max(100),
  kit: z.enum(kitStates), result: z.string().max(300), follow: z.enum(followStates),
  document: z.enum(["letter", "care"]).nullable(), questions: z.string().max(1000),
  reviewed: z.boolean(), revision: z.number().int().nonnegative(),
});
export type State = z.infer<typeof stateSchema>;
export type Symptom = z.infer<typeof symptom>;
export function initialState(key: keyof typeof profiles): State {
  return { profile: key, answers: { ...profiles[key].answers }, step: 0, complete: key !== "aino", symptoms: [], kit: "Not started", result: "", follow: "Not started", document: null, questions: "", reviewed: false, revision: 0 };
}
export const changeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("onboarding"), answers: answerSchema, step: z.number().int().min(0).max(questions.length), complete: z.boolean() }),
  z.object({ kind: z.literal("symptom"), id: z.uuid().optional(), value: symptomFields }),
  z.object({ kind: z.literal("kit"), status: z.enum(kitStates), result: z.string().trim().max(300) }).refine(value => value.status !== "Result recorded" || Boolean(value.result)),
  z.object({ kind: z.literal("follow"), status: z.enum(followStates) }),
  z.object({ kind: z.literal("document"), fixture: z.enum(["letter", "care"]).nullable() }),
  z.object({ kind: z.literal("brief"), questions: z.string().trim().max(1000), reviewed: z.boolean() }),
]);
export type Change = z.infer<typeof changeSchema>;
export function updateState(state: State, change: Change, newId: () => string): State | null {
  const next = { ...state, revision: state.revision + 1 };
  switch (change.kind) {
    case "onboarding": {
      const answers = relevantAnswers(change.answers);
      const count = activeQuestions(answers).length;
      if (change.complete && Object.keys(answers).length !== count) return null;
      return { ...next, answers, step: Math.min(change.step, count), complete: change.complete, reviewed: false };
    }
    case "symptom": {
      if (change.id && !state.symptoms.some(item => item.id === change.id)) return null;
      if (!change.id && state.symptoms.length >= 100) return null;
      const record = { ...change.value, id: change.id ?? newId() };
      return { ...next, symptoms: change.id ? state.symptoms.map(item => item.id === change.id ? record : item) : [record, ...state.symptoms], reviewed: false };
    }
    case "kit": return { ...next, kit: change.status, result: change.status === "Result recorded" ? change.result : "", reviewed: false };
    case "follow": return { ...next, follow: change.status };
    case "document": return { ...next, document: change.fixture, reviewed: false };
    case "brief": return { ...next, questions: change.questions, reviewed: change.reviewed };
  }
}
