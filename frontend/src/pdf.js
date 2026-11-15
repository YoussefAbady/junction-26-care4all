import { A } from "./app.js";

/* care4all pdf: a small PDF writer, no libraries, so it works offline and sends nothing anywhere.
   A4 pages, the two standard fonts (Helvetica and Helvetica-Bold, WinAnsi), text that wraps, simple boxes, tables and rules.
   Usage: const d = A.pdf.doc({ title: '...' }); d.h2('Heading'); d.p('Text'); const bytes = d.build();  (Uint8Array)
   This file does not touch the page, the network or any browser storage, so it also runs under node. */

const W = 595.28, H = 841.89, M = 48, TOP = H - M, BOTTOM = 62;
/* Helvetica advance widths for ASCII 32..126, per 1000 units (the font's own metrics) */
const WR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const WB = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

/* Characters outside Latin-1 that WinAnsi has at other codes. Fancy spaces become a plain space. */
const CP1252 = {
  "’": 0x92, "‘": 0x91, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97, "…": 0x85, "•": 0x95, "€": 0x80, "−": 0x2d,
  "š": 0x9a, "Š": 0x8a, "ž": 0x9e, "Ž": 0x8e,
  " ": 0x20, " ": 0x20, " ": 0x20, " ": 0x20,
};
function code(ch) {
  const c = ch.charCodeAt(0);
  if (CP1252[ch] != null) return CP1252[ch];
  if (c >= 32 && c <= 126) return c;
  if (c >= 160 && c <= 255) return c;
  return 63; /* ? */
}
/** A string as the inside of a PDF literal string: ASCII only, with ( ) \ and every code above 126 escaped. */
function esc(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = code(s.charAt(i));
    if (c === 40 || c === 41 || c === 92) out += "\\" + String.fromCharCode(c);
    else if (c > 126) out += "\\" + ("00" + c.toString(8)).slice(-3);
    else out += String.fromCharCode(c);
  }
  return out;
}
function cw(ch, bold) {
  const c = code(ch);
  if (c >= 32 && c <= 126) return (bold ? WB : WR)[c - 32];
  if (c === 0x95) return 350;
  if (c === 0x96) return 556;
  if (c === 0x97) return 1000;
  if (c === 0x85) return 1000;
  if (c === 0x92 || c === 0x91) return 222;
  if (c === 0x93 || c === 0x94) return 333;
  if (c === 0xb7) return 278;
  if (c === 0xb0) return 400;
  const b = ch.normalize("NFD").charCodeAt(0);
  if (b >= 32 && b <= 126) return (bold ? WB : WR)[b - 32];
  return 556;
}
function width(s, size, bold) { let w = 0; for (let i = 0; i < s.length; i++) w += cw(s.charAt(i), bold); return w * size / 1000; }
function wrap(s, size, bold, maxW) {
  const out = [];
  String(s == null ? "" : s).replace(/\r/g, "").replace(/[    ]/g, " ").normalize("NFC").split("\n").forEach(para => {
    if (!para.trim()) { out.push(""); return; }
    let line = "";
    para.split(/ +/).forEach(word => {
      const t = line ? line + " " + word : word;
      if (width(t, size, bold) <= maxW) { line = t; return; }
      if (line) { out.push(line); line = ""; }
      while (width(word, size, bold) > maxW) { /* a very long word: break it */
        let k = word.length;
        while (k > 1 && width(word.slice(0, k), size, bold) > maxW) k--;
        out.push(word.slice(0, k)); word = word.slice(k);
      }
      line = word;
    });
    out.push(line);
  });
  return out;
}
const n2 = x => (Math.round(x * 100) / 100).toString();
const col = c => n2(c[0]) + " " + n2(c[1]) + " " + n2(c[2]);

const INK = [0.141, 0.173, 0.22], GRAY = [0.36, 0.39, 0.43], LIGHT = [0.94, 0.94, 0.94], ACCENT = [0.961, 0.506, 0.125], SOFT = [1, 0.93, 0.85], LINE = [0.8, 0.8, 0.8];
const colors = { ink: INK, gray: GRAY, light: LIGHT, accent: ACCENT, soft: SOFT, line: LINE };

