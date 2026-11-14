// Regenerates the app icons in public/icons from one vector mark: an orange ribbon on Ink.
// Colours come from the Integrant palette used by the design. The generated files are committed, so this only
// needs to run when the mark changes:   npm install --no-save sharp   then   node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const INK = "#242C38";
const ORANGE = "#F58120";
const out = new URL("../public/icons/", import.meta.url);
mkdirSync(out, { recursive: true });

// The ribbon glyph is drawn on a 24-unit grid (x 7.5 to 16.5, y 2 to 20.5). The group transform centres it.
function mark(scale) {
  const x = 256 - 12 * scale;
  const y = 256 - 11.25 * scale;
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`
    + `<path fill="${ORANGE}" d="M12 14.5C9 11 7.5 8.5 7.5 6.5a4.5 4.5 0 0 1 9 0c0 2-1.5 4.5-4.5 8z"/>`
    + `<path d="M12 14.5 8.5 20.5M12 14.5l3.5 6"/></g>`;
}
const svg = (radius, scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="${INK}"/>${mark(scale)}</svg>`;

writeFileSync(new URL("icon.svg", out), svg(112, 17) + "\n");
const png = (name, size, markup) => sharp(Buffer.from(markup), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(new URL(name, out).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
await png("icon-192.png", 192, svg(112, 17));
await png("icon-512.png", 512, svg(112, 17));
// Maskable icons are cropped to a circle or squircle by the OS, so the mark stays inside the safe zone.
await png("icon-maskable-512.png", 512, svg(0, 14));
// iOS rounds the corners itself and rejects transparency.
await png("apple-touch-icon.png", 180, svg(0, 15));
console.log("icons written to public/icons");
