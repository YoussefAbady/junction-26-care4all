import { ageOf, eq, femaleBody, isMarker } from "../access";
import type { Plan } from "../types";
import { c, o } from "./shared";

/** The largest cities in Finland, biggest first, as [id, name]. The names are the same in English and Finnish. */
const cities: [string, string][] = [
  ["helsinki", "Helsinki"], ["espoo", "Espoo"], ["tampere", "Tampere"], ["vantaa", "Vantaa"], ["oulu", "Oulu"], ["turku", "Turku"],
  ["jyvaskyla", "Jyväskylä"], ["lahti", "Lahti"], ["kuopio", "Kuopio"], ["pori", "Pori"], ["kouvola", "Kouvola"], ["joensuu", "Joensuu"],
  ["lappeenranta", "Lappeenranta"], ["hameenlinna", "Hämeenlinna"], ["vaasa", "Vaasa"], ["seinajoki", "Seinäjoki"], ["rovaniemi", "Rovaniemi"],
  ["mikkeli", "Mikkeli"], ["kotka", "Kotka"], ["salo", "Salo"], ["porvoo", "Porvoo"], ["kokkola", "Kokkola"], ["hyvinkaa", "Hyvinkää"],
  ["lohja", "Lohja"], ["jarvenpaa", "Järvenpää"], ["rauma", "Rauma"], ["kajaani", "Kajaani"], ["kerava", "Kerava"], ["savonlinna", "Savonlinna"],
  ["nokia", "Nokia"], ["kemi", "Kemi"], ["riihimaki", "Riihimäki"], ["imatra", "Imatra"], ["raahe", "Raahe"], ["tornio", "Tornio"], ["iisalmi", "Iisalmi"],
];

