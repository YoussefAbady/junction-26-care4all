import { A as C4A } from "../app.js";

/* care4all illustrations, part 1: framework, body locator, symptom glyphs and general scenes.
   All art is original, drawn as inline SVG (viewBox 320x200) and styled with CSS variables so it follows
   the topic colour, the dark theme and the chosen skin tone. Motion uses CSS keyframes and SMIL, and is left
   out when the person has reduced motion on. */
(function () {
  'use strict';
  var A = C4A;
  var S = {};            /* id -> function(opts) returning inner SVG */
  var art = A.art = { scenes: S };

  /* Decorative art follows the system "reduce motion" setting. Demonstrations (the self-check figures) show a
     movement the person has to copy, so they loop on their own unless animations are off in Profile. A pause
     button stops them. */
  art.demoOn = function () { return !(A.S && A.S.prefs.motion === false); };
  art.motion = function () { return art._demo ? art.demoOn() : !A.reduceMotion(); };
  art.has = function (id) { return !!S[id] || /^loc:/.test(id); };

  /* Wraps a scene. Unknown ids fall back to a quiet generic picture so the UI never breaks. */
  art.render = function (id, label, o) {
    var inner;
    o = o || {};
    if (A.stage && A.stage.has(id)) return A.stage.render(id, label, o);   /* the self-check scenes live on the stage (art/stage.js) */
    art._demo = !!o.demo;
    try {
      if (S[id]) inner = S[id](o);
      else if (/^loc:/.test(id)) { var p = id.split(':'); inner = S.loc(p[1], p[2], o); }
      else inner = S.loc('none', 'generic', o);
    } finally { art._demo = false; }
    return '<svg class="art' + (o.demo && art.demoOn() ? ' demo' : '') + '" viewBox="0 0 320 200" role="img" aria-label="' + A.esc(label || '') + '" focusable="false">' +
      '<rect class="a-bg" width="320" height="200"/>' + inner + '</svg>';
  };

  /* ---------- shared bits ---------- */
  function limb(d, w) {
    return '<path class="limb-o" d="' + d + '" stroke-width="' + (w + 4) + '"/><path class="limb-i" d="' + d + '" stroke-width="' + w + '"/>';
  }
  art.limb = limb;
  /* A ring that pulses to draw the eye to a place. */
  function ring(cx, cy, r, extra) {
    return '<circle class="hit" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/><circle class="hi ' + (art.motion() ? 'pulse' : '') + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' + (extra || '') + '/>';
  }
  art.ring = ring;
  function dropPath(x, y, s) {
    s = s || 1;
    return '<path d="M' + x + ' ' + (y - 11 * s) + ' C' + (x + 6 * s) + ' ' + (y - 3 * s) + ' ' + (x + 8 * s) + ' ' + (y + 2 * s) + ' ' + (x + 8 * s) + ' ' + (y + 5 * s) + ' A' + (8 * s) + ' ' + (8 * s) + ' 0 0 1 ' + (x - 8 * s) + ' ' + (y + 5 * s) + ' C' + (x - 8 * s) + ' ' + (y + 2 * s) + ' ' + (x - 6 * s) + ' ' + (y - 3 * s) + ' ' + x + ' ' + (y - 11 * s) + ' Z"/>';
  }
  art.drop = dropPath;
  function label(x, y, t, anchor) {
    y = Math.min(y, 184);
    var w = Math.round(String(t).length * 6.6 + 20), x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
    return '<rect class="pill" x="' + x0 + '" y="' + (y - 14) + '" width="' + w + '" height="22" rx="11"/><text class="tx" x="' + (x0 + w / 2) + '" y="' + (y + 1) + '" text-anchor="middle">' + A.esc(t) + '</text>';
  }
  art.label = label;
  function anim(cls, delay) { return art.motion() ? ' class="' + cls + '"' + (delay ? ' style="animation-delay:' + delay + 's"' : '') : ''; }
  art.anim = anim;

  /* ---------- body silhouette with zones ---------- */
  var ZONES = {
    head: [50, 18, 17, 17], throat: [50, 37, 11, 7], neck: [50, 37, 12, 8], chest: [50, 58, 25, 16], 'upper-abdomen': [50, 80, 19, 10],
    ruq: [37, 80, 13, 10], abdomen: [50, 96, 21, 11], 'lower-abdomen': [50, 112, 19, 9], pelvis: [50, 124, 18, 9], flank: [27, 98, 9, 14],
    skin: [50, 80, 40, 66], back: [50, 98, 17, 14], none: null
  };
  function body(zone, back) {
    var z = ZONES[zone];
    var s = '';
    s += limb('M22 46 C12 70 10 96 12 122', 11) + limb('M78 46 C88 70 90 96 88 122', 11);
    s += limb('M38 132 L36 186', 15) + limb('M62 132 L64 186', 15);
    s += '<path class="sk" d="M30 40 C40 38 60 38 70 40 C80 42 82 52 82 62 L80 112 C79 122 74 128 72 134 L28 134 C26 128 21 122 20 112 L18 62 C18 52 20 42 30 40Z"/>';
    s += '<rect class="sk" x="44" y="28" width="12" height="13" rx="4"/><circle class="sk" cx="50" cy="18" r="13"/>';
    if (back) s += '<path class="ln" d="M50 42 L50 124" stroke-dasharray="1 5"/><path class="ln" d="M33 56 C38 68 44 66 47 56 M67 56 C62 68 56 66 53 56"/>';
    else s += '<path class="ln" d="M40 49 C44 52 56 52 60 49"/>';
    if (z) s += '<ellipse class="hit" cx="' + z[0] + '" cy="' + z[1] + '" rx="' + z[2] + '" ry="' + z[3] + '"/><ellipse class="hi ' + (art.motion() ? 'pulse' : '') + '" cx="' + z[0] + '" cy="' + z[1] + '" rx="' + z[2] + '" ry="' + z[3] + '"/>';
    return s;
  }
  art.body = body;

  /* ---------- glyphs (centred on 0,0, about 70 units wide) ---------- */
  var G = {
    pain: function () { return '<path class="hif" d="M-4-34 L12-34 L2-8 L20-8 L-12 34 L-4 6 L-20 6Z"/><path class="ln" d="M-4-34 L12-34 L2-8 L20-8 L-12 34 L-4 6 L-20 6Z"/>'; },
    lump: function () { return '<circle class="hit" r="32"/><circle class="sk" r="20"/><circle class="hif" r="9" style="opacity:.85"/><path class="ln" d="M-13-24 C-4-30 8-30 15-24" style="opacity:.0"/>'; },
    blood: function () { return '<g class="blood" transform="scale(2.4)">' + dropPath(0, 2, 1) + '</g>'; },
    swell: function () { return '<circle class="hif" r="13"/><circle class="hi" r="23" style="opacity:.7"/><circle class="hi" r="33" style="opacity:.4"/>'; },
    tired: function () { return '<rect class="ln" x="-32" y="-14" width="56" height="28" rx="6"/><rect class="ln" x="24" y="-6" width="6" height="12" rx="2"/><rect class="hif" x="-28" y="-10" width="12" height="20" rx="2"/>' +
      '<text class="tx" x="14" y="-22" font-size="16" text-anchor="middle">z</text><text class="tx" x="26" y="-30" font-size="12" text-anchor="middle">z</text>'; },
    weight: function () { return '<rect class="ln" x="-30" y="-22" width="60" height="44" rx="10"/><path class="ln" d="M-16-8 A16 16 0 0 1 16-8"/><path class="hi" d="M0-8 L-8-14"/><path class="hi" d="M44-18 L44 18 M36 10 L44 18 L52 10"/>'; },
    burn: function () { return '<path class="hif" d="M0-34 C8-18 22-10 20 8 C18 24 8 32 0 32 C-10 32 -20 24 -18 10 C-17 0 -10-4 -8-14 C-4-8 0-10 0-34Z"/><path class="ln" d="M0-34 C8-18 22-10 20 8 C18 24 8 32 0 32 C-10 32 -20 24 -18 10 C-17 0 -10-4 -8-14 C-4-8 0-10 0-34Z"/>'; },
    nausea: function () { return '<path class="hi" d="M-30-14 C-20-24 -10-4 0-14 C10-24 20-4 30-14"/><path class="hi" d="M-30 6 C-20-4 -10 16 0 6 C10-4 20 16 30 6"/><path class="hi" d="M-30 26 C-20 16 -10 36 0 26 C10 16 20 36 30 26"/>'; },
    urge: function () { return '<circle class="ln" cx="-8" cy="0" r="24"/><path class="ln" d="M-8-12 L-8 0 L4 6"/><g class="blood" style="fill:var(--c)" transform="translate(34 12)"><path d="M0-16 C8-4 12 2 12 8 A12 12 0 0 1 -12 8 C-12 2 -8-4 0-16Z"/></g>'; },
    thirst: function () { return '<path class="ln" d="M-18-26 L18-26 L13 28 L-13 28Z"/><path class="hif" d="M-16-8 L16-8 L13 28 L-13 28Z" style="opacity:.55"/><path class="hi" d="M28-10 C32-2 34 2 34 6 A6 6 0 0 1 22 6 C22 2 24-2 28-10Z"/>'; },
    fever: function () { return '<rect class="ln" x="-8" y="-34" width="16" height="48" rx="8"/><circle class="hif" cx="0" cy="22" r="13"/><circle class="ln" cx="0" cy="22" r="13"/><path class="hi" d="M0-18 L0 20"/><path class="ln" d="M16-26 L24-26 M16-14 L24-14 M16-2 L24-2"/>'; },
    generic: function () { return '<path class="hif" d="M0-30 L7-7 L30 0 L7 7 L0 30 L-7 7 L-30 0 L-7-7Z"/>'; }
  };
  art.glyph = function (id) { return (G[id] || G.generic)(); };

  /* Body locator: a body with the zone lit, plus a big symbol for the kind of sign. */
  S.loc = function (zone, motif) {
    var back = zone === 'back';
    var z = ZONES[zone] || ZONES.none;
    var s = '<g transform="translate(34 8) scale(.96)">' + body(zone, back) + '</g>';
    if (z) {
      var zx = 34 + z[0] * .96, zy = 8 + z[1] * .96;
      s += '<path class="ln" d="M' + (zx + z[2] * .96) + ' ' + zy + ' L172 100" stroke-dasharray="2 5"/>';
    }
    s += '<circle class="hit" cx="236" cy="100" r="58"/><g transform="translate(236 100)">' + art.glyph(motif) + '</g>';
    return s;
  };

  /* ---------- general sign scenes ---------- */
  S.quiet = function () {
    return '<g transform="translate(160 106)"><path class="hit" d="M0-70 L62-44 L62 8 C62 44 34 66 0 78 C-34 66 -62 44 -62 8 L-62-44Z"/><path class="hi" d="M0-70 L62-44 L62 8 C62 44 34 66 0 78 C-34 66 -62 44 -62 8 L-62-44Z"/>' +
      '<path class="hi" d="M-24 4 L-6 22 L26-16"/></g>' + label(160, 188, 'No signs early on');
  };
  S.weight = function () {
    return '<g transform="translate(120 104)"><rect class="ln" x="-60" y="-46" width="120" height="92" rx="20" style="fill:var(--surface)"/><path class="ln" d="M-34-8 A34 34 0 0 1 34-8"/>' +
      '<path class="hi ' + (art.motion() ? 'needle' : '') + '" d="M0-8 L-20-26" style="transform-origin:0 -8px"/><circle class="hif" r="4" cy="-8"/>' +
      '<rect class="ln" x="-26" y="14" width="52" height="18" rx="6"/></g>' +
      '<g transform="translate(246 100)"><path class="hi" d="M0-44 L0 40 M-18 22 L0 40 L18 22"/></g>';
  };
  S.tired = function () {
    return '<g transform="translate(150 100) scale(1.9)">' + G.tired() + '</g>';
  };
  S.fever = function () { return '<g transform="translate(130 100) scale(1.7)">' + G.fever() + '</g><g transform="translate(222 100)"><path class="hi" d="M-30 14 C-20 4-10 24 0 14 C10 4 20 24 30 14"/><path class="hi" d="M-30-12 C-20-22-10-2 0-12 C10-22 20-2 30-12"/></g>'; };
  S.thirst = function () { return '<g transform="translate(130 100) scale(1.8)">' + G.thirst() + '</g><g transform="translate(236 100)"><circle class="ln" r="26"/><path class="ln" d="M0-14 L0 0 L10 6"/></g>'; };
  S.indigestion = function () {
    return '<g transform="translate(150 106)"><path class="sk" d="M-18-58 C-6-62 6-56 8-44 C10-30 40-30 56-12 C70 6 54 54 18 56 C-18 58 -52 34 -50-8 C-48-36 -30-46 -18-58Z"/>' +
      '<g transform="translate(6 12) scale(.9)">' + G.burn() + '</g></g><path class="hi" d="M80-44 C90-56 104-56 112-46"/>';
  };
  S.full = function () {
    return '<g transform="translate(96 108)"><ellipse class="sk" rx="62" ry="12" cy="26"/><ellipse class="sk" rx="48" ry="9" cy="22" style="fill:var(--surface)"/><circle class="hif" r="9" cx="-14" cy="18"/><circle class="hif" r="7" cx="6" cy="20"/></g>' +
      '<g transform="translate(228 100)"><path class="sk" d="M-24-46 C-6-52 8-44 10-30 C12-16 36-14 44 4 C50 24 36 46 6 46 C-26 46 -44 24 -40-4 C-38-26-30-38-24-46Z"/>' +
      '<path class="hi" d="M-16 4 C-8 12 6 12 14 4"/></g><path class="hi" d="M146 100 L176 100 M168 92 L176 100 L168 108"/>';
  };
  S.belly = function () {
    return '<g transform="translate(160 100)"><path class="sk" d="M-62-96 L62-96 C74-60 78-20 70 30 L66 110 L-66 110 L-70 30 C-78-20-74-60-62-96Z"/>' +
      '<g' + (art.motion() ? ' class="swellp"' : '') + '><ellipse class="sk" cx="0" cy="38" rx="58" ry="44"/></g>' +
      '<path class="hi" d="M-84 38 C-84-6-40-24 0-24 M84 38 C84-6 40-24 0-24" style="opacity:.0"/><path class="hi" d="M-76 40 L-92 40 M76 40 L92 40 M-70 14 L-84 6 M70 14 L84 6 M-70 66 L-84 74 M70 66 L84 74"/></g>';
  };
  S.jaundice = function () {
    return '<g transform="translate(110 100)"><ellipse rx="60" ry="34" class="sk"/><ellipse rx="42" ry="22" style="fill:#F2DE72;stroke:var(--sk-d);stroke-width:2"/><circle r="14" style="fill:#6B4B2A"/><circle r="6" style="fill:#1B1B1B"/><circle cx="-5" cy="-5" r="3" style="fill:#fff"/></g>' +
      '<g transform="translate(236 104)"><rect class="sk" x="-22" y="-40" width="44" height="86" rx="20" style="fill:#EAD27E"/><path class="ln" d="M-8-24 L-8 34 M8-24 L8 34" style="opacity:.35"/></g>' + label(110, 160, 'Eyes') + label(236, 160, 'Skin');
  };
  S.urine = function () {
    var cols = ['#F6E7A0', '#F1C27A', '#F5A3A3', '#C94A4A'], names = ['Usual', 'Dark', 'Pink', 'Red'], s = '';
    for (var i = 0; i < 4; i++) {
      var x = 56 + i * 70, hot = i > 1;
      s += '<g transform="translate(' + x + ' 96)"><path class="ln" d="M-20-50 L20-50 L16 54 Q0 62-16 54Z" style="fill:var(--surface)"/><path d="M-18-14 L18-14 L15 52 Q0 59-15 52Z" style="fill:' + cols[i] + '"/></g>' +
        (hot ? '<rect class="hi ' + (art.motion() ? 'pulse' : '') + '" x="' + (x - 30) + '" y="40" width="60" height="124" rx="16"/>' : '') + label(x, 178, names[i]);
    }
    return s;
  };
  S.cough = function () {
    return '<g transform="translate(130 100)"><path class="sk" d="M-4-52 L4-52 L4-16 C20-36 52-36 54-6 C56 30 40 56 10 54 C-4 53-4 30-4 20 C-4 30-4 53-18 54 C-48 56-62 30-60-6 C-58-36-26-36-4-16Z" style="fill:#F0A5A5;stroke:var(--sk-d)"/></g>' +
      '<g transform="translate(234 100)"><path class="hi ' + (art.motion() ? 'puff' : '') + '" d="M-26-30 C-6-34 6-22 6-8 M-30 0 C-6-4 14 6 16 24 M-26 30 C-8 28 8 38 8 52" style="opacity:.9"/></g>';
  };
  S['cough-blood'] = function () {
    return '<g transform="translate(160 100)"><path class="sk" d="M-60-30 L40-44 L64 20 L-40 46Z" style="fill:#fff;stroke:var(--line2)"/>' +
      '<g style="fill:#C94A4A"><circle cx="-18" cy="-4" r="5"/><circle cx="4" cy="6" r="4"/><circle cx="20" cy="-14" r="3.2"/><circle cx="-4" cy="-18" r="2.6"/></g></g>' + label(160, 176, 'Blood on a tissue');
  };
  S.breath = function () {
    return '<g transform="translate(120 100)"><path class="sk" d="M-4-52 L4-52 L4-16 C20-36 52-36 54-6 C56 30 40 56 10 54 C-4 53-4 30-4 20 C-4 30-4 53-18 54 C-48 56-62 30-60-6 C-58-36-26-36-4-16Z" style="fill:#F0A5A5;stroke:var(--sk-d)"/></g>' +
      '<g transform="translate(228 100)"><g' + (art.motion() ? ' class="wind"' : '') + '><path class="hi" d="M-30-24 L30-24 C46-24 46-4 32-4 M-30 0 L40 0 C56 0 56 22 40 22 M-30 24 L10 24"/></g></g>';
  };
  S.voice = function () {
    return '<g transform="translate(120 100)"><path class="sk" d="M-30-60 C-30-70 30-70 30-60 L30 60 C30 72-30 72-30 60Z" style="fill:var(--sk)"/><ellipse class="hit" cx="0" cy="-6" rx="30" ry="16"/><ellipse class="hi ' + (art.motion() ? 'pulse' : '') + '" cx="0" cy="-6" rx="30" ry="16"/></g>' +
      '<g transform="translate(224 100)" class="hi" style="fill:none"><path class="hi" d="M-30 0 L-22-10 L-14 14 L-6-18 L2 20 L10-8 L18 4 L30 0" style="stroke-dasharray:4 5"/></g>';
  };
  S.swallow = function () {
    return '<g transform="translate(150 100)"><path class="sk" d="M-40-70 C-10-76 10-60 14-30 L16 20 C16 50 24 56 40 60 L40 74 C10 74-14 60-14 24 L-14-24 C-14-44-24-52-40-52Z"/>' +
      '<ellipse class="hif ' + (art.motion() ? 'bolus' : '') + '" cx="0" cy="-8" rx="13" ry="10"/></g>' + '<path class="hi" d="M196 56 L196 144 M186 132 L196 144 L206 132"/>';
  };
  S['neck-lump'] = function () {
    return '<g transform="translate(150 100)"><ellipse class="sk" cx="0" cy="-92" rx="70" ry="58"/><rect class="sk" x="-30" y="-60" width="60" height="110" rx="20"/><path class="sk" d="M-84 60 C-84 30-50 22-30 20 L30 20 C50 22 84 30 84 60 L84 110 L-84 110Z"/>' +
      '<path class="ln" d="M-14 30 C-10 36 10 36 14 30"/></g>' + ring(150, 64, 20) + '<circle class="hif" cx="150" cy="64" r="8"/>' +
      '<g transform="translate(232 72)"><path class="hi" d="M-26 4 L-4 24 M-4 24 L12 8" style="opacity:0"/></g>';
  };
  S['face-swell'] = function () {
    return '<g transform="translate(110 100)"><ellipse class="sk" rx="50" ry="62"/><circle cx="-18" cy="-8" r="5" style="fill:var(--ink)"/><circle cx="18" cy="-8" r="5" style="fill:var(--ink)"/><path class="ln" d="M-14 28 C-6 34 6 34 14 28"/></g>' +
      '<g transform="translate(110 100)"><ellipse class="hi" rx="62" ry="74" style="stroke-dasharray:4 6;opacity:.7"/></g>' +
      '<g transform="translate(232 100)"><path class="hi" d="M-26 0 L26 0 M-12-14 L-26 0 L-12 14 M12-14 L26 0 L12 14"/></g>';
  };
  S['mouth-ulcer'] = function () {
    return '<g transform="translate(160 100)"><path d="M-80 0 C-60-50 60-50 80 0 C60 52-60 52-80 0Z" style="fill:#C9524F;stroke:var(--sk-d);stroke-width:2"/>' +
      '<path d="M-60 0 C-30 14 30 14 60 0 C30-8-30-8-60 0Z" style="fill:#F4EFEF"/><ellipse cx="-4" cy="26" rx="34" ry="12" style="fill:#E58B8B"/></g>' +
      '<ellipse cx="140" cy="124" rx="13" ry="8" style="fill:#F4EFEF;stroke:#B83C3C;stroke-width:3"/>' + ring(140, 124, 24);
  };
  S['mouth-patch'] = function () {
    return '<g transform="translate(160 100)"><path d="M-80 0 C-60-50 60-50 80 0 C60 52-60 52-80 0Z" style="fill:#C9524F;stroke:var(--sk-d);stroke-width:2"/>' +
      '<path d="M-60 0 C-30 14 30 14 60 0 C30-8-30-8-60 0Z" style="fill:#F4EFEF"/><ellipse cx="-4" cy="26" rx="38" ry="14" style="fill:#E58B8B"/>' +
      '<ellipse cx="-20" cy="26" rx="18" ry="8" style="fill:#fff;opacity:.95"/><ellipse cx="14" cy="28" rx="14" ry="7" style="fill:#C93B3B"/></g>' + ring(150, 126, 24);
  };
  S['loose-tooth'] = function () {
    return '<g transform="translate(150 100)"><path class="sk" d="M-42-48 C-24-62 24-62 42-48 C54-28 38 6 32 52 C30 66 14 66 12 50 C10 36 6 28 0 28 C-6 28-10 36-12 50 C-14 66-30 66-32 52 C-38 6-54-28-42-48Z" style="fill:#fff;stroke:var(--line2)"/></g>' +
      '<g transform="translate(150 100)"><g' + (art.motion() ? ' class="wobble"' : '') + ' style="transform-origin:0 0"><path class="hi" d="M-62-30 C-70-10-70 10-62 30 M62-30 C70-10 70 10 62 30"/></g></g>';
  };
  S.clubbing = function () {
    return '<g transform="translate(130 100)"><path class="sk" d="M-80 30 L-10 30 C20 30 50 22 56-10 C60-34 40-46 14-42 C-20-38-50-30-80-14Z"/><path class="ln" d="M20-22 C30-30 46-30 50-18" style="fill:#fff;opacity:.8"/></g>' +
      '<g transform="translate(246 100)"><path class="sk" d="M-40 30 L8 30 C26 30 40 20 42-4 C44-26 26-34 8-32 C-12-30-26-26-40-18Z"/></g>' + label(130, 162, 'Changed') + label(246, 162, 'Usual');
  };
})();
