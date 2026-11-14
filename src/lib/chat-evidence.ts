import { tr, type Copy, type Language } from "./survey";

export type Citation = { title: string; url: string; language: string; retrieved: string };
export type Tier = "finland" | "europe" | "international";
export type Passage = { id: string; items: string[]; sources: Citation[]; status?: string };
const tierOrder: Tier[] = ["finland", "europe", "international"];
const tiers: Record<string, Tier> = {
  "cancerregistry.fi": "finland", "syoparekisteri.fi": "finland", "www.terveyskirjasto.fi": "finland",
  "allaboutcancer.fi": "finland", "kaikkisyovasta.fi": "finland", "www.suomi.fi": "finland",
  "cancer-code-europe.iarc.who.int": "europe", "www.esmo.org": "europe", "digital-strategy.ec.europa.eu": "europe",
  "www.cancer.gov": "international",
};
export function rankedSources(sources: Citation[]) {
  return [...new Map(sources.map(source => [source.url, source])).values()].flatMap(source => {
    const tier = tiers[new URL(source.url).hostname];
    return tier ? [{ ...source, tier }] : [];
  }).sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
}
export function preferredEvidence(candidates: Passage[]) {
  return [...candidates].sort((a, b) => {
    const rank = (passage: Passage) => {
      const first = rankedSources(passage.sources)[0];
      return first ? tierOrder.indexOf(first.tier) : tierOrder.length;
    };
    return rank(a) - rank(b);
  })[0];
}
export function citation(title: string, url: string, language = "en"): Citation {
  return { title, url, language, retrieved: "2026-11-14" };
}
export const registry = citation("Finnish Cancer Registry · Screening", "https://cancerregistry.fi/screening/");
export const emergencySource = citation("Suomi.fi · Emergency number 112", "https://www.suomi.fi/citizen/safety-and-security/emergencies-and-security/guide/what-to-do-in-an-emergency/call-112-in-an-emergency");
export const europeanEmergencySource = citation("European Commission · 112 emergency number", "https://digital-strategy.ec.europa.eu/en/policies/112");
const healthCentre = citation("Suomi.fi · Choosing a health and social services centre", "https://www.suomi.fi/citizen/health-and-medical-care/falling-ill-and-rehabilitation/guide/choosing-a-place-of-treatment/choosing-a-health-and-social-services-centre");
const symptomGuide = citation("Cancer Society of Finland · Possible cancer symptoms", "https://kaikkisyovasta.fi/tietoa-syovasta/mika-on-syopa/syovan-oireet/", "fi");
const conversationGuide = citation("National Cancer Institute · Talking with your health care team", "https://www.cancer.gov/about-cancer/coping/adjusting-to-cancer/talk-with-doctors");
const europeanCode = citation("IARC · European Code Against Cancer", "https://cancer-code-europe.iarc.who.int/");
const europeanGuides = citation("European Society for Medical Oncology · Patient guides", "https://www.esmo.org/for-patients/patient-guides/patient-guides-by-language/cancer-patient-guides-in-english?page=1");
const nationalPrevention = citation("Cancer Society of Finland · Reducing cancer risk", "https://kaikkisyovasta.fi/syopa-lehti/syopariskin-vahentaminen-ei-ole-vain-yksilon-vastuulla/", "fi");
const survivorship = citation("ESMO and ECPC · Survivorship guide", "https://www.esmo.org/content/download/117593/2061518/file/esmo-patient-guide-survivorship.pdf");
export const additionalTopics = {
  lung: {
    terms: /lung cancer|keuhkosyö/,
    name: ["Lung cancer", "Keuhkosyöpä"] as Copy,
    url: "https://kaikkisyovasta.fi/tietoa-syovasta/syopataudit/keuhkosyopa/",
    symptoms: ["Possible symptoms include a persistent cough and coughing up blood.", "Mahdollisia oireita ovat pitkittynyt yskä ja veriset yskökset."] as Copy,
    riskFactors: ["Smoking is a major risk factor for lung cancer.", "Tupakointi on merkittävä keuhkosyövän riskitekijä."] as Copy,
  },
  ovarian: {
    terms: /ovarian cancer|munasarjasyö/,
    name: ["Ovarian cancer", "Munasarjasyöpä"] as Copy,
    url: "https://kaikkisyovasta.fi/tietoa-syovasta/syopataudit/munasarjasyopa/",
    symptoms: ["Possible changes include abdominal bloating, a feeling of fullness, or abdominal discomfort.", "Mahdollisia oireita ovat vatsan turvotus, täyteläisyyden tunne ja vatsavaivat."] as Copy,
    riskFactors: ["Ovarian cancer in a close relative can be relevant to a discussion about family history.", "Lähisukulaisella todettu munasarjasyöpä on hyvä mainita, kun keskustelet suvun syöpähistoriasta."] as Copy,
  },
  pancreatic: {
    terms: /pancreatic cancer|haimasyö/,
    name: ["Pancreatic cancer", "Haimasyöpä"] as Copy,
    url: "https://kaikkisyovasta.fi/tietoa-syovasta/syopataudit/haimasyopa/",
    symptoms: ["Possible symptoms include upper abdominal or back pain, weight loss, and jaundice.", "Mahdollisia oireita ovat ylävatsa- tai selkäkipu, laihtuminen ja keltaisuus."] as Copy,
    riskFactors: ["Smoking and chronic pancreatitis are among the known risk factors.", "Tupakointi ja krooninen haimatulehdus kuuluvat tunnettuihin riskitekijöihin."] as Copy,
  },
};
export function additionalEvidence(language: Language, topic: keyof typeof additionalTopics, focus: "symptoms" | "riskFactors" | "overview") {
  const entry = additionalTopics[topic];
  const reference = citation("Cancer Society of Finland · " + tr(language, entry.name), entry.url, "fi");
  const overview: Copy = ["The Cancer Society of Finland has an overview of this cancer type. You can use it to prepare questions for a healthcare professional.", "Syöpäjärjestöillä on tietoa tästä syöpätyypistä. Voit käyttää sitä kysymysten valmisteluun terveydenhuollon ammattilaiselle."];
  return evidence(topic + "-" + focus, language, focus === "overview" ? overview : entry[focus], reference);
}

