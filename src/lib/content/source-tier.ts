import { tiers } from "../chat-evidence";
import type { SourceTier } from "./v2-types";

// The tier of a source comes from the host of its page (docs/design-v2.md Appendix A.8): the host table chat already uses, plus
// the Cancer Society's English site, which chat's own table does not have and must not gain (it would change which passages
// chat may quote). Any other host has no tier: an AI answer may not cite it.
const hostTiers: Record<string, SourceTier> = { ...tiers, "www.freefromcancer.fi": "finland" };

/** finland, europe or international by the host of the page; null for any other host. */
export function sourceTierOf(url: string): SourceTier | null {
  try {
    return hostTiers[new URL(url).hostname] ?? null;
  } catch {
    return null;
  }
}
