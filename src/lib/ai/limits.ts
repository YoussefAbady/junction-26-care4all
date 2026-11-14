import { createHmac, randomBytes } from "node:crypto";

// A sliding-window limit on generations per account, so one account cannot run up the provider bill or crowd out others.
// It lives in memory and holds nothing but a keyed hash of the account and the times of its recent generations.

export type Limits = { limit: number; windowMs: number; maxKeys: number };
export type Allow = (key: string, now?: number) => boolean;

export const defaultLimits: Limits = { limit: 20, windowMs: 10 * 60_000, maxKeys: 10_000 };

/** AI_RATE_LIMIT sets the number of generations per window. Anything but a positive whole number is ignored. */
export function limitsFromEnv(env: Readonly<Record<string, string | undefined>>): Limits {
  const limit = Number(env.AI_RATE_LIMIT);
  return { ...defaultLimits, limit: Number.isInteger(limit) && limit > 0 ? limit : defaultLimits.limit };
}

/** The store is a parameter so a test can look inside it. By default each limiter has its own. */
export function createLimiter(limits: Limits, store = new Map<string, number[]>()): Allow {
  // The key is hashed with a secret that exists only in this process, so memory never holds an account id and the
  // hashes mean nothing outside it.
  const secret = randomBytes(32);
  const hash = (key: string) => createHmac("sha256", secret).update(key).digest("hex").slice(0, 32);

  function makeRoom(now: number) {
    if (store.size < limits.maxKeys) return;
    for (const [id, times] of store) if (times.every(time => time <= now - limits.windowMs)) store.delete(id);
    // Still full: forget the account that has been quiet the longest. The Map keeps its keys in order of last use.
    if (store.size >= limits.maxKeys) store.delete(store.keys().next().value!);
  }

  return (key, now = Date.now()) => {
    const id = hash(key);
    if (!store.has(id)) makeRoom(now);
    const recent = (store.get(id) ?? []).filter(time => time > now - limits.windowMs);
    const allowed = recent.length < limits.limit;
    if (allowed) recent.push(now);
    store.delete(id);
    store.set(id, recent);
    return allowed;
  };
}

// One limiter per process, shared by every route that imports this module.
const shared = globalThis as typeof globalThis & { careAiLimiter?: Allow };

/** True when this account may generate another answer now, and counts it. A refused request is not counted. */
export const allow: Allow = (shared.careAiLimiter ??= createLimiter(limitsFromEnv(process.env)));
