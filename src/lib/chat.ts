import { z } from "zod";
import { cancerCards } from "./content/catalog";
import type { ContentStore } from "./content/types";
import { tr } from "./survey";

import { cancerTopic, cancerTopics as topics } from "./design-contract";
import { createEvidence, rankedSources, type GeneralIntent, type Passage } from "./chat-evidence";
import { mayWriteReply, type WrittenReply } from "./chat-model";
import type { summarizeChatContext } from "./chat-personalization";
const sections = ["awareness", "symptoms", "selfExamination", "homeKit", "riskFactors"] as const;
export const chatInput = z.object({
  message: z.string().trim().min(1).max(1500),
  language: z.enum(["en", "fi"]),
  topic: cancerTopic.optional(),
  mode: z.enum(["education", "observation"]).default("education"),
}).strict();
export type ChatInput = z.infer<typeof chatInput>;
type Section = typeof sections[number];

const topicTerms: Record<typeof topics[number], RegExp> = {
  breast: /breast|mammogra|rintasyö|rintojen|rinnassa/,
  colorectal: /colorectal|bowel|colon cancer|\bfit\b|suolisto|suolisyö|ulostenäyt/,
  cervical: /cervic|\bhpv\b|kohdunkaul|papakoe/,
  skin: /skin cancer|melanoma|moles?|ihosyö|melanoom|luom/,
  prostate: /prostat|\bpsa\b|eturauh/,
  testicular: /testicular|testicl|kivessyö|kiveksen/,
};
const sectionTerms: Record<Section, RegExp> = {
  awareness: /screening|seulon|what is|mikä on|prevention|ehkäisy|mammogra/,
  symptoms: /symptom|signs|oire|merkkejä/,
  selfExamination: /self[ -]?(exam|check)|omatark|itsetutk|tunnustel/,
  homeKit: /\bfit\b|kit|stool sample|self.sampl|laborator|kotitest|ulostenäyt|näytteenot/,
  riskFactors: /risk|causes|aiheutta/,
};
// Cancer types the chat answers about without a catalog card. Their passages and names are content in the database.
const additionalTopicTerms = {
  lung: /lung cancer|keuhkosyö/,
  ovarian: /ovarian cancer|munasarjasyö/,
  pancreatic: /pancreatic cancer|haimasyö/,
};
type AdditionalTopic = keyof typeof additionalTopicTerms;
export type ChatContext = ReturnType<typeof summarizeChatContext>;

