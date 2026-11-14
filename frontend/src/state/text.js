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

/**
 * The backend only accepts writes from the address it was set up for. Opened from another address, every sign-up, sign-in
 * and save is refused, so say which address was used and which one to open instead.
 */
function originText(expected) {
  const here = typeof location === "object" && location && location.origin && location.origin !== "null" ? location.origin : "";
  return tr(
    "The server does not accept requests from this address" + (here ? " (" + here + ")" : "") + ". " +
      (expected ? "Open care4all at " + expected + " instead." : "Open care4all at the address it was set up with."),
    "Palvelin ei hyväksy pyyntöjä tästä osoitteesta" + (here ? " (" + here + ")" : "") + ". " +
      (expected ? "Avaa care4all osoitteessa " + expected + "." : "Avaa care4all siinä osoitteessa, johon se on asennettu."));
}

/** A sentence for a failed backend call, in the current language. */
export function errorText(error) {
  if (error && error.code === "origin") return originText(error.expected);
  const message = MESSAGES[error && error.code] || MESSAGES.unavailable;
  return tr(message[0], message[1]);
}
