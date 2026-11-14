"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Phone } from "lucide-react";
import type { Language } from "@/lib/survey";
import { LogoMark } from "./icons";
import { usePrefs, type TextSize } from "./prefs";

const sizes: { id: TextSize; label: [string, string]; className: string }[] = [
  { id: "md", label: ["Normal text size", "Normaali tekstikoko"], className: "a-md" },
  { id: "lg", label: ["Large text size", "Suuri tekstikoko"], className: "a-lg" },
  { id: "xl", label: ["Extra large text size", "Erittäin suuri tekstikoko"], className: "a-xl" },
];
const languages: { id: Language; short: string; name: string }[] = [
  { id: "en", short: "EN", name: "English" },
  { id: "fi", short: "FI", name: "Suomi" },
];

export function SkipLink() {
  const { t } = usePrefs();
  return <a className="skip" href="#main">{t("Skip to content", "Siirry sisältöön")}</a>;
}

export function Brand() {
  const { t } = usePrefs();
  return (
    <Link href="/" className="brand" aria-label={t("Care4ll home", "Care4ll etusivulle")}>
      <LogoMark size={38} />
      <span className="brand__text"><strong>Care4ll</strong><small>{t("by AstraZeneca", "AstraZeneca")}</small></span>
    </Link>
  );
}

export function Tools({ children }: { children?: ReactNode }) {
  const { lang, setLang, size, setSize, t } = usePrefs();
  return (
    <div className="tools">
      <div className="seg" role="group" aria-label={t("Language", "Kieli")}>
        {languages.map(item => (
          <button key={item.id} type="button" lang={item.id} aria-pressed={lang === item.id} aria-label={item.name} onClick={() => setLang(item.id)}>{item.short}</button>
        ))}
      </div>
      <div className="seg seg--text" role="group" aria-label={t("Text size", "Tekstikoko")}>
        {sizes.map(item => (
          <button key={item.id} type="button" className={item.className} aria-pressed={size === item.id} aria-label={t(...item.label)} onClick={() => setSize(item.id)}>A</button>
        ))}
      </div>
      {children}
    </div>
  );
}

export function SiteHeader({ children, nav = false }: { children?: ReactNode; nav?: boolean }) {
  const { t } = usePrefs();
  return (
    <>
      <div className="proto-bar" role="note">
        <Phone size={14} aria-hidden="true" />
        <span>{t("Prototype, not a medical service. In an emergency call 112.", "Prototyyppi, ei lääketieteellinen palvelu. Hätätilanteessa soita 112.")}</span>
      </div>
      <header className="site-header">
        <div className="wrap site-header__row">
          <Brand />
          {nav && (
            <nav className="site-nav" aria-label={t("Main", "Päävalikko")}>
              <a href="#how">{t("How it works", "Näin se toimii")}</a>
              <a href="#ask">{t("What we ask", "Mitä kysymme")}</a>
              <a href="#faq">{t("Questions", "Kysymyksiä")}</a>
              <Link href="/privacy">{t("Privacy", "Tietosuoja")}</Link>
            </nav>
          )}
          <Tools>{children}</Tools>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const { t, lang } = usePrefs();
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__row">
        <div>
          <Brand />
          <p>{t("A friendly health questionnaire that helps your care team understand you. Prototype branding: not an official service.", "Ystävällinen terveyskysely, joka auttaa hoitotiimiäsi tuntemaan sinut. Prototyypin brändäys: ei virallinen palvelu.")}</p>
        </div>
        <nav aria-label={t("Footer", "Alatunniste")}>
          <Link href="/privacy">{t("How your data is handled", "Miten tietojasi käsitellään")}</Link>
          <a href={lang === "fi" ? "https://syoparekisteri.fi/seulonta/" : "https://cancerregistry.fi/screening/"} target="_blank" rel="noreferrer">{t("Finnish Cancer Registry", "Suomen Syöpärekisteri")}<span className="sr-only"> {t("(opens in a new tab)", "(avautuu uuteen välilehteen)")}</span></a>
        </nav>
        <p className="site-footer__emergency"><strong>{t("Emergency?", "Hätätilanne?")}</strong> {t("Call 112. For urgent medical advice in Finland call 116 117.", "Soita 112. Kiireellisessä lääkärinneuvonnassa Suomessa soita 116 117.")}</p>
      </div>
    </footer>
  );
}
