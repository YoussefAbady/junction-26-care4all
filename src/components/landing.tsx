"use client";
import Link from "next/link";
import { ArrowRight, Check, Clock, Lock, Languages, MessagesSquare, Printer, Save, Sparkles, Type } from "lucide-react";
import { modules } from "@/lib/intake";
import { tr } from "@/lib/survey";
import { AuthCard } from "./auth";
import { Icon } from "./icons";
import { usePrefs } from "./prefs";
import type { ErrorKey } from "./session";

type Props = { mode: "register" | "login"; setMode: (mode: "register" | "login") => void; busy: boolean; error: ErrorKey | null; onSubmit: (username: string, password: string) => void };

const why: Record<string, [string, string]> = {
  you: ["Age and body details change what is normal for you.", "Ikä ja kehon tiedot vaikuttavat siihen, mikä on sinulle normaalia."],
  now: ["The most useful part: what is on your mind, in your words.", "Hyödyllisin osa: mikä sinua mietityttää, omin sanoin."],
  health: ["Conditions, medicines and allergies keep you safe.", "Sairaudet, lääkkeet ja allergiat pitävät sinut turvassa."],
  family: ["Family history can change your risk and your check-ups.", "Sukuhistoria voi muuttaa riskiäsi ja tarkastuksiasi."],
  life: ["Habits, sleep and mood shape your health every day.", "Elintavat, uni ja mieliala vaikuttavat terveyteesi joka päivä."],
  screen: ["Spot what has been missed or is still outstanding.", "Huomaa, mikä on jäänyt väliin tai on yhä kesken."],
};

function Preview() {
  const { t } = usePrefs();
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview__card">
        <div className="preview__bar"><span style={{ width: "38%" }} /></div>
        <p className="preview__meta">{t("Chapter 2 of 6 · about 6 min left", "Osio 2/6 · noin 6 min jäljellä")}</p>
        <span className="qtag">{t("Digestion and bowels", "Ruoansulatus ja suolisto")}</span>
        <p className="preview__q">{t("When did this start?", "Milloin tämä alkoi?")}</p>
        <div className="preview__opts">
          <span>{t("In the last few days", "Viime päivinä")}</span>
          <span className="is-on"><Check size={16} />{t("1 to 4 weeks ago", "1–4 viikkoa sitten")}</span>
          <span>{t("1 to 3 months ago", "1–3 kuukautta sitten")}</span>
        </div>
        <p className="preview__why">{t("Why we ask ›", "Miksi kysymme ›")}</p>
      </div>
      <span className="preview__chip preview__chip--a"><Sparkles size={16} />{t("Adapts to your answers", "Mukautuu vastauksiisi")}</span>
      <span className="preview__chip preview__chip--b"><Save size={16} />{t("Saved as you go", "Tallentuu samalla")}</span>
    </div>
  );
}

