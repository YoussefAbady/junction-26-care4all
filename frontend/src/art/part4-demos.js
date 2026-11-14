import { A as C4A } from "../app.js";

/* care4all illustrations, part 4: self-check demonstrations that show the movement.
   Every scene loops by itself when it is drawn as a demonstration (class "demo" on the svg). Classes named mo-*
   carry the movement, and styles.css switches them on only inside .art.demo. Without motion each scene still shows
   the pose, with arrows and dotted paths for the movement. Drawing happens at the origin inside translated groups
   so that rotations pivot where they should. */
(function () {
  'use strict';
  var A = C4A, art = A.art, S = art.scenes, label = art.label, limb = art.limb;

  function at(x, y, inner, cls, style) { return '<g' + (cls ? ' class="' + cls + '"' : '') + ' transform="translate(' + x + ' ' + y + ')"' + (style ? ' style="' + style + '"' : '') + '>' + inner + '</g>'; }
  function mo(cls, inner, style) { return '<g class="' + cls + '"' + (style ? ' style="' + style + '"' : '') + '>' + inner + '</g>'; }

  /* ---------- a hand, fingers up. The origin is the middle of the finger pads, so orbits and sweeps follow the pads. ---------- */
  function hand(s, o) {
    o = o || {};
    var tops = [-4, -10, -6, 4], xs = [-18, -6, 6, 18], f = '';
    xs.forEach(function (x, i) { f += '<rect class="hand" x="' + (x - 5.5) + '" y="' + tops[i] + '" width="11" height="52" rx="5.5"/>'; });
    var thumb = '<rect class="hand" x="-46" y="38" width="12" height="40" rx="6" transform="rotate(-30 -40 74)"/>';
    var palm = '<path class="hand" d="M-25 34 L25 34 L25 62 C25 82 12 94 0 94 C-12 94 -25 82 -25 62Z"/><rect x="-24" y="30" width="48" height="10" style="fill:var(--sk)"/>';
    var pads = '<g class="pad"><ellipse cx="-18" cy="2" rx="4.6" ry="5.8"/><ellipse cx="-6" cy="-4" rx="4.6" ry="5.8"/><ellipse cx="6" cy="0" rx="4.6" ry="5.8"/></g>';
    var glow = o.glow === false ? '' : '<circle class="hit mo-glow" cx="-6" cy="0" r="24"/>';
    return '<g transform="scale(' + (s || 1) + ')">' + glow + thumb + f + palm + pads + '</g>';
  }
  /* Same hand, lying along the x axis, fingers pointing right (used on the lying figure). */

  /* ---------- the figure, seen from the front, in a mirror ---------- */
  function mirrorBack() { return '<clipPath id="c4a-mc"><rect x="40" y="4" width="240" height="192" rx="24"/></clipPath><rect class="mir" x="40" y="4" width="240" height="192" rx="24"/>'; }
  function mirrorFront() { return '<path d="M52 150 L116 8 L146 8 L72 190Z" style="fill:#fff;opacity:.12"/><rect class="mirf" x="40" y="4" width="240" height="192" rx="24"/>'; }
  var HAIR = 'fill:#4B3425';
  function head() {
    return '<path d="M133 34 C131 6 189 6 187 34 C192 54 190 72 182 80 L138 80 C130 72 128 54 133 34Z" style="' + HAIR + '"/>' +
      '<rect class="sk" x="150" y="52" width="20" height="28" rx="9"/><ellipse class="sk" cx="160" cy="34" rx="20" ry="24"/>' +
      '<path d="M139 30 C141 10 179 10 181 30 C172 21 150 21 139 30Z" style="' + HAIR + '"/><circle cx="152" cy="37" r="2.1" style="fill:var(--ink)"/><circle cx="168" cy="37" r="2.1" style="fill:var(--ink)"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:2" d="M154 47 C158 50 162 50 166 47"/>';
  }
  function chestOnly() {
    return '<path class="sk" d="M150 70 C128 72 108 76 102 92 L96 204 L224 204 L218 92 C212 76 192 72 170 70Z"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:2" d="M124 86 C138 92 148 88 156 81 M196 86 C182 92 172 88 164 81"/>';
  }
  function breasts(hl) {
    var s = '';
    [[136, 1], [184, -1]].forEach(function (p) {
      var x = p[0];
      s += '<ellipse cx="' + x + '" cy="124" rx="26" ry="23" style="fill:var(--sk);stroke:var(--sk-d);stroke-width:2"/>' +
        '<path class="ln" style="stroke:var(--sk-d);stroke-width:2" d="M' + (x - 24) + ' 130 C' + (x - 20) + ' 148 ' + (x + 20) + ' 148 ' + (x + 24) + ' 130"/>' +
        '<ellipse cx="' + x + '" cy="127" rx="8.5" ry="8" style="fill:var(--sk-a)"/><circle cx="' + x + '" cy="127" r="3" style="fill:var(--sk-d)"/>';
    });
    return s + (hl || '');
  }
  function armDown(side) { return side === 'L' ? limb('M108 90 C94 124 92 164 94 210', 22) : limb('M212 90 C226 124 228 164 226 210', 22); }
  function figure(o) {
    o = o || {};
    var arms = o.arms || 'down', s = '';
    if (arms === 'down') s += armDown('L') + armDown('R');
    else if (arms === 'anim') s += mo('mo-armL', limb('M108 90 C94 124 92 164 94 210', 22), 'transform-origin:108px 90px') + mo('mo-armR', limb('M212 90 C226 124 228 164 226 210', 22), 'transform-origin:212px 90px');
    else if (arms === 'hips') s += limb('M108 90 C80 108 76 138 104 158', 21) + limb('M212 90 C240 108 244 138 216 158', 21);
    else if (arms === 'upL') s += limb('M108 90 C80 70 78 44 100 24', 21) + armDown('R');
    else if (arms === 'cross') s += limb('M108 90 C80 70 78 44 100 24', 21) + armDown('R');
    s += chestOnly() + head() + breasts(o.hl);
    if (arms === 'cross') s += limb('M212 96 C238 128 214 158 176 150', 19);
    if (arms === 'hips') s += '<circle class="hand" cx="104" cy="158" r="11"/><circle class="hand" cx="216" cy="158" r="11"/>';
    return s;
  }
  function mirrored(inner, o, figCls, figStyle) { var f = figure(o); return mirrorBack() + '<g clip-path="url(#c4a-mc)">' + (figCls ? mo(figCls, f, figStyle) : f) + (inner || '') + '</g>' + mirrorFront(); }
  function cap(t, x, y, a) { return label(x, y, t, a); }

  /* ---------- close-up of a breast, seen from the front ---------- */
  function zoom() {
    return '<rect width="320" height="200" style="fill:var(--sk)"/><ellipse cx="120" cy="104" rx="84" ry="56" style="fill:#fff;opacity:.13"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:3" d="M24 40 C30 118 90 178 160 180 C230 178 290 118 296 40"/>' +
      '<ellipse cx="160" cy="118" rx="30" ry="28" style="fill:var(--sk-a)"/><circle cx="160" cy="121" r="9" style="fill:var(--sk-d)"/><circle cx="157" cy="118" r="3" style="fill:#fff;opacity:.35"/>';
  }

  /* ======================================================= BREAST ======================================================= */
  function placeCard(x, i, name, icon) {
    return at(x, 12, '<rect width="88" height="98" rx="18" style="fill:var(--surface);stroke:var(--line2);stroke-width:2"/>' + icon +
      '<text class="tx" x="44" y="88" text-anchor="middle" font-size="11.5">' + name + '</text>' +
      '<rect class="mo-hl" x="-2" y="-2" width="92" height="102" rx="20" style="animation-delay:' + (i * 1.3) + 's"/>');
  }
  S['s-br-time'] = function () {
    var bed = '<g transform="translate(14 22)"><rect x="0" y="22" width="60" height="14" rx="4" style="fill:var(--sk-a);opacity:.5"/><rect x="0" y="12" width="24" height="14" rx="7" style="fill:#fff;stroke:var(--line2);stroke-width:2"/><path d="M22 20 L60 20 L60 34 L22 34Z" style="fill:var(--c);opacity:.55"/><path class="ln" d="M2 36 L2 44 M58 36 L58 44"/></g>';
    var shower = '<g transform="translate(22 14)"><path class="ln" d="M42 2 L42 10 C42 18 26 16 18 12 L12 10" /><ellipse class="ln" cx="14" cy="14" rx="14" ry="5" style="fill:var(--fill)"/>' +
      [0, 1, 2].map(function (k) { return '<path class="mo-drop" style="animation-delay:' + (k * .35) + 's;stroke:var(--cg);stroke-width:3;stroke-linecap:round" d="M' + (6 + k * 8) + ' 26 l-1.5 8"/>'; }).join('') + '<path class="mo-drop" style="animation-delay:.6s;stroke:var(--cg);stroke-width:3;stroke-linecap:round" d="M10 40 l-1.5 8"/></g>';
    var mir = '<g transform="translate(44 40)"><ellipse rx="20" ry="26" class="mir"/><ellipse rx="20" ry="26" class="mirf"/><path d="M-10 14 L-2-18" style="stroke:#fff;stroke-width:4;stroke-linecap:round;opacity:.55"/><path class="ln" d="M-6 26 L-10 34 M6 26 L10 34"/></g>';
    var hand0 = '<path class="ln" d="M0 0 L0 -17" style="stroke:var(--cg);stroke-width:3.4"/>';
    var clock = at(54, 152, '<circle r="27" style="fill:var(--surface);stroke:var(--ink);stroke-width:3"/><circle r="3" style="fill:var(--ink)"/>' + mo('mo-tick', hand0, 'transform-origin:0 0') +
      '<path class="ln" d="M0-24 L0-20 M24 0 L20 0 M0 24 L0 20 M-24 0 L-20 0"/>');
    return placeCard(10, 0, 'In bed', bed) + placeCard(116, 1, 'In the shower', shower) + placeCard(222, 2, 'At a mirror', mir) + clock +
      label(98, 142, 'A few minutes is enough', 'start') + label(98, 172, 'Best just after a period', 'start');
  };

  S['s-br-look'] = function () {
    return mirrored('<path class="mo-arrow" d="M70 48 C58 70 58 96 70 118 M66 112 L70 118 L76 110"/><path class="mo-arrow" d="M250 48 C262 70 262 96 250 118 M254 112 L250 118 L244 110"/>', { arms: 'down' }, 'mo-turn', 'transform-origin:160px 100px') +
      cap('Look at the front, then turn to each side', 160, 188);
  };
  S['s-br-up'] = function () {
    return mirrored('', { arms: 'anim' }) + '<path class="mo-arrow" d="M70 118 C64 84 66 56 76 30 M72 36 L76 30 L82 38"/><path class="mo-arrow" d="M250 118 C256 84 254 56 244 30 M248 38 L244 30 L238 36"/>' + cap('Raise both arms, then lower them', 160, 188);
  };
  S['s-br-hips'] = function () {
    var push = mo('mo-push', '<path class="mo-arrow" d="M70 150 L92 156 M250 150 L228 156"/>');
    return mirrored(push + '<ellipse class="hi" cx="160" cy="124" rx="70" ry="34" style="stroke-dasharray:4 5"/>', { arms: 'hips' }) + cap('Press your hands into your hips', 160, 188);
  };
  S['s-br-nipple'] = function () {
    var lens = '<g class="mo-lens"><circle cx="0" cy="0" r="30" style="fill:#fff;opacity:.25;stroke:var(--ink);stroke-width:4"/><path d="M21 21 L44 44" style="stroke:var(--ink);stroke-width:7;stroke-linecap:round"/></g>';
    return zoom() + '<circle class="hit" cx="160" cy="120" r="46"/><circle class="hi mo-glow" cx="160" cy="120" r="46"/>' + at(160, 120, lens, 'mo-lensbox') + cap('Look closely at each nipple', 160, 188);
  };
  S['s-br-lie'] = function () {
    var bed = '<rect x="8" y="152" width="304" height="36" rx="14" style="fill:var(--surface);stroke:var(--line2);stroke-width:2"/><rect x="14" y="128" width="78" height="32" rx="16" style="fill:#fff;stroke:var(--line2);stroke-width:2"/>';
    var armBehind = limb('M108 128 C92 100 66 94 48 106', 17) + '<circle class="hand" cx="48" cy="108" r="10"/>';
    var head = '<ellipse class="sk" cx="56" cy="130" rx="22" ry="21"/><path d="M36 124 C36 102 78 102 78 132 C66 116 50 116 36 124Z" style="' + HAIR + '"/><circle cx="62" cy="130" r="2" style="fill:var(--ink)"/>';
    var torso = '<path class="sk" d="M86 148 C86 120 106 114 132 114 L254 118 C284 120 300 134 300 152 L300 156 L86 156Z"/><ellipse class="sk" cx="208" cy="114" rx="34" ry="22"/><circle cx="208" cy="96" r="5.5" style="fill:var(--sk-a);stroke:var(--sk-d);stroke-width:1.5"/>';
    var otherArm = limb('M122 122 C150 92 180 78 204 82', 17);
    var h = at(210, 88, mo('mo-orbit mo-orbit-small', at(8, 0, mo('mo-orbit-r mo-orbit-small', '<g transform="rotate(90)">' + hand(.5, { glow: false }) + '</g>'))), '', '');
    return bed + armBehind + head + torso + otherArm + h + '<path class="mo-arrow" d="M96 84 C70 70 50 76 36 92 M42 84 L36 92 L46 94"/>' + label(104, 62, 'Arm behind your head', 'start') + cap('Lie flat on your back', 200, 190);
  };
  S['s-br-circles'] = function () {
    return zoom() + '<circle class="hi" cx="112" cy="76" r="12" style="stroke-dasharray:3 4"/><circle cx="112" cy="76" r="22" style="fill:none;stroke:var(--cg);stroke-width:2;opacity:.45;stroke-dasharray:2 6"/>' +
      at(112, 76, mo('mo-orbit', at(12, 0, mo('mo-orbit-r', hand(1)), '', ''), 'transform-origin:0 0')) + label(200, 52, 'Small circles', 'start') + cap('Flat finger pads, about the size of a coin', 160, 188);
  };
  S['s-br-press'] = function () {
    var layers = '<rect x="0" y="0" width="320" height="200" style="fill:var(--surface)"/>' +
      '<path d="M20 150 C40 70 120 40 200 52 C262 62 296 100 300 150Z" style="fill:var(--sk);stroke:var(--sk-d);stroke-width:2"/>' +
      '<path d="M44 150 C62 92 124 70 190 78 C242 86 270 112 276 150Z" style="fill:var(--sk-a);opacity:.5"/>' +
      '<g style="fill:#EFE9E0;stroke:var(--sk-d);stroke-width:2"><rect x="14" y="150" width="292" height="12" rx="6"/><rect x="14" y="170" width="292" height="12" rx="6"/></g>';
    var finger = '<rect class="hand" x="-9" y="-70" width="18" height="70" rx="9"/><ellipse class="pad" cx="0" cy="-1" rx="9" ry="5"/>';
    var finger1 = at(160, 30, mo('mo-press', finger));
    var lab = [['Light', 'skin', 46], ['Medium', 'middle', 84], ['Firm', 'ribs', 126]].map(function (x, i) {
      return '<g class="mo-lvl mo-lvl' + (i + 1) + '"><rect x="14" y="' + (x[2] - 14) + '" width="84" height="26" rx="13" style="fill:var(--surface);stroke:var(--line2);stroke-width:1.5"/><text class="tx" x="56" y="' + (x[2] + 3) + '" text-anchor="middle">' + x[0] + '</text></g>';
    }).join('');
    return layers + finger1 + lab + '<path class="hi" d="M232 56 L232 146 M224 138 L232 146 L240 138" style="stroke-dasharray:3 5"/>' + cap('Press light, then medium, then firm', 160, 192);
  };
  S['s-br-pattern'] = function () {
    var p = '', x0 = 84, w = 26, y0 = 56, y1 = 156;
    for (var k = 0; k < 6; k++) { var x = x0 + k * w; p += (k ? ' L' + x + ' ' + (k % 2 ? y1 : y0) : 'M' + x + ' ' + y0) + ' L' + x + ' ' + (k % 2 ? y0 : y1); }
    p = 'M84 56 L84 156 L110 156 L110 56 L136 56 L136 156 L162 156 L162 56 L188 56 L188 156 L214 156 L214 56';
    return zoom() + '<rect x="58" y="36" width="182" height="136" rx="22" class="hi" style="stroke-dasharray:5 6"/><path class="ln" style="stroke:var(--cg);stroke-width:2.4;stroke-dasharray:1 5" d="' + p + '"/>' +
      at(84, 56, mo('mo-lawn', '<circle r="15" class="hit"/><circle r="8.5" class="pad" style="stroke-width:2"/><circle r="3" style="fill:var(--cg)"/>')) +
      label(24, 22, 'Collarbone', 'start') + label(296, 22, 'Centre of chest', 'end') + label(24, 190, 'Armpit side', 'start') + label(296, 190, 'Bra line', 'end');
  };
  S['s-br-shower'] = function () {
    var dr = '';
    for (var i = 0; i < 7; i++) dr += '<path class="mo-drop" style="animation-delay:' + (i * .28) + 's;stroke:var(--cg);stroke-width:3;stroke-linecap:round" d="M' + (240 + (i % 4) * 16) + ' ' + (38 + (i > 3 ? 18 : 0)) + ' l-2 10"/>';
    var fig = '<g transform="translate(-30 4)">' + figure({ arms: 'cross' }) + '</g>';
    return '<rect class="a-bg" width="320" height="200"/>' + fig + '<path class="ln" d="M302 12 L302 30 C302 44 264 42 248 32 L238 28" style="stroke-width:4"/><ellipse cx="254" cy="30" rx="26" ry="9" style="fill:var(--surface)" class="ln"/>' + dr +
      '<g transform="translate(-30 4)">' + at(128, 128, '<g transform="rotate(-90)">' + mo('mo-glide', hand(.62), 'transform-origin:0 0') + '</g>') + '</g>' + cap('Wet, soapy skin helps your fingers glide', 160, 190);
  };
  S['s-br-armpit'] = function () {
    var zones = '<ellipse class="hit" cx="88" cy="112" rx="22" ry="32"/><circle class="hit" cx="136" cy="127" r="18"/>';
    var fig = figure({ arms: 'upL' });
    var path = mo('mo-tour', hand(.62));
    return mirrorBack() + '<g clip-path="url(#c4a-mc)">' + fig + zones + '</g>' + at(136, 127, path) + mirrorFront() + label(86, 186, 'Armpit', 'middle') + label(210, 186, 'Around the nipple', 'middle');
  };

  /* ===================================================== TESTICLES ====================================================== */
  function pouch(s) {
    return '<g transform="scale(' + (s || 1) + ')"><path class="sk" d="M-58 -42 C-58 -62 58 -62 58 -42 C70 6 76 86 0 92 C-76 86 -70 6 -58 -42Z"/>' +
      '<ellipse class="tst" cx="-24" cy="14" rx="24" ry="33" transform="rotate(8 -24 14)"/><ellipse class="tst" cx="26" cy="18" rx="24" ry="33" transform="rotate(-8 26 18)"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:1.6" d="M0 -38 L0 78"/></g>';
  }
  function miniBody(zone) { return '<g transform="translate(14 14) scale(.5)"><rect x="-6" y="-6" width="112" height="204" rx="22" style="fill:var(--surface);opacity:.85"/>' + art.body(zone || 'pelvis', false) + '</g>'; }
  S['s-te-warm'] = function () {
    var legs = limb('M120 100 L112 196', 34) + limb('M200 100 L208 196', 34);
    var hips = '<path class="sk" d="M96 52 C110 40 210 40 224 52 C232 74 222 112 200 124 L120 124 C98 112 88 74 96 52Z"/>';
    var dr = '', st = '';
    for (var i = 0; i < 9; i++) dr += '<path class="mo-drop" style="animation-delay:' + (i * .24) + 's;stroke:var(--cg);stroke-width:3;stroke-linecap:round" d="M' + (118 + (i % 5) * 20) + ' ' + (10 + (i > 4 ? 14 : 0)) + ' l-2 11"/>';
    for (var j = 0; j < 3; j++) st += '<path class="hi mo-steam" style="animation-delay:' + (j * .6) + 's;opacity:.8" d="M' + (252 + j * 18) + ' 150 C' + (242 + j * 18) + ' 136 ' + (262 + j * 18) + ' 126 ' + (252 + j * 18) + ' 112"/>';
    return '<rect class="a-bg" width="320" height="200"/>' + at(0, 20, legs + hips) + '<g transform="translate(160 76) scale(.5)">' + pouch(1) + '</g>' + dr + st + '<path class="ln" d="M150 0 L150 8" style="stroke-width:5"/><ellipse class="ln" cx="170" cy="8" rx="46" ry="8" style="fill:var(--surface)"/>' +
      '<g transform="translate(46 70)"><path class="ln" d="M0 -26 L0 12" style="stroke-width:7"/><circle r="12" cy="22" class="hif"/><circle r="12" cy="22" class="ln"/></g>' + cap('Warm water loosens the skin', 160, 190);
  };
  S['s-te-hold'] = function () {
    var cupHand = '<path class="hand2" d="M-66 22 C-66 112 66 112 66 22 C66 66 46 80 0 80 C-46 80 -66 66 -66 22Z"/><rect class="hand2" x="-82" y="-4" width="20" height="62" rx="10" transform="rotate(-12 -72 28)"/>' +
      '<rect class="hand2" x="62" y="-14" width="17" height="46" rx="8.5" transform="rotate(10 70 8)"/><rect class="hand2" x="68" y="14" width="17" height="44" rx="8.5" transform="rotate(22 76 36)"/>';
    return '<rect class="a-bg" width="320" height="200"/>' + at(168, 56, pouch(.86)) + at(168, 100, mo('mo-cup', cupHand), '', '') + miniBody('pelvis').replace('translate(14 14) scale(.5)', 'translate(10 10) scale(.4)') +
      '<g class="mo-compare"><path class="mo-arrow" d="M136 44 L120 44 M200 44 L216 44"/></g>' + cap('Cup the scrotum in the palm of one hand', 160, 190);
  };
  S['s-te-roll'] = function () {
    var tes = '<ellipse class="tst" rx="42" ry="56"/><path d="M-26 -30 C-14 -42 6 -42 18 -34" style="fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;opacity:.3"/>' + mo('mo-marker', '<circle cx="0" cy="-30" r="5" style="fill:var(--sk-d)"/><path d="M0 -50 L0 50" style="stroke:var(--sk-d);stroke-width:1.5;stroke-dasharray:2 5;fill:none"/>', 'transform-origin:0 0');
    var thumb = mo('mo-thumb', '<rect class="hand" x="-18" y="-34" width="34" height="68" rx="17"/><ellipse class="pad" cx="12" cy="0" rx="6" ry="14"/>');
    var fing = mo('mo-fingers', '<rect class="hand" x="-16" y="-52" width="34" height="46" rx="17"/><rect class="hand" x="-16" y="2" width="34" height="46" rx="17"/><ellipse class="pad" cx="-10" cy="-30" rx="6" ry="13"/><ellipse class="pad" cx="-10" cy="26" rx="6" ry="13"/>');
    return '<rect class="a-bg" width="320" height="200"/>' + at(160, 96, mo('mo-spinback', tes, 'transform-origin:0 0')) + at(100, 96, thumb) + at(222, 96, fing) +
      '<path class="mo-arrow" d="M72 38 C58 64 58 128 72 154 M68 148 L72 154 L78 146"/><path class="mo-arrow" d="M250 38 C264 64 264 128 250 154 M254 146 L250 154 L244 146"/>' + cap('Roll it gently between thumb and fingers', 160, 190);
  };
  S['s-te-surface'] = function () {
    var tes = '<ellipse class="tst" cx="160" cy="98" rx="46" ry="62"/><ellipse class="ln" cx="160" cy="98" rx="46" ry="62" style="stroke:var(--cg);stroke-dasharray:3 5"/><path d="M130 58 C142 44 168 44 182 54" style="fill:none;stroke:#fff;stroke-width:6;stroke-linecap:round;opacity:.28"/>';
    var trace = at(160, 98, '<g transform="scale(.82 1)">' + mo('mo-orbit mo-orbit-slow', at(56, 0, '<g transform="scale(1.22 1)">' + mo('mo-orbit-r mo-orbit-slow', '<circle r="20" class="hit"/><circle r="11" class="pad" style="stroke-width:2.5"/><circle r="3.6" style="fill:var(--cg)"/>') + '</g>'), 'transform-origin:0 0') + '</g>');
    return '<rect class="a-bg" width="320" height="200"/>' + tes + trace + '<g transform="translate(262 50)"><circle r="24" class="mir"/><circle r="24" class="mirf"/><path d="M-10 -4 C-4 -12 6 -12 12 -4" class="ln" style="stroke:var(--cg)"/><path d="M-10 8 L10 8" class="ln" style="stroke:var(--cg)"/><path d="M17 17 L34 34" style="stroke:var(--ink);stroke-width:5;stroke-linecap:round"/></g>' + cap('Feel the whole surface: it should be smooth', 160, 190);
  };
  S['s-te-epi'] = function () {
    var tes = '<ellipse class="tst" cx="140" cy="98" rx="46" ry="62"/><path d="M104 58 C116 44 140 44 154 52" style="fill:none;stroke:#fff;stroke-width:6;stroke-linecap:round;opacity:.28"/>' +
      '<path class="mo-epi" d="M178 52 C216 66 220 134 178 150" style="fill:none;stroke:var(--sk-d);stroke-width:16;stroke-linecap:round"/><path d="M178 52 C216 66 220 134 178 150" style="fill:none;stroke:var(--sk-a);stroke-width:10;stroke-linecap:round"/>';
    var finger = at(214, 100, mo('mo-slide', '<rect class="hand" x="-9" y="-6" width="18" height="70" rx="9"/><ellipse class="pad" cx="0" cy="2" rx="8.5" ry="5.5"/><circle class="hit" r="22" cy="2"/>'));
    return '<rect class="a-bg" width="320" height="200"/>' + tes + finger + label(262, 44, 'Epididymis', 'middle') + '<path class="ln" d="M238 54 L214 74" style="stroke-dasharray:2 4"/>' + cap('Slide a finger up and down behind the testicle', 160, 190);
  };

  /* ====================================================== HINTS ======================================================
     What to do with your body and your hands, shown under every picture, is content (D.STEP_HINTS). The guide in ui.js
     reads it when it draws a step. */
  art.figure = figure;
})();
