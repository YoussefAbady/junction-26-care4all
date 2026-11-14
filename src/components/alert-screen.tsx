"use client";
import type { RefObject } from "react";
import { ArrowRight, HeartHandshake, Phone, Siren, Stethoscope, TriangleAlert } from "lucide-react";
import type { Alert } from "@/lib/intake";
import { tr } from "@/lib/survey";
import { usePrefs } from "./prefs";

type Words = { title: [string, string]; body: [string, string]; icon: typeof Siren };
const words: Record<Alert["level"] | "mood", Words> = {
  emergency: {
    icon: Siren,
    title: ["Please get help right now", "Hae apua heti"],
    body: ["Some of what you told us can be a sign of an emergency. Call 112 (or your local emergency number) now. Please do not wait to finish this questionnaire.", "Osa kertomastasi voi viitata hätätilanteeseen. Soita heti numeroon 112 (tai paikalliseen hätänumeroon). Älä odota kyselyn loppuun saakka."],
  },
  urgent: {
    icon: TriangleAlert,
    title: ["This should be checked today", "Tämä kannattaa tutkituttaa tänään"],
    body: ["Some of what you told us should be looked at by a clinician soon, ideally today. In Finland you can call the 116 117 medical helpline or contact your health centre. If it gets worse, call 112.", "Osa kertomastasi kannattaa näyttää hoitoalan ammattilaiselle pian, mieluiten tänään. Suomessa voit soittaa lääkärinneuvontaan 116 117 tai ottaa yhteyttä terveysasemaan. Jos tilanne pahenee, soita 112."],
  },
  soon: {
    icon: Stethoscope,
    title: ["Worth getting checked", "Kannattaa tutkituttaa"],
    body: ["What you described has many possible causes, and most are not serious. It is still worth having a clinician look at it in the next few days rather than waiting for a routine visit.", "Kuvaamillasi oireilla on monia mahdollisia syitä, ja useimmat niistä eivät ole vakavia. Silti ne kannattaa näyttää hoitoalan ammattilaiselle lähipäivinä rutiinikäyntiä odottamatta."],
  },
  mood: {
    icon: HeartHandshake,
    title: ["It sounds like a hard couple of weeks", "Kuulostaa siltä, että kaksi viime viikkoa ovat olleet raskaita"],
    body: ["Thank you for being open about this. Feeling low or anxious is common and it can be treated. Consider mentioning it to your doctor or health centre. If you ever feel unable to keep yourself safe, call 112 (or your local emergency number) straight away.", "Kiitos, että kerroit tästä avoimesti. Alakulo ja ahdistus ovat yleisiä, ja niitä voi hoitaa. Mainitse asiasta lääkärille tai terveysasemalle. Jos koet joskus, ettet pysty pitämään itseäsi turvassa, soita heti numeroon 112 (tai paikalliseen hätänumeroon)."],
  },
};

export function AlertScreen({ alert, headingRef, onContinue }: { alert: Alert; headingRef: RefObject<HTMLHeadingElement | null>; onContinue: () => void }) {
  const { lang, t } = usePrefs();
  const key = alert.kind === "mood" ? "mood" : alert.level;
  const { icon: Glyph, title, body } = words[key];
  return (
    <section className={`card alert alert--${key}`} role="alertdialog" aria-labelledby="alert-title" aria-describedby="alert-body">
      <span className="alert__icon"><Glyph size={32} aria-hidden="true" /></span>
      <h1 id="alert-title" ref={headingRef} tabIndex={-1}>{tr(lang, title)}</h1>
      <p id="alert-body" className="lead">{tr(lang, body)}</p>
      {alert.items.length > 0 && (
        <div className="alert__told">
          <p><strong>{t("What you told us:", "Mitä kerroit:")}</strong></p>
          <ul>{alert.items.map(item => <li key={item[0]}>{tr(lang, item)}</li>)}</ul>
        </div>
      )}
      <p className="hint">{t("This questionnaire cannot diagnose anything or rule anything out. It only helps you describe how you feel.", "Tämä kysely ei voi todeta tai sulkea pois mitään sairautta. Se auttaa vain kuvaamaan vointiasi.")}</p>
      <div className="alert__actions">
        {(key === "emergency" || key === "mood") && <a className={`btn ${key === "emergency" ? "btn--danger" : "btn--secondary"} btn--lg`} href="tel:112"><Phone size={20} aria-hidden="true" />{t("Call 112", "Soita 112")}</a>}
        {key === "urgent" && <a className="btn btn--secondary btn--lg" href="tel:116117"><Phone size={20} aria-hidden="true" />{t("Call 116 117", "Soita 116 117")}</a>}
        <button type="button" className={`btn ${key === "emergency" ? "btn--secondary" : "btn--primary"} btn--lg`} onClick={onContinue}>
          {key === "emergency" ? t("I am safe, continue", "Olen turvassa, jatka") : t("I understand, continue", "Ymmärrän, jatka")}<ArrowRight size={20} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
