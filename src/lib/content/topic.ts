// The chat and the catalog call three topics by other names than the PWA does. Passages and retrieval use the PWA's ids.
const aliases: Record<string, string> = { colorectal: "bowel", ovarian: "ovary", pancreatic: "pancreas" };

/** The PWA's id for a topic id from either vocabulary. */
export const canonicalTopic = (id: string) => aliases[id] ?? id;
