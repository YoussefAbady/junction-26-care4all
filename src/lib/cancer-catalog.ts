import { tr, type Copy, type Language } from "./survey";

type Source = { title: Copy; url: string; language: Language; retrieved: string };
type Section = { status?: "awareness_only" | "unavailable" | "programme_information"; items: Copy[]; sources: Source[] };
type Cancer = {
  slug: string;
  name: Copy;
  summary: Copy;
  awareness: Section;
  symptoms: Section;
  selfExamination: Section;
  homeKit: Section;
  riskFactors: Section;
};
const section = (items: Copy[], sources: Source[], status?: Section["status"]): Section => ({ items, sources, ...(status ? { status } : {}) });
const source = (title: Copy, url: string, language: Language = "en"): Source => ({ title, url, language, retrieved: "2026-11-14" });
const breast = source(["Duodecim · Breast cancer", "Duodecim · Rintasyöpä"], "https://www.terveyskirjasto.fi/dlk00618", "fi");
const colorectal = source(["Duodecim · Bowel cancer", "Duodecim · Suolistosyöpä"], "https://www.terveyskirjasto.fi/dlk01087", "fi");
const cervical = source(["Duodecim · Cervical cancer", "Duodecim · Kohdunkaulan syöpä"], "https://www.terveyskirjasto.fi/dlk00144", "fi");
const breastScreen = source(["Finnish Cancer Registry · Breast cancer screening", "Suomen Syöpärekisteri · Rintasyöpäseulonta"], "https://cancerregistry.fi/screening/breast-cancer-screening/");
const bowelScreen = source(["Finnish Cancer Registry · Colorectal cancer screening", "Suomen Syöpärekisteri · Suolistosyöpäseulonta"], "https://cancerregistry.fi/screening/colorectal-cancer-screening/");
const cervicalScreen = source(["Finnish Cancer Registry · Cervical cancer screening", "Suomen Syöpärekisteri · Kohdunkaulan syövän seulonta"], "https://cancerregistry.fi/screening/cervical-cancer-screening/");

function topicCard(slug: string, name: Copy, summary: Copy, ref: string, [awareness, symptoms, selfExamination, riskFactors]: [Copy, Copy, Copy, Copy]): Cancer {
  const references = [source(["Duodecim · " + name[0], "Duodecim · " + name[1]], "https://www.terveyskirjasto.fi/" + ref, "fi")];
  return {
    slug, name, summary,
    awareness: section([awareness], references),
    symptoms: section([symptoms], references),
    selfExamination: section([selfExamination], references, "awareness_only"),
    homeKit: section([["This catalog has no verified home screening kit for this topic.", "Tässä palvelussa ei ole varmennettua kotiseulontatestiä tähän aiheeseen."]], references, "unavailable"),
    riskFactors: section([riskFactors], references),
  };
}

