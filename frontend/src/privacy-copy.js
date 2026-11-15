/*
 * Privacy wording that is shown in more than one place: the welcome and sign-up screens, the privacy page, the privacy
 * notice sheet, the profile card, the footer and the AI consent text. It lives here, with no imports, so that every place
 * says the same thing and a unit test can read it (tests/unit/privacy-copy.test.js).
 *
 * What it has to say is fixed by docs/design-v2.md sections 2 and 3. The account and every answer are stored on the
 * server. The optional AI questions and the risk overview send non-identifying answers to Google Gemini, after the person
 * agrees on screen, and never the name, the username, any id, the exact date of birth, the city or county, or any text the
 * person typed. The design's own lines ("No account", "your identity never leaves this app", "the assistant runs inside the
 * app", "worked out on this device") describe a prototype that has no server. They must not come back.
 *
 * Every text is an array [English, Finnish, Swedish?]. Use it as tr(...text). Swedish falls back to English where it is
 * missing. THE FINNISH IS A DRAFT AND HAS NOT BEEN REVIEWED by a native speaker.
 */

/** What the AI questions and the risk overview send (src/lib/assess/facts.ts decides this on the server). */
export const SENT = [
  "your answers to the questions (including the ones the AI wrote), your age in years, whether you live in Finland, and a weight band instead of your exact height and weight",
  "vastauksesi kysymyksiin (myös tekoälyn kirjoittamiin), ikäsi vuosina, tiedon siitä, asutko Suomessa, sekä painoluokan tarkan pituutesi ja painosi sijaan",
];
/** What they never send. The interview has no free-text answers, so nothing the person typed is in it either. */
export const NEVER = [
  "your name, username, any ID, exact date of birth, city or county, or anything you typed yourself",
  "nimeäsi, käyttäjätunnustasi, tunnisteita, tarkkaa syntymäaikaasi, kaupunkiasi tai maakuntaasi eikä mitään itse kirjoittamaasi",
];

/** The text a person agrees to before the AI questions or the risk overview start (interview and risk screens). */
export const CONSENT = [
  "To ask you the next questions and to work out your risk overview, an AI model (Google Gemini) receives " + SENT[0] + ". It never receives " + NEVER[0] + ". care4all keeps the questions, your answers and the overview in your account. It is information, not a diagnosis and not a prediction. Google handles what it receives under its own terms.",
  "Seuraavien kysymysten esittämiseksi ja riskikatsauksesi laatimiseksi tekoälymalli (Google Gemini) saa " + SENT[1] + ". Se ei koskaan saa " + NEVER[1] + ". care4all säilyttää kysymykset, vastauksesi ja katsauksen tililläsi. Ne ovat tietoa, eivät diagnoosi eivätkä ennuste. Google käsittelee saamansa tiedot omien ehtojensa mukaan.",
];

/** The line under the disclaimer in the footer of the main screens. */
export const FOOTER_LINE = [
  "Private: the AI never gets your name or username.",
  "Yksityistä: tekoäly ei koskaan saa nimeäsi tai käyttäjätunnustasi.",
];

/** The row under the profile card. */
export const ME_ROW = {
  bold: ["Your name never goes to the AI.", "Nimesi ei koskaan mene tekoälylle."],
  rest: ["Tap to see what is kept and what is sent.", "Katso, mitä tallennetaan ja mitä lähetetään."],
};

