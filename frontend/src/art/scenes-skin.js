import { A as C4A } from "../app.js";
import "../styles/selfcheck-skin.css";

/* The skin and mole self-check scenes. Exemplar: s-sk-abcde (the five ABCDE signs, one after the other, each beside an ordinary mole).
   Texts: English is the source; the Finnish and Swedish are drafts for a native speaker to check. */
(function () {
  'use strict';
  var A = C4A, K = A.kit, stage = A.stage;
  var tr = function (a, b, c) { return A.tr(a, b, c); };

  var LET = ['A', 'B', 'C', 'D', 'E'];
  var WORD = [['Asymmetry', 'Epäsymmetria', 'Asymmetri'], ['Border', 'Reunat', 'Kant'], ['Colour', 'Väri', 'Färg'], ['Diameter', 'Halkaisija', 'Diameter'], ['Evolving', 'Muutos', 'Förändring']];
  var T0 = [0, 2.6, 5.2, 7.8, 10.4];
  var NORMAL = { seed: 2, r: 34, irr: 0, tone: 'brown' };
  var ASYM = { seed: 7, r: 37, irr: .95, ragged: .08, tone: 'brown' };
  var RAGGED = { seed: 12, r: 36, irr: .25, ragged: .9, tone: 'brown' };
  var MULTI = { seed: 5, r: 37, irr: .45, ragged: .3, tone: 'multi' };
  var CHIPS = ['#C9966A', '#8A5A38', '#231712', '#C27A74', '#6B7C93'];

  function skin(w, h, seed, full) { return K.skinPatch({ w: w, h: h, seed: seed, r: 0, lite: !full }); }
  function letterBadge(L, x, y, r) {
    return '<g transform="translate(' + x + ' ' + y + ')"><circle class="st-badge-bg" r="' + r + '"/><text class="st-badge-tx" y="' + (r * .36).toFixed(1) + '" text-anchor="middle" font-size="' + (r * 1.15).toFixed(1) + '">' + L + '</text></g>';
  }
  /* the heading of a phase: the letter and its word */
  function header(i, x, y) {
    var w = tr.apply(null, WORD[i]).length * 8.4 + 46;
    return '<g class="st-call"><rect class="st-pill" x="' + (x - w / 2) + '" y="' + (y - 15) + '" width="' + w + '" height="30" rx="15"/>' + letterBadge(LET[i], x - w / 2 + 16, y, 11) +
      '<text class="st-lbl" x="' + (x - w / 2 + 34) + '" y="' + (y + 4.6) + '" font-size="14">' + A.esc(tr.apply(null, WORD[i])) + '</text></g>';
  }
  /* an outline that flips over a vertical line through the origin of its group (to test whether two halves match) */
  function flip(c, d, ta, tb) {
    return c.anim([{ t: ta, sx: 1, sy: 1 }, { t: tb, sx: -1, sy: 1, ease: 'inOut' }], '<path d="' + d + '" class="st-ring-dash" style="stroke-width:2.4"/>', { pivot: [0, 0] });
  }
  function at(x, y, inner) { return '<g transform="translate(' + x + ' ' + y + ')">' + inner + '</g>'; }
  function chip(col, x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 8) + '" fill="' + col + '" stroke="var(--st-halo)" stroke-width="1.6"/><circle cx="' + (x - 2.4) + '" cy="' + (y - 2.6) + '" r="' + ((r || 8) * .28) + '" fill="#fff" opacity=".45"/>'; }

  var PW = 165, PH = 214, PX = 12, PY = 12, CX = 82.5, CY = 108;

  /* ---------- the five phases, animated ---------- */
  /* A, B and C share two panels: an ordinary mole on the left, the sign on the right. Only what is drawn on them changes with the phase. */
  function groupABC(c) {
    var cy = CY - 6, ph = [c.phase(0), c.phase(1), c.phase(2)], Ld = K.moleD(NORMAL), Rd = [K.moleD(ASYM), K.moleD(RAGGED)];
    var left = skin(PW, PH, 11) + skMoles(c)(CX, cy, 34);
    var right = skin(PW, PH, 12);
    /* A: a line through the middle, and the outline folded over it */
    var mid = '<path d="M' + CX + ' 40L' + CX + ' 172" class="st-ring-dash"/>';
    left += c.show(ph[0].t0 + .3, ph[0].t1 - .2, mid + at(CX, cy, flip(c, Ld, ph[0].t0 + .8, ph[0].t0 + 1.8)), { fade: .3 });
    right += c.show(ph[0].t0, ph[0].t1, K.mole(Object.assign({ x: CX, y: cy }, ASYM)) + mid + at(CX, cy, flip(c, Rd[0], ph[0].t0 + .8, ph[0].t0 + 1.8)), { fade: .3 });
    /* B: a smooth edge traced with a ring, the ragged edge traced along its notches */
    left += c.show(ph[1].t0 + .2, ph[1].t1 - .2, at(CX, cy, c.draw('M-40 0A40 40 0 1 1 40 0A40 40 0 1 1 -40 0', ph[1].t0 + .4, ph[1].t0 + 1.6, 'class="st-ring-dash" fill="none"', { until: ph[1].t1 - .3 })), { fade: .3 });
    right += c.show(ph[1].t0, ph[1].t1, K.mole(Object.assign({ x: CX, y: cy }, RAGGED)) + at(CX, cy, K.trail(c, Rd[1], ph[1].t0 + .4, ph[1].t1 - .6, { tipR: 6, until: ph[1].t1 - .2, stillAt: .2 })), { fade: .3 });
    /* C: the colours counted off as chips */
    left += c.show(ph[2].t0 + .2, ph[2].t1 - .2, chip(CHIPS[1], CX, 164, 9), { fade: .3 });
    var chips = '';
    [0, 1, 2, 3, 4].forEach(function (k) { chips += c.show(ph[2].t0 + .5 + k * .32, ph[2].t1 - .2, chip(CHIPS[k], CX + (k - 2) * 24, 164, 9), { fade: .25 }); });
    right += c.show(ph[2].t0, ph[2].t1, K.mole(Object.assign({ x: CX, y: cy }, MULTI)), { fade: .3 }) + chips;
    var lab = [[['Halves match', 'Puolikkaat täsmäävät', 'Halvorna matchar'], ['Halves differ', 'Puolikkaat eroavat', 'Halvorna skiljer sig']], [['Smooth edge', 'Sileä reuna', 'Slät kant'], ['Ragged edge', 'Rosoinen reuna', 'Naggad kant']], [['One colour', 'Yksi väri', 'En färg'], ['Several colours', 'Useita värejä', 'Flera färger']]];
    var pills = '';
    lab.forEach(function (l, i) {
      pills += c.show(ph[i].t0, ph[i].t1, at(PX, PY, K.callout(tr.apply(null, l[0]), [PW / 2, PH - 13], null, { size: 12.5 })) + at(PX + PW + 6, PY, K.callout(tr.apply(null, l[1]), [PW / 2, PH - 13], null, { size: 12.5 })), { fade: .3 });
    });
    return c.show(0, T0[3], K.compare({ x: PX, y: PY, w: 336, h: PH, left: left, right: right, labels: ['', ''] }), { fade: .35, hold: false }) + pills;
  }
  function phaseD(c, t0, t1) {
    var u = 60, mx = 160, my = 76, r = 25, ex = 86, s = skin(336, PH, 17);
    s += K.ruler({ x: 18, y: 146, cm: 5, u: u });
    s += skMoles(c)(mx, my, r, { irr: 12 });
    /* the pencil rubber, seen end on: 6 mm across; slides in beside the mole, and a ring of the same size sits on the mole */
    var er = '<circle r="' + (u * .6 / 2 + 3.5) + '" fill="var(--st-metal)"/><circle r="' + (u * .6 / 2) + '" fill="#E98C97"/><circle r="' + (u * .6 / 2) + '" fill="url(#k-sh-br)"/><ellipse cx="-4" cy="-5" rx="8" ry="5" fill="#fff" opacity=".4" transform="rotate(-30)"/><circle r="' + (u * .6 / 2 + 3.5) + '" class="st-contour"/>';
    s += c.show(t0 + .2, t1 - .2, c.move('M-30 ' + my + 'L' + ex + ' ' + my, t0 + .3, t0 + 1.1, er, { still: 1 }), { fade: .3 });
    s += c.show(t0 + 1.1, t1 - .2, '<circle cx="' + mx + '" cy="' + my + '" r="' + (u * .3) + '" class="st-ring-dash"/>', { fade: .3 });
    var dim = function (x0, x1, y, col) { return '<path d="M' + x0 + ' ' + y + 'L' + x1 + ' ' + y + 'M' + x0 + ' ' + (y - 4) + 'L' + x0 + ' ' + (y + 4) + 'M' + x1 + ' ' + (y - 4) + 'L' + x1 + ' ' + (y + 4) + '" stroke="' + col + '" stroke-width="2" stroke-linecap="round" fill="none"/>'; };
    s += c.show(t0 + 1.1, t1 - .2, dim(ex - 18, ex + 18, 116, 'var(--st-ok)') + K.callout('6 mm', [ex, 128], null, { size: 12.5 }), { fade: .3 });
    s += c.show(t0 + 1.5, t1 - .2, dim(mx - r, mx + r, 116, 'var(--st-warn)'), { fade: .3 });
    s += c.show(t0 + 1.5, t1 - .2, K.callout(tr('Wider than\n6 mm', 'Yli 6 mm\nleveä', 'Bredare än\n6 mm'), [270, 70], [mx + r + 4, my], { tone: 'warn' }), { fade: .3 });
    return at(PX, PY, '<clipPath id="' + c.id('skD') + '"><path d="' + K.rr(0, 0, 336, PH, 12) + '"/></clipPath><g clip-path="url(#' + c.id('skD') + ')">' + s + '</g><path d="' + K.rr(0, 0, 336, PH, 12) + '" fill="none" stroke="var(--st-warn)" stroke-width="2"/>');
  }
  function phaseE(c, t0, t1) {
    var s = skin(336, PH, 18), xs = [62, 168, 274], rs = [12, 18, 26], defs = [{ seed: 31, irr: 0, tone: 'brown' }, { seed: 31, irr: .4, tone: 'brown', ragged: .15 }, { seed: 31, irr: .75, ragged: .4, tone: 'multi' }];
    var names = [tr('Start', 'Alussa', 'I början'), tr('+3 months', '+3 kk', '+3 mån'), tr('+6 months', '+6 kk', '+6 mån')], out = '';
    xs.forEach(function (x, k) {
      var lens = K.skinPatch({ x: -50, y: -50, w: 100, h: 100, r: 0, seed: 40 + k, lite: true }) + (k === 0 ? skMoles(c)(0, 0, rs[0]) : K.mole(Object.assign({ r: rs[k] }, defs[k])));
      out += c.show(t0 + .3 + k * .7, t1 - .2, K.lens(x, 88, 42, lens, { label: names[k] }), { fade: .35 });
      if (k < 2) out += c.show(t0 + .8 + k * .7, t1 - .2, K.arrow(x + 48, 88, xs[k + 1] - 48, 88, { head: 6 }), { fade: .3 });
    });
    return at(PX, PY, '<clipPath id="' + c.id('skE') + '"><path d="' + K.rr(0, 0, 336, PH, 12) + '"/></clipPath><g clip-path="url(#' + c.id('skE') + ')">' + s + '</g><path d="' + K.rr(0, 0, 336, PH, 12) + '" fill="var(--st-lens-bg)" opacity="0"/>' + out + '<path d="' + K.rr(0, 0, 336, PH, 12) + '" fill="none" stroke="var(--st-warn)" stroke-width="2"/>');
  }

  /* ---------- the still frame: all five signs on one picture ---------- */
  function tiles(c) {
    var s = '', pos = [[8, 6], [126, 6], [244, 6], [64, 126], [192, 126]], W = 108, H = 112, cx = 54, cy = 46;
    pos.forEach(function (p, i) {
      var id = K.uid('tl'), g = '<clipPath id="' + id + '"><path d="' + K.rr(0, 0, W, H, 12) + '"/></clipPath><g clip-path="url(#' + id + ')">' + skin(W, H, 50 + i);
      if (i === 0) g += at(cx, cy, '<path d="' + K.moleD(Object.assign({}, ASYM, { r: 24 })) + '" class="st-ring-dash" style="stroke-width:2.2" transform="scale(-1 1)"/>') + K.mole(Object.assign({ x: cx, y: cy }, ASYM, { r: 24 })) + '<path d="M' + cx + ' 8L' + cx + ' 84" class="st-ring-dash"/>';
      if (i === 1) g += K.mole(Object.assign({ x: cx, y: cy }, RAGGED, { r: 24 })) + at(cx, cy, '<circle r="27" class="st-ring-dash"/>');
      if (i === 2) { g += K.mole(Object.assign({ x: cx, y: cy - 6 }, MULTI, { r: 24 })); [0, 1, 2, 3, 4].forEach(function (k) { g += chip(CHIPS[k], cx + (k - 2) * 15, 72, 6); }); }
      if (i === 3) {
        g += K.mole({ x: 70, y: 44, r: 21, seed: 21, irr: .2, tone: 'brown' }) + '<circle cx="70" cy="44" r="15" class="st-ring-dash"/><circle cx="26" cy="44" r="15" fill="#E98C97" stroke="var(--st-metal)" stroke-width="3"/><path d="M49 74L91 74M49 70L49 78M91 70L91 78" stroke="var(--st-warn)" stroke-width="2" stroke-linecap="round"/>';
      }
      if (i === 4) { [[22, 10], [54, 14], [88, 20]].forEach(function (q, k) { g += K.mole(Object.assign({ x: q[0], y: 42 }, [{ seed: 31, irr: 0, tone: 'brown' }, { seed: 31, irr: .4, ragged: .15, tone: 'brown' }, { seed: 31, irr: .75, ragged: .4, tone: 'multi' }][k], { r: q[1] })); }); g += '<path d="M33 42h8M66 42h8" class="st-arrow"/>'; }
      g += '</g><path d="' + K.rr(0, 0, W, H, 12) + '" fill="none" stroke="var(--st-warn)" stroke-width="1.6"/>';
      var w = tr.apply(null, WORD[i]).length * 7.6 + 40;
      g += '<g class="st-call"><rect class="st-pill" x="' + (W / 2 - w / 2) + '" y="' + (H - 30) + '" width="' + w + '" height="24" rx="12"/>' + letterBadge(LET[i], W / 2 - w / 2 + 13, H - 18, 9.5) + '<text class="st-lbl" x="' + (W / 2 - w / 2 + 27) + '" y="' + (H - 13.5) + '" font-size="12.5">' + A.esc(tr.apply(null, WORD[i])) + '</text></g>';
      s += at(p[0], p[1], g);
    });
    return s;
  }

  stage.define('s-sk-abcde', {
    dur: 14,
    viewBox: [360, 300],
    phases: [
      { at: T0[0], cap: ['A, asymmetry: the two halves of the mole do not match', 'A, epäsymmetria: luomen puolikkaat eivät täsmää', 'A, asymmetri: luftens två halvor matchar inte'] },
      { at: T0[1], cap: ['B, border: the edge is ragged, notched or blurred', 'B, reunat: reuna on rosoinen, lovettu tai epäselvä', 'B, kant: kanten är ojämn, naggad eller suddig'] },
      { at: T0[2], cap: ['C, colour: more than one colour or shade', 'C, väri: useampi kuin yksi väri tai sävy', 'C, färg: mer än en färg eller nyans'] },
      { at: T0[3], cap: ['D, diameter: wider than about 6 mm, a pencil rubber', 'D, halkaisija: yli noin 6 mm, kumin kokoinen', 'D, diameter: bredare än cirka 6 mm, som ett suddgummi'] },
      { at: T0[4], cap: ['E, evolving: it changes over weeks or months. Any sign is worth showing to a doctor', 'E, muutos: se muuttuu viikkojen tai kuukausien kuluessa. Mikä tahansa merkki kannattaa näyttää lääkärille', 'E, förändring: den ändras under veckor eller månader. Varje tecken är värt att visa för en läkare'] }
    ],
    desc: [
      'Close-up pictures of skin and moles show the five ABCDE signs one after the other, each beside an ordinary mole: asymmetry, where the halves do not match; border, which is ragged; colour, with several shades; diameter, wider than a 6 millimetre pencil rubber; and evolving, a mole that grows and darkens over months. One sign alone is not a diagnosis, but a mole with any of them is worth showing to a doctor.',
      'Lähikuvat ihosta ja luomista näyttävät viisi ABCDE-merkkiä yksi kerrallaan tavallisen luomen vieressä: epäsymmetria, rosoiset reunat, useita värejä, yli 6 millimetrin halkaisija ja luomi joka kasvaa ja tummuu kuukausien aikana. Yksi merkki ei yksin ole diagnoosi, mutta luomi jossa on mikä tahansa niistä kannattaa näyttää lääkärille.',
      'Närbilder av hud och leverfläckar visar de fem ABCDE-tecknen ett i taget bredvid en vanlig fläck: asymmetri, naggad kant, flera färger, diameter över 6 millimeter och en fläck som växer och mörknar under månader. Ett tecken ensamt är ingen diagnos, men en fläck med något av dem är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '';
      if (c.still) return skin(360, 300, 3, true) + '<rect width="360" height="300" fill="url(#k-vig)"/>' + tiles(c);
      s += skin(360, 300, 3, true) + '<rect width="360" height="300" fill="url(#k-vig)"/>';
      s += groupABC(c);
      [phaseD, phaseE].forEach(function (fn, k) { var p = c.phase(3 + k); s += c.show(p.t0, p.t1, fn(c, p.t0, p.t1), { fade: .35 }); });
      for (var i = 0; i < 5; i++) { var p = c.phase(i); s += c.show(p.t0, p.t1, header(i, 180, 36), { fade: .3 }); }
      /* the row of letters: the current one is lit */
      s += '<rect class="st-pill" x="52" y="244" width="256" height="40" rx="20"/>';
      LET.forEach(function (L, k) {
        var x = 180 + (k - 2) * 48;
        s += '<g transform="translate(' + x + ' 264)"><circle r="14" fill="none" stroke="var(--st-contour)" stroke-width="1.4"/><text class="st-lbl" y="5" text-anchor="middle" font-size="14" opacity=".6">' + L + '</text></g>';
        s += c.phaseShow(k, letterBadge(L, x, 264, 15), { fade: .25 });
      });
      return s;
    }
  });

  /* ====================================================================================================================
     Shared drawing helpers for the other scenes. Every name starts with sk so nothing can clash with the kit.
     Body coordinates: origin at the notch of the throat (the C7 bump from behind), like K.torso. 3.8 units to the cm.
     ==================================================================================================================== */
  function f1(v) { return +(+v).toFixed(1); }
  function skSegs(len) {
    var S = 87, A_ = 70, W = 55;
    return [[15, -34, 17, -24, 23, -18], [41, -13, 57, -10, 69, -6], [S - 4, -2, S + 2, 10, S, 24], [S - 2, 34, A_ + 5, 42, A_, 50], [A_ - 3, 78, W + 3, len - 52, W + 2, len - 30], [W, len - 20, W - 1, len - 8, W - 1, len + 2]];
  }
  function skTorsoD(len) { return K.symPath([15, -44], skSegs(len)); }

  /* The back of the upper body: neck, trapezius, shoulder blades, the spine, the muscles at the sides. */
  function skBackTorso(len, o) {
    o = o || {};
    var d = skTorsoD(len), s = '', i, k;
    s += '<path d="' + d + '" fill="url(#k-skin)"/><path d="' + d + '" fill="url(#k-sh-edge-h)"/><path d="' + d + '" fill="url(#k-sh-edge-v)"/>';
    s += '<path d="M-15 -44C-15 -34 -17 -24 -23 -18L23 -18C17 -24 15 -34 15 -44Z" fill="url(#k-sh-edge-h)"/>';
    [-1, 1].forEach(function (sx) {
      /* trapezius: a soft slope from the neck to the shoulder */
      s += '<path d="M' + sx * 13 + ' -32C' + sx * 20 + ' -20 ' + sx * 36 + ' -12 ' + sx * 66 + ' -5" fill="none" stroke="#fff" stroke-opacity="' + (sx < 0 ? .3 : .13) + '" stroke-width="8" stroke-linecap="round" filter="url(#k-b2)"/>';
      s += '<path d="M' + sx * 14 + ' -27C' + sx * 22 + ' -16 ' + sx * 38 + ' -8 ' + sx * 68 + ' 0" class="st-crease" stroke-opacity=".2" stroke-width="1.1"/>';
      s += K.glint(sx * 67, 8, 15, 19, sx * 10, sx < 0 ? .7 : .32) + K.contact(sx * 82, 30, 11, 22, sx < 0 ? .28 : .5);
      /* the shoulder blade: lit edge, shadow along the medial border and under the inferior angle */
      var sc = 'M' + sx * 9 + ' 20C' + sx * 26 + ' 12 ' + sx * 50 + ' 15 ' + sx * 58 + ' 27C' + sx * 56 + ' 50 ' + sx * 40 + ' 72 ' + sx * 22 + ' 80C' + sx * 10 + ' 68 ' + sx * 7 + ' 42 ' + sx * 9 + ' 20Z';
      s += '<path d="' + sc + '" fill="#fff" fill-opacity="' + (sx < 0 ? .13 : .06) + '" filter="url(#k-b1)"/>';
      s += '<path d="M' + sx * 7 + ' 42C' + sx * 7 + ' 60 ' + sx * 12 + ' 72 ' + sx * 22 + ' 82C' + sx * 34 + ' 78 ' + sx * 48 + ' 64 ' + sx * 57 + ' 46" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".2" stroke-width="3" stroke-linecap="round" filter="url(#k-b1)"/>';
      s += '<path d="M' + sx * 10 + ' 24C' + sx * 26 + ' 19 ' + sx * 42 + ' 20 ' + sx * 55 + ' 27" class="st-crease" stroke-opacity=".32" stroke-width="1"/>';
      s += '<path d="M' + sx * 11 + ' 26C' + sx * 28 + ' 21 ' + sx * 44 + ' 22 ' + sx * 56 + ' 29" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1.6"/>';
      /* the latissimus and the ribs at the side, the dimple above the hip */
      s += '<path d="M' + sx * 68 + ' 56C' + sx * 60 + ' 88 ' + sx * 52 + ' ' + (len - 48) + ' ' + sx * 51 + ' ' + (len - 16) + '" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".16" stroke-width="7" stroke-linecap="round" filter="url(#k-b2)"/>';
      s += '<ellipse cx="' + sx * 17 + '" cy="' + (len - 24) + '" rx="4.2" ry="2.8" fill="url(#k-sh-r)" opacity=".7"/>';
      for (k = 0; k < 3; k++) s += '<path d="M' + sx * 56 + ' ' + (92 + k * 12) + 'C' + sx * 44 + ' ' + (99 + k * 12) + ' ' + sx * 26 + ' ' + (99 + k * 12) + ' ' + sx * 14 + ' ' + (93 + k * 12) + '" class="st-crease" stroke-opacity="' + (.2 - k * .05) + '" stroke-width=".8"/>';
    });
    /* the spine: a soft groove with the bumps of the vertebrae */
    s += '<path d="M0 -26L0 ' + (len - 10) + '" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".2" stroke-width="6" stroke-linecap="round" filter="url(#k-b1)"/><path d="M0 -26L0 ' + (len - 10) + '" class="st-crease" stroke-opacity=".38" stroke-width="1"/>';
    for (i = 0; i < 11; i++) {
      var y = -20 + i * (len - 10) / 11.5, w = i < 2 ? 3.6 : 2.6;
      s += '<ellipse cx="-.8" cy="' + f1(y) + '" rx="' + w + '" ry="1.7" fill="#fff" fill-opacity="' + (i < 2 ? .5 : .28) + '"/><ellipse cx=".9" cy="' + f1(y + 2.4) + '" rx="' + w * .8 + '" ry="1.1" fill="rgb(var(--st-shadow))" fill-opacity=".18"/>';
    }
    s += K.grain(d, .3) + '<path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    return s;
  }
  /* The back of a head with short hair, origin at the chin like K.head. */
  function skBackHead() {
    var HD = 'M0 -86C17 -86 29 -70 29 -48C29 -26 20 -8 9 -3C5 -1 2 0 0 0C-2 0 -5 -1 -9 -3C-20 -8 -29 -26 -29 -48C-29 -70 -17 -86 0 -86Z', s = '';
    [-1, 1].forEach(function (sx) {
      var ex = sx * 29.5, ed = 'M' + ex + ' -52C' + (ex + sx * 7) + ' -52 ' + (ex + sx * 8) + ' -34 ' + (ex + sx * 2) + ' -30C' + (ex - sx * .5) + ' -30 ' + (ex - sx) + ' -36 ' + (ex - sx) + ' -46Z';
      s += '<path d="' + ed + '" fill="url(#k-skin-dome)"/><path d="' + ed + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    });
    s += '<path d="' + HD + '" fill="url(#k-skin-dome)"/>';
    var hair = 'M-30 -50C-34 -80 -18 -93 0 -93C18 -93 34 -80 30 -50C30 -36 27 -26 22 -20C14 -13 -14 -13 -22 -20C-27 -26 -30 -36 -30 -50Z';
    s += '<path d="' + hair + '" fill="url(#k-hair)"/><path d="' + hair + '" fill="url(#k-sh-b)" opacity=".5"/><path d="' + hair + '" fill="url(#k-hi-tl)" opacity=".55"/>';
    var sd = ''; for (var i = 0; i < 9; i++) { var u = i / 8 - .5; sd += 'M' + f1(u * 8) + ' -88Q' + f1(u * 50) + ' -60 ' + f1(u * 52) + ' -24'; } s += '<path d="' + sd + '" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width=".8"/>';
    s += '<ellipse cx="-8" cy="-80" rx="12" ry="4.5" fill="#fff" opacity=".2" transform="rotate(-14 -8 -80)"/>';
    s += '<path d="M-21 -20C-14 -12 14 -12 21 -20" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".3" stroke-width="3" filter="url(#k-b1)"/>';
    s += '<path d="' + HD + '" class="st-contour" stroke-opacity=".7" stroke-width=".9"/>';
    return s;
  }
  /* Boxer shorts, so the picture can stop at the thigh: a cloth with a waistband and folds. */
  function skShorts(len) {
    var t = len - 22, hm = len + 76, W = 58;
    var d = 'M' + -W + ' ' + t + 'L' + W + ' ' + t + 'C' + (W + 7) + ' ' + (t + 28) + ' ' + (W + 11) + ' ' + (t + 66) + ' ' + (W + 10) + ' ' + hm + 'L11 ' + hm + 'C11 ' + (hm - 14) + ' 5 ' + (hm - 24) + ' 0 ' + (hm - 24) + 'C-5 ' + (hm - 24) + ' -11 ' + (hm - 14) + ' -11 ' + hm + 'L' + -(W + 10) + ' ' + hm + 'C' + -(W + 11) + ' ' + (t + 66) + ' ' + -(W + 7) + ' ' + (t + 28) + ' ' + -W + ' ' + t + 'Z';
    var s = K.softShadow(d, { dx: 2, dy: 4, blur: 3, op: .3 }) + K.cloth(d, { kind: 'sheet-tint', fibre: true });
    s += K.folds(-W - 8, t + 20, 2 * W + 16, 70, 4, 6, 9);
    s += '<path d="M' + -W + ' ' + t + 'L' + W + ' ' + t + 'L' + W + ' ' + (t + 10) + 'L' + -W + ' ' + (t + 10) + 'Z" fill="var(--st-sheet-d)" opacity=".5"/><path d="M' + -W + ' ' + (t + 10) + 'L' + W + ' ' + (t + 10) + '" class="st-contour" stroke-opacity=".8" stroke-width=".8"/>';
    s += '<path d="M0 ' + (t + 12) + 'L0 ' + (hm - 26) + '" class="st-crease" stroke-opacity=".18" stroke-width="1"/>';
    return s;
  }
  function skThighs(len) {
    return K.limb([-31, len + 30], [-33, len + 260], 58, 48, { bulge: .03 }) + K.limb([31, len + 30], [33, len + 260], 58, 48, { bulge: .03 }) + '<path d="M0 ' + (len + 40) + 'L0 ' + (len + 250) + '" class="st-crease" stroke-opacity=".25" stroke-width="1.6"/>';
  }
  /* A whole figure from the thighs up, from the front or the back. o.len torso length, o.arms: [left, right] markup or 'down' (default),
     o.hands true draws relaxed hands, o.yaw turns the front head, o.under markup drawn between the thighs and the torso. */
  function skFig(view, o) {
    o = o || {};
    var len = o.len || 140, s = '', back = view === 'back';
    s += K.contact(0, len + 150, 120, 120, 0);
    s += skThighs(len);
    if (back) {
      s += skBackTorso(len) + skBackHead().replace(/^/, '<g transform="translate(0 -50)">') + '</g>';
    } else {
      s += K.torso({ form: 'neutral', len: len }) + K.head({ x: 0, y: -50, hair: 'short', eyes: 'open', yaw: o.yaw || 0 });
    }
    s += skShorts(len);
    var arm = function (side, spec) {
      if (spec && typeof spec === 'string' && spec !== 'down') return spec;
      return K.arm({ side: side, pose: 'down', hand: o.hands === false ? null : 'flat3', thick: 1, handFlip: side === 'l' });
    };
    s += arm('l', o.armL) + arm('r', o.armR);
    return s;
  }

  /* A soft band of light that sweeps down (or across) a region. Clip it to a body with o.clip (a clip-path url). Only transform moves. */
  function skBand(c, t0, t1, x, yFrom, yTo, w, o) {
    o = o || {};
    var id = c.id('bd' + (o.key || ''));
    var h = o.h || 34;
    c.defs('<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#fff" stop-opacity="' + (o.op || .5) + '"/><stop offset="1" stop-color="#fff" stop-opacity="' + Math.min(.95, (o.op || .5) * 1.5) + '"/></linearGradient>');
    var band = '<rect x="' + x + '" y="' + -h + '" width="' + w + '" height="' + h + '" fill="url(#' + id + ')"/><rect x="' + x + '" y="-1" width="' + w + '" height="2.4" fill="#fff" opacity=".85"/><rect x="' + x + '" y="1" width="' + w + '" height="7" fill="var(--st-guide)" opacity=".16"/>';
    var inner = c.show(t0, t1, c.anim([{ t: t0, y: yFrom }, { t: t1, y: yTo, ease: 'linear' }], band, { stillT: t0 + (t1 - t0) * (o.stillAt == null ? .5 : o.stillAt) }), { fade: .3 });
    return o.clip ? '<g clip-path="' + o.clip + '">' + inner + '</g>' : inner;
  }
  function skSun(x, y, r) {
    var s = '<g transform="translate(' + x + ' ' + y + ')"><circle r="' + r * .5 + '" fill="#F6B93B" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>';
    for (var i = 0; i < 8; i++) s += '<path d="M0 ' + -r * .72 + 'L0 ' + -r + '" transform="rotate(' + i * 45 + ')" stroke="#F6B93B" stroke-width="1.8" stroke-linecap="round"/>';
    return s + '</g>';
  }
  /* The room: wall, a window with light, falling across the scene. Light is white at low opacity, so it works in both themes. */
  function skWindow(c, x, y, w, h) {
    var id = c.id('sky'), lg = c.id('lite'), s = '';
    c.defs('<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sk-sky-a)"/><stop offset="1" style="stop-color:var(--sk-sky-b)"/></linearGradient><linearGradient id="' + lg + '" gradientUnits="userSpaceOnUse" x1="' + x + '" y1="' + y + '" x2="' + (x + 230) + '" y2="' + (y + 250) + '"><stop offset="0" stop-color="#FFF6DC" stop-opacity=".42"/><stop offset="1" stop-color="#FFF6DC" stop-opacity="0"/></linearGradient>');
    s += '<path d="M' + (x + w) + ' ' + y + 'L' + (x + w + 190) + ' ' + (y + 120) + 'L' + (x + w + 150) + ' ' + (y + 300) + 'L' + (x + w) + ' ' + (y + h) + 'Z" fill="url(#' + lg + ')" filter="url(#k-b5)"/>';
    s += '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="' + (w + 10) + '" height="' + (h + 10) + '" rx="3" fill="var(--sk-frame)"/>';
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#' + id + ')"/>';
    s += '<ellipse cx="' + (x + w * .3) + '" cy="' + (y + h * .32) + '" rx="' + w * .22 + '" ry="7" fill="#fff" opacity=".7" filter="url(#k-b2)"/><ellipse cx="' + (x + w * .62) + '" cy="' + (y + h * .24) + '" rx="' + w * .16 + '" ry="5" fill="#fff" opacity=".55" filter="url(#k-b2)"/>';
    s += '<path d="M' + (x + w / 2) + ' ' + y + 'L' + (x + w / 2) + ' ' + (y + h) + 'M' + x + ' ' + (y + h * .5) + 'L' + (x + w) + ' ' + (y + h * .5) + '" stroke="var(--sk-frame)" stroke-width="3"/>';
    s += '<rect x="' + (x - 8) + '" y="' + (y + h + 3) + '" width="' + (w + 16) + '" height="6" rx="2" fill="var(--sk-frame)"/><rect x="' + (x - 8) + '" y="' + (y + h + 3) + '" width="' + (w + 16) + '" height="2" rx="1" fill="#fff" opacity=".35"/>';
    return s;
  }

  /* A numbered note for phase i: the badge at (x, y), the label pill just right of it and a leader to the target. o.mk false: no badge, o.at 'middle' centres the pill on x. */
  function skNote(c, i, text, x, y, target, o) {
    o = o || {};
    var pill = o.at === 'middle' ? K.callout(text, [x, y], target, { align: 'middle', tone: o.tone, size: o.size }) : K.callout(text, [x + 15, y], target, { align: 'start', tone: o.tone, size: o.size });
    return c.phaseShow(i, pill + (o.mk === false ? '' : c.marker(i, x, y, 11)), { fade: .3 });
  }
  /* Define a figure once in the scene's <defs> and use it again and again: returns a function (transform) -> <use>. Keeps the markup small. */
  function skDef(c, name, inner) {
    var id = c.id(name);
    c.defs('<g id="' + id + '">' + inner + '</g>');
    return function (tf, extra) { return '<use href="#' + id + '"' + (tf ? ' transform="' + tf + '"' : '') + (extra || '') + '/>'; };
  }
  /* A light relaxed hand, fingers down from the wrist at the origin (about 66 units long). Much smaller than K.hand. */
  function skHandLite(o) {
    o = o || {};
    var s = '', xs = [-7.6, -2.6, 2.5, 7.3], L = [25, 31, 29, 22], i;
    s += '<ellipse cx="-12" cy="17" rx="4.2" ry="12" transform="rotate(14 -12 17)" fill="url(#k-skin-h)"/><ellipse cx="-12" cy="17" rx="4.2" ry="12" transform="rotate(14 -12 17)" class="st-contour"/>';
    var pd = 'M-10 -2C-12 8 -12.5 22 -11.5 34L11.5 34C12.5 22 12 8 10 -2Z';
    s += '<path d="' + pd + '" fill="url(#k-skin-h)"/><path d="' + pd + '" fill="url(#k-sh-edge-h)" opacity=".5"/>';
    for (i = 0; i < 4; i++) {
      var x = xs[i], fd = 'M' + f1(x - 2.8) + ' 31L' + f1(x - 2.6) + ' ' + (34 + L[i]) + 'A2.7 2.7 0 0 0 ' + f1(x + 2.8) + ' ' + (34 + L[i]) + 'L' + f1(x + 2.8) + ' 31Z';
      s += '<path d="' + fd + '" fill="url(#k-skin-h)"/><path d="' + fd + '" class="st-contour" stroke-opacity=".8"/>';
    }
    s += '<ellipse cx="-3" cy="12" rx="6" ry="10" fill="url(#k-hi-r)" opacity=".35"/>';
    return K.place({ x: o.x, y: o.y, r: o.r, flip: o.flip, s: o.s }, s);
  }
  /* An arm hanging down with a light hand. */
  function skArmDown(side) {
    var p = K.armPoints({ side: side, pose: 'down' }), s = K.arm({ side: side, pose: 'down' });
    return s + skHandLite({ x: p.W[0], y: p.W[1] - 2, flip: side === 'r', r: (side === 'l' ? 1 : -1) * 3 });
  }
  /* The silhouette of a figure for clipping light to the body: the torso, the head and the shorts and thighs, as separate shapes (a union). */
  function skBodyClip(c, name, len, tf, noLegs) {
    var HD = 'M0 -86C17 -86 29 -70 29 -48C29 -26 20 -8 9 -3C5 -1 2 0 0 0C-2 0 -5 -1 -9 -3C-20 -8 -29 -26 -29 -48C-29 -70 -17 -86 0 -86Z';
    c.defs('<clipPath id="' + c.id(name) + '"><path d="' + skTorsoD(len) + '" transform="' + tf + '"/><path d="' + HD + '" transform="' + tf + ' translate(0 -50)"/>' + (noLegs ? '' : '<rect x="-68" y="' + (len - 22) + '" width="136" height="260" transform="' + tf + '"/>') + '</clipPath>');
    return c.ref(name);
  }
  /* A figure with a mirror image: a rounded pane with a figure in it. */
  function skFigs(c) {
    var o = {}, ff = skDef(c, 'ff', skFig('front', { armL: '<g/>', armR: '<g/>' })), fb = skDef(c, 'fb', skFig('back', { armL: '<g/>', armR: '<g/>' }));
    var al = skDef(c, 'al', skArmDown('l')), ar = skDef(c, 'ar', skArmDown('r'));
    /* fg.front(tf) and fg.back(tf): whole figures with the arms hanging. fg.frontBase(tf, extra): only the arm on the left of the picture, plus extra. */
    o.front = function (tf) { return '<g transform="' + tf + '">' + ff() + al() + ar() + '</g>'; };
    o.back = function (tf) { return '<g transform="' + tf + '">' + fb() + al() + ar() + '</g>'; };
    o.frontBase = function (tf, extra) { return '<g transform="' + tf + '">' + ff() + al() + (extra || '') + '</g>'; };
    return o;
  }

  /* ---------- s-sk-mirrors: the big mirror, the small mirror, a bright room ---------- */
  stage.define('s-sk-mirrors', {
    dur: 13.5,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Stand in a bright room, in front of a full-length mirror', 'Seiso kirkkaassa huoneessa pitkän peilin edessä', 'Stå i ett ljust rum framför en helkroppsspegel'] },
      { at: 3.2, cap: ['Look at your front in the big mirror, from head to toe', 'Katso etupuoltasi isosta peilistä päästä jalkoihin', 'Titta på din framsida i den stora spegeln, från topp till tå'] },
      { at: 6.4, cap: ['Turn round and hold the small mirror up', 'Käänny ympäri ja nosta pieni peili esiin', 'Vänd dig om och håll upp den lilla spegeln'] },
      { at: 9.4, cap: ['The small mirror shows your back in the big one. Take extra care where the sun reaches', 'Pieni peili näyttää selkäsi isossa peilissä. Tarkista huolella ihoalueet, joihin aurinko osuu', 'Den lilla spegeln visar ryggen i den stora. Var extra noga där solen når'] }
    ],
    desc: [
      'A bright room with a window, a full-length mirror and a person standing in front of it in shorts. First they face the mirror and look at the front of the body from head to toe, a band of light sweeping down the reflection. Then they turn round and hold a small hand mirror up. A dotted line follows their gaze from the hand mirror to the big mirror, which shows the back of the neck, shoulders and back. The shoulders, neck and arms, where the sun reaches, are ringed for extra care.',
      'Valoisa huone, jossa on ikkuna, pitkä peili ja shortseihin pukeutunut henkilö sen edessä. Ensin hän katsoo vartalonsa etupuolta peilistä päästä jalkoihin, ja valokaista liukuu heijastuksen yli. Sitten hän kääntyy ympäri ja nostaa pienen käsipeilin. Pisteviiva seuraa katsetta käsipeilistä isoon peiliin, jossa näkyvät niska, hartiat ja selkä. Hartiat, niska ja kädet, joihin aurinko osuu, on ympyröity.',
      'Ett ljust rum med fönster, en helkroppsspegel och en person i shorts framför den. Först tittar personen på kroppens framsida från topp till tå medan ett ljusband sveper nedför spegelbilden. Sedan vänder hen sig om och håller upp en liten handspegel. En prickad linje följer blicken från handspegeln till den stora spegeln, som visar nacke, axlar och rygg. Axlar, nacke och armar, dit solen når, är ringade.'
    ],
    draw: function (c) {
      var s = '', MX = 130, MY = 20, MW = 96, MH = 300, FX = 74, FY = 116, FS = .62, RS = .46, RX = 48, RY = 94;
      var fg = skFigs(c);
      s += K.room({ kind: 'wall' });
      s += skWindow(c, 12, 16, 46, 54);
      var backR = fg.back('translate(' + RX + ' ' + RY + ') scale(' + RS + ')'), frontR = fg.front('translate(' + RX + ' ' + RY + ') scale(' + RS + ')');
      /* the mirror and what is in it */
      var rClipF = skBodyClip(c, 'rcf', 140, 'translate(' + (MX + RX) + ' ' + (MY + RY) + ') scale(' + RS + ')');
      var glass = '';
      var map = K.mapper({ x: FX, y: FY, s: FS });
      var mapR = function (p) { return [MX + RX + p[0] * RS, MY + RY + p[1] * RS]; };
      var hmP = K.armPoints({ side: 'r', upper: 55, fore: -150 });                       /* the raised arm, in body coordinates */
      var dir = Math.atan2(hmP.W[0] - hmP.E[0], -(hmP.W[1] - hmP.E[1])), ang = hmP.angle;
      var gc = [hmP.W[0] + Math.sin(dir) * 91, hmP.W[1] - Math.cos(dir) * 91];            /* centre of the small mirror's glass */
      var raised = K.arm({ side: 'r', upper: 55, fore: -150 }) + K.place({ x: gc[0], y: gc[1], r: ang, s: 1.1 }, K.handMirror({ content: '<g transform="translate(0 6) scale(.17)">' + fg.back('translate(0 40)') + '</g>' })) +
        K.hand({ pose: 'grip', x: hmP.W[0], y: hmP.W[1], r: ang, flip: false, s: .95 });
      /* the person in the room: from the back, then from the front holding the small mirror */
      var backP = fg.back('translate(' + FX + ' ' + FY + ') scale(' + FS + ')');
      var frontP = fg.frontBase('translate(' + FX + ' ' + FY + ') scale(' + FS + ')', raised);
      var scanF = skBand(c, 3.6, 6.2, MX, MY + 50, MY + 238, MW, { clip: rClipF, op: .7, key: 'f', h: 46 });
      var backClip = skBodyClip(c, 'rcb', 140, 'translate(' + (MX + RX) + ' ' + (MY + RY) + ') scale(' + RS + ')');
      var scanB = skBand(c, 9.8, 12.2, MX, MY + 50, MY + 238, MW, { clip: backClip, op: .7, key: 'b', h: 46 });
      var rings = '';
      [[-60, 12, 18], [60, 12, 18], [0, -22, 16]].forEach(function (r) { var p = mapR([r[0], r[1]]); rings += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (r[2] * .78) + '" class="st-ring-dash"/>'; });
      var glassClip = c.id('gl');
      c.defs('<clipPath id="' + glassClip + '"><path d="' + K.rr(MX, MY, MW, MH, 10) + '"/></clipPath>');
      var mir = K.wallMirror({ x: MX, y: MY, w: MW, h: MH, content: '' });
      var inGlass = function (inner) { return '<g clip-path="url(#' + glassClip + ')">' + inner + '</g>'; };
      var reflFrontLayer = '<g transform="translate(' + MX + ' ' + MY + ')">' + frontR + '</g>', reflBackLayer = '<g transform="translate(' + MX + ' ' + MY + ')">' + backR + '</g>';
      var dark = '<rect x="' + MX + '" y="' + MY + '" width="' + MW + '" height="' + MH + '" fill="url(#k-streak)" opacity=".8"/>';
      s += mir;
      if (c.still) {
        s += inGlass(reflBackLayer + scanB) + dark;
        s += frontP;
      } else {
        s += inGlass(c.fade([[0, 1], [6.0, 1], [6.5, 0], [12.4, 0], [12.9, 1]], reflFrontLayer + scanF) + c.fade([[0, 0], [6.0, 0], [6.5, 1], [12.4, 1], [12.9, 0]], reflBackLayer + scanB)) + dark;
        s += c.anim([{ t: 0, sx: 1, o: 1 }, { t: 5.8, sx: 1 }, { t: 6.3, sx: .04 }, { t: 6.32, o: 0 }, { t: 12.48, o: 0 }, { t: 12.5, o: 1 }, { t: 13.1, sx: 1 }], backP, { pivot: [FX, 0] });
        s += c.anim([{ t: 0, sx: .04, o: 0 }, { t: 6.3 }, { t: 6.32, o: 1 }, { t: 6.9, sx: 1 }, { t: 12.0, sx: 1 }, { t: 12.5, sx: .04 }, { t: 12.52, o: 0 }], frontP, { pivot: [FX, 0] });
      }
      /* the sight line: eye, small mirror, big mirror */
      var eye = map([6, -100]), gm = map(gc), tgt = mapR([0, -8]);
      var sight = 'M' + f1(eye[0]) + ' ' + f1(eye[1]) + 'L' + f1(gm[0]) + ' ' + f1(gm[1]) + 'L' + f1(tgt[0]) + ' ' + f1(tgt[1]);
      s += c.show(9.6, 13, c.draw(sight, 9.7, 11, 'class="st-leader"', { until: 12.6 }) + rings, { fade: .4, hold: false });
      if (c.still) s += rings;
      /* labels */
      var cl = '', NX = 247, gp = K.mapper({ x: FX, y: FY, s: FS })(gc);
      cl += skNote(c, 0, tr('Big\nmirror', 'Iso\npeili', 'Stor\nspegel'), NX, 40, [MX + MW + 8, 62]) + skNote(c, 0, tr('Bright\nlight', 'Hyvä\nvalo', 'Bra\nljus'), 36, 100, [34, 76], { at: 'middle', mk: false });
      cl += skNote(c, 1, tr('Front,\ntop to toe', 'Etupuoli,\npäästä\njalkoihin', 'Framsida,\ntopp\ntill tå'), NX, 108, c.still ? [MX + MW / 2 + 22, 252] : [MX + MW - 14, 130]);
      cl += skNote(c, 2, tr('Small\nmirror', 'Pieni\npeili', 'Liten\nspegel'), NX, 174, null) + c.phaseShow(2, '<g transform="translate(' + f1(gp[0] + 24) + ' ' + f1(gp[1] - 22) + ')">' + c.marker(2, 0, 0, 11) + '</g>', { fade: .3 });
      cl += skNote(c, 3, tr('Sun-\nexposed\nskin', 'Auringon\nosuma-\nalueet', 'Solutsatt\nhud'), NX, 240, mapR([60, 12]), { tone: 'warn' });
      cl += c.phaseShow(3, skSun(312, 282, 15), { fade: .3 });
      if (c.still) s += K.lens(MX + MW / 2, 256, 27, '<g transform="translate(0 -8) scale(.25)">' + fg.front('') + '</g>', {});
      s += cl;
      return s;
    }
  });

  /* Scale and move an absolute path (M L C Q only), so a trail can be drawn at true line width in the scene instead of inside a scaled group. */
  function skMapPath(d, sc, tx, ty) {
    return String(d).replace(/([MLCQ])([^MLCQ]*)/g, function (m, cmd, nums) {
      var v = nums.trim().split(/[ ,]+/).map(Number), o = [];
      for (var i = 0; i < v.length; i += 2) o.push(f1(tx + v[i] * sc) + ' ' + f1(ty + v[i + 1] * sc));
      return cmd + o.join(' ');
    });
  }
  /* The still frame lists the insets of a scene as small tiles in a column: tile k (0 to 3), its picture (drawn about the origin, scaled), a label and the phase badge. */
  function skTile(c, k, x, y, w, h, content, scale, label, o) {
    o = o || {};
    var id = c.id('tl' + k);
    return '<g transform="translate(' + x + ' ' + y + ')"><clipPath id="' + id + '"><path d="' + K.rr(0, 0, w, h, 12) + '"/></clipPath><path d="' + K.rr(0, 0, w, h, 12) + '" fill="var(--st-lens-bg)"/><g clip-path="url(#' + id + ')"><g transform="translate(' + (o.cx == null ? w / 2 : o.cx) + ' ' + (o.cy == null ? h / 2 : o.cy) + ') scale(' + scale + ')">' + content + '</g></g><path d="' + K.rr(0, 0, w, h, 12) + '" fill="none" stroke="' + (o.tone === 'warn' ? 'var(--st-warn)' : 'var(--st-contour)') + '" stroke-width="' + (o.tone === 'warn' ? 2 : 1.2) + '"/>' +
      K.callout(label, [w / 2, h - 14 - (String(label).indexOf('\n') >= 0 ? 8 : 0)], null, { size: 12 }) + '<g transform="translate(14 14)">' + c.marker(k, 0, 0, 10.5) + '</g></g>';
  }
  /* A fingertip approaching from below: the tip at the origin, the finger running down the page (+y). Rotate it with K.place. */
  function skFinger(len, w) {
    len = len || 52; w = w || 13;
    var r = w / 2, d = 'M' + -r + ' ' + len + 'L' + -r + ' ' + r + 'A' + r + ' ' + f1(r * 1.15) + ' 0 0 1 ' + r + ' ' + r + 'L' + r + ' ' + len + 'Z';
    var nl = 'M' + f1(-r * .66) + ' ' + f1(r * 2.4) + 'L' + f1(-r * .7) + ' ' + f1(r * .9) + 'Q' + f1(-r * .55) + ' ' + f1(-r * .1) + ' 0 ' + f1(-r * .12) + 'Q' + f1(r * .55) + ' ' + f1(-r * .1) + ' ' + f1(r * .7) + ' ' + f1(r * .9) + 'L' + f1(r * .66) + ' ' + f1(r * 2.4) + 'Z';
    return '<path d="' + d + '" fill="url(#k-skin-h)"/><path d="' + d + '" fill="url(#k-sh-edge-h)" opacity=".7"/><path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>' +
      '<path d="' + nl + '" fill="url(#k-nail)"/><path d="' + nl + '" class="st-contour" stroke-opacity=".8" stroke-width=".7"/><ellipse cx="' + f1(-r * .25) + '" cy="' + f1(r * .9) + '" rx="' + f1(r * .2) + '" ry="' + f1(r * .5) + '" fill="#fff" opacity=".55"/>';
  }
  /* a plain crew-neck top and the neck and shoulders under a head (head units, origin at the chin) */
  function skNeckTop() {
    var nk = 'M-17 -14L-18 12C-32 16 -62 24 -96 44L96 44C62 24 32 16 18 12L17 -14Z', tee = 'M-21 14C-12 25 12 25 21 14C42 20 70 28 96 44L-96 44C-70 28 -42 20 -21 14Z';
    return '<path d="' + nk + '" fill="url(#k-skin)"/><path d="' + nk + '" fill="url(#k-sh-edge-h)"/>' + K.contact(0, 4, 20, 8, .7) + K.glint(-10, 2, 7, 10, 0, .35) + '<path d="' + nk + '" class="st-contour" stroke-opacity=".7" stroke-width=".5"/>' + K.cloth(tee, { kind: 'sheet-tint', fibre: false }) + '<path d="M-21 14C-12 25 12 25 21 14" fill="none" stroke="var(--st-sheet-d)" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>';
  }
  /* a bigger, better ear for the side view, drawn over the hair (head units, origin at the chin) */
  function skEarSide() {
    var d = 'M-8 -54C-18 -60 -30 -52 -29 -38C-28 -28 -23 -20 -17 -21C-13 -22 -11 -26 -10 -31C-9 -38 -3 -49 -8 -54Z';
    return K.softShadow(d, { dx: 1.2, dy: 2, blur: 2, op: .3 }) + '<path d="' + d + '" fill="url(#k-skin-dome)"/><path d="' + d + '" fill="url(#k-sh-edge-h)" opacity=".5"/>' +
      '<path d="M-9 -49C-15 -52 -25 -48 -24 -38C-23 -31 -20 -27 -16 -28" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".32" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M-10 -45C-15 -46 -20 -42 -19 -37C-18 -33 -16 -32 -14 -33C-12 -35 -12 -40 -10 -45Z" fill="rgb(var(--st-shadow))" fill-opacity=".22"/>' +
      '<path d="M-26 -46C-27 -42 -26 -40 -25 -37" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.3" stroke-linecap="round"/>' +
      '<ellipse cx="-17" cy="-24.5" rx="3.6" ry="2.6" fill="url(#k-hi-r)" opacity=".5"/><path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".8"/>';
  }
  var HDP = 'M0 -86C17 -86 29 -70 29 -48C29 -26 20 -8 9 -3C5 -1 2 0 0 0C-2 0 -5 -1 -9 -3C-20 -8 -29 -26 -29 -48C-29 -70 -17 -86 0 -86Z';

  /* ---------- s-sk-head: face, ears and scalp ---------- */
  stage.define('s-sk-head', {
    dur: 13,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Part your hair with a comb, row by row, to see your scalp', 'Jaa hiukset kammalla rivi riviltä, niin näet päänahan', 'Dela håret med en kam, rad för rad, så att du ser hårbotten'] },
      { at: 3.6, cap: ['Trace around and behind each ear with a fingertip', 'Kierrä sormenpäällä jokaisen korvan ympäri ja takaa', 'Följ runt och bakom varje öra med fingertoppen'] },
      { at: 6.8, cap: ['Look over your face: forehead, nose, lips and mouth', 'Tarkista kasvot: otsa, nenä, huulet ja suu', 'Titta över ansiktet: panna, näsa, läppar och mun'] },
      { at: 10, cap: ['Look and feel for rough, scaly patches and for sores that do not heal', 'Katso ja tunnustele karheita, hilseileviä läiskiä ja haavoja, jotka eivät parane', 'Titta och känn efter skrovliga, fjällande fläckar och sår som inte läker'] }
    ],
    desc: [
      'A large head seen from the front, then from the side, with the neck and a plain top. A comb parts the hair in three rows over the crown while a round inset shows the head from above with the scalp showing in each parting. Then a fingertip traces around and behind the ear in a close-up. A band of light moves over the forehead, nose, lips and mouth with a magnified view of the nose and lips. Finally two close-ups show a rough, scaly patch and a sore that does not heal. Any change is worth showing to a doctor.',
      'Suuri pää edestä ja sitten sivulta, kaulalla yksinkertainen paita. Kampa jakaa hiukset kolmeen riviin päälaella, ja pyöreä kuva näyttää pään ylhäältä niin, että päänahka näkyy jokaisessa jakauksessa. Sitten sormenpää kiertää korvan ympäri ja taakse lähikuvassa. Valokaista liikkuu otsan, nenän, huulten ja suun yli, ja suurennos näyttää nenän ja huulet. Lopuksi kaksi lähikuvaa näyttää karhean hilseilevän läiskän ja haavan, joka ei parane. Mikä tahansa muutos kannattaa näyttää lääkärille.',
      'Ett stort huvud framifrån och sedan från sidan, med hals och en enkel tröja. En kam delar håret i tre rader över hjässan medan en rund bild visar huvudet uppifrån med hårbotten synlig i varje bena. Sedan följer en fingertopp runt och bakom örat i en närbild. Ett ljusband rör sig över pannan, näsan, läpparna och munnen med en förstoring av näsa och läppar. Till sist visar två närbilder en skrovlig, fjällande fläck och ett sår som inte läker. Varje förändring är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', HS = 2.3, HX = 112, HY = 254, T = 'translate(' + HX + ' ' + HY + ') scale(' + HS + ')', i;
      var Hp = function (x, y) { return [f1(HX + x * HS), f1(HY + y * HS)]; };
      var hd = skDef(c, 'hd', K.head({ hair: 'short', eyes: 'open' })), hsd = skDef(c, 'hs', K.head({ view: 'side', hair: 'short' })), cb = skDef(c, 'cb', K.comb({}));
      s += K.room({ kind: 'wall' });
      /* a hint of the mirror frame behind the head */
      s += '<path d="' + K.rr(18, 18, 188, 300, 14) + '" fill="url(#k-mirror)" opacity=".5"/><path d="' + K.rr(18, 18, 188, 300, 14) + '" fill="none" stroke="var(--st-frame)" stroke-width="5" opacity=".9"/><path d="' + K.rr(18, 18, 188, 300, 14) + '" fill="url(#k-streak)" opacity=".7"/>';
      var neck = '<g transform="' + T + '">' + skNeckTop() + '</g>';
      var front = '<g transform="' + T + '">' + hd() + '</g>';
      var side = '<g transform="' + T + '">' + hsd() + skEarSide() + '</g>';
      /* the hair partings on the crown (head units) and the comb */
      var rows = ['M-22 -76C-10 -83 10 -83 22 -76', 'M-23 -82C-11 -89 11 -89 23 -82', 'M-20 -70C-9 -76 9 -76 20 -70'];
      var tms = [[.6, 1.5], [1.6, 2.5], [2.6, 3.4]];
      var part = '', combs = '';
      rows.forEach(function (d, k) {
        part += c.draw(d, tms[k][0], tms[k][1], 'fill="none" stroke="var(--st-sk-a)" stroke-width="1.9" stroke-linecap="round" stroke-opacity=".95"', { until: 3.4, ease: 'linear' });
        var pr = d.match(/-?[0-9.]+/g).map(Number); combs += c.show(tms[k][0] - .2, tms[k][1] + .25, c.anim([{ t: tms[k][0], x: pr[0], y: pr[1] }, { t: tms[k][1], x: pr[pr.length - 2], y: pr[pr.length - 1], ease: 'linear' }], cb('scale(.36)'), {}), { fade: .2 });
      });
      if (c.still) combs = cb('translate(12 -78) scale(.36)');
      var partG = '<g transform="' + T + '">' + part + combs + '</g>';
      /* the main head: front in phases 0, 2, 3, side in phase 1 */
      if (c.still) {
        s += neck + front + partG;
      } else {
        s += neck;
        s += c.anim([{ t: 0, sx: 1, o: 1 }, { t: 3.4, sx: 1 }, { t: 3.9, sx: .55 }, { t: 3.92, o: 0 }, { t: 6.5, o: 0 }, { t: 6.52, o: 1 }, { t: 7.0, sx: 1 }], front + partG, { pivot: [HX, 0] });
        s += c.anim([{ t: 0, sx: .55, o: 0 }, { t: 3.9 }, { t: 3.92, o: 1 }, { t: 4.4, sx: 1 }, { t: 6.2, sx: 1 }, { t: 6.5, sx: .55 }, { t: 6.52, o: 0 }], side, { pivot: [HX, 0] });
      }
      /* phase 1: the finger traces around the ear (head units; the ear of the side head is at about (-15, -40)) */
      var ear = 'M-6 -52C-12 -62 -28 -58 -30 -44C-32 -32 -28 -24 -20 -22C-14 -21 -10 -26 -9 -30';
      var earS = skMapPath(ear, HS, HX, HY), finger = c.move(earS, 4.5, 6.2, '<g transform="rotate(32) scale(.62)">' + skFinger(70, 16) + '</g>', { ease: 'inOut' });
      s += c.show(4.2, 6.7, K.trail(c, earS, 4.5, 6.2, { tipR: 5, until: 6.4, stillAt: .55, tip: false }) + finger, { fade: .3, still: false });
      if (c.still) { var ep = Hp(-30, -40); s += '<ellipse cx="' + ep[0] + '" cy="' + ep[1] + '" rx="15" ry="26" class="st-ring-dash"/>'; }
      /* phase 2: the band of light over the face, rings on the nose and the lips */
      c.defs('<clipPath id="' + c.id('fc2') + '"><path d="' + HDP + '" transform="' + T + '"/></clipPath>');
      s += skBand(c, 7.0, 9.8, 40, HY - 200, HY + 6, 160, { clip: c.ref('fc2'), op: .6, key: 'h', h: 40, stillAt: .55 });
      var nose = Hp(0, -33), lips = Hp(0, -15);
      s += c.show(7.4, 10, c.pulse(7.4, 10, '<ellipse cx="' + nose[0] + '" cy="' + nose[1] + '" rx="19" ry="23" class="st-ring-dash"/><ellipse cx="' + lips[0] + '" cy="' + lips[1] + '" rx="25" ry="13" class="st-ring-dash"/>', { count: 3, scale: 1.07 }), { fade: .3 });
      /* phase 3: a ring on a scaly patch on the cheek */
      var ch = Hp(-17, -31);
      var patch = '<g transform="' + T + '"><ellipse cx="-17" cy="-31" rx="6.4" ry="5" fill="var(--st-rd)" opacity=".28" filter="url(#k-b1)"/><ellipse cx="-17" cy="-31" rx="5.6" ry="4.2" fill="#fff" opacity=".16"/><path d="M-20 -33l2-1.4 1.6 1.8-2 .8zM-16.6 -29.6l2.2-.8.8 1.8-2.2.6zM-19.5 -29.5l1.8-.2.2 1.6-1.8.1zM-14.6 -33.4l1.8.4-.6 1.6z" fill="#fff" opacity=".55"/></g>';
      s += c.show(10.2, 13, patch, { fade: .4, hold: true });
      s += c.show(10.6, 13, c.pulse(10.6, 13, '<circle cx="' + ch[0] + '" cy="' + ch[1] + '" r="22" class="st-ring" style="stroke:var(--st-warn)"/>', { count: 3, scale: 1.08 }), { fade: .3, hold: true });

      /* ----- the right column: one inset per phase ----- */
      var LX = 290, LY = 112, LR = 64;
      /* 0: the head from above, partings row by row */
      var top = '', hairD = 'M0 -52C30 -52 44 -26 44 4C44 38 28 54 0 54C-28 54 -44 38 -44 4C-44 -26 -30 -52 0 -52Z';
      top += '<rect x="-80" y="-80" width="160" height="160" fill="var(--st-lens-bg)"/><ellipse cx="-44" cy="6" rx="8" ry="14" fill="url(#k-skin-dome)"/><ellipse cx="44" cy="6" rx="8" ry="14" fill="url(#k-skin-dome)"/>';
      top += '<path d="M-6 54C-8 62 8 62 6 54Z" fill="url(#k-skin-dome)"/>';
      top += K.softShadow(hairD, { dx: 3, dy: 5, blur: 3, op: .3 }) + '<path d="' + hairD + '" fill="url(#k-hair)"/><path d="' + hairD + '" fill="url(#k-hi-tl)" opacity=".6"/>';
      var rnd = K.rnd(4), st = '';
      for (i = 0; i < 70; i++) { var a = rnd() * 6.283, rr_ = 6 + rnd() * 42, x0 = Math.cos(a) * rr_ * .85 + 6, y0 = Math.sin(a) * rr_ * 1.02 - 4, a2 = a + .5; st += 'M' + f1(x0) + ' ' + f1(y0) + 'l' + f1(Math.cos(a2) * 7) + ' ' + f1(Math.sin(a2) * 7); }
      top += '<path d="' + st + '" fill="none" stroke="#fff" stroke-opacity=".13" stroke-width=".8"/><path d="' + st + '" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".6" transform="translate(.8 .8)"/>';
      var ptop = '', ctop = '', trows = ['M-36 -26C-12 -34 12 -34 36 -26', 'M-40 -10C-14 -18 14 -18 40 -10', 'M-40 8C-14 0 14 0 40 8', 'M-36 26C-12 18 12 18 36 26'];
      var ttm = [[.5, 1.4], [1.3, 2.2], [2.1, 3.0], [2.9, 3.6]];
      trows.forEach(function (d, k) {
        ptop += c.draw(d, ttm[k][0], ttm[k][1], 'fill="none" stroke="var(--st-sk-a)" stroke-width="3.4" stroke-linecap="round"', { until: 3.4, ease: 'linear' });
        var pq = d.match(/-?[0-9.]+/g).map(Number); ctop += c.show(ttm[k][0] - .2, ttm[k][1] + .2, c.anim([{ t: ttm[k][0], x: pq[0], y: pq[1] }, { t: ttm[k][1], x: pq[pq.length - 2], y: pq[pq.length - 1], ease: 'linear' }], cb('scale(.5)'), {}), { fade: .2 });
      });
      if (c.still) ctop = cb('translate(14 6) scale(.5)');
      top += ptop + ctop;
      var tiles = '';
      if (c.still) tiles += skTile(c, 0, 226, 12, 128, 64, top, .52, tr('From above', 'Ylhäältä', 'Uppifrån'));
      else s += c.show(0, 3.6, K.lens(LX, LY, LR, top, { label: tr('From above', 'Ylhäältä', 'Uppifrån') }), { fade: .35 });
      /* 1: behind the ear */
      var be = K.skinPatch({ x: -70, y: -70, w: 140, h: 140, r: 0, seed: 14, lite: true });
      be += '<path d="M-70 -70L-6 -70C-4 -30 -6 20 -12 70L-70 70Z" fill="url(#k-hair)"/><path d="M-70 -70L-6 -70C-4 -30 -6 20 -12 70L-70 70Z" fill="url(#k-hi-tl)" opacity=".5"/>';
      var strands = ''; for (i = 0; i < 26; i++) strands += 'M' + f1(-70 + i * 2.6) + ' -70C' + f1(-66 + i * 2.3) + ' -30 ' + f1(-64 + i * 2.2) + ' 10 ' + f1(-62 + i * 1.6) + ' 70';
      be += '<path d="' + strands + '" fill="none" stroke="#fff" stroke-opacity=".09" stroke-width=".8"/>';
      var earD = 'M4 -52C34 -62 62 -30 54 8C48 36 28 56 8 60C-6 62 -10 50 -6 40C0 24 -6 -10 4 -52Z';
      be += K.softShadow(earD, { dx: 3, dy: 5, blur: 3, op: .3 }) + '<path d="' + earD + '" fill="url(#k-skin-dome)"/><path d="' + earD + '" fill="url(#k-sh-edge-h)" opacity=".6"/>';
      be += '<path d="M12 -38C34 -42 48 -20 42 6C38 24 26 38 14 44" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/><path d="M14 -30C30 -32 40 -14 36 4" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/><path d="' + earD + '" class="st-contour" stroke-opacity="1" stroke-width="1"/>';
      be += K.trail(c, 'M-4 -54C-14 -24 -16 14 -10 54', 4.6, 6.2, { tipR: 6, until: 6.4, stillAt: .45 });
      if (c.still) tiles += skTile(c, 1, 226, 80, 128, 64, be, .5, tr('Behind the ear', 'Korvan takana', 'Bakom örat'));
      else s += c.show(3.6, 6.8, K.lens(LX, LY, LR, be, { label: tr('Behind the ear', 'Korvan takana', 'Bakom örat') }), { fade: .35 });
      /* 2: nose and lips, magnified */
      var nl = '<rect x="-80" y="-80" width="160" height="160" fill="var(--st-lens-bg)"/><g transform="translate(0 78) scale(3.4)">' + hd() + '</g>';
      nl += c.show(7.6, 10, c.pulse(7.6, 10, '<ellipse cx="0" cy="-12" rx="22" ry="17" class="st-ring-dash"/><ellipse cx="0" cy="38" rx="36" ry="17" class="st-ring-dash"/>', { count: 3, scale: 1.06 }), { fade: .3 });
      if (c.still) tiles += skTile(c, 2, 226, 148, 128, 64, nl, .5, tr('Nose and lips', 'Nenä ja huulet', 'Näsa och läppar'));
      else s += c.show(6.8, 10, K.lens(LX, LY, LR, nl, { label: tr('Nose and lips', 'Nenä ja huulet', 'Näsa och läppar') }), { fade: .35 });
      /* 3: the two signs to look for */
      var pw = 126, ph = 116;
      var sc = K.skinPatch({ w: pw, h: ph, seed: 31, lite: true });
      var scale = 'M30 52C28 32 52 20 74 26C96 32 106 52 94 70C84 86 52 90 38 78C32 72 31 62 30 52Z';
      sc += '<path d="' + scale + '" fill="var(--st-rd)" opacity=".26" filter="url(#k-b2)"/><path d="' + scale + '" fill="#fff" opacity=".14"/>';
      var rr2 = K.rnd(9), fl = ''; for (i = 0; i < 26; i++) { var fx = 36 + rr2() * 58, fy = 30 + rr2() * 52, fs = 2 + rr2() * 3.4; fl += 'M' + f1(fx) + ' ' + f1(fy) + 'l' + f1(fs) + ' ' + f1(-fs * .5) + 'l' + f1(fs * .3) + ' ' + f1(fs * .9) + 'l' + f1(-fs * .8) + ' ' + f1(fs * .4) + 'z'; }
      sc += '<path d="' + fl + '" fill="#fff" fill-opacity=".72" stroke="rgb(var(--st-shadow))" stroke-opacity=".2" stroke-width=".4"/>';
      sc += '<g transform="translate(86 56) rotate(-18)">' + c.anim([{ t: 10.5, x: 0, y: 0 }, { t: 11.2, x: -22, y: 10 }, { t: 11.9, x: 0, y: -4 }, { t: 12.4, x: -18, y: 8 }], K.place({ s: .5 }, skFinger(70, 16)), {}) + '</g>';
      var so = K.skinPatch({ w: pw, h: ph, seed: 33, lite: true });
      var sore = 'M46 56C46 40 66 34 80 42C94 50 92 70 78 78C64 84 46 74 46 56Z';
      so += '<path d="' + sore + '" transform="translate(-24 -20) scale(1.35)" fill="var(--st-rd)" opacity=".3" filter="url(#k-b3)"/><path d="' + sore + '" fill="#B8454B"/><path d="' + sore + '" fill="url(#k-sh-br)"/><path d="M58 52C64 46 76 48 80 56C82 64 72 70 64 66C58 62 54 58 58 52Z" fill="#7C2A2C"/><path d="M60 54C64 50 72 51 75 56" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round"/><path d="' + sore + '" class="st-contour" stroke-opacity="1"/>';
      so += '<ellipse cx="70" cy="42" rx="16" ry="4" fill="url(#k-hi-r)" opacity=".5"/>';
      var pnl = function (id, inner, y, label) {
        return '<g transform="translate(0 ' + y + ')"><clipPath id="' + id + '"><path d="' + K.rr(0, 0, pw, ph, 12) + '"/></clipPath><path d="' + K.rr(0, 0, pw, ph, 12) + '" fill="var(--st-lens-bg)"/><g clip-path="url(#' + id + ')"><g transform="translate(0 -9)">' + inner + '</g></g><path d="' + K.rr(0, 0, pw, ph, 12) + '" fill="none" stroke="var(--st-warn)" stroke-width="2"/>' + K.callout(label, [pw / 2, ph - 17], null, { size: 12.5 }) + '</g>';
      };
      var cmp2 = '<g transform="translate(226 14)">' + pnl(c.id('p1'), sc, 0, tr('Rough, scaly\npatch', 'Karhea,\nhilseilevä läiskä', 'Skrovlig,\nfjällande fläck')) + pnl(c.id('p2'), so, ph + 12, tr('Sore that does\nnot heal', 'Haava, joka\nei parane', 'Sår som\ninte läker')) + '</g>';
      if (c.still) tiles += skTile(c, 3, 226, 216, 128, 74, '<g transform="translate(-126 -58)">' + sc + '</g><g transform="translate(3 -58)">' + so + '</g>', .5, tr('Scaly patch\nor sore', 'Hilseilevä läiskä\ntai haava', 'Fjällande fläck\neller sår'), { tone: 'warn', cx: 64, cy: 33 });
      else s += c.show(10, 13, cmp2, { fade: .4, hold: true });
      s += tiles;
      /* the number of the phase */
      for (i = 0; i < 4; i++) if (!c.still) s += c.phaseShow(i, '<g transform="translate(34 38)">' + c.marker(i, 0, 0, 11) + '</g>', { fade: .3 });
      return s;
    }
  });

  /* A fingertip seen from the back, pointing up, centred on the middle of the nail (about +-70 units). streak: a dark line from the cuticle to the tip. */
  function skNail(streak) {
    var s = '', fd = 'M-42 84L-42 -22C-42 -56 -26 -76 0 -76C26 -76 42 -56 42 -22L42 84Z';
    s += '<path d="' + fd + '" fill="url(#k-skin-h)"/><path d="' + fd + '" fill="url(#k-sh-edge-h)"/>';
    s += '<path d="M-30 52q30 -7 60 0M-32 62q32 -6 64 0M-26 71q26 -5 52 0" class="st-crease" stroke-opacity=".28" stroke-width="1.1"/>';
    s += '<path d="M-42 -22C-42 -56 -26 -76 0 -76C26 -76 42 -56 42 -22" class="st-contour" stroke-opacity="1" stroke-width="1.2"/>';
    var nd = 'M-23 -52C-23 -64 -12 -68 0 -68C12 -68 23 -64 23 -52L23 -2C23 14 12 20 0 20C-12 20 -23 14 -23 -2Z';
    s += '<path d="' + nd + '" transform="translate(1.5 3)" fill="rgb(var(--st-shadow))" opacity=".22" filter="url(#k-b1)"/><path d="' + nd + '" fill="url(#k-nail)"/>';
    s += '<path d="M-23 -44C-12 -50 12 -50 23 -44L23 -52C23 -64 12 -68 0 -68C-12 -68 -23 -64 -23 -52Z" fill="#fff" opacity=".45"/>';
    s += '<path d="M-14 12C-12 -4 12 -4 14 12C6 20 -6 20 -14 12Z" fill="#fff" opacity=".5"/>';
    if (streak) s += '<path d="M-3.4 -62L3.2 -62L5.4 14L-5.4 14Z" fill="#2A1A14" opacity=".88" filter="url(#k-b1)"/><path d="M-2 -62L2 -62L3 12L-3 12Z" fill="#150C09" opacity=".6"/>';
    s += '<path d="M-17 -56C-18 -30 -18 -8 -16 6" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3.4" stroke-linecap="round" filter="url(#k-b1)"/><path d="M8 -58C10 -34 10 -14 9 0" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>';
    s += '<path d="' + nd + '" class="st-contour" stroke-opacity="1" stroke-width="1"/>';
    s += '<path d="M-27 6C-18 22 18 22 27 6C20 30 -20 30 -27 6Z" fill="url(#k-skin-h)"/><path d="M-27 6C-18 22 18 22 27 6" class="st-crease" stroke-opacity=".5" stroke-width="1.1"/><path d="M-26 8C-17 24 17 24 26 8" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1"/>';
    s += '<path d="M-23 -50L-23 0M23 -50L23 0" class="st-crease" stroke-opacity=".3" stroke-width="1.4"/>';
    return s;
  }
  /* two fingers and the web of skin between them, pointing up (about +-70 units) */
  function skWeb() {
    var s = '';
    s += K.limb([-26, 80], [-40, -70], 40, 34, { bulge: .02 }) + K.limb([26, 80], [40, -70], 40, 34, { bulge: .02 });
    s += '<path d="M-6 80C-6 40 -2 20 0 20C2 20 6 40 6 80Z" fill="url(#k-skin-soft)"/>';
    s += '<path d="M-22 70C-16 20 -6 6 0 6C6 6 16 20 22 70L22 86L-22 86Z" fill="url(#k-skin-soft)"/><path d="M-4 -20C-3 -4 -2 4 0 8C2 4 3 -4 4 -20Z" fill="rgb(var(--st-shadow))" opacity=".2" filter="url(#k-b2)"/>';
    s += '<path d="M-22 70C-16 20 -6 6 0 6C6 6 16 20 22 70" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".3" stroke-width="1.6"/><path d="M-14 38C-8 30 8 30 14 38" class="st-crease" stroke-opacity=".3"/>';
    s += '<path d="M-22 -4q22 -6 36 0M-22 6q8 -3 16 0" class="st-crease" stroke-opacity=".18"/>';
    return s;
  }

  /* ---------- s-sk-hands: both sides of the hands, between the fingers, every nail ---------- */
  stage.define('s-sk-hands', {
    dur: 13,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Look at the back and the palm of each hand', 'Katso kummankin käden selkäpuolta ja kämmentä', 'Titta på handryggen och handflatan på varje hand'] },
      { at: 3.2, cap: ['Spread your fingers and look in between', 'Levitä sormet ja katso niiden väliin', 'Sära på fingrarna och titta emellan'] },
      { at: 6.4, cap: ['Look at every nail, on your fingers and your toes', 'Katso jokaista kynttä, sormissa ja varpaissa', 'Titta på varje nagel, på fingrar och tår'] },
      { at: 9.6, cap: ['A dark streak under a nail that did not come from an injury is worth showing to a doctor', 'Tumma juova kynnen alla, joka ei johdu vammasta, kannattaa näyttää lääkärille', 'En mörk rand under nageln som inte kommer av en skada är värd att visa för en läkare'] }
    ],
    desc: [
      'Two hands in front of a plain wall: the back of one hand and the palm of the other, each with a cuff. A band of light sweeps over them while a curved arrow shows turning the hands over. Rings mark the four gaps between the fingers, with a close-up of the skin between two fingers. Then rings mark each nail with a close-up of a healthy nail. Finally a healthy nail is compared with a nail that has a dark streak running from the cuticle to the tip: a streak that did not come from an injury is worth showing to a doctor.',
      'Kaksi kättä tavallisen seinän edessä: toisen käden selkäpuoli ja toisen kämmen, kummassakin hihansuu. Valokaista liukuu niiden yli, ja kaareva nuoli näyttää käsien kääntämisen. Renkaat merkitsevät sormien neljää väliä, ja lähikuva näyttää ihon kahden sormen välissä. Sitten renkaat merkitsevät jokaisen kynnen ja lähikuva näyttää terveen kynnen. Lopuksi terveen kynnen rinnalla on kynsi, jossa on tumma juova kynsinauhasta kärkeen: vammasta johtumaton juova kannattaa näyttää lääkärille.',
      'Två händer framför en enkel vägg: handryggen på den ena och handflatan på den andra, båda med manschett. Ett ljusband sveper över dem medan en böjd pil visar hur händerna vänds. Ringar markerar de fyra mellanrummen mellan fingrarna, med en närbild av huden mellan två fingrar. Sedan markerar ringar varje nagel med en närbild av en frisk nagel. Till sist jämförs en frisk nagel med en nagel som har en mörk rand från nagelbandet till spetsen: en rand som inte kommer av en skada är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', i, still = c.still, HP = still ? { x: 72, y: 238, s: 1.6 } : { x: 126, y: 252, s: 3.0 };
      var hs = HP.s, mD = K.mapper({ x: HP.x, y: HP.y, s: hs * K.HAND });
      s += K.room({ kind: 'wall' });
      var forearm = function (x, y) { return K.limb([x, y - 4], [x, y + 80], 30 * hs / 1.7 + 4, 36 * hs / 1.7 + 4, { bulge: .02 }); };
      var dorsal = K.hand({ pose: 'open', x: HP.x, y: HP.y, s: hs, flip: false });
      var palm = K.hand({ pose: 'palm', x: HP.x, y: HP.y, s: hs, flip: false });
      var HX = HP.x;
      s += K.contact(HX - 10, HP.y - 60 * hs / 1.7, 70 * hs / 1.7, 80 * hs / 1.7, .3);
      s += forearm(HX, HP.y);
      if (still) {
        s += K.limb([160, 234], [160, 316], 34, 40, { bulge: .02 }) + K.hand({ pose: 'palm', x: 160, y: 238, s: 1.6, flip: true });
        s += dorsal;
      } else {
        s += c.anim([{ t: 0, sx: 1, o: 1 }, { t: 1.5, sx: 1 }, { t: 2.0, sx: .04 }, { t: 2.02, o: 0 }, { t: 2.95, o: 0 }, { t: 2.97, o: 1 }, { t: 3.5, sx: 1 }], dorsal, { pivot: [HX, 0] });
        s += c.anim([{ t: 0, sx: .04, o: 0 }, { t: 2.0 }, { t: 2.02, o: 1 }, { t: 2.5, sx: 1 }, { t: 2.9, sx: 1 }, { t: 3.4, sx: .04 }, { t: 3.42, o: 0 }], palm, { pivot: [HX, 0] });
      }
      /* phase 0: a band of light and the arrow that turns the hand over */
      s += skBand(c, .4, 3.0, 20, 50, 262, 220, { op: .38, key: 'a', h: 44, stillAt: .78 });
      var turn = 'M206 120C232 132 232 178 204 190';
      s += c.show(1.0, 3.2, c.draw(turn, 1.1, 2.0, 'class="st-arrow"', { until: 3 }) + '<path d="M204 190l9-1-5-8z" class="st-arrow-head"/>', { fade: .3, still: false });
      if (still) s += '<path d="' + turn.replace('M206 120C232 132 232 178 204 190', 'M126 36C146 26 168 34 176 50') + '" class="st-arrow" fill="none"/><path d="M176 50l-9-2 6-7z" class="st-arrow-head"/>';
      /* phase 1: rings on the gaps between the fingers */
      var webs = [[-17.6, -104], [0, -108], [17.4, -102], [-34, -64]].map(function (w) { return mD(w); }), rw = 6 * hs, ringWebs = '';
      webs.forEach(function (w) { ringWebs += '<circle cx="' + f1(w[0]) + '" cy="' + f1(w[1]) + '" r="' + f1(rw) + '" class="st-ring-dash"/>'; });
      s += c.show(3.7, 6.4, c.pulse(3.7, 6.4, ringWebs, { count: 3, scale: 1.12 }), { fade: .3 });
      /* phase 2: rings on every nail */
      var tips = [[-38.5, -150], [-12, -160], [16.4, -152], [42, -135], [-76, -76]], nails = '';
      tips.forEach(function (t, k) { var p = mD(t); nails += c.show(6.6 + k * .25, 9.6, '<ellipse cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" rx="' + f1(3.6 * hs) + '" ry="' + f1(4.4 * hs) + '" class="st-ring"/>', { fade: .25 }); });
      s += nails;
      /* the right column */
      var LX = 294, LY = 106, LR = 56;
      var webL = '<rect x="-80" y="-80" width="160" height="160" fill="var(--st-lens-bg)"/><g transform="scale(.8)">' + skWeb() + '</g><circle cx="0" cy="-2" r="26" class="st-ring-dash"/>';
      var nailL = '<rect x="-80" y="-80" width="160" height="160" fill="var(--st-lens-bg)"/><g transform="translate(0 20) scale(.92)">' + skNail(false) + '</g>';
      var pw = 126, ph = 118;
      var pnl = function (id, inner, y, label) {
        return '<g transform="translate(0 ' + y + ')"><clipPath id="' + id + '"><path d="' + K.rr(0, 0, pw, ph, 12) + '"/></clipPath><path d="' + K.rr(0, 0, pw, ph, 12) + '" fill="var(--st-lens-bg)"/><g clip-path="url(#' + id + ')"><g transform="translate(63 ' + (ph / 2 - 6) + ') scale(.78)">' + inner + '</g></g><path d="' + K.rr(0, 0, pw, ph, 12) + '" fill="none" stroke="var(--st-' + (y ? 'warn' : 'ok') + ')" stroke-width="2"/>' + K.callout(label, [pw / 2, ph - 15], null, { size: 12 }) + '</g>';
      };
      var warnL = tr('Dark streak,\nno injury', 'Tumma juova,\nei vammaa', 'Mörk rand,\ningen skada');
      if (still) {
        s += skTile(c, 1, 226, 12, 128, 66, webL, .5, tr('Between fingers', 'Sormien välit', 'Mellan fingrarna'));
        s += skTile(c, 2, 226, 82, 128, 66, nailL, .5, tr('Every nail', 'Jokainen kynsi', 'Varje nagel'));
        s += skTile(c, 3, 226, 152, 128, 134, '<g transform="translate(-44 -44) scale(.8)">' + skNail(false) + '</g><g transform="translate(44 -44) scale(.8)">' + skNail(true) + '</g>', .62, warnL, { tone: 'warn', cy: 62 });
      } else {
        s += c.show(3.4, 6.4, K.lens(LX, LY, LR, webL, { label: tr('Between the fingers', 'Sormien välit', 'Mellan fingrarna') }), { fade: .35 });
        s += c.show(6.4, 9.6, K.lens(LX, LY, LR, nailL, { label: tr('A healthy nail', 'Terve kynsi', 'En frisk nagel') }), { fade: .35 });
        s += c.show(9.6, 13, '<g transform="translate(226 14)">' + pnl(c.id('n1'), skNail(false), 0, tr('Healthy nail', 'Terve kynsi', 'Frisk nagel')) + pnl(c.id('n2'), skNail(true), ph + 10, warnL) + '</g>', { fade: .4, hold: true });
      }
      /* labels */
      if (still) s += K.callout(tr('Back', 'Selkä', 'Rygg'), [HX + 4, 281], null, { size: 12 }) + K.callout(tr('Palm', 'Kämmen', 'Handflata'), [160, 281], null, { size: 12 }) + '<g transform="translate(30 34)">' + c.marker(0, 0, 0, 11) + '</g>';
      else {
        s += c.show(0, 1.9, K.callout(tr('Back of the hand', 'Käden selkäpuoli', 'Handryggen'), [HX + 4, 280], null, { size: 12 }), { fade: .3 });
        s += c.show(2.1, 3.0, K.callout(tr('Palm', 'Kämmen', 'Handflata'), [HX + 4, 280], null, { size: 12 }), { fade: .3 });
        for (i = 0; i < 4; i++) s += c.phaseShow(i, '<g transform="translate(34 34)">' + c.marker(i, 0, 0, 11) + '</g>', { fade: .3 });
      }
      return s;
    }
  });

  /* Small plain moles for a field of skin: one shared gradient pair per scene, a few hundred bytes each. Returns a function (x, y, r, o) with o.dark, o.irr. */
  function skMoles(c) {
    if (c._skm) return c._skm;
    var g1 = c.id('mg'), g2 = c.id('md');
    c.defs('<radialGradient id="' + g1 + '" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#9A6840"/><stop offset=".6" stop-color="#6B4328"/><stop offset="1" stop-color="#4A2E1B"/></radialGradient><radialGradient id="' + g2 + '" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#5A3A26"/><stop offset=".6" stop-color="#2E1D14"/><stop offset="1" stop-color="#150C08"/></radialGradient>');
    return c._skm = function (x, y, r, o) {
      o = o || {};
      var rx = r * (o.irr ? 1.18 : 1), ry = r * (o.irr ? .84 : .95), rot = o.irr ? o.irr : 0;
      return '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + rot + ')"><ellipse cx="' + f1(r * .08) + '" cy="' + f1(r * .16) + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="rgb(var(--st-shadow))" opacity=".24"/><ellipse rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="url(#' + (o.dark ? g2 : g1) + ')"/><ellipse cx="' + f1(-r * .3) + '" cy="' + f1(-r * .34) + '" rx="' + f1(r * .36) + '" ry="' + f1(r * .22) + '" fill="#fff" opacity=".22"/><ellipse rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="none" stroke="#000" stroke-opacity=".2" stroke-width=".5"/></g>';
    };
  }
  /* A magnified bit of skin for one zone of the upper body (about +-80 units), with a few plain moles to look at. kind: neck, chest, ribs. */
  function skZone(c, kind, mole) {
    var s = K.skinPatch({ x: -90, y: -90, w: 180, h: 180, r: 0, seed: { neck: 3, chest: 5, ribs: 8 }[kind] || 1, lite: true });
    if (kind === 'neck') {
      s += '<path d="M-52 -90C-46 -40 -40 20 -34 90M52 -90C46 -40 40 20 34 90" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".2" stroke-width="12" filter="url(#k-b3)"/>';
      s += '<ellipse cx="0" cy="-14" rx="16" ry="26" fill="url(#k-hi-r)" opacity=".55"/><path d="M-10 -34C-3 -26 3 -26 10 -34" class="st-crease" stroke-opacity=".3"/>';
      s += '<ellipse cx="0" cy="70" rx="18" ry="9" fill="url(#k-sh-r)" opacity=".7"/>';
      s += mole(-30, 22, 7) + mole(34, -30, 4.4) + mole(22, 52, 5.2);
    } else if (kind === 'chest') {
      s += '<ellipse cx="0" cy="0" rx="12" ry="100" fill="url(#k-hi-r)" opacity=".4"/><path d="M-90 -50C-54 -62 -24 -56 -8 -44M90 -50C54 -62 24 -56 8 -44" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" filter="url(#k-b1)"/><path d="M-90 -44C-54 -56 -24 -50 -8 -38M90 -44C54 -56 24 -50 8 -38" class="st-crease" stroke-opacity=".3"/>';
      s += mole(-36, 18, 6.4) + mole(30, -8, 4) + mole(48, 44, 5.6) + mole(-8, 52, 3.6);
    } else {
      for (var i = 0; i < 4; i++) s += '<path d="M-90 ' + (-60 + i * 36) + 'C-40 ' + (-34 + i * 36) + ' 30 ' + (-34 + i * 36) + ' 90 ' + (-60 + i * 36) + '" class="st-crease" stroke-opacity=".22" stroke-width="1.2"/><path d="M-90 ' + (-57 + i * 36) + 'C-40 ' + (-31 + i * 36) + ' 30 ' + (-31 + i * 36) + ' 90 ' + (-57 + i * 36) + '" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>';
      s += mole(-40, -16, 5.4) + mole(34, 30, 7, { irr: -20 }) + mole(50, -34, 3.8);
    }
    return s;
  }

  /* ---------- s-sk-torso: neck, chest and the upper body ---------- */
  stage.define('s-sk-torso', {
    dur: 13,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Check the front of your neck', 'Tarkista kaulan etupuoli', 'Titta på framsidan av halsen'] },
      { at: 3.2, cap: ['Look over your chest, from the collarbones down', 'Katso rintakehä solisluista alaspäin', 'Titta över bröstkorgen, från nyckelbenen och neråt'] },
      { at: 6.4, cap: ['Raise one arm to see the ribs and the side of your body', 'Nosta toinen käsi ylös, niin näet kylkiluut ja kyljen', 'Lyft ena armen så ser du revbenen och sidan av kroppen'] },
      { at: 9.6, cap: ['Lift gently to see the skin under your breasts or chest fold', 'Nosta varovasti ja katso ihoa rintojen tai rintakehän laskoksen alta', 'Lyft försiktigt och titta på huden under brösten eller bröstvecket'] }
    ],
    desc: [
      'The head, neck and upper body of a person seen from the front at a mirror, cropped at the waist. A soft band of light scans down the body: first the front of the neck, then the chest from the collarbones down. One arm is raised to show the ribs and the side. Last, a hand lifts the chest gently so the skin underneath and in the fold can be seen. A magnified inset beside the body shows each zone with a few plain moles to look at. Any new or changed spot is worth showing to a doctor.',
      'Henkilön pää, kaula ja ylävartalo edestä peilin ääressä, kuva rajattu vyötärölle. Pehmeä valokaista kulkee kehon yli: ensin kaulan etupuoli, sitten rintakehä solisluista alaspäin. Yksi käsi nostetaan ylös, jotta kylkiluut ja kylki näkyvät. Lopuksi käsi nostaa rintakehää varovasti, jotta alla ja laskoksessa oleva iho näkyy. Suurennettu kuva vartalon vieressä näyttää kunkin alueen ja muutaman tavallisen luomen. Uusi tai muuttunut ihomuutos kannattaa näyttää lääkärille.',
      'Huvud, hals och överkropp hos en person sedd framifrån vid en spegel, beskuren vid midjan. Ett mjukt ljusband skannar nedför kroppen: först halsens framsida, sedan bröstkorgen från nyckelbenen och neråt. Ena armen lyfts så att revbenen och sidan syns. Sist lyfter en hand försiktigt bröstet så att huden under och i veck syns. En förstoring bredvid kroppen visar varje område med några vanliga leverfläckar. Varje ny eller förändrad fläck är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', i, TX = 112, TY = 140, TS = .95, still = c.still, mole = skMoles(c);
      var Tm = K.mapper({ x: TX, y: TY, s: TS }), Tt = 'translate(' + TX + ' ' + TY + ') scale(' + TS + ')';
      s += K.room({ kind: 'wall' });
      s += '<path d="' + K.rr(14, 10, 196, 300, 14) + '" fill="url(#k-mirror)" opacity=".5"/><path d="' + K.rr(14, 10, 196, 300, 14) + '" fill="none" stroke="var(--st-frame)" stroke-width="5"/><path d="' + K.rr(14, 10, 196, 300, 14) + '" fill="url(#k-streak)" opacity=".7"/>';
      var armR = skArmDown('r'), armL = skArmDown('l');
      var armUp = K.arm({ side: 'l', pose: 'behindHead' });
      var body = K.torso({ form: 'neutral', len: 150, fade: true }) + K.head({ x: 0, y: -50, hair: 'short', eyes: 'open' });
      var bodyG = '<g transform="' + Tt + '">' + body + armR + (still ? armUp : c.show(0, 6.4, armL, { fade: .35 }) + c.show(6.4, 9.6, armUp, { fade: .35 }) + c.show(9.6, 13, armL, { fade: .35, hold: true })) + '</g>';
      s += bodyG;
      /* the band of light, clipped to the body */
      var clip = skBodyClip(c, 'bc', 150, Tt, true), ax = Tm([0, -30])[1], ay = Tm([0, 118])[1];
      s += skBand(c, .6, 9.2, 14, ax - 10, ay, 196, { clip: clip, op: .55, key: 't', h: 40, stillAt: .5 });
      /* zone rings */
      var ring = function (p, rx, ry) { var q = Tm(p); return '<ellipse cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" rx="' + rx + '" ry="' + ry + '" class="st-ring-dash"/>'; };
      s += c.show(.8, 3.2, c.pulse(.8, 3.2, ring([0, -30], 24, 28), { count: 3, scale: 1.08 }), { fade: .3 });
      s += c.show(3.6, 6.4, c.pulse(3.6, 6.4, ring([-33, 54], 28, 28) + ring([33, 54], 28, 28) + ring([0, 24], 20, 12), { count: 3, scale: 1.06 }), { fade: .3 });
      s += c.show(6.8, 9.6, c.pulse(6.8, 9.6, ring([-62, 100], 16, 42), { count: 3, scale: 1.08 }), { fade: .3 });
      /* phase 3: a hand lifts under the chest from the side */
      var lift = K.limb([262, 304], [202, 234], 38, 30, { bulge: .02 }) + K.hand({ pose: 'palm', x: 202, y: 234, r: -78, s: 1.0, flip: true });
      var lp = Tm([33, 78]);
      s += c.show(9.8, 13, c.anim([{ t: 9.8, x: 50, y: 20, o: 0 }, { t: 10.6, x: 0, y: 0, o: 1 }, { t: 11.6, x: -2, y: -7 }, { t: 12.4, x: 0, y: 0 }], lift, {}), { fade: .3, hold: true });
      s += c.show(10.4, 13, c.pulse(10.4, 13, ring([-33, 78], 30, 11) + ring([33, 78], 30, 11), { count: 3, scale: 1.06 }), { fade: .3, hold: true });
      /* the right column */
      var LX = 290, LY = 106, LR = 62;
      var cl = function (k, kind, label, target) {
        return K.lens(LX, LY, LR, '<rect x="-90" y="-90" width="180" height="180" fill="var(--st-lens-bg)"/><g transform="scale(.68)">' + skZone(c, kind, mole) + '</g>', { label: label, target: target });
      };
      var foldL = '<rect x="-90" y="-90" width="180" height="180" fill="var(--st-lens-bg)"/>' + K.skinPatch({ x: -90, y: -90, w: 180, h: 180, r: 0, seed: 12, lite: true }) +
        '<path d="M-90 -12C-60 4 -30 12 0 12C34 12 62 2 90 -14L90 40L-90 40Z" fill="rgb(var(--st-shadow))" opacity=".28" filter="url(#k-b3)"/><path d="M-90 -2C-60 14 -30 22 0 22C34 22 62 12 90 -4L90 90L-90 90Z" fill="url(#k-skin-v)"/><path d="M-90 8C-60 22 -30 30 0 30" class="st-crease" stroke-opacity=".3"/>';
      var dome = 'M-95 -95L95 -95L95 -22C60 -4 30 6 -4 6C-40 6 -70 -6 -95 -22Z';
      var domeG = '<path d="' + dome + '" fill="url(#k-skin-dome)"/><path d="' + dome + '" fill="url(#k-sh-b)" opacity=".7"/><path d="M-95 -22C-70 -6 -40 6 -4 6C30 6 60 -4 95 -22" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".35" stroke-width="2.4"/><ellipse cx="-30" cy="-50" rx="46" ry="22" fill="url(#k-hi-r)" opacity=".5"/>' + mole(36, -34, 5.6) + mole(-50, -60, 4);
      foldL += c.anim([{ t: 9.8, y: 0 }, { t: 10.8, y: -18 }, { t: 12.2, y: -18 }, { t: 12.9, y: 0 }], domeG, {});
      foldL += c.anim([{ t: 9.8, y: 34 }, { t: 10.8, y: 16 }, { t: 12.2, y: 16 }, { t: 12.9, y: 34 }], '<g transform="translate(0 48)">' + K.place({ r: 180 }, skFinger(90, 30)).replace('<g transform="', '<g transform="') + '</g>', {});
      foldL += '<ellipse cx="0" cy="26" rx="62" ry="12" class="st-ring-dash"/>';
      var zl = [tr('Neck', 'Kaula', 'Hals'), tr('Chest', 'Rintakehä', 'Bröstkorg'), tr('Ribs and side', 'Kylkiluut ja kylki', 'Revben och sida'), tr('Under the chest fold', 'Rintakehän laskos', 'Under bröstvecket')];
      if (still) {
        var kinds = ['neck', 'chest', 'ribs'];
        for (i = 0; i < 3; i++) s += skTile(c, i, 226, 12 + i * 70, 128, 66, '<rect x="-90" y="-90" width="180" height="180" fill="var(--st-lens-bg)"/><g transform="scale(.9)">' + skZone(c, kinds[i], mole) + '</g>', .5, zl[i]);
        s += skTile(c, 3, 226, 222, 128, 66, foldL, .5, tr('Skin fold', 'Laskos', 'Hudvecket'));
      } else {
        s += c.show(0, 3.2, cl(0, 'neck', zl[0], Tm([22, -30])), { fade: .35 });
        s += c.show(3.2, 6.4, cl(1, 'chest', zl[1], Tm([36, 50])), { fade: .35 });
        s += c.show(6.4, 9.6, cl(2, 'ribs', zl[2], Tm([-66, 100])), { fade: .35 });
        s += c.show(9.6, 13, K.lens(LX, LY, LR, foldL, { label: zl[3], target: lp }), { fade: .35, hold: true });
        for (i = 0; i < 4; i++) s += c.phaseShow(i, '<g transform="translate(34 32)">' + c.marker(i, 0, 0, 11) + '</g>', { fade: .3 });
      }
      return s;
    }
  });

  /* A band of light that sweeps sideways (x from xFrom to xTo) over a region of height span starting at y. */
  function skBandV(c, t0, t1, y, xFrom, xTo, span, o) {
    o = o || {};
    var id = c.id('bv' + (o.key || '')), h = o.h || 34, dirn = xTo >= xFrom ? 1 : -1;
    c.defs('<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#fff" stop-opacity="' + (o.op || .5) + '"/><stop offset="1" stop-color="#fff" stop-opacity="' + Math.min(.95, (o.op || .5) * 1.5) + '"/></linearGradient>');
    var band = '<g transform="scale(' + dirn + ' 1)"><rect x="' + -h + '" y="' + y + '" width="' + h + '" height="' + span + '" fill="url(#' + id + ')"/><rect x="-1" y="' + y + '" width="2.4" height="' + span + '" fill="#fff" opacity=".85"/><rect x="1" y="' + y + '" width="7" height="' + span + '" fill="var(--st-guide)" opacity=".16"/></g>';
    var inner = c.show(t0, t1, c.anim([{ t: t0, x: xFrom }, { t: t1, x: xTo, ease: 'linear' }], band, { stillT: t0 + (t1 - t0) * (o.stillAt == null ? .5 : o.stillAt) }), { fade: .3 });
    return o.clip ? '<g clip-path="' + o.clip + '">' + inner + '</g>' : inner;
  }
  /* A magnified bit of an arm: the back of the upper arm, or the armpit (about +-90 units). */
  function skArmZone(c, kind, mole, seed) {
    var s = K.skinPatch({ x: -90, y: -90, w: 180, h: 180, r: 0, seed: seed || 6, lite: true }), i;
    if (kind === 'upper') {
      s += '<ellipse cx="-30" cy="-10" rx="46" ry="96" fill="url(#k-hi-r)" opacity=".55"/><path d="M60 -90C54 -30 56 30 64 90" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".22" stroke-width="18" filter="url(#k-b3)"/>';
      s += '<path d="M-90 72C-50 60 0 62 50 74M-90 82C-50 72 0 74 50 86" class="st-crease" stroke-opacity=".3" stroke-width="1.2"/><ellipse cx="-4" cy="98" rx="46" ry="22" fill="url(#k-sh-r)" opacity=".4"/>';
      s += mole(-34, -20, 7.2, { irr: -18 }) + mole(26, 28, 4.2) + mole(-6, -62, 3.4);
    } else {
      s += '<path d="M-90 -30C-50 -6 -10 10 30 70M-90 10C-56 28 -24 44 6 90M-60 -90C-44 -40 -20 -10 20 30" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".28" stroke-width="3" stroke-linecap="round" filter="url(#k-b1)"/><path d="M-90 -30C-50 -6 -10 10 30 70M-90 10C-56 28 -24 44 6 90" class="st-crease" stroke-opacity=".34" stroke-width="1.2"/>';
      var r = K.rnd(11), h = '';
      for (i = 0; i < 22; i++) { var x = -70 + r() * 110, y = -60 + r() * 100, a = .5 + r() * .8; h += 'M' + f1(x) + ' ' + f1(y) + 'q' + f1(Math.cos(a) * 6) + ' ' + f1(Math.sin(a) * 2 - 3) + ' ' + f1(Math.cos(a) * 13) + ' ' + f1(Math.sin(a) * 13); }
      s += '<path d="' + h + '" fill="none" stroke="var(--st-hair)" stroke-opacity=".55" stroke-width=".9" stroke-linecap="round"/>';
      s += mole(42, -30, 5.4) + mole(-20, 54, 4) + mole(50, 30, 3.4);
    }
    return s;
  }

  /* ---------- s-sk-arms: arms and armpits ---------- */
  stage.define('s-sk-arms', {
    dur: 13,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Bend your elbow to see the back of your upper arm', 'Taivuta kyynärpää, niin näet olkavarren takaosan', 'Böj armbågen så ser du baksidan av överarmen'] },
      { at: 3.2, cap: ['Raise your arm to see the armpit', 'Nosta käsi ylös, niin näet kainalon', 'Lyft armen så ser du armhålan'] },
      { at: 6.4, cap: ['Do the same with the other arm', 'Tee samoin toisella kädellä', 'Gör likadant med den andra armen'] },
      { at: 9.6, cap: ['Compare both sides: look for new or changed moles', 'Vertaa molempia puolia: etsi uusia tai muuttuneita luomia', 'Jämför båda sidorna: leta efter nya eller förändrade leverfläckar'] }
    ],
    desc: [
      'A person seen from the front at a mirror, from the head to the waist. The right arm bends at the elbow with a ring on the outer upper arm and a magnified view of the back of the upper arm with a few plain moles. Then the arm is raised behind the head so the armpit shows, with a close-up of the armpit skin. The same two steps follow with the other arm. Last, both arms are held out and a band of light sweeps along them, with the two sides compared side by side. Any new or changed mole is worth showing to a doctor.',
      'Henkilö edestä peilin ääressä, päästä vyötärölle. Oikea käsi taipuu kyynärpäästä, ulkoolkavarren ympärillä on rengas ja suurennos näyttää olkavarren takaosan ja muutaman tavallisen luomen. Sitten käsi nostetaan pään taakse, jolloin kainalo näkyy, ja lähikuva näyttää kainalon ihon. Samat kaksi vaihetta toistetaan toisella kädellä. Lopuksi molemmat kädet ovat sivulla ja valokaista liikkuu niiden yli, ja kaksi puolta rinnastetaan. Uusi tai muuttunut luomi kannattaa näyttää lääkärille.',
      'En person sedd framifrån vid en spegel, från huvudet till midjan. Höger arm böjs i armbågen med en ring på yttre överarmen och en förstoring av överarmens baksida med några vanliga leverfläckar. Sedan lyfts armen bakom huvudet så att armhålan syns, med en närbild av huden i armhålan. Samma två steg följer med den andra armen. Till sist hålls båda armarna ut och ett ljusband sveper längs dem, med de två sidorna jämförda. Varje ny eller förändrad fläck är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', i, TX = 112, TY = 140, TS = .95, still = c.still, mole = skMoles(c);
      var Tm = K.mapper({ x: TX, y: TY, s: TS }), Tt = 'translate(' + TX + ' ' + TY + ') scale(' + TS + ')';
      s += K.room({ kind: 'wall' });
      s += '<path d="' + K.rr(14, 10, 196, 300, 14) + '" fill="url(#k-mirror)" opacity=".5"/><path d="' + K.rr(14, 10, 196, 300, 14) + '" fill="none" stroke="var(--st-frame)" stroke-width="5"/><path d="' + K.rr(14, 10, 196, 300, 14) + '" fill="url(#k-streak)" opacity=".7"/>';
      var body = K.torso({ form: 'neutral', len: 150, fade: true }) + K.head({ x: 0, y: -50, hair: 'short', eyes: 'open' });
      var A = {
        rRest: skArmDown('r'), lRest: skArmDown('l'),
        rBent: K.arm({ side: 'r', pose: 'bent' }), lBent: K.arm({ side: 'l', pose: 'bent' }),
        rUp: K.arm({ side: 'r', pose: 'behindHead' }), lUp: K.arm({ side: 'l', pose: 'behindHead' }),
        rOut: K.arm({ side: 'r', pose: 'out' }), lOut: K.arm({ side: 'l', pose: 'out' })
      };
      var arms;
      if (still) arms = A.rBent + A.lUp;
      else {
        arms = c.show(0, 0.6, A.rRest, { fade: .3 }) + c.show(.4, 3.6, A.rBent, { fade: .3 }) + c.show(3.4, 6.8, A.rUp, { fade: .3 }) + c.show(6.6, 9.9, A.rRest, { fade: .3 }) + c.show(9.7, 13, A.rOut, { fade: .35, hold: true });
        arms += c.show(0, 6.8, A.lRest, { fade: .3 }) + c.show(6.6, 8.2, A.lBent, { fade: .3 }) + c.show(8.0, 9.9, A.lUp, { fade: .3 }) + c.show(9.7, 13, A.lOut, { fade: .35, hold: true });
      }
      s += '<g transform="' + Tt + '">' + body + arms + '</g>';
      var pt = function (side, pose, k) { var a = K.armPoints({ side: side, pose: pose }); return Tm([(a.S[0] + a[k][0]) / 2, (a.S[1] + a[k][1]) / 2]); };
      var upR = pt('r', 'bent', 'E'), upL = pt('l', 'bent', 'E');
      var ring = function (p, rx, ry) { return '<ellipse cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" rx="' + rx + '" ry="' + ry + '" class="st-ring-dash"/>'; };
      var pitR = Tm([68, 36]), pitL = Tm([-68, 36]);
      if (still) s += ring(upR, 16, 34) + ring(pitL, 18, 20);
      else {
        s += c.show(.8, 3.2, c.pulse(.8, 3.2, ring(upR, 16, 34), { count: 3, scale: 1.08 }), { fade: .3 });
        s += c.show(3.8, 6.4, c.pulse(3.8, 6.4, ring(pitR, 20, 22), { count: 3, scale: 1.1 }), { fade: .3 });
        s += c.show(6.9, 8.0, c.pulse(6.9, 8.0, ring(upL, 16, 34), { count: 2, scale: 1.08 }), { fade: .25 }) + c.show(8.3, 9.6, c.pulse(8.3, 9.6, ring(pitL, 20, 22), { count: 2, scale: 1.1 }), { fade: .25 });
        /* phase 3: a band of light along both arms */
        s += skBandV(c, 10, 12.6, 132, 112, 8, 46, { op: .6, key: 'l', h: 26, stillAt: .5 });
        s += skBandV(c, 10, 12.6, 132, 112, 218, 46, { op: .6, key: 'r', h: 26, stillAt: .5 });
      }
      /* the right column */
      var LX = 290, LY = 106, LR = 62;
      var lz = function (kind, seed) { return '<rect x="-90" y="-90" width="180" height="180" fill="var(--st-lens-bg)"/><g transform="scale(.68)">' + skArmZone(c, kind, mole, seed) + '</g>'; };
      var cmpPanel = function (id, kind, seed, y, label) {
        var w = 126, h = 100;
        return '<g transform="translate(0 ' + y + ')"><clipPath id="' + id + '"><path d="' + K.rr(0, 0, w, h, 12) + '"/></clipPath><path d="' + K.rr(0, 0, w, h, 12) + '" fill="var(--st-lens-bg)"/><g clip-path="url(#' + id + ')"><g transform="translate(63 44) scale(.62)">' + skArmZone(c, kind, mole, seed) + '</g></g><path d="' + K.rr(0, 0, w, h, 12) + '" fill="none" stroke="var(--st-contour)" stroke-width="1.4"/>' + K.callout(label, [w / 2, h - 14], null, { size: 12 }) + '</g>';
      };
      var names = [tr('Back of the\nupper arm', 'Olkavarren\ntakaosa', 'Överarmens\nbaksida'), tr('Armpit', 'Kainalo', 'Armhåla'), tr('Other arm', 'Toinen käsi', 'Andra armen'), tr('Left and right', 'Vasen ja oikea', 'Vänster och höger')];
      if (still) {
        s += skTile(c, 0, 226, 12, 128, 66, lz('upper', 6), .5, tr('Upper arm', 'Olkavarsi', 'Överarm'));
        s += skTile(c, 1, 226, 82, 128, 66, lz('pit', 7), .5, names[1]);
        s += skTile(c, 2, 226, 152, 128, 66, lz('upper', 9), .5, names[2]);
        s += skTile(c, 3, 226, 222, 128, 66, '<g transform="translate(-48 0) scale(.5)">' + skArmZone(c, 'pit', mole, 7) + '</g><g transform="translate(48 0) scale(.5)">' + skArmZone(c, 'pit', mole, 13) + '</g>', .8, tr('Compare', 'Vertaa', 'Jämför'), { tone: 'warn' });
      } else {
        s += c.show(0, 3.2, K.lens(LX, LY, LR, lz('upper', 6), { label: names[0], target: upR }), { fade: .35 });
        s += c.show(3.2, 6.4, K.lens(LX, LY, LR, lz('pit', 7), { label: names[1], target: pitR }), { fade: .35 });
        s += c.show(6.4, 9.6, K.lens(LX, LY, LR, lz('upper', 9), { label: names[2], target: upL }), { fade: .35 });
        s += c.show(9.6, 13, '<g transform="translate(226 18)">' + cmpPanel(c.id('c1'), 'pit', 7, 0, tr('Right', 'Oikea', 'Höger')) + cmpPanel(c.id('c2'), 'pit', 13, 108, tr('Left', 'Vasen', 'Vänster')) + '</g>', { fade: .4, hold: true });
        for (i = 0; i < 4; i++) s += c.phaseShow(i, '<g transform="translate(34 32)">' + c.marker(i, 0, 0, 11) + '</g>', { fade: .3 });
      }
      return s;
    }
  });

  /* ---------- s-sk-back: the hand mirror shows the neck and the back in the big mirror ---------- */
  stage.define('s-sk-back', {
    dur: 13,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Stand with your back to the big mirror', 'Seiso selkä isoon peiliin päin', 'Stå med ryggen mot den stora spegeln'] },
      { at: 3.2, cap: ['Hold the small mirror up so you can see the big one in it', 'Nosta pieni peili niin, että näet siinä ison peilin', 'Håll upp den lilla spegeln så att du ser den stora i den'] },
      { at: 6.4, cap: ['See the back of your neck and your whole back, from the top down', 'Katso niskaasi ja koko selkääsi ylhäältä alas', 'Se nacken och hela ryggen, uppifrån och ned'] },
      { at: 9.6, cap: ['Turn slowly so that you see every part', 'Käänny hitaasti, niin näet jokaisen kohdan', 'Vänd dig långsamt så att du ser varje del'] }
    ],
    desc: [
      'A person with their back to a big wall mirror, seen from the front and cropped at the shoulder, holds a small round hand mirror up in front of their face. A line follows the gaze from the eye to the hand mirror and on to the big mirror, which shows the back of the neck and the whole back with the shoulder blades and the spine. A soft band of light moves down the reflected back from the neck to the waist. Then the reflected back turns slowly from side to side so every part can be seen. Any new or changed spot is worth showing to a doctor.',
      'Henkilö seisoo selkä ison seinäpeilin puoleen, kuvattuna edestä ja rajattuna olkapäille, ja pitää pientä pyöreää käsipeiliä kasvojensa edessä. Viiva seuraa katsetta silmästä käsipeiliin ja siitä isoon peiliin, jossa näkyvät niska ja koko selkä lapaluineen ja selkärankoineen. Pehmeä valokaista kulkee heijastuneen selän yli niskasta vyötärölle. Sitten heijastunut selkä kääntyy hitaasti puolelta toiselle, jotta jokainen kohta näkyy. Uusi tai muuttunut ihomuutos kannattaa näyttää lääkärille.',
      'En person med ryggen mot en stor väggspegel, sedd framifrån och beskuren vid axeln, håller en liten rund handspegel framför ansiktet. En linje följer blicken från ögat till handspegeln och vidare till den stora spegeln, som visar nacken och hela ryggen med skulderblad och ryggrad. Ett mjukt ljusband rör sig nedför den speglade ryggen från nacken till midjan. Sedan vrider sig den speglade ryggen långsamt från sida till sida så att varje del syns. Varje ny eller förändrad fläck är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', still = c.still, MX = 160, MY = 10, MW = 186, MH = 292, RX = 93, RY = 158, RS = .84;
      var fg = skFigs(c), mole = skMoles(c);
      var Rm = function (p) { return [MX + RX + p[0] * RS, MY + RY + p[1] * RS]; };
      s += K.room({ kind: 'wall' });
      /* the big mirror, with the back in it */
      var tfm = 'translate(' + RX + ' ' + RY + ') scale(' + RS + ')';
      var clip = skBodyClip(c, 'bk', 140, tfm);
      var back = fg.back(tfm) + '<g transform="' + tfm + '">' + mole(-30, 52, 5.4) + mole(34, 96, 4.4, { irr: 20 }) + mole(8, 22, 3.6) + '</g>';
      var refl = still ? back : c.anim([{ t: 0, sx: 1 }, { t: 9.7, sx: 1 }, { t: 10.8, sx: .5 }, { t: 11.7, sx: 1 }, { t: 12.3, sx: .6 }, { t: 12.9, sx: 1 }], back, { pivot: [RX, 0] });
      var band = skBand(c, 6.6, 9.4, 0, 30, 270, MW, { clip: clip, op: .55, key: 'k', h: 40, stillAt: .45 });
      s += K.wallMirror({ x: MX, y: MY, w: MW, h: MH, content: refl + band });
      /* the person's head, turned towards the small mirror, and the neck and shoulder */
      var hd = skDef(c, 'hd2', K.head({ hair: 'short', eyes: 'open', yaw: .85 }));
      s += '<g transform="translate(34 252) scale(.95)">' + skNeckTop() + hd() + '</g>';
      /* the arm, the small mirror and the hand: they rise together */
      var wr = [100, 214], up = 91 * 1.1;
      var m = K.place({ x: wr[0], y: wr[1] - up, s: 1.1 }, K.handMirror({ content: '<g transform="translate(0 4) scale(.2)">' + fg.back('translate(0 56)') + '</g>' }));
      var armG = K.limb([86, 330], [wr[0], wr[1] + 4], 32, 22, { bulge: .02 }) + m + K.hand({ pose: 'grip', x: wr[0], y: wr[1], r: 4, s: .95, flip: false });
      s += still ? armG : c.anim([{ t: 0, y: 64 }, { t: 3.4, y: 64 }, { t: 5.0, y: 0 }, { t: 12.2, y: 0 }, { t: 13, y: 64 }], armG, {});
      /* the line of sight: eye, small mirror, big mirror */
      var gc = [wr[0], wr[1] - up], eye = [52, 202], tg = Rm([0, -28]);
      var sight = 'M' + eye[0] + ' ' + eye[1] + 'L' + f1(gc[0] - 4) + ' ' + f1(gc[1] + 6) + 'L' + f1(tg[0]) + ' ' + f1(tg[1]);
      s += c.show(5.0, 13, c.draw(sight, 5.1, 6.4, 'class="st-leader"', { until: 12.6 }), { fade: .3, hold: true });
      /* rings on the back, and the arrow that shows the turning */
      var ring = function (p, rx, ry) { var q = Rm(p); return '<ellipse cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" rx="' + rx + '" ry="' + ry + '" class="st-ring-dash"/>'; };
      s += c.show(6.6, 9.6, c.pulse(6.6, 9.6, ring([0, -28], 20, 20) + ring([0, 52], 50, 40) + ring([0, 112], 34, 20), { count: 3, scale: 1.06 }), { fade: .3 });
      var tp = 'M196 52C226 28 282 28 312 52';
      s += c.show(9.7, 13, c.draw(tp, 9.8, 11.2, 'class="st-arrow"', { until: 12.6 }) + '<path d="M312 52l-10-1 4-9z" class="st-arrow-head"/><path d="M196 52l10 0-3-9z" class="st-arrow-head" transform="rotate(-8 196 52)"/>', { fade: .3, hold: true });
      /* the numbers of the phases, on the things they belong to */
      var labs = [tr('Back to mirror', 'Selkä peiliin', 'Rygg mot spegel'), tr('Hand mirror', 'Käsipeili', 'Handspegel'), tr('Neck and back', 'Niska ja selkä', 'Nacke och rygg'), tr('Turn slowly', 'Käänny hitaasti', 'Vänd långsamt')];
      var lab = function (i, cx, cy) {
        var w = labs[i].length * 7.2 + 18;
        return K.callout(labs[i], [cx, cy], null, { size: 12 }) + '<g transform="translate(' + f1(cx - w / 2 - 14) + ' ' + cy + ')">' + c.marker(i, 0, 0, 11) + '</g>';
      };
      if (still) s += lab(0, 84, 22) + lab(1, 84, 52) + lab(2, MX + MW / 2, 282) + lab(3, MX + MW / 2, 24);
      else s += c.phaseShow(0, lab(0, MX + MW / 2, 24), { fade: .3 }) + c.phaseShow(1, lab(1, 76, 24), { fade: .3 }) + c.phaseShow(2, lab(2, MX + MW / 2, 24), { fade: .3 }) + c.phaseShow(3, lab(3, MX + MW / 2, 24), { fade: .3 });
      return s;
    }
  });

  /* The side of a bare foot standing on the floor, toes to the right, heel at the origin (about 106 units long, the ankle at (8, -54)). */
  function skFootSide() {
    var d = 'M-6 -56C-9 -34 -8 -12 4 -2C8 1 14 2 22 2C30 2 34 -6 44 -6C56 -6 60 2 72 2L90 2C101 2 107 -5 106 -14C105 -22 98 -26 88 -28C74 -30 62 -34 54 -44C46 -56 36 -62 22 -62C8 -62 -4 -62 -6 -56Z';
    return K.softShadow(d, { dx: 3, dy: 4, blur: 2, op: .3 }) + '<path d="' + d + '" fill="url(#k-skin-v)"/><path d="' + d + '" fill="url(#k-sh-b)" opacity=".7"/><path d="M-6 -56C-4 -62 12 -66 22 -62" fill="url(#k-skin-h)"/>' +
      K.glint(34, -44, 22, 7, 10, .5) + '<ellipse cx="3" cy="-46" rx="5.5" ry="7" fill="url(#k-hi-r)" opacity=".5"/><ellipse cx="6" cy="-40" rx="4" ry="2.4" fill="url(#k-sh-r)" opacity=".4"/>' +
      '<path d="M92 -27C98 -20 100 -12 98 -3M82 -27C86 -21 87 -14 86 -6" class="st-crease" stroke-opacity=".28" stroke-width=".9"/><ellipse cx="96" cy="-23" rx="8" ry="3.6" transform="rotate(26 96 -23)" fill="url(#k-nail)"/><ellipse cx="94" cy="-24" rx="2.6" ry="1" transform="rotate(26 94 -24)" fill="#fff" opacity=".7"/>' +
      '<path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>' + K.grain(d, .25);
  }
  /* A person sitting on the edge of a bed, seen from the side, facing right (body units, origin at the notch of the throat, the floor at y = 356). */
  function skSeated() {
    var s = '';
    /* the bed: pillow, mattress with a sheet, frame and a leg */
    s += '<rect x="108" y="226" width="22" height="130" fill="url(#k-wood)"/><rect x="-342" y="224" width="494" height="44" rx="6" fill="url(#k-wood)"/><rect x="-342" y="224" width="494" height="44" rx="6" fill="url(#k-sh-b)" opacity=".6"/>';
    s += '<ellipse cx="40" cy="352" rx="150" ry="9" fill="url(#k-sh-r)" opacity=".7"/>';
    s += K.softShadow('M-340 170L140 170L140 230L-340 230Z', { dx: 0, dy: 6, blur: 5, op: .35 });
    var mat = K.rr(-342, 164, 484, 64, 24);
    s += K.cloth(mat, { kind: 'sheet', fibre: false }) + K.folds(-330, 176, 300, 44, 3, 0, 3);
    s += '<path d="M138 168C148 178 148 214 138 224" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".2" stroke-width="6" filter="url(#k-b2)"/>';
    s += K.cloth('M-340 164C-340 138 -306 126 -268 132C-244 136 -238 156 -246 164Z', { kind: 'pillow', fibre: false });
    /* the legs and the body */
    s += '<ellipse cx="148" cy="352" rx="72" ry="8" fill="url(#k-sh-r)" opacity=".8"/>';
    s += K.limb([2, 154], [150, 170], 62, 48, { bulge: .03 }) + K.limb([150, 170], [154, 306], 46, 26, { bulge: .1 });
    s += '<circle cx="150" cy="170" r="22" fill="url(#k-skin-dome)"/><ellipse cx="144" cy="164" rx="9" ry="7" fill="url(#k-hi-r)" opacity=".45"/>';
    s += K.place({ x: 146, y: 356 }, skFootSide());
    s += K.torso({ view: 'side', form: 'male', len: 150 }) + K.head({ view: 'side', hair: 'short', x: 2, y: -41 });
    s += '<path d="M-26 130L30 130L42 164C70 168 94 170 112 170L110 200C84 200 56 196 22 192C-8 188 -28 172 -26 130Z" fill="url(#k-sheet-tint)"/><path d="M-26 130L30 130L42 164C70 168 94 170 112 170L110 200C84 200 56 196 22 192C-8 188 -28 172 -26 130Z" class="st-contour" stroke-opacity=".6"/><path d="M-26 130L30 130" stroke="var(--st-sheet-d)" stroke-width="6" opacity=".6"/><path d="M60 176C90 182 120 184 150 182" class="st-crease" stroke-opacity=".2"/>';
    s += K.limb([-8, 16], [0, 98], 38, 30, { bulge: .04 }) + K.limb([0, 98], [54, 142], 28, 20, { bulge: .08 }) + skHandLite({ x: 54, y: 142, r: -52 });
    return s;
  }
  /* The back of the legs of a standing person, from the waist: lower back, shorts, thighs, calves and heels (body units, origin at the waist, heels at y = 300). */
  function skLegsBack() {
    var s = '';
    s += K.contact(0, 296, 90, 12, .9);
    [-1, 1].forEach(function (sx) {
      var hx = sx * 28, kx = sx * 30, ax = sx * 25;
      s += K.limb([hx, 20], [kx, 150], 58, 44, { bulge: .03 }) + K.limb([kx, 150], [ax, 280], 44, 22, { bulge: .15 });
      s += '<ellipse cx="' + kx + '" cy="147" rx="17" ry="7" fill="url(#k-sh-r)" opacity=".6"/><path d="M' + (kx - 15) + ' 144q15 9 30 0" class="st-crease" stroke-opacity=".4" stroke-width="1.2"/><path d="M' + (kx - 12) + ' 150q12 6 24 0" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.4"/>';
      s += K.glint(kx - 9, 186, 7, 24, 6, .5);
      s += '<path d="M' + (ax - 5) + ' 250L' + (ax - 4) + ' 280M' + (ax + 5) + ' 250L' + (ax + 4) + ' 280" class="st-crease" stroke-opacity=".3" stroke-width="1.2"/>';
      s += '<ellipse cx="' + (ax - 12) + '" cy="278" rx="3.4" ry="4.4" fill="url(#k-hi-r)" opacity=".5"/><ellipse cx="' + (ax + 12) + '" cy="278" rx="3.4" ry="4.4" fill="url(#k-sh-r)" opacity=".5"/>';
      s += '<path d="M' + (ax - 15) + ' 284C' + (ax - 19) + ' 298 ' + (ax - 12) + ' 308 ' + ax + ' 308C' + (ax + 12) + ' 308 ' + (ax + 19) + ' 298 ' + (ax + 15) + ' 284Z" fill="url(#k-skin-dome)"/><path d="M' + (ax - 15) + ' 284C' + (ax - 19) + ' 298 ' + (ax - 12) + ' 308 ' + ax + ' 308C' + (ax + 12) + ' 308 ' + (ax + 19) + ' 298 ' + (ax + 15) + ' 284" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    });
    s += '<g transform="translate(0 -138)">' + skBackTorso(140) + '</g>' + skShorts(22);
    return s;
  }
  /* The sole of a left foot, toes up, about 210 units long, origin at the bottom of the heel. Toes are separate so they can spread. Returns { body, toes: [{ g, c, pivot, spread }] }. */
  var SOLE_TOES = [[-22, -184, 14, 21, -8], [-2, -190, 9, 16, -2.5], [13, -185, 8.4, 14.4, 3], [26, -177, 7.6, 12.8, 8], [37, -167, 6.6, 11, 14]];
  function skSole() {
    var d = 'M-22 -4C-30 -20 -28 -50 -22 -80C-20 -100 -26 -120 -34 -140C-40 -152 -38 -166 -30 -172L36 -172C42 -162 40 -140 36 -120C32 -96 30 -60 28 -36C26 -14 14 6 0 6C-12 6 -20 2 -22 -4Z', s = '';
    s += K.softShadow(d, { dx: 3, dy: 6, blur: 3, op: .3 });
    s += '<path d="' + d + '" fill="url(#k-skin-soft)"/><path d="' + d + '" fill="#fff" opacity=".1"/><path d="' + d + '" fill="url(#k-sh-edge-h)" opacity=".8"/>';
    s += '<path d="M-24 -70C-12 -80 4 -78 18 -88C24 -108 20 -126 8 -134C-8 -132 -26 -124 -28 -100C-26 -90 -26 -80 -24 -70Z" fill="var(--st-sk-d)" opacity=".16"/>';
    s += '<ellipse cx="0" cy="-22" rx="22" ry="20" fill="url(#k-hi-r)" opacity=".55"/><ellipse cx="2" cy="-140" rx="30" ry="20" fill="url(#k-hi-r)" opacity=".5"/>';
    s += '<path d="M-26 -44C-10 -34 14 -34 26 -44M-24 -52C-8 -42 12 -42 24 -52M-14 -112C-2 -118 12 -118 26 -112M-20 -104C-6 -110 10 -110 24 -104" class="st-crease" stroke-opacity=".22" stroke-width="1"/>';
    s += '<path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width="1"/>' + K.grain(d, .3);
    var toes = SOLE_TOES.map(function (t, i) {
      var td = 'M' + (t[0] - t[2]) + ' ' + f1(t[1] + t[3] * .5) + 'C' + (t[0] - t[2]) + ' ' + f1(t[1] - t[3] * 1.1) + ' ' + (t[0] + t[2]) + ' ' + f1(t[1] - t[3] * 1.1) + ' ' + (t[0] + t[2]) + ' ' + f1(t[1] + t[3] * .5) + 'L' + (t[0] + t[2] * .9) + ' ' + f1(t[1] + t[3] * 1.2) + 'L' + f1(t[0] - t[2] * .9) + ' ' + f1(t[1] + t[3] * 1.2) + 'Z';
      var g = '<path d="' + td + '" fill="url(#k-skin-dome-soft)"/><path d="' + td + '" fill="url(#k-sh-edge-h)" opacity=".5"/><ellipse cx="' + f1(t[0] - t[2] * .25) + '" cy="' + f1(t[1] - t[3] * .35) + '" rx="' + f1(t[2] * .5) + '" ry="' + f1(t[3] * .34) + '" fill="url(#k-hi-r)" opacity=".6"/><path d="M' + f1(t[0] - t[2] * .6) + ' ' + f1(t[1] + t[3] * .9) + 'q' + f1(t[2] * .6) + ' 3 ' + f1(t[2] * 1.2) + ' 0" class="st-crease" stroke-opacity=".4" stroke-width=".9"/><path d="' + td + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
      return { g: g, pivot: [t[0], t[1] + t[3] * 1.1], spread: t[4], c: [t[0], t[1]], r: t[3] };
    });
    return { body: s, toes: toes };
  }

  /* ---------- s-sk-legs: bottom, backs of the legs, soles and the gaps between the toes ---------- */
  stage.define('s-sk-legs', {
    dur: 14,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Sit on the edge of the bed or on a chair', 'Istu sängyn reunalle tai tuolille', 'Sitt på sängkanten eller på en stol'] },
      { at: 3.4, cap: ['Look at your bottom and the backs of your legs, from the top down', 'Katso pakaroita ja jalkojen takapuolta ylhäältä alas', 'Titta på rumpan och baksidan av benen, uppifrån och ned'] },
      { at: 7, cap: ['Lift each foot and look at the sole', 'Nosta kumpikin jalka ja katso jalkapohjaa', 'Lyft varje fot och titta på fotsulan'] },
      { at: 10.2, cap: ['Spread the toes and look at each gap between them', 'Levitä varpaita ja katso jokaista väliä', 'Sära på tårna och titta i varje mellanrum'] }
    ],
    desc: [
      'A person sits on the edge of a bed, seen from the side, with their feet on the floor. The view then changes to the back of the legs from the waist down, with a band of light sweeping down the lower back, thighs, calves and heels and a close-up of the skin behind the knee. Then a foot is lifted so the sole faces us, with a band of light from heel to toes and a close-up of the sole. Last, the toes spread apart and a fingertip follows each gap between them, with a close-up of the skin between two toes. Any new or changed spot is worth showing to a doctor.',
      'Henkilö istuu sängyn reunalla sivulta nähtynä, jalat lattialla. Sitten näkymä vaihtuu jalkojen takapuoleen vyötäröltä alas, ja valokaista liukuu alaselän, reisien, pohkeiden ja kantapäiden yli, ja lähikuva näyttää ihon polvitaipeessa. Sitten jalka nostetaan niin, että jalkapohja on meitä kohti, valokaista kulkee kantapäästä varpaisiin ja lähikuva näyttää jalkapohjan. Lopuksi varpaat levittyvät ja sormenpää seuraa jokaista väliä, ja lähikuva näyttää ihon kahden varpaan välissä. Uusi tai muuttunut ihomuutos kannattaa näyttää lääkärille.',
      'En person sitter på sängkanten, sedd från sidan, med fötterna på golvet. Sedan byter vyn till benens baksida från midjan och ned, med ett ljusband som sveper nedför svanken, låren, vaderna och hälarna och en närbild av huden bakom knät. Sedan lyfts en fot så att fotsulan vetter mot oss, med ett ljusband från häl till tår och en närbild av fotsulan. Till sist särar tårna och en fingertopp följer varje mellanrum, med en närbild av huden mellan två tår. Varje ny eller förändrad fläck är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', i, still = c.still, mole = skMoles(c), FLOOR = 274;
      s += K.room({ kind: 'wall' });
      s += '<rect y="' + FLOOR + '" width="360" height="30" fill="var(--st-floor)"/><rect y="' + (FLOOR - 2) + '" width="360" height="3" fill="rgb(var(--st-shadow))" opacity=".14"/>';
      /* the three views of the main picture */
      var seatS = .58, seatT = 'translate(82 84) scale(' + seatS + ')';
      var seated = '<g transform="' + seatT + '">' + skSeated() + '</g>';
      var BX = 112, BS = .78, BY = 34, backT = 'translate(' + BX + ' ' + BY + ') scale(' + BS + ')';
      var legs = '<g transform="' + backT + '">' + skLegsBack() + '</g>';
      var sole = skSole(), SX = 112, SY = 272, SS = 1.22, soleT = 'translate(' + SX + ' ' + SY + ') scale(' + SS + ')';
      var soleLeg = K.limb([SX + 2, SY + 6], [SX + 8, SY + 110], 52, 64, { bulge: .02 });
      var soleG = soleLeg + '<g transform="' + soleT + '">' + sole.body + sole.toes.map(function (t) { return t.g; }).join('') + '</g>';
      /* spread toes: each toe turns about its base (the body of the foot stays) */
      var toesSpread = '', toesTogether = '';
      sole.toes.forEach(function (t) {
        toesSpread += '<g transform="rotate(' + t.spread + ' ' + f1(t.pivot[0]) + ' ' + f1(t.pivot[1]) + ')">' + t.g + '</g>';
      });
      var soleSpread = soleLeg + '<g transform="' + soleT + '">' + sole.body + toesSpread + '</g>';
      var soleAnim = soleLeg + '<g transform="' + soleT + '">' + sole.body + sole.toes.map(function (t) {
        return c.anim([{ t: 0, r: 0 }, { t: 10.4, r: 0 }, { t: 11.2, r: t.spread }, { t: 13, r: t.spread }, { t: 13.7, r: 0 }], t.g, { pivot: t.pivot });
      }).join('') + '</g>';
      if (still) {
        s += legs;
      } else {
        s += c.show(0, 3.8, seated, { fade: .45 });
        s += c.show(3.2, 7.4, legs, { fade: .45 });
        s += c.show(6.8, 14, c.anim([{ t: 6.8, y: 80, r: -6 }, { t: 7.9, y: 0, r: 0 }], soleAnim, { pivot: [SX, SY] }), { fade: .45, hold: true });
      }
      /* scanning light: down the legs, then over the sole */
      c.defs('<clipPath id="' + c.id('lgc') + '"><rect x="40" y="' + BY + '" width="144" height="' + (FLOOR - BY + 6) + '"/></clipPath>');
      s += skBand(c, 3.9, 6.9, 40, BY + 4, FLOOR, 144, { clip: c.ref('lgc'), op: .5, key: 'l', h: 36, stillAt: .1 });
      c.defs('<clipPath id="' + c.id('slc') + '"><rect x="62" y="20" width="102" height="' + (SY - 14) + '"/></clipPath>');
      s += skBand(c, 8.2, 10.2, 62, SY, 26, 102, { clip: c.ref('slc'), op: .5, key: 's', h: 36, stillAt: .5 });
      /* rings */
      var ring = function (x, y, rx, ry) { return '<ellipse cx="' + f1(x) + '" cy="' + f1(y) + '" rx="' + rx + '" ry="' + ry + '" class="st-ring-dash"/>'; };
      var BM = K.mapper({ x: BX, y: BY, s: BS });
      var kn = BM([30, 148]), kn2 = BM([-30, 148]), bt = BM([0, 40]);
      s += c.show(4.2, 7, c.pulse(4.2, 7, ring(kn[0], kn[1], 22, 10) + ring(kn2[0], kn2[1], 22, 10) + ring(bt[0], bt[1], 56, 18), { count: 3, scale: 1.06 }), { fade: .3 });
      var SM = K.mapper({ x: SX, y: SY, s: SS });
      var gaps = [], tipPos = sole.toes.map(function (t) { var a = t.spread * Math.PI / 180, dx = t.c[0] - t.pivot[0], dy = t.c[1] - t.pivot[1]; return [t.pivot[0] + dx * Math.cos(a) - dy * Math.sin(a), t.pivot[1] + dx * Math.sin(a) + dy * Math.cos(a)]; });
      for (i = 0; i < 4; i++) gaps.push(SM([(tipPos[i][0] + tipPos[i + 1][0]) / 2, (tipPos[i][1] + tipPos[i + 1][1]) / 2 + 6]));
      var gapRings = gaps.map(function (g) { return '<circle cx="' + f1(g[0]) + '" cy="' + f1(g[1]) + '" r="' + f1(9) + '" class="st-ring"/>'; }).join('');
      var gp0 = 'M' + gaps.map(function (g) { return f1(g[0]) + ' ' + f1(g[1]); }).join('L');
      s += c.show(11.4, 14, c.pulse(11.4, 14, gapRings, { count: 3, scale: 1.1 }), { fade: .3, hold: true });
      if (still) { var sp = SM([-12, -100]); s += ring(sp[0], sp[1], 26, 36); }
      else s += c.show(8, 10.2, c.pulse(8, 10.2, ring(SM([0, -100])[0], SM([0, -100])[1], 30, 44), { count: 3, scale: 1.05 }), { fade: .3 });
      /* the right column */
      var LX = 290, LY = 106, LR = 62;
      var knee = '<rect x="-90" y="-90" width="180" height="180" fill="var(--st-lens-bg)"/>' + K.skinPatch({ x: -90, y: -90, w: 180, h: 180, r: 0, seed: 21, lite: true }) +
        '<path d="M-90 -6C-50 8 -10 12 30 6C60 2 78 -6 90 -14" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".3" stroke-width="10" filter="url(#k-b3)"/><path d="M-90 -6C-50 8 -10 12 30 6C60 2 78 -6 90 -14M-90 8C-50 22 -10 26 30 20" class="st-crease" stroke-opacity=".32" stroke-width="1.2"/>' + mole(-34, -40, 6) + mole(40, 40, 4) + mole(-8, 56, 3.4, { irr: 30 });
      var soleL = '<rect x="-90" y="-90" width="180" height="180" fill="var(--st-lens-bg)"/>' + K.skinPatch({ x: -90, y: -90, w: 180, h: 180, r: 0, seed: 23, lite: true }) +
        '<ellipse cx="-10" cy="-20" rx="60" ry="48" fill="url(#k-hi-r)" opacity=".5"/><path d="M-90 20C-50 34 20 34 90 16M-90 44C-50 58 20 58 90 40" class="st-crease" stroke-opacity=".24"/>' + mole(-34, -34, 5.4) + mole(32, 22, 3.8) + mole(-4, 60, 4.4, { irr: 10 });
      var toeL = '<rect x="-90" y="-90" width="180" height="180" fill="var(--st-lens-bg)"/><g transform="scale(.85)">' + skWeb() + '</g><circle cx="0" cy="0" r="26" class="st-ring-dash"/>';
      var kt = BM([30, 148]), names = [tr('Back of the knee', 'Polvitaive', 'Knävecket'), tr('Sole of the foot', 'Jalkapohja', 'Fotsulan'), tr('Between the toes', 'Varpaiden välit', 'Mellan tårna')];
      if (still) {
        s += skTile(c, 0, 226, 12, 128, 66, '<g transform="translate(80 -150)">' + skSeated() + '</g>', .135, tr('Sit down', 'Istu', 'Sitt'), { cy: 33 });
        s += skTile(c, 1, 226, 82, 128, 66, knee, .5, names[0]);
        s += skTile(c, 2, 226, 152, 128, 66, soleL, .5, names[1]);
        s += skTile(c, 3, 226, 222, 128, 66, toeL, .5, names[2]);
      } else {
        s += c.show(3.4, 7, K.lens(LX, LY, LR, knee, { label: names[0], target: kt }), { fade: .35 });
        s += c.show(7, 10.2, K.lens(LX, LY, LR, soleL, { label: names[1] }), { fade: .35 });
        s += c.show(10.2, 14, K.lens(LX, LY, LR, toeL, { label: names[2], target: gaps[1] }), { fade: .35, hold: true });
        for (i = 0; i < 4; i++) s += c.phaseShow(i, '<g transform="translate(34 32)">' + c.marker(i, 0, 0, 11) + '</g>', { fade: .3 });
      }
      return s;
    }
  });

  /* ---------- s-sk-duck: the ugly duckling, one mole that looks different from the rest ---------- */
  var DUCK = [[30, 34, 9], [96, 26, 10], [160, 44, 9.5], [52, 96, 10], [122, 84, 9], [188, 102, 10.5], [44, 168, 9.5], [176, 188, 10], [60, 232, 10], [132, 226, 9], [196, 250, 9.5]];
  var DUCK_ODD = [112, 150, 17];
  function skTick(x, y) { return '<g transform="translate(' + x + ' ' + y + ')"><circle r="6.4" fill="var(--st-ok)" stroke="var(--st-halo)" stroke-width="1.4"/><path d="M-2.8 .2l2 2.2 3.8-4.4" stroke="#fff" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>'; }
  stage.define('s-sk-duck', {
    dur: 12,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Look at all your moles together', 'Katso kaikkia luomiasi yhdessä', 'Titta på alla dina leverfläckar tillsammans'] },
      { at: 3, cap: ['Compare them with each other: most look alike', 'Vertaa niitä toisiinsa: useimmat näyttävät samanlaisilta', 'Jämför dem med varandra: de flesta ser likadana ut'] },
      { at: 6.2, cap: ['Find the one that looks different from the rest: the ugly duckling', 'Etsi se, joka näyttää erilaiselta kuin muut: rumaa ankanpoikasta', 'Hitta den som ser annorlunda ut än de andra: den fula ankungen'] },
      { at: 9.2, cap: ['Have it examined by a doctor', 'Näytä se lääkärille tutkittavaksi', 'Låt en läkare undersöka den'] }
    ],
    desc: [
      'A patch of skin with a dozen moles. At first a band of light sweeps across them all. Then a green tick appears on each of eleven moles that look alike. One mole is larger, darker and uneven. The rest of the skin dims and a ring pulses round it, with a close-up beside a typical mole to show the difference. Last, a pin marks it as the one to have examined by a doctor.',
      'Ihoalue, jolla on tusina luomea. Aluksi valokaista kulkee niiden kaikkien yli. Sitten yksitoista toistensa kaltaista luomea saa vihreän ruksin. Yksi luomi on suurempi, tummempi ja epätasainen. Muu iho himmenee ja sen ympärillä sykkii rengas, ja lähikuva näyttää eron tavalliseen luomeen. Lopuksi neula merkitsee sen luomeksi, joka kannattaa näyttää lääkärille.',
      'Ett hudområde med ett dussin leverfläckar. Först sveper ett ljusband över dem alla. Sedan får elva likadana fläckar en grön bock. En fläck är större, mörkare och ojämn. Resten av huden tonas ned och en ring pulserar runt den, med en närbild bredvid en typisk fläck som visar skillnaden. Till sist markerar en nål att den ska undersökas av en läkare.'
    ],
    draw: function (c) {
      var s = '', i, still = c.still, mole = skMoles(c), FW = 226, FH = 276;
      var odd = K.mole({ x: DUCK_ODD[0], y: DUCK_ODD[1], r: DUCK_ODD[2], seed: 44, irr: .55, ragged: .35, tone: 'multi' });
      s += K.room({ kind: 'wall' });
      var cid = c.id('fld');
      c.defs('<clipPath id="' + cid + '"><path d="' + K.rr(0, 0, FW, FH, 14) + '"/></clipPath><radialGradient id="' + c.id('vl') + '" gradientUnits="userSpaceOnUse" cx="' + DUCK_ODD[0] + '" cy="' + DUCK_ODD[1] + '" r="150"><stop offset="0" style="stop-color:rgb(var(--st-shadow));stop-opacity:0"/><stop offset=".26" style="stop-color:rgb(var(--st-shadow));stop-opacity:0"/><stop offset=".6" style="stop-color:rgb(var(--st-shadow));stop-opacity:.5"/><stop offset="1" style="stop-color:rgb(var(--st-shadow));stop-opacity:.6"/></radialGradient>');
      var field = K.skinPatch({ w: FW, h: FH, seed: 61, r: 0, lite: true });
      var ticks = '';
      DUCK.forEach(function (m, k) {
        field += mole(m[0], m[1], m[2], { irr: k % 3 ? 0 : 12 });
        ticks += c.show(3.2 + k * .22, 6.2 + 0, skTick(m[0] + m[2] * .9, m[1] - m[2] * .9), { fade: .2, fadeOut: .3 });
      });
      field += odd;
      if (still) { DUCK.forEach(function (m) { ticks += ''; }); }
      /* veil that dims everything but the odd one, a pulsing ring, the pin */
      var veil = '<rect width="' + FW + '" height="' + FH + '" fill="url(#' + c.id('vl') + ')"/>';
      var ringO = '<circle cx="' + DUCK_ODD[0] + '" cy="' + DUCK_ODD[1] + '" r="30" class="st-ring" style="stroke:var(--st-warn)"/>';
      var pin = '<g transform="translate(' + (DUCK_ODD[0] + 22) + ' ' + (DUCK_ODD[1] - 30) + ')"><path d="M0 0C-9 -12 -12 -20 -12 -26C-12 -34 -6 -40 0 -40C6 -40 12 -34 12 -26C12 -20 9 -12 0 0Z" fill="var(--st-guide)" stroke="var(--st-halo)" stroke-width="1.6"/><circle cy="-26" r="4.6" fill="#fff"/></g>';
      var inner = field + (still ? ticks + veil + ringO : ticks + c.show(6.4, 12, veil, { fade: .6, hold: true }) + c.show(6.6, 12, c.pulse(6.6, 12, ringO, { count: 5, scale: 1.12 }), { fade: .3, hold: true }));
      inner += c.show(9.4, 12, c.anim([{ t: 9.4, y: -26, o: 0 }, { t: 10, y: 0, o: 1 }], pin, {}), { fade: .2, hold: true });
      if (still) inner += pin + '<g transform="translate(30 30)">' + c.marker(0, 0, 0, 11) + '</g>';
      inner += skBandV(c, .4, 2.8, 0, -30, FW + 30, FH, { op: .4, key: 'd', h: 40, stillAt: .55 }).replace('<g clip-path', '<g clip-path');
      s += '<g transform="translate(12 12)"><g clip-path="url(#' + cid + ')">' + inner + '</g><path d="' + K.rr(0, 0, FW, FH, 14) + '" fill="none" stroke="var(--st-contour)" stroke-width="1.4"/></g>';
      /* the right column */
      var pw = 108, ph = 128, LX = 300, LY = 78, LR = 50;
      var panel = function (id, y, content, label, tone) {
        return '<g transform="translate(246 ' + y + ')"><clipPath id="' + id + '"><path d="' + K.rr(0, 0, pw, ph, 12) + '"/></clipPath><path d="' + K.rr(0, 0, pw, ph, 12) + '" fill="var(--st-lens-bg)"/><g clip-path="url(#' + id + ')"><g transform="translate(54 58)">' + content + '</g></g><path d="' + K.rr(0, 0, pw, ph, 12) + '" fill="none" stroke="var(--st-' + tone + ')" stroke-width="2"/>' + K.callout(label, [pw / 2, ph - 15], null, { size: 12 }) + '</g>';
      };
      var skinBg = function (seed) { return K.skinPatch({ x: -60, y: -60, w: 120, h: 130, r: 0, seed: seed, lite: true }); };
      var typical = skinBg(70) + mole(0, -2, 22), different = skinBg(71) + K.mole({ x: 0, y: -2, r: 32, seed: 44, irr: .55, ragged: .35, tone: 'multi' });
      var alike = '<rect x="-80" y="-80" width="160" height="160" fill="var(--st-lens-bg)"/>' + K.skinPatch({ x: -80, y: -80, w: 160, h: 160, r: 0, seed: 72, lite: true }) + '<g transform="scale(.85)">' + mole(-36, -30, 17) + mole(30, -34, 18) + mole(-4, 30, 17) + skTick(-18, -48) + skTick(48, -52) + skTick(14, 12) + '</g>';
      var typicalCard = panel(c.id('c1'), 14, typical, tr('A typical mole', 'Tavallinen luomi', 'En typisk fläck'), 'ok'), differentCard = panel(c.id('c2'), 150, different, tr('The odd one out', 'Poikkeava', 'Den som avviker'), 'warn');
      if (still) {
        s += skTile(c, 1, 246, 12, 108, 66, alike, .42, tr('All alike', 'Samanlaisia', 'Likadana'));
        s += skTile(c, 2, 246, 84, 108, 66, '<g transform="translate(-60 -2)">' + typical + '</g><g transform="translate(60 -2)">' + different + '</g>', .5, tr('Odd one out', 'Poikkeava', 'Avviker'), { tone: 'warn' });
        s += skTile(c, 3, 246, 156, 108, 90, K.calendar({ x: -48, y: -50, w: 96, h: 88, month: tr('Mar', 'Maalis', 'Mars'), marks: [9] }), .85, tr('Show a doctor', 'Lääkärille', 'Till läkare'), { cy: 38 });
      } else {
        s += c.show(0, 6.2, K.lens(LX, LY, LR, alike, { label: tr('Most look alike', 'Useimmat samanlaisia', 'De flesta lika') }), { fade: .35 });
        s += c.show(6.2, 12, typicalCard + differentCard, { fade: .4, hold: true });
        s += c.show(9.4, 12, K.callout(tr('Show a doctor', 'Näytä lääkärille', 'Visa för läkare'), [DUCK_ODD[0] + 12 + 12, DUCK_ODD[1] + 56], null, { size: 12.5, tone: 'warn' }), { fade: .3, hold: true });
        for (i = 0; i < 4; i++) s += c.phaseShow(i, '<g transform="translate(34 32)">' + c.marker(i, 0, 0, 11) + '</g>', { fade: .3 });
      }
      return s;
    }
  });

  /* ---------- s-sk-photo: a photo of anything odd, with a ruler, and a later photo to compare ---------- */
  stage.define('s-sk-photo', {
    dur: 13,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Put a ruler or tape measure beside the spot', 'Aseta viivotin tai mittanauha kohdan viereen', 'Lägg en linjal eller ett måttband bredvid fläcken'] },
      { at: 3.2, cap: ['Take a photo with the ruler in the picture', 'Ota kuva niin, että viivotin näkyy kuvassa', 'Ta ett foto med linjalen i bilden'] },
      { at: 6.4, cap: ['The photo is saved with its date', 'Kuva tallentuu päivämäärän kanssa', 'Fotot sparas med datum'] },
      { at: 9.6, cap: ['Take another one later and compare: change is easier to spot', 'Ota myöhemmin uusi kuva ja vertaa: muutos on helpompi huomata', 'Ta ett nytt senare och jämför: förändring är lättare att se'] }
    ],
    desc: [
      'Close-up of skin with a brown mole and a clear ruler sliding in beside it. A phone comes in from the right and its camera screen shows the mole and the ruler with a viewfinder frame. The shutter button pulses and the picture flashes. The phone then shows the saved photo with a date, and a calendar page rings the day. Last, two photos taken months apart sit side by side: the earlier one with a small mole and the later one with a larger, more uneven mole, with a dashed ring showing the first size. Any change is worth showing to a doctor.',
      'Lähikuva ihosta, jossa on ruskea luomi ja sen viereen liukuva läpinäkyvä viivotin. Puhelin tulee oikealta ja sen kameranäytössä näkyvät luomi ja viivotin tähtäinkehyksessä. Suljinpainike sykkii ja kuva välähtää. Sitten puhelin näyttää tallennetun kuvan päivämäärän kanssa ja kalenterisivulla on päivä ympyröitynä. Lopuksi kaksi kuukausien välein otettua kuvaa on vierekkäin: aiemmassa pieni luomi ja myöhemmässä suurempi, epätasaisempi luomi, ja katkoviivarengas näyttää ensimmäisen koon. Muutos kannattaa näyttää lääkärille.',
      'Närbild av hud med en brun leverfläck och en genomskinlig linjal som glider in bredvid. En telefon kommer in från höger och kameraskärmen visar fläcken och linjalen med en sökarram. Avtryckaren pulserar och bilden blixtrar. Sedan visar telefonen det sparade fotot med datum och ett kalenderblad ringar in dagen. Till sist ligger två foton tagna med månaders mellanrum bredvid varandra: det tidigare med en liten fläck och det senare med en större, ojämnare fläck, med en streckad ring som visar första storleken. Varje förändring är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', i, still = c.still;
      var mA = skDef(c, 'mA', K.mole({ r: 22, seed: 5, irr: .25, ragged: .15, tone: 'brown' })), mB = skDef(c, 'mB', K.mole({ r: 22, seed: 5, irr: .6, ragged: .45, tone: 'multi' }));
      var rl = skDef(c, 'rl', K.ruler({ cm: 4, u: 38 }));
      s += K.skinPatch({ w: 360, h: 300, seed: 81, r: 0, lite: true }) + '<rect width="360" height="300" fill="url(#k-vig)"/>';
      var MX = 112, MY = 148;
      /* the mole, the ruler sliding in */
      s += mA('translate(' + MX + ' ' + MY + ')');
      var ruler = '<g transform="translate(36 214)">' + rl() + '</g>';
      s += still ? ruler : c.show(.3, 9.9, c.anim([{ t: .3, x: -190 }, { t: 1.6, x: 0 }], ruler, {}), { fade: .3 });
      s += c.show(1.6, 3.4, c.pulse(1.6, 3.4, '<circle cx="' + MX + '" cy="' + MY + '" r="36" class="st-ring-dash"/>', { count: 2, scale: 1.1 }), { fade: .25 });
      if (still) s += '<circle cx="' + MX + '" cy="' + MY + '" r="36" class="st-ring-dash"/>';
      /* what a photo looks like: skin, the mole and the ruler, drawn about the centre */
      var photo = function (def, w, h, seed, sc, withRing) {
        return K.skinPatch({ x: -w / 2, y: -h / 2, w: w, h: h, r: 0, seed: seed, lite: true }) + '<g transform="translate(0 -4) scale(' + sc + ')">' + def('translate(0 -6)') + (withRing ? '<circle cy="-6" r="27" class="st-ring-dash"/>' : '') + '</g><g transform="translate(' + f1(-w * .4) + ' ' + f1(h * .3) + ') scale(' + f1(sc * .8) + ')">' + rl() + '</g>';
      };
      /* the phone: camera view */
      var phoneCam = K.phone({ w: 92, h: 176, content: photo(mA, 84, 160, 82, 1.0, false) });
      var phoneSaved = K.phone({ w: 92, h: 176, screen: 'dark', content: photo(mA, 84, 160, 82, 1.0, false) + '<rect x="-42" y="40" width="84" height="38" fill="#000" opacity=".5"/><text x="0" y="56" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fff">' + A.esc(tr('12 Mar', '12.3.', '12 mars')) + '</text><g transform="translate(0 66)">' + skTick(0, 0).replace('r="6.4"', 'r="6"') + '</g>' });
      var PX = 276, PY = 150, PT = 'translate(' + PX + ' ' + PY + ') rotate(-6) scale(1.22)';
      if (!still) {
        s += c.show(3.2, 6.9, c.anim([{ t: 3.2, x: 150, y: 24 }, { t: 4.1, x: 0, y: 0 }], '<g transform="' + PT + '">' + phoneCam + '</g>', {}), { fade: .35 });
        s += c.show(6.4, 9.9, '<g transform="' + PT + '">' + phoneSaved + '</g>', { fade: .35 });
        /* the cone of the camera and the flash */
        s += c.show(4.2, 6.2, '<path d="M214 100L138 128M214 200L138 172" class="st-ring-dash" style="stroke-width:1.4"/>', { fade: .3 });
        s += c.fade([[0, 0], [5.3, 0], [5.45, .75], [5.9, 0]], '<rect width="360" height="300" fill="#fff"/>');
        s += c.show(4.6, 6.2, c.pulse(4.6, 6.2, '<circle cx="' + (PX + 8) + '" cy="' + (PY + 82) + '" r="16" class="st-ring"/>', { count: 3, scale: 1.2 }), { fade: .25 });
      }
      /* phase 2: the calendar and the date */
      var cal = K.calendar({ x: 14, y: 14, w: 104, h: 96, month: tr('March', 'Maaliskuu', 'Mars'), marks: [12] });
      s += still ? '' : c.show(7, 9.8, c.anim([{ t: 7, y: -30 }, { t: 7.6, y: 0 }], cal, {}), { fade: .35 });
      /* phase 3: two photos side by side, earlier and later */
      var card = function (x, y, w, h, def, label, seed, ring) {
        var id = c.id('cd' + x);
        return '<g transform="translate(' + x + ' ' + y + ')"><path d="' + K.rr(-5, -5, w + 10, h + 10, 10) + '" fill="rgb(var(--st-shadow))" opacity=".3" transform="translate(2 5)" filter="url(#k-b3)"/><path d="' + K.rr(-5, -5, w + 10, h + 10, 10) + '" fill="url(#k-paper)"/><clipPath id="' + id + '"><path d="' + K.rr(0, 0, w, h, 6) + '"/></clipPath><g clip-path="url(#' + id + ')"><g transform="translate(' + w / 2 + ' ' + h / 2 + ')">' + photo(def, w, h, seed, 1.35, ring) + '</g></g><path d="' + K.rr(0, 0, w, h, 6) + '" fill="none" stroke="var(--st-contour)"/>' + K.callout(label, [w / 2, h + 20], null, { size: 12.5 }) + '</g>';
      };
      var cards = '<rect width="360" height="300" fill="rgb(var(--st-shadow))" opacity=".42"/>' + card(24, 30, 148, 168, mA, tr('12 Mar', '12.3.', '12 mars'), 82, false) + card(188, 30, 148, 168, mB, tr('12 Jun', '12.6.', '12 juni'), 82, true) + K.arrow(172, 114, 188, 114, { head: 7 });
      if (still) {
        s += skTile(c, 1, 226, 12, 128, 72, '<g transform="translate(0 0) rotate(-6) scale(.4)">' + phoneCam + '</g>', 1, tr('Photo and ruler', 'Kuva ja viivotin', 'Foto och linjal'), { cy: 32 });
        s += skTile(c, 2, 226, 90, 128, 72, '<g transform="translate(-30 -6) scale(.3)">' + phoneSaved + '</g><g transform="translate(34 -6) scale(.4)">' + K.calendar({ x: -52, y: -48, w: 104, h: 96, month: tr('March', 'Maaliskuu', 'Mars'), marks: [12] }) + '</g>', 1, tr('Saved, dated', 'Päivätty', 'Daterat'), { cy: 30 });
        s += skTile(c, 3, 226, 168, 128, 118, '<g transform="translate(-34 -12) scale(.34)">' + photo(mA, 148, 168, 82, 1.35, false) + '</g><g transform="translate(34 -12) scale(.34)">' + photo(mB, 148, 168, 82, 1.35, true) + '</g>', 1, tr('Compare later', 'Vertaa myöhemmin', 'Jämför senare'), { tone: 'warn', cy: 56 });
        s += '<g transform="translate(30 34)">' + c.marker(0, 0, 0, 11) + '</g>';
      } else {
        s += c.show(9.6, 13, cards, { fade: .45, hold: true });
      }
      /* the line of each phase */
      var labs = [tr('Ruler next to the spot', 'Viivotin kohdan vieressä', 'Linjal bredvid fläcken'), tr('Photo with the ruler', 'Kuva ja viivotin', 'Foto med linjalen'), tr('Saved with the date', 'Tallennus ja päivämäärä', 'Sparas med datum'), tr('Change is easier to spot', 'Muutos näkyy paremmin', 'Förändring syns bättre')];
      var lab = function (i, cx, cy) { var w = labs[i].length * 7.2 + 18; return K.callout(labs[i], [cx, cy], null, { size: 12 }) + '<g transform="translate(' + f1(cx - w / 2 - 14) + ' ' + cy + ')">' + c.marker(i, 0, 0, 11) + '</g>'; };
      if (!still) {
        s += c.phaseShow(0, lab(0, 120, 272), { fade: .3 }) + c.phaseShow(1, lab(1, 120, 272), { fade: .3 }) + c.phaseShow(2, lab(2, 120, 272), { fade: .3 }) + c.phaseShow(3, lab(3, 180, 272), { fade: .3 });
      }
      return s;
    }
  });

  /* ---------- pos-skin: the head-to-toe map for the skin check ---------- */
  /* Both legs of a whole figure (body units, the hips at y = len): thighs, knees, calves and feet; from the front the feet point out, from the back the heels show. */
  function skLegsFull(len, back) {
    var s = '';
    [-1, 1].forEach(function (sx) {
      var hx = sx * 29, kx = sx * 32, ax = sx * 27, ky = len + 188, ay = len + 330;
      s += K.limb([hx, len + 30], [kx, ky], 58, 44, { bulge: .03 }) + K.limb([kx, ky], [ax, ay], 43, 22, { bulge: back ? .15 : .1 });
      if (back) {
        s += '<ellipse cx="' + kx + '" cy="' + (ky - 3) + '" rx="16" ry="6" fill="url(#k-sh-r)" opacity=".6"/>' + K.glint(kx - 8, ky + 36, 6, 24, 6, .5);
        s += '<path d="M' + (ax - 15) + ' ' + (ay + 2) + 'C' + (ax - 19) + ' ' + (ay + 16) + ' ' + (ax - 12) + ' ' + (ay + 26) + ' ' + ax + ' ' + (ay + 26) + 'C' + (ax + 12) + ' ' + (ay + 26) + ' ' + (ax + 19) + ' ' + (ay + 16) + ' ' + (ax + 15) + ' ' + (ay + 2) + 'Z" fill="url(#k-skin-dome)"/>';
      } else {
        s += '<circle cx="' + kx + '" cy="' + ky + '" r="19" fill="url(#k-skin-dome)"/><ellipse cx="' + (kx - 4) + '" cy="' + (ky - 5) + '" rx="8" ry="7" fill="url(#k-hi-r)" opacity=".5"/>';
        s += K.foot({ view: 'top', x: ax + sx * 4, y: ay + 4, s: .62, r: 180 - sx * 14, flip: sx < 0 });
      }
    });
    return s;
  }
  function skFull(back, P) {
    var len = 150, s = '';
    s += skLegsFull(len, back);
    if (back) s += skBackTorso(len) + '<g transform="translate(0 -50)">' + skBackHead() + '</g>';
    else s += K.torso({ form: 'neutral', len: len }) + K.head({ x: 0, y: -50, hair: 'short', face: 'mannequin' });
    s += P.sh() + P.al() + P.ar();
    return s;
  }
  function skFullClip(c, name, tf) {
    var len = 150, HD = 'M0 -86C17 -86 29 -70 29 -48C29 -26 20 -8 9 -3C5 -1 2 0 0 0C-2 0 -5 -1 -9 -3C-20 -8 -29 -26 -29 -48C-29 -70 -17 -86 0 -86Z', k = '';
    k += '<path d="' + skTorsoD(len) + '" transform="' + tf + '"/><path d="' + HD + '" transform="' + tf + ' translate(0 -50)"/>';
    [-1, 1].forEach(function (sx) {
      var a = K.armPoints({ side: sx < 0 ? 'l' : 'r', pose: 'down' });
      k += '<path d="' + K.limbD(a.S, a.E, 40, 30).d + '" transform="' + tf + '"/><path d="' + K.limbD(a.E, a.W, 29, 19).d + '" transform="' + tf + '"/>';
      k += '<path d="' + K.limbD([sx * 29, len + 30], [sx * 32, len + 188], 58, 44).d + '" transform="' + tf + '"/><path d="' + K.limbD([sx * 32, len + 188], [sx * 27, len + 330], 43, 22).d + '" transform="' + tf + '"/>';
    });
    c.defs('<clipPath id="' + c.id(name) + '">' + k + '</clipPath>');
    return c.ref(name);
  }
  stage.define('pos-skin', {
    dur: 12,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Use two mirrors, then check your head: face, ears and scalp', 'Käytä kahta peiliä ja tarkista pää: kasvot, korvat ja päänahka', 'Använd två speglar och kolla huvudet: ansikte, öron och hårbotten'] },
      { at: 3, cap: ['Hands and nails, neck and chest, arms and armpits', 'Kädet ja kynnet, kaula ja rintakehä, käsivarret ja kainalot', 'Händer och naglar, hals och bröstkorg, armar och armhålor'] },
      { at: 6, cap: ['Then the back of your neck and your whole back', 'Sitten niska ja koko selkä', 'Sedan nacken och hela ryggen'] },
      { at: 9, cap: ['Finish with your bottom, legs and feet: seven steps, head to toe', 'Lopuksi pakarat, jalat ja jalkaterät: seitsemän vaihetta päästä jalkoihin', 'Avsluta med rumpan, benen och fötterna: sju steg, från topp till tå'] }
    ],
    desc: [
      'A map of the body from head to toe: a person seen from the front on the left and from the back on the right, in plain shorts, with a soft band of light travelling down both. Seven numbered zones match the seven steps of the skin check: 1 the two mirrors, 2 the head with face, ears and scalp, 3 the hands and nails, 4 the neck and chest, 5 the arms and armpits, 6 the back and the back of the neck, 7 the bottom, legs and feet. The zones light up in turn as the steps are named, and a list in the middle names them.',
      'Kartta kehosta päästä jalkoihin: henkilö edestä vasemmalla ja takaa oikealla, yksinkertaisissa shortseissa, ja pehmeä valokaista kulkee molempien yli alaspäin. Seitsemän numeroitua aluetta vastaa ihotarkistuksen seitsemää vaihetta: 1 kaksi peiliä, 2 pää eli kasvot, korvat ja päänahka, 3 kädet ja kynnet, 4 kaula ja rintakehä, 5 käsivarret ja kainalot, 6 selkä ja niska, 7 pakarat, jalat ja jalkaterät. Alueet syttyvät vuorotellen, kun vaiheet mainitaan, ja keskellä oleva lista nimeää ne.',
      'En karta över kroppen från topp till tå: en person framifrån till vänster och bakifrån till höger, i enkla shorts, med ett mjukt ljusband som färdas nedför båda. Sju numrerade zoner motsvarar hudkontrollens sju steg: 1 de två speglarna, 2 huvudet med ansikte, öron och hårbotten, 3 händer och naglar, 4 hals och bröstkorg, 5 armar och armhålor, 6 ryggen och nacken, 7 rumpan, benen och fötterna. Zonerna lyser upp i tur och ordning när stegen nämns, och en lista i mitten namnger dem.'
    ],
    draw: function (c) {
      var s = '', i, still = c.still, S = .4, FY = 66, XF = 80, XB = 280;
      var mf = K.mapper({ x: XF, y: FY, s: S }), mb = K.mapper({ x: XB, y: FY, s: S });
      s += K.room({ kind: 'wall' });
      s += '<ellipse cx="' + XF + '" cy="280" rx="50" ry="6" fill="url(#k-sh-r)" opacity=".7"/><ellipse cx="' + XB + '" cy="280" rx="50" ry="6" fill="url(#k-sh-r)" opacity=".7"/>';
      var ft = 'translate(' + XF + ' ' + FY + ') scale(' + S + ')', bt = 'translate(' + XB + ' ' + FY + ') scale(' + S + ')';
      var PP = { sh: skDef(c, 'sh', skShorts(150)), al: skDef(c, 'al', skArmDown('l')), ar: skDef(c, 'ar', skArmDown('r')) };
      s += '<g transform="' + ft + '">' + skFull(false, PP) + '</g><g transform="' + bt + '">' + skFull(true, PP) + '</g>';
      /* the soft band of light down both figures */
      s += skBand(c, .5, 11.4, 20, 8, 290, 140, { clip: skFullClip(c, 'pf', ft), op: .5, key: 'pf', h: 36, stillAt: .46 }).replace('', '');
      s += skBand(c, .5, 11.4, 240, 8, 290, 120, { clip: skFullClip(c, 'pb', bt), op: .5, key: 'pb', h: 36, stillAt: .46 });
      /* zones: [number, phase window, items on the front figure, on the back figure] as ring centres in body units with radii (scene units) */
      var ring = function (m, p, rx, ry) { var q = m(p); return '<ellipse cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" rx="' + rx + '" ry="' + ry + '" class="st-ring-dash"/>'; };
      var arm = K.armPoints({ side: 'r', pose: 'down' });
      var Z = [
        { n: 2, ph: 0, front: [[[0, -92], 15, 19]], back: [[[0, -92], 15, 19]], badge: [mf([30, -118]), mb([30, -118])] },
        { n: 3, ph: 1, front: [[[-arm.W[0], arm.W[1] + 30], 8, 12], [[arm.W[0], arm.W[1] + 30], 8, 12]], back: [], badge: [mf([-arm.W[0] - 34, arm.W[1] + 52])] },
        { n: 4, ph: 1, front: [[[0, 36], 24, 22]], back: [], badge: [mf([46, 6])] },
        { n: 5, ph: 1, front: [[[-arm.E[0] * .8, arm.E[1] * .55], 8, 18], [[arm.E[0] * .8, arm.E[1] * .55], 8, 18]], back: [], badge: [mf([-arm.E[0] - 26, 40])] },
        { n: 6, ph: 2, front: [], back: [[[0, 54], 26, 36]], badge: [mb([0, 8])] },
        { n: 7, ph: 3, front: [[[-32, 360], 10, 38], [[32, 360], 10, 38]], back: [[[0, 280], 30, 56]], badge: [mf([56, 380]), mb([48, 430])] }
      ];
      var legend = [], nbadge = function (n, x, y) { return K.badge(n, x, y, 9.5); };
      var acts = { 1: [0], 2: [0], 3: [1], 4: [1], 5: [1], 6: [2], 7: [3] };
      var live = function (n, inner) { return still ? inner : c.fade([[0, .4], [c.phase(acts[n][0]).t0, .4], [c.phase(acts[n][0]).t0 + .3, 1], [c.phase(acts[n][0]).t1 - .3, 1], [c.phase(acts[n][0]).t1, .4]], inner); };
      Z.forEach(function (z) {
        var rings = '';
        z.front.forEach(function (r) { rings += ring(mf, r[0], r[1], r[2]); });
        z.back.forEach(function (r) { rings += ring(mb, r[0], r[1], r[2]); });
        var badges = z.badge.map(function (b) { return nbadge(z.n, f1(b[0]), f1(b[1])); }).join('');
        var act = c.phase(z.ph);
        s += live(z.n, (still ? rings : c.pulse(act.t0 + .2, act.t1 - .1, rings, { count: 2, scale: 1.07 }).replace(/^/, '') + '') + badges);
      });
      /* the list in the middle */
      var names = [[tr('Mirrors', 'Peilit', 'Speglar'), 1], [tr('Head', 'Pää', 'Huvud'), 2], [tr('Hands', 'Kädet', 'Händer'), 3], [tr('Chest', 'Rinta', 'Bröst'), 4], [tr('Arms', 'Käsivarsi', 'Armar'), 5], [tr('Back', 'Selkä', 'Rygg'), 6], [tr('Legs', 'Jalat', 'Ben'), 7]];
      names.forEach(function (nm, k) {
        var y = 40 + k * 34, w = nm[0].length * 7.4 + 20;
        s += live(nm[1], '<g>' + K.callout(nm[0], [152 + w / 2, y], null, { size: 12.5 }) + nbadge(nm[1], 139, y) + '</g>');
      });
      return s;
    }
  });

  /*__NEXT__*/
})();
