import { eq, femaleBody, has, maleBody, olderThan, oneOf } from "../access";
import type { Plan } from "../types";
import { c, o, yesNo } from "./shared";

export const screen: Plan[] = [
  {
    id: "scr_result", module: "screen", type: "form", unsure: true,
    show: a => has(a, "reason", "letter"),
    title: c("Tell us about the screening letter or result", "Kerro seulontakirjeestä tai tuloksesta"),
    label: c("Screening letter or result", "Seulontakirje tai tulos"),
    help: c("You mentioned a letter or result you want to understand. Keep the original handy for your appointment.", "Mainitsit kirjeen tai tuloksen, jonka haluat ymmärtää. Pidä alkuperäinen mukana vastaanotolla."),
    why: c("Knowing which test it was and what it said lets a clinician explain it properly.", "Kun tiedetään, mikä tutkimus oli ja mitä se kertoi, lääkäri voi selittää sen oikein."),
    fields: [
      { id: "test", type: "choice", label: c("Which screening", "Mikä seulonta"), options: [o("breast", "Breast", "Rinta"), o("cervical", "Cervical", "Kohdunkaula"), o("colorectal", "Bowel", "Suolisto"), o("other", "Another test", "Jokin muu tutkimus")] },
      { id: "outcome", type: "choice", label: c("What it says", "Mitä siinä lukee"), options: [o("normal", "Normal, nothing found", "Normaali, ei löydöksiä"), o("more", "More tests are needed", "Lisätutkimuksia tarvitaan"), o("unclear", "I don't understand it", "En ymmärrä sitä"), o("waiting", "I am still waiting for the result", "Odotan vielä tulosta")] },
      { id: "when", type: "choice", label: c("When", "Milloin"), options: [o("m3", "In the last 3 months", "Viimeisen 3 kuukauden aikana"), o("m12", "3 to 12 months ago", "3–12 kuukautta sitten"), o("y1", "More than a year ago", "Yli vuosi sitten")] },
    ],
  },
  {
    id: "scr_cervix", module: "screen", type: "choice", layout: "list", unsure: true,
    show: a => femaleBody(a) && olderThan(a, 20),
    title: c("When did you last have a cervical screening test?", "Milloin sinulta otettiin viimeksi kohdunkaulan seulontanäyte?"),
    label: c("Last cervical screening", "Viimeisin kohdunkaulan seulonta"),
    help: c("An HPV test or a Pap smear.", "HPV-testi tai irtosolukoe."),
    why: c("Regular cervical screening finds changes long before they become a problem.", "Säännöllinen seulonta löytää muutokset ajoissa, ennen kuin ne aiheuttavat ongelmia."),
    options: [
      o("never", "Never", "En koskaan"), o("y5", "Within the last 5 years", "Viimeisen 5 vuoden aikana"), o("y10", "5 to 10 years ago", "5–10 vuotta sitten"),
      o("y10p", "More than 10 years ago", "Yli 10 vuotta sitten"), o("removed", "I no longer have a cervix", "Minulla ei ole enää kohdunkaulaa"),
    ],
  },
  {
    id: "scr_mammo", module: "screen", type: "choice", layout: "list", unsure: true,
    show: a => femaleBody(a) && olderThan(a, 35),
    title: c("When did you last have a mammogram?", "Milloin sinulle tehtiin viimeksi mammografia?"),
    label: c("Last mammogram", "Viimeisin mammografia"),
    help: c("A breast X-ray.", "Rintojen röntgenkuvaus."),
    options: [o("never", "Never", "En koskaan"), o("y2", "Within the last 2 years", "Viimeisen 2 vuoden aikana"), o("y5", "2 to 5 years ago", "2–5 vuotta sitten"), o("y5p", "More than 5 years ago", "Yli 5 vuotta sitten")],
  },
  {
    id: "scr_psa", module: "screen", type: "choice", layout: "list", unsure: true,
    show: a => maleBody(a) && olderThan(a, 40),
    title: c("Have you ever had a PSA blood test?", "Onko sinulta koskaan otettu PSA-verikoe?"),
    label: c("PSA test", "PSA-koe"),
    help: c("It is sometimes used to check the prostate.", "Sitä käytetään joskus eturauhasen tutkimiseen."),
    options: [o("never", "Never", "En koskaan"), o("y2", "Within the last 2 years", "Viimeisen 2 vuoden aikana"), o("y2p", "More than 2 years ago", "Yli 2 vuotta sitten")],
  },
  {
    id: "scr_fit", module: "screen", type: "choice", layout: "list", unsure: true,
    show: a => olderThan(a, 40),
    title: c("Have you ever done a home stool test for hidden blood?", "Oletko koskaan tehnyt kotona otettavan ulostenäytteen piilevän veren tutkimiseksi?"),
    label: c("Stool test (FIT)", "Ulostenäyte (FIT)"),
    help: c("Often called a FIT test. It arrives in the post.", "Usein FIT-testiksi kutsuttu. Se tulee postitse."),
    why: c("A stool test can find signs of bowel problems before there are any symptoms.", "Ulostenäyte voi paljastaa suolisto-ongelman merkkejä ennen kuin oireita ilmenee."),
    options: [o("never", "Never", "En koskaan"), o("y2", "Within the last 2 years", "Viimeisen 2 vuoden aikana"), o("y2p", "More than 2 years ago", "Yli 2 vuotta sitten")],
  },
  {
    id: "scr_colon", module: "screen", type: "choice", layout: "list", unsure: true,
    show: a => olderThan(a, 40),
    title: c("Have you ever had a colonoscopy or sigmoidoscopy?", "Onko sinulle koskaan tehty paksusuolen tähystys tai sigmoidoskopia?"),
    label: c("Bowel camera test", "Suolen tähystys"),
    help: c("A camera test of the bowel.", "Suolen tähystystutkimus kameralla."),
    options: [o("never", "Never", "En koskaan"), o("y5", "Within the last 5 years", "Viimeisen 5 vuoden aikana"), o("y10", "5 to 10 years ago", "5–10 vuotta sitten"), o("y10p", "More than 10 years ago", "Yli 10 vuotta sitten")],
  },
  {
    id: "scr_colon_result", module: "screen", type: "choice", layout: "list", unsure: true,
    show: a => oneOf(a, "scr_colon", ["y5", "y10", "y10p"]),
    title: c("What did it find?", "Mitä siinä löytyi?"),
    label: c("Bowel camera test result", "Suolen tähystyksen tulos"),
    options: [o("clear", "Nothing, all clear", "Ei mitään, kaikki kunnossa"), o("polyps", "Polyps were found and removed", "Polyyppeja löytyi ja ne poistettiin"), o("other", "Something else", "Jotain muuta")],
  },
  {
    id: "scr_pending", module: "screen", type: "choice", layout: "yesno", unsure: true,
    title: c("Is there a test, scan or referral you were told to have but haven't yet?", "Onko sinulle suositeltu tutkimusta, kuvausta tai lähetettä, jota et ole vielä tehnyt?"),
    label: c("Outstanding follow-up", "Keskeneräinen jatkotutkimus"),
    why: c("Unfinished follow-up is easy to lose track of. Writing it down helps make sure it does not get missed.", "Keskeneräiset jatkotutkimukset unohtuvat helposti. Muistiin kirjaaminen auttaa varmistamaan, ettei mikään jää väliin."),
    options: yesNo(),
  },
  {
    id: "scr_pending_detail", module: "screen", type: "text", optional: true, max: 400,
    show: a => eq(a, "scr_pending", "yes"),
    title: c("What is it, roughly?", "Mikä se on suunnilleen?"),
    label: c("Outstanding follow-up details", "Keskeneräisen jatkotutkimuksen tiedot"),
    placeholder: c("For example: a scan my GP suggested in the spring", "Esimerkiksi: kevällä lääkärin suosittelema kuvaus"),
  },
  {
    id: "anything_else", module: "screen", type: "text", optional: true, max: 1000,
    title: c("Last one! Anything else you would like your clinician to know?", "Viimeinen! Haluatko kertoa hoitajalle tai lääkärille vielä jotain?"),
    label: c("Anything else", "Muuta"),
    help: c("Worries, questions, things we forgot to ask. Anything goes.", "Huolia, kysymyksiä, asioita, joita emme osanneet kysyä. Kaikki käy."),
    placeholder: c("Write as much or as little as you like", "Kirjoita niin paljon tai vähän kuin haluat"),
  },
];
