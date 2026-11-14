import { modelFromEnv } from "./ai";

/**
 * Which provider answers are written by and whether a model can be called, for /api/health. It reports the model's name,
 * never a key. CHAT_PROVIDER=catalog, the default, calls no model. A provider that is chosen but not fully configured is
 * reported with configured false, and answers then fall back to the reviewed passages.
 */
export function aiStatus(env: Record<string, string | undefined> = process.env) {
  const choice = env.CHAT_PROVIDER?.trim().toLowerCase();
  const model = modelFromEnv(env);
  return { provider: choice === "gemini" || choice === "verda" ? choice : "catalog", model: model?.name ?? null, configured: model !== null };
}
