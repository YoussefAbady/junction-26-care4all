// The model layer's public surface. Everything else in this folder is internal.
export { generateGroundedAnswer, type Failure, type GroundedAnswer, type GroundedInput } from "./answer";
export { allow, type Allow } from "./limits";
export { chosenProvider, modelFromEnv, type TextModel } from "./models";
export type { AnswerLanguage, SourcePassage } from "./prompt";
