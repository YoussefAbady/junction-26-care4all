import { A as C4A } from "../app.js";

/* care4all illustrations, part 4: the screening journey scenes (letter to result) and the brand hero.
   Original SVG, same conventions as art.js. Scenes take optional opts, for example { next: '2 years' }. */
(function () {
  'use strict';
  var A = C4A, art = A.art, S = art.scenes;
  var label = art.label, M = function () { return art.motion(); };

  function mover(path, dur, content) {
    var m = /M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(path), x = m ? m[1] : 0, y = m ? m[2] : 0;
    if (!M()) return '<g transform="translate(' + x + ' ' + y + ')">' + content + '</g>';
    return '<g>' + content + '<animateMotion dur="' + dur + 's" repeatCount="indefinite" path="' + path + '"/></g>';
  }
  function cls(c, extra) { return M() ? ' class="' + c + '"' + (extra || '') : ''; }
  function env(w) {
    w = w || 44;
    var h = w * .68;
    return '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="5" style="fill:var(--surface);stroke:var(--ink);stroke-width:2.2"/>' +
      '<path class="ln" d="M' + (-w / 2) + ' ' + (-h / 2) + ' L0 ' + (h * .1) + ' L' + (w / 2) + ' ' + (-h / 2) + '"/>' + '<circle class="hif" cx="0" cy="' + (h * .22) + '" r="' + (w * .08) + '"/>';
  }
  function tick(d, delay, w) {
    return '<path class="hi' + (M() ? ' draw' : '') + '" d="' + d + '" style="stroke-width:' + (w || 3.5) + (delay ? ';animation-delay:' + delay + 's' : '') + '"/>';
  }

  /* 1. the invitation letter arrives at home */
  S['j-letter'] = function () {
    return '<path class="ln" style="fill:var(--surface)" d="M36 94 L98 48 L160 94 V162 H36Z"/>' +
      '<rect class="hif" x="80" y="114" width="36" height="48" rx="4"/><rect x="86" y="126" width="24" height="5" rx="2.5" style="fill:var(--surface)"/>' +
      '<circle cx="108" cy="146" r="2.6" style="fill:#fff"/><path class="ln" d="M20 162 H300"/>' +
      '<rect class="ln" x="52" y="100" width="20" height="20" rx="3" style="fill:var(--fill)"/>' +
      mover('M250 88 L112 130', 3.4, env(46)) +
      label(246, 52, 'Free') + label(246, 82, 'Your choice', 'middle') +
      label(160, 184, 'A letter comes to your home');
  };

  /* 2. book, change the time or decline */
  S['j-calendar'] = function () {
    var cells = '', r, c;
    for (r = 0; r < 4; r++) for (c = 0; c < 5; c++) {
      if (r === 1 && c === 2) continue;
      cells += '<circle cx="' + (118 + c * 21) + '" cy="' + (88 + r * 22) + '" r="3.4" style="fill:var(--line2)"/>';
    }
    return '<rect class="ln" x="86" y="30" width="148" height="132" rx="16" style="fill:var(--surface)"/>' +
      '<path class="hif" d="M86 46 A16 16 0 0 1 102 30 H218 A16 16 0 0 1 234 46 V58 H86Z"/>' +
      '<rect x="116" y="22" width="8" height="18" rx="4" style="fill:var(--ink)"/><rect x="196" y="22" width="8" height="18" rx="4" style="fill:var(--ink)"/>' +
      cells + '<circle class="hif" cx="160" cy="110" r="10"/><circle class="hi' + (M() ? ' pulse' : '') + '" cx="160" cy="110" r="16"/>' +
      '<path class="hi' + (M() ? ' draw' : '') + '" d="M174 130 C184 146 200 146 208 128" style="stroke-width:3"/><path class="hi" d="M200 126 L208 128 L206 136" style="stroke-width:3"/>' +
      label(160, 184, 'Move it if it does not suit');
  };

  /* 3. getting ready: the health form */
  S['j-prepare'] = function () {
    var rows = '';
    for (var i = 0; i < 3; i++) {
      var y = 62 + i * 34;
      rows += '<rect class="ln" x="124" y="' + y + '" width="18" height="18" rx="5" style="fill:var(--surface)"/>' +
        tick('M128 ' + (y + 9) + ' l4 5 l8-10', .5 + i * .5, 3.2) +
        '<path class="ln" d="M152 ' + (y + 5) + ' H196 M152 ' + (y + 14) + ' H180" style="opacity:.5"/>';
    }
    return '<rect class="ln" x="104" y="20" width="112" height="146" rx="12" style="fill:var(--surface)"/>' +
      '<rect class="hif" x="124" y="34" width="52" height="8" rx="4"/>' + rows +
      '<g transform="translate(236 128) rotate(-30)"><rect class="ln" x="-5" y="-34" width="10" height="44" rx="3" style="fill:var(--fill)"/><path class="ln" d="M-5 10 L0 20 L5 10Z" style="fill:var(--ink)"/></g>' +
      label(160, 184, 'Fill in the short form');
  };

  /* 4. arriving at the clinic */
  S['j-clinic'] = function () {
    var person = '<circle cx="0" cy="-46" r="9" class="sk"/><path class="sk" d="M-11 -34 C-13 -14 -13 0 -11 0 H11 C13 0 13 -14 11 -34 C6 -38 -6 -38 -11 -34Z"/><rect class="sk" x="-9" y="-2" width="7" height="28" rx="3"/><rect class="sk" x="2" y="-2" width="7" height="28" rx="3"/>';
    return '<path class="ln" style="fill:var(--surface)" d="M150 50 H284 V162 H150Z"/>' +
      '<rect class="hif" x="206" y="64" width="22" height="6" rx="2"/><rect class="hif" x="214" y="56" width="6" height="22" rx="2"/>' +
      '<rect class="ln" x="200" y="116" width="34" height="46" rx="3" style="fill:var(--fill)"/><rect class="ln" x="166" y="92" width="22" height="22" rx="3" style="fill:var(--fill)"/><rect class="ln" x="246" y="92" width="22" height="22" rx="3" style="fill:var(--fill)"/>' +
      '<path class="ln" d="M16 162 H304"/>' + mover('M44 136 L176 136', 4.2, person) +
      label(100, 184, 'Check in', 'middle');
  };

  /* 5. the mammogram: two plates, a few seconds */
  S['j-test-breast'] = function () {
    var up = '<g' + cls('plate') + '><rect class="ln" x="84" y="60" width="132" height="12" rx="6" style="fill:var(--fill)"/><rect class="ln" x="142" y="30" width="16" height="32" rx="4" style="fill:var(--fill)"/></g>';
    return '<rect class="ln" x="46" y="20" width="30" height="150" rx="12" style="fill:var(--fill)"/>' +
      '<rect class="ln" x="76" y="128" width="148" height="14" rx="6" style="fill:var(--fill)"/>' +
      '<g' + cls('squash') + '><path class="sk" d="M98 128 C98 92 202 92 202 128Z"/><circle cx="150" cy="116" r="4" style="fill:var(--sk-d)"/></g>' + up +
      '<g' + cls('xray') + '><path class="hi" d="M120 76 V120 M150 76 V120 M180 76 V120" style="stroke-dasharray:3 5;stroke-width:2.6"/></g>' +
      '<rect class="ln" x="238" y="40" width="46" height="34" rx="8" style="fill:var(--surface)"/><circle class="hif" cx="252" cy="57" r="6"/><path class="ln" d="M264 52 H276 M264 62 H272"/>' +
      label(160, 184, 'Pressed flat for about 10 seconds');
  };

  /* 6. the cervical sample: schematic, no more detail than needed */
  S['j-test-cervical'] = function () {
    var brush = '<rect x="-2" y="0" width="4" height="34" rx="2" style="fill:var(--ink)"/><path class="ln" d="M-6 -2 L-2 -10 M0 -3 V-12 M6 -2 L2 -10 M-8 4 L-3 -6 M8 4 L3 -6" style="stroke-width:1.8"/>';
    return '<path class="tst" d="M160 22 C130 22 116 50 122 80 C126 100 140 108 142 124 L178 124 C180 108 194 100 198 80 C204 50 190 22 160 22Z"/>' +
      '<rect class="tst" x="142" y="124" width="36" height="26" rx="8"/><ellipse cx="160" cy="150" rx="8" ry="3" style="fill:var(--sk-d);opacity:.7"/>' +
      '<path class="ln" d="M142 150 C140 164 134 176 128 190 M178 150 C180 164 186 176 192 190"/>' +
      '<circle class="hi' + (M() ? ' pulse' : '') + '" cx="160" cy="137" r="22"/>' +
      mover('M160 196 L160 156', 3.2, brush) +
      label(14, 34, 'Cervix cells', 'start') + label(262, 168, 'Soft brush', 'middle');
  };

  /* 7. the bowel test: a small sample into the tube */
  S['j-test-bowel'] = function () {
    var stick = '<rect x="-2.5" y="-44" width="5" height="46" rx="2.5" transform="rotate(28)" style="fill:#C9A66B;stroke:var(--ink);stroke-width:1.5"/>';
    return '<ellipse cx="92" cy="152" rx="56" ry="15" style="fill:var(--surface);stroke:var(--ink);stroke-width:2.2"/><ellipse cx="92" cy="148" rx="15" ry="6" style="fill:#8B6B4A"/>' +
      '<rect class="ln" x="216" y="72" width="36" height="96" rx="9" style="fill:var(--surface)"/>' +
      '<rect x="212" y="54" width="44" height="22" rx="7" style="fill:#43B049;stroke:var(--ink);stroke-width:2.2"/>' +
      '<rect class="ln" x="224" y="112" width="20" height="26" rx="3" style="fill:var(--fill)"/><path class="ln" d="M228 120 H240 M228 128 H236" style="opacity:.6"/>' +
      mover('M96 144 L232 98', 3.4, stick) + label(160, 184, 'A small sample from a clean surface');
  };

  /* 8. seal, label and post */
  S['j-post'] = function () {
    var pouch = '<rect x="-20" y="-13" width="40" height="26" rx="6" style="fill:var(--surface);stroke:var(--ink);stroke-width:2.2"/><rect x="-6" y="-9" width="12" height="18" rx="4" style="fill:#43B049"/>';
    return '<path d="M206 170 V84 C206 62 222 52 240 52 C258 52 274 62 274 84 V170Z" style="fill:#F58120;stroke:var(--ink);stroke-width:2.2"/>' +
      '<rect x="218" y="88" width="44" height="7" rx="3.5" style="fill:var(--ink)"/><rect x="224" y="118" width="32" height="20" rx="3" style="fill:var(--surface);opacity:.9"/>' +
      '<path class="ln" d="M20 170 H304"/>' + mover('M52 146 L216 92', 3.6, pouch) +
      label(110, 184, 'Seal, label and post', 'middle');
  };

  /* 9. the laboratory checks it */
  S['j-wait'] = function () {
    var ticks = '';
    for (var i = 0; i < 12; i++) ticks += '<path class="ln" d="M118 62 V68" transform="rotate(' + i * 30 + ' 118 100)" style="opacity:.55;stroke-width:2"/>';
    return '<circle cx="118" cy="100" r="46" style="fill:var(--surface);stroke:var(--ink);stroke-width:2.6"/>' + ticks +
      '<g' + cls('spin', ' style="transform-origin:118px 100px;animation-duration:8s"') + '><path class="hi" d="M118 100 V70" style="stroke-width:3.4"/></g><circle class="hif" cx="118" cy="100" r="5"/>' +
      '<rect class="ln" x="190" y="146" width="88" height="12" rx="5" style="fill:var(--fill)"/>' +
      '<rect class="ln" x="198" y="84" width="16" height="62" rx="8" style="fill:var(--surface)"/><rect x="200" y="112" width="12" height="32" rx="6" class="hif" style="opacity:.8"/>' +
      '<rect class="ln" x="226" y="84" width="16" height="62" rx="8" style="fill:var(--surface)"/><rect x="228" y="100" width="12" height="44" rx="6" style="fill:#1FB7EB;opacity:.8"/>' +
      '<rect class="ln" x="254" y="84" width="16" height="62" rx="8" style="fill:var(--surface)"/><rect x="256" y="122" width="12" height="22" rx="6" class="hif" style="opacity:.8"/>' +
      label(160, 184, 'A laboratory checks it');
  };

  /* 10. a normal result */
  S['j-result-ok'] = function (o) {
    return '<g transform="translate(160 86)"><rect class="ln" x="-56" y="-44" width="112" height="88" rx="10" style="fill:var(--surface)"/>' +
      '<path class="ln" d="M-56 -44 L0 4 L56 -44" style="opacity:.55"/></g>' +
      '<g' + cls('popin') + '><circle class="hif" cx="160" cy="92" r="30"/><path d="M146 93 l10 11 l20-24" style="fill:none;stroke:#fff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round"/></g>' +
      label(160, 184, o && o.next ? 'Next invitation in ' + o.next : 'All clear, nothing more to do');
  };

  /* 11. more tests are needed (most are not cancer) */
  S['j-result-call'] = function (o) {
    var items = (o && o.items) || [], pills = '';
    items.slice(0, 3).forEach(function (t, i) { pills += label(236, 64 + i * 30, t, 'middle'); });
    return '<g transform="translate(96 96)"><rect class="ln" x="-52" y="-38" width="104" height="76" rx="10" style="fill:var(--surface)"/><path class="ln" d="M-52 -38 L0 4 L52 -38" style="opacity:.55"/></g>' +
      '<g' + cls('wobble') + '><circle class="hi" cx="104" cy="104" r="22" style="stroke-width:4"/><path class="hi" d="M120 120 L140 142" style="stroke-width:6"/></g>' + pills +
      label(160, 184, 'A closer look, to be sure');
  };

  /* 12. what comes next, one step at a time */
  S['j-followup'] = function () {
    var path = 'M40 150 C90 150 90 100 150 100 C210 100 210 50 270 50';
    var nodes = [[40, 150], [150, 100], [270, 50]].map(function (p, i) {
      return '<circle class="hif" cx="' + p[0] + '" cy="' + p[1] + '" r="13"/><text class="tx" x="' + p[0] + '" y="' + (p[1] + 5) + '" text-anchor="middle" style="fill:#fff">' + (i + 1) + '</text>';
    }).join('');
    return '<path class="ln" d="' + path + '" style="stroke-dasharray:2 7;stroke-width:3"/>' + nodes +
      mover(path, 5, '<circle r="7" style="fill:var(--surface);stroke:var(--ink);stroke-width:2.4"/>') +
      label(160, 184, 'One step at a time');
  };

  /* 13. talk to a doctor between screenings */
  S['j-doctor'] = S['s-doctor'];

  /* 14. benefits and downsides, side by side */
  S['j-benefits'] = function () {
    return '<path class="ln" d="M160 60 V164 M120 168 H200" style="stroke-width:3"/>' +
      '<g transform="rotate(-9 160 62)"><path class="ln" d="M70 62 H250" style="stroke-width:4"/>' +
      '<path class="ln" d="M82 62 L64 112 M82 62 L100 112" style="stroke-width:1.8"/><path class="ln" d="M52 112 H112 C110 130 54 130 52 112Z" style="fill:var(--surface)"/>' +
      '<g transform="rotate(9 82 100)"><circle class="hif" cx="82" cy="96" r="12"/><path d="M76 96 l4 5 l8-10" style="fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round"/></g>' +
      '<path class="ln" d="M238 62 L220 100 M238 62 L256 100" style="stroke-width:1.8"/><path class="ln" d="M208 100 H268 C266 118 210 118 208 100Z" style="fill:var(--surface)"/>' +
      '<circle class="ln" cx="238" cy="92" r="6" style="stroke-width:2"/></g>' +
      label(160, 184, 'Benefits and downsides, side by side');
  };


  /* 15. privacy: personal details stay on the device, only anonymous totals can leave (if you allow it) */
  S['j-privacy'] = function () {
    var dot = '<rect x="-5" y="-5" width="10" height="10" rx="3" style="fill:var(--ink);opacity:.55"/>';
    return '<rect class="ln" x="26" y="44" width="84" height="138" rx="16" style="fill:var(--surface)"/>' +
      '<circle class="hif" cx="68" cy="82" r="14"/><path class="ln" d="M44 120 H92 M48 134 H88 M54 148 H82" style="opacity:.55"/>' +
      '<circle cx="98" cy="38" r="0"/><g transform="translate(92 162)"><circle r="15" style="fill:var(--ink)"/><rect x="-6" y="-2" width="12" height="9" rx="2.500" style="fill:var(--surface)"/><path d="M-3.500-2 V-5 A3.500 3.500 0 0 1 3.500-5 V-2" style="fill:none;stroke:var(--surface);stroke-width:2"/></g>' +
      '<path class="ln" d="M128 100 H206" style="stroke-dasharray:2 7;stroke-width:3"/>' +
      '<g transform="translate(167 100)"><circle r="19" style="fill:var(--surface);stroke:var(--ink);stroke-width:2.400"/><path d="M0-9 L8-5.500 V1 C8 5.500 4 8.500 0 10.500 C-4 8.500-8 5.500-8 1 V-5.500Z" class="hif"/></g>' +
      mover('M126 100 L146 100', 2.4, dot) + mover('M190 100 L210 100', 2.4, dot) +
      '<rect class="ln" x="210" y="56" width="84" height="88" rx="14" style="fill:var(--surface)"/>' +
      '<rect class="hif" x="226" y="104" width="12" height="28" rx="3"/><rect class="hif" x="246" y="88" width="12" height="44" rx="3" style="opacity:.75"/><rect class="hif" x="266" y="72" width="12" height="60" rx="3" style="opacity:.5"/>' +
      label(68, 30, 'Your details', 'middle') + label(252, 40, 'Anonymous totals', 'middle') + label(167, 70, 'No names', 'middle');
  };

  /* ---------- brand hero for the welcome screen (viewBox 400 x 190, drawn on the dark navy panel) ---------- */
  art.hero = function () {
    function person(x, h, skin, hair, cloth, bun) {
      var top = 172 - h;
      return '<g><rect x="' + (x - 7) + '" y="' + (172 - h * .38) + '" width="6" height="' + (h * .38) + '" rx="3" style="fill:#1E2631"/><rect x="' + (x + 1) + '" y="' + (172 - h * .38) + '" width="6" height="' + (h * .38) + '" rx="3" style="fill:#1E2631"/>' +
        '<path d="M' + (x - 13) + ' ' + (172 - h * .36) + ' C' + (x - 15) + ' ' + (top + 16) + ' ' + (x - 12) + ' ' + (top + 12) + ' ' + (x - 7) + ' ' + (top + 10) + ' H' + (x + 7) + ' C' + (x + 12) + ' ' + (top + 12) + ' ' + (x + 15) + ' ' + (top + 16) + ' ' + (x + 13) + ' ' + (172 - h * .36) + 'Z" style="fill:' + cloth + '"/>' +
        '<circle cx="' + x + '" cy="' + (top + 4) + '" r="9" style="fill:' + skin + '"/>' +
        '<path d="M' + (x - 9.5) + ' ' + (top + 3) + ' C' + (x - 9) + ' ' + (top - 8) + ' ' + (x + 9) + ' ' + (top - 8) + ' ' + (x + 9.5) + ' ' + (top + 3) + ' C' + (x + 5) + ' ' + (top - 2) + ' ' + (x - 5) + ' ' + (top - 2) + ' ' + (x - 9.5) + ' ' + (top + 3) + 'Z" style="fill:' + hair + '"/>' +
        (bun ? '<circle cx="' + x + '" cy="' + (top - 8) + '" r="5" style="fill:' + hair + '"/>' : '') + '</g>';
    }
    function badge(x, y, inner, delay, r) {
      return '<g transform="translate(' + x + ' ' + y + ')"><g class="bob" style="animation-delay:' + delay + 's"><circle r="' + (r || 17) + '" style="fill:#fff"/><g style="fill:none;stroke:#242C38;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round">' + inner + '</g></g></g>';
    }
    var shield = '<path d="M0-9 L9-5.500 V1.500 C9 6.500 4.500 10 0 12 C-4.500 10 -9 6.500 -9 1.500 V-5.500Z"/><path d="M-4 1 L-1 4 L5-3"/>';
    var heart = '<path d="M0 8 C-13 0 -11-10 -4-9 C-1.500-8.500 0-6 0-6 C0-6 1.500-8.500 4-9 C11-10 13 0 0 8Z" style="fill:#F58120;stroke:#F58120"/>';
    var mail = '<rect x="-9" y="-6.500" width="18" height="13" rx="2.500"/><path d="M-9-6 L0 1 L9-6"/>';
    var lock = '<rect x="-7" y="-2" width="14" height="11" rx="3"/><path d="M-4-2 V-5 A4 4 0 0 1 4-5 V-2"/>';
    var globe = '<circle r="9"/><path d="M-9 0 H9 M0-9 C-5-4 -5 4 0 9 M0-9 C5-4 5 4 0 9"/>';
    return '<svg viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Three people of different ages standing by a calm Finnish lake at sunrise, with a shield, a heart, a letter and a lock floating above them">' +
      '<defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C3646"/><stop offset=".55" stop-color="#46506A"/><stop offset="1" stop-color="#F08A4B"/></linearGradient>' +
      '<linearGradient id="hlake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C46B3A"/><stop offset=".5" stop-color="#2F3B50"/><stop offset="1" stop-color="#1B2230"/></linearGradient></defs>' +
      '<rect width="400" height="190" fill="url(#hsky)"/>' +
      '<circle class="sun" cx="292" cy="118" r="48" style="fill:#F58120;opacity:.22"/><circle cx="292" cy="118" r="30" style="fill:#F9A34D"/><circle cx="292" cy="118" r="22" style="fill:#FFD08A"/>' +
      '<path d="M0 126 C40 110 70 112 110 122 C150 112 190 108 230 120 C280 108 340 112 400 124 V140 H0Z" style="fill:#33405A;opacity:.9"/>' +
      '<path d="M0 134 C60 122 120 128 170 134 C230 124 330 126 400 136 V150 H0Z" style="fill:#273246"/>' +
      '<rect y="138" width="400" height="52" fill="url(#hlake)"/>' +
      '<path d="M270 146 H314 M262 154 H322 M274 162 H310 M282 170 H302" style="stroke:#FFD08A;stroke-width:2;stroke-linecap:round;opacity:.45"/>' +
      '<g style="fill:#151B24"><path d="M30 172 L44 118 L58 172Z"/><path d="M46 172 L62 100 L78 172Z"/><path d="M70 172 L82 128 L94 172Z"/><path d="M336 172 L348 124 L360 172Z"/><path d="M352 172 L368 106 L384 172Z"/></g>' +
      '<path d="M96 174 C150 168 250 168 306 174 V190 H96Z" style="fill:#1E2631"/>' +
      person(166, 62, '#D9A27B', '#C9C9CE', '#1FB7EB', true) + person(200, 76, '#8A5A3C', '#2A1E19', '#F58120', false) + person(236, 54, '#F0C7A5', '#7B4B2A', '#43B049', false) +
      '<path d="M120 62 C140 78 160 92 176 100 M200 46 V80 M280 66 C260 78 244 92 232 104 M344 100 C310 110 266 122 244 130" style="fill:none;stroke:#fff;stroke-opacity:.3;stroke-width:1.6;stroke-dasharray:2 6;stroke-linecap:round"/>' +
      badge(112, 56, shield, 0) + badge(200, 36, heart, .6, 20) + badge(288, 58, mail, 1.2) + badge(346, 96, lock, 1.8, 15) + badge(56, 96, globe, 2.2, 15) + '</svg>';
  };
})();
