import type { EvidenceSeed, Residence, SourceSeed } from "../../src/lib/content/types";

// The passages chat answers quote, as they stood in src/lib/chat-evidence.ts and src/lib/chat.ts before the content moved
// to the database. Every page was read on 14 November 2026. Edit the database from here on: this file is only the seed
// (docs/content-database.md). Detecting what a message asks about stays in src/lib/chat.ts.

type Copy = readonly [string, string];
const retrieved = "2026-11-14";
const idOf = (name: string) => "chat-" + name;

function source(name: string, organisation: string, title: string, url: string, language: string, use: string, titleFi?: string): SourceSeed {
  return { id: idOf(name), organisation, title, ...(titleFi ? { titleFi } : {}), url, language, retrieved, use };
}

const registry = source("fcr-screening", "Finnish Cancer Registry", "Finnish Cancer Registry · Screening", "https://cancerregistry.fi/screening/", "en", "Finland’s national screening programmes");
const emergency = source("suomifi-112", "Suomi.fi", "Suomi.fi · Emergency number 112",
  "https://www.suomi.fi/citizen/safety-and-security/emergencies-and-security/guide/what-to-do-in-an-emergency/call-112-in-an-emergency", "en", "What to do in an emergency in Finland");
const europeanEmergency = source("ec-112", "European Commission", "European Commission · 112 emergency number", "https://digital-strategy.ec.europa.eu/en/policies/112", "en", "The 112 emergency number in the EU");
const healthCentre = source("suomifi-health-centre", "Suomi.fi", "Suomi.fi · Choosing a health and social services centre",
  "https://www.suomi.fi/citizen/health-and-medical-care/falling-ill-and-rehabilitation/guide/choosing-a-place-of-treatment/choosing-a-health-and-social-services-centre", "en",
  "Who to contact about a health concern that is not an emergency");
const symptomGuide = source("cs-symptoms", "Cancer Society of Finland", "Cancer Society of Finland · Possible cancer symptoms",
  "https://kaikkisyovasta.fi/tietoa-syovasta/mika-on-syopa/syovan-oireet/", "fi", "Possible cancer symptoms");
const conversationGuide = source("nci-talk-with-team", "National Cancer Institute", "National Cancer Institute · Talking with your health care team",
  "https://www.cancer.gov/about-cancer/coping/adjusting-to-cancer/talk-with-doctors", "en", "Preparing for a conversation with a care team");
const europeanCode = source("iarc-ecac", "IARC", "IARC · European Code Against Cancer", "https://cancer-code-europe.iarc.who.int/", "en", "Recommendations for lowering cancer risk");
const europeanGuides = source("esmo-patient-guides", "European Society for Medical Oncology", "European Society for Medical Oncology · Patient guides",
  "https://www.esmo.org/for-patients/patient-guides/patient-guides-by-language/cancer-patient-guides-in-english?page=1", "en", "Patient guides for several cancer types");
const nationalPrevention = source("cs-prevention", "Cancer Society of Finland", "Cancer Society of Finland · Reducing cancer risk",
  "https://kaikkisyovasta.fi/syopa-lehti/syopariskin-vahentaminen-ei-ole-vain-yksilon-vastuulla/", "fi", "Reducing cancer risk");
const survivorship = source("esmo-survivorship", "ESMO and ECPC", "ESMO and ECPC · Survivorship guide",
  "https://www.esmo.org/content/download/117593/2061518/file/esmo-patient-guide-survivorship.pdf", "en", "Life after treatment and follow-up");
const counsellingFi = source("cs-counselling-fi", "Syöpäjärjestöt", "Syöpäjärjestöt · Kysy neuvontahoitajalta", "https://kaikkisyovasta.fi/palvelut/kysy-neuvontahoitajalta/", "fi", "Counselling from cancer nurses");
const counsellingEn = source("cs-counselling-en", "Cancer Society of Finland", "Cancer Society of Finland · Ask for advice", "https://allaboutcancer.fi/services/ask-for-advice/", "en", "Counselling from cancer nurses");

