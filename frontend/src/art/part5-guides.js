import { A as C4A } from "../app.js";

/* care4all illustrations, part 5: the self-check guides, redrawn.
   Each picture follows the written guides named under "The pictures are based on" on each self-check page:
   Cancer Society of Finland (Syöpäjärjestöt) and Terveyskirjasto first, then NHS, Breast Cancer Now, Orchid and Euromelanoma,
   then Breastcancer.org, the Testicular Cancer Society and the American Academy of Dermatology.
   Style: a clear pictogram of the position, plus a close-up diagram of the movement (the pattern, the pressure, the grip).
   Movement is SMIL inside the SVG, so every picture loops on its own and nothing needs a pause button. With animations
   off in Profile, the first frame is shown. */
(function () {
  'use strict';
  var A = C4A, art = A.art, S = art.scenes, label = art.label, limb = art.limb;
  var HAIR = 'fill:#4B3425', SPL = '0.45 0 0.55 1';

  function on() { return art.motion(); }
  function T(x, y, inner, s, r) { return '<g transform="translate(' + x + ' ' + y + ')' + (r ? ' rotate(' + r + ')' : '') + (s ? ' scale(' + s + ')' : '') + '">' + inner + '</g>'; }
  function aOp(vals, kt, dur, begin) { return on() ? '<animate attributeName="opacity" values="' + vals + '" keyTimes="' + kt + '" dur="' + dur + 's"' + (begin ? ' begin="' + begin + 's"' : '') + ' repeatCount="indefinite"/>' : ''; }
  function aTr(type, vals, dur, o) {
    o = o || {};
    if (!on()) return '';
    var n = vals.split(';').length, sp = [];
    for (var i = 0; i < n - 1; i++) sp.push(SPL);
    return '<animateTransform attributeName="transform" type="' + type + '" values="' + vals + '" dur="' + dur + 's"' + (o.kt ? ' keyTimes="' + o.kt + '"' : '') + (o.linear ? '' : ' calcMode="spline" keySplines="' + sp.join(';') + '"' + (o.kt ? '' : ' keyTimes="' + vals.split(';').map(function (x, k) { return (k / (n - 1)).toFixed(3); }).join(';') + '"')) + (o.begin ? ' begin="' + o.begin + 's"' : '') + ' repeatCount="indefinite"/>';
  }
  function aMo(path, dur, begin) { return on() ? '<animateMotion path="' + path + '" dur="' + dur + 's" repeatCount="indefinite"' + (begin ? ' begin="' + begin + 's"' : '') + '/>' : ''; }
  function aAttr(name, vals, dur, o) { o = o || {}; return on() ? '<animate attributeName="' + name + '" values="' + vals + '" dur="' + dur + 's"' + (o.kt ? ' keyTimes="' + o.kt + '"' : '') + (o.begin ? ' begin="' + o.begin + 's"' : '') + ' repeatCount="indefinite"/>' : ''; }
  function G(inner, anims, attrs) { return '<g' + (attrs ? ' ' + attrs : '') + '>' + inner + (anims || '') + '</g>'; }

  /* Show several things one after another, each for `seg` seconds. With animations off, the first one stays. */
  function cycle(items, seg, fade) {
    var n = items.length, tot = n * seg, f = ((fade || .5) / tot).toFixed(4), a = (seg / tot).toFixed(4), b = (seg / tot - f).toFixed(4);
    return items.map(function (it, i) {
      return '<g opacity="' + (on() ? 0 : (i === 0 ? 1 : 0)) + '">' + it + aOp('0;1;1;0;0', '0;' + f + ';' + b + ';' + a + ';1', tot, i * seg) + '</g>';
    }).join('');
  }
  function dots(n, k) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<circle cx="' + (160 + (i - (n - 1) / 2) * 14) + '" cy="196" r="' + (i === k ? 4 : 3) + '" style="fill:' + (i === k ? 'var(--ink)' : 'var(--line2)') + '"/>';
    return s;
  }
  function pulse(x, y, rx, ry) {
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" style="fill:var(--c);fill-opacity:.26;stroke:var(--cg);stroke-width:2.4">' + aAttr('fill-opacity', '.14;.4;.14', 1.1) + '</ellipse>';
  }
  function panel(x, y, w, h) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="16" style="fill:var(--surface);stroke:var(--line);stroke-width:1.2;opacity:.96"/>'; }

  /* Three flat finger pads, the way the guides say to feel. The origin is the middle of the pads. */
  function fingers(s) {
    var f = '';
    [-12, 0, 12].forEach(function (x) { f += '<rect class="hand" x="' + (x - 5.5) + '" y="-6" width="11" height="44" rx="5.5"/>'; });
    return '<g transform="scale(' + (s || 1) + ')"><path class="hand" d="M-20 30 L20 30 L20 50 C20 62 -20 62 -20 50Z"/>' + f + '<g class="pad">' + [-12, 0, 12].map(function (x) { return '<ellipse cx="' + x + '" cy="-1" rx="4.4" ry="5.4"/>'; }).join('') + '</g></g>';
  }

  /* ------------------------------------------------------------------ a person lying on their back, seen from the side */
  function lying(o) {
    o = o || {};
    var h = '<rect x="-2" y="40" width="128" height="9" rx="4.5" style="fill:var(--surface);stroke:var(--line2);stroke-width:1.2"/>' +
      '<rect x="0" y="27" width="27" height="14" rx="7" style="fill:var(--surface);stroke:var(--line2);stroke-width:1.2"/>' +
      '<rect x="94" y="27" width="30" height="13" rx="6" class="sk"/><rect x="22" y="27" width="76" height="14" rx="7" class="sk"/>' +
      limb('M28 30 C22 12 10 8 4 14', 6) + '<circle cx="4" cy="14" r="4.2" class="hand"/>' +
      '<ellipse cx="14" cy="26" rx="10" ry="9.5" class="sk"/><path d="M4.5 24 C4 14 22 12 24 22 C18 18 10 19 4.5 24Z" style="' + HAIR + '"/>' +
      '<path class="sk" d="M40 28 C42 10 66 10 68 28Z"/><circle cx="54" cy="14.4" r="1.8" style="fill:var(--sk-d)"/>' +
      limb('M34 30 C36 8 50 2 58 11', 6);
    h += T(58, 11, G('<ellipse rx="9" ry="4.6" class="hand" transform="rotate(8)"/><circle cx="5" cy="-.5" r="1.8" class="pad"/><circle cx="1.5" cy="-1.5" r="1.8" class="pad"/>', o.motion));
    return h;
  }

  /* the round "map" of a breast, seen from above, with the nipple in the middle */
  function bmap(cx, cy, R) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" style="fill:color-mix(in srgb,var(--sk) 86%,#fff);stroke:var(--sk-d);stroke-width:2.5"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R * .24).toFixed(1) + '" style="fill:var(--sk-a)"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (R * .08).toFixed(1) + '" style="fill:var(--sk-d)"/>';
  }
  function marker() { return '<circle r="14" class="hit"/><circle r="7" class="pad" style="stroke-width:2.4"/><circle r="2.6" style="fill:var(--cg)"/>'; }
  var TRAIL = 'fill="none" style="stroke:var(--cg);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 5;opacity:.85"';

  /* ============================================================ BREAST ============================================================ */
  S['s-br-lie'] = function () {
    return T(10, 34, lying({ motion: aTr('translate', '0 0;0 -2.4;0 0', 2.4) }), 2.5) +
      label(14, 26, 'Arm behind head', 'start') + label(306, 26, 'Hand on the breast', 'end') +
      '<path class="mo-arrow" d="M296 38 C280 52 260 56 246 58 M251 52 L246 58 L253 63"/>' +
      label(160, 184, 'Right hand for the left breast, and the other way round');
  };
  S['s-br-circles'] = function () {
    var cx = 214, cy = 102, R = 70;
    var spots = 'M-34 -26 L0 -42 L36 -28 L46 6 L30 36 L-4 44 L-36 26 Z';
    var inset = panel(8, 8, 134, 70) + T(12, 18, lying({ motion: aMo('M0 0 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0', 1.6) }), 1.06);
    var coin = '<circle cx="46" cy="140" r="12" fill="none" style="stroke:var(--cg);stroke-width:2.4;stroke-dasharray:3 4"/><text class="tx" x="46" y="170" text-anchor="middle" font-size="11">about 2.5 cm</text>' +
      '<path class="mo-arrow" d="M62 140 L112 140 M106 134 L112 140 L106 146"/>';
    var spin = G(T(0, 0, G(marker(), aMo('M0 0 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', 1.7))), aMo(spots, 11));
    return bmap(cx, cy, R) + '<path d="' + spots.replace(/-?\d+ -?\d+/g, function (m) { var p = m.split(' '); return (cx + +p[0]) + ' ' + (cy + +p[1]); }) + '" ' + TRAIL + '/>' +
      T(cx, cy, spin) + inset + coin + label(214, 22, 'Small circles', 'middle');
  };
  S['s-br-pattern'] = function () {
    var cx = 218, cy = 100, x0 = 150, x1 = 286, y0 = 34, y1 = 166;
    var strips = 'M' + (x0 + 8) + ' ' + (y0 + 6), k, a;
    for (k = 0; k < 7; k++) { var xx = x0 + 8 + k * 20, down = k % 2 === 0; strips += ' L' + xx + ' ' + (down ? y1 - 6 : y0 + 6); if (k < 6) strips += ' L' + (xx + 20) + ' ' + (down ? y1 - 6 : y0 + 6); }
    var spiral = '';
    for (k = 0; k <= 60; k++) { a = k * .32; var r = 4 + a * 3.1; spiral += (k ? ' L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1); }
    var spokes = 'M' + cx + ' ' + cy;
    for (k = 0; k < 8; k++) { a = k * Math.PI / 4; spokes += ' L' + (cx + 64 * Math.cos(a)).toFixed(1) + ' ' + (cy + 64 * Math.sin(a)).toFixed(1) + ' L' + cx + ' ' + cy; }
    var seg = 5, items = [['Up and down rows', strips], ['Growing circles', spiral], ['Spokes out', spokes]].map(function (p, i) {
      return '<path d="' + p[1] + '" ' + TRAIL + '/>' + T(0, 0, G(marker(), aMo(p[1], seg)), 1) + label(8, 22, p[0], 'start') + '<text class="tx" x="14" y="52" font-size="11" style="opacity:.7">Pattern ' + (i + 1) + ' of 3</text>';
    });
    return '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" rx="22" class="hi" style="stroke-dasharray:5 6;stroke-width:2"/>' + bmap(cx, cy, 52) +
      cycle(items, seg, .4) + label(218, 24, 'Collarbone', 'middle') + label(218, 184, 'Bra line', 'middle') +
      '<text class="tx" transform="translate(140 100) rotate(-90)" text-anchor="middle" font-size="10.5">Breastbone</text><text class="tx" transform="translate(296 100) rotate(90)" text-anchor="middle" font-size="10.5">Armpit</text>' +
      label(8, 184, 'Pick one pattern', 'start');
  };
  S['s-br-press'] = function () {
    var dome = '<path d="M30 140 C44 64 118 34 176 40 C236 46 282 84 292 140Z" style="fill:var(--sk);stroke:var(--sk-d);stroke-width:2.5"/>' +
      '<path d="M52 140 C64 88 120 66 174 70 C224 74 260 100 270 140Z" style="fill:var(--sk-a);opacity:.5"/>' +
      '<g style="fill:#EFE9E0;stroke:var(--sk-d);stroke-width:2"><rect x="20" y="140" width="282" height="13" rx="6.5"/><rect x="20" y="157" width="282" height="12" rx="6"/></g>';
    var finger = '<rect class="hand" x="-10" y="-84" width="20" height="84" rx="10"/><ellipse class="pad" cx="0" cy="-1" rx="10" ry="5.5"/>';
    var press = T(176, 40, G(finger, aTr('translate', '0 0;0 0;0 22;0 22;0 44;0 44;0 82;0 82;0 0', 8, { kt: '0;.06;.2;.3;.42;.52;.66;.76;1', linear: false })));
    var names = [['Light', 'skin', 34], ['Medium', 'middle of the breast', 62], ['Firm', 'until you feel the ribs', 90]].map(function (x, i) {
      var seg = 8 / 3;
      return '<g opacity="' + (on() ? .45 : (i === 0 ? 1 : .45)) + '"><rect x="10" y="' + (x[2] - 14) + '" width="106" height="24" rx="12" style="fill:var(--surface);stroke:var(--line2);stroke-width:1.5"/><text class="tx" x="63" y="' + (x[2] + 2) + '" text-anchor="middle">' + x[0] + '</text>' +
        aOp('.45;1;1;.45;.45', '0;.06;' + (1 / 3 - .04).toFixed(3) + ';' + (1 / 3).toFixed(3) + ';1', 8, i * seg) + '</g>';
    }).join('');
    return '<rect width="320" height="200" style="fill:var(--surface)"/>' + dome + press + names + label(160, 190, 'Press three times at each spot: light, medium, firm') +
      '<text class="tx" x="226" y="112" font-size="10.5" text-anchor="middle" style="opacity:.75">breast tissue</text><text class="tx" x="160" y="150" font-size="10.5" text-anchor="middle" style="opacity:.75">ribs</text>';
  };
  S['s-br-shower'] = function () {
    var fig = T(-20, 2, art.figure({ arms: 'upL' }));
    var drops = '';
    for (var i = 0; i < 8; i++) drops += '<path d="M' + (240 + (i % 4) * 17) + ' ' + (44 + (i > 3 ? 20 : 0)) + ' l-2 10" style="stroke:var(--cg);stroke-width:3;stroke-linecap:round;fill:none">' + aTr('translate', '0 -6;0 56', 1.4, { linear: true, begin: i * .17 }) + aOp('0;1;1;0', '0;.15;.7;1', 1.4, i * .17) + '</path>';
    var shower = '<path class="ln" d="M304 8 L304 28 C304 42 268 42 252 34 L242 30" style="stroke-width:4"/><ellipse cx="258" cy="34" rx="28" ry="9" style="fill:var(--surface)" class="ln"/>';
    var hnd = T(164, 128, T(0, 0, G(fingers(.62), aMo('M0 0 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0', 1.6)), 1, -90));
    return fig + shower + drops + hnd + label(160, 184, 'Soapy fingers glide easily') + label(304, 74, 'Same small circles', 'end');
  };
  S['s-br-armpit'] = function () {
    var fig = art.figure({ arms: 'upL' });
    var sweep = T(92, 118, G(T(0, 0, fingers(.62), 1, 0), aMo('M0 -14 L0 18 L0 -14', 1.5)));
    var around = T(184, 127, G(T(0, 0, fingers(.62), 1, -90), aMo('M0 0 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', 2.6)));
    var seg = 4.5;
    var items = [
      sweep + '<ellipse cx="90" cy="112" rx="22" ry="34" class="hit"/>' + label(92, 184, 'Armpit: sweep up and down', 'middle'),
      around + '<circle cx="184" cy="127" r="40" class="hit"/><circle cx="184" cy="127" r="40" class="hi" style="stroke-dasharray:3 5"/>' + label(236, 184, 'Around the nipple', 'middle')
    ];
    return fig + cycle(items, seg, .4);
  };

  /* ========================================================== TESTICLES ========================================================== */
  function pouch() {
    return '<path class="sk" d="M-38 0 C-42 40 -28 76 0 80 C28 76 42 40 38 0Z"/><ellipse class="tst" cx="-15" cy="40" rx="16" ry="23" transform="rotate(6 -15 40)"/><ellipse class="tst" cx="16" cy="44" rx="16" ry="23" transform="rotate(-6 16 44)"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:1.6" d="M0 6 L0 72"/>';
  }
  /* a standing person seen from the front, plain and neutral; used by the skin guides too */
  function person(view, o) {
    o = o || {};
    var back = view === 'back', s = '';
    var aL = o.raiseL ? 'M27 38 C12 28 8 12 14 2' : 'M27 38 C14 56 12 80 12 98', aR = o.raiseR ? 'M73 38 C88 28 92 12 86 2' : 'M73 38 C86 56 88 80 88 98';
    s += limb('M40 98 L38 176', 16) + limb('M60 98 L62 176', 16) + '<ellipse class="sk" cx="35" cy="184" rx="11" ry="5"/><ellipse class="sk" cx="65" cy="184" rx="11" ry="5"/>';
    s += limb(aL, 11) + limb(aR, 11);
    s += '<circle class="hand" cx="' + (o.raiseL ? 14 : 12) + '" cy="' + (o.raiseL ? 2 : 102) + '" r="6.5"/><circle class="hand" cx="' + (o.raiseR ? 86 : 88) + '" cy="' + (o.raiseR ? 2 : 102) + '" r="6.5"/>';
    s += '<rect class="sk" x="44" y="24" width="12" height="14" rx="5"/><path class="sk" d="M26 36 C34 31 66 31 74 36 C79 52 72 80 68 100 L32 100 C28 80 21 52 26 36Z"/>';
    if (back) s += '<circle class="sk" cx="50" cy="14" r="12.5"/><path d="M37 14 C36 -3 64 -3 63 14 C63 24 58 27 50 27 C42 27 37 24 37 14Z" style="' + HAIR + '"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:1.5;stroke-dasharray:1 4" d="M50 36 L50 98"/><path class="ln" style="stroke:var(--sk-d);stroke-width:1.6" d="M34 50 C40 58 46 56 48 50 M66 50 C60 58 54 56 52 50"/>';
    else s += '<circle class="sk" cx="50" cy="14" r="12.5"/><path d="M37 13 C37 -2 63 -2 63 13 C58 6 42 6 37 13Z" style="' + HAIR + '"/><circle cx="45.5" cy="15" r="1.4" style="fill:var(--ink)"/><circle cx="54.5" cy="15" r="1.4" style="fill:var(--ink)"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:1.5" d="M46 20 C49 22 51 22 54 20"/>' + (o.bust ? '<path class="ln" style="stroke:var(--sk-d);stroke-width:1.6" d="M35 56 C41 64 47 62 49 55 M65 56 C59 64 53 62 51 55"/>' : '');
    return s;
  }
  function showerHead(x, y, w) {
    var drops = '';
    for (var i = 0; i < 8; i++) drops += '<path d="M' + (x - w / 2 + 6 + (i % 4) * (w / 4.4)) + ' ' + (y + 14 + (i > 3 ? 12 : 0)) + ' l-2 10" style="stroke:var(--cg);stroke-width:3;stroke-linecap:round;fill:none">' + aTr('translate', '0 -4;0 60', 1.5, { linear: true, begin: i * .19 }) + aOp('0;1;1;0', '0;.15;.7;1', 1.5, i * .19) + '</path>';
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + w / 2 + '" ry="8" style="fill:var(--surface)" class="ln"/>' + drops;
  }
  S['s-te-warm'] = function () {
    var steam = [0, 1, 2].map(function (j) { return '<path class="hi" d="M' + (46 + j * 20) + ' 150 C' + (36 + j * 20) + ' 134 ' + (56 + j * 20) + ' 124 ' + (46 + j * 20) + ' 108" style="opacity:0">' + aOp('0;.9;0', '0;.5;1', 2.2, j * .7) + aTr('translate', '0 8;0 -14', 2.2, { linear: true, begin: j * .7 }) + '</path>'; }).join('');
    return T(120, 6, person('front'), .98) + '<path class="ln" d="M300 6 L300 18 C300 26 276 26 262 20" style="stroke-width:4"/>' + showerHead(240, 22, 56) + T(0, -50, steam) + label(10, 150, 'Warm water', 'start') + label(10, 178, 'relaxes the skin', 'start');
  };
  S['s-te-hold'] = function () {
    var body = '<path class="sk" d="M104 -10 C108 20 120 44 142 52 L178 52 C200 44 212 20 216 -10Z"/>' + limb('M132 44 C124 90 118 150 114 214', 40) + limb('M188 44 C196 90 202 150 206 214', 40);
    var bowl = '<path class="hand" d="M-52 -2 C-52 40 52 40 52 -2 L46 -12 C42 16 -42 16 -46 -12Z"/>' +
      [[-52, -4, -34], [-58, -14, -20], [-48, 4, -46]].map(function (f) { return '<rect class="hand" x="-6" y="-32" width="12" height="38" rx="6" transform="translate(' + f[0] + ' ' + f[1] + ') rotate(' + f[2] + ')"/>'; }).join('') +
      '<rect class="hand" x="-6" y="-30" width="12" height="36" rx="6" transform="translate(52 -6) rotate(26)"/>';
    var arm = limb('M46 4 C70 30 86 60 100 96', 17);
    var lift = G(T(160, 48, pouch(), .92) + T(160, 118, arm + bowl), aTr('translate', '0 0;0 -6;0 0', 2.8));
    return body + lift + label(160, 24, 'Cup the scrotum in one hand', 'middle') + label(160, 184, 'Feel the size and weight of each side') +
      '<text class="tx" x="128" y="96" font-size="12" text-anchor="middle" style="opacity:.8">L</text><text class="tx" x="192" y="100" font-size="12" text-anchor="middle" style="opacity:.8">R</text>';
  };
  S['s-te-roll'] = function () {
    var tes = '<ellipse class="tst" rx="42" ry="54"/><path d="M-24 -30 C-12 -42 8 -42 20 -32" style="fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;opacity:.3"/><circle cx="0" cy="-34" r="5" style="fill:var(--sk-d)"/><path d="M0 -50 L0 50" style="stroke:var(--sk-d);stroke-width:1.5;stroke-dasharray:2 5;fill:none"/>';
    var thumb = G('<rect class="hand" x="-14" y="-40" width="30" height="80" rx="15"/><ellipse class="pad" cx="12" cy="0" rx="5.5" ry="15"/>', aTr('translate', '0 -12;0 12;0 -12', 2.6));
    var fing = G('<rect class="hand" x="-16" y="-58" width="30" height="52" rx="15"/><rect class="hand" x="-16" y="4" width="30" height="52" rx="15"/><ellipse class="pad" cx="-11" cy="-32" rx="5.5" ry="14"/><ellipse class="pad" cx="-11" cy="30" rx="5.5" ry="14"/>', aTr('translate', '0 12;0 -12;0 12', 2.6));
    return T(160, 98, G(tes, aTr('rotate', '-35 0 0;35 0 0;-35 0 0', 2.6))) + T(100, 98, thumb) + T(222, 98, fing) +
      label(160, 24, 'Roll gently, one at a time', 'middle') + label(160, 184, 'Thumb and fingers, gently. No squeezing') +
      '<path class="mo-arrow" d="M70 48 C58 74 58 124 70 150 M66 144 L70 150 L76 142"/><path class="mo-arrow" d="M252 150 C264 124 264 74 252 48 M248 56 L252 48 L258 56"/>';
  };
  S['s-te-surface'] = function () {
    var tes = '<ellipse class="tst" cx="160" cy="100" rx="48" ry="62"/><path d="M130 58 C142 44 170 44 184 54" style="fill:none;stroke:#fff;stroke-width:6;stroke-linecap:round;opacity:.28"/>';
    var loop = 'M160 54 C186 54 200 76 200 100 C200 126 184 146 160 146 C136 146 120 126 120 100 C120 76 134 54 160 54 Z';
    var trail = '<path d="' + loop + '" ' + TRAIL + '/><path d="M160 74 C176 74 182 88 182 100 C182 114 174 126 160 126 C146 126 138 114 138 100 C138 88 146 74 160 74 Z" ' + TRAIL + '/>';
    return tes + trail + T(0, 0, G(marker(), aMo(loop + ' M160 74 C176 74 182 88 182 100 C182 114 174 126 160 126 C146 126 138 114 138 100 C138 88 146 74 160 74 Z', 6))) +
      label(160, 24, 'Feel the whole surface', 'middle') + label(160, 184, 'Smooth and firm, but not hard, is normal') +
      label(62, 100, 'Front and back', 'middle') + label(262, 100, 'Both sides', 'middle');
  };
  S['s-te-epi'] = function () {
    var shape = 'M176 54 C216 68 220 134 176 148';
    var tes = '<ellipse class="tst" cx="140" cy="100" rx="46" ry="60"/><path d="M104 60 C116 46 142 46 156 54" style="fill:none;stroke:#fff;stroke-width:6;stroke-linecap:round;opacity:.28"/>' +
      '<path d="' + shape + '" style="fill:none;stroke:var(--sk-d);stroke-width:17;stroke-linecap:round"/><path d="' + shape + '" style="fill:none;stroke:var(--sk-a);stroke-width:11;stroke-linecap:round"/>';
    var finger = T(214, 100, G('<rect class="hand" x="-10" y="-4" width="20" height="74" rx="10"/><ellipse class="pad" cx="0" cy="3" rx="9" ry="6"/><circle class="hit" cy="3" r="24"/>', aTr('translate', '0 -40;0 36;0 -40', 3.6)));
    return tes + finger + label(262, 36, 'Epididymis', 'middle') + '<path class="ln" d="M246 44 L222 62" style="stroke-dasharray:2 4"/>' + label(8, 24, 'Behind the testicle', 'start') + label(160, 184, 'A soft tube at the back. It is normal');
  };

  /* ============================================================== SKIN ============================================================== */
  function ear(x, y) { return '<ellipse class="sk" cx="' + x + '" cy="' + y + '" rx="9" ry="15"/><path class="ln" style="stroke:var(--sk-d);stroke-width:1.6" d="M' + x + ' ' + (y - 6) + ' C' + (x + 3) + ' ' + y + ' ' + (x + 1) + ' ' + (y + 6) + ' ' + x + ' ' + (y + 8) + '"/>'; }
  S['s-sk-head'] = function () {
    var face = ear(108, 100) + ear(212, 100) + '<rect class="sk" x="144" y="150" width="32" height="40" rx="12"/><ellipse class="sk" cx="160" cy="98" rx="54" ry="62"/>' +
      '<path d="M104 88 C100 24 220 24 216 88 C206 56 176 44 160 46 C144 44 114 56 104 88Z" style="' + HAIR + '"/>' +
      '<circle cx="140" cy="100" r="3.4" style="fill:var(--ink)"/><circle cx="180" cy="100" r="3.4" style="fill:var(--ink)"/><path class="ln" style="stroke:var(--sk-d);stroke-width:2.2" d="M160 106 C156 118 156 122 162 124"/>' +
      '<path d="M146 138 C154 146 166 146 174 138 C166 140 154 140 146 138Z" style="fill:var(--sk-a);stroke:var(--sk-d);stroke-width:2"/>';
    var comb = G(T(0, 0, '<rect x="-24" y="-5" width="48" height="10" rx="3" style="fill:var(--ink)"/>' + [-18, -9, 0, 9, 18].map(function (x) { return '<rect x="' + (x - 1.3) + '" y="5" width="2.6" height="9" rx="1.3" style="fill:var(--ink)"/>'; }).join('')), aTr('translate', '-34 0;34 0;-34 0', 2.2));
    return face + cycle([
      pulse(160, 54, 56, 22) + T(160, 52, comb) + label(160, 184, 'Scalp: part the hair with a comb', 'middle'),
      pulse(160, 100, 46, 40) + label(160, 184, 'Face, nose and around the eyes', 'middle'),
      pulse(108, 100, 14, 22) + pulse(212, 100, 14, 22) + label(160, 184, 'Ears: front and behind', 'middle'),
      pulse(160, 140, 22, 11) + label(160, 184, 'Lips and mouth', 'middle')
    ], 2.8, .5);
  };
  function handBig(palm, s) {
    var tops = [-4, -10, -6, 4], xs = [-18, -6, 6, 18], f = '', nails = '';
    xs.forEach(function (x, i) { f += '<rect class="hand" x="' + (x - 5.5) + '" y="' + tops[i] + '" width="11" height="52" rx="5.5"/>'; if (!palm) nails += '<rect x="' + (x - 3.4) + '" y="' + (tops[i] + 1.5) + '" width="6.8" height="9" rx="3.4" style="fill:#fff;opacity:.6;stroke:var(--sk-d);stroke-width:.9"/>'; });
    var thumb = '<rect class="hand" x="-6" y="-38" width="12" height="42" rx="6" transform="translate(-22 68) rotate(-38)"/>';
    var body = '<path class="hand" d="M-25 34 L25 34 L25 62 C25 82 12 94 0 94 C-12 94 -25 82 -25 62Z"/><rect x="-24" y="30" width="48" height="10" style="fill:var(--sk)"/>';
    var lines = palm ? '<path class="ln" style="stroke:var(--sk-d);stroke-width:1.4" d="M-18 54 C-6 60 6 58 18 50 M-14 66 C-4 72 6 70 14 64"/>' : '<path class="ln" style="stroke:var(--sk-d);stroke-width:1.2;opacity:.6" d="M-8 56 L-6 70 M6 56 L8 68"/>';
    return '<g transform="scale(' + s + ')">' + thumb + f + body + nails + lines + '</g>';
  }
  S['s-sk-hands'] = function () {
    var at = function (p) { return T(160, 36, handBig(p, 1.5)); };
    return cycle([
      at(false) + pulse(160, 118, 38, 36) + label(160, 184, 'Back of the hand', 'middle'),
      at(false) + pulse(140, 92, 8, 14) + pulse(160, 92, 8, 14) + pulse(180, 92, 8, 14) + label(160, 184, 'Between the fingers', 'middle'),
      at(false) + [133, 151, 169, 187].map(function (x, i) { return pulse(x, [32, 21, 29, 42][i], 7, 9); }).join('') + label(160, 184, 'Fingernails, and under them', 'middle'),
      T(160, 36, handBig(true, 1.5)) + pulse(160, 118, 38, 36) + label(160, 184, 'Turn it over: the palm', 'middle')
    ], 2.8, .5);
  };
  S['s-sk-torso'] = function () {
    var p = T(60, 4, person('front', { bust: true }), .98);
    var h = function (x, y, rx, ry) { return pulse(60 + x * .98, 4 + y * .98, rx * .98, ry * .98); };
    return p + cycle([
      h(50, 30, 14, 10) + label(236, 100, 'Neck and chest', 'middle'),
      h(50, 52, 24, 12) + label(236, 100, 'Chest', 'middle'),
      h(50, 66, 26, 7) + '<path class="mo-arrow" d="M104 62 C122 54 130 54 142 60"/>' + label(236, 100, 'Under the breasts', 'middle'),
      h(50, 86, 20, 12) + label(236, 100, 'Belly', 'middle')
    ], 2.6, .45);
  };
  S['s-sk-arms'] = function () {
    var p1 = T(8, 4, person('front'), .98), p2 = T(172, 4, person('front', { raiseL: true }), .98);
    var h1 = function (x, y, rx, ry) { return pulse(8 + x * .98, 4 + y * .98, rx * .98, ry * .98); };
    var h2 = function (x, y, rx, ry) { return pulse(172 + x * .98, 4 + y * .98, rx * .98, ry * .98); };
    return p1 + p2 + cycle([
      h1(19, 66, 9, 24) + h1(81, 66, 9, 24) + label(160, 184, 'Upper arms, front and back', 'middle'),
      h1(13, 90, 7, 14) + h1(87, 90, 7, 14) + pulse(8 + 12 * .98, 4 + 102 * .98, 9, 9) + pulse(8 + 88 * .98, 4 + 102 * .98, 9, 9) + label(160, 184, 'Elbows, forearms and hands', 'middle'),
      h2(30, 44, 11, 13) + label(160, 184, 'Raise the arm: the armpit', 'middle')
    ], 2.8, .45);
  };
  S['s-sk-back'] = function () {
    var p = T(30, 4, person('back'), .98);
    var h = function (x, y, rx, ry) { return pulse(30 + x * .98, 4 + y * .98, rx * .98, ry * .98); };
    var mirror = '<circle cx="250" cy="62" r="34" class="mir"/><circle cx="250" cy="62" r="34" class="mirf"/><path d="M232 46 C238 40 246 38 252 40" style="fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;opacity:.6"/><rect x="244" y="96" width="12" height="52" rx="6" class="hand"/>';
    var wave = G('<path class="mo-arrow" d="M214 70 C190 84 170 90 152 88"/>', aOp('.2;1;.2', '0;.5;1', 2));
    return p + mirror + wave + cycle([
      h(50, 46, 24, 12) + label(160, 184, 'Neck and top of the back', 'middle'),
      h(50, 64, 24, 11) + label(160, 184, 'Middle of the back', 'middle'),
      h(50, 84, 22, 11) + label(160, 184, 'Lower back', 'middle'),
      h(50, 104, 20, 9) + label(160, 184, 'Buttocks', 'middle')
    ], 2.6, .45) + label(250, 24, 'Hand mirror', 'middle');
  };
  S['s-sk-legs'] = function () {
    var p = T(18, 4, person('front'), .98);
    var h = function (x, y, rx, ry) { return pulse(18 + x * .98, 4 + y * .98, rx * .98, ry * .98); };
    var foot = T(236, 98, '<path class="sk" d="M0 78 C-30 70 -34 12 -16 -34 C-6 -50 14 -50 22 -34 C38 12 32 70 0 78Z"/>' + [[-18, -42, 7.5], [-6, -52, 6.8], [6, -54, 6.2], [17, -50, 5.8], [26, -42, 5.2]].map(function (c) { return '<circle class="sk" cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; }).join(''));
    var f = function (x, y, rx, ry) { return pulse(236 + x, 98 + y, rx, ry); };
    return p + foot + cycle([
      h(40, 128, 14, 34) + h(60, 128, 14, 34) + label(160, 184, 'Thighs and shins', 'middle'),
      h(35, 182, 14, 7) + h(65, 182, 14, 7) + label(160, 184, 'Tops of the feet', 'middle'),
      f(0, 4, 24, 44) + label(160, 184, 'Soles and heels', 'middle'),
      f(-12, -46, 5, 7) + f(0, -52, 5, 7) + f(12, -52, 5, 7) + f(22, -47, 5, 7) + label(160, 184, 'Between the toes, and the toenails', 'middle')
    ], 2.8, .45) + label(236, 24, 'Sole of the foot', 'middle');
  };
  S['s-sk-mirrors'] = function () {
    var big = '<rect x="22" y="8" width="150" height="184" rx="20" class="mir"/>' + T(52, 14, person('front'), .9) + '<rect x="22" y="8" width="150" height="184" rx="20" class="mirf"/>';
    var hand = '<circle cx="246" cy="66" r="40" class="mir"/><circle cx="246" cy="66" r="40" class="mirf"/><path d="M226 50 C232 42 242 40 250 42" style="fill:none;stroke:#fff;stroke-width:6;stroke-linecap:round;opacity:.6"/>' + limb('M246 108 L246 168', 11);
    return big + hand + label(97, 184, 'Full-length mirror', 'middle') + label(246, 184, 'Hand mirror', 'middle') + G('<path class="mo-arrow" d="M200 120 C186 106 180 96 178 84"/>', aOp('.2;1;.2', '0;.5;1', 2));
  };

  /* ================================================ the first picture on each self-check page =================================================
     The positions and the conditions the guides ask for, one after another. */
  function mirrorStand() {
    return '<rect x="86" y="8" width="148" height="184" rx="20" class="mir"/>' + T(110, 14, person('front', { bust: true }), .9) + '<rect x="86" y="8" width="148" height="184" rx="20" class="mirf"/>';
  }
  S['pos-breast'] = function () {
    var s1 = T(54, 44, mirrorStand(), .66) + label(160, 30, '1  Standing at a mirror', 'middle') + label(160, 184, 'Arms down, then raised, then hands on hips', 'middle') + dots(3, 0);
    var s2 = T(10, 52, lying({ motion: aMo('M0 0 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0', 1.6) }), 2.5) + label(160, 30, '2  Lying on your back', 'middle') + label(160, 184, 'Arm behind your head, other hand flat on the breast', 'middle') + dots(3, 1);
    var s3 = T(70, 8, art.figure({ arms: 'upL' }), .94).replace('translate(70 8)', 'translate(30 8)') + '<path class="ln" d="M302 8 L302 26 C302 40 266 40 250 32 L240 28" style="stroke-width:4"/>' + showerHead(256, 32, 50) + label(160, 30, '3  In the shower', 'middle') + label(160, 184, 'Wet, soapy skin: fingers glide easily', 'middle') + dots(3, 2);
    return cycle([s1, s2, s3], 3.6, .5);
  };
  S['pos-testicular'] = function () {
    var s1 = S['s-te-warm']().replace(/<g transform="translate\(120 6\)/, '<g transform="translate(110 6)') + dots(3, 0);
    var s2 = S['s-te-hold']() + dots(3, 1);
    var s3 = S['s-te-roll']() + dots(3, 2);
    return cycle([s1, s2, s3], 3.6, .5);
  };
  S['pos-skin'] = function () {
    var s1 = S['s-sk-mirrors']() + dots(3, 0);
    var s2 = T(40, 4, person('front'), .98) + T(180, 4, person('back'), .98) + label(160, 184, 'Front and back: look at all of your skin', 'middle') + dots(3, 1);
    var s3 = S['s-sk-back']() + dots(3, 2);
    return cycle([s1, s2, s3], 3.6, .5);
  };
})();
