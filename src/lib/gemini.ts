import { z } from "zod";

const envelope = z.object({
  candidates: z.tuple([z.object({
    finishReason: z.literal("STOP"),
    content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }),
  })]),
});

export async function geminiOrder<T extends string>(
  config: { apiKey?: string; model?: string },
  topic: string,
  sections: readonly T[],
  request: typeof fetch = fetch,
  instruction = "Order the supplied public education section IDs for a cancer information card. Return every ID exactly once. Provide no medical advice or other text.",
): Promise<T[] | null> {
  if (!config.apiKey || !config.model || !/^gemini-[a-z0-9.-]+$/.test(config.model)) return null;
  try {
    const response = await request("https://generativelanguage.googleapis.com/v1beta/models/" + config.model + ":generateContent", {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6500),
      headers: { "x-goog-api-key": config.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ topic, sections }) }] }],
        generationConfig: {
          maxOutputTokens: 1024, responseMimeType: "application/json",
          responseJsonSchema: { type: "object", properties: { order: { type: "array", items: { type: "string", enum: sections }, minItems: sections.length, maxItems: sections.length } }, required: ["order"], additionalProperties: false },
        },
      }),
    });
    if (!response.ok) return null;
    const parsed = envelope.parse(await response.json());
    const json = parsed.candidates[0].content.parts.filter(part => !part.thought).map(part => part.text ?? "").join("");
    const { order } = z.object({ order: z.array(z.string()).length(sections.length) }).strict().parse(JSON.parse(json));
    if (new Set(order).size !== sections.length || order.some(id => !sections.some(section => section === id))) return null;
    return order as T[];
  } catch { return null; }
}
