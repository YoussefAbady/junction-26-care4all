import { memoryContentStore } from "../src/lib/content/memory-store";

// One in-memory content store, built from the seed, shared by the unit tests that need content. No database.
export const store = memoryContentStore();