/** The welcome screen: the two privacy cells that lead the list. icon and tone name the cell's lead icon. */
export const WELCOME_PRIVATE = {
  icon: "lock", tone: "k",
  title: ["Private by design", "Yksityisyys edellä", "Privat från grunden"],
  detail: [
    "Your records are kept in your own demo account on the server. No tracking and no analytics. Export or delete them whenever you like.",
    "Tietosi säilytetään omalla demotililläsi palvelimella. Ei seurantaa eikä analytiikkaa. Voit viedä tai poistaa ne milloin tahansa.",
  ],
};
/** The same cell is used on the sign-up screen, where the person creates the account. */
export const AI_CHOICE = {
  icon: "sparkle", tone: "b",
  title: ["You decide what the AI sees", "Päätät itse, mitä tekoäly näkee"],
  detail: [
    "The AI questions and the risk overview are optional, and they ask you first. They send Google Gemini your answers, never your name, username, exact birth date, city or anything you typed.",
    "Tekoälykysymykset ja riskikatsaus ovat valinnaisia, ja ne kysyvät lupaa ensin. Google Geminille lähetetään vastauksesi, ei koskaan nimeäsi, käyttäjätunnustasi, tarkkaa syntymäaikaasi, kaupunkiasi tai itse kirjoittamaasi.",
  ],
};

/** The privacy page, first section: who you are stays private. */
export const PRIVACY_IDENTITY = [
  {
    icon: "lock", tone: "k",
    title: ["Your name stays out of the AI", "Nimesi pysyy erossa tekoälystä"],
    detail: [
      "The AI questions and the risk overview never receive " + NEVER[0] + ". They get your age in years and whether you live in Finland.",
      "Tekoälykysymykset ja riskikatsaus eivät koskaan saa " + NEVER[1] + ". Ne saavat ikäsi vuosina ja tiedon siitä, asutko Suomessa.",
    ],
  },
  {
    icon: "user", tone: "b",
    title: ["A username, not an ID", "Käyttäjätunnus, ei henkilötunnus"],
    detail: [
      "You sign up with a username and a password. care4all never asks for your email, phone number or personal identity code.",
      "Rekisteröidyt käyttäjätunnuksella ja salasanalla. care4all ei koskaan kysy sähköpostiosoitettasi, puhelinnumeroasi tai henkilötunnustasi.",
    ],
  },
  {
    icon: "bell", tone: "o",
    title: ["Reminders stay neutral", "Muistutukset pysyvät neutraaleina"],
    detail: [
      "A notification never names a cancer, a symptom or a screening.",
      "Ilmoituksessa ei koskaan mainita syöpää, oiretta tai seulontaa.",
    ],
  },
  {
    icon: "download", tone: "",
    title: ["You decide what leaves", "Päätät itse, mitä lähtee"],
    detail: [
      "A PDF for your doctor is made in your browser from what is already in your account. Saving it, copying a note or exporting your data sends nothing anywhere. It goes where you put it.",
      "Lääkärille tarkoitettu PDF tehdään selaimessasi tilillesi jo tallennetuista tiedoista. PDF:n tallentaminen, muistiinpanon kopioiminen tai tietojesi vieminen ei lähetä mitään minnekään. Ne päätyvät sinne, minne ne viet.",
    ],
  },
];
export const PRIVACY_IDENTITY_NOTE = [
  "Sharing this phone or browser? Sign out when you are done, so nobody else can open your records. Deleting your account removes everything.",
  "Jaatko tämän puhelimen tai selaimen? Kirjaudu ulos, kun olet valmis, ettei kukaan muu voi avata tietojasi. Tilin poistaminen poistaa kaiken.",
];

