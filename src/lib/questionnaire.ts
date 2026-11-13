export const reasons = ["Prevention", "Symptoms", "Screening result", "Existing diagnosis"] as const;
export const questions: { id: string; label: string; options: readonly string[]; when?: readonly string[] }[] = [
  { id: "reason", label: "What brings you here?", options: reasons },
  { id: "age", label: "What is your age group?", options: ["Under 50", "50–59", "60–69", "70 or older", "I don’t know"] },
  { id: "history", label: "Is there bowel health history to share?", options: ["Bowel surgery or ongoing follow-up", "None reported by me", "I don’t know"], when: ["Prevention", "Screening result"] },
  { id: "family", label: "Has a close family member had bowel cancer?", options: ["Yes", "No", "I don’t know"], when: ["Prevention", "Symptoms"] },
  { id: "symptoms", label: "Are you experiencing symptoms?", options: ["Symptoms present", "No symptoms", "I don’t know"], when: ["Prevention", "Symptoms"] },
  { id: "screening", label: "Where are you with screening?", options: ["Invitation received", "Sample returned", "Result received", "No invitation", "I don’t know"], when: ["Prevention", "Screening result"] },
  { id: "region", label: "Which region are you in?", options: ["Helsinki-Uusimaa", "Elsewhere in Finland", "Outside Finland", "I don’t know"] },
  { id: "language", label: "Which language do you prefer for care?", options: ["English", "Finnish", "Swedish", "I don’t know"] },
];
export type Answers = Record<string, string>;
export const activeQuestions = (answers: Answers) => questions.filter(q => !q.when || q.when.includes(answers.reason));
export const relevantAnswers = (answers: Answers) => Object.fromEntries(activeQuestions(answers).filter(q => q.options.includes(answers[q.id])).map(q => [q.id, answers[q.id]]));
