import sharp from "sharp";
const art = process.argv[2];
async function build() {
  if (art) await sharp(art).resize(1152).webp({ quality: 87 }).toFile("public/care-hero.webp");
  for (const [name, size, scale] of [["192",192,1], ["512",512,1], ["maskable",512,0.76], ["apple",180,1]]) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#08766d" d="M0 0h128v128H0z"/><g transform="translate(' + (64 * (1-scale)) + ' ' + (64 * (1-scale)) + ') scale(' + scale + ')"><path fill="#fff" d="M64 96 34 66a20 20 0 0 1 30-27 20 20 0 0 1 30 27z"/><path stroke="#08766d" stroke-width="6" stroke-linecap="round" d="M64 51v22m-11-11h22"/></g></svg>';
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile("public/care-" + name + ".png");
  }
}
build().catch(error => { console.error(error.message); process.exitCode = 1; });
