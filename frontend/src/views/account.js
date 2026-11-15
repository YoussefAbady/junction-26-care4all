import { A } from "../app.js";
import { AI_CHOICE, CONSENT, FOOTER_LINE, ME_ROW, NEVER, PRIVACY_HANDLED, PRIVACY_IDENTITY, PRIVACY_IDENTITY_NOTE, SENT, WELCOME_PRIVATE } from "../privacy-copy.js";

/*
 * Account views: welcome, sign-up and sign-in, about you, your plan, Profile, privacy, notes and reminders.
 *
 * They load after the design's own views (screens.js, screens2.js) and replace the ones with the same names. They
 * use the design's components (.cell, .group, .card, .btn, sheets, large titles, the .err pattern) and read
 * everything personal from A.S, which comes from the signed-in account on the server. Changes go through A.svc.
 * Nothing here writes to browser storage.
 *
 * The routes follow the account: signed out you reach welcome, signup, signin and the public notices. Signed in
 * without a profile you reach about. With a profile you reach the whole app (ui.js decides, see gate()).
 */
const D = A.D, S = A.S, V = A.views, esc = A.esc, t = A.t, tr = A.tr, ic = A.icon;
const { cell, group, lead, footer } = A.vh;

const USERNAME = /^[a-z0-9_-]{3,30}$/;
const PASSWORD_MIN = 10, PASSWORD_MAX = 128;
const EXAMPLE_PREFIX = "aino_demo_";

/* ---------- small helpers ---------- */
const U = () => A.formUi;   // form helpers from ui.js, which loads after this file
const lede = (text, pull = 18) => '<p class="lede" style="margin-top:-' + pull + 'px">' + esc(text) + "</p>";
const errP = id => '<p class="err" id="' + id + '" hidden></p>';
const note = text => '<div class="note">' + esc(text) + "</div>";

/** One labelled input in the design's field cell. */
function textField({ id, name, label, type = "text", value = "", placeholder = "", autocomplete, described, extra = "" }) {
  return '<div class="group"><label class="cell field" for="' + id + '"><span class="fl">' + esc(label) + '</span><input class="fi" id="' + id + '" name="' + name + '" type="' + type + '"' +
    (autocomplete ? ' autocomplete="' + autocomplete + '"' : "") + (described ? ' aria-describedby="' + described + '"' : "") + extra + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : "") + ' value="' + esc(value) + '"></label></div>';
}
/** The four progress bars of the first-run screens: welcome, account, about you, plan. */
const dots = n => '<div class="progress-steps" aria-hidden="true">' + [1, 2, 3, 4].map(i => '<span class="' + (n >= i ? "on" : "") + '"></span>').join("") + "</div>";
/** The language button in the navigation bar. ui.js keeps its label current, whichever screens of the stack carry one. */
const langBtn = () => '<button class="nav-btn txt" type="button" data-lang-btn data-action="lang-cycle" aria-label="' + esc(tr('Language: ' + A.LANG_NAMES[S.prefs.lang] + '. Change language', 'Kieli: ' + A.LANG_NAMES[S.prefs.lang] + '. Vaihda kieli', 'Språk: ' + A.LANG_NAMES[S.prefs.lang] + '. Byt språk')) + '">' + S.prefs.lang.toUpperCase() + '</button>';
const randomText = (length, alphabet) => Array.from(crypto.getRandomValues(new Uint8Array(length)), b => alphabet[b % alphabet.length]).join("");

/** The example account's password, kept in memory only so this page session can delete it. Never shown, never stored. */
let exampleKey = "";
const isExample = () => !!S.account && S.account.username.startsWith(EXAMPLE_PREFIX);
const stageIn = () => !!S.account && !!S.profile;
const initial = () => ((S.profile && S.profile.name) || (S.account && S.account.username) || "·").charAt(0).toUpperCase();
/** A cell from the shared privacy wording (src/privacy-copy.js): { icon, tone, title, detail }, each text [English, Finnish, Swedish?]. */
const copyCell = it => cell({ lead: lead(it.icon, it.tone), title: tr(...it.title), detail: tr(...it.detail) });
/** The name of a reminder: the close-monitoring ones have a label of their own (monitor.js). */
const remName = r => A.remLabel ? A.remLabel(r) : (A.REM_KINDS[r.kind] || { label: r.kind }).label;

/* ---------- welcome ---------- */
V.welcome = function () {
  // The first two cells say, before anything is entered, where the records live and what the optional AI does and does not see.
  const feats = group([
    copyCell(WELCOME_PRIVATE),
    copyCell(AI_CHOICE),
    cell({ lead: lead("shield", "g"), title: tr("Understand your screening", "Ymmärrä seulontasi", "Förstå din screening"), detail: tr("See how breast, cervical and bowel screening work in Finland, and what happens at each step.", "Katso, miten rinta-, kohdunkaulan- ja suolistosyövän seulonta toimivat Suomessa ja mitä kussakin vaiheessa tapahtuu.") }),
    cell({ lead: lead("heart", "b"), title: tr("Care for everyone", "Hoitoa kaikille", "Vård för alla"), detail: tr("Large text, plain language, Finnish and English. Works with a screen reader.", "Suuri teksti, selkokieli, suomi ja englanti. Toimii ruudunlukijan kanssa.") }),
    cell({ lead: lead("phone", "o"), title: tr("Anywhere, any time", "Missä ja milloin tahansa", "Var och när som helst"), detail: tr("On your phone or computer. Once installed, the app opens even without a connection.", "Puhelimella tai tietokoneella. Asennettuna sovellus aukeaa ilman yhteyttäkin.") })
  ], "i");
  return {
    title: tr("Welcome", "Tervetuloa", "Välkommen"),
    large: tr("Care for everyone, anywhere, any time", "Hoitoa kaikille, missä ja milloin tahansa", "Vård för alla, var och när som helst"),
    // The install button (install.js) sits next to the language button, small, above the first screen of text.
    pre: '<div class="welcome-art">' + A.art.hero() + "</div>", trailing: (A.installIcon ? A.installIcon() : "") + langBtn(), noBack: true, hero: true,
    html: lede(tr("A private, easy companion to learn about cancer and cancer screening in Finland, and to take the next step. Every line has a source.", "Yksityinen ja helppo apu syövän ja syöväntarkistusten ymmärtämiseen Suomessa ja seuraavan askeleen ottamiseen. Jokaisella rivillä on lähde.")) + feats +
      note(tr("care4all is a prototype and a fictional demo. Please use fictional information only, and never enter your own health details.", "care4all on prototyyppi ja kuvitteellinen demo. Käytä vain kuvitteellisia tietoja äläkä koskaan syötä omia terveystietojasi.")) +
      '<div class="actionbar"><a class="btn primary block" href="#signup">' + esc(tr("Create account", "Luo tili", "Skapa konto")) + "</a>" +
      '<a class="btn block" href="#signin">' + esc(tr("Sign in", "Kirjaudu sisään", "Logga in")) + "</a>" +
      '<button class="btn ghost sm block" type="button" data-action="example">' + esc(tr("Try an example profile", "Kokeile esimerkkiprofiilia", "Prova en exempelprofil") + " (Aino, " + A.age(D.EXAMPLE) + ")") + "</button></div>"
  };
};

