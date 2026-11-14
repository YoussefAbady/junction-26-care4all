"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { bodyRegions } from "@/lib/intake";
import { tr, type Language } from "@/lib/survey";

type Box = [x: number, y: number, w: number, h: number];
/** Hot spots on a 200 by 400 figure. Left and right are the person's own, so they swap between front and back. */
const front: Record<string, Box> = {
  head: [72, 6, 56, 62], neck: [86, 66, 28, 18],
  shoulder_r: [50, 84, 32, 24], shoulder_l: [118, 84, 32, 24],
  chest_r: [62, 108, 38, 40], chest_l: [100, 108, 38, 40],
  abdomen_upper: [64, 148, 72, 30], abdomen_lower: [64, 178, 72, 34], groin: [78, 212, 44, 26],
  arm_r: [26, 108, 26, 96], arm_l: [148, 108, 26, 96],
  hip_r: [66, 238, 33, 68], hip_l: [101, 238, 33, 68],
  leg_r: [66, 306, 32, 86], leg_l: [102, 306, 32, 86],
};
const back: Record<string, Box> = {
  head: [72, 6, 56, 62], neck: [86, 66, 28, 18],
  shoulder_l: [50, 84, 32, 24], shoulder_r: [118, 84, 32, 24],
  back_upper: [64, 108, 72, 58], back_lower: [64, 166, 72, 46], buttocks: [64, 212, 72, 36],
  arm_l: [26, 108, 26, 96], arm_r: [148, 108, 26, 96],
  hip_l: [66, 248, 33, 58], hip_r: [101, 248, 33, 58],
  leg_l: [66, 306, 32, 86], leg_r: [102, 306, 32, 86],
};

function Figure() {
  return (
    <svg className="bodymap__figure" viewBox="0 0 200 400" aria-hidden="true" focusable="false">
      <g fill="var(--body)" stroke="var(--body-line)" strokeWidth="1.5">
        <ellipse cx="100" cy="38" rx="25" ry="30" />
        <rect x="89" y="64" width="22" height="24" rx="8" />
        <path d="M60 94q40-16 80 0l-5 56q-3 32 0 66H65q3-34 0-66z" />
        <rect x="28" y="96" width="24" height="112" rx="12" />
        <rect x="148" y="96" width="24" height="112" rx="12" />
        <rect x="66" y="208" width="33" height="186" rx="15" />
        <rect x="101" y="208" width="33" height="186" rx="15" />
      </g>
    </svg>
  );
}

export function BodyMap({ value, onChange, lang, labelledBy }: { value: string[]; onChange: (next: string[]) => void; lang: Language; labelledBy: string }) {
  const [view, setView] = useState<"front" | "back">("front");
  const t = (en: string, fi: string) => lang === "fi" ? fi : en;
  const spots = view === "front" ? front : back;
  const label = (id: string) => tr(lang, bodyRegions.find(region => region.id === id)?.label ?? [id, id]);
  const toggle = (id: string) => {
    if (id === "all") return onChange(value.includes("all") ? [] : ["all"]);
    const rest = value.filter(item => item !== "all");
    onChange(rest.includes(id) ? rest.filter(item => item !== id) : [...rest, id]);
  };
  return (
    <div className="bodymap" role="group" aria-labelledby={labelledBy}>
      <div className="seg seg--wide" role="group" aria-label={t("Body view", "Kehon puoli")}>
        <button type="button" aria-pressed={view === "front"} onClick={() => setView("front")}>{t("Front", "Etupuoli")}</button>
        <button type="button" aria-pressed={view === "back"} onClick={() => setView("back")}>{t("Back", "Takapuoli")}</button>
      </div>
      <div className="bodymap__stage">
        <Figure />
        {Object.entries(spots).map(([id, [x, y, w, h]]) => (
          <button
            key={view + id} type="button" className="bodymap__spot" aria-pressed={value.includes(id)} aria-label={label(id)} title={label(id)}
            style={{ left: `${x / 2}%`, top: `${y / 4}%`, width: `${w / 2}%`, height: `${h / 4}%` }} onClick={() => toggle(id)}
          />
        ))}
        <span className="bodymap__side bodymap__side--l" aria-hidden="true">{view === "front" ? t("Your right", "Oikea") : t("Your left", "Vasen")}</span>
        <span className="bodymap__side bodymap__side--r" aria-hidden="true">{view === "front" ? t("Your left", "Vasen") : t("Your right", "Oikea")}</span>
      </div>
      <div className="bodymap__picked">
        <label className="check">
          <input type="checkbox" checked={value.includes("all")} onChange={() => toggle("all")} />
          <span className="check__box" aria-hidden="true" />
          <span>{label("all")}</span>
        </label>
        <p className="hint" aria-live="polite">
          {value.length ? t("Selected:", "Valittu:") : t("Tap the figure to point to a place. You can pick several.", "Napauta hahmoa osoittaaksesi kohdan. Voit valita useita.")}
        </p>
        <ul className="chips">
          {value.filter(id => id !== "all").map(id => (
            <li key={id}><button type="button" className="chip" onClick={() => toggle(id)} aria-label={t("Remove ", "Poista ") + label(id)}>{label(id)}<X size={14} aria-hidden="true" /></button></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