/** A document being written. Every method but build() returns the document, so calls chain. */
function doc(o) {
  o = o || {};
  const pages = [], headerText = o.running || o.title || "";
  let cur = null, y = 0;
  function newPage() { cur = []; pages.push(cur); y = pages.length === 1 ? TOP : H - 66; }
  function need(h) { if (!cur || y - h < BOTTOM) newPage(); }
  function txt(x, yy, s, size, bold, color) { cur.push("BT /" + (bold ? "F2" : "F1") + " " + n2(size) + " Tf " + col(color || INK) + " rg 1 0 0 1 " + n2(x) + " " + n2(yy) + " Tm (" + esc(s) + ") Tj ET"); }
  function rect(x, yy, w, h, c) { cur.push(col(c) + " rg " + n2(x) + " " + n2(yy) + " " + n2(w) + " " + n2(h) + " re f"); }
  function rrect(x, yy, w, h, r, c) {
    const k = r * 0.5523;
    cur.push(col(c) + " rg " + n2(x + r) + " " + n2(yy) + " m " + n2(x + w - r) + " " + n2(yy) + " l " + n2(x + w - r + k) + " " + n2(yy) + " " + n2(x + w) + " " + n2(yy + r - k) + " " + n2(x + w) + " " + n2(yy + r) + " c " +
      n2(x + w) + " " + n2(yy + h - r) + " l " + n2(x + w) + " " + n2(yy + h - r + k) + " " + n2(x + w - r + k) + " " + n2(yy + h) + " " + n2(x + w - r) + " " + n2(yy + h) + " c " +
      n2(x + r) + " " + n2(yy + h) + " l " + n2(x + r - k) + " " + n2(yy + h) + " " + n2(x) + " " + n2(yy + h - r + k) + " " + n2(x) + " " + n2(yy + h - r) + " c " +
      n2(x) + " " + n2(yy + r) + " l " + n2(x) + " " + n2(yy + r - k) + " " + n2(x + r - k) + " " + n2(yy) + " " + n2(x + r) + " " + n2(yy) + " c f");
  }
  function hline(x1, x2, yy, c, wd) { cur.push(col(c) + " RG " + n2(wd || 0.6) + " w " + n2(x1) + " " + n2(yy) + " m " + n2(x2) + " " + n2(yy) + " l S"); }
  const d = {
    space(h) { if (cur) y -= h; return d; },
    title(t, sub) {
      newPage();
      rect(0, H - 10, W, 10, ACCENT);
      y = H - 46;
      txt(M, y, t, 21, true, INK); y -= 18;
      if (sub) { txt(M, y, sub, 10.5, false, GRAY); y -= 10; }
      y -= 8; hline(M, W - M, y, LINE, 0.8); y -= 18;
      return d;
    },
    h2(t) {
      need(46); y -= 8;
      rect(M, y - 3, 4, 15, ACCENT); txt(M + 12, y, t, 13, true, INK);
      y -= 20; return d;
    },
    h3(t) { need(30); txt(M, y, t, 11.5, true, INK); y -= 16; return d; },
    p(t, op) {
      op = op || {};
      const size = op.size || 10.5, lh = size * 1.42, ind = op.indent || 0;
      wrap(t, size, !!op.bold, W - 2 * M - ind).forEach(l => { need(lh); if (l) txt(M + ind, y, l, size, !!op.bold, op.color || INK); y -= lh; });
      return d;
    },
    bullets(items, op) {
      op = op || {};
      const size = op.size || 10.5, lh = size * 1.42;
      items.forEach(it => {
        wrap(it, size, false, W - 2 * M - 14).forEach((l, i) => { need(lh); if (i === 0) txt(M + 2, y, "•", size, false, ACCENT); txt(M + 14, y, l, size, false, INK); y -= lh; });
      });
      return d;
    },
    kv(rows, op) {
      op = op || {};
      const lw = op.labelWidth || 112, size = 10, lh = size * 1.42;
      rows.forEach(r => {
        const ls = wrap(r[1], size, false, W - 2 * M - lw);
        need(lh * Math.max(1, ls.length));
        txt(M, y, r[0], size - 0.5, true, GRAY);
        ls.forEach(l => { txt(M + lw, y, l, size, false, INK); y -= lh; });
        if (!ls.length) y -= lh;
      });
      return d;
    },
    box(title, lines, op) {
      op = op || {};
      const size = 10.5, lh = size * 1.42, pad = 12, inner = W - 2 * M - 2 * pad - 12, rows = [];
      lines.forEach(l => { wrap(l, size, false, inner - 12).forEach((x, i) => { rows.push({ t: x, first: i === 0 }); }); });
      const h = pad * 2 + (title ? 20 : 0) + rows.length * lh;
      need(Math.min(h, H - BOTTOM - 80)); y -= 4;
      rrect(M, y - h + 12, W - 2 * M, h, 8, op.fill || SOFT);
      let yy = y - pad + 2;
      if (title) { txt(M + pad + 4, yy, title, 11, true, INK); yy -= 20; }
      rows.forEach(r => {
        if (yy < BOTTOM + 4) { newPage(); yy = y; }
        if (r.first) txt(M + pad + 4, yy, "•", size, false, ACCENT);
        txt(M + pad + 16, yy, r.t, size, false, INK); yy -= lh;
      });
      y = yy - pad - 6; return d;
    },
    table(head, rows, widths) {
      const size = 9.5, lh = size * 1.4, tot = widths.reduce((a, b) => a + b, 0), sc = (W - 2 * M) / tot, cws = widths.map(w => w * sc);
      function row(cells, bold, fill) {
        const cs = cells.map((c, i) => wrap(c, size, bold, cws[i] - 10)), n = Math.max.apply(null, cs.map(c => c.length)), h = n * lh + 8;
        need(h + 2);
        if (fill) rect(M, y - h + 12 - 2, W - 2 * M, h, fill);
        let x = M;
        cs.forEach((c, i) => { c.forEach((l, k) => { txt(x + 5, y - 2 - k * lh, l, size, bold, INK); }); x += cws[i]; });
        y -= h; hline(M, W - M, y + 10, LINE, 0.5);
      }
      y -= 2; row(head, true, LIGHT); rows.forEach(r => { row(r, false, null); });
      y -= 4; return d;
    },
    ruled(n, gap) { gap = gap || 24; for (let i = 0; i < n; i++) { need(gap); y -= gap; hline(M, W - M, y + 6, LINE, 0.6); } y -= 4; return d; },
    pageCount() { return pages.length; },
    /** The finished file as bytes. Call it once, after everything is written. */
    build() {
      if (!pages.length) newPage();
      const n = pages.length;
      let i;
      for (i = 0; i < n; i++) {
        cur = pages[i];
        if (i > 0) { txt(M, H - 36, headerText + " (" + (o.continued || "continued") + ")", 9, false, GRAY); hline(M, W - M, H - 44, LINE, 0.6); }
        hline(M, W - M, 46, LINE, 0.6);
        txt(M, 32, o.footer || "", 8, false, GRAY);
        const pn = (o.pageWord || "Page") + " " + (i + 1) + " " + (o.ofWord || "of") + " " + n;
        txt(W - M - width(pn, 8, false), 32, pn, 8, false, GRAY);
      }
      const objs = [], now = new Date(), p2 = x => (x < 10 ? "0" : "") + x;
      const date = "D:" + now.getUTCFullYear() + p2(now.getUTCMonth() + 1) + p2(now.getUTCDate()) + p2(now.getUTCHours()) + p2(now.getUTCMinutes()) + p2(now.getUTCSeconds()) + "Z";
      const kids = [];
      for (i = 0; i < n; i++) kids.push((6 + i * 2) + " 0 R");
      objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
      objs[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + n + " >>";
      objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
      objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
      objs[5] = "<< /Title (" + esc(o.title || "care4all") + ") /Creator (care4all) /Producer (care4all) /CreationDate (" + date + ") >>";
      for (i = 0; i < n; i++) {
        const content = pages[i].join("\n");
        objs[6 + i * 2] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + n2(W) + " " + n2(H) + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + (7 + i * 2) + " 0 R >>";
        objs[7 + i * 2] = "<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream";
      }
      let out = "%PDF-1.4\n%âãÏÓ\n";
      const offs = [];
      for (i = 1; i < objs.length; i++) { offs[i] = out.length; out += i + " 0 obj\n" + objs[i] + "\nendobj\n"; }
      const xr = out.length;
      out += "xref\n0 " + objs.length + "\n0000000000 65535 f \n";
      for (i = 1; i < objs.length; i++) out += ("0000000000" + offs[i]).slice(-10) + " 00000 n \n";
      out += "trailer\n<< /Size " + objs.length + " /Root 1 0 R /Info 5 0 R >>\nstartxref\n" + xr + "\n%%EOF\n";
      const bytes = new Uint8Array(out.length);
      for (i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
      return bytes;
    },
  };
  return d;
}

A.pdf = { WIDTHS: { regular: WR, bold: WB }, width, colors, doc };
export { doc, width, colors };
