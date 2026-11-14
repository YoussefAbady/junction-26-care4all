import type { TextModel } from "./ai";
import { answerChat, type ChatContext, type ChatInput, type Plan } from "./chat";
import { directChat } from "./chat-director";
import { mayWriteReply, retrievalHint, writeReply, type Writing } from "./chat-model";
import type { ContentStore } from "./content/types";
import { geminiOrder } from "./gemini";

// What the chat route does once it knows the account and has read its saved context: ask a model to write the reply from
// public passages when that is allowed, run the director beside it, and build the response. It is a function of its
// dependencies so a test can run it with a fake model, an in-memory store and a fake clock.

const maxChips = 6;

export type ChatDeps = {
  store: ContentStore;
  /** The model that writes replies, or null when none is configured. */
  model: TextModel | null;
  /** True when CHAT_PROVIDER names a provider, even one that is not fully configured. */
  chosen: boolean;
  /** Where public ids go to be ordered. Gemini only. */
  gemini?: { apiKey?: string; model?: string };
  /** Whether this account may have another reply written now. It counts the request when it says yes. */
  allow: (key: string) => boolean;
  /** For the public-id ordering calls, so a test can stand in for the network. */
  http?: typeof fetch;
  log: (line: string) => void;
};

export type ChatCall = {
  input: ChatInput;
  /** The plan from the typed message alone. No account data plays a part in it, so only it decides what a model is asked. */
  initial: Plan;
  /** The plan the deterministic reply follows. It may use the account's saved topic to resolve a short follow-up. */
  plan: Plan;
  context: ChatContext;
  nextAction: Parameters<typeof directChat>[3];
  /** Names the account for the rate limit only. The limiter keeps a keyed hash of it. */
  accountKey: string;
  /** Ends the request, whatever it is waiting for. */
  signal: AbortSignal;
};

/** The public topic a model is told about: the topic of the question, or the one the screen was opened from. */
const publicTopic = (initial: Plan, input: ChatInput) => (initial.kind === "education" || initial.kind === "additional" ? initial.topic : input.topic);

/** Why a reply was or was not written by a model: a reason and nothing else, so it can be logged without the question. */
function outcome(model: TextModel | null, writing: Writing | null) {
  if (!model) return "unconfigured";
  if (!writing) return "rate-limited";
  return writing.ok ? "written" : writing.reason;
}

export async function chatReply(deps: ChatDeps, call: ChatCall) {
  const { input, initial, plan } = call;
  const eligible = mayWriteReply(initial.kind);
  const { model } = deps;
  // A request spends the account's budget only when a model is really going to be asked.
  const writing = eligible && model && deps.allow(call.accountKey)
    ? writeReply({ store: deps.store, model, message: input.message, language: input.language, topic: publicTopic(initial, input), hint: retrievalHint(initial),
      general: !(initial.kind === "education" || initial.kind === "additional"), signal: call.signal })
    : null;
  // The order of the saved sections is only asked of the provider when no reply is being written: the default order is
  // the fallback if the writing fails.
  const ordering = !writing && plan.kind === "education" && deps.gemini ? geminiOrder(deps.gemini, plan.topic, plan.sections, deps.http) : null;
  const [written, order, direction] = await Promise.all([
    writing, ordering,
    directChat(deps.store, input.language, plan.kind === "education" || plan.kind === "additional" ? plan : { kind: plan.kind }, call.nextAction, deps.gemini, deps.http),
  ]);

  const generated = written?.ok ? written.written : undefined;
  if (eligible && deps.chosen) deps.log("chat answer=" + outcome(model, written));
  // A written reply follows the plan made from the typed message alone, so the topic it was written about is public.
  const body = await answerChat(deps.store, input, generated ? initial : plan, order ?? undefined, call.context, generated);
  // The model's follow-up questions come right after the focus, then the director's other suggestions.
  const [focus, ...others] = direction.suggestedTopics;
  const chips = (generated?.followUps ?? []).map((label, index) => ({ id: "follow_up_" + (index + 1), label, request: { message: label, language: input.language } }));
  return {
    ...body, nextAction: call.nextAction, ...direction,
    ...(focus && chips.length ? { suggestedTopics: [focus, ...chips, ...others].slice(0, maxChips) } : {}),
    provider: generated ? generated.provider : order ? "gemini" : "catalog",
    providerFallback: deps.chosen && eligible && !generated,
  };
}
