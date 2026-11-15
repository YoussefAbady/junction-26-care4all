import { currentAccount, privateJson, refuseOrigin, sameOrigin } from "@/lib/account-session";
import { modelFromEnv } from "@/lib/ai";
import { allowIn as allowInBucket } from "@/lib/ai/limits";
import { contentStore } from "@/lib/content";
import { database } from "@/lib/database";
import { getInterview, maxBody, postInterview, prismaInterviewStore, requestSeconds, type Deps } from "@/lib/interview";
import { loadSurvey } from "@/lib/survey-store";

// The AI interview (docs/design-v2.md section 5.3). Signed in, same origin, JSON of at most 4 KB, never cached. The basics are
// read here from the account's saved answers, never from the request. Each model call is limited per account (allowIn) and
// the whole request ends after 20 seconds. A model failure never fails the request: the question then comes from the database.

type Owner = NonNullable<Awaited<ReturnType<typeof currentAccount>>>;
const store = prismaInterviewStore(database);
const content = () => contentStore().loadInterview();

const depsFor = (owner: Owner, signal: AbortSignal): Deps => ({
  store, loadContent: content, loadBasics: async () => (await loadSurvey(owner)).answers,
  model: modelFromEnv(process.env), allow: () => allowInBucket("interview", owner.username),
  log: line => console.info(line), signal,
});

export async function GET() {
  try {
    const owner = await currentAccount();
    if (!owner) return privateJson({ error: "expired" }, 401);
    const model = modelFromEnv(process.env);
    const reply = await getInterview({ ...depsFor(owner, AbortSignal.timeout(requestSeconds * 1000)), enabled: model !== null }, owner.username);
    return privateJson(reply.body, reply.status);
  } catch {
    return privateJson({ error: "unavailable" }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return refuseOrigin(request);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return privateJson({ error: "invalid" }, 415);
  try {
    const owner = await currentAccount();
    if (!owner) return privateJson({ error: "expired" }, 401);
    const raw = await request.text();
    if (raw.length > maxBody) return privateJson({ error: "invalid" }, 413);
    const signal = AbortSignal.any([AbortSignal.timeout(requestSeconds * 1000), request.signal]);
    const reply = await postInterview(depsFor(owner, signal), owner.username, JSON.parse(raw));
    return privateJson(reply.body, reply.status);
  } catch (error) {
    return error instanceof SyntaxError ? privateJson({ error: "invalid" }, 400) : privateJson({ error: "unavailable" }, 503);
  }
}
