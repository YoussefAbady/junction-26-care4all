import "dotenv/config";
import { reindexContent } from "../src/lib/content/seed";
import { database } from "../src/lib/database";

// Run after editing content in the database (npm run db:reindex): rebuilds the passage index from the content tables and
// publishes the edit to every cached copy (docs/content-database.md).
const db = database();
reindexContent(db).then(({ version }) => console.log("Content reindexed. Version " + version + ".")).catch(error => {
  console.error("Reindex failed: " + (error instanceof Error ? error.message : "unknown error").slice(0, 2000));
  process.exitCode = 1;
}).finally(() => db.$disconnect());
