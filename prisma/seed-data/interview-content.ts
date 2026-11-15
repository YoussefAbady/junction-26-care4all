import type { DomainSeed, InterviewSeed } from "./v2-types";

// Owner: the interview package. The AI interview's content as seed data: its limits and the coverage domains, each with what
// to find out (`ask`, English, told to the model) and the question the bank asks when the model cannot make one (docs/design-v2.md
// sections 5 and 9, Appendix A.2 to A.4). The twelve domains are tobacco, alcohol, activity, diet, family, conditions, sun, work,
// screening, vaccines, male-genital and symptoms.
//
// Sources: the fallback questions, the `ask` texts, the domain names and every Finnish text are written for this product. They
// are not taken from a source and nobody has checked them against one. The Finnish is drafted by hand from the English and
// marked unreviewed (`finnish`) until a native speaker has reviewed it. The questions ask what is known to matter for cancer
// risk factors (the topics of the risk statements: smoking, alcohol, weight and activity, diet, family history, long-term
// conditions, sun, work exposure, screening, vaccines, testicular history, warning signs) and give no medical advice.
// Every fallback question passes the guard of src/lib/interview/guard.ts, in both languages.

const symptomNote = {
  en: "This is not a symptom check. If something worries you, tell the symptom chat, or call 112 in an emergency.",
  fi: "Tämä ei ole oirearvio. Jos jokin huolestuttaa, kerro siitä oirekeskustelussa tai soita hätätilanteessa numeroon 112.",
};