// Cancer types the chat answers about without a catalog card. The words that recognise them stay in src/lib/chat.ts.
const additional = [
  {
    id: "lung", topic: "lung", name: ["Lung cancer", "Keuhkosyöpä"] as Copy, url: "https://kaikkisyovasta.fi/tietoa-syovasta/syopataudit/keuhkosyopa/",
    symptoms: ["Possible symptoms include a persistent cough and coughing up blood.", "Mahdollisia oireita ovat pitkittynyt yskä ja veriset yskökset."] as Copy,
    riskFactors: ["Smoking is a major risk factor for lung cancer.", "Tupakointi on merkittävä keuhkosyövän riskitekijä."] as Copy,
  },
  {
    id: "ovarian", topic: "ovary", name: ["Ovarian cancer", "Munasarjasyöpä"] as Copy, url: "https://kaikkisyovasta.fi/tietoa-syovasta/syopataudit/munasarjasyopa/",
    symptoms: ["Possible changes include abdominal bloating, a feeling of fullness, or abdominal discomfort.", "Mahdollisia oireita ovat vatsan turvotus, täyteläisyyden tunne ja vatsavaivat."] as Copy,
    riskFactors: ["Ovarian cancer in a close relative can be relevant to a discussion about family history.", "Lähisukulaisella todettu munasarjasyöpä on hyvä mainita, kun keskustelet suvun syöpähistoriasta."] as Copy,
  },
  {
    id: "pancreatic", topic: "pancreas", name: ["Pancreatic cancer", "Haimasyöpä"] as Copy, url: "https://kaikkisyovasta.fi/tietoa-syovasta/syopataudit/haimasyopa/",
    symptoms: ["Possible symptoms include upper abdominal or back pain, weight loss, and jaundice.", "Mahdollisia oireita ovat ylävatsa- tai selkäkipu, laihtuminen ja keltaisuus."] as Copy,
    riskFactors: ["Smoking and chronic pancreatitis are among the known risk factors.", "Tupakointi ja krooninen haimatulehdus kuuluvat tunnettuihin riskitekijöihin."] as Copy,
  },
];
const overview: Copy = [
  "The Cancer Society of Finland has an overview of this cancer type. You can use it to prepare questions for a healthcare professional.",
  "Syöpäjärjestöillä on tietoa tästä syöpätyypistä. Voit käyttää sitä kysymysten valmisteluun terveydenhuollon ammattilaiselle.",
];
const additionalSources = additional.map(entry =>
  source("cs-" + entry.id, "Cancer Society of Finland", "Cancer Society of Finland · " + entry.name[0], entry.url, "fi", "Overview of " + entry.name[0].toLowerCase(), "Cancer Society of Finland · " + entry.name[1]));

const passages: EvidenceSeed["passages"] = [];
/** One passage in both languages. `sources` can differ per language where the English and Finnish pages differ. */
function passage(id: string, text: Copy, sources: SourceSeed | { en: SourceSeed; fi: SourceSeed },
  options: { topic?: string; heading?: Copy; residence?: Residence; position?: number } = {}) {
  (["en", "fi"] as const).forEach((language, index) => passages.push({
    id, language, residence: options.residence ?? "any", position: options.position ?? 0, topic: options.topic ?? "general",
    ...(options.heading ? { heading: options.heading[index] } : {}), text: text[index],
    sourceIds: [("en" in sources ? sources[language] : sources).id],
  }));
}

