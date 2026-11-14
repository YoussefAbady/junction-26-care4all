import { z } from "zod";

// The only code that talks to a model provider. It never throws, and it never logs a prompt, an answer, a key or a header:
// the one log line per call holds the provider, the outcome and the milliseconds, and nothing else.

export type JsonRequest = {
  system: string;
  user: string;
  /** The JSON Schema of the reply. Gemini enforces it. Other providers are asked for a JSON object and the guard checks the shape. */
  jsonSchema: object;
  /** Covers the model's thinking as well as its answer, so leave room for both. */
  maxOutputTokens: number;
  /** A hard limit for each attempt. */
  timeoutMs: number;
  /** Stops the call early, for example when the person leaves. */
  signal?: AbortSignal;
};

export type TextModel = {
  readonly provider: "gemini" | "verda";
  readonly name: string;
  /** The JSON the model wrote, parsed, or null for any failure. Never throws. */
  generateJson(request: JsonRequest): Promise<unknown>;
};

type Env = Readonly<Record<string, string | undefined>>;
type Reply = { text: string } | { failure: string };
type Attempt = { ok: true; value: unknown } | { ok: false; outcome: string; retry: boolean };
/** One provider: where to call, how to ask, and how to read the reply. */
type Spec = {
  provider: TextModel["provider"];
  model: string;
  url: string;
  headers: Record<string, string>;
  body(request: JsonRequest): unknown;
  read(payload: unknown): Reply;
};

const temperature = 0.2;
const retryDelayMs = 250;
const maxReplyChars = 16_000;

/** The provider CHAT_PROVIDER names: gemini or verda. Case and surrounding spaces do not matter. Anything else is null. */
export function chosenProvider(env: Env): TextModel["provider"] | null {
  const choice = env.CHAT_PROVIDER?.trim().toLowerCase();
  return choice === "gemini" || choice === "verda" ? choice : null;
}

/**
 * Picks the model from the environment. CHAT_PROVIDER=gemini uses GEMINI_API_KEY and GEMINI_MODEL, and verda uses
 * VERDA_BASE_URL, VERDA_API_KEY and VERDA_MODEL. Anything else, including catalog and unset, or a provider that is not
 * fully and safely configured, returns null, which switches the model off.
 */
export function modelFromEnv(env: Env, http: typeof fetch = fetch): TextModel | null {
  const choice = chosenProvider(env);
  const spec = choice === "gemini" ? geminiSpec(env) : choice === "verda" ? verdaSpec(env) : null;
  return spec && { provider: spec.provider, name: spec.model, generateJson: request => post(spec, http, request) };
}

async function post(spec: Spec, http: typeof fetch, request: JsonRequest): Promise<unknown> {
  const started = performance.now();
  let result: Attempt;
  try {
    result = await attemptTwice(spec, http, request);
  } catch {
    result = { ok: false, outcome: "error", retry: false };
  }
  console.info("ai provider=" + spec.provider + " outcome=" + (result.ok ? "ok" : result.outcome) + " ms=" + Math.round(performance.now() - started));
  return result.ok ? result.value : null;
}

// A second attempt only when the provider is busy (429) or failing (5xx). A timeout or a network error is not retried:
// the person has already waited the full time.
async function attemptTwice(spec: Spec, http: typeof fetch, request: JsonRequest): Promise<Attempt> {
  const first = await attempt(spec, http, request);
  if (first.ok || !first.retry) return first;
  await new Promise(resolve => setTimeout(resolve, retryDelayMs));
  return attempt(spec, http, request);
}