const domains: DomainSeed[] = [
  {
    id: "tobacco", name: { en: "Tobacco", fi: "Tupakka" }, essential: true, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out whether the person smokes or uses tobacco now, used to, or never has. Someone who smokes or used to is asked later how much and for how many years.",
    fallback: {
      en: { kind: "choice", title: "Do you smoke or use tobacco?", help: "Cigarettes, cigars, a pipe, snus or similar.", options: [{ label: "Yes, I do now" }, { label: "I used to, but I stopped" }, { label: "No, never" }] },
      fi: { kind: "choice", title: "Tupakoitko tai käytätkö tupakkatuotteita?", help: "Savukkeet, sikarit, piippu, nuuska tai vastaava.", options: [{ label: "Kyllä, tällä hetkellä" }, { label: "Olen lopettanut" }, { label: "En ole koskaan" }] },
    },
  },
  {
    id: "alcohol", name: { en: "Alcohol", fi: "Alkoholi" }, essential: true, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out how often the person drinks alcohol, and a typical amount on a drinking day if they drink.",
    fallback: {
      en: { kind: "choice", title: "How often do you drink alcohol?", options: [{ label: "I do not drink alcohol" }, { label: "Less than once a week" }, { label: "About once or twice a week" }, { label: "Most days or every day" }] },
      fi: { kind: "choice", title: "Kuinka usein käytät alkoholia?", options: [{ label: "En käytä alkoholia" }, { label: "Harvemmin kuin kerran viikossa" }, { label: "Noin 1–2 kertaa viikossa" }, { label: "Useimpina päivinä tai joka päivä" }] },
    },
  },
  {
    id: "activity", name: { en: "Physical activity", fi: "Liikunta" }, essential: true, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out how much physical activity the person gets in a typical week, for example days of at least 30 minutes of brisk activity.",
    fallback: {
      en: { kind: "number", title: "On how many days in a typical week are you active for at least 30 minutes?", help: "For example brisk walking, cycling, sport or physical work.", number: { min: 0, max: 7, unit: "days" } },
      fi: { kind: "number", title: "Kuinka monena päivänä tavallisessa viikossa liikut vähintään 30 minuuttia?", help: "Esimerkiksi reipas kävely, pyöräily, urheilu tai fyysinen työ.", number: { min: 0, max: 7, unit: "päivää" } },
    },
  },
  {
    id: "diet", name: { en: "Food", fi: "Ruoka" }, essential: true, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out how often the person eats red or processed meat, and whether vegetables, fruit and fibre are part of most days.",
    fallback: {
      en: { kind: "choice", title: "How often do you eat red or processed meat, such as beef, pork, sausages or cold cuts?", options: [{ label: "Most days" }, { label: "A few times a week" }, { label: "Rarely or never" }] },
      fi: { kind: "choice", title: "Kuinka usein syöt punaista tai prosessoitua lihaa, kuten naudanlihaa, sianlihaa, makkaraa tai leikkeleitä?", options: [{ label: "Useimpina päivinä" }, { label: "Muutaman kerran viikossa" }, { label: "Harvoin tai en koskaan" }] },
    },
  },
  {
    id: "family", name: { en: "Family history", fi: "Suvun sairaudet" }, essential: true, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out whether a close blood relative (parent, brother, sister or child) has had cancer, which cancer, and how old the relative was when it was found.",
    fallback: {
      en: { kind: "multi", title: "Which of these cancers has a parent, brother, sister or child had?", options: [{ label: "Breast cancer" }, { label: "Bowel cancer" }, { label: "Prostate cancer" }, { label: "Skin cancer or melanoma" }, { label: "Some other cancer" }, { label: "None of these", exclusive: true }] },
      fi: { kind: "multi", title: "Mitä seuraavista syövistä vanhemmallasi, sisaruksellasi tai lapsellasi on ollut?", options: [{ label: "Rintasyöpä" }, { label: "Suolistosyöpä" }, { label: "Eturauhassyöpä" }, { label: "Ihosyöpä tai melanooma" }, { label: "Jokin muu syöpä" }, { label: "Ei mitään näistä", exclusive: true }] },
    },
  },
  {
    id: "conditions", name: { en: "Long-term conditions", fi: "Pitkäaikaissairaudet" }, essential: true, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out which long-term conditions the person has that are linked to cancer risk factors: diabetes, high blood pressure, inflammatory bowel disease, a long-term liver condition, long-term lung disease, a long-term stomach condition.",
    fallback: {
      en: { kind: "multi", title: "Which of these long-term conditions do you have?", options: [{ label: "Diabetes" }, { label: "High blood pressure" }, { label: "Inflammatory bowel disease" }, { label: "A long-term liver condition" }, { label: "Long-term lung disease, such as COPD" }, { label: "None of these", exclusive: true }] },
      fi: { kind: "multi", title: "Mitkä näistä pitkäaikaissairauksista sinulla on?", options: [{ label: "Diabetes" }, { label: "Kohonnut verenpaine" }, { label: "Tulehduksellinen suolistosairaus" }, { label: "Pitkäaikainen maksasairaus" }, { label: "Pitkäaikainen keuhkosairaus, esimerkiksi COPD" }, { label: "Ei mitään näistä", exclusive: true }] },
    },
  },
  {
    id: "sun", name: { en: "Sun and skin", fi: "Aurinko ja iho" }, essential: true, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out how the person's skin reacts to strong sun, how often it burns, whether they use sunbeds, and how many moles they have.",
    fallback: {
      en: { kind: "choice", title: "How does your skin usually react to strong sun?", options: [{ label: "It often burns" }, { label: "It tans and rarely burns" }, { label: "I rarely spend time in strong sun" }] },
      fi: { kind: "choice", title: "Miten ihosi yleensä reagoi voimakkaaseen aurinkoon?", options: [{ label: "Se palaa usein" }, { label: "Se ruskettuu ja palaa harvoin" }, { label: "Oleskelen harvoin voimakkaassa auringossa" }] },
    },
  },
  {
    id: "work", name: { en: "Work", fi: "Työ" }, essential: false, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out whether the person's work or home exposes them regularly to dust, smoke, fumes or chemicals, and for about how many years.",
    fallback: {
      en: { kind: "choice", title: "Do you regularly come into contact with dust, smoke, fumes or chemicals at work?", options: [{ label: "Yes, regularly" }, { label: "Sometimes" }, { label: "No" }] },
      fi: { kind: "choice", title: "Altistutko työssäsi säännöllisesti pölylle, savulle, huuruille tai kemikaaleille?", options: [{ label: "Kyllä, säännöllisesti" }, { label: "Joskus" }, { label: "En" }] },
    },
  },
  {
    id: "screening", name: { en: "Screening", fi: "Seulonnat" }, essential: true, appliesTo: "any", minAge: 30, maxAge: null,
    ask: "Find out whether the person has taken part in the screening they were invited to. Ask only about the programmes that match the person's age and sex, for example cervical, breast and bowel screening, and never about a programme the person is too young or the wrong sex for.",
    fallback: {
      en: { kind: "choice", title: "Have you taken part in the screening you have been invited to?", options: [{ label: "Yes, every time I was invited" }, { label: "Sometimes" }, { label: "No, not yet" }, { label: "I have not been invited to any" }] },
      fi: { kind: "choice", title: "Oletko osallistunut seulontoihin, joihin sinut on kutsuttu?", options: [{ label: "Kyllä, aina kun minut on kutsuttu" }, { label: "Joskus" }, { label: "En vielä" }, { label: "Minua ei ole kutsuttu mihinkään seulontaan" }] },
    },
  },
  {
    id: "vaccines", name: { en: "Vaccines", fi: "Rokotteet" }, essential: false, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out whether the person has had the HPV vaccine or the hepatitis B vaccine.",
    fallback: {
      en: { kind: "multi", title: "Which of these vaccines have you had?", options: [{ label: "HPV vaccine" }, { label: "Hepatitis B vaccine" }, { label: "None of these", exclusive: true }] },
      fi: { kind: "multi", title: "Minkä näistä rokotteista olet saanut?", options: [{ label: "HPV-rokote" }, { label: "Hepatiitti B -rokote" }, { label: "Ei mitään näistä", exclusive: true }] },
    },
  },
  {
    id: "male-genital", name: { en: "Testicular history", fi: "Kivesten historia" }, essential: true, appliesTo: "male", minAge: null, maxAge: null,
    ask: "Find out whether the person was born with a testicle that did not come down into the scrotum, and whether a close male relative has had testicular cancer.",
    fallback: {
      en: { kind: "choice", title: "Was either of your testicles late to come down into the scrotum when you were a child?", options: [{ label: "Yes" }, { label: "No" }] },
      fi: { kind: "choice", title: "Jäikö jompikumpi kiveksistäsi lapsena laskeutumatta kivespussiin?", options: [{ label: "Kyllä" }, { label: "Ei" }] },
    },
  },
  {
    id: "symptoms", name: { en: "Warning signs", fi: "Varoitusmerkit" }, essential: true, appliesTo: "any", minAge: null, maxAge: null,
    ask: "Find out whether the person has noticed any warning sign lately: a new lump or swelling, blood in stool, urine or when coughing, trouble swallowing, weight loss without trying, or a skin change. This is a question about what they noticed, never an assessment of it.",
    fallback: {
      en: {
        kind: "multi", title: "Have you noticed any of these changes lately?", help: symptomNote.en,
        options: [{ label: "A new lump or swelling" }, { label: "Blood in stool, urine or when coughing" }, { label: "Trouble swallowing that does not go away" }, { label: "Weight loss without trying" }, { label: "A mole or sore that changes or does not heal" }, { label: "None of these", exclusive: true }],
      },
      fi: {
        kind: "multi", title: "Oletko huomannut viime aikoina jotain näistä muutoksista?", help: symptomNote.fi,
        options: [{ label: "Uusi kyhmy tai turvotus" }, { label: "Verta ulosteessa, virtsassa tai yskiessä" }, { label: "Nielemisvaikeus, joka ei mene ohi" }, { label: "Tahaton painonlasku" }, { label: "Luomi tai haava, joka muuttuu tai ei parane" }, { label: "Ei mitään näistä", exclusive: true }],
      },
    },
  },
];