passage("symptoms", ["Possible cancer symptoms can also have other causes. A healthcare professional can assess a new or unexplained change.", "Mahdollisilla syöpäoireilla voi olla muitakin syitä. Terveydenhuollon ammattilainen voi arvioida uuden tai selittämättömän muutoksen."], symptomGuide);
// Two candidates: the answer shows the one whose source ranks first (Finland, then Europe, then international).
passage("prevention", ["Tobacco, alcohol, diet, and physical activity are among the factors discussed in cancer prevention guidance.", "Tupakka, alkoholi, ravitsemus ja liikunta ovat syövän ehkäisyssä käsiteltäviä tekijöitä."], nationalPrevention, { position: 0 });
passage("prevention", ["The European Code Against Cancer covers tobacco, alcohol, physical activity, food choices, and sun protection.", "Euroopan syöväntorjuntaohjeisto käsittelee tupakkaa, alkoholia, liikkumista, ruokavalintoja ja auringolta suojautumista."], europeanCode, { position: 1 });
passage("follow-up", ["The ESMO survivorship guide covers life after treatment and preparing for follow-up. Ask your care team for the plan that applies to you.", "ESMOn potilasopas käsittelee elämää hoitojen jälkeen ja seurantaan valmistautumista. Kysy hoitotiimiltäsi omaa suunnitelmaasi."], survivorship);
passage("guides", ["ESMO publishes patient guides on cancer types including lung, ovarian, and pancreatic cancer. These can help you prepare questions for your care team.", "ESMO julkaisee potilasoppaita muun muassa keuhko-, munasarja- ja haimasyövästä. Oppaat voivat auttaa kokoamaan kysymyksiä hoitotiimille."], europeanGuides);
passage("visit-preparation", ["Write down your main concern and questions before the visit. Ask your clinician to explain unfamiliar terms and whom to contact with follow-up questions.", "Kirjaa tärkein huolesi ja kysymyksesi ennen vastaanottoa. Pyydä ammattilaista selittämään vieraat termit ja kertomaan, keneen voit ottaa yhteyttä jatkokysymyksissä."], conversationGuide);
passage("cancer-support", ["The Cancer Society of Finland offers counselling from cancer nurses for people with questions or worries about cancer.", "Syöpäjärjestöjen neuvontahoitajat tarjoavat tukea ja neuvontaa, kun syöpä mietityttää."], { en: counsellingEn, fi: counsellingFi });
passage("screening", ["Finland’s national cancer screening programmes cover breast, cervical and colorectal cancer. Check your invitation or contact the screening service for details that apply to you.", "Suomen kansalliset syöpäseulonnat kattavat rinta-, kohdunkaula- ja suolistosyövän. Tarkista omat tietosi kutsusta tai kysy seulontayksiköltä."], registry);
passage("professional-care", ["For non-emergency health concerns in Finland, your health and social services centre is a place to contact. If you already have a care team, you can ask them who to contact about your concern.", "Suomessa voit ottaa kiireettömissä terveyshuolissa yhteyttä sosiaali- ja terveyskeskukseen. Jos sinulla on jo hoitotiimi, voit kysyä sieltä, keneen kannattaa ottaa yhteyttä."], healthCentre, { residence: "finland" });
passage("professional-care", ["Contact your local healthcare service or existing care team about symptoms or results. Write down what you want to ask before your visit.", "Ota oireista tai tuloksista yhteyttä paikalliseen terveyspalveluun tai hoitotiimiisi. Kirjaa kysymyksesi ennen käyntiä."], conversationGuide, { residence: "abroad" });
passage("emergency", ["If this is an emergency in Finland, call 112 now.", "Soita Suomessa hätätilanteessa heti numeroon 112."], emergency, { residence: "finland" });
passage("emergency", ["In an emergency, call the emergency number where you are. In the EU, call 112.", "Soita hätätilanteessa oleskelumaasi hätänumeroon. EU:ssa soita numeroon 112."], europeanEmergency, { residence: "abroad" });
additional.forEach((entry, index) => {
  const options = { topic: entry.topic, heading: entry.name };
  passage(entry.id + "-symptoms", entry.symptoms, additionalSources[index], options);
  passage(entry.id + "-riskFactors", entry.riskFactors, additionalSources[index], options);
  passage(entry.id + "-overview", overview, additionalSources[index], options);
});

export const evidenceSeed: EvidenceSeed = {
  sources: [registry, emergency, europeanEmergency, healthCentre, symptomGuide, conversationGuide, europeanCode, europeanGuides, nationalPrevention,
    survivorship, counsellingFi, counsellingEn, ...additionalSources],
  passages,
};
