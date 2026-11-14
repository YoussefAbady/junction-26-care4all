import { database } from "../database";
import { databaseContentStore } from "./store";
import type { ContentStore } from "./types";

const shared = globalThis as typeof globalThis & { careContent?: ContentStore };

/** The content store the routes and chat read from: PostgreSQL, one instance per process so its cache is shared. */
export function contentStore(): ContentStore {
  return shared.careContent ??= databaseContentStore(database);
}
