import { currentAccount, privateJson, refuseOrigin, sameOrigin } from "@/lib/account-session";
import { loadSurvey, saveSurvey } from "@/lib/survey-store";

export async function GET() {
  try {
    const account = await currentAccount();
    return account ? privateJson({ progress: await loadSurvey(account) }) : privateJson({ error: "expired" }, 401);
  } catch { return privateJson({ error: "unavailable" }, 503); }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return refuseOrigin(request);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return privateJson({ error: "invalid" }, 415);
  try {
    const account = await currentAccount();
    if (!account) return privateJson({ error: "expired" }, 401);
    const body = await request.text();
    if (body.length > 128 * 1024) return privateJson({ error: "invalid" }, 413);
    const { progress } = JSON.parse(body) ?? {};
    const result = await saveSurvey(account.username, progress);
    return "error" in result ? privateJson({ error: result.error }, result.status) : privateJson(result);
  } catch (error) {
    if (error instanceof SyntaxError) return privateJson({ error: "invalid" }, 400);
    return privateJson({ error: "unavailable" }, 503);
  }
}
