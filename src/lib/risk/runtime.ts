import "server-only";
import { modelFromEnv } from "../ai";
import { allowIn } from "../ai/limits";
import { contentStore } from "../content";
import { prismaRiskRepo } from "./repo";
import type { RiskDeps } from "./service";

/** The risk code wired to the real model, content store, rate limit and database. The model is read from the environment on each call. */
export const riskDeps = (): RiskDeps => ({
  store: contentStore(), model: modelFromEnv(process.env), repo: prismaRiskRepo, allow: username => allowIn("risk", username),
});
