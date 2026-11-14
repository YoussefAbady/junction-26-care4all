// Shared language helpers. The questionnaire itself lives in ./intake.
export type Language = "en" | "fi";
export type Copy = readonly [string, string];
export const tr = (language: Language, copy: Copy) => copy[language === "fi" ? 1 : 0];
