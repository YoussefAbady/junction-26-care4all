import { A as C4A } from "../app.js";

/* care4all illustrations, part 3: animated scenes for the guided self-checks.
   Each scene loops a short action. With reduced motion the loop is left out and arrows and dotted paths
   show the movement instead. */
(function () {
  'use strict';
  var A = C4A, art = A.art, S = art.scenes;
  var limb = art.limb, ring = art.ring, label = art.label, drop = art.drop, M = function () { return art.motion(); };

  /* SMIL on a group moves it relative to its own origin, so content is drawn at 0,0. */
  function mover(path, dur, content) {
    var m = /M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(path), x = m ? m[1] : 0, y = m ? m[2] : 0;
    if (!M()) return '<g transform="translate(' + x + ' ' + y + ')">' + content + '</g>';
    return '<g>' + content + '<animateMotion dur="' + dur + 's" repeatCount="indefinite" path="' + path + '"/></g>';
  }
  function frame() { return '<rect class="mirf" x="40" y="4" width="240" height="192" rx="24"/>'; }
  function mirror() { return '<rect class="mir" x="40" y="4" width="240" height="192" rx="24"/>'; }
  function shine() { return '<path d="M52 150 L120 6 L150 6 L74 190Z" style="fill:#fff;opacity:.14"/>'; }

  function chest(o) {
    o = o || {};
    var arms = o.arms || 'down', s = '';
    if (arms === 'down') s += limb('M98 92 C84 120 82 152 86 206', 22) + limb('M222 92 C236 120 238 152 234 206', 22);
    if (arms === 'anim') s += '<g class="armL">' + limb('M98 92 C84 120 82 150 86 186', 22) + '</g><g class="armR">' + limb('M222 92 C236 120 238 150 234 186', 22) + '</g>';
    if (arms === 'up') s += limb('M98 92 C78 72 66 46 66 16', 22) + limb('M222 92 C242 72 254 46 254 16', 22);
    s += '<rect class="sk" x="146" y="44" width="28" height="30" rx="10"/><circle class="sk" cx="160" cy="30" r="24"/>';
    s += '<path class="sk" d="M146 68 C126 70 104 74 98 92 L96 206 L224 206 L222 92 C216 74 194 70 174 68Z"/>';
    s += '<path class="ln" style="stroke:var(--sk-d)" d="M114 112 C114 140 130 148 142 146 C154 144 158 130 158 116 M162 116 C162 130 166 144 178 146 C190 148 206 140 206 112"/>';
    s += '<circle cx="134" cy="128" r="3.6" style="fill:var(--sk-d)"/><circle cx="186" cy="128" r="3.6" style="fill:var(--sk-d)"/>';
    if (arms === 'hips') s += limb('M100 94 C68 108 62 136 98 160', 20) + limb('M220 94 C252 108 258 136 222 160', 20);
    return s;
  }
  function look(inner, arms) { return mirror() + chest({ arms: arms }) + (inner || '') + shine() + frame(); }

  function pads(x, y, rot) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ')"><path class="hand" d="M-14-6 C-14-22 14-22 14-6 L14 22 C14 36-14 36-14 22Z"/><g class="pad"><ellipse cx="-8" cy="-12" rx="5" ry="7"/><ellipse cx="0" cy="-14" rx="5" ry="7"/><ellipse cx="8" cy="-12" rx="5" ry="7"/></g></g>';
  }
  function padsM(path, dur) {
    var inner = '<path class="hand" d="M-14-6 C-14-22 14-22 14-6 L14 22 C14 36-14 36-14 22Z"/><g class="pad"><ellipse cx="-8" cy="-12" rx="5" ry="7"/><ellipse cx="0" cy="-14" rx="5" ry="7"/><ellipse cx="8" cy="-12" rx="5" ry="7"/></g>';
    return mover(path, dur, inner);
  }
  function zoomBreast() {
    return '<rect width="320" height="200" style="fill:var(--sk)"/><ellipse cx="120" cy="104" rx="84" ry="56" style="fill:#fff;opacity:.13"/>' +
      '<path class="ln" style="stroke:var(--sk-d);stroke-width:3" d="M24 40 C30 118 90 178 160 180 C230 178 290 118 296 40"/>' +
      '<ellipse cx="160" cy="118" rx="30" ry="28" style="fill:var(--sk-a)"/><circle cx="160" cy="121" r="9" style="fill:var(--sk-d)"/>';
  }

  /* ---------- breast ---------- */
  S['s-br-time'] = function () {
    var hand = M() ? '<path class="hi spin" d="M0 0 L0 -26" style="transform-origin:0 0"/>' : '<path class="hi" d="M0 0 L0 -26"/>';
    return '<g transform="translate(26 12)"><rect class="mir" x="0" y="0" width="108" height="140" rx="22"/><rect class="mirf" x="0" y="0" width="108" height="140" rx="22"/><path d="M12 110 L50 6 L72 6 L26 130Z" style="fill:#fff;opacity:.16"/></g>' +
      '<g transform="translate(222 92)"><circle class="ln" r="44" style="fill:var(--surface)"/><circle class="hif" r="5"/>' + hand + '<path class="ln" d="M0 -38 L0 -32 M38 0 L32 0 M0 38 L0 32 M-38 0 L-32 0"/></g>' +
      label(80, 184, 'Somewhere private', 'middle') + label(222, 168, 'A few minutes');
  };
  S['s-br-look'] = function () {
    var scan = M() ? '<rect class="scan" x="76" y="84" width="168" height="10" rx="5"/>' : '';
    return look('<ellipse class="hi" cx="134" cy="128" rx="30" ry="24" style="stroke-dasharray:4 5"/><ellipse class="hi" cx="186" cy="128" rx="30" ry="24" style="stroke-dasharray:4 5"/>' + scan, 'down') +
      label(160, 182, 'Front, then each side');
  };
  S['s-br-up'] = function () { return look('', 'anim') + label(160, 182, 'Arms up, look again'); };
  S['s-br-hips'] = function () {
    var arr = '<g class="' + (M() ? 'squeeze' : '') + '"><path class="hi" d="M88 96 L112 108 M232 96 L208 108"/></g>';
    return look(arr + '<ellipse class="hi" cx="160" cy="128" rx="62" ry="28" style="stroke-dasharray:4 5"/>', 'hips') + label(160, 182, 'Shoulders straight');
  };
  S['s-br-nipple'] = function () {
    var d = '';
    [[150, .0], [160, .6], [172, 1.2]].forEach(function (x) { d += '<g' + (M() ? ' class="fall" style="animation-delay:' + x[1] + 's"' : '') + '><g style="fill:var(--c);opacity:.7">' + drop(x[0], 146, .7) + '</g></g>'; });
    return zoomBreast() + ring(160, 120, 42) + '<g style="opacity:.0">' + d + '</g>' + '<g transform="translate(250 64)"><circle class="ln" r="30" style="fill:var(--surface);opacity:.92"/><circle r="9" style="fill:var(--sk-d)"/><path class="ln" d="M22 24 L44 48" style="stroke-width:5"/></g>' + label(160, 184, 'Look for any fluid');
  };
  S['s-br-lie'] = function () {
    var arm = '<g' + '>' + limb('M100 136 C84 150 60 150 54 122', 16) + '</g>';
    var finger = padsM('M128 80 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0', 1.6);
    return '<rect x="14" y="52" width="292" height="104" rx="26" style="fill:var(--surface);stroke:var(--line2);stroke-width:2"/><ellipse cx="62" cy="104" rx="40" ry="34" style="fill:var(--fill)"/>' +
      arm + '<path class="sk" d="M96 76 C120 62 220 62 252 82 L262 126 C240 144 130 146 96 134Z"/><circle class="sk" cx="62" cy="104" r="26"/>' +
      '<circle cx="134" cy="84" r="18" style="fill:var(--sk);stroke:var(--sk-d);stroke-width:2"/><circle cx="134" cy="84" r="4" style="fill:var(--sk-d)"/>' +
      '<circle cx="134" cy="128" r="18" style="fill:var(--sk);stroke:var(--sk-d);stroke-width:2"/><circle cx="134" cy="128" r="4" style="fill:var(--sk-d)"/>' + finger + label(160, 182, 'Lying flat spreads the breast');
  };
  S['s-br-circles'] = function () {
    return zoomBreast() + '<path class="ln" style="stroke:var(--cg);stroke-dasharray:3 4" d="M112 70 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0"/>' + padsM('M112 70 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0', 2.4) + label(200, 56, 'Small circles', 'start');
  };
  S['s-br-press'] = function () {
    return '<rect class="a-bg" width="320" height="200"/><path class="sk" d="M30 84 L290 84 L290 170 L30 170Z"/>' +
      '<rect x="30" y="84" width="260" height="26" style="fill:var(--sk-a);opacity:.28"/><rect x="30" y="110" width="260" height="30" style="fill:var(--sk-a);opacity:.45"/>' +
      '<path d="M30 160 C100 140 220 140 290 160 L290 170 L30 170Z" style="fill:#EFE9E0;stroke:var(--sk-d);stroke-width:2"/>' +
      '<g class="' + (M() ? 'press' : '') + '"><path class="hand" d="M-18-6 C-18-30 18-30 18-6 L18 6 L-18 6Z" transform="translate(160 20)"/><g class="pad" transform="translate(160 20)"><ellipse cx="-9" cy="4" rx="6" ry="4"/><ellipse cx="0" cy="4" rx="6" ry="4"/><ellipse cx="9" cy="4" rx="6" ry="4"/></g></g>' +
      label(60, 98, 'Light', 'start') + label(60, 128, 'Medium', 'start') + label(60, 158, 'Firm (near the ribs)', 'start').replace('x="60"', 'x="60"');
  };
  S['s-br-pattern'] = function () {
    var path = 'M70 52 L70 156 L100 156 L100 52 L130 52 L130 156 L160 156 L160 52 L190 52 L190 156 L220 156 L220 52 L250 52 L250 156';
    return zoomBreast() + '<rect x="46" y="38" width="228" height="132" rx="20" class="hi" style="stroke-dasharray:5 6"/><path class="ln" style="stroke:var(--cg);stroke-width:2.2" d="' + path + '"/>' +
      mover(path, 7, '<circle class="hif" r="7"/><circle r="12" class="hi" style="opacity:.5"/>') + label(70, 28, 'Collarbone', 'start') + label(250, 28, 'Centre', 'end') + label(46, 190, 'Armpit', 'start');
  };
  S['s-br-shower'] = function () {
    var dr = '';
    for (var i = 0; i < 6; i++) dr += '<g' + (M() ? ' class="fall" style="animation-delay:' + (i * .35) + 's"' : '') + '><path d="M' + (238 + (i % 3) * 18) + ' ' + (44 + (i > 2 ? 14 : 0)) + ' l-2 10" style="stroke:var(--cg);stroke-width:3;stroke-linecap:round"/></g>';
    return '<rect class="a-bg" width="320" height="200"/><g transform="translate(-30 4) scale(.92)">' + chest({ arms: 'down' }) + '</g>' + pads(92, 112, 24) +
      '<path class="ln" d="M296 20 L296 40 C296 54 256 50 240 40 L230 36" style="stroke-width:4"/><ellipse cx="248" cy="38" rx="26" ry="9" style="fill:var(--surface)" class="ln"/>' + dr + label(176, 186, 'Wet skin helps fingers glide');
  };
  S['s-br-armpit'] = function () {
    return look('<ellipse class="hit" cx="86" cy="106" rx="22" ry="30"/><ellipse class="hi ' + (M() ? 'pulse' : '') + '" cx="86" cy="106" rx="22" ry="30"/><circle class="hi ' + (M() ? 'pulse' : '') + '" cx="134" cy="128" r="16"/><circle class="hi ' + (M() ? 'pulse' : '') + '" cx="186" cy="128" r="16"/>', 'down') + label(86, 180, 'Armpit').replace('x="86"', 'x="86"') + label(210, 180, 'Around each nipple');
  };
  S['s-doctor'] = function () {
    var tick = '<path class="hi' + (M() ? ' draw' : '') + '" d="M-22 4 L-6 20 L24-14" style="stroke-width:6"/>';
    return '<g transform="translate(112 100)"><rect class="ln" x="-48" y="-62" width="96" height="124" rx="14" style="fill:var(--surface)"/><rect class="ln" x="-20" y="-72" width="40" height="18" rx="8" style="fill:var(--fill)"/>' + tick + '<path class="ln" d="M-30 34 L30 34 M-30 46 L10 46" style="opacity:.5"/></g>' +
      '<g transform="translate(230 98)"><rect class="ln" x="-26" y="-48" width="52" height="96" rx="12" style="fill:var(--surface)"/><path class="ln" d="M-8 38 L8 38"/><circle class="hif ' + (M() ? 'pulse' : '') + '" cy="-8" r="14"/><path d="M-5 -8 L-1 -4 L6 -13" style="fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round"/></g>' + label(160, 184, 'Book an appointment');
  };

  /* ---------- testicular ---------- */
  function sc(inner) {
    return '<path class="sk" d="M104 44 C104 28 216 28 216 44 C224 84 232 168 160 172 C88 168 96 84 104 44Z"/><ellipse class="tst" cx="132" cy="112" rx="24" ry="32" transform="rotate(8 132 112)"/><ellipse class="tst" cx="190" cy="116" rx="24" ry="32" transform="rotate(-8 190 116)"/>' + (inner || '');
  }
  S['s-te-warm'] = function () {
    var dr = '', st = '';
    for (var i = 0; i < 8; i++) dr += '<g' + (M() ? ' class="fall" style="animation-delay:' + (i * .22) + 's"' : '') + '><path d="M' + (150 + (i % 4) * 18) + ' ' + (62 + (i > 3 ? 18 : 0)) + ' l-3 12" style="stroke:var(--cg);stroke-width:3;stroke-linecap:round"/></g>';
    for (var j = 0; j < 3; j++) st += '<path class="hi' + (M() ? ' rise' : '') + '" style="animation-delay:' + (j * .5) + 's;opacity:.7" d="M' + (252 + j * 20) + ' 150 C' + (242 + j * 20) + ' 136 ' + (262 + j * 20) + ' 126 ' + (252 + j * 20) + ' 112"/>';
    return '<rect class="a-bg" width="320" height="200"/><g transform="translate(14 34) scale(.76)">' + sc() + '</g>' +
      '<path class="ln" d="M214 0 V24" style="stroke-width:6"/><g transform="translate(206 32) rotate(-12)"><rect class="ln" x="-8" y="-12" width="16" height="14" rx="3" style="fill:var(--fill)"/><path class="ln" d="M-34 2 H34 C34 24 -34 24 -34 2Z" style="fill:var(--surface)"/></g>' + dr + st + label(160, 184, 'Warm water loosens the skin');
  };
  S['s-te-hold'] = function () {
    var hand = '<g class="' + (M() ? 'cup' : '') + '"><path class="hand" d="M86 118 C86 196 234 196 234 118 C234 150 214 160 160 160 C106 160 86 150 86 118Z"/>' +
      '<ellipse class="hand" cx="84" cy="116" rx="12" ry="28" transform="rotate(-14 84 116)"/>' +
      '<ellipse class="hand" cx="236" cy="104" rx="11" ry="22" transform="rotate(10 236 104)"/><ellipse class="hand" cx="242" cy="134" rx="11" ry="20" transform="rotate(22 242 134)"/></g>';
    return '<rect class="a-bg" width="320" height="200"/><g transform="translate(0 -6)">' + sc() + hand + '</g>' + label(160, 186, 'Cup the scrotum in one hand');
  };
  S['s-te-roll'] = function () {
    return '<rect class="a-bg" width="320" height="200"/><ellipse class="tst" cx="160" cy="100" rx="42" ry="56"/>' +
      '<g class="' + (M() ? 'spin' : '') + '" style="transform-origin:160px 100px"><path class="hi" style="stroke-dasharray:5 6" d="M160 24 A76 76 0 0 1 236 100 M160 176 A76 76 0 0 1 84 100"/><path class="hi" d="M228 80 L236 100 L216 100 M92 120 L84 100 L104 100"/></g>' +
      '<ellipse class="hand" cx="104" cy="100" rx="16" ry="30"/><ellipse class="hand" cx="216" cy="84" rx="15" ry="20"/><ellipse class="hand" cx="216" cy="116" rx="15" ry="20"/>' + label(160, 184, 'Gently roll between thumb and fingers');
  };
  S['s-te-surface'] = function () {
    return '<rect class="a-bg" width="320" height="200"/><ellipse class="tst" cx="160" cy="100" rx="42" ry="56"/><ellipse class="ln" cx="160" cy="100" rx="42" ry="56" style="stroke:var(--cg);stroke-dasharray:3 4"/>' +
      mover('M118 100 A42 56 0 1 0 202 100 A42 56 0 1 0 118 100', 4, '<ellipse class="pad" rx="9" ry="12" style="stroke:var(--sk-d);stroke-width:2"/>') + label(160, 184, 'Feel for bumps. It should be smooth');
  };
  S['s-te-epi'] = function () {
    return '<rect class="a-bg" width="320" height="200"/><ellipse class="tst" cx="140" cy="100" rx="42" ry="56"/><path class="hi' + (M() ? ' pulse' : '') + '" d="M176 58 C206 70 208 130 176 144" style="stroke-width:7;opacity:.85"/>' +
      '<path class="ln" d="M206 100 L216 100" style="stroke-dasharray:2 5"/>' + label(254, 100, 'Epididymis', 'middle') + label(160, 184, 'Feel behind each testicle');
  };

  /* ---------- skin ---------- */
  function bodyFront(zones, back) {
    var s = '<g transform="translate(110 4)">' + art.body('none', back);
    (zones || []).forEach(function (z, i) {
      s += '<ellipse class="hit" cx="' + z[0] + '" cy="' + z[1] + '" rx="' + z[2] + '" ry="' + z[3] + '"/><ellipse class="hi ' + (M() ? 'blink' : '') + '" style="animation-delay:' + (i * .45) + 's" cx="' + z[0] + '" cy="' + z[1] + '" rx="' + z[2] + '" ry="' + z[3] + '"/>';
    });
    return s + '</g>';
  }
  S['s-sk-mirrors'] = function () {
    return '<g transform="translate(34 14)"><rect class="mir" width="110" height="170" rx="20"/><rect class="mirf" width="110" height="170" rx="20"/><g transform="translate(24 12) scale(.8)">' + art.body('none', false) + '</g></g>' +
      '<g transform="translate(222 84)"><circle class="mir" r="40"/><circle class="mirf" r="40"/><path d="M-6 40 L-6 84 C-6 92 6 92 6 84 L6 40" class="sk" transform="translate(0 4)"/><path d="M-26 20 C-20 6 4 0 22 -8" style="fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;opacity:.5"/></g>' + label(90, 190, 'Big mirror') + label(222, 190, 'Hand mirror');
  };
  S['s-sk-head'] = function () {
    return '<rect class="a-bg" width="320" height="200"/><g transform="translate(160 100)"><ellipse class="sk" rx="54" ry="68"/><ellipse class="sk" cx="-56" cy="4" rx="9" ry="16"/><ellipse class="sk" cx="56" cy="4" rx="9" ry="16"/>' +
      '<path d="M-54-10 C-56-62 56-62 54-10 C40-40-10-48-14-52 C-26-44-46-30-54-10Z" style="fill:#5A4030"/><path class="ln" d="M-4-50 L-4-20" style="stroke:var(--sk);stroke-width:4"/><circle cx="-20" cy="2" r="4" style="fill:var(--ink)"/><circle cx="20" cy="2" r="4" style="fill:var(--ink)"/><path class="ln" d="M-14 38 C-6 44 6 44 14 38"/></g>' +
      [[104, 104, 14, 22], [216, 104, 14, 22], [160, 52, 40, 14], [160, 136, 22, 10]].map(function (z, i) { return '<ellipse class="hi ' + (M() ? 'blink' : '') + '" style="animation-delay:' + (i * .5) + 's" cx="' + z[0] + '" cy="' + z[1] + '" rx="' + z[2] + '" ry="' + z[3] + '"/>'; }).join('') + label(160, 188, 'Scalp, ears, nose, lips');
  };
  S['s-sk-hands'] = function () {
    var f = '', n = '';
    [[112, 56], [132, 46], [152, 52], [172, 62]].forEach(function (p) {
      f += '<rect class="sk" x="' + p[0] + '" y="' + (50 + p[1] * 0) + '" width="18" height="' + (118 - (p[1] - 40)) + '" rx="9" transform="translate(0 ' + (p[1] - 50) + ')"/>';
      n += '<rect x="' + (p[0] + 4) + '" y="' + (p[1] + 4) + '" width="10" height="13" rx="5" style="fill:#F7E4DC;stroke:var(--sk-d);stroke-width:1.2"/>';
    });
    return '<rect class="a-bg" width="320" height="200"/><g transform="translate(10 0)">' + f + '<rect class="sk" x="104" y="104" width="94" height="72" rx="26"/><rect class="sk" x="82" y="110" width="20" height="56" rx="10" transform="rotate(-38 92 138)"/>' + n + '</g>' +
      '<ellipse class="hi ' + (M() ? 'blink' : '') + '" cx="132" cy="68" rx="46" ry="22"/><path class="hi ' + (M() ? 'blink' : '') + '" style="animation-delay:.5s" d="M140 96 L140 118 M160 90 L160 118 M180 96 L180 118"/>' +
      '<g transform="translate(250 96)"><rect class="sk" x="-26" y="-30" width="52" height="64" rx="22"/><rect x="-14" y="-24" width="28" height="30" rx="12" style="fill:#F7E4DC;stroke:var(--sk-d);stroke-width:1.5"/><rect x="-3" y="-22" width="6" height="26" rx="2" style="fill:#2B1E1A;opacity:.0"/></g>' + label(250, 78, 'Nails', 'middle') + label(160, 188, 'Both sides, between fingers, nails');
  };
  S['s-sk-torso'] = function () { return '<rect class="a-bg" width="320" height="200"/>' + bodyFront([[50, 50, 26, 20], [50, 86, 22, 24]]) + label(260, 60, 'Neck', 'end').replace('x="260"', 'x="268"') + label(268, 100, 'Chest', 'end') + label(268, 140, 'Under breasts', 'end'); };
  S['s-sk-arms'] = function () { return '<rect class="a-bg" width="320" height="200"/>' + bodyFront([[16, 78, 8, 36], [84, 78, 8, 36], [26, 56, 10, 10], [74, 56, 10, 10]]) + label(266, 70, 'Upper arms', 'end') + label(266, 108, 'Armpits', 'end'); };
  S['s-sk-back'] = function () {
    return '<rect class="a-bg" width="320" height="200"/>' + bodyFront([[50, 50, 24, 12], [50, 86, 24, 30]], true) +
      '<g transform="translate(250 70)"><circle class="mir" r="30"/><circle class="mirf" r="30"/><path d="M-5 30 L-5 64 C-5 72 5 72 5 64 L5 30" class="sk" transform="translate(0 2)"/></g><path class="hi" d="M222 88 C196 100 190 110 176 110 M184 102 L176 110 L186 116"/>' + label(250, 164, 'Hand mirror');
  };
  S['s-sk-legs'] = function () {
    return '<rect class="a-bg" width="320" height="200"/>' + bodyFront([[38, 150, 10, 26], [62, 150, 10, 26], [36, 184, 11, 6], [64, 184, 11, 6]]) +
      '<g transform="translate(250 100)"><path class="sk" d="M-30 -50 C-34 -20-34 20-26 44 C-18 60 8 62 14 44 C18 28 12 -6 6 -34 C0 -56-22 -62-30 -50Z"/>' + [-26, -14, -2, 10, 22].map(function (x, i) { return '<ellipse class="sk" cx="' + (x - 8 + i * 2) + '" cy="' + (-58 + Math.abs(i - 1) * 3) + '" rx="6" ry="8"/>'; }).join('') + '</g>' +
      '<path class="hi ' + (M() ? 'blink' : '') + '" d="M236 36 L236 52 M248 34 L248 52 M260 36 L260 52" style="stroke-width:4"/>' + label(252, 178, 'Soles and toe gaps');
  };
  S['s-sk-abcde'] = function () {
    var L = ['A', 'B', 'C', 'D', 'E'], W = ['Asymmetry', 'Border', 'Colour', 'Diameter', 'Evolving'], s = '<rect class="a-bg" width="320" height="200"/>';
    var shapes = [
      '<path d="M0-18 C-14-18 -22-8 -22 0 C-22 12 -10 20 0 20 C12 22 26 14 26-2 C28-14 14-18 0-18Z" style="fill:#6B4430"/>',
      '<path d="M0-22 L8-14 L20-18 L18-6 L26 2 L16 8 L18 20 L6 14 L-4 22 L-8 10 L-22 8 L-16-2 L-22-12 L-8-12Z" style="fill:#6B4430"/>',
      '<circle r="22" style="fill:#8A5A3A"/><ellipse cx="-6" cy="-6" rx="9" ry="7" style="fill:#201816"/><ellipse cx="9" cy="8" rx="7" ry="6" style="fill:#D98A8A"/>',
      '<circle r="26" style="fill:#6B4430"/><circle r="14" style="fill:none;stroke:#fff;stroke-width:2;stroke-dasharray:3 3"/>',
      '<circle r="14" style="fill:#8A5A3A"/><circle r="22" style="fill:none;stroke:#3D2A22;stroke-width:3;stroke-dasharray:2 4"/>'
    ];
    for (var i = 0; i < 5; i++) {
      var x = 34 + i * 63;
      s += '<g' + (M() ? ' class="blink" style="animation-delay:' + (i * .55) + 's"' : '') + '><rect x="' + (x - 28) + '" y="26" width="56" height="112" rx="16" style="fill:var(--sk)"/><g transform="translate(' + x + ' 72)">' + shapes[i] + '</g>' +
        '<circle cx="' + x + '" cy="118" r="13" class="hif"/><text x="' + x + '" y="123" text-anchor="middle" style="font:800 15px Inter,sans-serif;fill:#fff">' + L[i] + '</text></g>';
    }
    return s + '<g style="font:700 10.5px Inter,sans-serif;fill:var(--ink)">' + W.map(function (w, i) { return '<text x="' + (34 + i * 63) + '" y="162" text-anchor="middle">' + w + '</text>'; }).join('') + '</g>';
  };
  S['s-sk-duck'] = function () { return S['mole-ugly']().replace(/<text[^>]*>Looks different<\/text>/, '') + label(232, 178, 'The ugly duckling'); };
  S['s-sk-photo'] = function () {
    var t = '';
    for (var i = 0; i < 9; i++) t += '<path class="ln" d="M' + (206 + i * 8) + ' 140 L' + (206 + i * 8) + ' ' + (i % 4 === 0 ? 128 : 134) + '" style="stroke-width:1.5"/>';
    return '<rect class="a-bg" width="320" height="200"/><g transform="translate(86 100)"><rect class="ln" x="-52" y="-84" width="104" height="168" rx="18" style="fill:var(--surface)"/><rect x="-44" y="-66" width="88" height="126" rx="8" style="fill:var(--sk)"/><circle cx="-4" cy="-10" r="20" style="fill:#6B4430"/><rect x="-36" y="34" width="64" height="9" rx="2" style="fill:var(--surface);stroke:var(--ink);stroke-width:1.5"/><circle class="ln" cy="72" r="6"/></g>' +
      '<g transform="translate(0 0)"><circle cx="252" cy="104" r="22" style="fill:#6B4430"/><rect x="196" y="144" width="84" height="12" rx="3" style="fill:var(--surface);stroke:var(--ink);stroke-width:1.5"/>' + t + '</g>' +
      '<circle class="hif ' + (M() ? 'flash' : '') + '" cx="86" cy="100" r="80" style="opacity:0"/>' + label(240, 186, 'Add a ruler beside it');
  };
})();
