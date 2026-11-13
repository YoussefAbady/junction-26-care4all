export const fixtures = {
  letter: { title: "Example screening letter", lines: ["Fictional screening service: FIT sample received on 6 October 2026.", "Laboratory result pending. Contact the screening service with questions."], diagnosis: false },
  care: { title: "Example clinician follow-up note", lines: ["Fictional clinician record: Colorectal cancer diagnosis confirmed.", "Follow-up plan: Bring the current medication list and questions to the next care team visit."], diagnosis: true },
};
export type Fixture = keyof typeof fixtures;
