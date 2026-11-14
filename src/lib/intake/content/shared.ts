import type { Copy } from "../../survey";
import type { Opt } from "../types";

export const c = (en: string, fi: string): Copy => [en, fi];
export const o = (id: string, en: string, fi: string, extra: Partial<Omit<Opt, "id" | "label">> = {}): Opt => ({ id, label: [en, fi], ...extra });
export const yesNo = (): Opt[] => [o("yes", "Yes", "Kyllä"), o("no", "No", "Ei")];

export const cancerTypes: Opt[] = [
  o("breast", "Breast", "Rinta"),
  o("cervical", "Cervix", "Kohdunkaula"),
  o("uterine", "Womb (uterus)", "Kohtu"),
  o("ovarian", "Ovary", "Munasarja"),
  o("colorectal", "Bowel (colon or rectum)", "Suolisto (paksusuoli tai peräsuoli)"),
  o("prostate", "Prostate", "Eturauhanen"),
  o("lung", "Lung", "Keuhko"),
  o("stomach", "Stomach or food pipe", "Mahalaukku tai ruokatorvi"),
  o("pancreas", "Pancreas or liver", "Haima tai maksa"),
  o("skin", "Skin (including melanoma)", "Iho (myös melanooma)"),
  o("blood", "Blood or lymph (leukaemia, lymphoma)", "Veri tai imukudos (leukemia, lymfooma)"),
  o("kidney", "Kidney or bladder", "Munuainen tai virtsarakko"),
  o("thyroid", "Thyroid", "Kilpirauhanen"),
  o("other", "Other or not sure", "Muu tai en ole varma"),
];

export const frequencies: Opt[] = [
  o("daily", "Once a day", "Kerran päivässä"),
  o("twice", "Twice a day or more", "Kaksi kertaa päivässä tai useammin"),
  o("weekly", "Weekly", "Viikoittain"),
  o("asneeded", "Only when needed", "Vain tarvittaessa"),
  o("other", "Something else", "Jokin muu"),
];

/** The four standard answers used by the PHQ-2 and GAD-2 mood check-ins. */
export const bothered: Opt[] = [
  o("none", "Not at all", "Ei lainkaan"),
  o("some", "On several days", "Useana päivänä"),
  o("half", "On more than half the days", "Yli puolet päivistä"),
  o("most", "Nearly every day", "Lähes joka päivä"),
];
