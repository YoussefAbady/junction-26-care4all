"use client";
import { useState, type RefObject } from "react";
import { ArrowLeft, Check, CircleAlert, ClipboardList, Pencil, Printer, ShieldCheck } from "lucide-react";
import { alerts, derive, missing, nameOf, summarise, type Alert, type Answers, type Derived, type Section, type SummaryItem } from "@/lib/intake";
import { tr, type Language } from "@/lib/survey";
import { usePrefs } from "./prefs";
import type { SaveState } from "./session";

function Value({ item }: { item: SummaryItem }) {
  if (Array.isArray(item.value)) return <ul className="review__list">{item.value.map(line => <li key={line}>{line}</li>)}</ul>;
  return <>{item.value}</>;
}

function Sections({ sections, onEdit }: { sections: Section[]; onEdit?: (id: string) => void }) {
  const { t } = usePrefs();
  return (
    <>
      {sections.map(section => (
        <section key={section.module} className="card review__section">
          <h2>{section.title}</h2>
          <dl>
            {section.items.map(item => (
              <div key={item.id} className={`review__item${item.note ? " review__item--muted" : ""}`}>
                <dt>{item.label}</dt>
                <dd><Value item={item} /></dd>
                {onEdit && <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(item.id)} aria-label={`${t("Edit", "Muokkaa")}: ${item.label}`}><Pencil size={15} aria-hidden="true" />{t("Edit", "Muokkaa")}</button>}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}

export function Review({ answers, lang, headingRef, onEdit, onFinish, onBack, saveState, complete }: {
  answers: Answers; lang: Language; headingRef: RefObject<HTMLHeadingElement | null>; onEdit: (id: string) => void; onFinish: () => Promise<boolean>; onBack: () => void; saveState: SaveState; complete: boolean;
}) {
  const { t } = usePrefs();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const left = missing(answers);
  const sections = summarise(answers, lang);
  async function finish() {
    setBusy(true);
    await onFinish();
    setBusy(false);
  }
  return (
    <div className="review">
      <section className="card review__intro">
        <span className="welcome__badge"><ClipboardList size={16} aria-hidden="true" />{t("Last step", "Viimeinen vaihe")}</span>
        <h1 ref={headingRef} tabIndex={-1}>{t("Let's check your answers", "Tarkistetaan vastauksesi")}</h1>
        <p className="lead">{t("Take a minute to look everything over. Tap Edit on anything that needs changing. Accurate answers help most.", "Käy kaikki läpi rauhassa. Napauta Muokkaa, jos jotain pitää muuttaa. Tarkat vastaukset auttavat eniten.")}</p>
        {left.length > 0 && (
          <div className="notice notice--soon" role="status">
            <CircleAlert size={20} aria-hidden="true" />
            <div>
              <p><strong>{t(`${left.length} question${left.length === 1 ? "" : "s"} still need an answer.`, `${left.length} kysymys${left.length === 1 ? "" : "tä"} odottaa vielä vastausta.`)}</strong></p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => onEdit(left[0].id)}>{t("Answer them now", "Vastaa nyt")}</button>
            </div>
          </div>
        )}
      </section>
      <Sections sections={sections} onEdit={onEdit} />
      <section className="card review__confirm">
        <label className="check">
          <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
          <span className="check__box" aria-hidden="true" />
          <span>{t("I have checked my answers, and they are true to the best of my knowledge.", "Olen tarkistanut vastaukseni, ja ne pitävät paikkansa parhaan tietoni mukaan.")}</span>
        </label>
        {saveState === "error" && <p className="error-text" role="alert">{t("We could not save just now. Please check your connection and try again.", "Tallennus ei onnistunut juuri nyt. Tarkista yhteytesi ja yritä uudelleen.")}</p>}
        <div className="qactions">
          <button type="button" className="btn btn--secondary" onClick={onBack}><ArrowLeft size={20} aria-hidden="true" />{t("Back", "Takaisin")}</button>
          <button type="button" className="btn btn--primary btn--lg" disabled={!complete || !confirmed || busy} onClick={finish}>
            {busy ? t("Saving…", "Tallennetaan…") : t("Finish and see my summary", "Valmis, näytä yhteenveto")}<Check size={20} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

const band: Record<NonNullable<Derived["bmiBand"]>, [string, string]> = {
  under: ["Below the usual healthy range", "Alle tavallisen terveellisen alueen"],
  healthy: ["Within the usual healthy range", "Tavallisella terveellisellä alueella"],
  over: ["Above the usual healthy range", "Yli tavallisen terveellisen alueen"],
  obese: ["In the obese range", "Lihavuuden alueella"],
};

function Metrics({ answers, lang, sections }: { answers: Answers; lang: Language; sections: Section[] }) {
  const { t } = usePrefs();
  const d = derive(answers);
  const smoking = sections.flatMap(section => section.items).find(item => item.id === "smoke" && !item.note);
  const smokeValue = typeof smoking?.value === "string" ? smoking.value : undefined;
  const tiles: { key: string; label: string; value: string; note?: string }[] = [];
  if (d.age !== undefined) tiles.push({ key: "age", label: t("Age", "Ikä"), value: String(d.age), note: t("years", "vuotta") });
  if (d.bmi !== undefined && d.bmiBand) tiles.push({ key: "bmi", label: t("Body mass index", "Painoindeksi"), value: String(d.bmi), note: tr(lang, band[d.bmiBand]) });
  if (smokeValue) tiles.push({ key: "smoke", label: t("Smoking", "Tupakointi"), value: smokeValue, note: d.packYears !== undefined ? t(`${d.packYears} pack-years`, `${d.packYears} askivuotta`) : undefined });
  if (d.auditC !== undefined) tiles.push({ key: "audit", label: t("Alcohol (AUDIT-C)", "Alkoholi (AUDIT-C)"), value: `${d.auditC} / 12` });
  if (d.phq2 !== undefined) tiles.push({ key: "phq", label: t("Low mood check (PHQ-2)", "Mielialakysely (PHQ-2)"), value: `${d.phq2} / 6` });
  if (d.gad2 !== undefined) tiles.push({ key: "gad", label: t("Anxiety check (GAD-2)", "Ahdistuskysely (GAD-2)"), value: `${d.gad2} / 6` });
  if (d.activityDays !== undefined) tiles.push({ key: "act", label: t("Active days", "Aktiiviset päivät"), value: String(d.activityDays), note: t("per week", "viikossa") });
  if (d.sleepHours !== undefined) tiles.push({ key: "sleep", label: t("Sleep", "Uni"), value: String(d.sleepHours), note: t("hours a night", "tuntia yössä") });
  if (!tiles.length) return null;
  return (
    <section className="card">
      <h2>{t("At a glance", "Pähkinänkuoressa")}</h2>
      <ul className="metrics">
        {tiles.map(tile => <li key={tile.key} className="metric"><span className="metric__label">{tile.label}</span><strong className="metric__value">{tile.value}</strong>{tile.note && <span className="metric__note">{tile.note}</span>}</li>)}
      </ul>
      <p className="hint">{t("These are simple calculations from your own answers. They are not a diagnosis.", "Nämä ovat yksinkertaisia laskelmia omista vastauksistasi. Ne eivät ole diagnoosi.")}</p>
    </section>
  );
}

const levelName: Record<Alert["level"], [string, string]> = { emergency: ["Emergency", "Hätätilanne"], urgent: ["Today", "Tänään"], soon: ["Soon", "Pian"] };
function Flags({ answers, lang }: { answers: Answers; lang: Language }) {
  const { t } = usePrefs();
  const found = alerts(answers);
  if (!found.length) return null;
  return (
    <section className="card flags">
      <h2><CircleAlert size={22} aria-hidden="true" />{t("Worth raising with a clinician", "Kannattaa ottaa puheeksi hoitajan tai lääkärin kanssa")}</h2>
      <ul>
        {found.map(alert => (
          <li key={alert.key}>
            <span className={`badge badge--${alert.kind === "mood" ? "soon" : alert.level}`}>{tr(lang, alert.kind === "mood" ? ["Mood", "Mieliala"] : levelName[alert.level])}</span>
            {alert.kind === "mood"
              ? <span>{t("Your mood check-in suggests you have had a hard time lately.", "Mielialakyselysi viittaa siihen, että viime aikoina on ollut raskasta.")}</span>
              : <span>{alert.items.map(item => tr(lang, item)).join("; ")}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Summary({ answers, lang, onEdit }: { answers: Answers; lang: Language; onEdit: () => void }) {
  const { t } = usePrefs();
  const name = nameOf(answers);
  const sections = summarise(answers, lang);
  const today = new Date().toLocaleDateString(lang === "fi" ? "fi-FI" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="summary">
      <section className="card summary__hero">
        <span className="summary__check"><Check size={30} aria-hidden="true" /></span>
        <h1>{name ? t(`All done, ${name}!`, `Valmista, ${name}!`) : t("All done!", "Valmista!")}</h1>
        <p className="lead">{t("Thank you. Your health profile is saved to your account. Here is your summary.", "Kiitos. Terveysprofiilisi on tallennettu tilillesi. Tässä yhteenvetosi.")}</p>
        <ol className="next-steps">
          <li><Printer size={20} aria-hidden="true" /><span><strong>{t("Print it or save it as a PDF", "Tulosta tai tallenna PDF-tiedostona")}</strong> {t("and bring it to your next appointment.", "ja ota se mukaan seuraavalle vastaanotolle.")}</span></li>
          <li><Pencil size={20} aria-hidden="true" /><span><strong>{t("Keep it up to date.", "Pidä se ajan tasalla.")}</strong> {t("Change any answer whenever something changes.", "Muuta vastauksia aina, kun jokin muuttuu.")}</span></li>
          <li><ShieldCheck size={20} aria-hidden="true" /><span><strong>{t("Nobody has received it yet.", "Kukaan ei ole vielä saanut sitä.")}</strong> {t("This prototype is not connected to a clinic.", "Tämä prototyyppi ei ole yhteydessä klinikkaan.")}</span></li>
        </ol>
        <div className="summary__actions no-print">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => window.print()}><Printer size={20} aria-hidden="true" />{t("Print or save as PDF", "Tulosta tai tallenna PDF")}</button>
          <button type="button" className="btn btn--secondary btn--lg" onClick={onEdit}><Pencil size={20} aria-hidden="true" />{t("Edit my answers", "Muokkaa vastauksiani")}</button>
        </div>
      </section>
      <p className="print-only print-title">{t("Care4ll health summary", "Care4ll-terveysyhteenveto")} · {name ? name + " · " : ""}{t("prepared", "laadittu")} {today} · {t("Self-reported, unverified, prototype", "Itse kerrottu, tarkistamaton, prototyyppi")}</p>
      <Flags answers={answers} lang={lang} />
      <Metrics answers={answers} lang={lang} sections={sections} />
      <Sections sections={sections} />
    </div>
  );
}
