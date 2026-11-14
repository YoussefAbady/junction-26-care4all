import { femaleBody, has, olderThan, eq } from "../access";
import type { Plan } from "../types";
import { c, cancerTypes, frequencies, o, yesNo } from "./shared";

export const health: Plan[] = [
  {
    id: "conditions", module: "health", type: "multi", unsure: true,
    title: c("Have you ever been told you have any of these?", "Onko sinulla todettu jokin seuraavista?"),
    label: c("Known conditions", "Todetut sairaudet"),
    help: c("Current or past. Pick everything that applies.", "Nykyiset tai aiemmat. Valitse kaikki sopivat."),
    why: c("Existing conditions and their medicines change how symptoms are read and which tests are safe.", "Todetut sairaudet ja niiden lääkitys vaikuttavat oireiden tulkintaan ja siihen, mitkä tutkimukset ovat turvallisia."),
    options: [
      o("hypertension", "High blood pressure", "Korkea verenpaine"),
      o("diabetes", "Diabetes", "Diabetes"),
      o("heart", "Heart disease (heart attack, angina, heart failure, rhythm problems)", "Sydänsairaus (sydäninfarkti, rasitusrintakipu, sydämen vajaatoiminta, rytmihäiriö)"),
      o("stroke", "Stroke or mini-stroke", "Aivohalvaus tai ohimenevä aivoverenkiertohäiriö"),
      o("cholesterol", "High cholesterol", "Korkea kolesteroli"),
      o("lung", "Asthma or COPD", "Astma tai keuhkoahtaumatauti"),
      o("ibd", "Crohn's disease or ulcerative colitis", "Crohnin tauti tai haavainen paksusuolitulehdus"),
      o("coeliac", "Coeliac disease", "Keliakia"),
      o("ibs", "Irritable bowel syndrome", "Ärtyvän suolen oireyhtymä"),
      o("polyps", "Bowel polyps", "Suolipolyypit"),
      o("liver", "Liver disease (including fatty liver)", "Maksasairaus (myös rasvamaksa)"),
      o("kidney", "Kidney disease", "Munuaissairaus"),
      o("thyroid", "Thyroid condition", "Kilpirauhassairaus"),
      o("arthritis", "Arthritis or rheumatic disease", "Niveltulehdus tai reumasairaus"),
      o("immune", "A weakened immune system", "Heikentynyt vastustuskyky"),
      o("mental", "Depression or anxiety", "Masennus tai ahdistus"),
      o("endometriosis", "Endometriosis", "Endometrioosi", { when: a => femaleBody(a) }),
      o("osteoporosis", "Osteoporosis", "Osteoporoosi"),
      o("other", "Something else", "Jokin muu"),
      o("none", "None of these", "Ei mikään näistä", { exclusive: true }),
    ],
  },
  {
    id: "conditions_other", module: "health", type: "text", max: 300,
    show: a => has(a, "conditions", "other"),
    title: c("What else have you been told you have?", "Mitä muuta sinulla on todettu?"),
    label: c("Other conditions", "Muut sairaudet"),
    placeholder: c("Name of the condition", "Sairauden nimi"),
  },
  {
    gen: "cond", source: "conditions", skip: ["other", "none"],
    make: (key, label) => [{
      id: `cond:${key}`, module: "health", type: "form", tag: label, unsure: true,
      title: c("A little more detail", "Hieman tarkemmin"),
      label: [`${label[0]}: details`, `${label[1]}: tarkemmin`],
      why: c("When it started and how well it is controlled tells a clinician how much it may matter today.", "Alkamisajankohta ja hoitotasapaino kertovat lääkärille, kuinka paljon asialla on merkitystä nyt."),
      fields: [
        { id: "year", type: "year", label: c("Year diagnosed", "Toteamisvuosi"), optional: true },
        {
          id: "status", type: "choice", label: c("How is it at the moment?", "Millainen tilanne on nyt?"),
          options: [
            o("controlled", "Well controlled", "Hyvässä hoitotasapainossa"),
            o("partly", "Partly controlled", "Osittain hoitotasapainossa"),
            o("uncontrolled", "Not well controlled", "Ei hyvässä hoitotasapainossa"),
            o("resolved", "In remission or resolved", "Remissiossa tai parantunut"),
          ],
        },
      ],
    }],
  },
  {
    id: "cancer_personal", module: "health", type: "choice", layout: "yesno", decline: true,
    title: c("Have you ever been diagnosed with cancer?", "Onko sinulla koskaan todettu syöpää?"),
    label: c("Previous cancer", "Aiempi syöpä"),
    why: c("A past cancer changes how new symptoms and screening results are interpreted.", "Aiempi syöpä vaikuttaa siihen, miten uusia oireita ja seulontatuloksia tulkitaan."),
    options: yesNo(),
  },
  {
    id: "cancer_list", module: "health", type: "list", max: 6, item: c("Cancer", "Syöpä"),
    show: a => eq(a, "cancer_personal", "yes"),
    title: c("Tell us about each one", "Kerro jokaisesta"),
    label: c("Cancer history", "Syöpähistoria"),
    help: c("Add one entry for each cancer. Rough years are fine.", "Lisää kustakin syövästä oma merkintä. Likimääräiset vuodet riittävät."),
    fields: [
      { id: "type", type: "choice", label: c("Type", "Tyyppi"), options: cancerTypes },
      { id: "year", type: "year", label: c("Year diagnosed", "Toteamisvuosi"), optional: true },
      {
        id: "treatment", type: "multi", label: c("Treatment so far", "Hoito tähän mennessä"), optional: true,
        options: [
          o("surgery", "Surgery", "Leikkaus"), o("chemo", "Chemotherapy", "Solunsalpaajahoito"), o("radio", "Radiotherapy", "Sädehoito"),
          o("hormone", "Hormone therapy", "Hormonihoito"), o("targeted", "Targeted or immunotherapy", "Täsmä- tai immunologinen hoito"), o("none", "No treatment", "Ei hoitoa"),
        ],
      },
      {
        id: "status", type: "choice", label: c("Where things stand", "Tilanne nyt"), optional: true,
        options: [
          o("current", "In treatment now", "Hoidossa nyt"), o("remission", "Treatment finished, no sign of cancer", "Hoito päättynyt, ei merkkejä syövästä"),
          o("active", "Cancer is still present", "Syöpä on edelleen todettavissa"), o("unsure", "Not sure", "En ole varma"),
        ],
      },
    ],
  },
  {
    id: "meds_key", module: "health", type: "multi", unsure: true,
    title: c("Do you take any of these?", "Käytätkö jotakin seuraavista?"),
    label: c("Key medicines", "Keskeiset lääkkeet"),
    help: c("These are the ones that matter most for tests and treatment.", "Nämä ovat tutkimusten ja hoidon kannalta tärkeimpiä."),
    why: c("They affect bleeding, healing, test results and which treatments are safe.", "Ne vaikuttavat verenvuotoon, paranemiseen, tutkimustuloksiin ja siihen, mitkä hoidot ovat turvallisia."),
    options: [
      o("anticoag", "Blood thinners (for example warfarin, apixaban, rivaroxaban)", "Verenohennuslääkkeet (esim. varfariini, apiksabaani, rivaroksabaani)"),
      o("aspirin", "Daily aspirin or clopidogrel", "Päivittäinen asetyylisalisyylihappo tai klopidogreeli"),
      o("nsaid", "Regular painkillers such as ibuprofen or naproxen", "Säännöllisesti käytetyt tulehduskipulääkkeet (esim. ibuprofeeni, naprokseeni)"),
      o("steroid", "Steroid tablets or injections", "Steroiditabletit tai -pistokset"),
      o("immuno", "Medicines that dampen the immune system", "Immuunipuolustusta heikentävät lääkkeet"),
      o("contraception", "Hormonal contraception (pill, coil, implant)", "Hormonaalinen ehkäisy (pilleri, kierukka, implantti)", { when: a => femaleBody(a) }),
      o("hrt", "Menopause hormone therapy", "Vaihdevuosien hormonihoito", { when: a => femaleBody(a) && olderThan(a, 40) }),
      o("none", "None of these", "Ei mitään näistä", { exclusive: true }),
    ],
  },
  {
    id: "meds_gate", module: "health", type: "choice", layout: "yesno", unsure: true,
    title: c("Any other regular medicines, vitamins or supplements?", "Onko sinulla muita säännöllisiä lääkkeitä, vitamiineja tai ravintolisiä?"),
    label: c("Other regular medicines", "Muut säännölliset lääkkeet"),
    options: yesNo(),
  },
  {
    id: "meds_list", module: "health", type: "list", max: 15, item: c("Medicine", "Lääke"),
    show: a => eq(a, "meds_gate", "yes"),
    title: c("What do you take?", "Mitä käytät?"),
    label: c("Medicines and supplements", "Lääkkeet ja ravintolisät"),
    help: c("Check the box or packet if you can. Dose and reason are optional.", "Katso pakkauksesta, jos mahdollista. Annos ja syy ovat vapaaehtoisia."),
    fields: [
      { id: "name", type: "text", label: c("Name", "Nimi"), max: 80 },
      { id: "dose", type: "text", label: c("Dose", "Annos"), max: 60, optional: true, placeholder: c("e.g. 10 mg", "esim. 10 mg") },
      { id: "how_often", type: "choice", label: c("How often", "Kuinka usein"), options: frequencies, optional: true },
      { id: "reason", type: "text", label: c("What it is for", "Mihin käytät"), max: 100, optional: true },
    ],
  },
  {
    id: "allergy_gate", module: "health", type: "choice", layout: "yesno", unsure: true,
    title: c("Any allergies or bad reactions to medicines, foods or latex?", "Onko sinulla allergioita tai haittavaikutuksia lääkkeille, ruoille tai lateksille?"),
    label: c("Allergies", "Allergiat"),
    why: c("This is one of the most important safety questions we ask.", "Tämä on yksi tärkeimmistä turvallisuuskysymyksistä."),
    options: yesNo(),
  },
  {
    id: "allergy_list", module: "health", type: "list", max: 10, item: c("Allergy", "Allergia"),
    show: a => eq(a, "allergy_gate", "yes"),
    title: c("What are you allergic to?", "Mille olet allerginen?"),
    label: c("Allergy details", "Allergioiden tiedot"),
    fields: [
      { id: "what", type: "text", label: c("Allergic to", "Allerginen aineelle"), max: 80 },
      {
        id: "reaction", type: "multi", label: c("What happens", "Mitä tapahtuu"), optional: true,
        options: [
          o("rash", "Rash or hives", "Ihottuma tai nokkosihottuma"), o("swelling", "Swelling", "Turvotus"), o("breathing", "Trouble breathing", "Hengitysvaikeus"),
          o("anaphylaxis", "Anaphylaxis", "Anafylaksia"), o("stomach", "Stomach upset", "Vatsaoireet"), o("unsure", "Not sure", "En ole varma"),
        ],
      },
      { id: "severity", type: "choice", label: c("How bad", "Kuinka vakava"), optional: true, options: [o("mild", "Mild", "Lievä"), o("moderate", "Moderate", "Keskivaikea"), o("severe", "Severe", "Vaikea")] },
    ],
  },
  {
    id: "surgery_gate", module: "health", type: "choice", layout: "yesno", unsure: true,
    title: c("Have you ever had an operation?", "Onko sinulle tehty leikkaus?"),
    label: c("Previous operations", "Aiemmat leikkaukset"),
    help: c("Including keyhole surgery and the removal of any organ.", "Myös tähystysleikkaukset ja kaikkien elinten poistot."),
    options: yesNo(),
  },
  {
    id: "surgery_list", module: "health", type: "list", max: 10, item: c("Operation", "Leikkaus"),
    show: a => eq(a, "surgery_gate", "yes"),
    title: c("Which operations?", "Mitkä leikkaukset?"),
    label: c("Operation details", "Leikkausten tiedot"),
    fields: [
      { id: "what", type: "text", label: c("Operation", "Leikkaus"), max: 100, placeholder: c("e.g. appendix removed", "esim. umpilisäkkeen poisto") },
      { id: "year", type: "year", label: c("Year", "Vuosi"), optional: true },
    ],
  },
];