/** The privacy page, second section: how each kind of information is handled. */
export const PRIVACY_HANDLED = [
  {
    icon: "lock", tone: "k",
    title: ["Saved in your demo account", "Tallennetaan demotilillesi", "Sparas i ditt demokonto"],
    detail: [
      "Your profile, notes, reminders, check-ins, answers, AI questions and risk overview are stored on the server, under your username only. Other accounts cannot see them.",
      "Profiilisi, muistiinpanosi, muistutuksesi, seurantapäivityksesi, vastauksesi, tekoälykysymyksesi ja riskikatsauksesi tallennetaan palvelimelle vain käyttäjätunnuksesi alle. Muut tilit eivät näe niitä.",
    ],
  },
  {
    icon: "heart", tone: "r",
    title: ["Fictional information only", "Vain kuvitteellisia tietoja", "Bara fiktiva uppgifter"],
    detail: [
      "This is a prototype. Please do not enter real health details or anything that identifies you.",
      "Tämä on prototyyppi. Älä syötä todellisia terveystietoja tai mitään, mikä tunnistaa sinut.",
      "Det här är en prototyp. Ange inga verkliga hälsouppgifter eller något som identifierar dig.",
    ],
  },
  {
    icon: "shield", tone: "g",
    title: ["No analytics, no research", "Ei analytiikkaa, ei tutkimuskäyttöä", "Ingen analys, ingen forskning"],
    detail: [
      "care4all does not collect usage statistics and does not add your answers to research totals. There is nothing to switch on or off.",
      "care4all ei kerää käyttötilastoja eikä lisää vastauksiasi tutkimuksen yhteistuloksiin. Mitään ei tarvitse kytkeä päälle tai pois.",
    ],
  },
  {
    icon: "chat", tone: "",
    title: ["Questions you ask the assistant", "Avustajalle esittämäsi kysymykset", "Frågor du ställer till assistenten"],
    detail: [
      "An AI model (Google Gemini) can write the answer. It receives only the question you type and public source passages, never your account or saved information. Google handles the question under its own terms, so please do not type personal details.",
      "Tekoälymalli (Google Gemini) voi kirjoittaa vastauksen. Se saa vain kirjoittamasi kysymyksen ja julkisia lähdekatkelmia, ei koskaan tiliäsi tai tallennettuja tietojasi. Google käsittelee kysymyksen omien ehtojensa mukaan, joten älä kirjoita henkilötietoja.",
    ],
  },
  {
    icon: "sparkle", tone: "",
    title: ["AI questions and your risk overview (optional)", "Tekoälykysymykset ja riskikatsauksesi (valinnainen)"],
    detail: [
      "Only if you choose it, and you are asked on screen first. Google Gemini receives " + SENT[0] + ". It never receives " + NEVER[0] + ". care4all keeps the questions, your answers and the overview in your account. They are information, not a diagnosis, and Google handles them under its own terms.",
      "Vain jos valitset sen, ja sinulta kysytään ensin näytöllä. Google Gemini saa " + SENT[1] + ". Se ei koskaan saa " + NEVER[1] + ". care4all säilyttää kysymykset, vastauksesi ja katsauksen tililläsi. Ne ovat tietoa, eivät diagnoosi, ja Google käsittelee ne omien ehtojensa mukaan.",
    ],
  },
  {
    icon: "phone", tone: "",
    title: ["On this device", "Tällä laitteella", "På den här enheten"],
    detail: [
      "Only display choices stay in this browser: language, text size, plain language, animations, skin tone and the install banner.",
      "Vain näyttöasetukset jäävät tähän selaimeen: kieli, tekstin koko, selkokieli, animaatiot, ihonsävy ja asennusilmoitus.",
      "Bara visningsval stannar i den här webbläsaren: språk, textstorlek, klarspråk, animationer, hudton och installationsbanderollen.",
    ],
  },
];