/* ---------- sign-up (the design's step 2, "Your privacy comes first", now with the account) ---------- */
V.signup = function () {
  const privacy = group([
    cell({ lead: lead("lock", "k"), title: tr("Saved in your demo account", "Tallennetaan demotilillesi", "Sparas i ditt demokonto"), detail: tr("Your profile, notes, reminders and answers are stored on the server under your username. Other accounts cannot see them, and there is no analytics.", "Profiilisi, muistiinpanosi, muistutuksesi ja vastauksesi tallennetaan palvelimelle käyttäjätunnuksesi alle. Muut tilit eivät näe niitä, eikä analytiikkaa ole.") }),
    copyCell(AI_CHOICE),
    cell({ lead: lead("heart", "r"), title: tr("Use fictional information only", "Käytä vain kuvitteellisia tietoja", "Använd bara fiktiva uppgifter"), detail: tr("care4all is a prototype, not a medical service. Please do not enter real health details or anything that identifies you.", "care4all on prototyyppi eikä lääketieteellinen palvelu. Älä syötä todellisia terveystietoja tai mitään, mikä tunnistaa sinut.") }),
    cell({ lead: lead("user", "b"), title: tr("You stay in control", "Pidät langat käsissäsi", "Du har kontrollen"), detail: tr("Export a copy of your data or delete the account at any time in Profile.", "Voit viedä kopion tiedoistasi tai poistaa tilin milloin tahansa Profiilissa.") })
  ], "i");
  return {
    title: tr("Create account", "Luo tili", "Skapa konto"), large: tr("Create your account", "Luo tilisi", "Skapa ditt konto"),
    pre: '<div style="padding-top:2px">' + dots(2) + "</div>", trailing: langBtn(),
    html: lede(tr("This is a prototype. Your records are saved in a demo account on the server, so please use fictional information only.", "Tämä on prototyyppi. Tietosi tallennetaan demotilille palvelimelle, joten käytä vain kuvitteellisia tietoja."), 14) + privacy +
      '<form class="form" data-form="signup" data-keep novalidate>' +
      '<div class="fgroup">' + textField({ id: "su-user", name: "username", label: tr("Username", "Käyttäjätunnus", "Användarnamn"), placeholder: tr("Choose one", "Valitse", "Välj ett"), autocomplete: "username", described: "h-su-user e-su-user", extra: ' autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next"' }) +
      errP("e-su-user") + '<p class="fnote" id="h-su-user">' + esc(tr("3 to 30 characters: letters a to z, numbers, _ or -. You cannot change it later.", "3–30 merkkiä: kirjaimia a–z, numeroita, _ tai -. Sitä ei voi muuttaa myöhemmin.")) + "</p></div>" +
      '<div class="fgroup">' + textField({ id: "su-pass", name: "password", label: tr("Password", "Salasana", "Lösenord"), placeholder: tr("10 or more characters", "Vähintään 10 merkkiä", "Minst 10 tecken"), type: "password", autocomplete: "new-password", described: "h-su-pass e-su-pass", extra: ' enterkeyhint="go"' }) +
      errP("e-su-pass") + '<p class="fnote" id="h-su-pass">' + esc(tr("At least 10 characters. There is no password reset in this prototype, so keep it safe.", "Vähintään 10 merkkiä. Tässä prototyypissä ei ole salasanan palautusta, joten säilytä se hyvin.")) + "</p></div>" +
      '<div class="fgroup"><div class="group">' + U().opt("checkbox", "agree", "1", tr("I will use fictional information only and I have read the privacy notice.", "Käytän vain kuvitteellisia tietoja ja olen lukenut tietosuojaselosteen.", "Jag använder bara fiktiva uppgifter och har läst integritetspolicyn."), "", false, ' aria-describedby="e-su-agree"') + "</div>" +
      errP("e-su-agree") + '<button class="link" type="button" data-action="info" data-kind="privacy" style="padding:0 4px">' + esc(tr("Read the privacy notice", "Lue tietosuojaseloste", "Läs integritetspolicyn")) + "</button></div>" +
      errP("e-su-form") +
      '<div class="actionbar"><button class="btn primary block" type="submit">' + esc(tr("Create account", "Luo tili", "Skapa konto")) + "</button>" +
      '<a class="btn ghost sm block" href="#signin">' + esc(tr("I already have an account", "Minulla on jo tili", "Jag har redan ett konto")) + "</a></div></form>"
  };
};
V.consent = V.signup;   // the design's name for this step

A.forms.signup = async function (form) {
  if (form.hasAttribute("data-pending")) return;
  const F = U(), user = F.field(form, "username"), pass = F.field(form, "password"), agree = F.field(form, "agree");
  const name = user.value.trim().toLowerCase();
  F.clearErrs(form);
  let bad = null;
  if (!USERNAME.test(name)) { F.showErr(form, "e-su-user", tr("Use 3 to 30 characters: lower-case letters, numbers, _ or -.", "Käytä 3–30 merkkiä: pieniä kirjaimia, numeroita, _ tai -.", "Använd 3 till 30 tecken: små bokstäver, siffror, _ eller -."), user); bad = user; }
  if (pass.value.length < PASSWORD_MIN || pass.value.length > PASSWORD_MAX) { F.showErr(form, "e-su-pass", tr("Use 10 to 128 characters.", "Käytä 10–128 merkkiä.", "Använd 10 till 128 tecken."), pass); bad = bad || pass; }
  if (!agree.checked) { F.showErr(form, "e-su-agree", tr("Tick this box to create an account.", "Rastita ruutu luodaksesi tilin.", "Kryssa i rutan för att skapa ett konto."), agree); bad = bad || agree; }
  if (bad) { bad.focus(); A.announce(tr("Please fix the highlighted fields.", "Korjaa korostetut kentät.", "Rätta de markerade fälten.")); return; }
  F.setPending(form, true);
  try {
    await A.svc.register(name, pass.value);
  } catch (error) {
    // Failing after the account exists (for example while saving display choices) leaves a signed-in new account.
    if (!S.account) {
      F.setPending(form, false);
      if (error && error.code === "taken") {
        const message = tr("That username is already taken. Try another one.", "Käyttäjätunnus on jo käytössä. Kokeile toista.", "Användarnamnet är redan taget. Prova ett annat.");
        F.showErr(form, "e-su-user", message, user); A.announce(message); user.focus();
      } else {
        const message = A.errorText(error);
        F.showErr(form, "e-su-form", message); A.announce(message);
      }
      return;
    }
  }
  A.go("about");
};

/* ---------- sign-in ---------- */
V.signin = function () {
  return {
    title: tr("Sign in", "Kirjaudu sisään", "Logga in"), large: tr("Sign in", "Kirjaudu sisään", "Logga in"), trailing: langBtn(),
    html: lede(tr("Welcome back. Sign in to see your records.", "Tervetuloa takaisin. Kirjaudu nähdäksesi tietosi.", "Välkommen tillbaka. Logga in för att se dina uppgifter."), 14) +
      '<form class="form" data-form="signin" data-keep novalidate>' +
      '<div class="fgroup">' + textField({ id: "si-user", name: "username", label: tr("Username", "Käyttäjätunnus", "Användarnamn"), placeholder: tr("Your username", "Käyttäjätunnuksesi", "Ditt användarnamn"), autocomplete: "username", described: "e-si-user", extra: ' autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next"' }) + errP("e-si-user") + "</div>" +
      '<div class="fgroup">' + textField({ id: "si-pass", name: "password", label: tr("Password", "Salasana", "Lösenord"), placeholder: tr("Your password", "Salasanasi", "Ditt lösenord"), type: "password", autocomplete: "current-password", described: "e-si-pass", extra: ' enterkeyhint="go"' }) + errP("e-si-pass") +
      '<p class="fnote">' + esc(tr("Forgotten your password? There is no reset in this prototype. Create a new demo account instead.", "Unohtuiko salasana? Tässä prototyypissä ei ole palautusta. Luo sen sijaan uusi demotili.")) + "</p></div>" +
      errP("e-si-form") +
      '<div class="actionbar"><button class="btn primary block" type="submit">' + esc(tr("Sign in", "Kirjaudu sisään", "Logga in")) + "</button>" +
      '<a class="btn ghost sm block" href="#signup">' + esc(tr("Create an account instead", "Luo sen sijaan tili", "Skapa ett konto i stället")) + "</a></div></form>"
  };
};

