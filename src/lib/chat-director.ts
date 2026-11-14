import { geminiOrder } from "./gemini";
import { cancerCards } from "./content/catalog";
import type { ContentStore } from "./content/types";
import { tr, type Copy, type Language } from "./survey";

type NextAction = { id: string; title: string; topic?: string };
type Plan = { kind: string; topic?: string };
type Suggestion = {
  id: string;
  label: string;
  request: { action: "start_intake" | "start_symptom"; language: Language } |
    { message: string; language: Language; topic?: string } |
    { open: "library" | "professional_options"; topic?: string };
};

export async function directChat(store: ContentStore, language: Language, plan: Plan, next: NextAction, config?: { apiKey?: string; model?: string }, request: typeof fetch = fetch) {
  const label = (copy: Copy) => tr(language, copy);
  const choices: Suggestion[] = [
    { id: "log_symptom", label: label(["Log a symptom or observation", "Kirjaa oire tai havainto"]), request: { action: "start_symptom", language } },
    { id: "prepare_visit", label: label(["Prepare questions for a professional", "Valmistele kysymyksiä ammattilaiselle"]), request: { message: label(["What should I ask at my appointment?", "Mitä kysyä vastaanotolla?"]), language } },
    { id: "find_support", label: label(["Find cancer support", "Etsi tukea syöpään liittyvissä asioissa"]), request: { message: label(["Where can I find cancer counselling?", "Mistä saan syöpäneuvontaa?"]), language } },
  ];
  const card = plan.topic ? cancerCards(await store.loadCatalog(), language, plan.topic)[0] : undefined;
  choices.unshift(card
    ? { id: "learn_topic", label: label(["Explore", "Tutustu aiheeseen"]) + " · " + card.name, request: { open: "library", topic: card.slug } }
    : { id: "learn_topic", label: label(["Explore cancer topics", "Tutustu syöpäaiheisiin"]), request: { open: "library" } });
  if (plan.kind === "observation") choices.sort((a, b) => Number(b.id === "log_symptom") - Number(a.id === "log_symptom"));
  if (plan.kind === "personal") choices.sort((a, b) => Number(b.id === "prepare_visit") - Number(a.id === "prepare_visit"));
  if (plan.kind === "intake") choices.unshift({
    id: "explain_screening", label: label(["Learn what screening is for", "Lue, mitä varten seulontoja tehdään"]),
    request: { message: label(["What is cancer screening?", "Mitä syöpäseulonta tarkoittaa?"]), language },
  });

  const primary: Suggestion = {
    id: next.id, label: next.title,
    request: next.id === "complete_intake" ? { action: "start_intake", language }
      : next.id === "contact_professional" ? { open: "professional_options" }
      : { open: "library", topic: next.topic },
  };
  if (plan.kind === "emergency") return { priority: primary, suggestedTopics: [], directorProvider: "rules", directorFallback: false };

  // Only generic, public action IDs go to the provider. The account-specific priority is pinned locally.
  const order = config ? await geminiOrder(config, "conversation_support", choices.map(choice => choice.id), request,
    "Order these public conversation actions for a supportive cancer education chat. The input sequence is the application's default order. Keep options that fit that flow near the front and offer a useful alternative. Return every supplied ID exactly once. Provide no prose or medical advice.") : null;
  const ordered = order ? order.map(id => choices.find(choice => choice.id === id)!) : choices;
  return { priority: primary, conversationFocus: ordered[0], suggestedTopics: ordered.slice(0, 3), directorProvider: order ? "gemini" : "rules", directorFallback: Boolean(config && !order) };
}
