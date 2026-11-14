import { A as C4A } from "../app.js";

/* care4all illustrations, part 2: breast, skin, testicle, bowel and gynae sign scenes. */
(function () {
  'use strict';
  var A = C4A, art = A.art, S = art.scenes;
  var ring = art.ring, label = art.label, drop = art.drop, M = function () { return art.motion(); };

  function field() { return '<rect width="320" height="200" style="fill:var(--sk)"/>'; }

  /* ---------- breast ---------- */
  function breastBase() {
    return field() + '<ellipse cx="120" cy="104" rx="84" ry="56" style="fill:#fff;opacity:.13"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:3" d="M24 40 C30 118 90 178 160 180 C230 178 290 118 296 40"/>' +
      '<ellipse cx="160" cy="118" rx="30" ry="28" style="fill:var(--sk-a)"/><circle cx="160" cy="121" r="9" style="fill:var(--sk-d)"/>' +
      '<circle cx="157" cy="118" r="3" style="fill:#fff;opacity:.35"/>';
  }
  S['br-lump'] = function () {
    return breastBase() + '<ellipse cx="108" cy="82" rx="22" ry="18" style="fill:#000;opacity:.1"/><ellipse cx="104" cy="78" rx="12" ry="9" style="fill:#fff;opacity:.2"/>' +
      ring(108, 82, 32) + '<circle cx="36" cy="40" r="15" class="hi" style="stroke-dasharray:3 4"/>' + label(36, 72, 'Armpit') + label(108, 130, 'A new lump');
  };
  S['br-tight'] = function () {
    var h = '';
    for (var i = 0; i < 9; i++) h += '<path class="ln" style="stroke:var(--sk-d);opacity:.55" d="M' + (112 + i * 10) + ' 56 L' + (92 + i * 10) + ' 108"/>';
    return breastBase() + '<g>' + h + '</g><ellipse cx="156" cy="82" rx="62" ry="32" class="hi" style="stroke-dasharray:4 5"/>' + label(160, 150, 'A tight, thick patch', 'middle').replace('y="150"', 'y="164"');
  };
  S['br-peau'] = function () {
    var p = '';
    for (var r = 0; r < 8; r++) for (var c = 0; c < 9; c++) p += '<ellipse cx="' + (196 + c * 11 + (r % 2 ? 5 : 0)) + '" cy="' + (62 + r * 11) + '" rx="2.6" ry="1.7" style="fill:var(--sk-d);opacity:.7"/>';
    return breastBase() + '<g' + (M() ? ' class="fadein"' : '') + '>' + p + '</g><path class="hi" style="stroke-dasharray:4 5" d="M184 54 C230 40 296 60 292 110 C288 150 214 156 188 130 C172 110 170 70 184 54Z"/>' +
      '<g transform="translate(46 150)"><circle r="21" style="fill:#F2A23B;stroke:#C77A12;stroke-width:2"/><g style="fill:#C77A12;opacity:.7"><circle cx="-8" cy="-6" r="1.8"/><circle cx="4" cy="-9" r="1.8"/><circle cx="10" cy="2" r="1.8"/><circle cx="-4" cy="6" r="1.8"/><circle cx="-12" cy="8" r="1.8"/><circle cx="6" cy="12" r="1.8"/></g></g>' + label(46, 190, 'Orange peel');
  };
  S['br-dimple'] = function () {
    var l = '';
    for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5; l += '<path class="ln" style="stroke:var(--sk-d);opacity:.75" d="M' + (112 + Math.cos(a) * 36).toFixed(1) + ' ' + (88 + Math.sin(a) * 28).toFixed(1) + ' L' + (112 + Math.cos(a) * 11).toFixed(1) + ' ' + (88 + Math.sin(a) * 8).toFixed(1) + '"/>'; }
    return breastBase() + l + '<ellipse cx="112" cy="88" rx="9" ry="7" style="fill:var(--sk-d);opacity:.7"/>' + ring(112, 88, 44) + label(112, 146, 'Skin pulled in');
  };
  S['br-red'] = function () {
    return breastBase() + '<path class="rd' + (M() ? ' glow' : '') + '" style="opacity:.5" d="M176 50 C236 36 300 60 294 110 C288 158 214 166 184 134 C164 112 160 66 176 50Z"/>' +
      '<path class="rd" style="opacity:.3" d="M170 42 C246 24 312 56 304 116 C296 170 210 178 176 140 C150 112 150 62 170 42Z"/>' + label(236, 188, 'Red, or darker skin');
  };
  S['br-hot'] = function () {
    var w = '';
    for (var i = 0; i < 3; i++) w += '<path class="hi' + (M() ? ' rise' : '') + '" style="animation-delay:' + (i * .4) + 's" d="M' + (206 + i * 28) + ' 70 C' + (198 + i * 28) + ' 56 ' + (214 + i * 28) + ' 46 ' + (206 + i * 28) + ' 30"/>';
    return S['br-red']() + w;
  };
  S['br-shape'] = function () {
    return field() + '<ellipse cx="90" cy="100" rx="60" ry="42" style="fill:#fff;opacity:.12"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:3" d="M24 50 C24 120 60 164 102 164 C140 164 152 120 152 92"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:3" d="M296 50 C296 120 260 164 218 164 C180 164 168 120 168 92" opacity="0"/>' +
      '<path class="hi" style="stroke-dasharray:4 5" d="M296 50 C296 124 262 170 220 170 C182 170 168 124 168 92"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:3" d="M280 56 C280 112 252 148 220 148 C188 148 176 118 176 92"/>' +
      '<g style="fill:var(--sk-a)"><ellipse cx="96" cy="112" rx="15" ry="14"/><ellipse cx="226" cy="104" rx="14" ry="13"/></g><g style="fill:var(--sk-d)"><circle cx="96" cy="114" r="5"/><circle cx="226" cy="106" r="5"/></g>' +
      label(90, 190, 'Usual') + label(226, 190, 'Changed');
  };
  S['br-nipple-in'] = function () {
    return field() + '<g transform="translate(86 96)"><ellipse rx="52" ry="48" style="fill:var(--sk-a)"/><circle r="17" style="fill:var(--sk-d)"/><circle cx="-5" cy="-5" r="5" style="fill:#fff;opacity:.35"/></g>' +
      '<g transform="translate(234 96)"><ellipse rx="52" ry="48" style="fill:var(--sk-a)"/><path class="ln" style="stroke:var(--sk-d);stroke-width:4" d="M-16 0 L16 0"/><path class="ln" style="stroke:var(--sk-d);opacity:.6" d="M-30-22 L-10-6 M30-22 L10-6 M-30 22 L-10 6 M30 22 L10 6"/></g>' +
      '<path class="hi" d="M146 96 L172 96 M164 88 L172 96 L164 104"/>' + label(86, 174, 'Pointed out') + label(234, 174, 'Turned in');
  };
  S['br-rash'] = function () {
    var f = '', pts = [[-24, -10], [-10, -22], [8, -18], [22, -4], [18, 14], [0, 22], [-18, 16], [-26, 4], [4, -4], [-8, 6]];
    pts.forEach(function (p, i) { f += '<path d="M' + p[0] + ' ' + p[1] + ' l7 -3 l3 6 l-6 4z" style="fill:#fff;opacity:.85" transform="rotate(' + (i * 37) + ' ' + p[0] + ' ' + p[1] + ')"/>'; });
    return field() + '<g transform="translate(160 100)"><ellipse rx="74" ry="66" style="fill:var(--sk-a)"/><ellipse rx="64" ry="56" class="rd" style="opacity:.4"/><circle r="17" style="fill:var(--sk-d)"/>' + f + '</g>' + ring(160, 100, 84) + label(160, 192, 'Scaly, itchy rash');
  };
  S['br-fluid'] = function () {
    var d = '';
    [['#CFE8F5', 86, 0], ['#EFD670', 160, .5], ['#C94A4A', 234, 1]].forEach(function (x) {
      d += '<g' + (M() ? ' class="fall"' : '') + ' style="' + (M() ? 'animation-delay:' + x[2] + 's;' : '') + 'fill:' + x[0] + ';stroke:var(--ink);stroke-width:1.5">' + drop(x[1], 120, 1.2) + '</g>';
    });
    return '<rect width="320" height="200" style="fill:var(--sk)"/><ellipse cx="160" cy="52" rx="62" ry="44" style="fill:var(--sk-a)"/><circle cx="160" cy="58" r="15" style="fill:var(--sk-d)"/>' + d +
      label(86, 184, 'Clear') + label(160, 184, 'Yellow') + label(234, 184, 'Blood');
  };
  S['br-sore'] = function () {
    return breastBase() + '<g transform="translate(212 92)"><ellipse rx="30" ry="20" style="fill:#A83A40"/><ellipse rx="19" ry="11" style="fill:#D87878"/><ellipse rx="36" ry="25" class="hi" style="stroke-dasharray:3 4"/></g>' + label(212, 140, 'A sore that stays');
  };

  /* ---------- skin and moles ---------- */
  var BR = '#6B4430';
  function mole(path, fill, extra) { return field() + '<path d="' + path + '" style="fill:' + (fill || BR) + ';stroke:rgba(0,0,0,.25);stroke-width:2"/>' + (extra || ''); }
  S['mole-asym'] = function () {
    return mole('M160 52 C132 52 112 76 112 100 C112 126 134 148 160 148 C184 152 218 138 224 108 C228 82 198 56 160 52Z', BR,
      '<path class="hi" d="M160 34 L160 168" style="stroke-dasharray:5 5"/><path class="hi" d="M96 100 L126 100 M104 92 L96 100 L104 108 M224 100 L248 100"/>' + label(110, 190, 'Left half') + label(212, 190, 'Right half'));
  };
  S['mole-border'] = function () {
    var p = '';
    for (var i = 0; i < 18; i++) { var a = i * Math.PI / 9, r = (i % 2 ? 68 : 50) + Math.sin(i * 1.9) * 6; p += (i ? 'L' : 'M') + (160 + Math.cos(a) * r).toFixed(1) + ' ' + (100 + Math.sin(a) * r * .82).toFixed(1); }
    return mole(p + 'Z', BR, '<path class="hi" style="stroke-dasharray:4 5" d="M160 30 C226 30 262 72 262 102 C262 140 218 172 160 172 C100 172 58 140 58 102 C58 70 96 30 160 30Z"/>' + label(160, 192, 'Ragged, blurred edge'));
  };
  S['mole-colour'] = function () {
    return mole('M160 50 C196 50 222 74 222 104 C222 134 194 152 160 152 C126 152 98 134 98 104 C98 74 124 50 160 50Z', '#8A5A3A',
      '<ellipse cx="148" cy="92" rx="22" ry="17" style="fill:#201816"/><ellipse cx="190" cy="118" rx="16" ry="13" style="fill:#D98A8A"/><ellipse cx="136" cy="124" rx="16" ry="11" style="fill:#C6A074"/><ellipse cx="184" cy="82" rx="10" ry="8" style="fill:#5B6779"/>' +
      '<g transform="translate(30 168)"><circle cx="0" cy="0" r="7" style="fill:#201816"/><circle cx="20" cy="0" r="7" style="fill:#D98A8A"/><circle cx="40" cy="0" r="7" style="fill:#C6A074"/><circle cx="60" cy="0" r="7" style="fill:#8A5A3A"/></g>' + label(210, 182, 'Many shades', 'start'));
  };
  S['mole-diam'] = function () {
    var t = '';
    for (var i = 0; i <= 14; i++) t += '<path class="ln" d="M' + (60 + i * 10) + ' 172 L' + (60 + i * 10) + ' ' + (i % 5 === 0 ? 160 : 166) + '"/>';
    return mole('M130 46 C166 44 190 68 190 98 C190 130 164 150 128 150 C94 150 70 128 72 98 C74 68 96 48 130 46Z', BR,
      '<circle cx="130" cy="98" r="30" class="hi" style="stroke-dasharray:3 4"/><rect x="60" y="172" width="140" height="10" rx="2" style="fill:var(--surface)" class="ln"/>' + t +
      '<path class="hi" d="M100 156 L160 156 M100 150 L100 162 M160 150 L160 162"/>' + label(130, 138, '6 mm').replace('y="138"', 'y="196"').replace('x="130"', 'x="130"') + '<g transform="translate(222 98)"><circle r="40" style="fill:none"/></g>');
  };
  S['mole-evolve'] = function () {
    var sizes = [[64, 100, 24, 0], [160, 100, 32, 1], [256, 100, 42, 2]], s = field();
    sizes.forEach(function (z, i) {
      var p = '';
      for (var k = 0; k < 14; k++) { var a = k * Math.PI / 7, r = z[2] + (i ? Math.sin(k * 2.1 + i) * i * 4 : 0); p += (k ? 'L' : 'M') + (z[0] + Math.cos(a) * r).toFixed(1) + ' ' + (z[1] + Math.sin(a) * r * .9).toFixed(1); }
      s += '<path d="' + p + 'Z" style="fill:' + ['#8A5A3A', '#6B4430', '#3D2A22'][i] + ';stroke:rgba(0,0,0,.25);stroke-width:2"/>';
    });
    s += '<path class="hi" d="M96 100 L118 100 M110 94 L118 100 L110 106 M198 100 L212 100 M206 94 L212 100 L206 106"/>' + label(64, 170, 'Now') + label(160, 170, 'Weeks later') + label(256, 170, 'Months later');
    return s;
  };
  S['mole-raised'] = function () {
    return '<rect width="320" height="200" class="a-bg"/><path class="sk" d="M0 120 L320 120 L320 200 L0 200Z"/><path class="limb-o" d="M0 120 L320 120" stroke-width="4" style="stroke:var(--sk-d)"/>' +
      '<ellipse cx="80" cy="120" rx="30" ry="5" style="fill:' + BR + '"/><path d="M178 120 C184 92 208 78 226 86 C248 80 262 100 266 120Z" style="fill:' + BR + ';stroke:rgba(0,0,0,.25);stroke-width:2"/>' +
      '<g style="fill:#3D2A22;opacity:.6"><circle cx="206" cy="102" r="2.4"/><circle cx="226" cy="98" r="2.4"/><circle cx="244" cy="106" r="2.4"/></g>' + label(80, 158, 'Flat') + label(222, 158, 'Raised, rough') + ring(222, 98, 40);
  };
  S['mole-nail'] = function () {
    return '<rect width="320" height="200" class="a-bg"/><path class="sk" d="M112 210 L112 76 C112 30 208 30 208 76 L208 210Z"/><rect x="126" y="54" width="68" height="76" rx="30" style="fill:#F7E4DC;stroke:var(--sk-d);stroke-width:2"/>' +
      '<rect x="154" y="60" width="12" height="68" rx="4" style="fill:#2B1E1A"/>' + ring(160, 94, 54) + label(160, 192, 'A dark stripe under the nail');
  };
  S['mole-new'] = function () {
    var m = [[60, 60], [120, 140], [74, 126], [180, 56], [250, 130], [150, 96]], s = field();
    m.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" style="fill:#8A5A3A"/>'; });
    return s + '<g' + (M() ? ' class="popin"' : '') + '><circle cx="236" cy="70" r="11" style="fill:#4A3126"/></g>' + ring(236, 70, 28) + label(236, 118, 'New', 'middle');
  };
  S['mole-ugly'] = function () {
    var m = [[56, 54], [112, 78], [64, 112], [128, 138], [58, 160], [112, 36]], s = field();
    m.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" style="fill:#8A5A3A"/>'; });
    var p2 = '';
    for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6, r = 30 + Math.sin(k * 2.3) * 7; p2 += (k ? 'L' : 'M') + (232 + Math.cos(a) * r).toFixed(1) + ' ' + (100 + Math.sin(a) * r * .85).toFixed(1); }
    return s + '<path d="' + p2 + 'Z" style="fill:#2E211B;stroke:rgba(0,0,0,.3);stroke-width:2"/>' + ring(232, 100, 52) + label(232, 178, 'Looks different');
  };
  S['mole-dark'] = function () {
    return '<g style="--sk:#7C4E33;--sk-d:#5A3622;--sk-a:#5E3A25"><rect width="320" height="200" style="fill:var(--sk)"/><ellipse cx="160" cy="100" rx="82" ry="76" style="fill:#fff;opacity:.08"/>' +
      '<path d="M130 80 C150 62 190 70 196 96 C202 124 170 140 146 132 C124 124 118 96 130 80Z" style="fill:#1E1512"/></g>' + ring(162, 102, 56) + label(160, 190, 'Can look dark, even on a palm or sole');
  };
  S['skin-sore'] = function () {
    return field() + '<ellipse cx="160" cy="100" rx="56" ry="40" style="fill:#B8454A"/><ellipse cx="160" cy="104" rx="36" ry="24" style="fill:#D87C7C"/><g style="fill:#8A4A3A;opacity:.8"><circle cx="118" cy="92" r="3"/><circle cx="130" cy="76" r="3"/><circle cx="190" cy="72" r="3"/><circle cx="206" cy="92" r="3"/><circle cx="204" cy="118" r="3"/></g>' +
      '<g style="fill:#C94A4A">' + drop(172, 146, 1) + '</g>' + ring(160, 100, 70) + label(160, 190, 'An open sore that will not heal');
  };
  S['skin-pearl'] = function () {
    return field() + '<circle cx="160" cy="98" r="40" style="fill:#EDB6AC;stroke:rgba(0,0,0,.18);stroke-width:2"/><ellipse cx="160" cy="98" rx="16" ry="10" style="fill:#D88C86"/>' +
      '<path d="M138 84 C146 70 164 66 176 72" style="fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;opacity:.85"/>' +
      '<g style="fill:none;stroke:#C94A4A;stroke-width:1.6;opacity:.8"><path d="M128 100 C140 96 150 108 160 100"/><path d="M164 114 C176 108 184 118 192 112"/><path d="M140 118 C148 124 156 120 160 126"/></g>' + ring(160, 98, 58) + label(160, 178, 'Shiny, pearly bump');
  };
  S['skin-scaly'] = function () {
    var f = '';
    [[120, 80], [150, 66], [186, 84], [204, 106], [180, 128], [140, 130], [114, 108], [160, 100]].forEach(function (p, i) { f += '<path d="M' + p[0] + ' ' + p[1] + ' l12 -4 l5 9 l-10 6z" style="fill:#fff;opacity:.8" transform="rotate(' + (i * 41) + ' ' + p[0] + ' ' + p[1] + ')"/>'; });
    return field() + '<path d="M104 96 C108 64 168 54 200 74 C228 92 214 134 174 142 C130 148 100 128 104 96Z" class="rd" style="opacity:.75"/>' + f + ring(158, 100, 68) + label(158, 186, 'A red, scaly patch');
  };
  S['skin-scar'] = function () {
    return field() + '<path d="M104 100 C106 70 160 62 196 78 C226 92 214 130 176 138 C134 146 102 128 104 100Z" style="fill:#F4E6DC;stroke:rgba(0,0,0,.14);stroke-width:2"/><path d="M128 84 C146 76 168 76 184 86" style="fill:none;stroke:#fff;stroke-width:4;stroke-linecap:round;opacity:.9"/>' + ring(158, 104, 66) + label(158, 186, 'Smooth, shiny, tight');
  };
  S['skin-lip'] = function () {
    return '<rect width="320" height="200" class="a-bg"/><path d="M60 100 C90 54 140 56 160 74 C180 56 230 54 260 100 C230 150 190 162 160 162 C130 162 90 150 60 100Z" style="fill:#C9605F;stroke:var(--sk-d);stroke-width:2"/><path d="M62 100 C110 112 210 112 258 100" style="fill:none;stroke:#8A3A3A;stroke-width:3"/>' +
      '<g style="fill:#D9B27A"><path d="M130 130 l10 -6 l6 8 l-10 6z"/><path d="M158 136 l12 -4 l4 9 l-12 4z"/><path d="M178 126 l9 -6 l7 8 l-9 5z"/></g>' + ring(160, 134, 40) + label(160, 190, 'A crusty spot that does not heal');
  };

  /* ---------- testicle (schematic) ---------- */
  function scrotum(o) {
    o = o || {};
    var rx = o.big ? 32 : 24, ry = o.big ? 42 : 32;
    var s = '<path class="sk" d="M104 44 C104 28 216 28 216 44 C224 84 232 168 160 172 C88 168 96 84 104 44Z"/>' +
      '<ellipse class="tst" cx="132" cy="112" rx="24" ry="32" transform="rotate(8 132 112)"/>' +
      '<ellipse class="tst" cx="190" cy="116" rx="' + rx + '" ry="' + ry + '" transform="rotate(-8 190 116)"/>' +
      '<path class="ln" style="opacity:.5" d="M116 88 C100 96 98 132 114 142 M174 92 C158 100 156 134 170 146"/>';
    return s;
  }
  S['te-lump'] = function () { return scrotum() + '<circle cx="204" cy="94" r="8" style="fill:var(--c)"/>' + ring(204, 94, 24) + label(160, 192, 'A small, firm lump'); };
  S['te-size'] = function () { return scrotum({ big: true }) + '<ellipse cx="190" cy="116" rx="24" ry="32" class="hi" style="stroke-dasharray:3 4" transform="rotate(-8 190 116)"/>' + label(160, 192, 'One side gets bigger'); };
  S['te-heavy'] = function () {
    return '<g transform="translate(0 -10)">' + scrotum() + '</g><g transform="translate(258 96)"><path class="ln" d="M-14-20 C-14-36 14-36 14-20"/><path class="hif" d="M-26 20 C-26-6-14-18 0-18 C14-18 26-6 26 20 C26 34 16 40 0 40 C-16 40-26 34-26 20Z"/><path class="ln" d="M-26 20 C-26-6-14-18 0-18 C14-18 26-6 26 20 C26 34 16 40 0 40 C-16 40-26 34-26 20Z"/></g>' +
      '<path class="hi" d="M258 150 L258 176 M250 168 L258 176 L266 168"/>' + label(160, 196, 'Feels heavy or hard');
  };
  S['te-pain'] = function () { return scrotum() + '<g transform="translate(244 60) scale(.9)">' + art.glyph('pain') + '</g><g transform="translate(76 70) scale(.7)">' + art.glyph('pain') + '</g>'; };

  /* ---------- bowel and urine ---------- */
  function bowl(stool, blood) {
    var s = '<path class="ln" d="M96 40 C96 24 224 24 224 40 L230 100 C230 160 196 184 160 184 C124 184 90 160 90 100Z" style="fill:var(--surface)"/>' +
      '<ellipse cx="160" cy="112" rx="52" ry="58" style="fill:#BFE3F0"/>' +
      '<path d="M120 100 C120 86 170 80 196 94 C206 112 192 126 160 128 C132 130 118 116 120 100Z" style="fill:' + stool + '"/>';
    if (blood) s += '<path d="M128 96 C150 90 176 92 190 100" style="fill:none;stroke:#C23B3B;stroke-width:4;stroke-linecap:round"/><g' + (M() ? ' class="fall"' : '') + ' style="fill:#C23B3B">' + drop(172, 148, .9) + '</g>';
    return s;
  }
  S['bw-blood'] = function () { return bowl('#8A5A3A', true) + label(160, 196, 'Red blood'); };
  S['bw-dark'] = function () { return bowl('#17120F', false) + label(160, 196, 'Black or tar-like'); };
  S['bw-pale'] = function () { return bowl('#D8C9A4', false) + label(160, 196, 'Pale and greasy'); };
  S['bw-habit'] = function () {
    var h = [24, 26, 24, 25, 24, 26, 25, 52, 12, 60, 8, 46, 66, 16], s = '<rect x="22" y="70" width="276" height="56" rx="10" style="fill:var(--c);opacity:.1"/>';
    h.forEach(function (v, i) { s += '<rect x="' + (28 + i * 19.6) + '" y="' + (150 - v * 1.7) + '" width="12" height="' + (v * 1.7) + '" rx="3" style="fill:' + (i < 7 ? 'var(--line2)' : 'var(--c)') + '"/>'; });
    return s + '<path class="ln" d="M22 150 L298 150"/>' + label(94, 178, 'Usual') + label(226, 178, 'Not usual');
  };

  /* ---------- gynae ---------- */
  S['ce-bleed'] = function () {
    var s = '';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) {
      var x = 70 + c * 26, y = 44 + r * 28, per = (r === 0 && c > 1 && c < 6);
      s += '<rect x="' + x + '" y="' + y + '" width="22" height="22" rx="6" class="ln" style="fill:' + (per ? '#F1B3B3' : 'var(--surface)') + '"/>';
      if (!per && ((r === 1 && c === 3) || (r === 2 && c === 5) || (r === 2 && c === 1))) s += '<g' + (M() ? ' class="blink"' : '') + ' style="fill:#C23B3B">' + drop(x + 11, y + 12, .7) + '</g>';
    }
    return s + label(70, 30, 'Your usual period', 'start').replace('x="70" y="30"', 'x="70" y="30"') + label(160, 188, 'Blood when you do not expect it');
  };
  S['ce-heavy'] = function () {
    var s = '<g>';
    for (var i = 0; i < 3; i++) s += '<g style="fill:#E58B8B">' + drop(70 + i * 22, 100, 1.1) + '</g>';
    s += '</g>';
    for (var j = 0; j < 8; j++) s += '<g' + (M() ? ' class="blink"' : '') + ' style="fill:#C23B3B;animation-delay:' + (j * .15) + 's">' + drop(176 + (j % 4) * 28, 78 + Math.floor(j / 4) * 40, 1.1) + '</g>';
    return s + label(92, 150, 'Usual') + label(214, 170, 'Heavier than usual');
  };
  S['ce-discharge'] = function () {
    return '<g transform="translate(116 100) scale(2.4)"><g style="fill:#F0E5B0;stroke:var(--ink);stroke-width:.8">' + drop(0, 0, 1) + '</g></g><g transform="translate(206 100)"><path class="hi" d="M-26-18 C-16-28-6-8 4-18 C14-28 24-8 34-18"/><path class="hi" d="M-26 10 C-16 0-6 20 4 10 C14 0 24 20 34 10"/></g>' + label(160, 186, 'Different from your usual');
  };
})();
