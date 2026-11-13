import { fixtures } from "./documents";
import { questions, relevantAnswers } from "./questionnaire";
import type { State } from "./model";

export function briefFacts(state: State) {
  const answers = relevantAnswers(state.answers);
  return [
    ...questions.filter(q => answers[q.id]).map(q => q.label + " " + answers[q.id]),
    ...state.symptoms.map(s => [s.name, s.presence, "Onset " + (s.onset || "not reported"), "Duration " + (s.duration || "not reported"), "Change " + s.change.toLowerCase(), s.notes].filter(Boolean).join(" · ")),
    ...(state.kit !== "Not started" ? ["FIT status: " + state.kit] : []),
    ...(state.result ? ["Patient-reported result: " + state.result] : []),
  ];
}
export function briefExtracts(state: State) {
  return state.document ? fixtures[state.document].lines : [];
}
