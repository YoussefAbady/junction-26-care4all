import type { ModuleId, ModuleInfo, Plan } from "../types";
import { c } from "./shared";
import { family } from "./family";
import { health } from "./health";
import { life } from "./life";
import { now } from "./now";
import { screen } from "./screen";
import { you } from "./you";

/** The questionnaire in the order a person meets it. */
export const plan: Plan[] = [...you, ...now, ...health, ...family, ...life, ...screen];

/** Chapter text. `{name}` becomes the person's name when they gave one. */
export const modules: ModuleInfo[] = [
  {
    id: "you", icon: "UserRound", minutes: 2,
    title: c("About you", "Sinusta"),
    blurb: c("The basics, so everything else fits you", "Perusasiat, jotta kaikki muu sopii sinulle"),
    intro: c("Welcome! Let's start with the basics, so that everything after this fits you.", "Tervetuloa! Aloitetaan perusasioista, jotta kaikki muu sopii juuri sinulle."),
  },
  {
    id: "now", icon: "MessageCircleHeart", minutes: 3,
    title: c("Right now", "Tämän hetken tilanne"),
    blurb: c("What brings you here, and what you have noticed", "Mikä tuo sinut tänne ja mitä olet huomannut"),
    intro: c("Thanks, {name}. Now the part clinicians value most: what is on your mind. Take your time, there are no wrong answers.", "Kiitos, {name}. Nyt tärkein osa: mikä sinua mietityttää. Rauhassa, vääriä vastauksia ei ole."),
  },
  {
    id: "health", icon: "HeartPulse", minutes: 3,
    title: c("Your health", "Terveytesi"),
    blurb: c("Conditions, medicines, allergies and operations", "Sairaudet, lääkkeet, allergiat ja leikkaukset"),
    intro: c("Next, your health background: conditions, medicines, allergies and operations. Guessing is fine. If you are not sure, say so.", "Seuraavaksi terveystaustasi: sairaudet, lääkkeet, allergiat ja leikkaukset. Arvaaminen käy, ja jos et ole varma, sano se."),
  },
  {
    id: "family", icon: "Users", minutes: 2,
    title: c("Your family", "Sukusi"),
    blurb: c("Illnesses that run in the family", "Suvussa kulkevat sairaudet"),
    intro: c("Families share more than eye colour. A few questions about illnesses that run in yours.", "Suvussa kulkee muutakin kuin silmien väri. Muutama kysymys suvussasi esiintyvistä sairauksista."),
  },
  {
    id: "life", icon: "Sprout", minutes: 3,
    title: c("Daily life", "Arki ja elintavat"),
    blurb: c("Smoking, alcohol, movement, food, sleep and mood", "Tupakointi, alkoholi, liikunta, ruoka, uni ja mieliala"),
    intro: c("You are over halfway there! Now everyday life: habits, food, sleep and mood. No judgement, only accuracy.", "Olet yli puolivälissä! Nyt arki: tavat, ruoka, uni ja mieliala. Ei tuomitsemista, vain tarkkuutta."),
  },
  {
    id: "screen", icon: "ClipboardCheck", minutes: 2,
    title: c("Check-ups", "Tarkastukset"),
    blurb: c("Screening you have had, and anything outstanding", "Tehdyt seulonnat ja keskeneräiset asiat"),
    intro: c("Last chapter, {name}. Screening and check-ups you have had, and anything still outstanding.", "Viimeinen osio, {name}. Tehdyt seulonnat ja tarkastukset sekä kaikki keskeneräinen."),
  },
];
export const moduleOrder: ModuleId[] = modules.map(module => module.id);
