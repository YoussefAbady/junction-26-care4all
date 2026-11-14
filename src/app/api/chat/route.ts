import { currentAccount, privateJson, refuseOrigin, sameOrigin } from "@/lib/account-session";
import { allow, chosenProvider, modelFromEnv } from "@/lib/ai";
import { answerChat, chatInput, planChat } from "@/lib/chat";
import { loadChatContext } from "@/lib/chat-context";
import { journeyInput } from "@/lib/chat-journey";
import { actionFor, handleJourney } from "@/lib/chat-journey-store";
import { chatReply } from "@/lib/chat-reply";
import { contentStore } from "@/lib/content";

// nginx cuts a proxied request at 30 seconds and the PWA has no timeout of its own, so a whole chat request, including a
// model writing the reply, must be over well before that. The signal also ends the request if the person leaves.
const requestSeconds = 20;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return refuseOrigin(request);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return privateJson({ error: "invalid" }, 415);
  const deadline = AbortSignal.any([AbortSignal.timeout(requestSeconds * 1000), request.signal]);
  try {
    const account = await currentAccount();
    if (!account) return privateJson({ error: "expired" }, 401);
    const raw = await request.text();
    if (raw.length > 8192) return privateJson({ error: "invalid" }, 413);
    const body: unknown = JSON.parse(raw);
    const journey = journeyInput.safeParse(body);
    if (journey.success) return await handleJourney(account, journey.data);
    const parsed = chatInput.safeParse(body);
    if (!parsed.success) return privateJson({ error: "invalid" }, 400);
    const initial = planChat(parsed.data);
    if (initial.kind !== "emergency" && /^(get to know (me|you)|(?:start|resume|continue) (?:my |the )?(?:survey|intake)|(?:aloita|jatka) esitietoja)[.!?]*$/i.test(parsed.data.message)) {
      return await handleJourney(account, { action: "start_intake", language: parsed.data.language });
    }
    if (initial.kind === "observation") {
      const result = await handleJourney(account, { action: "start_symptom", language: parsed.data.language, topic: parsed.data.topic });
      if (!result.ok) return result;
      // Keep the existing action and citations for clients that have not added chat controls yet.
      return privateJson({ ...await answerChat(contentStore(), parsed.data, initial), ...await result.json(), provider: "catalog", providerFallback: false });
    }
    const context = await loadChatContext(account, parsed.data.language, initial.kind === "education" ? initial.topic : parsed.data.topic);
    const plan = planChat(parsed.data, context);
    const nextAction = await actionFor(account, parsed.data.language);
    const provider = chosenProvider(process.env);
    return privateJson(await chatReply({
      store: contentStore(), model: modelFromEnv(process.env), chosen: provider !== null, allow, log: line => console.info(line),
      gemini: provider === "gemini" ? { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL } : undefined,
    }, { input: parsed.data, initial, plan, context, nextAction, accountKey: account.username, signal: deadline }));
  } catch (error) {
    if (error instanceof SyntaxError) return privateJson({ error: "invalid" }, 400);
    return privateJson({ error: "unavailable" }, 503);
  }
}
