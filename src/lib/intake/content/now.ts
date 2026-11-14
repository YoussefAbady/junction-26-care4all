import type { Copy } from "../../survey";
import { femaleBody, has, maleBody } from "../access";
import type { Opt, Plan, Question } from "../types";
import { c, o, yesNo } from "./shared";

const other = () => o("other", "Something else", "Jotain muuta");

type Area = { ask: Copy; what: Opt[]; extras: (id: (name: string) => string, tag: Copy, label: (en: string, fi: string) => Copy) => Question[] };

const areas: Record<string, Area> = {
  bowel: {
    ask: c("What changes have you noticed with your digestion or bowels?", "Mitä muutoksia olet huomannut ruoansulatuksessa tai suolen toiminnassa?"),
    what: [
      o("blood_red", "Bright red blood when I pass stool", "Kirkkaanpunaista verta ulostettaessa", { flag: "soon" }),
      o("blood_dark", "Black, tar-like stools", "Mustaa, tervamaista ulostetta", { flag: "urgent" }),
      o("habit", "A lasting change in my bowel habits (3+ weeks)", "Pitkään jatkunut muutos suolen toiminnassa (yli 3 viikkoa)", { flag: "soon" }),
      o("diarrhoea", "Frequent loose stools", "Toistuva ripuli"),
      o("constipation", "Constipation", "Ummetus"),
      o("incomplete", "Feeling I have not fully emptied", "Tunne, ettei suoli tyhjene kokonaan"),
      o("mucus", "Mucus in my stool", "Limaa ulosteessa"),
      o("pain", "Tummy pain or cramps", "Vatsakipu tai kouristukset"),
      o("bloating", "Bloating or swelling", "Turvotus tai ilmavaivat"),
      o("nausea", "Nausea or vomiting", "Pahoinvointi tai oksentelu"),
      o("heartburn", "Heartburn or reflux", "Närästys tai refluksi"),
      o("swallowing", "Trouble swallowing", "Nielemisvaikeus", { flag: "soon" }),
      o("appetite", "Loss of appetite", "Ruokahalun menetys"),
      o("vomit_blood", "Vomiting blood", "Verioksennus", { flag: "emergency" }),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("freq"), module: "now", type: "choice", layout: "list", tag,
      title: c("How often are you passing stool at the moment?", "Kuinka usein ulostat tällä hetkellä?"),
      label: label("Stool frequency", "Ulostamistiheys"),
      why: c("Changes from your usual pattern matter more than the pattern itself.", "Muutos tavallisesta on tärkeämpää kuin tavallinen tiheys sinänsä."),
      options: [
        o("many", "More than 3 times a day", "Yli 3 kertaa päivässä"),
        o("usual", "1 to 3 times a day", "1–3 kertaa päivässä"),
        o("few", "Every 2 to 3 days", "Joka 2.–3. päivä"),
        o("rare", "Less often than every 3 days", "Harvemmin kuin joka 3. päivä"),
        o("varies", "It varies a lot", "Se vaihtelee paljon"),
      ],
    }],
  },
  breast: {
    ask: c("What changes have you noticed in your breast or chest?", "Mitä muutoksia olet huomannut rinnoissa tai rintakehässä?"),
    what: [
      o("lump", "A lump or thickening", "Patti tai kovettuma", { flag: "soon" }),
      o("discharge", "Fluid or blood from the nipple", "Nestettä tai verta nännistä", { flag: "soon" }),
      o("skin", "Dimpling, redness or a rash on the skin", "Ihon kuoppaisuutta, punoitusta tai ihottumaa", { flag: "soon" }),
      o("nipple", "A nipple that has turned in or changed", "Sisäänpäin vetäytynyt tai muuttunut nänni"),
      o("shape", "A change in size or shape", "Koon tai muodon muutos"),
      o("pain", "Pain or tenderness", "Kipu tai arkuus"),
      o("armpit", "A lump or swelling in the armpit", "Patti tai turvotus kainalossa", { flag: "soon" }),
      other(),
    ],
    extras: (id, tag, label) => [
      {
        id: id("side"), module: "now", type: "choice", layout: "pills", tag,
        title: c("Which side is it on?", "Kummalla puolella se on?"), label: label("Side", "Puoli"),
        options: [o("left", "Left", "Vasen"), o("right", "Right", "Oikea"), o("both", "Both", "Molemmat")],
      },
      {
        id: id("cycle"), module: "now", type: "choice", layout: "list", tag,
        show: a => femaleBody(a),
        title: c("Does it change with your menstrual cycle?", "Muuttuuko se kuukautiskierron mukana?"), label: label("Linked to cycle", "Yhteys kiertoon"),
        why: c("Changes that come and go with your cycle are usually less worrying than changes that stay.", "Kuukautiskierron mukana vaihtelevat muutokset huolestuttavat yleensä vähemmän kuin pysyvät."),
        options: [
          o("yes", "Yes, it comes and goes with my cycle", "Kyllä, se tulee ja menee kierron mukana"),
          o("no", "No, it stays the same all month", "Ei, se pysyy samana koko kuukauden"),
          o("none", "I no longer have periods", "Minulla ei ole enää kuukautisia"),
        ],
      },
    ],
  },
  urinary: {
    ask: c("What changes have you noticed when you pass urine?", "Mitä muutoksia olet huomannut virtsaamisessa?"),
    what: [
      o("blood", "Blood in my urine", "Verta virtsassa", { flag: "soon" }),
      o("burning", "Burning or stinging", "Polttava tai kirvelevä tunne"),
      o("frequent", "Needing to go very often", "Tiheä virtsaamisen tarve"),
      o("urgent", "A sudden, urgent need to go", "Äkillinen, pakottava virtsaamisen tarve"),
      o("night", "Waking at night to pass urine", "Heräämistä yöllä virtsaamaan"),
      o("stream", "A weak stream or trouble starting", "Heikko virtsasuihku tai vaikeus aloittaa"),
      o("leak", "Leaking urine", "Virtsan karkailu"),
      o("flank", "Pain in my side or back", "Kipua kyljessä tai selässä"),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("fever"), module: "now", type: "choice", layout: "yesno", tag,
      title: c("Have you had a fever or chills with this?", "Onko sinulla ollut tämän kanssa kuumetta tai vilunväristyksiä?"), label: label("Fever or chills", "Kuume tai vilunväristykset"),
      why: c("Fever alongside urinary symptoms can point to an infection that needs treating.", "Kuume virtsaoireiden yhteydessä voi viitata hoitoa vaativaan tulehdukseen."),
      options: yesNo(),
    }],
  },
  gyn: {
    ask: c("What changes have you noticed with your periods or pelvic health?", "Mitä muutoksia olet huomannut kuukautisissa tai lantion alueella?"),
    what: [
      o("bleed_between", "Bleeding between periods", "Vuotoa kuukautisten välillä", { flag: "soon" }),
      o("bleed_sex", "Bleeding after sex", "Vuotoa yhdynnän jälkeen", { flag: "soon" }),
      o("bleed_post", "Bleeding after the menopause", "Vuotoa vaihdevuosien jälkeen", { flag: "soon" }),
      o("heavy", "Much heavier periods than usual", "Tavallista runsaammat kuukautiset"),
      o("irregular", "Irregular periods", "Epäsäännölliset kuukautiset"),
      o("pelvic", "Pelvic or lower tummy pain", "Lantion tai alavatsan kipu"),
      o("discharge", "Unusual discharge", "Epätavallinen valkovuoto"),
      o("sexpain", "Pain during sex", "Kipu yhdynnässä"),
      o("bloat_full", "Constant bloating or feeling full quickly", "Jatkuva turvotus tai nopea kylläisyyden tunne", { flag: "soon" }),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("lmp"), module: "now", type: "choice", layout: "list", tag,
      title: c("When did your last period start?", "Milloin viimeisimmät kuukautisesi alkoivat?"), label: label("Last period", "Viimeisimmät kuukautiset"),
      why: c("Where you are in your cycle changes how bleeding and pain are interpreted.", "Kierron vaihe vaikuttaa siihen, miten vuotoa ja kipua tulkitaan."),
      options: [
        o("m1", "Within the last month", "Kuluneen kuukauden aikana"),
        o("m3", "1 to 3 months ago", "1–3 kuukautta sitten"),
        o("m12", "3 to 12 months ago", "3–12 kuukautta sitten"),
        o("y1", "More than a year ago", "Yli vuosi sitten"),
        o("never", "I have never had a period", "Minulla ei ole koskaan ollut kuukautisia"),
      ],
    }],
  },
  andro: {
    ask: c("What changes have you noticed in your genitals or groin?", "Mitä muutoksia olet huomannut sukuelimissä tai nivusissa?"),
    what: [
      o("lump", "A lump in a testicle", "Patti kiveksessä", { flag: "soon" }),
      o("swelling", "Swelling or heaviness", "Turvotus tai painon tunne"),
      o("pain", "Pain or aching", "Kipu tai särky"),
      o("groin", "A lump in the groin", "Patti nivusessa", { flag: "soon" }),
      o("semen", "Blood in semen", "Verta siemennesteessä", { flag: "soon" }),
      o("discharge", "Discharge from the penis", "Vuotoa penisestä"),
      o("erectile", "Difficulty with erections", "Erektiovaikeudet"),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("side"), module: "now", type: "choice", layout: "pills", tag,
      title: c("Which side is it on?", "Kummalla puolella se on?"), label: label("Side", "Puoli"),
      options: [o("left", "Left", "Vasen"), o("right", "Right", "Oikea"), o("both", "Both", "Molemmat")],
    }],
  },
  breath: {
    ask: c("What changes have you noticed in your breathing or chest?", "Mitä muutoksia olet huomannut hengityksessä tai rintakehässä?"),
    what: [
      o("chest_now", "Chest pain or pressure right now", "Rintakipua tai puristavaa tunnetta juuri nyt", { flag: "emergency" }),
      o("sob_rest", "Struggling to breathe, even at rest", "Hengitysvaikeuksia levossakin", { flag: "emergency" }),
      o("cough_blood", "Coughing up blood", "Veriyskää", { flag: "urgent" }),
      o("chest_onoff", "Chest pain that comes and goes", "Ajoittaista rintakipua", { flag: "urgent" }),
      o("cough3", "A cough lasting more than 3 weeks", "Yli 3 viikkoa kestänyt yskä", { flag: "soon" }),
      o("hoarse", "A hoarse voice for more than 3 weeks", "Yli 3 viikkoa kestänyt käheä ääni", { flag: "soon" }),
      o("sob_active", "Short of breath when I am active", "Hengenahdistusta rasituksessa"),
      o("wheeze", "Wheezing", "Vinkuva hengitys"),
      o("phlegm", "Lots of phlegm", "Runsaasti limaa"),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("lying"), module: "now", type: "choice", layout: "yesno", tag,
      title: c("Is it worse when you lie flat?", "Pahenevatko oireet makuuasennossa?"), label: label("Worse lying flat", "Pahenee makuulla"),
      options: yesNo(),
    }],
  },
  skin: {
    ask: c("What have you noticed on your skin?", "Mitä olet huomannut iholla?"),
    what: [
      o("changed", "A mole that has changed in size, shape or colour", "Luomi, jonka koko, muoto tai väri on muuttunut", { flag: "soon" }),
      o("sore", "A sore that has not healed in 4 weeks", "Haava, joka ei ole parantunut 4 viikossa", { flag: "soon" }),
      o("bleeding", "A spot that bleeds or crusts over", "Kohta, joka vuotaa verta tai rupeutuu", { flag: "soon" }),
      o("lump", "A new lump under the skin", "Uusi patti ihon alla", { flag: "soon" }),
      o("new", "A new mole or spot", "Uusi luomi tai läiskä"),
      o("itch", "Itching", "Kutina"),
      o("rash", "A rash", "Ihottuma"),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("where"), module: "now", type: "body", tag,
      title: c("Where on your body is it?", "Missä kohtaa kehoa se on?"), label: label("Location", "Sijainti"),
      help: c("Tap the places on the figure. Switch to the back view if you need to.", "Napauta kohdat hahmosta. Vaihda tarvittaessa selän puolelle."),
      why: c("The exact place helps a clinician know what to examine first.", "Tarkka paikka auttaa lääkäriä tietämään, mitä tutkia ensin."),
    }],
  },
  pain: {
    ask: c("How would you describe the pain or ache?", "Miten kuvailisit kipua tai särkyä?"),
    what: [
      o("worst", "The worst pain I have ever had", "Pahin kipu, joka minulla on koskaan ollut", { flag: "urgent" }),
      o("sharp", "Sharp or stabbing", "Terävä tai pistävä"),
      o("dull", "A dull ache", "Jomottava särky"),
      o("burning", "Burning", "Polttava"),
      o("cramping", "Cramping", "Kouristava"),
      o("throbbing", "Throbbing", "Sykkivä"),
      o("tingling", "Pins and needles or numbness", "Pistelyä tai tunnottomuutta"),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("where"), module: "now", type: "body", tag,
      title: c("Where does it hurt?", "Missä kohtaa sattuu?"), label: label("Location", "Sijainti"),
      help: c("Tap every place that hurts. Switch to the back view if you need to.", "Napauta kaikki kipeät kohdat. Vaihda tarvittaessa selän puolelle."),
      why: c("Where pain is, and where it travels, is often the biggest clue.", "Kivun sijainti ja leviäminen on usein tärkein vihje."),
    }],
  },
  general: {
    ask: c("What have you noticed about how you feel overall?", "Mitä olet huomannut yleisvoinnistasi?"),
    what: [
      o("weight_loss", "Losing weight without trying", "Painon lasku ilman yritystä", { flag: "soon" }),
      o("night_sweats", "Drenching night sweats", "Runsas yöhikoilu", { flag: "soon" }),
      o("glands", "Swollen glands or lumps (neck, armpit, groin)", "Turvonneita imusolmukkeita tai patteja (kaula, kainalo, nivus)", { flag: "soon" }),
      o("bruising", "Easy bruising or bleeding", "Helposti syntyviä mustelmia tai vuotoja", { flag: "soon" }),
      o("tired", "Feeling tired all the time", "Jatkuva väsymys"),
      o("fever", "Fever or chills", "Kuume tai vilunväristykset"),
      o("appetite", "Loss of appetite", "Ruokahalun menetys"),
      o("itch", "Itching all over", "Kutina kaikkialla"),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("loss"), module: "now", type: "form", tag, unsure: true,
      show: a => has(a, id("what"), "weight_loss"),
      title: c("About how much weight have you lost, and over how long?", "Kuinka paljon olet laihtunut ja kuinka pitkän ajan kuluessa?"), label: label("Unplanned weight loss", "Tahaton painonlasku"),
      why: c("The amount and the speed of weight loss help a clinician judge how much it matters.", "Painonlaskun määrä ja nopeus auttavat lääkäriä arvioimaan sen merkitystä."),
      fields: [
        { id: "amount", type: "choice", label: c("Amount", "Määrä"), options: [o("lt2", "Under 2 kg", "Alle 2 kg"), o("2_5", "2 to 5 kg", "2–5 kg"), o("5_10", "5 to 10 kg", "5–10 kg"), o("gt10", "More than 10 kg", "Yli 10 kg")] },
        { id: "period", type: "choice", label: c("Over about", "Noin"), options: [o("month", "The last month", "Viimeisen kuukauden aikana"), o("3m", "3 months", "3 kuukauden aikana"), o("6m", "6 months", "6 kuukauden aikana"), o("year", "A year or more", "Vuoden tai pidemmän ajan")] },
      ],
    }],
  },
  head: {
    ask: c("What have you noticed with your head, nerves or senses?", "Mitä olet huomannut päässä, hermostossa tai aisteissa?"),
    what: [
      o("thunder", "A sudden, severe headache, the worst ever", "Äkillinen, voimakas päänsärky, pahin koskaan", { flag: "emergency" }),
      o("weakness", "Weakness or numbness on one side of the face or body", "Toispuolinen kasvojen tai kehon heikkous tai tunnottomuus", { flag: "emergency" }),
      o("speech", "Slurred speech or sudden confusion", "Puheen puuroutumista tai äkillistä sekavuutta", { flag: "emergency" }),
      o("vision", "Sudden loss or blurring of vision", "Äkillinen näön menetys tai sumentuminen", { flag: "urgent" }),
      o("seizure", "A seizure or blackout", "Kouristuskohtaus tai tajunnan menetys", { flag: "urgent" }),
      o("lump", "A lump on the head or neck", "Patti päässä tai kaulalla", { flag: "soon" }),
      o("headache", "Headaches", "Päänsärky"),
      o("dizzy", "Dizziness or balance problems", "Huimaus tai tasapainovaikeudet"),
      o("tingling", "Numbness or tingling", "Tunnottomuus tai pistely"),
      o("memory", "Memory or concentration problems", "Muisti- tai keskittymisvaikeudet"),
      o("hearing", "Hearing problems or ringing in the ears", "Kuulo-ongelmat tai korvien soiminen"),
      other(),
    ],
    extras: (id, tag, label) => [{
      id: id("sudden"), module: "now", type: "choice", layout: "yesno", tag,
      title: c("Did it come on suddenly, within minutes?", "Alkoiko se äkillisesti, muutamassa minuutissa?"), label: label("Sudden onset", "Äkillinen alku"),
      why: c("Sudden changes in the head and nerves are treated very differently from slow ones.", "Äkilliset muutokset päässä ja hermostossa hoidetaan eri tavalla kuin hitaasti kehittyvät."),
      options: [o("yes", "Yes", "Kyllä", { flag: "urgent" }), o("no", "No", "Ei")],
    }],
  },
};

