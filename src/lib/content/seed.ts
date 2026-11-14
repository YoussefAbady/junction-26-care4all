import { z } from "zod";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { metaValue } from "./assemble";
import { assertConsistent } from "./check";
import { buildPassages } from "./passages";
import { toRows, type ContentRows } from "./rows";
import { contentVersion, loadSeedInput } from "./seed-input";
import { deleteContent, readRows, readVersion, writeRows, type Db } from "./store";
import type { ContentVersion, SeedInput } from "./types";

// The database side of the seed. prisma/seed.ts runs seedContent on every release (npm run db:release). It is
// idempotent: when the seed input is the one already loaded it does nothing, so edits made in the database survive.

/** Serialises seeds and reindexes: the second one waits, then finds the work done. The number is arbitrary. */
const lockKey = 7_340_211;
const transaction = { timeout: 120_000, maxWait: 30_000 } as const;

async function storedVersion(db: Db) {
  const row = await db.contentMeta.findUnique({ where: { key: "contentVersion" } });
  return typeof row?.value === "string" ? row.value : undefined;
}
const lock = (tx: Prisma.TransactionClient) => tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
async function replacePassages(tx: Prisma.TransactionClient, rows: ContentRows) {
  await tx.contentPassage.deleteMany();
  await tx.contentPassage.createMany({ data: buildPassages(rows) });
}

/**
 * Loads the content unless the database already holds this seed. ContentMeta.contentVersion is the hash of the seed input.
 * When it differs, every content table is replaced and ContentPassage rebuilt, in one transaction, so readers see the old
 * content until the new content is complete. When it matches, nothing is written.
 */
export async function seedContent(client: PrismaClient, input: SeedInput = loadSeedInput()): Promise<"seeded" | "unchanged"> {
  const version = contentVersion(input);
  const rows = toRows(input, version);
  assertConsistent(rows);
  if (await storedVersion(client) === version) return "unchanged";
  return client.$transaction(async tx => {
    await lock(tx);
    if (await storedVersion(tx) === version) return "unchanged" as const;
    await deleteContent(tx);
    await writeRows(tx, rows);
    await replacePassages(tx, rows);
    return "seeded" as const;
  }, transaction);
}

/**
 * Rebuilds ContentPassage from the content tables as they are now, edits included, and raises contentRevision so every
 * cached copy of the content is replaced. Run it after editing content in the database. Returns the new version.
 */
export async function reindexContent(client: PrismaClient): Promise<ContentVersion> {
  return client.$transaction(async tx => {
    await lock(tx);
    const rows = await readRows(tx);
    assertConsistent(rows);
    await replacePassages(tx, rows);
    const revision = metaValue(rows.meta, "contentRevision", z.number().int().nonnegative()) + 1;
    await tx.contentMeta.update({ where: { key: "contentRevision" }, data: { value: revision } });
    return readVersion(tx);
  }, transaction);
}