A.forms.signin = async function (form) {
  if (form.hasAttribute("data-pending")) return;
  const F = U(), user = F.field(form, "username"), pass = F.field(form, "password");
  const name = user.value.trim().toLowerCase();
  F.clearErrs(form);
  if (!name) { F.showErr(form, "e-si-user", tr("Enter your username.", "Kirjoita käyttäjätunnuksesi.", "Ange ditt användarnamn."), user); user.focus(); A.announce(tr("Enter your username.", "Kirjoita käyttäjätunnuksesi.", "Ange ditt användarnamn.")); return; }
  if (!pass.value) { F.showErr(form, "e-si-pass", tr("Enter your password.", "Kirjoita salasanasi.", "Ange ditt lösenord."), pass); pass.focus(); A.announce(tr("Enter your password.", "Kirjoita salasanasi.", "Ange ditt lösenord.")); return; }
  // A name or password that could never have been saved needs no round trip to be wrong.
  if (!USERNAME.test(name) || pass.value.length < PASSWORD_MIN || pass.value.length > PASSWORD_MAX) {
    const message = A.errorText({ code: "credentials" });
    F.showErr(form, "e-si-form", message); A.announce(message);
    return;
  }
  F.setPending(form, true);
  try {
    await A.svc.login(name, pass.value);
  } catch (error) {
    if (S.account) A.svc.reset();   // signed in on the server, but its records did not load: start clean
    F.setPending(form, false);
    const message = A.errorText(error);
    F.showErr(form, "e-si-form", message); A.announce(message);
    return;
  }
  A.go(S.profile ? "home" : "about");
};

