/* Development only: kit sheets, registered as "dev-*" scenes so shoot.mjs and stage.html can render them like any scene. */
import { A } from "../src/app.js";

const K = () => A.kit;
function sheet(id, title, draw, o = {}) {
  A.stage.define(id, { dur: 4, viewBox: o.viewBox || [360, 300], phases: [{ at: 0, cap: [title, title, title] }], desc: [title, title, title], draw });
}
sheet("dev-torso", "Torso: female, male, neutral, lying", c => {
  const k = K();
  return k.head({ x: 70, y: 38, s: .55, hair: "long", layer: "back" }) + k.torso({ form: "female", x: 70, y: 70, s: .55, len: 150 }) + k.head({ x: 70, y: 38, s: .55, hair: "long", layer: "front" }) +
    k.torso({ form: "male", x: 180, y: 70, s: .55, len: 150 }) + k.head({ x: 180, y: 38, s: .55, hair: "short" }) +
    k.torso({ form: "neutral", x: 290, y: 70, s: .55, len: 150 }) + k.head({ x: 290, y: 38, s: .55, hair: "bun", yaw: .5 }) +
    k.torso({ form: "female", view: "lying", x: 100, y: 205, s: .7, len: 100 }) + k.torso({ form: "female", view: "side", x: 270, y: 180, s: .6, len: 120 }) + k.head({ view: "side", x: 270, y: 150, s: .6 });
});
sheet("dev-hands", "Hands: flat3, open, palm, point, pinch, grip, cup", c => {
  const k = K();
  const poses = ["flat3", "open", "palm", "point", "pinch", "grip", "cup"];
  return poses.map((p, i) => k.hand({ pose: p, x: 50 + (i % 4) * 85, y: 120 + Math.floor(i / 4) * 130, s: 1.6 })).join("");
});
sheet("dev-arms", "Arms: poses", c => {
  const k = K();
  return k.torso({ form: "female", x: 100, y: 90, s: .5, len: 150 }) + k.arm({ side: "l", pose: "hip", hand: "flat3", x: 100, y: 90, s: .5 }) + k.arm({ side: "r", pose: "behindHead", hand: "open", x: 100, y: 90, s: .5 }) +
    k.torso({ form: "male", x: 260, y: 90, s: .5, len: 150 }) + k.arm({ side: "l", pose: "out", hand: "palm", x: 260, y: 90, s: .5, thick: 1.1 }) + k.arm({ side: "r", wrist: [30, 70], bend: -1, hand: "point", x: 260, y: 90, s: .5, thick: 1.1 }) +
    k.foot({ x: 80, y: 280, s: 1.1 }) + k.foot({ view: "sole", x: 160, y: 280, s: 1.1 }) + k.foot({ view: "side", x: 220, y: 270, s: 1.1 });
});

sheet("dev-props", "Props", c => {
  const k = K();
  return k.room({ kind: "bath" }) + k.showerHead({ x: 70, y: 40, s: 1, c }) + k.pillow({ x: 200, y: 50, w: 120, h: 70 }) +
    k.wallMirror({ x: 250, y: 120, w: 80, h: 150, content: k.torso({ form: "female", x: 40, y: 110, s: .45, len: 120 }) }) +
    k.handMirror({ x: 40, y: 230, s: .9 }) + k.comb({ x: 120, y: 190 }) + k.ruler({ x: 100, y: 235, cm: 5 }) + k.eraser({ x: 180, y: 160, s: .6, r: 30 }) +
    k.phone({ x: 190, y: 235, s: .5 }) + k.calendar({ x: 20, y: 150, w: 70, h: 60, month: "MAR", marks: [3, 17] }) + k.clock({ x: 160, y: 120, r: 16 });
});
sheet("dev-over", "Overlays", c => {
  const k = K();
  return k.skinPatch({ x: 10, y: 10, w: 340, h: 280 }) + k.mole({ x: 70, y: 70, r: 20, seed: 4 }) + k.mole({ x: 150, y: 70, r: 20, seed: 5, irr: .9, ragged: .4, tone: "multi" }) +
    k.trail(c, "M200 120 a30 30 0 1 1 0 .1", 0.5, 3.5, { repeat: 2 }) + k.callout("Callout text\nsecond line", [250, 60], [200, 120]) + k.depthGauge(20, 180, 2) +
    k.lens(260, 220, 42, k.mole({ r: 36, seed: 9, irr: .5, tone: "multi" }), { target: [150, 70], label: "Zoom" }) + k.section({ x: 90, y: 170, w: 110, h: 100, depth: .4, marks: true }) + k.scaleBar(100, 280, 60, "2.5 cm") + k.badge(2, 330, 25) + k.arrow(120, 130, 170, 150);
});
sheet("dev-testis", "Testis", c => K().room({}) + K().testis({ x: 120, y: 160, s: 1.5 }) + K().foot({ x: 280, y: 240, s: 1.2 }));
