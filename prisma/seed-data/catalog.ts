import type { CatalogSeed, CatalogStatus, SectionKey, SourceSeed } from "../../src/lib/content/types";

// The six-topic bilingual catalog behind /api/cancers and /api/library, as it stood in src/lib/cancer-catalog.ts before the
// content moved to the database. Every page was read on 14 November 2026. Edit the database from here on: this file is
// only the seed (docs/content-database.md).

type Copy = readonly [string, string];
const retrieved = "2026-11-14";
const idOf = (name: string) => "catalog-" + name;

function source(name: string, organisation: string, title: Copy, url: string, language: string, use: string): SourceSeed {
  return { id: idOf(name), organisation, title: title[0], titleFi: title[1], url, language, retrieved, use };
}
const duodecim = (name: string, topic: Copy, page: string, use: string) =>
  source(name, "Duodecim", ["Duodecim · " + topic[0], "Duodecim · " + topic[1]], "https://www.terveyskirjasto.fi/" + page, "fi", use);
const registry = (name: string, title: Copy, page: string, use: string) =>
  source(name, "Finnish Cancer Registry", title, "https://cancerregistry.fi/screening/" + page, "en", use);

const breast = duodecim("duodecim-breast", ["Breast cancer", "Rintasyöpä"], "dlk00618", "Breast cancer symptoms, body awareness and risk factors");
const bowel = duodecim("duodecim-bowel", ["Bowel cancer", "Suolistosyöpä"], "dlk01087", "Bowel cancer overview, symptoms and body awareness");
const cervical = duodecim("duodecim-cervical", ["Cervical cancer", "Kohdunkaulan syöpä"], "dlk00144", "Cervical cancer overview, symptoms, body awareness and risk factors");
const skin = duodecim("duodecim-skin", ["Skin cancer and melanoma", "Ihosyöpä ja melanooma"], "dlk00671", "Overview, symptoms, body awareness and risk factors");
const prostate = duodecim("duodecim-prostate", ["Prostate cancer", "Eturauhassyöpä"], "khp00006", "Overview, symptoms, body awareness and risk factors");
const testicular = duodecim("duodecim-testicular", ["Testicular cancer", "Kivessyöpä"], "dlk00629", "Overview, symptoms, body awareness and risk factors");
const breastScreen = registry("fcr-breast-screening", ["Finnish Cancer Registry · Breast cancer screening", "Suomen Syöpärekisteri · Rintasyöpäseulonta"], "breast-cancer-screening/", "Breast screening programme and mammography");
const bowelScreen = registry("fcr-bowel-screening", ["Finnish Cancer Registry · Colorectal cancer screening", "Suomen Syöpärekisteri · Suolistosyöpäseulonta"], "colorectal-cancer-screening/", "Bowel screening programme and the stool sample (FIT)");
const cervicalScreen = registry("fcr-cervical-screening", ["Finnish Cancer Registry · Cervical cancer screening", "Suomen Syöpärekisteri · Kohdunkaulan syövän seulonta"], "cervical-cancer-screening/", "Cervical screening programme and HPV testing");
const colorectalPrevention = source("nci-colorectal-prevention", "National Cancer Institute", ["NCI · Colorectal cancer prevention", "NCI · Suolistosyövän ehkäisy"],
  "https://www.cancer.gov/types/colorectal/patient/colorectal-prevention-pdq", "en", "Colorectal cancer risk factors");
const cervicalSymptoms = source("nci-cervical-symptoms", "National Cancer Institute", ["NCI · Cervical cancer symptoms", "NCI · Kohdunkaulan syövän oireet"],
  "https://www.cancer.gov/types/cervical/symptoms", "en", "Cervical cancer symptoms");
const fimlabBowel = source("fimlab-bowel", "Fimlab", ["Fimlab · Bowel screening and kit instructions", "Fimlab · Suolistosyövän seulonta ja näytteenotto-ohjeet"],
  "https://fimlab.fi/suolistosyovan-seulonta/", "fi", "Official instructions for the FIT stool sample kit");
const fimlabHpv = source("fimlab-hpv-study", "Fimlab", ["Fimlab · 2026 HPV self-sampling study", "Fimlab · HPV-omanäytteenottotutkimus 2026"],
  "https://fimlab.fi/kohdunkaulan-syovan-seulonta/", "fi", "Information about the 2026 HPV self-sampling study");

type Section = { status?: CatalogStatus; items: Copy[]; sourceIds: string[] };
const section = (items: Copy[], sources: SourceSeed[], status?: CatalogStatus): Section => ({ items, sourceIds: sources.map(item => item.id), ...(status ? { status } : {}) });
type Card = CatalogSeed["cards"][number];

