"use client";
import { useId, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { usePrefs } from "./prefs";
import type { ErrorKey } from "./session";

const messages: Record<ErrorKey, [string, string]> = {
  unavailable: ["The service is unavailable. Please try again shortly.", "Palvelu ei ole käytettävissä. Yritä hetken kuluttua uudelleen."],
  invalid: ["Please check the fields and try again.", "Tarkista kentät ja yritä uudelleen."],
  taken: ["That username is already taken. Try another, or sign in.", "Käyttäjätunnus on jo käytössä. Kokeile toista tai kirjaudu sisään."],
  credentials: ["The username or password is not right.", "Käyttäjätunnus tai salasana on väärä."],
  expired: ["Your session ended. Please sign in again.", "Istuntosi päättyi. Kirjaudu uudelleen."],
  conflict: ["Your answers changed in another tab. Reload to open the saved version.", "Vastauksesi muuttuivat toisessa välilehdessä. Lataa sivu uudelleen avataksesi tallennetun version."],
  limited: ["Too many attempts. Please wait a minute and try again.", "Liian monta yritystä. Odota minuutti ja yritä uudelleen."],
  offline: ["You seem to be offline. Please reconnect and try again.", "Näytät olevan offline-tilassa. Muodosta yhteys ja yritä uudelleen."],
};
export const errorText = (key: ErrorKey, lang: "en" | "fi") => messages[key][lang === "fi" ? 1 : 0];

export function AuthCard({ mode, setMode, busy, error, onSubmit, id = "start" }: {
  mode: "register" | "login"; setMode: (mode: "register" | "login") => void; busy: boolean; error: ErrorKey | null; onSubmit: (username: string, password: string) => void; id?: string;
}) {
  const { t, lang } = usePrefs();
  const [show, setShow] = useState(false);
  const uid = useId();
  const register = mode === "register";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    onSubmit(String(fields.get("username") ?? ""), String(fields.get("password") ?? ""));
  }
  return (
    <section className="card auth" id={id} aria-labelledby={`${uid}-title`}>
      <span className="auth__icon"><LockKeyhole size={22} aria-hidden="true" /></span>
      <h2 id={`${uid}-title`}>{register ? t("Create your free profile", "Luo ilmainen profiili") : t("Welcome back", "Tervetuloa takaisin")}</h2>
      <p className="auth__lead">{register ? t("It takes a minute. Then we will start the conversation.", "Siihen menee minuutti. Sen jälkeen aloitamme keskustelun.") : t("Sign in to pick up where you left off.", "Kirjaudu jatkaaksesi siitä, mihin jäit.")}</p>
      {error && <p className="notice notice--emergency" role="alert">{errorText(error, lang)}</p>}
      <form onSubmit={submit} noValidate={false}>
        <label className="field">
          <span className="field__label">{t("Username", "Käyttäjätunnus")}</span>
          <input className="input" name="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_\-]{3,30}" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={`${uid}-u`} />
          {register && <span className="hint" id={`${uid}-u`}>{t("3 to 30 characters: letters, numbers, _ or -", "3–30 merkkiä: kirjaimia, numeroita, _ tai -")}</span>}
        </label>
        <label className="field">
          <span className="field__label">{t("Password", "Salasana")}</span>
          <span className="passwordbox">
            <input className="input" name="password" type={show ? "text" : "password"} required minLength={10} maxLength={128} autoComplete={register ? "new-password" : "current-password"} aria-describedby={`${uid}-p`} />
            <button type="button" className="passwordbox__toggle" aria-pressed={show} onClick={() => setShow(!show)} aria-label={show ? t("Hide password", "Piilota salasana") : t("Show password", "Näytä salasana")}>
              {show ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </span>
          {register && <span className="hint" id={`${uid}-p`}>{t("At least 10 characters. A few random words work well.", "Vähintään 10 merkkiä. Muutama satunnainen sana toimii hyvin.")}</span>}
        </label>
        <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
          {busy ? t("One moment…", "Hetki…") : register ? t("Create profile and begin", "Luo profiili ja aloita") : t("Sign in", "Kirjaudu sisään")}<ArrowRight size={20} aria-hidden="true" />
        </button>
      </form>
      {register && <p className="auth__proto">{t("This is a prototype that has not been clinically validated. Please use a made-up username, fictional answers, and a password you use nowhere else.", "Tämä on prototyyppi, jota ei ole kliinisesti validoitu. Käytä keksittyä käyttäjätunnusta, kuvitteellisia vastauksia ja salasanaa, jota et käytä muualla.")}</p>}
      <button type="button" className="btn btn--ghost btn--block" disabled={busy} onClick={() => setMode(register ? "login" : "register")}>
        {register ? t("Already have a profile? Sign in", "Onko sinulla jo profiili? Kirjaudu sisään") : t("New here? Create a profile", "Uusi täällä? Luo profiili")}
      </button>
    </section>
  );
}