export function evidence(id: string, language: Language, text: Copy, source: Citation): Passage {
  return { id, items: [tr(language, text)], sources: [source] };
}
export function careOptions(language: Language, outsideFinland: boolean) {
  if (outsideFinland) return evidence("professional-care", language,
    ["Contact your local healthcare service or existing care team about symptoms or results. Write down what you want to ask before your visit.",
      "Ota oireista tai tuloksista yhteyttä paikalliseen terveyspalveluun tai hoitotiimiisi. Kirjaa kysymyksesi ennen käyntiä."], conversationGuide);
  return evidence("professional-care", language,
    ["For non-emergency health concerns in Finland, your health and social services centre is a place to contact. If you already have a care team, you can ask them who to contact about your concern.",
      "Suomessa voit ottaa kiireettömissä terveyshuolissa yhteyttä sosiaali- ja terveyskeskukseen. Jos sinulla on jo hoitotiimi, voit kysyä sieltä, keneen kannattaa ottaa yhteyttä."], healthCentre);
}
export function counselling(language: Language) {
  return evidence("cancer-support", language,
    ["The Cancer Society of Finland offers counselling from cancer nurses for people with questions or worries about cancer.",
      "Syöpäjärjestöjen neuvontahoitajat tarjoavat tukea ja neuvontaa, kun syöpä mietityttää."],
    language === "fi"
      ? citation("Syöpäjärjestöt · Kysy neuvontahoitajalta", "https://kaikkisyovasta.fi/palvelut/kysy-neuvontahoitajalta/", "fi")
      : citation("Cancer Society of Finland · Ask for advice", "https://allaboutcancer.fi/services/ask-for-advice/"));
}
export function visitPreparation(language: Language) {
  return evidence("visit-preparation", language,
    ["Write down your main concern and questions before the visit. Ask your clinician to explain unfamiliar terms and whom to contact with follow-up questions.",
      "Kirjaa tärkein huolesi ja kysymyksesi ennen vastaanottoa. Pyydä ammattilaista selittämään vieraat termit ja kertomaan, keneen voit ottaa yhteyttä jatkokysymyksissä."], conversationGuide);
}
export function generalEvidence(language: Language, intent: "symptoms" | "prevention" | "guides" | "appointment" | "support" | "screening" | "follow-up") {
  switch (intent) {
    case "symptoms": return evidence(intent, language,
      ["Possible cancer symptoms can also have other causes. A healthcare professional can assess a new or unexplained change.", "Mahdollisilla syöpäoireilla voi olla muitakin syitä. Terveydenhuollon ammattilainen voi arvioida uuden tai selittämättömän muutoksen."], symptomGuide);
    case "prevention": return preferredEvidence([
      evidence(intent, language, ["Tobacco, alcohol, diet, and physical activity are among the factors discussed in cancer prevention guidance.", "Tupakka, alkoholi, ravitsemus ja liikunta ovat syövän ehkäisyssä käsiteltäviä tekijöitä."], nationalPrevention),
      evidence(intent, language, ["The European Code Against Cancer covers tobacco, alcohol, physical activity, food choices, and sun protection.", "Euroopan syöväntorjuntaohjeisto käsittelee tupakkaa, alkoholia, liikkumista, ruokavalintoja ja auringolta suojautumista."], europeanCode),
    ]);
    case "follow-up": return evidence(intent, language,
      ["The ESMO survivorship guide covers life after treatment and preparing for follow-up. Ask your care team for the plan that applies to you.", "ESMOn potilasopas käsittelee elämää hoitojen jälkeen ja seurantaan valmistautumista. Kysy hoitotiimiltäsi omaa suunnitelmaasi."], survivorship);
    case "guides": return evidence(intent, language,
      ["ESMO publishes patient guides on cancer types including lung, ovarian, and pancreatic cancer. These can help you prepare questions for your care team.", "ESMO julkaisee potilasoppaita muun muassa keuhko-, munasarja- ja haimasyövästä. Oppaat voivat auttaa kokoamaan kysymyksiä hoitotiimille."], europeanGuides);
    case "appointment": return visitPreparation(language);
    case "support": return counselling(language);
    case "screening": return evidence(intent, language,
      ["Finland’s national cancer screening programmes cover breast, cervical and colorectal cancer. Check your invitation or contact the screening service for details that apply to you.", "Suomen kansalliset syöpäseulonnat kattavat rinta-, kohdunkaula- ja suolistosyövän. Tarkista omat tietosi kutsusta tai kysy seulontayksiköltä."], registry);
  }
}

