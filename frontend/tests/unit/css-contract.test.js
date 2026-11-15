import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * The other work packages draw their screens with classes that design v2 defines (.rtag, .rk-*, .mon-*, .me-card and the
 * rest), and src/styles/app.css is the only place those are written. This test reads the design's stylesheet and fails when
 * a class it defines is missing from the PWA's, so a class cannot go missing without somebody seeing it.
 */
const here = path => new URL("../../" + path, import.meta.url);
const html = readFileSync(here("design/care4all.artifact.html"), "utf8");
// The design's stylesheet is the <style> block just before the markup of the device.
const designCss = (() => {
  const at = html.indexOf('<div class="stage">');
  const start = html.lastIndexOf("<style>", at), end = html.indexOf("</style>", start);
  assert.ok(at > 0 && start > 0 && end > start, "the design's stylesheet was not found");
  return html.slice(start + "<style>".length, end);
})();
const styleDir = "src/styles/";
const pwaCss = readdirSync(here(styleDir)).filter(name => name.endsWith(".css")).map(name => readFileSync(here(styleDir + name), "utf8")).join("\n");

const withoutComments = css => css.replace(/\/\*[\s\S]*?\*\//g, "");
/** Every class a stylesheet's selectors mention. Declarations are cut out first, so values like .5px are not read as classes. */
const classesOf = css => new Set([...withoutComments(css).replace(/\{[^{}]*\}/g, "{}").matchAll(/\.(-?[_a-zA-Z][-\w]*)/g)].map(match => match[1]));

// The design draws a status bar and a home bar inside its phone frame. A real phone has its own, so they are left out on purpose.
const DRAWN_PHONE = ["statusbar", "homebar", "island", "sb-r"];

test("every class design v2 styles is styled in the PWA, except the drawn phone chrome", () => {
  const design = classesOf(designCss), pwa = classesOf(pwaCss);
  assert.ok(design.size > 400, "the design's classes were not read: " + design.size);
  const missing = [...design].filter(name => !pwa.has(name) && !DRAWN_PHONE.includes(name));
  assert.deepEqual(missing, []);
});

test("the drawn phone chrome was not ported", () => {
  const pwa = classesOf(pwaCss);
  for (const name of DRAWN_PHONE) assert.ok(!pwa.has(name), "." + name + " is styled, but the PWA draws no status bar or home bar");
  assert.doesNotMatch(withoutComments(pwaCss), /--sat:\s*54px/);
});

test("the classes the risk and monitoring screens are built on are there", () => {
  const pwa = classesOf(pwaCss);
  const risk = ["rtag", "rk-grid", "rk-item", "rk-h", "rk-t", "rk-b", "rk-why", "rk-f", "rk-fb", "rk-srcs", "rk-src", "rk-n", "rk-ov", "rk-big", "rk-how", "rk-note", "rk-gate", "rk-ic", "rk-card", "rk-wrap", "rk-strip", "rk-d", "rk-under", "rk-legend"];
  const monitor = ["mon-ctx", "mon-steps", "mon-chip", "urgent", "mon"];
  const profile = ["me-card", "me-top", "me-id", "me-edit", "me-stats", "priv-row", "priv-foot", "stat-card", "sc-n", "sc-t", "sc-i"];
  for (const name of [...risk, ...monitor, ...profile]) assert.ok(pwa.has(name), "." + name + " is not styled");
});

test("the device's own insets are variables, and the wide-window frame does not receive them", () => {
  const css = withoutComments(pwaCss);
  for (const [name, inset] of [["sat", "top"], ["sab", "bottom"], ["sal", "left"], ["sar", "right"]]) {
    assert.match(css, new RegExp("--" + name + ":\\s*env\\(safe-area-inset-" + inset + ", 0px\\)"), "--" + name + " is not the " + inset + " inset");
  }
  // The root no longer pads itself, and the strip that hid content under the notch is gone: each edge part adds its own inset.
  assert.doesNotMatch(css, /:root\s*\{[^}]*padding-(top|bottom)\s*:\s*env\(/);
  assert.doesNotMatch(css, /body::before/);
  const wide = css.slice(css.indexOf("@media (min-width: 600px) and (min-height: 660px) {"));
  assert.match(wide.slice(0, wide.indexOf("\n}")), /\.device \{ --sat: 0px; --sab: 0px; --sal: 0px; --sar: 0px;/);
  assert.match(css, /\.device\[data-tabs="on"\] \{ --tabs-h: calc\(68px \+ var\(--sab\)\); \}/);
});

test("the controls opt out of text selection, and the text people may want to copy does not", () => {
  const css = withoutComments(pwaCss);
  const rule = css.split("\n").find(line => /user-select: none/.test(line) && /\.tab\b/.test(line));
  assert.ok(rule, "the press-state rule is missing");
  assert.match(rule, /a\.cell, button\.cell/);
  assert.doesNotMatch(rule.replace(/a\.cell|button\.cell/g, ""), /\.cell\b/, "a plain .cell would make the static rows of a list unselectable");
});