export function Landing({ mode, setMode, busy, error, onSubmit }: Props) {
  const { t, lang } = usePrefs();
  const steps = [
    { icon: Lock, title: t("Create your profile", "Luo profiilisi"), text: t("Pick a username and password. No email needed.", "Valitse käyttäjätunnus ja salasana. Sähköpostia ei tarvita.") },
    { icon: MessagesSquare, title: t("Talk us through it", "Kerro meille")
      , text: t("Questions adapt as you answer. No symptoms? We skip those. Something worrying you? We dig in.", "Kysymykset mukautuvat vastauksiisi. Ei oireita? Ohitamme ne. Jokin huolestuttaa? Kysymme tarkemmin.") },
    { icon: Printer, title: t("Take your summary with you", "Ota yhteenveto mukaasi"), text: t("A clear summary to print or save, ready for your next appointment.", "Selkeä yhteenveto tulostettavaksi tai tallennettavaksi, valmiina seuraavaa vastaanottoa varten.") },
  ];
  const faq: [string, string][] = [
    [t("Is this a diagnosis?", "Onko tämä diagnoosi?"), t("No. Care4ll gathers detailed, accurate information about you so a clinician can do their job better. It cannot diagnose or rule anything out. If something you tell us sounds urgent, we say so and tell you what to do.", "Ei. Care4ll kerää tarkkaa ja yksityiskohtaista tietoa sinusta, jotta hoitoalan ammattilainen voi tehdä työnsä paremmin. Se ei voi todeta tai sulkea pois mitään sairautta. Jos kertomasi kuulostaa kiireelliseltä, sanomme sen ja kerromme, mitä tehdä.")],
    [t("Who can see my answers?", "Ketkä näkevät vastaukseni?"), t("In this prototype, only you, through your account. It is not connected to a clinic yet, so nobody else receives your answers.", "Tässä prototyypissä vain sinä, tilisi kautta. Se ei ole vielä yhteydessä klinikkaan, joten kukaan muu ei saa vastauksiasi.")],
    [t("How long does it take?", "Kuinka kauan siihen menee?"), t("Most people need 8 to 12 minutes. You can see how much time is left as you go, and your answers save automatically.", "Useimmilta menee 8–12 minuuttia. Näet jäljellä olevan ajan koko ajan, ja vastaukset tallentuvat automaattisesti.")],
    [t("What if I do not know an answer?", "Entä jos en tiedä vastausta?"), t("Choose “I'm not sure”. That is a useful answer too. It tells your clinician what to double-check.", "Valitse ”En ole varma”. Sekin on hyödyllinen vastaus. Se kertoo hoitajalle tai lääkärille, mitä kannattaa tarkistaa.")],
    [t("Can I stop and come back?", "Voinko keskeyttää ja palata myöhemmin?"), t("Yes. Choose Save and exit. When you sign in again you land on the question you left.", "Voit. Valitse Tallenna ja poistu. Kun kirjaudut uudelleen, palaat siihen kysymykseen, johon jäit.")],
    [t("Can I use my real details?", "Voinko käyttää oikeita tietojani?"), t("This is a prototype that has not been clinically validated or privacy reviewed. Until it has been, please use fictional answers and a made-up username.", "Tämä on prototyyppi, jota ei ole kliinisesti validoitu eikä tietosuojatarkastettu. Siihen asti käytä kuvitteellisia vastauksia ja keksittyä käyttäjätunnusta.")],
  ];
  return (
    <>
      <section className="hero">
        <div className="wrap hero__row">
          <div className="hero__copy">
            <p className="eyebrow"><Sparkles size={16} aria-hidden="true" />{t("Your health story, in your own words", "Terveystarinasi omin sanoin")}</p>
            <h1>{t("A conversation that helps your care team truly know you.", "Keskustelu, joka auttaa hoitotiimiäsi tuntemaan sinut.")}</h1>
            <p className="lead">{t("Answer friendly questions that adapt to you, at your own pace. About 10 minutes, saved as you go, and you can stop whenever you like.", "Vastaa ystävällisiin, sinuun mukautuviin kysymyksiin omaan tahtiisi. Noin 10 minuuttia, tallentuu samalla, ja voit lopettaa milloin tahansa.")}</p>
            <ul className="ticks">
              <li><Check size={18} aria-hidden="true" />{t("Plain language, no jargon", "Selkeää kieltä, ei ammattisanastoa")}</li>
              <li><Check size={18} aria-hidden="true" />{t("Skip anything or say “I'm not sure”", "Ohita mikä tahansa tai vastaa ”En ole varma”")}</li>
              <li><Check size={18} aria-hidden="true" />{t("English and Finnish, large text if you need it", "Suomeksi ja englanniksi, tarvittaessa suurella tekstillä")}</li>
            </ul>
            <Preview />
          </div>
          <AuthCard mode={mode} setMode={setMode} busy={busy} error={error} onSubmit={onSubmit} />
        </div>
      </section>

      <section className="band" id="how" aria-labelledby="how-title">
        <div className="wrap">
          <h2 id="how-title" className="band__title">{t("How it works", "Näin se toimii")}</h2>
          <ol className="how">
            {steps.map((step, index) => (
              <li key={step.title} className="card how__item">
                <span className="how__num" aria-hidden="true">{index + 1}</span>
                <step.icon size={28} aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band band--tint" id="ask" aria-labelledby="ask-title">
        <div className="wrap">
          <h2 id="ask-title" className="band__title">{t("What we ask, and why", "Mitä kysymme ja miksi")}</h2>
          <p className="band__lead">{t("Six short chapters. Every question comes with a “Why we ask” so you always know what it is for.", "Kuusi lyhyttä osiota. Jokaisella kysymyksellä on ”Miksi kysymme”, jotta tiedät aina, mihin sitä tarvitaan.")}</p>
          <ul className="asks">
            {modules.map(module => (
              <li key={module.id} className="card ask">
                <span className="ask__icon"><Icon name={module.icon} size={24} /></span>
                <h3>{tr(lang, module.title)}</h3>
                <p>{tr(lang, module.blurb)}</p>
                <p className="ask__why">{tr(lang, why[module.id])}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band" aria-labelledby="care-title">
        <div className="wrap">
          <h2 id="care-title" className="band__title">{t("Made to be easy for everyone", "Tehty helpoksi kaikille")}</h2>
          <ul className="care">
            <li><Type size={26} aria-hidden="true" /><div><h3>{t("Readable", "Luettava")}</h3><p>{t("Big text, high contrast, and a text size button on every page.", "Suuri teksti, korkea kontrasti ja tekstikokopainike joka sivulla.")}</p></div></li>
            <li><Languages size={26} aria-hidden="true" /><div><h3>{t("Your language", "Sinun kielesi")}</h3><p>{t("The whole questionnaire is in English and Finnish.", "Koko kysely on suomeksi ja englanniksi.")}</p></div></li>
            <li><Clock size={26} aria-hidden="true" /><div><h3>{t("Your pace", "Sinun tahdissasi")}</h3><p>{t("One question at a time. Pause whenever you like.", "Yksi kysymys kerrallaan. Tauko milloin haluat.")}</p></div></li>
            <li><Lock size={26} aria-hidden="true" /><div><h3>{t("Private by design", "Yksityisyys edellä")}</h3><p>{t("No health details in links or browser storage. ", "Terveystietoja ei linkeissä tai selaimen muistissa. ")}<Link href="/privacy">{t("Read how it works", "Lue, miten se toimii")}</Link></p></div></li>
          </ul>
        </div>
      </section>

      <section className="band band--tint" id="faq" aria-labelledby="faq-title">
        <div className="wrap wrap--narrow">
          <h2 id="faq-title" className="band__title">{t("Good questions", "Hyviä kysymyksiä")}</h2>
          <div className="faq">
            {faq.map(([question, answer]) => (
              <details key={question} className="faq__item"><summary>{question}</summary><p>{answer}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--cta" aria-labelledby="cta-title">
        <div className="wrap wrap--narrow cta">
          <h2 id="cta-title">{t("Ready when you are.", "Valmis, kun sinä olet.")}</h2>
          <p>{t("Ten minutes now can save a lot of time at your next appointment.", "Kymmenen minuuttia nyt voi säästää paljon aikaa seuraavalla vastaanotolla.")}</p>
          <a className="btn btn--gold btn--lg" href="#start" onClick={() => setMode("register")}>{t("Create my profile", "Luo profiilini")}<ArrowRight size={20} aria-hidden="true" /></a>
        </div>
      </section>
    </>
  );
}