/* ---------- the example profile ---------- */
A.actions.example = async function (el) {
  if (el.disabled) return;
  const bar = el.closest(".actionbar");
  el.disabled = true; el.setAttribute("aria-busy", "true");
  if (bar) bar.setAttribute("data-pending", "");
  const done = () => { el.disabled = false; el.removeAttribute("aria-busy"); if (bar) bar.removeAttribute("data-pending"); };
  const password = randomText(32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  try {
    // A throwaway demo account. Its password is random, kept only in this page and never shown.
    for (let attempt = 0; ; attempt++) {
      try { await A.svc.register(EXAMPLE_PREFIX + randomText(6, "abcdefghijklmnopqrstuvwxyz0123456789"), password); break; }
      catch (error) { if (!(error && error.code === "taken" && attempt < 2)) throw error; }
    }
  } catch (error) {
    done();
    if (!S.account) { A.fail(error); return; }
  }
  if (S.account) {
    exampleKey = password;
    try { await A.svc.saveProfile({ ...D.EXAMPLE }); } catch (error) { A.fail(error); }
  }
  done();
  A.go(S.profile ? "plan" : "about");
};

/* ---------- about you (first time) and edit profile ---------- */
function profileFields(v) {
  const sexes = [
    ["female", tr("Female", "Nainen", "Kvinna")], ["male", tr("Male", "Mies", "Man")], ["intersex", tr("Intersex", "Intersukupuolinen", "Intersex")],
    ["other", tr("Another option", "Jokin muu", "Annat")], ["declined", tr("Prefer not to say", "En halua kertoa", "Vill inte uppge")], ["none", tr("Not specified", "Ei määritelty", "Ej angivet")]
  ];
  const counties = A.countyOptions().map(c => '<option value="' + esc(c[0]) + '"' + (v.county === c[0] ? " selected" : "") + ">" + esc(c[1]) + "</option>").join("");
  return '<div class="fgroup"><div class="group"><label class="cell field" for="f-name"><span class="fl">' + esc(tr("First name", "Etunimi", "Förnamn")) + '</span><input class="fi" id="f-name" name="name" type="text" autocomplete="given-name" maxlength="40" placeholder="' + esc(tr("Optional", "Valinnainen", "Valfritt")) + '" aria-describedby="h-name" value="' + esc(v.name || "") + '"></label></div>' +
    '<p class="fnote" id="h-name">' + esc(tr("Only used to greet you. Saved in your demo account, and never sent to the AI.", "Käytetään vain tervehtimiseen. Tallennetaan demotilillesi, eikä sitä koskaan lähetetä tekoälylle.")) + "</p></div>" +
    '<div class="fgroup"><div class="group"><label class="cell field" id="c-yob" for="f-yob"><span class="fl">' + esc(tr("Year of birth", "Syntymävuosi", "Födelseår")) + '</span><input class="fi" id="f-yob" name="yob" type="text" inputmode="numeric" autocomplete="bday-year" maxlength="4" placeholder="1974" aria-describedby="h-yob e-yob" value="' + esc(v.yob || "") + '"></label></div>' +
    errP("e-yob") + '<p class="fnote" id="h-yob">' + esc(tr("Topics are ordered by age. care4all is for adults. If you use the AI questions, it gets your age in years, never your date of birth.", "Aiheet järjestetään iän mukaan. care4all on aikuisille. Jos käytät tekoälykysymyksiä, tekoäly saa ikäsi vuosina, ei koskaan syntymäaikaasi.")) + "</p></div>" +
    '<div class="fgroup"><p class="cap" id="sex-l" style="padding:0 4px">' + esc(tr("Sex registered at birth", "Syntymässä rekisteröity sukupuoli", "Kön registrerat vid födseln")) + "</p>" +
    '<div class="group" role="radiogroup" aria-labelledby="sex-l" aria-describedby="h-sex e-sex">' + sexes.map(x => U().opt("radio", "sex", x[0], x[1], "", v.sex === x[0])).join("") + "</div>" +
    errP("e-sex") + '<p class="fnote" id="h-sex">' + esc(tr("This only decides which topics come first. Nothing is hidden.", "Tämä määrää vain, mitkä aiheet näytetään ensin. Mitään ei piiloteta.")) + "</p></div>" +
    '<div class="fgroup"><div class="group"><label class="cell field" for="f-county"><span class="fl">' + esc(tr("County", "Maakunta", "Landskap")) + '</span><select class="fi" id="f-county" name="county" aria-describedby="h-county e-county"><option value=""' + (v.county ? "" : " selected") + " disabled>" + esc(tr("Choose", "Valitse", "Välj")) + "</option>" + counties + "</select></label></div>" +
    errP("e-county") + '<p class="fnote" id="h-county">' + esc(tr("Your wellbeing services county organises screening, so what you are offered can differ. Choose “Not sure” if you do not know. The AI only learns whether you live in Finland, never where.", "Hyvinvointialueesi järjestää seulonnat, joten tarjonta voi vaihdella. Valitse ”En ole varma”, jos et tiedä. Tekoäly saa tietää vain, asutko Suomessa, ei koskaan missä.")) + "</p></div>" +
    errP("e-pf");
}
A.profileFields = profileFields;

V.about = function () {
  const v = S.profile || { name: "", yob: "", sex: "", county: "" };
  return {
    title: tr("About you", "Tietoja sinusta", "Om dig"), large: tr("About you", "Tietoja sinusta", "Om dig"), trailing: langBtn(),
    pre: '<div style="padding-top:2px">' + dots(3) + "</div>",
    html: lede(tr("A few quick questions. They only decide which topics come first. We do not ask about your health history here.", "Muutama nopea kysymys. Ne määräävät vain, mitkä aiheet näytetään ensin. Terveyshistoriaasi emme kysy tässä."), 14) +
      '<form class="form" data-form="profile" data-mode="onboard" data-keep novalidate>' + profileFields(v) +
      '<p class="fnote">' + esc(tr("You can change or delete your profile at any time. It is saved in your demo account.", "Voit muuttaa tai poistaa profiilisi milloin tahansa. Se tallennetaan demotilillesi.")) + ' <button class="link" type="button" data-action="info" data-kind="privacy" style="min-height:0;font-size:inherit">' + esc(tr("How we use your profile", "Miten käytämme profiiliasi", "Hur vi använder din profil")) + "</button></p>" +
      '<div class="actionbar"><button class="btn primary block" type="submit">' + esc(t("cont")) + "</button>" +
      '<button class="btn ghost sm block" type="button" data-action="sign-out">' + esc(tr("Not you? Sign out", "Etkö ole se sinä? Kirjaudu ulos", "Inte du? Logga ut")) + "</button></div></form>"
  };
};
V.edit = function () {
  return {
    title: tr("Edit profile", "Muokkaa profiilia", "Redigera profil"), large: tr("Edit profile", "Muokkaa profiilia", "Redigera profil"),
    html: '<form class="form" data-form="profile" data-mode="edit" data-keep novalidate>' + profileFields(S.profile || {}) +
      '<div class="actionbar"><button class="btn primary block" type="submit">' + esc(tr("Save changes", "Tallenna muutokset", "Spara ändringar")) + "</button></div></form>"
  };
};
/* Picking an answer clears the message that said one was missing. */
A.changes.profile = function (el) {
  const id = el.name === "sex" ? "e-sex" : el.name === "county" ? "e-county" : "";
  const p = id && document.getElementById(id);
  if (p) { p.hidden = true; p.textContent = ""; }
};

A.forms.profile = async function (form) {
  if (form.hasAttribute("data-pending")) return;
  const F = U(), mode = form.getAttribute("data-mode");
  const yobEl = F.field(form, "yob"), yob = parseInt(yobEl.value, 10), maxY = new Date().getUTCFullYear() - 18;
  F.clearErrs(form);
  let bad = null;
  if (!/^\d{4}$/.test(yobEl.value.trim()) || yob < 1910 || yob > maxY) {
    F.showErr(form, "e-yob", tr("Enter a 4-digit year between 1910 and " + maxY + ", for example 1974. care4all is for adults.", "Kirjoita nelinumeroinen vuosi väliltä 1910–" + maxY + ", esimerkiksi 1974. care4all on aikuisille.", "Ange ett fyrsiffrigt år mellan 1910 och " + maxY + ", till exempel 1974. care4all är för vuxna."), yobEl);
    bad = yobEl;
  }
  const sex = F.checked(form, "sex")[0];
  if (!sex) { F.showErr(form, "e-sex", tr("Choose one option.", "Valitse yksi vaihtoehto.", "Välj ett alternativ.")); bad = bad || form.querySelector('input[name="sex"]'); }
  const county = F.field(form, "county").value;
  if (!county) { F.showErr(form, "e-county", tr("Choose your county, or “Not sure”.", "Valitse maakuntasi tai ”En ole varma”.", "Välj ditt landskap, eller ”Vet inte”."), F.field(form, "county")); bad = bad || F.field(form, "county"); }
  if (bad) { bad.focus(); A.announce(tr("Please fix the highlighted fields.", "Korjaa korostetut kentät.", "Rätta de markerade fälten.")); return; }
  F.setPending(form, true);
  try {
    await A.svc.saveProfile({ name: F.field(form, "name").value.trim().slice(0, 40), yob, sex, county });
  } catch (error) {
    F.setPending(form, false);
    if (error && error.code === "expired") { A.fail(error); return; }
    const message = A.errorText(error);
    F.showErr(form, "e-pf", message); A.announce(message);
    return;
  }
  if (mode === "onboard") A.go("plan");
  else { A.refresh(true); A.toast(tr("Saved. Your topics are up to date.", "Tallennettu. Aiheesi on ajan tasalla.", "Sparat. Dina ämnen är uppdaterade.")); A.back(); }
};

/* ---------- your plan: what happens next (no screening status is worked out here) ---------- */
V.plan = function () {
  const p = S.profile || {};
  const steps = [
    ["book", tr("Learn about screening", "Opi seulonnoista", "Lär dig om screening"), tr("Short, sourced guides to breast, cervical and bowel screening, and to other cancer types.", "Lyhyitä, lähteisiin perustuvia oppaita rinta-, kohdunkaulan- ja suolistosyövän seulonnoista sekä muista syöpätyypeistä.")],
    ["chat", tr("Tell us a little about you", "Kerro vähän itsestäsi", "Berätta lite om dig"), tr("A short chat, then a few optional AI questions, so care4all can suggest the right next steps and work out a risk overview. You can pause at any time, and nothing goes to the AI until you agree.", "Lyhyt keskustelu ja sen jälkeen muutama valinnainen tekoälykysymys, jotta care4all voi ehdottaa sopivia seuraavia askeleita ja laatia riskikatsauksen. Voit pitää tauon milloin tahansa, eikä tekoälylle lähetetä mitään ennen kuin hyväksyt sen.")],
    ["bell", tr("Set a reminder", "Aseta muistutus", "Ställ in en påminnelse"), tr("A nudge to look out for a letter, do a self-check or book a visit. Notifications never name a cancer.", "Muistutus odottaa kutsua, tehdä itsetarkistus tai varata aika. Ilmoituksissa ei koskaan mainita syöpää.")],
    ["lock", tr("Your records stay yours", "Tietosi pysyvät sinun", "Dina uppgifter är dina"), tr("Notes, reminders and answers are saved in your demo account. Export or delete them any time in Profile.", "Muistiinpanot, muistutukset ja vastaukset tallennetaan demotilillesi. Voit viedä tai poistaa ne milloin tahansa Profiilissa.")]
  ];
  return {
    title: tr("Your plan", "Suunnitelmasi", "Din plan"), large: t("hello") + (p.name ? ", " + p.name : ""),
    pre: '<div style="padding-top:2px">' + dots(4) + "</div>", noBack: true,
    html: lede(tr("Your profile is saved. Here is what you can do next.", "Profiilisi on tallennettu. Tässä mitä voit tehdä seuraavaksi."), 14) +
      '<div class="group" id="plan-list" aria-live="polite"></div>' +
      '<div class="actionbar"><a class="btn primary block" href="#home">' + esc(tr("Go to home", "Siirry etusivulle", "Gå till startsidan")) + "</a>" +
      '<a class="btn tint block" href="#you">' + esc(tr("Answer a few questions", "Vastaa muutamaan kysymykseen", "Svara på några frågor")) + "</a>" +
      '<button class="btn ghost block" type="button" data-action="reminder-new">' + esc(tr("Set a reminder", "Aseta muistutus", "Ställ in en påminnelse")) + "</button></div>",
    after(root) {
      const box = A.$("#plan-list", root);
      let i = 0;
      (function next() {
        if (!box || i >= steps.length) return;
        const [icon, title, text] = steps[i++], row = document.createElement("div");
        row.className = "chk";
        row.innerHTML = '<span class="ic2">' + ic(icon, 16) + "</span><div><b>" + esc(title) + '</b><span class="small">' + esc(text) + "</span></div>";
        box.appendChild(row);
        A.wait(450).then(next);
      })();
    }
  };
};

/* ---------- Profile ---------- */
/** The "Your risk overview" row, from A.risk (views/risk.js). It shows once the AI questions are done, made or not yet. */
function riskCell() {
  const R = A.risk;
  if (!R || !R.ready || !R.ready()) return "";
  const result = R.result && R.result(), assessment = R.assessment && R.assessment();
  const tier = result && result.overall && result.overall.tier;
  const detail = tier
    ? esc(tr("Overall ", "Kokonaistaso ", "Totalt ")) + R.tag(tier) + esc(tr(" · tap to see why", " · napauta nähdäksesi perustelut", " · tryck för att se varför"))
    : esc(assessment && assessment.status === "running" ? tr("Being worked out. Tap to follow it.", "Laaditaan. Napauta seurataksesi sitä.") : tr("Ready to be worked out from your answers", "Valmis laadittavaksi vastaustesi perusteella"));
  return cell({ href: "#risk", lead: lead("shield", "o"), title: tr("Your risk overview", "Riskikatsauksesi", "Din risköversikt"), rawDetail: detail });
}
V.me = function () {
  const p = S.profile || {}, acct = S.account || { username: "" };
  const sizeNames = A.sizeNames(), scale = [0, 1, 2].includes(S.prefs.scale) ? S.prefs.scale : 0, skin = [1, 2, 3].includes(+S.prefs.skin) ? +S.prefs.skin : 1;
  const activeRem = S.reminders.filter(r => r.status === "active").sort((a, b) => a.due - b.due);
  const stat = (href, n, label) => '<a href="' + href + '"><b>' + n + "</b><span>" + esc(label) + "</span></a>";
  // The card: who you are, an edit button, and three counts that open the lists. The row under it is the privacy promise, kept true: see privacy-copy.js.
  let h = '<section class="me-card" aria-label="' + esc(tr("Your profile", "Profiilisi", "Din profil")) + '"><div class="me-top"><span class="avatar-lg" aria-hidden="true">' + esc(initial()) + '</span><div class="me-id"><h2 class="h2">' + esc(p.name || tr("Your profile", "Profiilisi", "Din profil")) + "</h2>" +
    "<p>" + esc(tr("Age ", "Ikä ", "Ålder ") + A.age() + " · " + A.countyShort(p.county)) + "</p>" +
    "<p>" + esc(tr("Signed in as ", "Kirjautunut tunnuksella ", "Inloggad som ")) + "<b>" + esc(acct.username) + "</b></p></div>" +
    '<a class="me-edit" href="#edit" aria-label="' + esc(tr("Edit profile", "Muokkaa profiilia", "Redigera profil")) + '">' + ic("pencil", 20) + "</a></div>" +
    '<div class="me-stats">' + stat("#results", S.checklog.length, tr("Checks", "Tarkistukset", "Kontroller")) + stat("#reminders", activeRem.length, tr("Reminders", "Muistutukset", "Påminnelser")) + stat("#notes", S.notes.length, tr("Notes", "Muistiinpanot", "Anteckningar")) + "</div></section>" +
    '<a class="priv-row" href="#privacy">' + ic("lock", 18) + "<span><b>" + esc(tr(...ME_ROW.bold)) + "</b> " + esc(tr(...ME_ROW.rest)) + "</span>" + ic("chev-r", 18) + "</a>";
  h += '<div class="group i">' +
    cell({ href: "#reminders", lead: lead("bell", "o"), title: t("reminders"), detail: activeRem.length ? remName(activeRem[0]) + " · " + A.fmtDue(activeRem[0].due) : tr("Get a nudge to look out for your letter", "Saat muistutuksen odottaa kutsua", "Få en påminnelse att vänta på brevet"), value: activeRem.length ? String(activeRem.length) : "" }) + "</div>";
  h += '<div class="group i">' +
    cell({ href: "#you", lead: lead("chat", "b"), title: tr("Get to know you", "Kerro itsestäsi", "Berätta om dig"), detail: tr("A short chat so I can suggest next steps", "Lyhyt keskustelu, jotta voin ehdottaa seuraavia askeleita", "En kort pratstund så att jag kan föreslå nästa steg") }) +
    riskCell() +
    cell({ href: "#next", lead: lead("checklist", "g"), title: tr("Your next steps", "Seuraavat askeleesi", "Dina nästa steg"), detail: tr("Suggestions based on what you have shared", "Ehdotuksia sen perusteella, mitä olet kertonut", "Förslag utifrån det du har delat") }) + "</div>";
  h += '<section class="sec"><p class="cap">' + esc(tr("Reading and display", "Lukeminen ja näyttö", "Läsning och visning")) + '</p><div class="group i">' +
    cell({ action: "lang-menu", lead: lead("globe", ""), title: t("language"), value: A.LANG_NAMES[S.prefs.lang] }) +
    '<div class="cell"><span class="ic" aria-hidden="true">' + ic("textsize", 20) + '</span><span class="cell-b"><span class="cell-t" id="ts-l">' + esc(t("textSize")) + "</span></span></div>" +
    '<div class="cell" style="padding-top:0"><div class="seg tall" role="radiogroup" aria-labelledby="ts-l" style="--n:3;--i:' + scale + ';width:100%">' +
    sizeNames.map((n, i) => '<label><input type="radio" name="scale" value="' + i + '" data-pref="scale"' + (scale === i ? " checked" : "") + "><span>" + esc(n) + "</span></label>").join("") + "</div></div>" +
    '<div class="cell"><span class="ic" aria-hidden="true">' + ic("book", 20) + '</span><span class="cell-b"><span class="cell-t" id="pl-l">' + esc(t("plain")) + '</span><span class="cell-d">' + esc(tr("Shorter wording in articles where available", "Lyhyempää sanamuotoa artikkeleissa, kun saatavilla", "Kortare formuleringar i artiklar där det finns")) + '</span></span><button class="sw" type="button" role="switch" aria-checked="' + !!S.prefs.plain + '" aria-labelledby="pl-l" data-action="plain-switch"></button></div>' +
    '<div class="cell"><span class="ic" aria-hidden="true">' + ic("eye", 20) + '</span><span class="cell-b"><span class="cell-t" id="sk-l">' + esc(tr("Skin tone in pictures", "Ihonsävy kuvissa", "Hudton i bilder")) + "</span></span></div>" +
    '<div class="cell" style="padding-top:0"><div class="seg tall" role="radiogroup" aria-labelledby="sk-l" style="--n:3;--i:' + (skin - 1) + ';width:100%">' +
    [["1", tr("Light", "Vaalea", "Ljus")], ["2", tr("Medium", "Keskitumma", "Medium")], ["3", tr("Deep", "Tumma", "Mörk")]].map(x => '<label><input type="radio" name="skin2" value="' + x[0] + '" data-pref="skin"' + (String(skin) === x[0] ? " checked" : "") + "><span>" + esc(x[1]) + "</span></label>").join("") + "</div></div>" +
    '<div class="cell"><span class="ic" aria-hidden="true">' + ic("sparkle", 20) + '</span><span class="cell-b"><span class="cell-t" id="an-l">' + esc(tr("Animations", "Animaatiot", "Animationer")) + '</span><span class="cell-d">' + esc(tr("Also follows your device setting", "Seuraa myös laitteesi asetusta", "Följer också enhetens inställning")) + '</span></span><button class="sw" type="button" role="switch" aria-checked="' + (S.prefs.motion !== false) + '" aria-labelledby="an-l" data-action="motion-switch"></button></div></div></section>';
  const latest = S.checklog[0];
  h += '<section class="sec"><p class="cap">' + esc(tr("My records", "Omat tietoni", "Mina uppgifter")) + "</p>" + group([
    cell({ href: "#results", lead: lead("hand", "g"), title: tr("Self-check results", "Itsetarkistusten tulokset", "Resultat från självundersökningar"), detail: latest ? tr("Latest: ", "Viimeisin: ", "Senaste: ") + A.topicLabel(latest.check) + ", " + (latest.result === "clear" ? tr("nothing new", "ei mitään uutta", "inget nytt") : tr("found something", "löysin jotain", "hittade något")) : tr("What you find in your self-checks", "Mitä löydät itsetarkistuksissasi", "Vad du hittar i dina självundersökningar"), value: String(S.checklog.length) }),
    cell({ href: "#notes", lead: lead("note", "o"), title: tr("Symptom notes", "Oiremuistiinpanot", "Symtomanteckningar"), detail: tr("For you and your appointment. Not a diagnosis.", "Sinulle ja vastaanottoasi varten. Ei diagnoosi.", "För dig och ditt besök. Ingen diagnos."), value: String(S.notes.length) })], "i") + "</section>";
  h += '<section class="sec"><p class="cap">' + esc(tr("About", "Tietoja", "Om")) + '</p><div class="group i">' +
    cell({ action: "install", data: { "install-cell": "" }, lead: lead("phone", ""), title: t("install") + " care4all", detail: tr("Opens without a connection", "Aukeaa ilman yhteyttä", "Öppnas utan anslutning") }) +
    (A.updateWorker ? cell({ action: "update-app", lead: lead("download", "o"), title: tr("Update available", "Päivitys saatavilla", "Uppdatering tillgänglig"), detail: tr("Restart care4all to use the new version", "Käynnistä care4all uudelleen ottaaksesi uuden version käyttöön", "Starta om care4all för att använda den nya versionen") }) : "") +
    cell({ href: "#sources", lead: lead("sources", ""), title: tr("Sources and method", "Lähteet ja menetelmä", "Källor och metod") }) +
    cell({ action: "info", data: { kind: "access" }, lead: lead("shield", ""), title: tr("Accessibility", "Saavutettavuus", "Tillgänglighet") }) +
    cell({ href: "#privacy", lead: lead("lock", ""), title: tr("Privacy", "Tietosuoja", "Integritet") }) +
    cell({ action: "report", lead: lead("flag", ""), title: tr("Report a problem", "Ilmoita ongelmasta", "Rapportera ett problem") }) + "</div></section>";
  h += '<section class="sec"><p class="cap">' + esc(tr("Your account", "Tilisi", "Ditt konto")) + "</p>" +
    (isExample() ? note(tr("This is a temporary example account. Its password was never shown, so once you sign out you cannot sign in to it again.", "Tämä on väliaikainen esimerkkitili. Sen salasanaa ei näytetty koskaan, joten uloskirjautumisen jälkeen et voi kirjautua siihen uudelleen.")) : "") +
    '<div class="group i">' +
    (A.open && A.open.doctorPdf ? cell({ action: "doc-pdf", lead: lead("note", "o"), title: tr("PDF for my doctor", "PDF lääkärilleni"), detail: tr("A short summary, made in your browser, to hand over or share", "Lyhyt yhteenveto, tehty selaimessasi, luovutettavaksi tai jaettavaksi") }) : "") +
    cell({ action: "export", lead: lead("download", ""), title: tr("Export my data", "Vie tietoni", "Exportera mina uppgifter"), detail: tr("Everything in your account, as a JSON file", "Kaikki tilisi tiedot JSON-tiedostona", "Allt i ditt konto, som en JSON-fil") }) +
    cell({ action: "sign-out", lead: lead("arrow-r", ""), title: tr("Sign out", "Kirjaudu ulos", "Logga ut") }) +
    cell({ action: "delete-account", lead: lead("trash", "r"), title: tr("Delete account", "Poista tili", "Ta bort kontot"), cls: "danger" }) + "</div>" +
    '<p class="fnote">' + esc(tr("Your records are stored in your demo account on the server. Export a copy, or delete the account and everything in it.", "Tietosi tallennetaan demotilillesi palvelimelle. Voit viedä kopion tai poistaa tilin ja kaiken sen sisällön.")) + "</p></section>";
  h += '<p class="small center">' + esc(tr("Prototype · Fictional data only · FI and SV text drafted by machine", "Prototyyppi · Vain kuvitteellista tietoa · FI- ja SV-tekstit koneluonnosteltu", "Prototyp · Bara fiktiva uppgifter · FI- och SV-text maskinskriven")) + "</p>" + footer();
  return { title: t("profile"), large: t("profile"), html: h };
};

/* ---------- account actions ---------- */
/** Ends the session on the server and returns to the welcome screen. */
async function signOut() {
  try { await A.svc.logout(); } catch (error) { A.fail(error); return; }   // still signed in on the server, so say so
  exampleKey = "";
  A.resetSession();
  A.go("welcome");
  A.toast(tr("Signed out.", "Kirjauduttu ulos.", "Utloggad."));
}
A.actions["sign-out"] = function () {
  if (!isExample()) { signOut(); return; }
  A.open.action({
    title: tr("Sign out of the example account?", "Kirjaudutaanko ulos esimerkkitililtä?", "Logga ut från exempelkontot?"),
    message: tr("Its password was never shown, so you cannot sign in to it again.", "Sen salasanaa ei näytetty koskaan, joten et voi kirjautua siihen uudelleen."),
    actions: [{ label: tr("Sign out", "Kirjaudu ulos", "Logga ut"), kind: "destructive", run: signOut }]
  });
};
A.actions.export = async function () {
  try {
    await A.api.myData.saveExport();
    A.toast(tr("File downloaded.", "Tiedosto ladattu.", "Filen har laddats ned."));
  } catch (error) { A.fail(error); }
};
A.actions["delete-account"] = function () {
  const known = !!exampleKey;   // an example account created in this page session can be deleted without its password
  if (isExample() && !known) {
    A.sheet.open({
      title: tr("Delete account", "Poista tili", "Ta bort kontot"),
      html: '<p class="body">' + esc(tr("Deleting needs the account password. This example account’s password was never shown, so it cannot be deleted from here.", "Poistaminen vaatii tilin salasanan. Tämän esimerkkitilin salasanaa ei näytetty koskaan, joten sitä ei voi poistaa täältä.")) + "</p>" +
        '<button class="btn block" type="button" data-action="sheet-close">' + esc(tr("Close", "Sulje", "Stäng")) + "</button>"
    });
    return;
  }
  A.sheet.open({
    title: tr("Delete your account?", "Poistetaanko tilisi?", "Ta bort ditt konto?"),
    html: '<form class="form" data-form="delete-account" novalidate>' +
      '<p class="body">' + esc(tr("This permanently deletes your account and everything in it: profile, notes, reminders, answers and results. It cannot be undone.", "Tämä poistaa tilisi ja kaiken sen sisällön pysyvästi: profiilin, muistiinpanot, muistutukset, vastaukset ja tulokset. Toimintoa ei voi perua.")) + "</p>" +
      (known ? "" : '<div class="fgroup">' + textField({ id: "del-pass", name: "password", label: tr("Password", "Salasana", "Lösenord"), type: "password", autocomplete: "current-password", described: "e-del", extra: ' enterkeyhint="go"' }) + errP("e-del") + "</div>") +
      (known ? errP("e-del") : "") +
      '<div class="stack"><button class="btn danger block" type="submit">' + esc(tr("Delete account", "Poista tili", "Ta bort kontot")) + '</button><button class="btn ghost block" type="button" data-action="sheet-close">' + esc(t("cancel")) + "</button></div></form>",
    focus: "#del-pass"
  });
};
A.forms["delete-account"] = async function (form) {
  if (form.hasAttribute("data-pending")) return;
  const F = U(), box = F.field(form, "password"), password = box ? box.value : exampleKey;
  F.clearErrs(form);
  if (!password) { const m = tr("Enter your password.", "Kirjoita salasanasi.", "Ange ditt lösenord."); F.showErr(form, "e-del", m, box); A.announce(m); if (box) box.focus(); return; }
  F.setPending(form, true);
  try {
    await A.svc.deleteAccount(password);
  } catch (error) {
    F.setPending(form, false);
    if (error && error.code === "expired") { A.fail(error); return; }
    const message = error && (error.code === "credentials" || error.code === "invalid") ? tr("That password is not correct.", "Salasana ei ole oikein.", "Lösenordet är fel.") : A.errorText(error);
    F.showErr(form, "e-del", message, box); A.announce(message);
    if (box) box.focus();
    return;
  }
  exampleKey = "";
  A.sheet.close(true);
  A.resetSession();
  A.go("welcome");
  A.toast(tr("Your account and everything in it have been deleted.", "Tilisi ja kaikki sen sisältö on poistettu.", "Ditt konto och allt i det har tagits bort."), 6000);
};
A.resetters.push(() => { exampleKey = ""; });

/* ---------- privacy ---------- */
V.privacy = function () {
  const signedIn = stageIn();
  // The wording is in src/privacy-copy.js, so the welcome screen, this page, the notice sheet and the consent text agree.
  const cards = list => group(list.map(copyCell), "i");
  let h = lede(tr("You are in charge of your information. Here is what care4all keeps and how to change it.", "Päätät itse tiedoistasi. Tässä mitä care4all säilyttää ja miten voit muuttaa sitä.")) +
    '<section class="sec priv-id"><p class="cap">' + esc(tr("Your identity stays private", "Henkilöllisyytesi pysyy yksityisenä")) + "</p>" + cards(PRIVACY_IDENTITY) + '<p class="fnote">' + esc(tr(...PRIVACY_IDENTITY_NOTE)) + "</p></section>" +
    '<section class="sec"><p class="cap">' + esc(tr("How your information is handled", "Miten tietojasi käsitellään", "Hur dina uppgifter hanteras")) + "</p>" + cards(PRIVACY_HANDLED) + "</section>";
  if (signedIn) {
    h += '<section class="sec"><p class="cap">' + esc(tr("What care4all holds about you", "Mitä care4all säilyttää sinusta", "Vad care4all har om dig")) + '</p><div class="group i">' +
      cell({ href: "#edit", lead: lead("user", ""), title: tr("Profile", "Profiili", "Profil"), detail: tr("First name, year of birth, sex, county", "Etunimi, syntymävuosi, sukupuoli, maakunta", "Förnamn, födelseår, kön, landskap") }) +
      cell({ href: "#notes", lead: lead("note", ""), title: tr("Symptom notes", "Oiremuistiinpanot", "Symtomanteckningar"), detail: tr(S.notes.length + " saved", S.notes.length + " tallennettu", S.notes.length + " sparade") }) +
      cell({ href: "#results", lead: lead("hand", ""), title: tr("Self-check results", "Itsetarkistusten tulokset", "Resultat från självundersökningar"), detail: tr(S.checklog.length + " saved", S.checklog.length + " tallennettu", S.checklog.length + " sparade") }) +
      cell({ href: "#reminders", lead: lead("bell", ""), title: t("reminders"), detail: tr(S.reminders.length + " saved", S.reminders.length + " tallennettu", S.reminders.length + " sparade") }) +
      (V.risk ? cell({ href: "#risk", lead: lead("shield", ""), title: tr("AI questions and risk overview", "Tekoälykysymykset ja riskikatsaus"), detail: tr("Your answers to the AI’s questions, and the overview made from them", "Vastauksesi tekoälyn kysymyksiin ja niistä laadittu katsaus") }) : "") + "</div></section>";
    h += '<section class="sec"><p class="cap">' + esc(tr("Your rights", "Oikeutesi", "Dina rättigheter")) + '</p><div class="group i">' +
      cell({ action: "export", lead: lead("download", ""), title: tr("Get a copy of my data", "Hae kopio tiedoistani", "Få en kopia av mina uppgifter"), detail: tr("Access and portability", "Tiedonsaanti ja siirrettävyys", "Åtkomst och portabilitet") }) +
      cell({ href: "#edit", lead: lead("pencil", ""), title: tr("Correct my details", "Oikaise tietojani", "Rätta mina uppgifter"), detail: tr("Rectification", "Oikaiseminen", "Rättelse") }) +
      cell({ action: "delete-account", lead: lead("trash", "r"), title: tr("Delete my account", "Poista tilini", "Ta bort mitt konto"), detail: tr("Erasure. Also withdraws your consent.", "Poistaminen. Peruu myös suostumuksesi.", "Radering. Återkallar också ditt samtycke."), cls: "danger" }) +
      cell({ action: "info", data: { kind: "privacy" }, lead: lead("shield", ""), title: tr("Read the privacy notice", "Lue tietosuojaseloste", "Läs integritetspolicyn") }) + "</div>";
  } else {
    h += '<section class="sec">' + group([cell({ action: "info", data: { kind: "privacy" }, lead: lead("shield", ""), title: tr("Read the privacy notice", "Lue tietosuojaseloste", "Läs integritetspolicyn") })], "i");
  }
  h += '<p class="fnote">' + esc(tr("You can also complain to the Finnish Data Protection Ombudsman (tietosuoja.fi). Controller and contact: ", "Voit myös tehdä valituksen tietosuojavaltuutetulle (tietosuoja.fi). Rekisterinpitäjä ja yhteystiedot: ")) + "[PENDING LEGAL REVIEW].</p></section>" + footer();
  return { title: tr("Privacy", "Tietosuoja", "Integritet"), large: tr("Privacy and your data", "Tietosuoja ja tietosi", "Integritet och dina uppgifter"), html: h };
};

/* ---------- symptom notes ---------- */
/** What close monitoring adds to a note's line. The watch is kept by the server and read through monitor.js (A.monitorActive, A.monitorWhen). */
function monLine(n) {
  const m = n.monitor;
  if (!m) return "";
  if (m.status === "active") return tr("Watching closely: next update ", "Tarkka seuranta: seuraava päivitys ") + (A.monitorWhen ? A.monitorWhen(m.due) : A.fmtDate(m.due));
  if (m.status === "resolved") return tr("Watch closed: it went away", "Seuranta päättyi: oire meni ohi");
  if (m.status === "escalated") return tr("Watch ended: see a doctor", "Seuranta päättyi: hakeudu lääkäriin");
  return "";
}
function noteLine(n) {
  return [A.fmtDate(n.ts), n.when && tr("First noticed: ", "Huomasin ensimmäisen kerran: ", "Först märkt: ") + n.when, n.still && tr("Still there: ", "Onko vielä: ", "Finns kvar: ") + n.still, monLine(n)].filter(Boolean).join(" · ");
}
/** The chip on a note that is being watched closely: "Close monitoring · day 5". */
function monChip(n) {
  if (!A.monitorActive || !A.monitorActive(n)) return "";
  const days = Math.floor((Date.now() - n.monitor.start) / 864e5);
  return '<span class="mon-chip">' + ic("eye", 14) + " " + esc(tr("Close monitoring", "Tarkka seuranta") + (days >= 0 ? tr(" · day ", " · päivä ") + days : "")) + "</span>";
}
V.notes = function () {
  let h = lede(tr("Notes are for you and your appointment. They are not a diagnosis.", "Muistiinpanot ovat sinua ja vastaanottoasi varten. Ne eivät ole diagnoosi."));
  if (!S.notes.length) {
    h += '<div class="empty"><span class="ic o" aria-hidden="true">' + ic("note", 28) + '</span><h2 class="h3">' + esc(tr("No notes yet", "Ei vielä muistiinpanoja", "Inga anteckningar än")) + '</h2><p class="body">' + esc(tr("Tap “Talk about symptoms” on Home to add one.", "Napauta Etusivulla ”Puhu oireista” lisätäksesi sellaisen.", "Tryck på ”Prata om symtom” på startsidan för att lägga till en.")) + "</p></div>";
  } else {
    h += '<div class="group" id="notes-list">' + S.notes.map(n =>
      '<button class="cell tap" type="button" data-action="note-menu" data-id="' + esc(n.id) + '"><span class="cell-b"><span class="cell-t">' + esc(A.topicLabel(n.topic)) + ": " + esc(n.symptoms.join(", ")) + "</span>" +
      '<span class="cell-d">' + esc(noteLine(n)) + "</span>" + monChip(n) + (n.note ? '<span class="cell-d">“' + esc(n.note) + "”</span>" : "") + "</span>" + ic("more", 20) + "</button>").join("") + "</div>";
  }
  return {
    title: tr("My notes", "Muistiinpanoni", "Mina anteckningar"), large: tr("My notes", "Muistiinpanoni", "Mina anteckningar"), html: h,
    // The PDF for the doctor is made by doctor.js. Without it there is no button.
    trailing: S.notes.length && A.open && A.open.doctorPdf ? '<button class="nav-btn round" type="button" data-action="doc-pdf" aria-label="' + esc(tr("Save a PDF for my doctor", "Tallenna PDF lääkärilleni")) + '">' + ic("download", 22) + "</button>" : ""
  };
};

/* ---------- reminders ---------- */
function remItem(r) {
  const label = remName(r), isDue = r.status === "active" && r.due <= Date.now();
  return '<div class="cell rem' + (r.status === "done" ? " done" : "") + '" data-id="' + esc(r.id) + '">' +
    '<button class="rchk" type="button" data-action="reminder-done" data-id="' + esc(r.id) + '" aria-pressed="' + (r.status === "done") + '" aria-label="' + esc(tr("Mark " + label + " as done", "Merkitse tehdyksi: " + label, "Markera som klar: " + label)) + '"><i>' + ic("check", 14) + "</i></button>" +
    '<button class="cell-main" type="button" data-action="reminder-menu" data-id="' + esc(r.id) + '" aria-label="' + esc(tr("Options for " + label, "Vaihtoehdot: " + label, "Alternativ för " + label)) + '"><span class="cell-b"><span class="cell-t">' + esc(label) + "</span>" +
    '<span class="cell-d">' + (isDue ? '<span class="badge">' + esc(tr("Due", "Erääntyy", "Förfaller")) + "</span>" : "") + esc(r.status === "done" ? tr("Done", "Tehty", "Klar") : A.fmtDue(r.due)) + " · " + esc(A.fmtDate(r.due)) + "</span></span>" + ic("more", 20) + "</button></div>";
}
V.reminders = function () {
  const list = S.reminders.slice().sort((a, b) => (a.status === "done") - (b.status === "done") || a.due - b.due);
  let h = lede(tr("Reminders are saved in your account and can be added to your calendar. Notifications never name a cancer type or a screening.", "Muistutukset tallennetaan tilillesi, ja ne voi lisätä kalenteriin. Ilmoituksissa ei koskaan mainita syöpätyyppiä tai seulontaa."));
  if (!list.length) {
    h += '<section class="empty" aria-label="' + esc(tr("No reminders", "Ei muistutuksia", "Inga påminnelser")) + '"><span class="ic o" aria-hidden="true">' + ic("bell", 28) + '</span><h2 class="h3">' + esc(tr("No reminders yet", "Ei vielä muistutuksia", "Inga påminnelser än")) + '</h2><p class="body">' + esc(tr("Set a nudge to look out for your screening letter, a quiet monthly check-in, or a new article each month.", "Aseta muistutus odottaa seulontakutsua, hiljainen kuukausittainen tarkistus tai uusi artikkeli kerran kuussa.")) + "</p>" +
      '<button class="btn primary" type="button" data-action="reminder-new">' + esc(t("setReminder")) + "</button></section>";
  } else {
    h += '<section aria-label="' + esc(tr("Reminders list", "Muistutusluettelo", "Lista över påminnelser")) + '"><div class="group" id="rem-list">' + list.map(remItem).join("") + "</div></section>";
  }
  h += '<section class="sec"><p class="cap">' + esc(tr("Notifications", "Ilmoitukset", "Aviseringar")) + "</p>" +
    group([cell({ action: "notif-test", lead: lead("bell", ""), title: tr("On this device", "Tällä laitteella", "På den här enheten"), rawDetail: '<span id="perm-text">' + esc(A.permText()) + "</span>", value: tr("Send test", "Lähetä testi", "Skicka test"), trail: "" })]) +
    '<p class="fnote">' + esc(tr("Device notifications are an extra: they appear only while care4all is open, and never name a cancer or a screening. On iPhone they need care4all on your Home Screen (iOS 16.4 or later). Reminders are always listed here.", "Laitteen ilmoitukset ovat lisä: ne näkyvät vain, kun care4all on auki, eivätkä koskaan mainitse syöpää tai seulontaa. iPhonella ne vaativat care4allin Koti-valikossa (iOS 16.4 tai uudempi). Muistutukset näkyvät aina täällä.")) + "</p></section>" + footer();
  return {
    title: t("reminders"), large: t("reminders"), html: h,
    trailing: '<button class="nav-btn round" type="button" data-action="reminder-new" aria-label="' + esc(tr("New reminder", "Uusi muistutus", "Ny påminnelse")) + '">' + ic("plus", 22) + "</button>"
  };
};

/* ---------- the server cannot be reached ---------- */
V.unavailable = function () {
  const sentence = A.errorText({ code: S.bootError || "unavailable" });
  return {
    title: tr("No connection", "Ei yhteyttä", "Ingen anslutning"), large: tr("Can’t reach care4all", "care4alliin ei saada yhteyttä", "Det går inte att nå care4all"), trailing: langBtn(), noBack: true,
    html: '<section class="empty" aria-label="' + esc(tr("No connection", "Ei yhteyttä", "Ingen anslutning")) + '"><span class="ic o" aria-hidden="true">' + ic("info", 28) + '</span><h2 class="h3">' + esc(sentence) + '</h2><p class="body">' + esc(tr("Your information is kept on the server, so care4all needs a connection to open it. Nothing is lost. Check your connection and try again.", "Tietosi säilytetään palvelimella, joten care4all tarvitsee yhteyden niiden avaamiseen. Mitään ei ole hävinnyt. Tarkista yhteytesi ja yritä uudelleen.")) + "</p>" +
      '<button class="btn primary" type="button" data-action="retry-boot">' + esc(tr("Try again", "Yritä uudelleen", "Försök igen")) + "</button></section>"
  };
};

/* ---------- wording the other screens share ----------
   The footer line (views/screens.js) and the text a person agrees to before the AI questions or the risk overview start
   (views/interview.js, views/risk.js) are read from here when those screens are drawn, so every screen says the same, true
   thing. The sentences are in src/privacy-copy.js. */
A.privacy = {
  /** The paragraph for the end of the footer: a lock and one line. */
  footer: () => '<p class="small priv-foot">' + ic("lock", 14) + "<span>" + esc(tr(...FOOTER_LINE)) + "</span></p>",
  /** What the AI questions and the risk overview send, and what they never send, as plain text without a final full stop. */
  sent: () => tr(...SENT),
  never: () => tr(...NEVER),
  /** The whole text a person agrees to before the AI starts. */
  consent: () => tr(...CONSENT),
};
