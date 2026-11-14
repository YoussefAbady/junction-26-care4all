import { eq } from "../access";
import type { Plan } from "../types";
import { c, cancerTypes, o, yesNo } from "./shared";

export const family: Plan[] = [
  {
    id: "fh_gate", module: "family", type: "choice", layout: "yesno", unsure: true,
    title: c("Has anyone in your blood family had cancer?", "Onko jollakulla verisukulaisellasi ollut syöpä?"),
    label: c("Family history of cancer", "Suvun syöpähistoria"),
    help: c("Parents, brothers, sisters, children, grandparents, aunts and uncles.", "Vanhemmat, sisarukset, lapset, isovanhemmat, tädit ja sedät."),
    why: c("Cancer in close relatives, and how old they were, is one of the strongest signals for what to check and when.", "Läheisten sukulaisten syöpä ja heidän ikänsä ovat yksi vahvimmista vihjeistä siitä, mitä ja milloin kannattaa tutkia."),
    options: yesNo(),
  },
  {
    id: "fh_list", module: "family", type: "list", max: 20, item: c("Relative", "Sukulainen"),
    show: a => eq(a, "fh_gate", "yes"),
    title: c("Tell us about each relative", "Kerro jokaisesta sukulaisesta"),
    label: c("Relatives with cancer", "Syöpää sairastaneet sukulaiset"),
    help: c("Add one entry for each person and each cancer. Guesses are fine, and so is skipping their age.", "Lisää kustakin henkilöstä ja syövästä oma merkintä. Arviot käyvät, ja iän voi jättää väliin."),
    fields: [
      {
        id: "relative", type: "choice", label: c("Who", "Kuka"),
        options: [
          o("mother", "Mother", "Äiti"), o("father", "Father", "Isä"), o("sister", "Sister", "Sisar"), o("brother", "Brother", "Veli"),
          o("daughter", "Daughter", "Tytär"), o("son", "Son", "Poika"),
          o("grand_m", "Grandparent (mother's side)", "Isovanhempi (äidin puolelta)"), o("grand_p", "Grandparent (father's side)", "Isovanhempi (isän puolelta)"),
          o("aunt_m", "Aunt or uncle (mother's side)", "Täti tai setä (äidin puolelta)"), o("aunt_p", "Aunt or uncle (father's side)", "Täti tai setä (isän puolelta)"),
          o("other", "Another blood relative", "Muu verisukulainen"),
        ],
      },
      { id: "type", type: "choice", label: c("Type of cancer", "Syövän tyyppi"), options: cancerTypes },
      { id: "age", type: "number", label: c("Age when diagnosed", "Ikä toteamishetkellä"), min: 0, max: 110, start: 50, unit: c("years", "vuotta"), optional: true },
    ],
  },
  {
    id: "fh_gene", module: "family", type: "choice", layout: "yesno", unsure: true,
    title: c("Has anyone in your family been found to carry a gene change that raises cancer risk?", "Onko jollakulla suvussasi todettu syöpäriskiä lisäävä geenimuutos?"),
    label: c("Inherited gene change in family", "Suvussa todettu geenimuutos"),
    help: c("For example BRCA1, BRCA2 or Lynch syndrome.", "Esimerkiksi BRCA1, BRCA2 tai Lynchin oireyhtymä."),
    why: c("An inherited gene change can change when and how often screening should start.", "Perinnöllinen geenimuutos voi muuttaa sitä, milloin ja kuinka usein seulonta kannattaa aloittaa."),
    options: yesNo(),
  },
  {
    id: "fh_gene_detail", module: "family", type: "text", optional: true, max: 400,
    show: a => eq(a, "fh_gene", "yes"),
    title: c("Which gene, and who has it?", "Mikä geeni ja kenellä se on?"),
    label: c("Gene change details", "Geenimuutoksen tiedot"),
    placeholder: c("For example: BRCA2, my mother and her sister", "Esimerkiksi: BRCA2, äitini ja hänen sisarensa"),
  },
  {
    id: "fh_other", module: "family", type: "multi", unsure: true,
    title: c("Have your parents, brothers, sisters or children had any of these?", "Onko vanhemmillasi, sisaruksillasi tai lapsillasi ollut jokin seuraavista?"),
    label: c("Other family conditions", "Muut sukuun liittyvät sairaudet"),
    help: c("Pick everything that applies.", "Valitse kaikki sopivat."),
    why: c("Heart disease, diabetes and bowel conditions often run in families, and they change what is worth checking.", "Sydänsairaudet, diabetes ja suolistosairaudet ovat usein sukuvikoja, ja ne vaikuttavat siihen, mitä kannattaa tutkia."),
    options: [
      o("heart", "A heart attack or stroke before age 60", "Sydäninfarkti tai aivohalvaus ennen 60 vuoden ikää"),
      o("diabetes", "Diabetes", "Diabetes"),
      o("ibd", "Crohn's disease or ulcerative colitis", "Crohnin tauti tai haavainen paksusuolitulehdus"),
      o("polyps", "Bowel polyps", "Suolipolyypit"),
      o("none", "None of these", "Ei mikään näistä", { exclusive: true }),
    ],
  },
];
