import "dotenv/config";
import { seedContent } from "../src/lib/content/seed";
import { database } from "../src/lib/database";
import { fixtures } from "../src/lib/documents";

// Run on every release (npm run db:release). Both parts are idempotent: the demo fixtures are upserted, and the content
// is replaced only when the seed input changed since it was last loaded (docs/content-database.md).
const db = database();
async function seed() {
  for (const [id, payload] of Object.entries(fixtures)) {
    await db.demoFixture.upsert({ where: { id }, create: { id, payload }, update: { payload } });
  }
  const content = await seedContent(db);
  console.log(content === "seeded" ? "Content loaded." : "Content is up to date.");
}
seed().catch(error => {
  // Seed and database errors name tables and ids, never credentials or personal data.
  console.error("Seed failed: " + (error instanceof Error ? error.message : "unknown error").slice(0, 2000));
  process.exitCode = 1;
}).finally(() => db.$disconnect());
