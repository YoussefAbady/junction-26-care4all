import { factsOf, type Facts } from "../assess/facts";
import { livePlan } from "../intake/engine";
import type { Answers } from "../intake/types";

/**
 * The facts a model may be told about the person in the interview: the basics only (the live flow, section 5.1), through
 * src/lib/assess/facts.ts, which is the single deny-by-default place that decides what may be sent (docs/design-v2.md
 * section 3). Age in years, inFinland, the weight band and the coded basics. Never the name, the date of birth, the place
 * of residence, the height or the weight, and never anything the person typed.
 */
export const interviewFacts = (basics: Answers, now?: Date): Facts => factsOf(basics, now, livePlan);
