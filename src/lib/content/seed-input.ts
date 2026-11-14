import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { catalogSeed } from "../../../prisma/seed-data/catalog";
import { evidenceSeed } from "../../../prisma/seed-data/evidence";
import { designSeedSchema } from "./design";
import type { SeedInput } from "./types";

/**
 * Bump this when the code that turns the seed into rows or passages changes in a way that should reload the content even
 * though the seed files did not. It is part of the hash that decides whether the seed runs.
 */
const seedFormat = 1;

/** The seed: the PWA's export from prisma/seed-data/design-content.json, the backend catalog and the chat evidence. */
export function loadSeedInput(): SeedInput {
  const file = resolve(process.cwd(), "prisma", "seed-data", "design-content.json");
  return { design: designSeedSchema.parse(JSON.parse(readFileSync(file, "utf8"))), catalog: catalogSeed, evidence: evidenceSeed };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => (a < b ? -1 : 1));
    return "{" + entries.map(([key, item]) => JSON.stringify(key) + ":" + canonicalJson(item)).join(",") + "}";
  }
  return JSON.stringify(value);
}

/** A hash of everything the seed loads. The seed runs only when this differs from the stored contentVersion. */
export function contentVersion(input: SeedInput) {
  return createHash("sha256").update(canonicalJson({ seedFormat, ...input })).digest("hex").slice(0, 16);
}