const areaOptions: Opt[] = [
  o("bowel", "Digestion and bowels", "Ruoansulatus ja suolisto", { icon: "Utensils" }),
  o("breast", "Breast or chest", "Rinnat tai rintakehä", { icon: "Heart" }),
  o("urinary", "Passing urine", "Virtsaaminen", { icon: "Droplets" }),
  o("gyn", "Periods or pelvic health", "Kuukautiset tai lantion alue", { icon: "Flower2", when: a => femaleBody(a) }),
  o("andro", "Genitals or groin", "Sukuelimet tai nivuset", { icon: "CircleDot", when: a => maleBody(a) }),
  o("breath", "Breathing or chest pain", "Hengitys tai rintakipu", { icon: "Wind" }),
  o("skin", "Skin or moles", "Iho tai luomet", { icon: "Hand" }),
  o("pain", "Pain or aches", "Kipu tai särky", { icon: "Zap" }),
  o("general", "Energy, weight or fever", "Jaksaminen, paino tai kuume", { icon: "Thermometer" }),
  o("head", "Head, nerves or senses", "Pää, hermosto tai aistit", { icon: "Brain" }),
  o("other", "Something else", "Jotain muuta", { icon: "MessageCircle" }),
];

const startOptions = [
  o("today", "Today", "Tänään"),
  o("days", "In the last few days", "Viime päivinä"),
  o("weeks", "1 to 4 weeks ago", "1–4 viikkoa sitten"),
  o("months", "1 to 3 months ago", "1–3 kuukautta sitten"),
  o("months_long", "3 to 12 months ago", "3–12 kuukautta sitten"),
  o("year_plus", "More than a year ago", "Yli vuosi sitten"),
];

