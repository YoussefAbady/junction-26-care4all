/* Development only: renders one or all self-check scenes with no backend and no account.
   It is not part of the production build (nothing in index.html imports it).

   /dev/stage.html?scene=s-br-circles&t=4&skin=3&dark=1&motion=1&lang=fi&w=335
     scene   one id, a comma list, or "all" (every scene registered with A.stage.define). "gallery" adds the kit sheets.
     t       seconds: the stage is paused there (A.stage.seek). Without t the loop plays.
     skin    1, 2 or 3          dark  1 or 0          motion  0 renders the still frame
     lang    en, fi or sv       w     width in px of the figure (default 335, the phone width of the guide)
     controls 1 shows the Pause and Replay buttons      topic  breast, skin or testicular, for the topic colour (default from the id)
   window.A is the registry, window.__seek(sceneId, t) pauses one stage at t, window.__ready is true once the page is drawn. */
import "../src/styles/fonts.css";
import "../src/styles/app.css";
import "../src/styles/selfcheck.css";
import { A } from "../src/app.js";
import "../src/state/index.js";
import "../src/core.js";
import "../src/art/part1.js";
import "../src/art/stage.js";
import "../src/art/kit.js";
import "../src/art/scenes-breast.js";
import "../src/art/scenes-skin.js";
import "../src/art/scenes-testicular.js";
import "./gallery.js";

const q = new URLSearchParams(location.search);
const root = document.getElementById("root");
const html = document.documentElement;
window.A = A;
window.__ready = false;

const dark = q.get("dark") === "1";
html.setAttribute("data-theme", dark ? "dark" : "light");
html.setAttribute("data-skin", q.get("skin") || "1");
const motion = q.get("motion") !== "0";
html.setAttribute("data-motion", motion ? "on" : "off");
A.S.prefs.motion = motion;
A.S.prefs.lang = ["fi", "sv"].includes(q.get("lang")) ? q.get("lang") : "en";
html.lang = A.S.prefs.lang;

const topicOf = id => q.get("topic") || (/^s-br|^pos-breast/.test(id) ? "breast" : /^s-sk|^pos-skin/.test(id) ? "skin" : /^s-te|^pos-testicular/.test(id) ? "testicular" : "breast");
let ids = (q.get("scene") || "all").split(",").filter(Boolean);
if (ids.includes("all")) ids = A.stage.ids().filter(id => !id.startsWith("dev-"));
if (ids.includes("gallery")) ids = ids.filter(id => id !== "gallery").concat(A.stage.ids().filter(id => id.startsWith("dev-")));
const width = +(q.get("w") || 335);
const controls = q.get("controls") === "1";

root.innerHTML = ids.map(id => A.stage.has(id)
  ? '<section class="dv" data-id="' + id + '" data-t="' + topicOf(id) + '" style="width:' + width + 'px"><h3>' + id + '</h3>' + A.stage.render(id, id, { demo: true, controls }) + "</section>"
  : '<section class="dv"><h3>' + id + " (not registered)</h3></section>").join("");

window.__seek = (id, t) => {
  const fig = root.querySelector('.dv[data-id="' + id + '"] .st-fig');
  if (fig) A.stage.seek(fig, t);
};
const t = q.get("t");
if (t != null && t !== "") ids.forEach(id => window.__seek(id, +t));

(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; })));
