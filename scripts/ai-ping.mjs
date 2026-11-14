// Live check of the Gemini model code. Run it with: node scripts/ai-ping.mjs
// It reads GEMINI_API_KEY and GEMINI_MODEL from .env.docker into this process's memory (nothing is written and nothing is
// added to the environment) and makes one real call with two invented passages. It prints the outcome, the time and whether
// the JSON parsed and validated. It never prints the key, the prompt or the answer.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";

const wanted = ["GEMINI_API_KEY", "GEMINI_MODEL"];
const env = { CHAT_PROVIDER: "gemini" };
const file = readFileSync(fileURLToPath(new URL("../.env.docker", import.meta.url)), "utf8");
for (const line of file.replace(/^\ufeff/, "").split(/\r?\n/)) {
  const match = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
  if (match && wanted.includes(match[1])) env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
}

const { generateGroundedAnswer, modelFromEnv } = await tsImport("../src/lib/ai/index.ts", import.meta.url);
const model = modelFromEnv(env);
if (!model) {
  console.log("ai-ping: not configured (GEMINI_API_KEY or GEMINI_MODEL is missing or invalid in .env.docker)");
  process.exit(1);
}

const passages = [
  { id: "ping:meetings", topic: "example", heading: "Meetings", text: "The Moonbridge Walking Club meets on Tuesdays and Thursdays at 17. New members are welcome at any meeting." },
  { id: "ping:route", topic: "example", heading: "The usual route", text: "The usual route follows the river path and is 4 kilometres long. It is flat, and a bench stands halfway." },
];
const started = performance.now();
const result = await generateGroundedAnswer({ model, question: "When does the walking club meet?", language: "en", passages });
const ms = Math.round(performance.now() - started);

// "unavailable" means no JSON came back at all. Any other reason means JSON arrived and a check refused it.
const parsed = result.ok || result.reason !== "unavailable";
console.log("ai-ping:", result.ok ? "ok" : "failed (" + result.reason + ")", "|", ms + " ms", "| JSON parsed:", parsed ? "yes" : "no", "| validated:", result.ok ? "yes" : "no");
process.exitCode = result.ok ? 0 : 1;
