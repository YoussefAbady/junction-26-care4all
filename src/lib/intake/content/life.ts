import { eq, oneOf } from "../access";
import type { Plan } from "../types";
import { bothered, c, o } from "./shared";

export const life: Plan[] = [
  {
    id: "smoke", module: "life", type: "choice", layout: "cards", decline: true, unsure: false,
    title: c("Which describes you best when it comes to smoking?", "Mikä kuvaa sinua parhaiten tupakoinnin suhteen?"),
    label: c("Smoking", "Tupakointi"),
    help: c("No judgement here, only accuracy.", "Ei tuomitsemista, vain tarkkuutta."),
    why: c("Smoking history is one of the strongest risk factors for many cancers and for heart and lung disease.", "Tupakointihistoria on yksi vahvimmista riskitekijöistä monille syöpätyypeille sekä sydän- ja keuhkosairauksille."),
    options: [
      o("never", "I have never smoked", "En ole koskaan tupakoinut"),
      o("former", "I used to smoke", "Olen tupakoinut aiemmin"),
      o("current", "I smoke now", "Tupakoin nykyisin", { hint: c("Including occasionally", "Myös satunnaisesti") }),
    ],
  },
  {
    id: "smoke_amount", module: "life", type: "form", unsure: true,
    show: a => oneOf(a, "smoke", ["former", "current"]),
    title: a => eq(a, "smoke", "former")
      ? c("When you smoked, about how much, and for how many years?", "Kun tupakoit, kuinka paljon ja kuinka monta vuotta?")
      : c("About how much do you smoke, and for how many years?", "Kuinka paljon tupakoit ja kuinka monta vuotta?"),
    label: c("Smoking amount", "Tupakoinnin määrä"),
    help: c("A cigarette, roll-up or similar. Rough numbers are fine.", "Savuke, itse käärity tai vastaava. Likimääräiset luvut riittävät."),
    why: c("Cigarettes per day and years smoked give us your \"pack-years\", a standard measure of exposure.", "Savukkeet päivässä ja tupakointivuodet antavat askivuodet, jotka ovat altistuksen vakiomittari."),
    fields: [
      { id: "per_day", type: "number", label: c("Per day", "Päivässä"), min: 1, max: 100, soft: [1, 60], start: 10, unit: c("cigarettes", "savuketta") },
      { id: "years", type: "number", label: c("For", "Kuinka kauan"), min: 1, max: 80, soft: [1, 60], start: 10, unit: c("years", "vuotta") },
    ],
  },
  {
    id: "smoke_quit", module: "life", type: "year",
    show: a => eq(a, "smoke", "former"),
    title: c("Which year did you stop?", "Minä vuonna lopetit?"),
    label: c("Year stopped smoking", "Tupakoinnin lopetusvuosi"),
    help: c("Well done for stopping. A rough year is fine.", "Hienoa, että lopetit. Likimääräinen vuosi riittää."),
  },
  {
    id: "tobacco_other", module: "life", type: "multi", unsure: true,
    title: c("Do you use any other tobacco or nicotine?", "Käytätkö muuta tupakkaa tai nikotiinia?"),
    label: c("Other tobacco or nicotine", "Muu tupakka tai nikotiini"),
    options: [
      o("snus", "Snus or other oral tobacco", "Nuuska tai muu suuhun käytettävä tupakka"),
      o("vape", "Vaping or e-cigarettes", "Sähkösavuke"),
      o("cigar", "Cigars or a pipe", "Sikarit tai piippu"),
      o("none", "None of these", "Ei mitään näistä", { exclusive: true }),
    ],
  },
  {
    id: "alc_freq", module: "life", type: "choice", layout: "list", decline: true, unsure: false,
    title: c("How often do you have a drink containing alcohol?", "Kuinka usein käytät alkoholia?"),
    label: c("Alcohol frequency", "Alkoholin käyttötiheys"),
    why: c("Alcohol affects the liver, bowel, breast and many medicines. We use three standard questions (AUDIT-C) so your answers are comparable.", "Alkoholi vaikuttaa maksaan, suolistoon, rintaan ja moniin lääkkeisiin. Käytämme kolmea vakiokysymystä (AUDIT-C), jotta vastaukset ovat vertailukelpoisia."),
    options: [
      o("never", "Never", "En koskaan"),
      o("monthly", "Monthly or less", "Kerran kuussa tai harvemmin"),
      o("m2_4", "2 to 4 times a month", "2–4 kertaa kuussa"),
      o("w2_3", "2 to 3 times a week", "2–3 kertaa viikossa"),
      o("w4", "4 or more times a week", "4 kertaa viikossa tai useammin"),
    ],
  },
  {
    id: "alc_amount", module: "life", type: "choice", layout: "list", decline: true, unsure: false,
    show: a => !eq(a, "alc_freq", "never"),
    title: c("On a day when you drink, how many drinks do you usually have?", "Kuinka monta annosta yleensä juot päivänä, jona käytät alkoholia?"),
    label: c("Drinks on a typical day", "Annokset tyypillisenä päivänä"),
    help: c("One drink is about a bottle of beer (33 cl), a glass of wine (12 cl) or a shot of spirits (4 cl).", "Yksi annos on noin pullo keskiolutta (33 cl), lasillinen viiniä (12 cl) tai ryyppy viinaa (4 cl)."),
    options: [
      o("d1_2", "1 or 2", "1 tai 2"), o("d3_4", "3 or 4", "3 tai 4"), o("d5_6", "5 or 6", "5 tai 6"), o("d7_9", "7 to 9", "7–9"), o("d10", "10 or more", "10 tai enemmän"),
    ],
  },
  {
    id: "alc_binge", module: "life", type: "choice", layout: "list", decline: true, unsure: false,
    show: a => !eq(a, "alc_freq", "never"),
    title: c("How often do you have six or more drinks on one occasion?", "Kuinka usein juot kerralla kuusi annosta tai enemmän?"),
    label: c("Six or more drinks at once", "Kuusi annosta tai enemmän kerralla"),
    options: [
      o("never", "Never", "En koskaan"), o("lt_monthly", "Less than monthly", "Harvemmin kuin kerran kuussa"), o("monthly", "Monthly", "Kuukausittain"),
      o("weekly", "Weekly", "Viikoittain"), o("daily", "Daily or almost daily", "Päivittäin tai lähes päivittäin"),
    ],
  },
  {
    id: "activity", module: "life", type: "number", min: 0, max: 7, unit: c("days a week", "päivää viikossa"), unsure: true,
    title: c("In a typical week, on how many days do you get 30 minutes of movement that lifts your heart rate?", "Kuinka monena päivänä tyypillisessä viikossa liikut 30 minuuttia niin, että syke nousee?"),
    label: c("Active days per week", "Aktiiviset päivät viikossa"),
    help: c("Brisk walking, cycling, gardening, dancing, sport: it all counts.", "Reipas kävely, pyöräily, puutarhatyöt, tanssi ja urheilu kaikki lasketaan."),
    why: c("Regular movement lowers the risk of several cancers, heart disease and diabetes.", "Säännöllinen liikunta pienentää usean syövän, sydänsairauksien ja diabeteksen riskiä."),
  },
  {
    id: "diet_veg", module: "life", type: "choice", layout: "list", unsure: true,
    title: c("How often do you eat vegetables, fruit or berries?", "Kuinka usein syöt kasviksia, hedelmiä tai marjoja?"),
    label: c("Vegetables, fruit and berries", "Kasvikset, hedelmät ja marjat"),
    options: [
      o("several", "Several times every day", "Useita kertoja joka päivä"), o("daily", "About once a day", "Noin kerran päivässä"),
      o("weekly", "A few times a week", "Muutaman kerran viikossa"), o("rare", "Rarely or never", "Harvoin tai ei koskaan"),
    ],
  },
  {
    id: "diet_meat", module: "life", type: "choice", layout: "list", unsure: true,
    title: c("How often do you eat red or processed meat?", "Kuinka usein syöt punaista tai prosessoitua lihaa?"),
    label: c("Red or processed meat", "Punainen tai prosessoitu liha"),
    help: c("Beef, pork, lamb, sausages, cold cuts.", "Nauta, sika, lammas, makkarat, leikkeleet."),
    why: c("A lot of red and processed meat is linked with bowel cancer, so this helps us read your overall risk.", "Runsas punaisen ja prosessoidun lihan käyttö liittyy suolistosyöpään, joten tieto auttaa arvioimaan kokonaisriskiä."),
    options: [o("rare", "Rarely or never", "Harvoin tai ei koskaan"), o("weekly", "A few times a week", "Muutaman kerran viikossa"), o("daily", "Daily or almost daily", "Päivittäin tai lähes päivittäin")],
  },
  {
    id: "sleep", module: "life", type: "number", min: 2, max: 16, soft: [4, 11], decimals: 1, step: 0.5, start: 7, unit: c("hours a night", "tuntia yössä"), unsure: true,
    title: c("How many hours do you usually sleep at night?", "Kuinka monta tuntia nukut yleensä yössä?"),
    label: c("Sleep", "Uni"),
    why: c("Sleep affects pain, mood, healing and how you feel from day to day.", "Uni vaikuttaa kipuun, mielialaan, paranemiseen ja päivittäiseen vointiin."),
  },
  {
    id: "phq1", module: "life", type: "choice", layout: "list", decline: true, unsure: false,
    title: c("Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?", "Kuinka usein sinua on viimeisen kahden viikon aikana vaivannut kiinnostuksen tai ilon puute tekemisissä?"),
    label: c("Little interest or pleasure", "Kiinnostuksen tai ilon puute"),
    help: c("Two quick mood check-ins. How you feel matters as much as how your body feels.", "Kaksi nopeaa mielialakysymystä. Se, miltä sinusta tuntuu, on yhtä tärkeää kuin kehon vointi."),
    why: c("Mood and physical health affect each other. These are standard questions used by doctors everywhere (PHQ-2 and GAD-2).", "Mieliala ja fyysinen terveys vaikuttavat toisiinsa. Nämä ovat lääkäreiden kaikkialla käyttämiä vakiokysymyksiä (PHQ-2 ja GAD-2)."),
    options: bothered,
  },
  {
    id: "phq2", module: "life", type: "choice", layout: "list", decline: true, unsure: false,
    title: c("…and by feeling down, depressed or hopeless?", "…entä alakuloisuus, masentuneisuus tai toivottomuus?"),
    label: c("Feeling down or hopeless", "Alakuloisuus tai toivottomuus"),
    options: bothered,
  },
  {
    id: "gad1", module: "life", type: "choice", layout: "list", decline: true, unsure: false,
    title: c("…and by feeling nervous, anxious or on edge?", "…entä hermostuneisuus, ahdistuneisuus tai kireys?"),
    label: c("Nervous or on edge", "Hermostuneisuus tai kireys"),
    options: bothered,
  },
  {
    id: "gad2", module: "life", type: "choice", layout: "list", decline: true, unsure: false,
    title: c("…and by not being able to stop or control worrying?", "…entä kyvyttömyys lopettaa tai hallita huolehtimista?"),
    label: c("Unable to control worry", "Huolehtimisen hallitsemattomuus"),
    options: bothered,
  },
];