export const interviewSeed: InterviewSeed = {
  limits: { min: 10, max: 28 },
  domains,
  strings: [
    // Pinned by Appendix A.5: the consent bubble before the first AI question. It says what is sent and kept, so it lives with the backend.
    {
      scope: "interview", key: "consent",
      text: {
        en: "To ask each next question, an AI model (Google Gemini) reads your basic answers and the questions and answers so far. It is sent your age, sex, weight group, your answers, and whether you live in Finland. It is never sent your name, exact date of birth, place of residence or any ID. The questions and your answers are saved on your account and are deleted with it. You can answer “Not sure” or “Prefer not to say” to any question.",
        fi: "Seuraavan kysymyksen laatimiseksi tekoälymalli (Google Gemini) lukee perusvastauksesi sekä tähän asti esitetyt kysymykset ja vastaukset. Sille lähetetään ikäsi, sukupuolesi, painoryhmäsi, vastauksesi ja tieto siitä, asutko Suomessa. Sille ei koskaan lähetetä nimeäsi, tarkkaa syntymäaikaasi, asuinpaikkaasi eikä mitään tunnistetta. Kysymykset ja vastauksesi tallennetaan tilillesi, ja ne poistetaan tilin mukana. Voit vastata mihin tahansa kysymykseen ”En ole varma” tai ”En halua vastata”.",
      },
    },
    // Shown with every question about warning signs, whoever wrote the question (section 13: a warning sign is a different question
    // from a risk tag and points to the symptom conversation and, if urgent, to 112).
    { scope: "interview", key: "symptom_note", text: symptomNote },
  ],
  finnish: "unreviewed",
};
