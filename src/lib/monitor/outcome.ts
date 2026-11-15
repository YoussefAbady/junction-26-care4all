import { chatInput, planChat } from "../chat";
import { noteDetails } from "../design-contract";
import type { ContentStore } from "../content/types";
import type { Lang } from "./assess";
import { startWatchOnce, type Client } from "./store";
import { triageSymptom, type SymptomOutcome } from "./triage";

/**
 * The outcome of a saved symptom note (save_symptom): the existing emergency detection first, then the database rules of
 * monitorRules.triage. A watch outcome starts the watch. Never throws: when the rules cannot be loaded the answer is the
 * conservative one, see a doctor (or emergency, when the emergency detection fired), with no explanation lines.
 */
export async function symptomOutcome(
  client: Client, store: ContentStore, username: string, note: { id: string; label: string; notes: string; details: unknown }, lang: Lang,
): Promise<SymptomOutcome> {
  const emergency = [note.label, note.notes].some(text => {
    const message = chatInput.safeParse({ message: text, language: lang });
    return message.success && planChat(message.data).kind === "emergency";
  });
  try {
    const content = await store.loadMonitor();
    const details = noteDetails.safeParse(note.details).data;
    const outcome = triageSymptom(content.rules, { label: note.label, notes: note.notes, ...details }, lang, emergency);
    if (outcome.level === "watch" && details?.course !== "gone") await startWatchOnce(client, content, username, note.id);
    return outcome;
  } catch {
    return emergency ? { level: "emergency", urgency: "today", why: [] } : { level: "doctor", urgency: "weeks", why: [] };
  }
}
