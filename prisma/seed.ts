import "dotenv/config";
import { database } from "../src/lib/database";
import { fixtures } from "../src/lib/documents";

const db = database();
async function seed() {
  for (const [id, payload] of Object.entries(fixtures)) {
    await db.demoFixture.upsert({ where: { id }, create: { id, payload }, update: { payload } });
  }
}
seed().catch(() => { console.error("Demo fixture seed failed."); process.exitCode = 1; }).finally(() => db.$disconnect());