export const you: Plan[] = [
  {
    id: "name", module: "you", type: "text", short: true, max: 40, optional: true,
    title: c("First things first: what should we call you?", "Ensin: miten sinua kutsutaan?"),
    label: c("Preferred name", "Kutsumanimi"),
    help: c("A first name or a nickname is perfect.", "Etunimi tai lempinimi riittää."),
    placeholder: c("e.g. Sam", "esim. Aino"),
    why: c("It just makes this feel less like a form and more like a conversation.", "Nimi tekee tästä keskustelun lomakkeen sijaan."),
  },
  {
    id: "dob", module: "you", type: "date", unsure: false,
    title: c("When were you born?", "Milloin olet syntynyt?"),
    label: c("Date of birth", "Syntymäaika"),
    help: c("Day, month and year.", "Päivä, kuukausi ja vuosi."),
    why: c("Age changes what is normal and which health checks matter, so an exact date is more useful than an age group.", "Ikä vaikuttaa siihen, mikä on normaalia ja mitkä tutkimukset ovat tärkeitä. Tarkka päivämäärä on hyödyllisempi kuin ikäryhmä."),
  },
  {
    id: "sex", module: "you", type: "choice", layout: "cards", unsure: false, decline: true,
    title: c("What sex were you assigned at birth?", "Mikä sukupuoli sinulle määriteltiin syntymässä?"),
    label: c("Sex assigned at birth", "Syntymässä määritelty sukupuoli"),
    why: c("Different bodies have different risks and tests. This is about biology, not identity. You can tell us about your gender next.", "Eri kehoilla on erilaisia riskejä ja tutkimuksia. Tämä koskee biologiaa, ei identiteettiä. Sukupuoli-identiteetistä voit kertoa seuraavaksi."),
    options: [
      o("female", "Female", "Nainen"),
      o("male", "Male", "Mies"),
      o("intersex", "Intersex or another variation", "Intersukupuolinen tai muu sukupuolen kehityksen vaihtelu"),
    ],
  },
  {
    id: "organs", module: "you", type: "multi",
    show: a => isMarker(a.sex) || eq(a, "sex", "intersex"),
    title: c("Which of these do you have at the moment?", "Mitä seuraavista sinulla on tällä hetkellä?"),
    label: c("Organs present", "Elimet"),
    help: c("This helps us ask only about what applies to you.", "Näin kysymme vain sinuun sopivista asioista."),
    why: c("Screening and symptom questions depend on which organs you have, whatever your sex or gender.", "Seulonta- ja oirekysymykset riippuvat siitä, mitä elimiä sinulla on, sukupuolesta riippumatta."),
    options: [
      o("breasts", "Breast tissue", "Rintakudos"),
      o("uterus", "Womb (uterus)", "Kohtu"),
      o("cervix", "Cervix", "Kohdunkaula"),
      o("ovaries", "Ovaries", "Munasarjat"),
      o("prostate", "Prostate", "Eturauhanen"),
      o("testes", "Testicles", "Kivekset"),
      o("none", "None of these", "Ei mikään näistä", { exclusive: true }),
    ],
  },
  {
    id: "gender", module: "you", type: "choice", layout: "cards", optional: true, decline: true, unsure: false,
    title: c("How would you describe your gender?", "Miten kuvailisit sukupuoli-identiteettiäsi?"),
    label: c("Gender", "Sukupuoli-identiteetti"),
    why: c("So your care team can speak to you respectfully.", "Jotta hoitotiimi voi kohdata sinut kunnioittavasti."),
    options: [
      o("woman", "Woman", "Nainen"),
      o("man", "Man", "Mies"),
      o("nonbinary", "Non-binary", "Muunsukupuolinen"),
      o("self", "Another way", "Jollakin muulla tavalla"),
    ],
  },
  {
    id: "pregnancy", module: "you", type: "choice", layout: "cards", unsure: false, decline: true,
    show: a => femaleBody(a) && (ageOf(a) ?? 0) >= 12 && (ageOf(a) ?? 99) <= 55,
    title: c("Are you pregnant or breastfeeding?", "Oletko raskaana tai imetätkö?"),
    label: c("Pregnancy or breastfeeding", "Raskaus tai imetys"),
    why: c("Pregnancy changes which tests, scans and medicines are safe.", "Raskaus vaikuttaa siihen, mitkä tutkimukset, kuvaukset ja lääkkeet ovat turvallisia."),
    options: [
      o("no", "No", "En"),
      o("pregnant", "Yes, I'm pregnant", "Kyllä, olen raskaana"),
      o("maybe", "I might be", "Voin olla raskaana"),
      o("nursing", "I'm breastfeeding", "Imetän"),
    ],
  },
  {
    id: "body", module: "you", type: "form", decline: true,
    title: c("How tall are you, and how much do you weigh?", "Kuinka pitkä olet ja paljonko painat?"),
    label: c("Height and weight", "Pituus ja paino"),
    help: c("A good estimate is fine. The scale never judges here.", "Hyvä arvio riittää. Täällä vaaka ei tuomitse."),
    why: c("Height and weight help us read symptoms, medicine doses and many risk factors.", "Pituus ja paino auttavat tulkitsemaan oireita, lääkeannoksia ja monia riskitekijöitä."),
    fields: [
      { id: "height", type: "number", label: c("Height", "Pituus"), min: 100, max: 230, soft: [140, 205], start: 170, unit: c("cm", "cm") },
      { id: "weight", type: "number", label: c("Weight", "Paino"), min: 25, max: 300, soft: [40, 160], decimals: 1, start: 70, unit: c("kg", "kg") },
    ],
  },
  {
    id: "weight_change", module: "you", type: "choice", layout: "list", decline: true,
    title: c("Has your weight changed in the last 6 months?", "Onko painosi muuttunut viimeisen 6 kuukauden aikana?"),
    label: c("Weight change, last 6 months", "Painon muutos, 6 kk"),
    why: c("Weight loss you did not plan is one of the details clinicians most want to know about.", "Tahaton painonlasku on yksi tärkeimmistä tiedoista lääkärille."),
    options: [
      o("stable", "No, it has been steady", "Ei, se on pysynyt samana"),
      o("loss_small", "I lost weight without trying (under 5 kg)", "Laihduin tahattomasti (alle 5 kg)"),
      o("loss_big", "I lost weight without trying (5 kg or more)", "Laihduin tahattomasti (5 kg tai enemmän)", { flag: "soon" }),
      o("gain", "I gained weight without trying", "Painoni nousi tahattomasti"),
      o("intentional", "It changed because I was trying to change it", "Se muuttui, koska yritin muuttaa sitä"),
    ],
  },
  {
    id: "residence", module: "you", type: "choice", layout: "list", unsure: false,
    title: c("Where do you live?", "Missä asut?"),
    label: c("Place of residence", "Asuinpaikka"),
    help: c("Choose your city. If it is not listed, choose “Another place in Finland”.", "Valitse kaupunkisi. Jos sitä ei ole listalla, valitse ”Muu paikkakunta Suomessa”."),
    why: c("Health services and screening programmes differ from place to place.", "Terveyspalvelut ja seulontaohjelmat vaihtelevat paikkakunnittain."),
    options: [
      ...cities.map(([id, name]) => o(id, name, name)),
      o("finland", "Another place in Finland", "Muu paikkakunta Suomessa"),
      o("abroad", "Outside Finland", "Suomen ulkopuolella"),
      // The first version of this question asked for a region. An answer already given stays valid and is shown to the person
      // who gave it, and nobody else is offered it.
      o("uusimaa", "Helsinki-Uusimaa (earlier answer)", "Helsinki-Uusimaa (aiempi vastaus)", { when: a => eq(a, "residence", "uusimaa") }),
    ],
  },
];