export function planChat(input: ChatInput, context?: ChatContext) {
  const message = input.message.normalize("NFKC").toLowerCase();
  // Recognise explicit emergency wording. The general safety notice also appears on every reply.
  if (/\b(emergency|call 112|can['’]?t breathe|cannot breathe|severe chest pain)\b|en saa henkeä|vaikea hengitysvaikeus|voimakas rintakipu|hätätilanne/.test(message)) return { kind: "emergency" } as const;
  if (input.mode === "observation" || /\b(log|record|save) (a |an |my |this )?(symptom|observation|note)|kirjaa|tallenna/.test(message)) return { kind: "observation" } as const;
  if (/\b(do i (have|need|qualify)|am i eligible|my (risk|result|diagnosis|symptoms?|notes?|records?|self.check)|should i (stop|start|take|change)|diagnose me|is this cancer|what does my|i (have|feel|noticed|found|am experiencing))\b|onko minulla|tarvitsenko|tulokseni|riskini|oireeni|merkintäni|pitäisikö minun|minulla on|huomasin/.test(message)) return { kind: "personal" } as const;

  const general = (intent: GeneralIntent) => ({ kind: "general", intent } as const);
  if (/coping|counsell|counsel|emotional support|support group|peer support|vertaist|neuvont|jaksami/.test(message)) return general("support");
  if (/appointment|what (should|can) i ask|talk to (my|a) (doctor|nurse)|vastaanot|kysyä lääkär/.test(message)) return general("appointment");
  if (/survivorship|life after (cancer|treatment)|seuranta hoidon jälkeen|elämä syövän jälkeen/.test(message)) return general("follow-up");
  const extraTopics = (Object.keys(additionalTopicTerms) as AdditionalTopic[]).filter(topic => additionalTopicTerms[topic].test(message));
  if (extraTopics.length === 1) {
    const focus = sectionTerms.symptoms.test(message) ? "symptoms" : sectionTerms.riskFactors.test(message) ? "riskFactors" : "overview";
    return { kind: "additional", topic: extraTopics[0], focus } as const;
  }
  if (extraTopics.length > 1) return general("guides");

  const matches = topics.filter(topic => topicTerms[topic].test(message));
  const savedTopic = topics.find(topic => topic === context?.relatedTopic);
  const followUp = /^(and |what about |how about |entä |mitä sitten)/.test(message);
  const topic = matches.length === 1 ? matches[0] : matches.length === 0 ? input.topic ?? (followUp ? savedTopic : undefined) : undefined;
  const requested = sections.filter(section => sectionTerms[section].test(message));
  if (topic && requested.length) return { kind: "education", topic, sections: requested } as const;
  if (matches.length > 1) return { kind: "clarify" } as const;
  if (!topic && /preven|prevent|tobacco|alcohol|liikunta|alkohol|ehkäis|tupak/.test(message)) return general("prevention");
  if (!topic && /screening|seulon/.test(message)) return general("screening");
  if (!topic && /symptom|signs|oire/.test(message)) return general("symptoms");
  if (!topic && /cancer|syöp/.test(message)) return { kind: "clarify" } as const;
  if (topic) return { kind: "education", topic, sections: ["awareness"] as Section[] } as const;
  return { kind: "unsupported" } as const;
}
export type Plan = ReturnType<typeof planChat>;

/**
 * The reply for a plan. With `generated`, a reply a model wrote from public passages (see chat-model.ts), the passages are
 * exactly the ones it cites and the reply carries the written text. Without it, or for a kind a model never writes, the
 * reply is the deterministic one, exactly as it was before models wrote replies.
 */
export async function answerChat(store: ContentStore, input: ChatInput, plan: Plan, ordered?: readonly Section[], context?: ChatContext, generated?: WrittenReply) {
  const evidence = createEvidence(await store.loadEvidence());
  const written = generated && mayWriteReply(plan.kind) ? generated : undefined;
  const writtenPassages = written?.cited.map(item => item.passage);
  const t = (en: string, fi: string) => tr(input.language, [en, fi]);
  const safety = {
    text: t("This chat provides general information and is not monitored. In an emergency in Finland, call 112.", "Keskustelu tarjoaa yleistä tietoa, eikä sitä seurata. Soita Suomessa hätätilanteessa numeroon 112."),
    source: evidence.emergency(input.language, false).sources[0],
  };
  const outside = context?.outsideFinland ?? false;
  const careOptions = () => evidence.careOptions(input.language, outside);
  const nextSteps = plan.kind === "emergency" ? [] : [
    careOptions(),
    ...(plan.kind === "personal" || plan.kind === "general" || context?.hasCareHistory || context?.patientReported.observations.length ? [evidence.visitPreparation(input.language)] : []),
  ];
  function reply(message: string, passages: Passage[], topic: string | null = null, action: { type: string; phone?: string } | null = null) {
    const cite = (passage: Passage) => ({ ...passage, sources: rankedSources(passage.sources) });
    const citedPassages = passages.map(cite);
    const citedNextSteps = nextSteps.map(cite).filter(step => !passages.some(passage => passage.id === step.id));
    const sources = rankedSources([...passages, ...citedNextSteps].flatMap(passage => passage.sources).concat(safety.source));
    return {
      kind: plan.kind, language: input.language, safety, topic, action, message,
      passages: citedPassages, nextSteps: citedNextSteps, sources,
      patientContext: plan.kind === "emergency" ? null : context?.patientReported ?? null,
      questionsForProfessional: plan.kind === "emergency" ? [] : context?.questionsForProfessional ?? [],
      // Explicitly shareable copy excludes the account's records and prompts. A written reply says so, with the cited sources.
      shareText: (written ? [
        written.text + " " + [...new Set(citedPassages.flatMap(passage => passage.sources.map(source => sources.findIndex(s => s.url === source.url) + 1)))]
          .sort((a, b) => a - b).map(number => "[" + number + "]").join(" "),
        t("Written by an AI from the sources listed here.", "Tekoäly kirjoitti tämän tässä lueteltujen lähteiden perusteella."),
        safety.text + " [" + (sources.findIndex(source => source.url === safety.source.url) + 1) + "]",
        ...sources.map((source, index) => "[" + (index + 1) + "] " + source.title + " — " + source.url),
      ] : [message, ...[...citedPassages, ...citedNextSteps].flatMap(passage =>
        passage.items.map(item => item + " " + passage.sources.map(source => "[" + (sources.findIndex(s => s.url === source.url) + 1) + "]").join(" "))),
        safety.text + " [" + (sources.findIndex(source => source.url === safety.source.url) + 1) + "]",
        ...sources.map((source, index) => "[" + (index + 1) + "] " + source.title + " — " + source.url),
      ]).join("\n\n"),
      ...(written ? { generated: { text: written.text, citations: written.cited.map(item => item.passage.id), provider: written.provider, model: written.model } } : {}),
    };
  }
  switch (plan.kind) {
    case "education": {
      const [card] = cancerCards(await store.loadCatalog(), input.language, plan.topic);
      return reply(card.name, writtenPassages ?? (ordered ?? plan.sections).map(id => ({ id, ...card[id] })), plan.topic);
    }
    case "general":
      return reply(t("Information and support", "Tietoa ja tukea"), writtenPassages ?? [evidence.generalEvidence(input.language, plan.intent)]);
    case "additional": {
      const { heading, passage } = evidence.additionalEvidence(input.language, plan.topic, plan.focus);
      return reply(heading, writtenPassages ?? [passage], plan.topic);
    }
    case "emergency":
      return reply(t("Emergency help", "Hätäapu"), [evidence.emergency(input.language, outside)], null, outside ? { type: "emergency" } : { type: "emergency", phone: "112" });
    case "observation":
      return reply(t("You can save what you noticed as a private observation. Review your entry before saving.", "Voit tallentaa havaintosi yksityisenä merkintänä. Tarkista merkintä ennen tallennusta."),
        [evidence.visitPreparation(input.language)], null, { type: "open_observation" });
    case "personal":
      return reply(t("A healthcare professional can assess your symptoms, results, or personal screening questions. This chat offers general information only.", "Terveydenhuollon ammattilainen voi arvioida oireesi, tuloksesi tai henkilökohtaiset seulontakysymyksesi. Tämä keskustelu tarjoaa vain yleistä tietoa."),
        outside ? [careOptions()] : [careOptions(), evidence.counselling(input.language)]);
    default:
      // A written reply to a question the planner could not route is headed by the first passage it cites, not by the apology.
      if (written && writtenPassages) return reply(written.cited[0].heading, writtenPassages);
      return reply(t("I don’t have a sourced answer to that question. Ask about screening, possible symptoms, home sampling, or risk factors for a cancer topic in the library.", "Minulla ei ole lähteisiin perustuvaa vastausta tähän kysymykseen. Kysy kirjaston syöpäaiheiden seulonnasta, mahdollisista oireista, kotinäytteenotosta tai riskitekijöistä."),
        [{ id: "screening", items: [], sources: evidence.generalEvidence(input.language, "screening").sources }]);
  }
}
