import { A } from "./app.js";

/*
 * Installing care4all on a phone. A small button in the navigation bar of the welcome screen and of Home (A.installIcon)
 * starts it. What happens next depends on the device:
 *   - Android (Chrome, Edge, Samsung Internet) and desktop Chrome or Edge: the browser's own install prompt opens at once, so
 *     the app goes onto the phone in one tap. The browser hands the page that prompt as the "beforeinstallprompt" event, which
 *     ui.js keeps in A.deferredInstall. It only arrives on a secure (https) address, once the app is installable.
 *   - iPhone and iPad have no install prompt. Safari installs through Share, Add to Home Screen, so the steps are shown.
 *   - Android without the prompt (not https, already declined, another browser) and computers get the steps too.
 * The button is not drawn when the app already runs installed. Nothing here is stored.
 */
const esc = A.esc, tr = A.tr, ic = A.icon;

/** "ios", "android" or "desktop". An iPad asks for the desktop site, so it is told apart by its touch screen. */
export function platform() {
  const agent = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(agent)) return "android";
  return "desktop";
}
A.platform = platform;

/** The small install button for the navigation bar. Nothing when the app is already installed. */
A.installIcon = () => {
  if (A.isStandalone() || A.installed) return "";
  return '<button class="nav-btn txt install-btn" type="button" data-action="install" data-install-cell title="' +
    esc(tr("Install care4all on your phone", "Asenna care4all puhelimeesi", "Installera care4all på din telefon")) + '">' +
    ic("app-get", 20) + "<span>" + esc(tr("Get the app", "Hanki sovellus", "Hämta appen")) + "</span></button>";
};

/* ---------- the steps ---------- */
// {share}, {addsq}, {dots} and {install} become the small picture of that button, **word** becomes bold.
const GLYPHS = { share: "share-ios", addsq: "add-sq", dots: "dots-v", install: "download" };
const fmt = text => esc(text)
  .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  .replace(/\{(\w+)\}/g, (whole, key) => GLYPHS[key] ? '<span class="inst-ic" aria-hidden="true">' + ic(GLYPHS[key], 16) + "</span>" : whole);

const DEVICES = {
  ios: {
    name: ["iPhone or iPad (Safari)", "iPhone tai iPad (Safari)", "iPhone eller iPad (Safari)"],
    steps: [
      ["Open care4all in **Safari**.", "Avaa care4all **Safarilla**.", "Öppna care4all i **Safari**."],
      ["Tap the **Share** button {share} at the bottom of the screen. On an iPad it is at the top.", "Napauta näytön alareunassa olevaa **Jaa**-painiketta {share}. iPadissa se on ylhäällä.", "Tryck på knappen **Dela** {share} längst ned på skärmen. På en iPad finns den högst upp."],
      ["Scroll down and tap **Add to Home Screen** {addsq}.", "Selaa alas ja napauta **Lisää Koti-valikkoon** {addsq}.", "Rulla ned och tryck på **Lägg till på hemskärmen** {addsq}."],
      ["Tap **Add**. care4all is now on your home screen. Open it from there.", "Napauta **Lisää**. care4all on nyt aloitusnäytölläsi. Avaa se sieltä.", "Tryck på **Lägg till**. care4all finns nu på din hemskärm. Öppna den därifrån."]
    ]
  },
  android: {
    name: ["Android phone (Chrome)", "Android-puhelin (Chrome)", "Android-telefon (Chrome)"],
    steps: [
      ["Open care4all in **Chrome**.", "Avaa care4all **Chromella**.", "Öppna care4all i **Chrome**."],
      ["Tap the menu {dots} at the top right.", "Napauta valikkoa {dots} oikeassa yläkulmassa.", "Tryck på menyn {dots} uppe till höger."],
      ["Tap **Install app**. On some phones it says **Add to Home screen**.", "Napauta **Asenna sovellus**. Joissakin puhelimissa kohta on **Lisää aloitusnäyttöön**.", "Tryck på **Installera app**. På vissa telefoner står det **Lägg till på startskärmen**."],
      ["Tap **Install**. care4all appears with your other apps.", "Napauta **Asenna**. care4all ilmestyy muiden sovellustesi joukkoon.", "Tryck på **Installera**. care4all visas bland dina andra appar."]
    ]
  },
  desktop: {
    name: ["Computer (Chrome or Edge)", "Tietokone (Chrome tai Edge)", "Dator (Chrome eller Edge)"],
    steps: [
      ["Open care4all in **Chrome** or **Edge**.", "Avaa care4all **Chromella** tai **Edgellä**.", "Öppna care4all i **Chrome** eller **Edge**."],
      ["Click the install icon {install} at the right end of the address bar, then **Install**.", "Napsauta osoitepalkin oikeassa reunassa olevaa asennuskuvaketta {install} ja valitse **Asenna**.", "Klicka på installationsikonen {install} längst till höger i adressfältet och sedan på **Installera**."]
    ]
  }
};

