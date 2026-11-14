import { currentAccount, privateJson, sameOrigin } from "@/lib/account-session";
import { answerChat, chatInput, planChat } from "@/lib/chat";
import { geminiOrder } from "@/lib/gemini";
import { loadChatContext } from "@/lib/chat-context";
import { journeyInput } from "@/lib/chat-journey";
import { actionFor, handleJourney } from "@/lib/chat-journey-store";
import { directChat } from "@/lib/chat-director";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "invalid" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return privateJson({ error: "invalid" }, 415);
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
      return privateJson({ ...answerChat(parsed.data, initial), ...await result.json(), provider: "catalog", providerFallback: false });
    }
    const context = await loadChatContext(account, parsed.data.language, initial.kind === "education" ? initial.topic : parsed.data.topic);
    const plan = planChat(parsed.data, context);
    const configured = process.env.CHAT_PROVIDER === "gemini";
    const config = configured ? { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL } : undefined;
    const nextAction = await actionFor(account, parsed.data.language);
    const [order, direction] = await Promise.all([
      plan.kind === "education" && config ? geminiOrder(config, plan.topic, plan.sections) : null,
      directChat(parsed.data.language, plan.kind === "education" || plan.kind === "additional" ? plan : { kind: plan.kind }, nextAction, config),
    ]);
    return privateJson({
      ...answerChat(parsed.data, plan, order ?? undefined, context),
      nextAction, ...direction,
      provider: order ? "gemini" : "catalog", providerFallback: configured && plan.kind === "education" && !order,
    });
  } catch (error) {
    if (error instanceof SyntaxError) return privateJson({ error: "invalid" }, 400);
    return privateJson({ error: "unavailable" }, 503);
  }
}
