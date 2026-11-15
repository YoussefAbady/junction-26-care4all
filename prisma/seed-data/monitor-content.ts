import type { MonitorSeed } from "./v2-types";

// Owner: the monitor package. The rules and wording of close monitoring as seed data: the check-in rules of the design's
// A.monitorAssess, the six check-in flags, the serious-now wording, the symptom triage rules and the screen copy
// (docs/design-v2.md sections 7 and 9, and Appendix A for the shape and the values).
//
// Provenance. The English check-in texts, the flags, the trends and the numbers are the design's own (design v2 lines
// 12233-12446, retrieved 2026-11-14 with the design export; not re-read from a page). The triage words and the
// category lines come from the design's symptom engine (CATS, MUST_SEE, RED, outcome()) and are written for this product,
// not taken from a source. Every Finnish text is a hand draft marked "unreviewed" until a native speaker has read it.
// Wording is information only: no diagnosis, no score about a person, no reassurance that a symptom is harmless.

export const monitorSeed: MonitorSeed = {
  rules: {
    steps: [3, 7, 14, 21],
    reminderHour: 9,
    timeZone: "Europe/Helsinki",
    minGapDays: 2,
    snoozeDays: 1,
    thresholds: { strong: 7, veryStrong: 9, rise: 2 },
    stillThereDays: 21,
    noBetterDays: 7,
    urgency: {
      ladder: ["weeks", "days", "today"],
      watch: "weeks",
      serious: "today",
      raise: { worse: "days", strong: "days", veryStrong: "today", rise: "days", newFlags: "days" },
    },
    trends: [
      {
        id: "gone", label: { en: "It has gone", fi: "Se on mennyt ohi" }, word: { en: "gone", fi: "mennyt ohi" },
        doctorWord: { en: "it has gone", fi: "se on mennyt ohi" },
      },
      {
        id: "better", label: { en: "Better", fi: "Parempi" }, word: { en: "better", fi: "parempi" },
        doctorWord: { en: "better", fi: "parempi" },
      },
      {
        id: "same", label: { en: "About the same", fi: "Suunnilleen sama" }, word: { en: "about the same", fi: "suunnilleen sama" },
        doctorWord: { en: "about the same", fi: "suunnilleen sama" },
      },
      {
        id: "worse", label: { en: "Worse", fi: "Pahempi" }, word: { en: "worse", fi: "pahempi" },
        doctorWord: { en: "worse", fi: "pahempi" },
      },
    ],
    why: {
      serious: { en: "You said something serious is happening right now.", fi: "Kerroit, että jotain vakavaa tapahtuu juuri nyt." },
      worse: { en: "It is getting worse.", fi: "Se pahenee." },
      strong: { en: "It is strong ({level} out of 10).", fi: "Se on voimakas ({level} asteikolla 0–10)." },
      rise: { en: "It has gone up from {from} to {to} out of 10.", fi: "Se on noussut arvosta {from} arvoon {to} asteikolla 0–10." },
      newFlags: { en: "You noticed something new: {flags}.", fi: "Huomasit jotain uutta: {flags}." },
      stillThere: { en: "It is still there after 3 weeks.", fi: "Se on edelleen olemassa 3 viikon jälkeen." },
      noBetter: { en: "It has not got better after a week.", fi: "Se ei ole parantunut viikossa." },
      watchBetter: {
        en: "It is getting better and nothing new has come up.", fi: "Se helpottaa, eikä mitään uutta ole ilmaantunut.",
      },
      watchSame: { en: "It is about the same and it is still early.", fi: "Se on suunnilleen ennallaan, ja on vielä aikaista." },
    },
    triage: {
      // A saved symptom note is watch only when all three answers are in these lists and nothing below matches.
      // A note whose course is gone counts as getting better with no effect on daily life (the chat does not ask impact then).
      watch: { onset: ["today", "week"], course: ["better"], impact: ["none"] },
      categories: [
        {
          id: "lump", urgency: "weeks",
          words: { en: ["lump", "swell", "bump", "bulge"], fi: ["kyhm", "patti", "turvo", "pullist"] },
          why: { en: "A new lump or swelling is worth having looked at.", fi: "Uusi kyhmy tai turvotus kannattaa näyttää lääkärille." },
        },
        {
          id: "bleed", urgency: "days",
          words: { en: ["blood", "bleed", "spotting"], fi: ["veri", "vert", "verenvuo", "vuoto", "vuota"] },
          why: { en: "Blood is something doctors always want to know about.", fi: "Lääkärit haluavat aina tietää verestä." },
        },
        {
          id: "breast", urgency: "weeks",
          words: { en: ["breast", "nipple"], fi: ["rinta", "rinna", "nänni", "nännin"] },
          why: {
            en: "A change in the breast is worth having checked, even if you were screened recently.",
            fi: "Muutos rinnassa kannattaa tarkistuttaa, vaikka seulonta olisi ollut äskettäin.",
          },
        },
        {
          id: "testicle", urgency: "days",
          words: { en: ["testic", "testes", "scrot", "testicular"], fi: ["kivek", "kives", "kivessä"] },
          why: { en: "A change in a testicle is worth having checked.", fi: "Muutos kiveksessä kannattaa tarkistuttaa." },
        },
        {
          id: "skin", urgency: "weeks",
          words: {
            en: ["mole", "skin", "rash", "freckle", "itch", "spot", "will not heal", "won't heal", "won’t heal", "melanom"],
            fi: ["luomi", "luomen", "iho", "ihon", "ihott", "pisama", "kutin", "kutis", "ei parane", "melanoom"],
          },
          why: { en: "A change in a mole or the skin is worth showing to a doctor.", fi: "Luomen tai ihon muutos kannattaa näyttää lääkärille." },
        },
        {
          id: "swallow", urgency: "days",
          words: { en: ["swallow", "heartburn", "indigest", "food stick", "choking"], fi: ["nielem", "närästy", "ruoka jää", "tukehd"] },
          why: {
            en: "Trouble swallowing, or heartburn that keeps coming back, is worth checking.",
            fi: "Nielemisvaikeudet tai toistuva närästys kannattaa tarkistuttaa.",
          },
        },
        {
          id: "bowel", urgency: "weeks",
          words: {
            en: ["stool", "bowel", "diarrh", "constipat", "colorect", "poop"],
            fi: ["uloste", "ulostam", "ripuli", "ummetus", "suoli", "peräsuol", "paksusuol"],
          },
          why: {
            en: "Any change in how your bowel works is worth mentioning to a doctor, even a short spell that is already getting better. Bowel cancer can start with small changes, and a short call to a nurse is enough.",
            fi: "Mikä tahansa muutos suolen toiminnassa kannattaa mainita lääkärille, vaikka kyse olisi lyhyestä jaksosta, joka on jo helpottamassa. Suolistosyöpä voi alkaa pienistä muutoksista, ja lyhyt puhelu hoitajalle riittää.",
          },
        },
        {
          id: "urinary", urgency: "weeks",
          words: { en: ["urin", "bladder", "prostat", "peeing", "when i pee"], fi: ["virtsa", "virtsaam", "rakko", "eturauhas", "kusi"] },
          why: { en: "A change when you pee is worth mentioning to a doctor.", fi: "Muutos virtsaamisessa kannattaa mainita lääkärille." },
        },
        {
          id: "weight", urgency: "weeks",
          words: {
            en: ["weight", "tired", "fatigue", "sweat", "appetite", "exhaust"],
            fi: ["paino", "väsy", "väsyn", "uupum", "hikoi", "ruokahalu", "laihtu"],
          },
          why: {
            en: "Weight loss, night sweats or tiredness you cannot explain are worth checking.",
            fi: "Selittämätön painonlasku, yöhikoilu tai väsymys kannattaa tarkistuttaa.",
          },
        },
        {
          id: "jaundice", urgency: "days",
          words: { en: ["jaundice", "yellow"], fi: ["keltaisuu", "keltainen", "keltaise", "kelta"] },
          why: { en: "Yellow skin or eyes is worth having checked.", fi: "Keltainen iho tai silmänvalkuaiset kannattaa tarkistuttaa." },
        },
        {
          id: "voice", urgency: "weeks",
          words: { en: ["hoarse", "voice"], fi: ["käh", "ääni", "äänen"] },
          why: {
            en: "A hoarse voice that does not go away is worth having checked.", fi: "Käheä ääni, joka ei häviä, kannattaa tarkistuttaa.",
          },
        },
      ],
      reasons: [
        { key: "course:worse", urgency: "days", why: { en: "It is getting worse.", fi: "Se pahenee." } },
        { key: "onset:month", urgency: "days", why: { en: "It has lasted more than a month.", fi: "Se on kestänyt yli kuukauden." } },
        { key: "onset:weeks", urgency: "weeks", why: { en: "It has lasted more than a week.", fi: "Se on kestänyt yli viikon." } },
        {
          key: "impact:limits", urgency: "days",
          why: { en: "It limits your daily activities.", fi: "Se rajoittaa arkeasi." },
        },
      ],
      why: {
        emergency: {
          en: "You said something is happening right now that can be serious.",
          fi: "Kerroit, että jotain mahdollisesti vakavaa tapahtuu juuri nyt.",
        },
        "watch:1": {
          en: "It started recently, it is getting better, and it does not affect your daily life.",
          fi: "Se alkoi äskettäin, se helpottaa, eikä se vaikuta arkeesi.",
        },
        "watch:2": { en: "Nothing you told me is on my warning list.", fi: "Mikään kertomasi ei ole varoituslistallani." },
        notRecent: { en: "It has been there for more than a week.", fi: "Se on ollut olemassa yli viikon." },
        onsetUnknown: { en: "I do not know when it started.", fi: "En tiedä, milloin se alkoi." },
        notBetter: { en: "It is not clearly getting better.", fi: "Se ei selvästi helpota." },
        courseUnknown: { en: "I do not know if it is getting better.", fi: "En tiedä, helpottaako se." },
        notMild: { en: "It affects your daily life.", fi: "Se vaikuttaa arkeesi." },
        impactUnknown: { en: "I do not know how much it affects your daily life.", fi: "En tiedä, kuinka paljon se vaikuttaa arkeesi." },
        cautious: {
          en: "I only suggest waiting for something that is new, mild and getting better. I do not have enough to suggest waiting here.",
          fi: "Ehdotan odottamista vain uudelle, lievälle ja helpottavalle oireelle. Minulla ei ole tässä tarpeeksi tietoa ehdottaa odottamista.",
        },
      },
    },
  },
  flags: [
    {
      id: "blood", label: { en: "Blood where there was none before", fi: "Verta, jota ei aiemmin ollut" },
      word: { en: "blood", fi: "verta" },
    },
    {
      id: "lump", label: { en: "A new lump or swelling", fi: "Uusi kyhmy tai turvotus" },
      word: { en: "a new lump or swelling", fi: "uusi kyhmy tai turvotus" },
    },
    {
      id: "swallow", label: { en: "Trouble swallowing or breathing", fi: "Nielemis- tai hengitysvaikeuksia" },
      word: { en: "trouble swallowing or breathing", fi: "nielemis- tai hengitysvaikeuksia" },
    },
    {
      id: "weight", label: { en: "Weight loss or night sweats I cannot explain", fi: "Selittämätöntä painonlaskua tai yöhikoilua" },
      word: { en: "weight loss or night sweats", fi: "painonlaskua tai yöhikoilua" },
    },
    {
      id: "night", label: { en: "Pain that wakes me at night", fi: "Kipu, joka herättää minut yöllä" },
      word: { en: "pain that wakes me at night", fi: "kipu, joka herättää yöllä" },
    },
    {
      id: "other", label: { en: "Something else that is new", fi: "Jokin muu uusi asia" },
      word: { en: "something else new", fi: "jokin muu uusi asia" },
    },
  ],
  serious: {
    en: "Something serious right now: chest pain, heavy bleeding, or I cannot breathe",
    fi: "Jotain vakavaa juuri nyt: rintakipua, runsasta verenvuotoa tai en saa henkeä",
  },
  strings: [
    { scope: "monitor", key: "out.emergency", text: { en: "Go to emergency (call 112)", fi: "Mene päivystykseen (soita 112)" } },
    { scope: "monitor", key: "out.doctor", text: { en: "See a doctor about this", fi: "Mene lääkäriin tämän vuoksi" } },
    { scope: "monitor", key: "out.watch", text: { en: "Keep watching closely", fi: "Seuraa tarkasti" } },
    { scope: "monitor", key: "sex.female", text: { en: "Female", fi: "Nainen" } },
    { scope: "monitor", key: "sex.male", text: { en: "Male", fi: "Mies" } },
    { scope: "monitor", key: "sex.intersex", text: { en: "Intersex", fi: "Intersukupuolinen" } },
    { scope: "monitor", key: "sex.none", text: { en: "Not specified", fi: "Ei määritelty" } },
    {
      scope: "monitor", key: "urgency.today",
      text: {
        en: "Contact your health centre today. In the evening or at weekends, call 116 117.",
        fi: "Ota yhteyttä terveysasemaan tänään. Illalla ja viikonloppuisin soita numeroon 116 117.",
      },
    },
    { scope: "monitor", key: "urgency.days", text: { en: "Within the next few days", fi: "Seuraavien päivien aikana" } },
    {
      scope: "monitor", key: "urgency.weeks",
      text: { en: "Book an appointment in the next week or two", fi: "Varaa aika seuraavan viikon tai parin aikana" },
    },
    { scope: "monitor", key: "gone_title", text: { en: "Good. I have closed the watch.", fi: "Hyvä. Suljin seurannan." } },
    {
      scope: "monitor", key: "gone_body",
      text: {
        en: "Your note is kept as “gone”. If it comes back, or something else worries you, tell me again.",
        fi: "Muistiinpanosi säilyy tilassa ”mennyt ohi”. Jos oire palaa tai jokin muu huolestuttaa, kerro minulle uudelleen.",
      },
    },
    { scope: "monitor", key: "emergency_title", text: { en: "Get help now", fi: "Hae apua nyt" } },
    { scope: "monitor", key: "emergency_when", text: { en: "Call 112 or go to emergency.", fi: "Soita 112 tai mene päivystykseen." } },
    { scope: "monitor", key: "doctor_title", text: { en: "Time to see a doctor", fi: "On aika mennä lääkäriin" } },
    {
      scope: "monitor", key: "doctor_body",
      text: {
        en: "Your updates are in your note, so you can show how it changed.",
        fi: "Päivityksesi ovat muistiinpanossasi, joten voit näyttää, miten oire on muuttunut.",
      },
    },
    { scope: "monitor", key: "watch_title", text: { en: "Keep watching closely", fi: "Seuraa tarkasti" } },
    {
      scope: "monitor", key: "watch_body",
      text: {
        en: "I have set a reminder. If it gets worse or something new comes up before then, log an update straight away.",
        fi: "Olen asettanut muistutuksen. Jos oire pahenee tai ilmaantuu jotain uutta ennen sitä, kirjaa päivitys heti.",
      },
    },
    { scope: "monitor", key: "suggestion", text: { en: "This is a suggestion, not a diagnosis.", fi: "Tämä on ehdotus, ei diagnoosi." } },
    {
      scope: "monitor", key: "privacy",
      text: {
        en: "Your updates are saved on your account. Nothing is sent to a doctor or to an AI model.",
        fi: "Päivityksesi tallennetaan tilillesi. Mitään ei lähetetä lääkärille eikä tekoälymallille.",
      },
    },
    {
      scope: "monitor", key: "reminders",
      text: {
        en: "I will remind you on each of these days to log how it is.",
        fi: "Muistutan sinua jokaisena näistä päivistä kirjaamaan, miten oire voi.",
      },
    },
    {
      scope: "monitor", key: "due_why",
      text: {
        en: "You have been keeping an eye on this since {start} (day {day}). Tell me how it is now, so we can see whether it is changing and whether you need a doctor. It takes a minute.",
        fi: "Seuraat tätä oiretta {start} alkaen (päivä {day}). Kerro, miten se on nyt, jotta nähdään, onko se muuttumassa ja tarvitsetko lääkäriä. Siihen menee minuutti.",
      },
    },
    {
      scope: "monitor", key: "wait_why",
      text: {
        en: "Next update: {next}. If it gets worse, or something new comes up, log an update now and do not wait. This is a suggestion, not a diagnosis.",
        fi: "Seuraava päivitys: {next}. Jos oire pahenee tai ilmaantuu jotain uutta, kirjaa päivitys heti äläkä odota. Tämä on ehdotus, ei diagnoosi.",
      },
    },
    {
      scope: "monitor", key: "watching",
      text: {
        en: "I will watch it with you. Next update: {next}. I will remind you.",
        fi: "Seuraan sitä kanssasi. Seuraava päivitys: {next}. Muistutan sinua.",
      },
    },
    {
      scope: "monitor", key: "keep_eye",
      text: {
        en: "Keep an eye on it. If it gets worse, tell me again.", fi: "Pidä sitä silmällä. Jos se pahenee, kerro minulle uudelleen.",
      },
    },
  ],
  finnish: "unreviewed",
};