/** The privacy notice sheet (Profile, sign-up): an introduction, then headed sections as [heading, text]. */
export const NOTICE_INTRO = [
  "Short version: care4all is a fictional prototype. Your records are kept in a demo account on the server. There is no analytics, no advertising and no research collection. If you choose the AI questions or the risk overview, Google Gemini gets your answers, but never your name, username, exact date of birth, city or anything you typed, and only after you agree on screen.",
  "Lyhyesti: care4all on kuvitteellinen prototyyppi. Tietosi säilytetään demotilillä palvelimella. Analytiikkaa, mainontaa tai tutkimuskeruuta ei ole. Jos valitset tekoälykysymykset tai riskikatsauksen, Google Gemini saa vastauksesi, mutta ei koskaan nimeäsi, käyttäjätunnustasi, tarkkaa syntymäaikaasi, kaupunkiasi tai itse kirjoittamaasi, ja vasta kun hyväksyt sen näytöllä.",
];
export const NOTICE = [
  [
    ["What we process", "Mitä käsittelemme"],
    [
      "Your username and a password (kept only as a salted hash), your first name (optional), year of birth, sex, county, symptom notes and their check-ins, self-check results, reminders, your answers to our questions, the AI’s questions and your answers to them, and your risk overview. Some of this is health information, which GDPR treats as a special category. Please use fictional information only.",
      "Käyttäjätunnuksesi ja salasanasi (tallennetaan vain suolattuna tiivisteenä), etunimesi (vapaaehtoinen), syntymävuotesi, sukupuolesi, maakuntasi, oiremuistiinpanosi ja niiden seurantapäivitykset, itsetarkistustulokset, muistutukset, vastauksesi kysymyksiimme, tekoälyn kysymykset ja vastauksesi niihin sekä riskikatsauksesi. Osa tiedoista on terveystietoa, jota GDPR pitää erityisenä henkilötietoryhmänä. Käytä vain kuvitteellisia tietoja.",
    ],
  ],
  [
    ["Why, and on what basis", "Miksi ja millä perusteella"],
    [
      "To show you information that fits your profile and to suggest next steps. By creating an account you agree that care4all keeps what you enter for this purpose (GDPR Art. 6(1)(a) and 9(2)(a)). You can withdraw your consent at any time by deleting your account.",
      "Näyttääksemme profiiliisi sopivaa tietoa ja ehdottaaksemme seuraavia askeleita. Luomalla tilin hyväksyt, että care4all säilyttää antamasi tiedot tähän tarkoitukseen (GDPR 6 artiklan 1 kohdan a alakohta ja 9 artiklan 2 kohdan a alakohta). Voit peruuttaa suostumuksesi milloin tahansa poistamalla tilisi.",
    ],
  ],
  [
    ["Where it is kept", "Missä tiedot säilytetään"],
    [
      "On this demo’s server, inside your account. Other accounts cannot see it. A sign-in cookie that scripts cannot read keeps you signed in for 7 days. Server logs keep page addresses only, without search words, cookies or what you typed. A PDF for your doctor is made in your browser from your own records, and nothing is uploaded when you save or share it. Your browser keeps only display choices: language, text size, plain language, animations, skin tone and the install banner.",
      "Tämän demon palvelimella, tilisi sisällä. Muut tilit eivät näe niitä. Kirjautumisevästeen komentosarjat eivät voi lukea, ja se pitää sinut kirjautuneena 7 päivää. Palvelinlokeihin tallentuu vain sivujen osoitteet, ei hakusanoja, evästeitä eikä kirjoittamaasi tekstiä. Lääkärille tarkoitettu PDF tehdään selaimessasi omista tiedoistasi, eikä mitään lähetetä minnekään, kun tallennat tai jaat sen. Selaimesi säilyttää vain näyttöasetukset: kielen, tekstin koon, selkokielen, animaatiot, ihonsävyn ja asennusilmoituksen.",
    ],
  ],
  [
    ["The AI assistant (Ask)", "Tekoälyavustaja (Kysy)"],
    [
      "When you ask a question in Ask, an AI model (Google Gemini) can write the answer. It is sent only what you typed in that question, the language and the public source passages that match it. It never receives your username, profile, saved answers, symptom notes, self-check results or reminders, and care4all keeps no copy of the question or the answer. Google handles the question under its own terms for the Gemini API, so please do not type personal details. Each answer says when an AI wrote it and shows the sources it used.",
      "Kun kysyt jotain Kysy-näkymässä, tekoälymalli (Google Gemini) voi kirjoittaa vastauksen. Sille lähetetään vain kysymykseen kirjoittamasi teksti, kieli ja siihen sopivat julkiset lähdekatkelmat. Se ei koskaan saa käyttäjätunnustasi, profiiliasi, tallennettuja vastauksiasi, oiremuistiinpanojasi, itsetarkistustuloksiasi eikä muistutuksiasi, eikä care4all säilytä kopiota kysymyksestä tai vastauksesta. Google käsittelee kysymyksen Gemini API:n omien ehtojensa mukaan, joten älä kirjoita henkilötietoja. Jokaisessa vastauksessa kerrotaan, kun tekoäly on sen kirjoittanut, ja siinä näytetään käytetyt lähteet.",
    ],
  ],
  [
    ["AI questions and risk overview (optional)", "Tekoälykysymykset ja riskikatsaus (valinnainen)"],
    [
      "If you use the AI questions or ask for your risk overview, your answers are sent to Google Gemini: " + SENT[0] + ". It writes each next question from your earlier answers, and then rates each cancer type and the overall level, with its reasons, from Finnish guidance first, then European and other international guidance. It never receives " + NEVER[0] + ". The questions have no free-text answers. You are asked on screen before anything is sent. care4all keeps the questions, your answers and the risk overview in your account. They are deleted with the account and are part of your data export. Google handles what it receives under its own terms. The overview is information about risk factors compared with other people of your age and sex. It is not a diagnosis and not a prediction.",
      "Jos käytät tekoälykysymyksiä tai pyydät riskikatsauksen, vastauksesi lähetetään Google Geminille: " + SENT[1] + ". Se kirjoittaa jokaisen seuraavan kysymyksen aiempien vastaustesi pohjalta ja arvioi sitten jokaisen syöpätyypin ja kokonaistason perusteluineen ensisijaisesti suomalaisten, sitten eurooppalaisten ja muiden kansainvälisten ohjeistusten perusteella. Se ei koskaan saa " + NEVER[1] + ". Kysymyksiin ei ole vapaan tekstin vastauksia. Sinulta kysytään näytöllä ennen kuin mitään lähetetään. care4all säilyttää kysymykset, vastauksesi ja riskikatsauksen tililläsi. Ne poistetaan tilin mukana, ja ne kuuluvat tietojesi vientiin. Google käsittelee saamansa tiedot omien ehtojensa mukaan. Katsaus on tietoa riskitekijöistä verrattuna muihin samanikäisiin ja samaa sukupuolta oleviin. Se ei ole diagnoosi eikä ennuste.",
    ],
  ],
  [
    ["Analytics and research", "Analytiikka ja tutkimus"],
    [
      "care4all does not collect usage statistics and does not add your answers to research totals. There is nothing to switch on or off.",
      "care4all ei kerää käyttötilastoja eikä lisää vastauksiasi tutkimuksen yhteistuloksiin. Mitään ei tarvitse kytkeä päälle tai pois.",
    ],
  ],
  [
    ["Your rights", "Oikeutesi"],
    [
      "Access and export your data, correct it, delete it, restrict or object to its use, and withdraw consent (GDPR Arts. 15 to 21). Export and delete are in Profile. You can also complain to the Finnish Data Protection Ombudsman (tietosuoja.fi).",
      "Voit tarkastella ja viedä tietosi, oikaista ne, poistaa ne, rajoittaa niiden käyttöä tai vastustaa sitä ja peruuttaa suostumuksesi (GDPR 15–21 artikla). Vienti ja poisto ovat Profiilissa. Voit myös tehdä valituksen tietosuojavaltuutetulle (tietosuoja.fi).",
    ],
  ],
  [
    ["How long", "Kuinka kauan"],
    [
      "Until you delete your account. “Delete account” in Profile removes the account and everything in it from the server at once.",
      "Kunnes poistat tilisi. Profiilin toiminto ”Poista tili” poistaa tilin ja kaiken sen sisällön palvelimelta kerralla.",
    ],
  ],
];
