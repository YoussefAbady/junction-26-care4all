import { privateJson } from "@/lib/account-session";
import { allow, modelFromEnv } from "@/lib/ai";
import { assess } from "@/lib/assess";
import { contentStore } from "@/lib/content";
import { privateRoute } from "@/lib/private-route";
import { loadSurvey } from "@/lib/survey-store";

// The risk-factor review (docs/ai-review.md). Signed in, same origin, JSON of at most 8 KB. The saved intake answers are read
// here, on the server, never taken from the request. As with the chat, nginx cuts a proxied request at 30 seconds, so the
// whole request ends after 20, or when the person leaves.
const requestSeconds = 20;

export const POST = privateRoute(async (request, owner, body) => {
  const reply = await assess({
    store: contentStore(), model: modelFromEnv(process.env), allow, accountKey: owner.username,
    loadAnswers: async () => (await loadSurvey(owner)).answers,
    log: line => console.info(line),
    signal: AbortSignal.any([AbortSignal.timeout(requestSeconds * 1000), request.signal]),
  }, body);
  return privateJson(reply.body, reply.status);
}, true);