const catalog: Cancer[] = [
  {
    slug: "breast",
    name: ["Breast cancer", "Rintasyöpä"],
    summary: ["Learn about breast changes and mammography screening.", "Tutustu rintojen muutoksiin ja mammografiaseulontaan."],
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
  {
    slug: "colorectal",
    name: ["Colorectal cancer", "Suolistosyöpä"],
    summary: ["Learn about bowel changes and Finland’s stool sampling programme.", "Tutustu suolen toiminnan muutoksiin ja Suomen ulostenäytteeseen perustuvaan seulontaan."],
    awareness: section([["Colorectal cancer affects the colon or rectum. Screening can detect changes before symptoms appear.", "Suolistosyöpä voi kehittyä paksu- tai peräsuoleen. Seulonta voi havaita muutoksia ennen oireita."]], [bowelScreen, colorectal]),
    symptoms: section([
      ["Blood in the stool or a change in bowel habits", "Verta ulosteessa tai muutos suolen toiminnassa"],
      ["Unexplained weight loss", "Selittämätön laihtuminen"],
    ], [colorectal]),
    selfExamination: section([["Notice changes in bowel habits or visible blood and discuss them with healthcare. Looking at stool cannot rule out colorectal cancer.", "Huomioi suolen toiminnan muutokset tai näkyvä veri ja kerro niistä terveydenhuollossa. Ulosteen tarkkailu ei sulje pois suolistosyöpää."]], [colorectal, bowelScreen], "awareness_only"),
    homeKit: section([
      ["The Finnish programme sends invited participants a FIT kit for collecting a stool sample at home. Follow the instructions supplied with your kit and return the sample as directed for laboratory analysis.", "Suomen seulontaohjelmassa kutsutuille lähetetään FIT-testi ulostenäytteen ottamiseen kotona. Noudata pakkauksen ohjeita ja palauta näyte ohjeiden mukaan laboratorioanalyysiin."],
      ["FIT checks for hidden blood. The screening service communicates the result and any follow-up.", "FIT-testi etsii piilevää verta. Seulontayksikkö ilmoittaa tuloksen ja mahdollisista jatkotoimista."],
    ], [bowelScreen], "programme_information"),
    riskFactors: section([["Family history and certain inherited conditions", "Suvun syöpähistoria ja tietyt perinnölliset sairaudet"]], [source(["NCI · Colorectal cancer prevention", "NCI · Suolistosyövän ehkäisy"], "https://www.cancer.gov/types/colorectal/patient/colorectal-prevention-pdq")]),
  },
  {
    slug: "cervical",
    name: ["Cervical cancer", "Kohdunkaulan syöpä"],
    summary: ["Learn about cervical screening, HPV, and changes to discuss with healthcare.", "Tutustu kohdunkaulan seulontaan, HPV:hen ja muutoksiin, joista kannattaa kertoa terveydenhuollossa."],
    awareness: section([["Cervical screening looks for high-risk HPV or cervical cell changes, depending on the test.", "Kohdunkaulan seulonnassa etsitään testistä riippuen korkean riskin HPV:tä tai kohdunkaulan solumuutoksia."]], [cervicalScreen, cervical]),
    symptoms: section([
      ["Unusual vaginal bleeding, such as after sex or between periods", "Poikkeava verinen vuoto, esimerkiksi yhdynnän jälkeen tai kuukautisten välissä"],
      ["Unusual vaginal discharge", "Poikkeava emätinvuoto"],
    ], [cervical, source(["NCI · Cervical cancer symptoms", "NCI · Kohdunkaulan syövän oireet"], "https://www.cancer.gov/types/cervical/symptoms")]),
    selfExamination: section([["This catalog has no validated self-examination for cervical cancer. Discuss unusual bleeding or discharge with healthcare.", "Tässä palvelussa ei ole validoitua kohdunkaulan syövän omatarkastusta. Kerro poikkeavasta vuodosta terveydenhuollossa."]], [cervical], "unavailable"),
    homeKit: section([["Home HPV sampling availability and instructions depend on the screening provider. This catalog has no verified kit instructions. Ask the service listed in your invitation.", "Kotona otettavan HPV-näytteen saatavuus ja ohjeet riippuvat seulontayksiköstä. Tässä palvelussa ei ole varmennettuja näytteenotto-ohjeita. Kysy kutsussa mainitulta seulontayksiköltä."]], [cervicalScreen], "unavailable"),
    riskFactors: section([["Persistent infection with a high-risk type of HPV", "Pitkittynyt korkean riskin HPV-infektio"]], [cervical]),
  },
  topicCard("skin", ["Skin cancer and melanoma","Ihosyöpä ja melanooma"], ["Learn which skin changes are worth checking.","Tutustu siihen, millaiset ihomuutokset kannattaa tutkituttaa."], "dlk00671", [
    ["Melanoma can develop in a new spot or in an existing mole.","Melanooma voi kehittyä uuteen ihomuutokseen tai olemassa olevaan luomeen."],
    ["A mole that changes in size, shape or colour","Luomen koon, muodon tai värin muuttuminen"],
    ["Look for new or changing spots. Note the location and any change you notice, and ask healthcare about a concerning spot.","Huomioi uudet tai muuttuvat ihomuutokset. Merkitse muistiin sijainti ja havaitsemasi muutos ja kysy huolestuttavasta muutoksesta terveydenhuollossa."],
    ["UV exposure and a family history of melanoma","UV-altistus ja suvussa esiintynyt melanooma"],
  ]),
  topicCard("prostate", ["Prostate cancer","Eturauhassyöpä"], ["Read about prostate changes and PSA testing.","Tutustu eturauhasen muutoksiin ja PSA-tutkimukseen."], "khp00006", [
    ["Finland has no national prostate cancer screening programme. Discuss PSA testing with a healthcare professional.","Suomessa ei ole kansallista eturauhassyövän seulontaohjelmaa. Keskustele PSA-tutkimuksesta terveydenhuollon ammattilaisen kanssa."],
    ["Urinary changes can have many causes and should be discussed with healthcare.","Virtsaamisoireilla voi olla useita syitä. Kerro oireista terveydenhuollossa."],
    ["Note new urinary changes and discuss them with healthcare. Body awareness does not replace a clinical assessment.","Kirjaa uudet virtsaamisoireet ja kerro niistä terveydenhuollossa. Omatarkkailu ei korvaa ammattilaisen arviota."],
    ["Prostate cancer in a close relative","Lähisukulaisella todettu eturauhassyöpä"],
  ]),
  topicCard("testicular", ["Testicular cancer","Kivessyöpä"], ["Learn about testicular changes to discuss with healthcare.","Tutustu kivesten muutoksiin, joista kannattaa kertoa terveydenhuollossa."], "dlk00629", [
    ["A testicular lump or change should be assessed by a healthcare professional.","Terveydenhuollon ammattilaisen tulee arvioida kiveksen kyhmy tai muu muutos."],
    ["A lump, swelling or change in the size of a testicle","Kyhmy, turvotus tai kiveksen koon muuttuminen"],
    ["Get familiar with how your testicles usually look and feel, and tell a healthcare professional about new changes.","Tutustu siihen, miltä kiveksesi tavallisesti näyttävät ja tuntuvat, ja kerro uusista muutoksista terveydenhuollon ammattilaiselle."],
    ["A history of an undescended testicle","Aiemmin todettu laskeutumaton kives"],
  ]),
];

export const catalogVersion = "1.1.0";
export const catalogNotice: Copy = [
  "General education. Symptoms can have several causes. Ask a healthcare professional about new or persistent changes.",
  "Yleistä tietoa. Oireilla voi olla useita syitä. Kysy uusista tai jatkuvista muutoksista terveydenhuollon ammattilaiselta.",
];

function localize(section: Section, language: Language) {
  return {
    ...(section.status ? { status: section.status } : {}),
    items: section.items.map(item => tr(language, item)),
    sources: section.sources.map(entry => ({ ...entry, title: tr(language, entry.title) })),
  };
}
export function cancerCards(language: Language, slug?: string) {
  return catalog.filter(cancer => !slug || cancer.slug === slug).map(cancer => ({
    slug: cancer.slug,
    name: tr(language, cancer.name),
    summary: tr(language, cancer.summary),
    awareness: localize(cancer.awareness, language),
    symptoms: localize(cancer.symptoms, language),
    selfExamination: localize(cancer.selfExamination, language),
    homeKit: localize(cancer.homeKit, language),
    riskFactors: localize(cancer.riskFactors, language),
  }));
}
