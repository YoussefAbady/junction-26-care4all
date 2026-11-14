"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "./chrome";
import { usePrefs } from "./prefs";

export function Privacy() {
  const { t } = usePrefs();
  const rows: { title: string; body: string[] }[] = [
    {
      title: t("What this is", "Mikä tämä on"),
      body: [t("Care4ll is a prototype. It has not been clinically validated, privacy reviewed, or approved for medical use. It helps you describe your health in detail, but it cannot diagnose or rule out any condition.", "Care4ll on prototyyppi. Sitä ei ole kliinisesti validoitu, tietosuojatarkastettu eikä hyväksytty lääketieteelliseen käyttöön. Se auttaa kuvaamaan terveyttäsi tarkasti, mutta se ei voi todeta tai sulkea pois mitään sairautta.")],
    },
    {
      title: t("What we keep", "Mitä säilytämme"),
      body: [
        t("Your username, and your password as a salted scrypt hash. We never store the password itself.", "Käyttäjätunnuksesi ja salasanasi suolattuna scrypt-tiivisteenä. Emme koskaan tallenna itse salasanaa."),
        t("Your answers, exactly as you give them, tied to your account. You can change them at any time.", "Vastauksesi sellaisenaan, sidottuna tiliisi. Voit muuttaa niitä milloin tahansa."),
        t("A sign-in token. It is kept in a seven-day cookie that scripts on the page cannot read, and as a hash in the database.", "Kirjautumistunniste. Se säilytetään seitsemän päivän evästeessä, jota sivun skriptit eivät voi lukea, ja tiivisteenä tietokannassa."),
      ],
    },
    {
      title: t("What stays in your browser", "Mikä jää selaimeesi"),
      body: [t("Only two harmless settings: your language and your text size. Nothing about your health is kept in your browser, in links, or in the offline cache.", "Vain kaksi harmitonta asetusta: kielesi ja tekstikokosi. Mitään terveystietojasi ei säilytetä selaimessasi, linkeissä tai offline-välimuistissa.")],
    },
    {
      title: t("What we do not do", "Mitä emme tee"),
      body: [
        t("We do not put health details in web addresses or logs.", "Emme laita terveystietoja verkko-osoitteisiin tai lokeihin."),
        t("We do not use advertising or tracking scripts.", "Emme käytä mainos- tai seurantaskriptejä."),
        t("We do not send your answers to a clinic, an insurer or anyone else. This version is not connected to any of them.", "Emme lähetä vastauksiasi klinikalle, vakuutusyhtiölle tai kenellekään muulle. Tämä versio ei ole yhteydessä niihin."),
      ],
    },
    {
      title: t("Your choices", "Valintasi"),
      body: [
        t("Skip a question, say “I'm not sure”, or choose “Prefer not to say” wherever it is offered.", "Ohita kysymys, vastaa ”En ole varma” tai valitse ”En halua vastata”, kun se on tarjolla."),
        t("Stop with Save and exit and come back later, or edit any answer from the review page.", "Lopeta valitsemalla Tallenna ja poistu ja palaa myöhemmin tai muokkaa vastauksia tarkistussivulla."),
        t("Deleting an account is not built into this prototype yet. If you need your data removed, ask whoever runs this copy of it.", "Tilin poistoa ei ole vielä rakennettu tähän prototyyppiin. Jos tarvitset tietojesi poistoa, pyydä sitä tämän kopion ylläpitäjältä."),
      ],
    },
    {
      title: t("Before real use", "Ennen oikeaa käyttöä"),
      body: [t("A service that collects health data to support diagnosis needs clinical review of every question, a privacy impact assessment, account recovery and data deletion, retention rules, security testing, and a check of whether it counts as a medical device. Until then, please use fictional answers.", "Palvelu, joka kerää terveystietoja diagnoosin tueksi, tarvitsee jokaisen kysymyksen kliinisen tarkastuksen, tietosuojan vaikutustenarvioinnin, tilin palautuksen ja tietojen poiston, säilytyssäännöt, tietoturvatestauksen sekä arvion siitä, onko se lääkinnällinen laite. Siihen asti käytä kuvitteellisia vastauksia.")],
    },
  ];
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <div className="wrap wrap--narrow prose">
          <Link href="/" className="btn btn--ghost btn--sm"><ArrowLeft size={16} aria-hidden="true" />{t("Back to Care4ll", "Takaisin Care4ll-palveluun")}</Link>
          <h1>{t("How your data is handled", "Miten tietojasi käsitellään")}</h1>
          <p className="lead">{t("Plain words, no small print. This page describes exactly what this prototype does today.", "Selkeästi, ilman pikkutekstiä. Tämä sivu kuvaa täsmälleen, mitä tämä prototyyppi tekee tänään.")}</p>
          {rows.map(row => (
            <section key={row.title} className="card prose__section">
              <h2>{row.title}</h2>
              {row.body.length === 1 ? <p>{row.body[0]}</p> : <ul>{row.body.map(line => <li key={line}>{line}</li>)}</ul>}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
