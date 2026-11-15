/* Development only: renders self-check scenes to PNG files with the installed Chrome, so a loop can be judged by looking at it.

   node dev/shoot.mjs <scene id> [<scene id> ...] [options]        (run it in the frontend folder; the Vite dev server must be running)

   --port 5201          the dev server port
   --times 0,2,4,6      seconds on the loop (default: eight frames spread over the loop, at the middle of each eighth)
   --skins 1,3          skin tones (default 1)
   --themes dark,light  default light
   --out <dir>          where the PNG files go (default <system temp>/c4a-shots)
   --scale 2            device scale factor of the single frames (default 2)
   --width 375          viewport width (default 375, a phone)
   --w 335              width of the figure in px (default 335, the phone width of the guide). Use 560 for a laptop.
   --lang en|fi|sv      captions language
   --still              render the motion-off still frame instead of the loop (one PNG per skin and theme)
   --cols 4             columns of the contact sheet (default 4)
   --svg                crop frames to the picture only, without captions and dots
   --zoom x,y,w,h       also write <name>_zoom.png: that region of the picture (scene units, viewBox 360x300) at device scale 3, for inspecting details
   --nosheet            skip the contact sheet
   --controls           show the Pause and Replay buttons
   Writes <out>/<scene>_s<skin>_<theme>_t<seconds>.png for each frame and <out>/<scene>_s<skin>_<theme>_sheet.png, the whole loop in one grid.
   Prints every file it writes. Exit code 1 if a scene is not registered or the page throws. */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2), ids = [], opt = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    if (["still", "svg", "nosheet", "controls"].includes(key)) opt[key] = true; else opt[key] = args[++i];
  } else ids.push(a);
}
if (!ids.length) { console.error("usage: node dev/shoot.mjs <scene id> ... [--port 5201] [--times 0,2,4] [--skins 1,3] [--themes dark,light] [--out dir] [--still] [--w 335]"); process.exit(2); }
const port = opt.port || "5201", out = opt.out || join(tmpdir(), "c4a-shots"), scale = +(opt.scale || 2), vw = +(opt.width || 375), figW = +(opt.w || 335);
const skins = (opt.skins || "1").split(","), themes = (opt.themes || "light").split(","), cols = +(opt.cols || 4);
const lang = opt.lang || "en";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
let failed = false;
const files = [];
try {
  for (const id of ids) for (const skin of skins) for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: scale, reducedMotion: "no-preference" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(String(e)));
    page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    const qs = new URLSearchParams({ scene: id, skin, dark: theme === "dark" ? "1" : "0", motion: opt.still ? "0" : "1", lang, w: String(figW), controls: opt.controls ? "1" : "0" });
    if (!opt.still) qs.set("t", "0");
    await page.goto("http://localhost:" + port + "/dev/stage.html?" + qs, { waitUntil: "load" });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
    const fig = page.locator(".dv .st-fig").first();
    if (!(await fig.count())) { console.error("scene not registered or empty: " + id); failed = true; await ctx.close(); continue; }
    const dur = +(await fig.getAttribute("data-dur"));
    const target = opt.svg ? fig.locator("svg.st-svg") : fig;
    const base = id + "_s" + skin + "_" + theme;
    const frames = [];
    const zoomShot = async name => {
      if (!opt.zoom) return;
      const [zx, zy, zw, zh] = opt.zoom.split(",").map(Number);
      const bb = await fig.locator("svg.st-svg").boundingBox(), k = bb.width / 360;
      const f = join(out, name + "_zoom.png");
      await page.screenshot({ path: f, clip: { x: bb.x + zx * k, y: bb.y + zy * k, width: zw * k, height: zh * k }, animations: "allow" });
      files.push(f);
    };
    if (opt.still) {
      const f = join(out, base + "_still.png");
      await target.screenshot({ path: f, animations: "allow" });
      files.push(f);
      await zoomShot(base + "_still");
    } else {
      const times = opt.times ? opt.times.split(",").map(Number) : Array.from({ length: 8 }, (_, i) => +((i + .5) * dur / 8).toFixed(2));
      for (const t of times) {
        await page.evaluate(([i, s]) => window.__seek(i, s), [id, t]);
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const f = join(out, base + "_t" + String(t).replace(".", "p") + ".png");
        await target.screenshot({ path: f, animations: "allow" });
        files.push(f);
        await zoomShot(base + "_t" + String(t).replace(".", "p"));
        frames.push({ t, buf: await target.screenshot({ animations: "allow", scale: "css" }) });
      }
      if (!opt.nosheet && frames.length) {
        const tile = figW, gap = 10, c = Math.min(cols, frames.length), bg = theme === "dark" ? "#0E1217" : "#F2F1F1", ink = theme === "dark" ? "#F2F1F1" : "#242C38";
        const sheet = await ctx.newPage();
        await sheet.setViewportSize({ width: c * (tile + gap) + gap, height: 400 });
        const cells = frames.map(fr => '<div style="width:' + tile + 'px"><div style="font:700 12px system-ui;color:' + ink + ';margin:0 0 3px">' + id + "  t = " + fr.t + ' s</div><img style="width:' + tile + 'px;display:block" src="data:image/png;base64,' + fr.buf.toString("base64") + '"></div>').join("");
        await sheet.setContent('<body style="margin:0;padding:' + gap + 'px;background:' + bg + '"><div style="display:grid;grid-template-columns:repeat(' + c + ',' + tile + 'px);gap:' + gap + 'px">' + cells + "</div></body>");
        const f = join(out, base + "_sheet.png");
        await sheet.screenshot({ path: f, fullPage: true });
        files.push(f);
        await sheet.close();
      }
    }
    if (errors.length) { const uniq = [...new Set(errors)]; console.error("page errors in " + id + " (" + errors.length + "): " + uniq.slice(0, 6).join(" | ").slice(0, 900)); failed = true; }
    await ctx.close();
  }
} finally {
  await browser.close();
}
files.forEach(f => console.log(f));
writeFileSync(join(out, "_last.txt"), files.join("\n"));
process.exit(failed ? 1 : 0);