function device(id, mine) {
  const d = DEVICES[id];
  return '<section class="inst-sec"><h3 class="h3">' + esc(tr(...d.name)) +
    (mine ? ' <span class="inst-tag">' + esc(tr("Your device", "Laitteesi", "Din enhet")) + "</span>" : "") + "</h3>" +
    '<ol class="group steps">' + d.steps.map(s => "<li><span>" + fmt(tr(...s)) + "</span></li>").join("") + "</ol></section>";
}

/** The sheet with the steps, the device that is in use first. */
function openSteps() {
  const mine = platform();
  const order = mine === "ios" ? ["ios", "android", "desktop"] : mine === "android" ? ["android", "ios", "desktop"] : ["desktop", "android", "ios"];
  const note = text => '<div class="note">' + esc(text) + "</div>";
  const parts = [];
  if (A.IN_FRAME) parts.push(note(tr("You are viewing a preview inside another page. Open care4all in its own browser tab first, then install it from there.", "Katsot esikatselua toisen sivun sisällä. Avaa care4all ensin omalla selainvälilehdellään ja asenna se sieltä.", "Du ser en förhandsvisning i en annan sida. Öppna care4all i en egen webbläsarflik först och installera den därifrån.")));
  parts.push('<p class="body">' + esc(tr(
    "Install care4all and it opens from your home screen like any other app, and it opens even without a connection. Signing in and saving still need one. There is nothing to download from an app store.",
    "Asenna care4all, niin se aukeaa aloitusnäytöltä kuin mikä tahansa sovellus ja aukeaa ilman yhteyttäkin. Kirjautuminen ja tallennus tarvitsevat silti yhteyden. Mitään ei tarvitse ladata sovelluskaupasta.",
    "Installera care4all så öppnas den från hemskärmen som vilken app som helst, även utan uppkoppling. Inloggning och sparande kräver fortfarande uppkoppling. Du behöver inte hämta något från en appbutik.")) + "</p>");
  if (mine === "desktop") parts.push(note(tr("You are on a computer. To put care4all on your phone, open this website on the phone and follow the steps for it below.", "Olet tietokoneella. Jos haluat care4allin puhelimeesi, avaa tämä verkkosivu puhelimella ja seuraa alla olevia ohjeita.", "Du använder en dator. För att få care4all i telefonen öppnar du den här webbplatsen på telefonen och följer stegen nedan.")));
  else if (!window.isSecureContext) parts.push(note(tr("This page is open on an address that does not start with https, so a phone can usually only add a shortcut and not the full install. Open the secure (https) address of care4all if you have one.", "Tämä sivu on avattu osoitteessa, joka ei ala https:llä, joten puhelin voi yleensä lisätä vain pikakuvakkeen eikä täyttä asennusta. Avaa care4allin suojattu (https) osoite, jos sinulla on sellainen.", "Den här sidan är öppnad på en adress som inte börjar med https, så en telefon kan oftast bara lägga till en genväg och inte göra en fullständig installation. Öppna care4alls säkra (https) adress om du har en.")));
  order.forEach((id, i) => parts.push(device(id, i === 0 && mine !== "desktop" || (id === "desktop" && mine === "desktop"))));
  parts.push('<button class="btn block" type="button" data-action="sheet-close">' + esc(tr("Close", "Sulje", "Stäng")) + "</button>");
  A.sheet.open({
    kicker: tr("On your phone", "Puhelimeesi", "På din telefon"),
    title: tr("Install care4all", "Asenna care4all", "Installera care4all"),
    html: parts.join("")
  });
}

/*
 * What the install button does. Where the browser has offered its install prompt (Android, and Chrome or Edge on a computer)
 * the prompt opens straight away and the app installs in one tap. Without it the steps are shown. A prompt can be used once,
 * so after it was declined the next tap shows the steps. Loaded before ui.js, which copies A.actions, so this replaces the
 * shell's earlier handler of the same name.
 */
A.actions.install = () => {
  const offer = A.deferredInstall;
  if (offer && typeof offer.prompt === "function") {
    A.deferredInstall = null;
    try { offer.prompt(); } catch (error) { openSteps(); return; }
    if (offer.userChoice && offer.userChoice.then) {
      offer.userChoice.then(choice => {
        if (choice && choice.outcome === "accepted") A.toast(tr("Installing care4all. It will appear with your other apps.", "Asennetaan care4allia. Se ilmestyy muiden sovellustesi joukkoon.", "Installerar care4all. Den visas bland dina andra appar."), 5000);
        A.refresh();
      }, () => A.refresh());
    }
    return;
  }
  openSteps();
};
