import "server-only";
import { database } from "./database";
import { freshProgress, parseProgress, readProgress } from "./intake/progress";

type Owner = { username: string; language: string };
export async function loadSurvey(account: Owner) {
  const survey = await database().screeningSurvey.findUnique({
    where: { username: account.username }, select: { progress: true, revision: true },
  });
  return survey ? readProgress(survey.progress, survey.revision) : freshProgress(account.language === "fi" ? "fi" : "en");
}

export async function saveSurvey(username: string, raw: unknown) {
  const checked = parseProgress(raw);
  if (!checked) return { error: "invalid" as const, status: 400 };
  const progress = { ...checked, revision: checked.revision + 1 };
  const db = database();
  // Create on the first save only. A concurrent first save must lose its revision check.
  const changed = await db.$transaction(async tx => {
    const updated = await tx.screeningSurvey.updateMany({
      where: { username, revision: checked.revision },
      data: { progress, revision: progress.revision },
    });
    if (updated.count || checked.revision !== 0) return updated.count;
    const inserted = await tx.screeningSurvey.createMany({
      data: { username, progress, revision: progress.revision }, skipDuplicates: true,
    });
    return inserted.count;
  });
  return changed ? { progress } : { error: "conflict" as const, status: 409 };
}