// A topic with one Duodecim page behind all five sections and no verified home kit.
function topicCard(slug: string, name: Copy, summary: Copy, reference: SourceSeed, [awareness, symptoms, selfExamination, riskFactors]: [Copy, Copy, Copy, Copy]): Card {
  const references = [reference];
  return {
    slug, name, summary, linkIds: [],
    sections: {
      awareness: section([awareness], references),
      symptoms: section([symptoms], references),
      selfExamination: section([selfExamination], references, "awareness_only"),
      homeKit: section([["This catalog has no verified home screening kit for this topic.", "Tässä palvelussa ei ole varmennettua kotiseulontatestiä tähän aiheeseen."]], references, "unavailable"),
      riskFactors: section([riskFactors], references),
    },
  };
}

const cards: Card[] = [
  {
    slug: "breast",
    name: ["Breast cancer", "Rintasyöpä"],
    summary: ["Learn about breast changes and mammography screening.", "Tutustu rintojen muutoksiin ja mammografiaseulontaan."],
    linkIds: [],
    sections: {
      awareness: section([["Finland’s breast screening programme uses mammography.", "Suomessa rintasyöpäseulonnassa käytetään mammografiaa."]], [breastScreen, breast]),
      symptoms: section([
        ["A new lump in the breast or armpit", "Uusi kyhmy rinnassa tai kainalossa"],
        ["New nipple discharge or a change in the nipple or breast skin", "Uusi nännierite tai muutos nännissä tai rinnan ihossa"],
      ], [breast]),
      selfExamination: section([
        ["Get familiar with how your breasts usually look and feel. Ask a healthcare professional about a new change. Breast awareness does not replace screening.", "Tutustu siihen, miltä rintasi tavallisesti näyttävät ja tuntuvat. Kysy uudesta muutoksesta terveydenhuollon ammattilaiselta. Rintojen omatarkkailu ei korvaa seulontaa."],
      ], [breast, breastScreen], "awareness_only"),
      homeKit: section([["This catalog has no verified home kit for breast screening. The Finnish programme uses mammography.", "Tässä palvelussa ei ole varmennettua rintasyövän kotitestiä. Suomen seulontaohjelmassa käytetään mammografiaa."]], [breastScreen], "unavailable"),
      riskFactors: section([["Older age and inherited susceptibility", "Ikääntyminen ja perinnöllinen alttius"]], [breast]),
    },
  },
  {
    slug: "colorectal",
    name: ["Colorectal cancer", "Suolistosyöpä"],
    summary: ["Learn about bowel changes and Finland’s stool sampling programme.", "Tutustu suolen toiminnan muutoksiin ja Suomen ulostenäytteeseen perustuvaan seulontaan."],
    linkIds: [fimlabBowel.id],
    sections: {
      awareness: section([["Colorectal cancer affects the colon or rectum. Screening can detect changes before symptoms appear.", "Suolistosyöpä voi kehittyä paksu- tai peräsuoleen. Seulonta voi havaita muutoksia ennen oireita."]], [bowelScreen, bowel]),
      symptoms: section([
        ["Blood in the stool or a change in bowel habits", "Verta ulosteessa tai muutos suolen toiminnassa"],
        ["Unexplained weight loss", "Selittämätön laihtuminen"],
      ], [bowel]),
      selfExamination: section([["Notice changes in bowel habits or visible blood and discuss them with healthcare. Looking at stool cannot rule out colorectal cancer.", "Huomioi suolen toiminnan muutokset tai näkyvä veri ja kerro niistä terveydenhuollossa. Ulosteen tarkkailu ei sulje pois suolistosyöpää."]], [bowel, bowelScreen], "awareness_only"),
      homeKit: section([
        ["The Finnish programme sends invited participants a FIT kit for collecting a stool sample at home. Follow the instructions supplied with your kit and return the sample as directed for laboratory analysis.", "Suomen seulontaohjelmassa kutsutuille lähetetään FIT-testi ulostenäytteen ottamiseen kotona. Noudata pakkauksen ohjeita ja palauta näyte ohjeiden mukaan laboratorioanalyysiin."],
        ["FIT checks for hidden blood. The screening service communicates the result and any follow-up.", "FIT-testi etsii piilevää verta. Seulontayksikkö ilmoittaa tuloksen ja mahdollisista jatkotoimista."],
      ], [bowelScreen], "programme_information"),
      riskFactors: section([["Family history and certain inherited conditions", "Suvun syöpähistoria ja tietyt perinnölliset sairaudet"]], [colorectalPrevention]),
    },
  },
  {
    slug: "cervical",
    name: ["Cervical cancer", "Kohdunkaulan syöpä"],
    summary: ["Learn about cervical screening, HPV, and changes to discuss with healthcare.", "Tutustu kohdunkaulan seulontaan, HPV:hen ja muutoksiin, joista kannattaa kertoa terveydenhuollossa."],
    linkIds: [fimlabHpv.id],
    sections: {
      awareness: section([["Cervical screening looks for high-risk HPV or cervical cell changes, depending on the test.", "Kohdunkaulan seulonnassa etsitään testistä riippuen korkean riskin HPV:tä tai kohdunkaulan solumuutoksia."]], [cervicalScreen, cervical]),
      symptoms: section([
        ["Unusual vaginal bleeding, such as after sex or between periods", "Poikkeava verinen vuoto, esimerkiksi yhdynnän jälkeen tai kuukautisten välissä"],
        ["Unusual vaginal discharge", "Poikkeava emätinvuoto"],
      ], [cervical, cervicalSymptoms]),
      selfExamination: section([["This catalog has no validated self-examination for cervical cancer. Discuss unusual bleeding or discharge with healthcare.", "Tässä palvelussa ei ole validoitua kohdunkaulan syövän omatarkastusta. Kerro poikkeavasta vuodosta terveydenhuollossa."]], [cervical], "unavailable"),
      homeKit: section([["Home HPV sampling availability and instructions depend on the screening provider. This catalog has no verified kit instructions. Ask the service listed in your invitation.", "Kotona otettavan HPV-näytteen saatavuus ja ohjeet riippuvat seulontayksiköstä. Tässä palvelussa ei ole varmennettuja näytteenotto-ohjeita. Kysy kutsussa mainitulta seulontayksiköltä."]], [cervicalScreen], "unavailable"),
      riskFactors: section([["Persistent infection with a high-risk type of HPV", "Pitkittynyt korkean riskin HPV-infektio"]], [cervical]),
    },
  },
  topicCard("skin", ["Skin cancer and melanoma", "Ihosyöpä ja melanooma"], ["Learn which skin changes are worth checking.", "Tutustu siihen, millaiset ihomuutokset kannattaa tutkituttaa."], skin, [
    ["Melanoma can develop in a new spot or in an existing mole.", "Melanooma voi kehittyä uuteen ihomuutokseen tai olemassa olevaan luomeen."],
    ["A mole that changes in size, shape or colour", "Luomen koon, muodon tai värin muuttuminen"],
    ["Look for new or changing spots. Note the location and any change you notice, and ask healthcare about a concerning spot.", "Huomioi uudet tai muuttuvat ihomuutokset. Merkitse muistiin sijainti ja havaitsemasi muutos ja kysy huolestuttavasta muutoksesta terveydenhuollossa."],
    ["UV exposure and a family history of melanoma", "UV-altistus ja suvussa esiintynyt melanooma"],
  ]),
  topicCard("prostate", ["Prostate cancer", "Eturauhassyöpä"], ["Read about prostate changes and PSA testing.", "Tutustu eturauhasen muutoksiin ja PSA-tutkimukseen."], prostate, [
    ["Finland has no national prostate cancer screening programme. Discuss PSA testing with a healthcare professional.", "Suomessa ei ole kansallista eturauhassyövän seulontaohjelmaa. Keskustele PSA-tutkimuksesta terveydenhuollon ammattilaisen kanssa."],
    ["Urinary changes can have many causes and should be discussed with healthcare.", "Virtsaamisoireilla voi olla useita syitä. Kerro oireista terveydenhuollossa."],
    ["Note new urinary changes and discuss them with healthcare. Body awareness does not replace a clinical assessment.", "Kirjaa uudet virtsaamisoireet ja kerro niistä terveydenhuollossa. Omatarkkailu ei korvaa ammattilaisen arviota."],
    ["Prostate cancer in a close relative", "Lähisukulaisella todettu eturauhassyöpä"],
  ]),
  topicCard("testicular", ["Testicular cancer", "Kivessyöpä"], ["Learn about testicular changes to discuss with healthcare.", "Tutustu kivesten muutoksiin, joista kannattaa kertoa terveydenhuollossa."], testicular, [
    ["A testicular lump or change should be assessed by a healthcare professional.", "Terveydenhuollon ammattilaisen tulee arvioida kiveksen kyhmy tai muu muutos."],
    ["A lump, swelling or change in the size of a testicle", "Kyhmy, turvotus tai kiveksen koon muuttuminen"],
    ["Get familiar with how your testicles usually look and feel, and tell a healthcare professional about new changes.", "Tutustu siihen, miltä kiveksesi tavallisesti näyttävät ja tuntuvat, ja kerro uusista muutoksista terveydenhuollon ammattilaiselle."],
    ["A history of an undescended testicle", "Aiemmin todettu laskeutumaton kives"],
  ]),
];

const sectionTitles: Record<SectionKey, Copy> = {
  awareness: ["Overview and screening", "Tietoa ja seulonta"],
  symptoms: ["Possible symptoms", "Mahdolliset oireet"],
  selfExamination: ["Body awareness", "Omatarkkailu"],
  homeKit: ["Home sampling", "Kotinäytteenotto"],
  riskFactors: ["Risk factors", "Riskitekijät"],
};

export const catalogSeed: CatalogSeed = {
  version: "1.1.0",
  notice: [
    "General education. Symptoms can have several causes. Ask a healthcare professional about new or persistent changes.",
    "Yleistä tietoa. Oireilla voi olla useita syitä. Kysy uusista tai jatkuvista muutoksista terveydenhuollon ammattilaiselta.",
  ],
  sectionTitles,
  sources: [
    breast, bowel, cervical, skin, prostate, testicular, breastScreen, bowelScreen, cervicalScreen, colorectalPrevention, cervicalSymptoms,
    fimlabBowel, fimlabHpv,
  ],
  cards,
};