async function attempt(spec: Spec, http: typeof fetch, request: JsonRequest): Promise<Attempt> {
  const timeout = AbortSignal.timeout(request.timeoutMs);
  try {
    // redirect: "error" keeps the key from following a redirect to another host. cache: "no-store" keeps the call out of any cache.
    const response = await http(spec.url, {
      method: "POST", cache: "no-store", redirect: "error", headers: spec.headers, body: JSON.stringify(spec.body(request)),
      signal: request.signal ? AbortSignal.any([timeout, request.signal]) : timeout,
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined); // an error body is never read, and an unread body holds the connection
      return { ok: false, outcome: "http-" + response.status, retry: response.status === 429 || response.status >= 500 };
    }
    const reply = spec.read(await response.json());
    if ("failure" in reply) return { ok: false, outcome: reply.failure, retry: false };
    return { ok: true, value: JSON.parse(unfence(reply.text)) };
  } catch (error) {
    const outcome = timeout.aborted ? "timeout" : request.signal?.aborted ? "aborted" : error instanceof SyntaxError ? "bad-response" : "network";
    return { ok: false, outcome, retry: false };
  }
}

/** Some providers wrap JSON in a code fence even when asked for plain JSON. */
const unfence = (text: string) => /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text.trim())?.[1] ?? text;
const usable = (text: string | null | undefined): Reply => text && text.length <= maxReplyChars ? { text } : { failure: "bad-response" };

// Gemini: REST generateContent. The key goes in a header, never in the URL.
const geminiReply = z.object({
  candidates: z.array(z.object({
    finishReason: z.string().optional(),
    content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }).optional(),
  })).min(1),
});
const geminiModelName = /^gemini-[a-z0-9.-]+$/;
// Gemini 3 and later think before they answer, and the thinking counts against maxOutputTokens. A low thinking level keeps
// answers quick. Earlier models reject the setting, so it is only sent to Gemini 3 and later.
const acceptsThinkingLevel = (model: string) => Number(/^gemini-(\d+)/.exec(model)?.[1]) >= 3;

function geminiSpec(env: Env): Spec | null {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim();
  if (!apiKey || !model || !geminiModelName.test(model)) return null;
  return {
    provider: "gemini", model,
    url: "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: request => ({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: "user", parts: [{ text: request.user }] }],
      generationConfig: {
        temperature, maxOutputTokens: request.maxOutputTokens, responseMimeType: "application/json", responseJsonSchema: request.jsonSchema,
        ...(acceptsThinkingLevel(model) ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
      },
    }),
    read(payload) {
      const parsed = geminiReply.safeParse(payload);
      if (!parsed.success) return { failure: "bad-response" };
      // Anything but a finished reply (STOP) is a failure: a cut-off or blocked reply is never used.
      const [candidate] = parsed.data.candidates;
      if (candidate.finishReason !== "STOP") return { failure: "incomplete" };
      // Parts marked as thoughts are the model's reasoning, not its answer.
      return usable((candidate.content?.parts ?? []).filter(part => !part.thought).map(part => part.text ?? "").join(""));
    },
  };
}

// Verda: an OpenAI-compatible /chat/completions endpoint. Servers differ in what they accept for structured output, so the
// request asks for a JSON object, the instruction describes the shape, and the guard checks it.
const verdaReply = z.object({
  choices: z.array(z.object({ finish_reason: z.string().nullish(), message: z.object({ content: z.string().nullish() }) })).min(1),
});

/** An https address with no credentials, query or fragment in it. */
function verdaEndpoint(base: string | undefined): URL | null {
  try {
    const url = new URL((base ?? "").trim().replace(/\/+$/, "") + "/chat/completions");
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash ? url : null;
  } catch {
    return null;
  }
}

function verdaSpec(env: Env): Spec | null {
  const apiKey = env.VERDA_API_KEY?.trim();
  const model = env.VERDA_MODEL?.trim();
  const endpoint = verdaEndpoint(env.VERDA_BASE_URL);
  if (!apiKey || !model || !endpoint) return null;
  return {
    provider: "verda", model, url: endpoint.href,
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: request => ({
      model, temperature, max_tokens: request.maxOutputTokens, stream: false, response_format: { type: "json_object" },
      messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }],
    }),
    read(payload) {
      const parsed = verdaReply.safeParse(payload);
      if (!parsed.success) return { failure: "bad-response" };
      const [choice] = parsed.data.choices;
      return choice.finish_reason === "stop" ? usable(choice.message.content) : { failure: "incomplete" };
    },
  };
}
