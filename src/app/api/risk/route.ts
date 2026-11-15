import { after } from "next/server";
import { privateJson } from "@/lib/account-session";
import { privateRoute } from "@/lib/private-route";
import { riskDeps } from "@/lib/risk/runtime";
import { readRisk, startRisk } from "@/lib/risk/service";

// The AI risk assessment (docs/design-v2.md section 6.2). Signed in; POST also same origin and JSON. Thin: the logic is in
// src/lib/risk/service.ts. POST answers at once with the running assessment, and the job runs after the response.

export const GET = privateRoute(async (_request, owner) => {
  const reply = await readRisk(riskDeps(), owner);
  return privateJson(reply.body, reply.status);
});

export const POST = privateRoute(async (_request, owner, body) => {
  const reply = await startRisk(riskDeps(), owner, body);
  if (reply.work) after(reply.work);
  return privateJson(reply.body, reply.status);
}, true);
