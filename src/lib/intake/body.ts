import type { Copy } from "../survey";

/** Regions people can point to on the body map. Left and right are the person's own. */
export const bodyRegions: { id: string; label: Copy }[] = [
  { id: "head", label: ["Head or face", "Pää tai kasvot"] },
  { id: "neck", label: ["Neck or throat", "Kaula tai kurkku"] },
  { id: "shoulder_l", label: ["Left shoulder", "Vasen olkapää"] },
  { id: "shoulder_r", label: ["Right shoulder", "Oikea olkapää"] },
  { id: "chest_l", label: ["Chest, left", "Rinta, vasen puoli"] },
  { id: "chest_r", label: ["Chest, right", "Rinta, oikea puoli"] },
  { id: "abdomen_upper", label: ["Upper tummy", "Ylävatsa"] },
  { id: "abdomen_lower", label: ["Lower tummy", "Alavatsa"] },
  { id: "groin", label: ["Groin or genitals", "Nivus tai sukuelimet"] },
  { id: "arm_l", label: ["Left arm or hand", "Vasen käsivarsi tai käsi"] },
  { id: "arm_r", label: ["Right arm or hand", "Oikea käsivarsi tai käsi"] },
  { id: "hip_l", label: ["Left hip or thigh", "Vasen lonkka tai reisi"] },
  { id: "hip_r", label: ["Right hip or thigh", "Oikea lonkka tai reisi"] },
  { id: "leg_l", label: ["Left lower leg or foot", "Vasen sääri tai jalkaterä"] },
  { id: "leg_r", label: ["Right lower leg or foot", "Oikea sääri tai jalkaterä"] },
  { id: "back_upper", label: ["Upper back", "Yläselkä"] },
  { id: "back_lower", label: ["Lower back", "Alaselkä"] },
  { id: "buttocks", label: ["Buttocks or tailbone", "Pakarat tai häntäluu"] },
  { id: "all", label: ["All over, not in one place", "Kaikkialla, ei yhdessä kohdassa"] },
];
export const bodyIds: readonly string[] = bodyRegions.map(region => region.id);