export const now: Plan[] = [
  {
    id: "reason", module: "now", type: "multi", unsure: false,
    title: c("What brings you here today?", "Mikä tuo sinut tänne tänään?"),
    label: c("Reason for visit", "Käynnin syy"),
    help: c("Pick everything that fits.", "Valitse kaikki sopivat."),
    why: c("This tells us where to dig deeper, and where we can skip ahead so you are not answering questions that do not matter.", "Tämä kertoo, mihin kannattaa syventyä ja minkä voi ohittaa, ettet vastaa turhiin kysymyksiin."),
    options: [
      o("symptom", "A symptom or something that worries me", "Oire tai asia, joka huolestuttaa", { icon: "Stethoscope" }),
      o("letter", "A screening letter or test result I want to understand", "Seulontakirje tai tutkimustulos, jonka haluan ymmärtää", { icon: "FileText" }),
      o("checkup", "A routine check-up or prevention", "Tavallinen terveystarkastus tai ennaltaehkäisy", { icon: "ShieldCheck" }),
      o("known", "A condition I already have and want to keep on record", "Jo todettu sairaus, jonka haluan tallentaa tietoihini", { icon: "ClipboardList" }),
    ],
  },
  {
    id: "areas", module: "now", type: "multi", max: 3, unsure: false,
    show: a => has(a, "reason", "symptom"),
    title: c("Where are you noticing it?", "Missä asiassa sen huomaat?"),
    label: c("Areas of concern", "Huolenaiheet"),
    help: c("Choose up to three, starting with the one that bothers you most.", "Valitse enintään kolme, aloita eniten vaivaavasta."),
    why: c("Each area you choose opens a short, tailored set of follow-up questions. Nothing else does.", "Jokainen valitsemasi alue avaa lyhyen, räätälöidyn jatkokysymyssarjan. Muita ei tule."),
    options: areaOptions,
  },
  {
    id: "areas_other", module: "now", type: "text", max: 600,
    show: a => has(a, "areas", "other"),
    title: c("Tell us about it in your own words", "Kerro siitä omin sanoin"),
    label: c("Other concern", "Muu huolenaihe"),
    help: c("What you have noticed, where, and since when.", "Mitä olet huomannut, missä ja mistä lähtien."),
    placeholder: c("Describe it as you would to a friend", "Kuvaile se kuin ystävälle"),
  },
  {
    gen: "sx", source: "areas", skip: ["other"],
    make: (key, label) => {
      const area = areas[key];
      const id = (name: string) => `sx:${key}:${name}`;
      const lab = (en: string, fi: string): Copy => [`${label[0]}: ${en}`, `${label[1]}: ${fi}`];
      const tag = label;
      return [
        {
          id: id("what"), module: "now", type: "multi", tag, title: area.ask, label: lab("what I notice", "havainnot"),
          help: c("Pick everything that fits.", "Valitse kaikki sopivat."),
          why: c("Specific details beat general descriptions. They help narrow down what to look at first.", "Tarkat tiedot ovat yleisiä kuvauksia parempia. Ne auttavat rajaamaan, mitä tutkitaan ensin."),
          options: area.what,
        },
        ...area.extras(id, tag, lab),
        {
          id: id("start"), module: "now", type: "choice", layout: "list", tag,
          title: c("When did this start?", "Milloin tämä alkoi?"), label: lab("started", "alkoi"),
          help: c("A rough guess is perfectly fine.", "Likimääräinen arvio riittää."),
          why: c("How long something has been going on changes how it is investigated.", "Se, kuinka kauan oire on kestänyt, vaikuttaa siihen, miten sitä tutkitaan."),
          options: startOptions,
        },
        {
          id: id("course"), module: "now", type: "choice", layout: "list", tag,
          title: c("Since it started, has it been…", "Onko se alun jälkeen…"), label: lab("course", "kulku"),
          options: [
            o("better", "Getting better", "Helpottanut"),
            o("same", "About the same", "Pysynyt suunnilleen samana"),
            o("worse", "Getting worse", "Pahentunut"),
            o("comes_goes", "Coming and going", "Tullut ja mennyt"),
          ],
        },
        {
          id: id("severity"), module: "now", type: "scale", tag,
          title: c("At its worst, how much does it bother you?", "Kuinka paljon se pahimmillaan vaivaa sinua?"), label: lab("severity", "voimakkuus"),
          low: c("Barely noticeable", "Tuskin huomaan"), high: c("The worst I can imagine", "Pahin mahdollinen"),
          help: c("0 is nothing at all, 10 is the worst you can imagine.", "0 tarkoittaa ei mitään, 10 pahinta mahdollista."),
          why: c("A simple number lets your clinician compare how you feel now with how you feel later.", "Yksinkertainen luku auttaa lääkäriä vertaamaan vointiasi nyt ja myöhemmin."),
        },
        {
          id: id("impact"), module: "now", type: "multi", tag,
          title: c("Does it get in the way of anything?", "Haittaako se jotakin?"), label: lab("impact on daily life", "vaikutus arkeen"),
          help: c("Pick everything that fits.", "Valitse kaikki sopivat."),
          options: [
            o("sleep", "It disturbs my sleep", "Se häiritsee untani"),
            o("work", "Work or studies", "Työtä tai opiskelua"),
            o("eating", "Eating or appetite", "Syömistä tai ruokahalua"),
            o("moving", "Moving around or exercise", "Liikkumista tai liikuntaa"),
            o("mood", "My mood or relationships", "Mielialaa tai ihmissuhteita"),
            o("none", "It doesn't get in the way", "Se ei haittaa", { exclusive: true }),
          ],
        },
        {
          id: id("tried"), module: "now", type: "text", tag, optional: true, max: 500,
          title: c("What have you tried so far?", "Mitä olet kokeillut tähän mennessä?"), label: lab("tried so far", "kokeillut"),
          help: c("Medicines, rest, changes to food, anything.", "Lääkkeitä, lepoa, ruokavaliomuutoksia, mitä tahansa."),
          placeholder: c("For example: paracetamol twice a day, helped a little", "Esimerkiksi: parasetamoli kahdesti päivässä, helpotti vähän"),
        },
      ];
    },
  },
  {
    id: "sx_notes", module: "now", type: "text", optional: true, max: 800,
    show: a => Array.isArray(a.areas) && (a.areas as string[]).some(area => area !== "other"),
    title: c("Anything else about how you are feeling?", "Onko vielä jotain vointiisi liittyvää?"),
    label: c("Extra notes on symptoms", "Lisätietoja oireista"),
    help: c("Things that seem unrelated are welcome too.", "Myös asiat, jotka tuntuvat täysin liittymättömiltä, ovat tervetulleita."),
    placeholder: c("Anything at all", "Mitä tahansa"),
  },
];
