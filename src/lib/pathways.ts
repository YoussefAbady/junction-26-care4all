import type { Answers } from "./questionnaire";
import { screeningSource } from "./sources";

export const pathwayVersion = "1.0.0";
export function nextAction(answers: Answers, complete: boolean) {
  const uncertainty = "This unvalidated demo cannot assess eligibility, interpret results, or determine urgency.";
  if (!complete) return { title: "Complete your care profile", why: "Your answers help us organise the next steps and resources you see here.", tab: "Profile", uncertainty };
  switch (answers.reason) {
    case "Symptoms": return { title: "Prepare for a GP conversation", why: "You selected symptoms as your reason for visiting. A timeline can help you describe what you’ve noticed.", tab: "GP brief", uncertainty };
    case "Screening result": return { title: "Review your screening letter", why: "You selected screening results. Bring the original letter and your questions to the screening provider.", tab: "GP brief", source: screeningSource, uncertainty };
    case "Existing diagnosis": return { title: "Gather your follow-up questions", why: "You selected an existing diagnosis. Keep the follow-up instructions from your care team handy.", tab: "Follow-up", uncertainty };
    case "Prevention": return { title: "Check your screening information", why: answers.screening === "I don’t know" || !answers.screening ? "Your screening status is uncertain. Check for an invitation or ask your local screening provider." : "You selected prevention. Review official screening information and any invitation you received.", tab: "Home sampling", source: screeningSource, uncertainty };
    default: return { title: "Review your care profile", why: "Your reason for visiting is uncertain.", tab: "Profile", uncertainty };
  }
}
