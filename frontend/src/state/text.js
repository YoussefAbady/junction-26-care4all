/* Small text helpers for the pieces of interface that are not in the design's own string table. */
import { S } from "./store.js";

/** Picks the string for the current language. Swedish falls back to English where no Swedish text is given. */
export const tr = (en, fi, sv) => S.prefs.lang === "fi" ? (fi ?? en) : S.prefs.lang === "sv" ? (sv ?? en) : en;

const MESSAGES = {
  credentials: ["Check your username and password.", "Tarkista käyttäjätunnuksesi ja salasanasi."],
  taken: ["That username is already taken.", "Käyttäjätunnus on jo käytössä."],
  invalid: ["Check the information you entered.", "Tarkista antamasi tiedot."],
  expired: ["Sign in again to continue.", "Kirjaudu uudelleen jatkaaksesi."],
  limited: ["Too many attempts. Wait a minute and try again.", "Liian monta yritystä. Odota hetki ja yritä uudelleen."],
  conflict: ["This changed in another tab. Reopen it to continue.", "Tiedot muuttuivat toisella välilehdellä. Avaa uudelleen jatkaaksesi."],
  offline: ["You are offline. Reconnect to use this.", "Ei yhteyttä. Yhdistä uudelleen käyttääksesi tätä."],
  unavailable: ["care4all is not available right now. Try again in a moment.", "care4all ei ole juuri nyt saatavilla. Yritä hetken kuluttua uudelleen."],
  not_found: ["That could not be found. It may already be deleted.", "Kohdetta ei löytynyt. Se saattaa olla jo poistettu."],
};

/** A sentence for a failed backend call, in the current language. */
export function errorText(error) {
  const message = MESSAGES[error && error.code] || MESSAGES.unavailable;
  return tr(message[0], message[1]);
}
