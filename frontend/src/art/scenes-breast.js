import { A as C4A } from "../app.js";
import "../styles/selfcheck-breast.css";

/* The breast self-check scenes (12 steps and the poster of the check page).
   Written against A.stage (timeline) and A.kit (figures, props, overlays). See the headers of stage.js and kit.js for the conventions.
   Everything lives in one function scope; helper names start with br so they cannot clash with the kit.
   Texts: English is the source; the Finnish and Swedish captions and labels are drafts for a native speaker to check. */
(function () {
  'use strict';
  var A = C4A, K = A.kit, stage = A.stage;
  var tr = function (a, b, c) { return A.tr(a, b, c); };
  var n2 = function (v) { return +(+v).toFixed(2); };

  /* ================================================================================================================
     Shared helpers
     ================================================================================================================ */
  /* a rounded panel with its own clip and a thin contour; inner is drawn in panel coordinates (0,0 top left) */
  function brPanel(c, name, x, y, w, h, r, inner, o) {
    o = o || {};
    var id = c.id(name);
    c.defs('<clipPath id="' + id + '"><path d="' + K.rr(0, 0, w, h, r) + '"/></clipPath>');
    return '<g transform="translate(' + x + ' ' + y + ')"><g clip-path="url(#' + id + ')">' + inner + '</g><path d="' + K.rr(0, 0, w, h, r) + '" class="st-contour" fill="none" stroke-opacity=".9" stroke-width="1.2"/>' +
      (o.edge ? '<path d="' + K.rr(0, 0, w, h, r) + '" fill="none" stroke="' + o.edge + '" stroke-width="2"/>' : '') + '</g>';
  }
  function brAt(x, y, inner, s) { return '<g transform="translate(' + n2(x) + ' ' + n2(y) + ')' + (s && s !== 1 ? ' scale(' + s + ')' : '') + '">' + inner + '</g>'; }
  function brRadial(c, name, stops, o) {
    o = o || {};
    c.defs('<radialGradient id="' + c.id(name) + '" cx="' + (o.cx == null ? .5 : o.cx) + '" cy="' + (o.cy == null ? .5 : o.cy) + '" r="' + (o.r == null ? .5 : o.r) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '" stop-opacity="' + s[2] + '"/>'; }).join('') + '</radialGradient>');
    return 'url(#' + c.id(name) + ')';
  }
  function brLinear(c, name, x1, y1, x2, y2, stops, units) {
    c.defs('<linearGradient id="' + c.id(name) + '" ' + (units === 'user' ? 'gradientUnits="userSpaceOnUse" ' : '') + 'x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '" stop-opacity="' + s[2] + '"/>'; }).join('') + '</linearGradient>');
    return 'url(#' + c.id(name) + ')';
  }
  /* a pill label that is always visible (also in thumbnails) */
  function brTag(text, x, y, o) {
    o = o || {};
    var size = o.size || 12.5, w = text.length * size * .56 + 20, h = size + 11;
    return '<g><rect class="st-pill" x="' + n2(x - w / 2) + '" y="' + n2(y - h / 2) + '" width="' + n2(w) + '" height="' + n2(h) + '" rx="' + n2(h / 2) + '"/><text class="st-lbl" text-anchor="middle" font-size="' + size + '" x="' + n2(x) + '" y="' + n2(y + size * .35) + '">' + A.esc(text) + '</text></g>';
  }
  /* small caps-style numbered tag next to a callout */
  function brDash(d, col) { return '<path d="' + d + '" fill="none" stroke="' + (col || 'var(--st-guide)') + '" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round"/>'; }

  /* ---------- the standing woman at the bathroom mirror (body coordinates: origin at the notch of the throat) ---------- */
  var ST = { x: 102, y: 127, s: .8 };                 /* where the body stands in the glass, glass coordinates */
  var MIR = { x: 14, y: 14, w: 204, h: 272 };           /* the mirror glass in the scene */
  var BRL = [-36, 58], BRR = [36, 58];                  /* the breasts in body coordinates (picture left, picture right) */
  function brHeadBack() { return K.head({ x: 0, y: -50, hair: 'bun', layer: 'back' }); }
  function brHeadFront(eyes) { return K.head({ x: 0, y: -50, hair: 'bun', eyes: eyes || 'open', layer: 'front' }); }
  function brTorso() { return K.torso({ form: 'female', len: 178 }); }
  /* a simple hand for arms that hang, rise or rest (the detailed palpation hand is kept for the hand that feels): fingers point down (+y), origin at the wrist.
     side -1 = picture-left arm: the thumb is on the inner side. About 2 KB instead of 10 KB. */
  function brHandLite(side) {
    var tx = -side, s = '';
    [[-11.4, 28], [-3.8, 33], [3.8, 31], [11.4, 25]].forEach(function (f) {
      var d = K.rr(f[0] - 4.3, 30, 8.6, f[1], 4.3);
      s += '<path d="' + d + '" fill="url(#k-skin-h)"/><path d="' + d + '" class="st-contour" stroke-opacity=".8"/><path d="' + K.rr(f[0] - 3, 30 + f[1] - 8, 6, 6.4, 2.6) + '" fill="url(#k-nail)" opacity=".85"/>';
    });
    var th = K.rr(tx * 14 - 4.6, 8, 9.2, 30, 4.6);
    s += '<g transform="rotate(' + (tx * -16) + ' ' + (tx * 14) + ' 8)"><path d="' + th + '" fill="url(#k-skin-h)"/><path d="' + th + '" class="st-contour" stroke-opacity=".8"/></g>';
    var palm = 'M-15.5 -3C-19 12 -19 28 -15.5 40Q0 46 15.5 40C19 28 19 12 15.5 -3C8 -6 -8 -6 -15.5 -3Z';
    s += '<path d="' + palm + '" fill="url(#k-skin-soft)"/><path d="' + palm + '" fill="url(#k-sh-edge-h)" opacity=".7"/><ellipse cx="-4" cy="14" rx="7" ry="10" fill="url(#k-hi-r)" opacity=".4"/><path d="' + palm + '" class="st-contour" stroke-opacity=".8"/>';
    s += '<path d="M-9 36Q0 40 9 36" class="st-crease" stroke-opacity=".25" stroke-width=".8"/>';
    return s;
  }
  /* an arm in two parts, each rotating on its own joint. side -1 picture left, +1 picture right.
     k1 turns the whole arm about the shoulder, k2 turns the forearm about the elbow (keys of c.anim, r = degrees of raise, positive = lift away from the body).
     A single key gives a still pose (no animation). o.hand 'full' uses the kit's detailed hand. */
  function brArm(c, side, k1, k2, o) {
    o = o || {};
    var sx = side * 70, S = [sx, 14], E = [sx, 118], W = [sx, 210], map = function (ks) { return ks.map(function (k) { var q = {}; for (var a in k) q[a] = k[a]; if (k.r != null) q.r = -side * k.r; return q; }); };
    var hand = o.hand === 'full' ? K.hand({ pose: 'open', x: W[0], y: W[1], r: 180, flip: side < 0, s: 1 }) : K.place({ x: W[0], y: W[1] }, brHandLite(side));
    var fore = K.limb(E, W, 29, 19.5, { bulge: .1 }) + '<circle cx="' + E[0] + '" cy="' + E[1] + '" r="14.5" fill="url(#k-skin-dome)"/><ellipse cx="' + (E[0] - 2) + '" cy="' + (E[1] + 1) + '" rx="6" ry="4" fill="url(#k-sh-r-soft)" opacity=".5"/>' + hand;
    var upper = K.limb(S, E, 40, 30, { bulge: .06 });
    var fixed = k1.length === 1 && k2.length === 1, fa, ua;
    if (fixed) {
      fa = '<g transform="rotate(' + n2(-side * k2[0].r) + ' ' + E[0] + ' ' + E[1] + ')">' + fore + '</g>';
      ua = '<g transform="rotate(' + n2(-side * k1[0].r) + ' ' + S[0] + ' ' + S[1] + ')">' + upper + fa + '</g>';
    } else {
      fa = c.anim(map(k2), fore, { pivot: E, stillT: o.stillT });
      ua = c.anim(map(k1), upper + fa, { pivot: S, stillT: o.stillT });
    }
    return ua + '<circle cx="' + (S[0] + side * 4) + '" cy="' + (S[1] - 2) + '" r="21" fill="url(#k-bdome)"/>';
  }
  /* the kit's arm with the lite hand (the hand turns with the forearm) */
  function brArmLite(o) {
    var p = K.armPoints(o), side = o.side === 'l' ? -1 : 1, a = {};
    for (var k in o) a[k] = o[k];
    delete a.hand;
    return K.arm(a) + K.place({ x: p.W[0], y: p.W[1], r: p.angle + 180 }, brHandLite(side));
  }
  /* the two joint angles (raise amounts, degrees) that bring the wrist of an arm to W, elbow bent to the side given by bend */
  function brIK(side, W, bend) {
    var p = K.armPoints({ side: side < 0 ? 'l' : 'r', wrist: W, bend: bend }), D = 180 / Math.PI;
    var a1 = Math.atan2(side * (p.E[0] - p.S[0]), p.E[1] - p.S[1]) * D, a2 = Math.atan2(side * (p.W[0] - p.E[0]), p.W[1] - p.E[1]) * D - a1;
    while (a2 > 180) a2 -= 360;
    while (a2 <= -180) a2 += 360;
    return [a1, a2];
  }
  /* the side view (facing right), body coordinates, origin at the base of the front of the neck */
  function brSideFig(o) {
    o = o || {};
    var s = '';
    s += K.head({ view: 'side', x: -2, y: -41, hair: 'short', layer: 'all' });
    s += K.torso({ view: 'side', form: 'female', len: 178 });
    if (o.arm !== false) {
      var S = [-6, 14], E = [-6, 118], W = [-6, 210];
      var fore = K.limb(E, W, 29, 19.5, { bulge: .1 }) + '<circle cx="-6" cy="118" r="14.5" fill="url(#k-skin-dome)"/>' + K.place({ x: -6, y: 210 }, brHandLite(1));
      if (o.up) fore = '<g transform="rotate(-70 -6 118)">' + fore + '</g>';
      s += '<g transform="rotate(' + (o.up ? -148 : 0) + ' -6 14)">' + K.limb(S, E, 38, 29, { bulge: .06 }) + fore + '</g><circle cx="-4" cy="12" r="19" fill="url(#k-bdome)"/>';
    }
    return s;
  }
  /* the reflection backdrop of the mirror glass */
  function brGlassBack(w, h) {
    return '<rect width="' + w + '" height="' + h + '" fill="url(#k-wall)" opacity=".5"/><rect x="0" y="' + (h - 40) + '" width="' + w + '" height="40" fill="var(--st-towel)" opacity=".18"/>';
  }
  /* the whole bathroom scene with the mirror; content is what the glass shows, drawn in glass coordinates */
  function brBath(content, m) {
    m = m || MIR;
    return K.room({ kind: 'bath', w: 360, h: 300 }) + K.wallMirror({ x: m.x, y: m.y, w: m.w, h: m.h, content: brGlassBack(m.w, m.h) + content });
  }
  function brUse(x, y, sc) { ST.x = x; ST.y = y; ST.s = sc; }
  function brMap(p) { return K.mapper({ x: MIR.x + ST.x, y: MIR.y + ST.y, s: ST.s })(p); }     /* body point -> scene point */
  /* a soft light sweep that passes over both breasts (body coordinates) */
  function brSweep(c, t0, t1) {
    var clip = c.id('swc'), g = brLinear(c, 'swg', 0, 0, 1, 0, [[0, '#fff', 0], [.5, '#fff', .55], [1, '#fff', 0]]);
    c.defs('<clipPath id="' + clip + '"><ellipse cx="-36" cy="58" rx="29" ry="28"/><ellipse cx="36" cy="58" rx="29" ry="28"/></clipPath>');
    var band = '<rect x="-16" y="20" width="32" height="90" fill="' + g + '" transform="rotate(-16 0 60)"/>';
    return '<g clip-path="url(#' + clip + ')">' + c.show(t0, t1, c.anim([{ t: t0, x: -80 }, { t: t1, x: 80, ease: 'linear' }], band, { stillT: t0 }), { fade: .2, still: false }) + '</g>';
  }

  /* ================================================================================================================
     1. s-br-time: a few quiet minutes. Three moments, a stopwatch and a calendar.
     ================================================================================================================ */
  function brPBed(c) {
    var s = '<rect width="110" height="120" fill="url(#k-wall)"/>';
    s += '<rect x="0" y="0" width="110" height="120" fill="' + brRadial(c, 'lampg', [[0, '#FFD98A', .6], [1, '#FFD98A', 0]], { cx: .86, cy: .36, r: .55 }) + '"/>';
    /* window with a night sky */
    s += '<rect x="10" y="10" width="40" height="38" rx="3" fill="#25324A"/><circle cx="36" cy="22" r="5" fill="#F4F0DC"/><circle cx="38" cy="21" r="4.2" fill="#25324A"/><circle cx="20" cy="18" r=".9" fill="#fff"/><circle cx="26" cy="34" r=".8" fill="#fff"/><circle cx="43" cy="38" r=".7" fill="#fff"/>';
    s += '<rect x="10" y="10" width="40" height="38" rx="3" fill="url(#k-streak)" opacity=".5"/><path d="' + K.rr(8, 8, 44, 42, 4) + '" fill="none" stroke="var(--st-bed)" stroke-width="3"/><path d="M30 8V50M8 29H52" stroke="var(--st-bed)" stroke-width="1.6"/>';
    /* headboard, mattress, pillow, cover */
    s += '<rect x="-2" y="58" width="76" height="62" fill="url(#k-wood)"/><rect x="-2" y="58" width="76" height="4" fill="#fff" opacity=".18"/>';
    s += K.contact(38, 84, 40, 9, .6) + K.pillow({ x: 36, y: 80, w: 60, h: 30 });
    s += K.cloth('M-4 92C14 86 36 96 58 90C70 87 80 92 84 94L84 124L-4 124Z', { kind: 'sheet-tint', fibre: false }) + K.folds(0, 96, 84, 22, 3, 3, 3);
    /* bedside table with a lamp */
    s += '<rect x="76" y="82" width="38" height="40" fill="url(#k-wood)"/><rect x="76" y="82" width="38" height="3" fill="#fff" opacity=".2"/><path d="M76 82H114" stroke="rgb(var(--st-shadow))" stroke-opacity=".3"/>';
    s += '<path d="M92 56L100 56L102 66L90 66Z" fill="#F7E3B0"/><path d="M90.5 55L101.5 55L104 70L88 70Z" fill="#F4D58A"/><path d="M90.5 55L96 55L94 70L88 70Z" fill="#fff" opacity=".4"/><rect x="94" y="70" width="4" height="10" fill="var(--st-metal-d)"/><ellipse cx="96" cy="82" rx="8" ry="2" fill="var(--st-metal)"/>';
    s += K.contact(96, 84, 16, 3, .5);
    return s;
  }
  function brPShower(c) {
    var s = '<rect width="110" height="120" fill="url(#k-tile)"/><rect width="110" height="120" fill="url(#k-vig)"/>';
    s += '<rect x="0" y="0" width="14" height="120" fill="var(--st-glass)" opacity=".5"/><rect x="12" y="0" width="2.4" height="120" fill="var(--st-metal)"/><rect x="0" y="0" width="14" height="120" fill="url(#k-streak)" opacity=".6"/>';
    s += K.showerHead({ x: 62, y: 18, s: .72, c: c, streams: 9, len: 150 });
    /* soap bottle on a shelf */
    s += '<rect x="76" y="94" width="30" height="5" rx="1.5" fill="var(--st-metal)"/><rect x="76" y="98" width="30" height="2" fill="rgb(var(--st-shadow))" opacity=".25"/><path d="M84 94V78Q84 74 88 74H90Q94 74 94 78V94Z" fill="#E7A6C2"/><path d="M84 94V78Q84 74 86 74V94Z" fill="#fff" opacity=".4"/><rect x="87" y="68" width="4" height="7" rx="1" fill="var(--st-metal-d)"/><path d="M94 94V80Q94 76 98 76H100Q104 76 104 80V94Z" fill="#8EC8D9"/><path d="M94 94V80Q94 76 96 76V94Z" fill="#fff" opacity=".4"/>';
    s += K.drops(16, 20, 76, 80, 9, 5);
    return s;
  }
  function brPDress(c) {
    var s = '<rect width="110" height="120" fill="url(#k-wall)"/><rect width="110" height="120" fill="url(#k-vig)"/>';
    s += '<rect x="58" y="0" width="52" height="120" fill="url(#k-wood)"/><path d="M84 0V120" stroke="rgb(var(--st-shadow))" stroke-opacity=".4" stroke-width="1.4"/><rect x="58" y="0" width="52" height="120" fill="url(#k-hi-v)" opacity=".5"/><rect x="78" y="56" width="3" height="12" rx="1.5" fill="var(--st-metal)"/><rect x="87" y="56" width="3" height="12" rx="1.5" fill="var(--st-metal)"/>';
    /* a rail with a soft top on a hanger */
    s += '<path d="M2 14H56" stroke="var(--st-metal)" stroke-width="3" stroke-linecap="round"/><path d="M2 12H56" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>';
    s += '<path d="M28 14V19Q28 22 31 23" fill="none" stroke="var(--st-metal-d)" stroke-width="1.8"/><path d="M12 36L28 24L44 36" fill="none" stroke="var(--st-metal-d)" stroke-width="2" stroke-linecap="round"/>';
    var top = 'M16 34L28 27L40 34L52 48L46 56L40 52L41 100Q28 104 15 100L16 52L10 56L4 48Z';
    s += '<path d="' + top + '" fill="url(#k-sheet-tint)" transform="translate(1.5 3)" opacity=".25"/><path d="' + top + '" fill="url(#k-towel)"/><path d="' + top + '" fill="url(#k-sh-edge-h)"/><path d="' + top + '" class="st-contour"/>';
    s += '<path d="M21 31Q28 40 35 31" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".35" stroke-width="1.2"/><path d="M24 54Q22 78 25 98M32 52Q34 76 32 98" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/><path d="M26 56Q24 80 26 96" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".12" stroke-width="3" stroke-linecap="round" filter="url(#k-b1)"/>';
    s += '<path d="M10 104H56" stroke="rgb(var(--st-shadow))" stroke-opacity=".18" stroke-width="5" filter="url(#k-b2)"/>';
    return s;
  }
  function brStopwatch(c, t0, t1) {
    var R = 24, s = '';
    s += '<circle cx="1.5" cy="3.5" r="' + (R + 4) + '" fill="rgb(var(--st-shadow))" opacity=".28" filter="url(#k-b2)"/><rect x="-5" y="' + (-R - 11) + '" width="10" height="8" rx="2" fill="var(--st-metal-d)"/><circle r="' + (R + 4) + '" fill="url(#k-metal)"/><circle r="' + R + '" fill="url(#k-paper)"/><circle r="' + R + '" fill="url(#k-hi-tl)"/>';
    for (var i = 0; i < 12; i++) s += '<path d="M0 ' + (-R + 2.5) + 'L0 ' + (-R + (i % 3 ? 5 : 7.5)) + '" transform="rotate(' + i * 30 + ')" stroke="var(--st-ink)" stroke-width="' + (i % 3 ? 1 : 1.6) + '" stroke-linecap="round"/>';
    var arc = 'M0 ' + (-R + 4) + 'A' + (R - 4) + ' ' + (R - 4) + ' 0 0 1 ' + n2((R - 4) * Math.sin(Math.PI / 3)) + ' ' + n2(-(R - 4) * Math.cos(Math.PI / 3)) + 'L0 0Z';
    s += c.fade([[0, 1]], '<path d="' + arc + '" fill="var(--st-guide)" opacity=".28"/>', {});
    s += c.anim([{ t: 0, r: 0 }, { t: t0, r: 0 }, { t: t1, r: 60, ease: 'inOut' }], '<path d="M0 3L0 ' + (-R + 6) + '" stroke="var(--st-guide)" stroke-width="2.2" stroke-linecap="round"/>', { pivot: [0, 0], stillT: t1 });
    s += '<circle r="2.4" fill="var(--st-ink)"/>';
    return s;
  }

  stage.define('s-br-time', {
    dur: 13,
    phases: [
      { at: 0, cap: ['Find a quiet, private moment', 'Valitse rauhallinen, yksityinen hetki', 'Hitta en lugn, privat stund'] },
      { at: 3, cap: ['In bed, in the shower or when you get dressed', 'Sängyssä, suihkussa tai pukeutuessa', 'I sängen, i duschen eller när du klär på dig'] },
      { at: 6.4, cap: ['A few minutes is enough', 'Muutama minuutti riittää', 'Några minuter räcker'] },
      { at: 9, cap: ['If you have periods, check just after one ends, when breasts are softest', 'Jos sinulla on kuukautiset, tarkista heti niiden jälkeen, kun rinnat ovat pehmeimmillään', 'Om du har mens: kontrollera strax efter att den tagit slut, när brösten är som mjukast'] }
    ],
    desc: [
      'Three calm moments side by side: in bed in the evening, in the shower, and getting dressed. Each lights up in turn. A stopwatch shows that a few minutes is enough. A calendar shows the period days in red and the days just after the period ends ringed, which is the best time to check because the breasts are softest. Nothing is diagnosed here.',
      'Kolme rauhallista hetkeä vierekkäin: sängyssä illalla, suihkussa ja pukeutuessa. Ne valaistuvat vuorotellen. Sekuntikello näyttää, että muutama minuutti riittää. Kalenterissa kuukautispäivät ovat punaisella ja kuukautisten loppumista seuraavat päivät on ympyröity: silloin rinnat ovat pehmeimmillään. Mitään ei diagnosoida.',
      'Tre lugna stunder bredvid varandra: i sängen på kvällen, i duschen och när man klär på sig. De lyser upp i tur och ordning. Ett stoppur visar att några minuter räcker. Kalendern visar mensdagarna i rött och dagarna strax efter mensen ringade, då brösten är som mjukast. Ingenting diagnostiseras här.'
    ],
    draw: function (c) {
      var s = '', still = c.still;
      s += K.room({ kind: 'wall', w: 360, h: 300 });
      var PW = 110, PH = 120, PY = 14, PX = [10, 125, 240];
      var heads = [tr('In bed', 'Sängyssä', 'I sängen'), tr('In the shower', 'Suihkussa', 'I duschen'), tr('Dressing', 'Pukeutuessa', 'Påklädning')];
      var pans = [brPBed(c), brPShower(c), brPDress(c)], i;
      /* the panels dim a little while another one is the focus */
      for (i = 0; i < 3; i++) {
        var keys = still ? [[0, 1]] : [[0, 1], [3, 1], [3.4, i === 0 ? 1 : .55], [4.6, i === 0 ? 1 : .55], [5, i === 1 ? 1 : .55], [5.6, i === 1 ? 1 : .55], [5.9, i === 2 ? 1 : .55], [6.3, .55], [6.8, 1], [13, 1]];
        if (!still) { keys = [[0, 1], [3, 1], [3.4, i === 0 ? 1 : .5], [4.3, i === 0 ? 1 : .5], [4.5, i === 1 ? 1 : .5], [5.2, i === 1 ? 1 : .5], [5.4, i === 2 ? 1 : .5], [6.1, i === 2 ? 1 : .5], [6.5, 1], [13, 1]]; }
        s += c.fade(keys, brPanel(c, 'p' + i, PX[i], PY, PW, PH, 14, pans[i]));
        /* the title under each panel */
        s += c.show(0, 13, '<g class="st-call">' + brTag(heads[i], PX[i] + PW / 2, PY + PH + 14, { size: 12.5 }) + '</g>', { hold: true, fadeIn: .5 });
      }
      /* the ring that marks the moment that is in focus */
      for (i = 0; i < 3; i++) {
        var a = 3.3 + i * 1.5, b = a + 1.5;
        s += c.show(a, b, '<path d="' + K.rr(PX[i] - 3, PY - 3, PW + 6, PH + 6, 16) + '" class="st-ring" style="stroke-width:3"/>', { fade: .25, still: false });
      }
      if (still) s += '<g opacity=".0"></g>';
      s += c.marker(0, 22, 26, 11) + c.marker(1, 137, 26, 11);

      /* the calendar: the period days in red, the days just after it ringed */
      var CX = 10, CY = 172, CW = 176, CH = 112, hd = 24;
      var cal = K.calendar({ x: 0, y: 0, w: CW, h: CH, month: tr('Month', 'Kuukausi', 'Månad'), marks: [] });
      var cell = function (k) { return [9 + (k % 7) * ((CW - 18) / 6), hd + 12 + Math.floor(k / 7) * ((CH - hd - 18) / 3)]; };
      var per = '', chk = '', k;
      for (k = 0; k < 4; k++) { var p = cell(k); per += '<circle cx="' + n2(p[0]) + '" cy="' + n2(p[1]) + '" r="5.6" fill="#C8434B"/><circle cx="' + n2(p[0] - 1.6) + '" cy="' + n2(p[1] - 1.8) + '" r="1.7" fill="#fff" opacity=".45"/>'; }
      var p0 = cell(4), p1 = cell(6);
      chk += '<path d="' + K.rr(p0[0] - 10, p0[1] - 10, p1[0] - p0[0] + 20, 20, 10) + '" fill="var(--st-guide)" fill-opacity=".16" class="st-ring" style="stroke-width:2"/>';
      for (k = 4; k < 7; k++) { var q = cell(k); chk += '<circle cx="' + n2(q[0]) + '" cy="' + n2(q[1]) + '" r="3.4" fill="var(--st-guide)"/>'; }
      s += c.fade(still ? [[0, 1]] : [[0, .45], [6.2, .45], [7.2, 1], [13, 1]], brAt(CX, CY, cal + per));
      s += c.show(7.6, 13, c.pulse(7.8, 13, brAt(CX, CY, chk), { count: 4, scale: 1.04 }), { fadeIn: .4, hold: true });
      s += c.marker(3, CX + 14, CY - 10, 11);
      /* labels of the calendar */
      var leg = '<g class="st-call">' + brTag(tr('Period', 'Kuukautiset', 'Mens'), 280, 186, { size: 12.5 }) + '<circle cx="214" cy="186" r="6" fill="#C8434B"/>' +
        brTag(tr('Check now', 'Tarkista nyt', 'Kolla nu'), 280, 214, { size: 12.5 }) + '<circle cx="214" cy="214" r="6" fill="var(--st-guide)"/></g>';
      s += c.fade(still ? [[0, 1]] : [[0, 0], [7, 0], [8, 1], [13, 1]], leg);
      /* the stopwatch: a few minutes */
      s += c.fade(still ? [[0, 1]] : [[0, .5], [6.3, .5], [6.8, 1], [9, 1], [9.4, .55], [13, .55]], brAt(316, 262, brStopwatch(c, 6.6, 8.8)));
      s += '<g class="st-call">' + brTag(tr('5 min', '5 min', '5 min'), 244, 262, { size: 12 }) + '</g>';
      s += c.marker(2, 288, 240, 11);
      return s;
    }
  });

  /* ================================================================================================================
     2. s-br-look: at the mirror, arms by the sides, then a slow turn to each side.
     ================================================================================================================ */
  var COL = 291;                 /* the centre of the column to the right of the mirror */
  function brArmsDown(c) { return brArm(c, -1, [{ t: 0, r: 9 }], [{ t: 0, r: -7 }]) + brArm(c, 1, [{ t: 0, r: 9 }], [{ t: 0, r: -7 }]); }
  /* the figure in the glass: a group that stands where ST says (body coordinates inside) */
  function brStand(inner) { return '<g transform="translate(' + ST.x + ' ' + ST.y + ') scale(' + ST.s + ')">' + inner + '</g>'; }
  /* a lens that shows the side view, cropped to the chest */
  function brSideLens(x, y, r, o) {
    o = o || {};
    var body = '<g transform="translate(-26 -22) scale(.5)">' + (o.use ? '<use href="#' + o.use + '"/>' : brSideFig({ arm: o.arm, up: o.up })) + '</g>';
    return K.lens(x, y, r, '<rect x="' + -r + '" y="' + -r + '" width="' + 2 * r + '" height="' + 2 * r + '" fill="url(#k-wall)"/>' + body, { target: o.target });
  }

  stage.define('s-br-look', {
    dur: 14,
    phases: [
      { at: 0, cap: ['Stand at a mirror with your arms relaxed by your sides', 'Seiso peilin edessä, kädet rentoina sivuilla', 'Stå vid en spegel med armarna avslappnade längs sidorna'] },
      { at: 2.8, cap: ['Look at the size and shape of each breast', 'Katso kummankin rinnan kokoa ja muotoa', 'Titta på storleken och formen på varje bröst'] },
      { at: 5.8, cap: ['Look at the skin and the nipple: rash, colour change or sores', 'Katso ihoa ja nänniä: ihottuma, värimuutos tai haavaumat', 'Titta på huden och bröstvårtan: utslag, färgförändring eller sår'] },
      { at: 8.4, cap: ['Turn slowly and look from each side', 'Käänny hitaasti ja katso kummaltakin sivulta', 'Vrid dig långsamt och titta från varje sida'] }
    ],
    desc: [
      'A woman stands at a bathroom mirror, seen from the front, with her arms relaxed by her sides. A soft light sweeps over each breast to show its size and shape. Rings then mark the skin and each nipple, the things to look at for a rash, a colour change or sores. Finally she turns slowly to each side so that both profiles can be seen. Any change is worth showing to a doctor.',
      'Nainen seisoo kylpyhuoneen peilin edessä, kuvattuna edestä, kädet rentoina sivuilla. Pehmeä valo pyyhkäisee kummankin rinnan yli ja näyttää koon ja muodon. Renkaat merkitsevät ihon ja kummankin nännin: niistä katsotaan ihottumaa, värimuutosta tai haavaumia. Lopuksi hän kääntyy hitaasti kummallekin sivulle, jotta molemmat profiilit näkyvät. Jokainen muutos kannattaa näyttää lääkärille.',
      'En kvinna står framför en badrumsspegel, sedd framifrån, med armarna avslappnade längs sidorna. Ett mjukt ljus sveper över varje bröst och visar storlek och form. Ringar markerar sedan huden och varje bröstvårta: titta efter utslag, färgförändring eller sår. Till sist vrider hon sig långsamt åt varje sida så att båda profilerna syns. Varje förändring är värd att visa för en läkare.'
    ],
    draw: function (c) {
      brUse(102, 127, .8);
      var s = '', still = c.still, f = brHeadBack() + brTorso() + brArmsDown(c) + brHeadFront(), sid = c.id('side');
      c.defs('<g id="' + sid + '">' + brSideFig() + '</g>');
      var body = '';
      if (still) body += f;
      else {
        body += c.anim([{ t: 0, sx: 1, o: 1 }, { t: 8.4, sx: 1, o: 1 }, { t: 9.5, sx: .5, o: 0 }, { t: 13.1, sx: .5, o: 0 }, { t: 13.9, sx: 1, o: 1 }], f, { pivot: [0, 0] });
        var sd = '<g transform="translate(-9 0)"><use href="#' + sid + '"/></g>';
        body += c.anim([{ t: 0, sx: .5, o: 0 }, { t: 8.6, sx: .5, o: 0 }, { t: 9.7, sx: 1, o: 1 }, { t: 10.6, sx: 1, o: 1 }, { t: 11.3, sx: .5, o: 0 }], sd, { pivot: [0, 0] });
        body += c.anim([{ t: 0, sx: -.5, o: 0 }, { t: 10.8, sx: -.5, o: 0 }, { t: 11.7, sx: -1, o: 1 }, { t: 12.5, sx: -1, o: 1 }, { t: 13.2, sx: -.5, o: 0 }], sd, { pivot: [0, 0] });
      }
      /* what the mirror shows: the light sweep and the rings are in body coordinates, inside the same group */
      var over = brSweep(c, 3.1, 5.3);
      over += c.show(2.9, 5.7, c.pulse(3, 5.6, '<ellipse cx="-36" cy="58" rx="33" ry="31" class="st-ring-dash"/><ellipse cx="36" cy="58" rx="33" ry="31" class="st-ring-dash"/>', { count: 2, scale: 1.03 }), { fade: .3 });
      over += c.show(5.9, 8.3, '<ellipse cx="0" cy="12" rx="62" ry="22" class="st-ring-dash" transform="rotate(-1)"/>' + c.pulse(6.1, 8.3, K.ring(-37, 61.5, 9) + K.ring(37, 61.5, 9), { count: 3, scale: 1.18 }), { fade: .3 });
      s += brBath(brStand(body + over));
      /* the callouts in the column; the targets are on the picture-right breast */
      var tn = brMap([37, 61.5]), tb = brMap([52, 78]), tk = brMap([30, 8]);
      s += c.phaseShow(1, K.callout(tr('Size and shape\nof each breast', 'Rintojen koko\nja muoto', 'Brösten storlek\noch form'), [COL, 62], tb, { align: 'middle' }) + c.marker(1, COL - 56, 40, 11), { fade: .3 });
      s += c.phaseShow(2, K.callout(tr('Skin: rash,\ncolour change,\nsores', 'Iho: ihottuma,\nvärimuutos,\nhaavat', 'Hud: utslag,\nfärgförändring,\nsår'), [COL, 124], tk, { align: 'middle' }) + K.callout(tr('The nipples', 'Nännit', 'Bröstvårtorna'), [COL, 182], tn, { align: 'middle' }) + c.marker(2, COL - 56, 100, 11), { fade: .3 });
      s += c.marker(0, 36, 36, 11);
      if (still) {
        s += brSideLens(259, 232, 32, { use: sid }) + K.place({ x: 652, y: 0, sx: -1 }, brSideLens(326, 232, 32, { use: sid }));
        s += K.callout(tr('From each side', 'Kummaltakin\nsivulta', 'Från varje sida'), [292, 280], null, { align: 'middle', size: 12 }) + c.marker(3, 228, 206, 11);
      } else {
        s += c.phaseShow(3, K.callout(tr('Turn slowly to\neach side', 'Käänny hitaasti\nkummallekin sivulle', 'Vrid dig långsamt\nåt varje sida'), [COL, 236], null, { align: 'middle' }) +
          '<g transform="translate(' + (COL - 34) + ' 196)"><path d="M-8 6A24 8 0 0 1 56 6" class="st-arrow" fill="none"/><path d="M56 6l-7-5M56 6l-7 6" class="st-arrow"/></g>' + c.marker(3, COL - 56, 214, 11), { fade: .3 });
      }
      return s;
    }
  });

  /* ================================================================================================================
     3. s-br-up: arms raised above the head, hold, lower. The skin under each breast comes into view.
     ================================================================================================================ */
  var UP1 = 148, UP2 = 93;            /* the shoulder and the elbow, degrees */
  function brSideArm(c, k1, k2) {
    var S = [-6, 14], E = [-6, 118], W = [-6, 210];
    var fore = K.limb(E, W, 29, 19.5, { bulge: .1 }) + '<circle cx="-6" cy="118" r="14.5" fill="url(#k-skin-dome)"/>' + K.place({ x: -6, y: 210 }, brHandLite(1));
    return c.anim(k1, K.limb(S, E, 38, 29, { bulge: .06 }) + c.anim(k2, fore, { pivot: E }), { pivot: S }) + '<circle cx="-4" cy="12" r="19" fill="url(#k-bdome)"/>';
  }
  /* the breast and the skin under it: lifts when the arms go up (lens content, centred on the breast) */
  function brLiftView(c, tUp, tDown) {
    var s = '';
    s += '<rect x="-70" y="-70" width="140" height="140" fill="url(#k-skin-v)"/><rect x="-70" y="-70" width="140" height="140" fill="url(#k-sh-edge-h)" opacity=".4"/>';
    s += K.skinPatch({ x: -70, y: -70, w: 140, h: 140, r: 0, seed: 14, lite: true });
    /* ribs under the breast */
    [34, 46, 58].forEach(function (y, i) { s += '<path d="M-70 ' + (y + 2) + 'C-30 ' + (y + 12) + ' 30 ' + (y + 12) + ' 70 ' + (y + 2) + '" class="st-crease" stroke-width="1.2" stroke-opacity="' + (.22 - i * .05) + '"/>'; });
    /* the shade under the breast shrinks when it lifts */
    s += c.fade(c.still ? [[0, 0]] : [[0, 1], [tUp, 1], [tUp + 1.2, 0], [tDown, 0], [tDown + 1, 1], [13, 1]], '<ellipse cx="0" cy="26" rx="44" ry="13" fill="url(#k-sh-r)" opacity=".85"/>');
    var br = K.breast(1, { cx: 0, cy: -8, rx: 29, ry: 27 }, { areola: 8, nip: 2.7 });
    s += c.anim([{ t: 0, y: 0 }, { t: tUp, y: 0 }, { t: tUp + 1.4, y: -11 }, { t: tDown, y: -11 }, { t: tDown + 1.2, y: 0 }], br, { stillT: tUp + 1.4 });
    /* where the breast was, and the skin that came into view under it */
    s += c.show(tUp + 1.2, tDown, '<path d="M-29 -8A29 27 0 0 0 29 -8" class="st-ring-dash" style="stroke-width:2.4"/><path d="M-27 14C-14 30 14 30 27 14" fill="none" stroke="var(--st-guide)" stroke-width="7" stroke-linecap="round" opacity=".16"/>' + K.arrow(0, 52, 0, 34, { head: 6 }), { fade: .35 });
    return s;
  }

  stage.define('s-br-up', {
    dur: 13,
    phases: [
      { at: 0, cap: ['Raise both arms above your head', 'Nosta molemmat kädet pään yläpuolelle', 'Lyft båda armarna ovanför huvudet'] },
      { at: 3.2, cap: ['Hold, and look at the skin under each breast', 'Pidä käsiä ylhäällä ja katso ihoa kummankin rinnan alla', 'Håll kvar och titta på huden under varje bröst'] },
      { at: 6.6, cap: ['Turn and look from each side: any change in size or shape?', 'Käänny ja katso sivuilta: onko koossa tai muodossa muutosta?', 'Vrid dig och titta från sidorna: någon förändring i storlek eller form?'] },
      { at: 10.2, cap: ['Lower your arms and relax', 'Laske kädet ja rentoudu', 'Sänk armarna och slappna av'] }
    ],
    desc: [
      'The woman at the mirror raises both arms above her head, with her hands behind the head, and holds them there. The breasts lift slightly, so the skin under each breast comes into view. A magnified inset shows the fold under the breast. She then turns to the side, still with her arms up, to look for any change in size or shape, and finally lowers her arms. Any change is worth showing to a doctor.',
      'Nainen peilin edessä nostaa molemmat kädet pään yläpuolelle, kädet niskan takana, ja pitää ne siinä. Rinnat nousevat hieman, jolloin kummankin rinnan alla oleva iho tulee näkyviin. Suurennettu kuva näyttää rinnan alla olevan poimun. Sitten hän kääntyy sivulle kädet edelleen ylhäällä ja katsoo, onko koossa tai muodossa muutosta, ja laskee lopuksi kädet. Jokainen muutos kannattaa näyttää lääkärille.',
      'Kvinnan vid spegeln lyfter båda armarna ovanför huvudet, med händerna bakom huvudet, och håller dem där. Brösten lyfter sig något så att huden under varje bröst syns. En förstoring visar vecket under bröstet. Sedan vrider hon sig åt sidan med armarna uppe för att titta efter förändringar i storlek eller form, och sänker till sist armarna. Varje förändring är värd att visa för en läkare.'
    ],
    draw: function (c) {
      brUse(102, 127, .8);
      var s = '', still = c.still, tU = 1.0, tD = 3.0, tL = 9.6;
      var arms = '', o = { stillT: 6, hand: 'open' };
      [-1, 1].forEach(function (sd) {
        var a = brIK(sd, [sd * 58, -124], sd);
        arms += brArm(c, sd, [{ t: 0, r: 0 }, { t: tU, r: 0 }, { t: tD, r: a[0] }, { t: tL, r: a[0] }, { t: 11.6, r: 0 }], [{ t: 0, r: 0 }, { t: tU, r: 0 }, { t: tD, r: a[1] }, { t: tL, r: a[1] }, { t: 11.6, r: 0 }], o);
      });
      var front = brHeadBack() + brTorso() + brHeadFront() + arms;
      var body = '';
      if (still) body = front;
      else {
        body += c.anim([{ t: 0, sx: 1, o: 1 }, { t: 6.6, sx: 1, o: 1 }, { t: 7.6, sx: .5, o: 0 }, { t: 9.9, sx: .5, o: 0 }, { t: 10.4, sx: 1, o: 1 }], front, { pivot: [0, 0] });
        var sk1 = [{ t: 0, r: 0 }, { t: 7.0, r: 0 }, { t: 7.6, r: -UP1 }, { t: 9.7, r: -UP1 }, { t: 10.5, r: 0 }], sk2 = [{ t: 0, r: 0 }, { t: 7.0, r: 0 }, { t: 7.6, r: -70 }, { t: 9.7, r: -70 }, { t: 10.5, r: 0 }];
        var side = '<g transform="translate(-9 0)">' + K.head({ view: 'side', x: -2, y: -41, hair: 'short' }) + K.torso({ view: 'side', form: 'female', len: 178 }) + brSideArm(c, sk1, sk2) + '</g>';
        body += c.anim([{ t: 0, sx: .5, o: 0 }, { t: 6.8, sx: .5, o: 0 }, { t: 7.9, sx: 1, o: 1 }, { t: 9.6, sx: 1, o: 1 }, { t: 10.3, sx: .5, o: 0 }], side, { pivot: [0, 0] });
      }
      s += brBath(brStand(body));
      /* arrows: up while the arms rise, down when they are lowered */
      var up = '<g transform="translate(0 0)">' + K.arrow(38, 50, 38, 14, { head: 7 }) + K.arrow(196, 50, 196, 14, { head: 7 }) + '</g>';
      if (!still) s += c.show(0.6, 3.2, up, { fade: .3 }) + c.show(10.4, 12.8, '<g>' + K.arrow(38, 14, 38, 50, { head: 7 }) + K.arrow(196, 14, 196, 50, { head: 7 }) + '</g>', { fade: .3 });
      else s += up;
      /* the lens: the skin under the breast */
      var tgt = brMap([36, 84]);
      s += c.show(2.6, 6.8, K.lens(COL, 70, 50, brLiftView(c, 3.2, 6.2), { target: tgt }), { fade: .4 });
      s += c.phaseShow(1, K.callout(tr('The skin under\nthe breast', 'Iho rinnan\nalla', 'Huden under\nbröstet'), [COL, 150], null, { align: 'middle' }) + c.marker(1, COL - 56, 148, 11), { fade: .3 });
      s += c.marker(0, 36, 36, 11);
      if (still) {
        s += brSideLens(COL, 236, 36, { up: true }) + K.callout(tr('From the side', 'Sivulta', 'Från sidan'), [COL, 284], null, { align: 'middle', size: 12 }) + c.marker(2, COL - 50, 196, 11);
      } else {
        s += c.phaseShow(2, K.callout(tr('From each side:\nsize and shape', 'Kummaltakin sivulta:\nkoko ja muoto', 'Från varje sida:\nstorlek och form'), [COL, 196], null, { align: 'middle' }) + c.marker(2, COL - 56, 196, 11), { fade: .3 });
      }
      return s;
    }
  });

  /* ================================================================================================================
     4. s-br-hips: hands on the hips, pressed in, shoulders straight. A lens shows what to look for.
     ================================================================================================================ */
  function brDimple(cx, cy) {
    var s = '', i;
    s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="15" ry="12" fill="url(#k-sh-r)" opacity=".7"/><ellipse cx="' + (cx - 1.5) + '" cy="' + (cy - 1.5) + '" rx="7" ry="5.4" fill="url(#k-sh-r)" opacity=".6"/>';
    s += '<path d="M' + (cx + 12) + ' ' + (cy + 4) + 'A14 11 0 0 1 ' + (cx - 2) + ' ' + (cy + 11) + '" fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="2.2" stroke-linecap="round"/>';
    for (i = 0; i < 7; i++) {
      var a = i / 7 * Math.PI * 2 + .5, r0 = 12, r1 = 21 + (i % 3) * 3, cx0 = cx + Math.cos(a) * r0, cy0 = cy + Math.sin(a) * r0 * .82, cx1 = cx + Math.cos(a + .12) * r1, cy1 = cy + Math.sin(a + .12) * r1 * .82;
      s += '<path d="M' + n2(cx0) + ' ' + n2(cy0) + 'Q' + n2((cx0 + cx1) / 2 + 1.5) + ' ' + n2((cy0 + cy1) / 2 - 1) + ' ' + n2(cx1) + ' ' + n2(cy1) + '" class="st-crease" stroke-width="1.1" stroke-opacity=".2"/>';
    }
    return s;
  }
  function brSignView(kind, scale) {
    var s = '<rect x="-70" y="-70" width="140" height="140" fill="url(#k-skin-v)"/><rect x="-70" y="-70" width="140" height="140" fill="url(#k-sh-edge-h)" opacity=".4"/>' + K.skinPatch({ x: -70, y: -70, w: 140, h: 140, r: 0, seed: 21, lite: true });
    var br = '<g transform="scale(' + scale + ')">' + K.breast(1, { cx: 0, cy: 0, rx: 29, ry: 27 }, { areola: 8, nip: 2.7 });
    if (kind === 'dimple') br += brDimple(-8, -9) + '<path d="M-27 -2C-28 -12 -22 -22 -12 -24" fill="none" stroke="#fff" stroke-opacity=".0"/>';
    if (kind === 'inward') br += '<ellipse cx="1" cy="3.5" rx="4.4" ry="3.6" fill="var(--st-sk-d)"/><ellipse cx="1.3" cy="4" rx="3" ry="2.1" fill="rgb(var(--st-shadow))" opacity=".55"/><path d="M-3 3.4Q1 6.6 5 3.4" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/><ellipse cx="1" cy="3.6" rx="9.4" ry="8.4" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".18" stroke-width="1.6"/>';
    if (kind === 'red') br += '<ellipse cx="6" cy="-4" rx="22" ry="17" fill="#D94F4F" opacity=".34" filter="url(#k-b3)"/><ellipse cx="4" cy="-2" rx="12" ry="9" fill="#D94F4F" opacity=".22" filter="url(#k-b2)"/>';
    return s + br + '</g>';
  }

  stage.define('s-br-hips', {
    dur: 13,
    phases: [
      { at: 0, cap: ['Put your hands on your hips', 'Laita kädet lanteille', 'Lägg händerna på höfterna'] },
      { at: 2.8, cap: ['Press firmly into your hips so your chest muscles tighten, shoulders straight', 'Paina lujasti lantioita, jolloin rintalihakset jännittyvät, hartiat suorina', 'Tryck hårt mot höfterna så att bröstmusklerna spänns, axlarna raka'] },
      { at: 5.8, cap: ['Look for dimpling, puckering or bulging skin', 'Katso, onko iholla kuoppia, rypistymiä tai pullistumia', 'Titta efter gropar, indragningar eller utbuktningar i huden'] },
      { at: 9.2, cap: ['Look for a nipple that has moved or turned inwards, and for redness or swelling', 'Katso, onko nippa siirtynyt tai kääntynyt sisäänpäin, tai onko punoitusta tai turvotusta', 'Titta efter en bröstvårta som flyttat sig eller dragits inåt, samt rodnad eller svullnad'] }
    ],
    desc: [
      'The woman at the mirror puts her hands on her hips and presses firmly inwards so that the chest muscles tighten, keeping her shoulders level. A magnified inset then shows, as clearly labelled examples, what to look for in the mirror: dimpling or puckering of the skin, a nipple that has turned inwards, and redness or swelling. The examples are only drawings, not a diagnosis. Any change is worth showing to a doctor.',
      'Nainen peilin edessä laittaa kädet lanteille ja painaa lujasti sisäänpäin niin, että rintalihakset jännittyvät, hartiat tasaisina. Suurennettu kuva näyttää selvästi merkittyinä esimerkkeinä, mitä peilistä katsotaan: ihon kuopat tai rypistymät, sisäänpäin kääntynyt nippa sekä punoitus tai turvotus. Esimerkit ovat vain piirroksia, eivät diagnoosi. Jokainen muutos kannattaa näyttää lääkärille.',
      'Kvinnan vid spegeln lägger händerna på höfterna och trycker hårt inåt så att bröstmusklerna spänns, med axlarna i nivå. En förstoring visar tydligt märkta exempel på vad man tittar efter i spegeln: gropar eller indragningar i huden, en bröstvårta som dragits inåt samt rodnad eller svullnad. Exemplen är bara teckningar, ingen diagnos. Varje förändring är värd att visa för en läkare.'
    ],
    draw: function (c) {
      brUse(102, 121, .74);
      var s = '', still = c.still;
      var arms = '';
      [-1, 1].forEach(function (sd) {
        var a = brIK(sd, [sd * 55, 168], -sd), b = brIK(sd, [sd * 58, 168], -sd);
        arms += brArm(c, sd, [{ t: 0, r: 0 }, { t: .6, r: 0 }, { t: 2.2, r: a[0], ease: 'out' }, { t: 3.4, r: a[0] }, { t: 4.2, r: b[0] }, { t: 5.2, r: b[0] }], [{ t: 0, r: 0 }, { t: .6, r: 0 }, { t: 2.2, r: a[1], ease: 'out' }, { t: 3.4, r: a[1] }, { t: 4.2, r: b[1] }, { t: 5.2, r: b[1] }], { stillT: 5, hand: 'open' });
      });
      var body = brHeadBack() + brTorso() + brHeadFront() + arms;
      /* the chest muscles that tighten: a soft glow and a dashed outline */
      var pec = function (sx) { return '<path d="M' + sx * 6 + ' 8C' + sx * 22 + ' 2 ' + sx * 50 + ' 8 ' + sx * 66 + ' 22C' + sx * 64 + ' 40 ' + sx * 66 + ' 56 ' + sx * 56 + ' 70L' + sx * 6 + ' 70Z" fill="url(#k-hi-r)" opacity=".5"/><path d="M' + sx * 6 + ' 8C' + sx * 22 + ' 2 ' + sx * 50 + ' 8 ' + sx * 66 + ' 22" class="st-ring-dash" style="stroke-width:2.4"/>'; };
      var shoulders = '<path d="M-84 8H84" class="st-ring-dash" style="stroke-width:2.2"/><path d="M-84 3V13M84 3V13" class="st-scale"/>';
      body += c.show(3, 5.8, c.pulse(3.1, 5.7, pec(-1) + pec(1), { count: 2, scale: 1.03 }) + shoulders, { fade: .4 });
      s += brBath(brStand(body));
      /* arrows pressing into the hips */
      var hm = [brMap([-60, 166]), brMap([60, 166])];
      var ar = function (p, d) { return K.arrow(p[0] + d * 26, p[1] + 1, p[0] + d * 7, p[1] + 1, { head: 7 }); };
      s += c.show(2.4, 5.6, c.pulse(2.6, 5.6, ar(hm[0], -1) + ar(hm[1], 1), { count: 3, scale: 1.12 }), { fade: .3 });
      s += c.phaseShow(1, K.callout(tr('Press into\nyour hips', 'Paina lanteisiin', 'Tryck mot\nhöfterna'), [COL, 152], hm[1], { align: 'middle' }) + c.marker(1, COL - 56, 152, 11), { fade: .3 });
      s += c.marker(0, 36, 36, 11);
      /* the lens with the examples, cycling through three signs */
      var views = [['dimple', 5.9, 8.9, tr('Example: dimpling', 'Esimerkki: kuoppa', 'Exempel: grop')], ['inward', 9.3, 11.4, tr('Example: nipple\nturned inwards', 'Esimerkki: nippa\nsisäänpäin', 'Exempel: vårtan\ndragen inåt')], ['red', 11.4, 13, tr('Example: redness', 'Esimerkki: punoitus', 'Exempel: rodnad')]];
      if (still) {
        s += K.lens(COL, 50, 36, brSignView('dimple', 1.2), {});
        s += K.callout(tr('Example:\ndimpling', 'Esimerkki:\nkuoppa', 'Exempel:\ngrop'), [COL, 106], null, { tone: 'warn' });
      } else {
        views.forEach(function (v, i) {
          s += c.show(v[1] - .1, i === 2 ? 13 : v[2], K.lens(COL, 50, 36, brSignView(v[0], 1.2), {}) + K.callout(v[3], [COL, 106], null, { tone: 'warn' }), { fade: .35, hold: i === 2 });
        });
      }
      /* the list of signs: the one that is on show is ringed */
      var items = [[tr('Dimpling or\npuckering', 'Kuoppia tai\nrypistymiä', 'Gropar eller\nindragningar'), 198, 5.8, 9.2], [tr('Nipple moved or\nturned inwards', 'Nippa siirtynyt\ntai sisäänpäin', 'Vårta flyttad\neller indragen'), 240, 9.2, 11.4], [tr('Redness, rash\nor swelling', 'Punoitus tai\nihottuma', 'Rodnad, utslag\neller svullnad'), 280, 11.4, 13]], lst = '';
      items.forEach(function (it, i) {
        lst += K.callout(it[0], [COL + 1, it[1]], null, { align: 'middle', size: 12 });
        if (!still) lst += c.show(it[2], it[3], '<rect x="' + (COL - 66) + '" y="' + (it[1] - 18) + '" width="134" height="36" rx="14" class="st-ring" style="stroke-width:2.4"/>', { fade: .3, hold: i === 2 });
      });
      s += c.fade(still ? [[0, 1]] : [[0, 0], [5.5, 0], [6.1, 1], [13, 1]], lst + c.marker(2, COL - 72, 196, 11));
      return s;
    }
  });

  /* ================================================================================================================
     5. s-br-nipple: a close-up of the nipple and areola, and a strip of the things to look for.
     ================================================================================================================ */
  var NIPC = { cx: -1, cy: -3.5, rx: 29, ry: 27 };      /* a breast whose nipple is at the origin */
  var DROPS = [['#CFE6F1', ['Watery', 'Vetinen', 'Vattnig']], ['#F7F3E8', ['Milky', 'Maitomainen', 'Mjölkaktig']], ['#E7CB52', ['Yellow', 'Keltainen', 'Gul']], ['#B0222C', ['Blood', 'Verta', 'Blod']]];
  function brDropShape(col, sc) {
    return '<g transform="scale(' + sc + ')"><path d="M0 -10C5 -3 7.4 2 7.4 5.4A7.4 7.4 0 0 1 -7.4 5.4C-7.4 2 -5 -3 0 -10Z" fill="' + col + '" stroke="rgb(var(--st-shadow))" stroke-opacity=".35" stroke-width=".8"/><path d="M-3.2 3C-3.4 5.6 -2.2 7.4 -.2 8" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="-2" cy="0" rx="1.3" ry="2.4" fill="#fff" opacity=".6" transform="rotate(14 -2 0)"/></g>';
  }
  /* overlays in breast units (the nipple at the origin, the areola about 8 units across) */
  function brNipOver(kind) {
    var s = '', i;
    if (kind === 'crust') {
      for (i = 0; i < 11; i++) {
        var a = i / 11 * 6.283 + .2, r = 6.6 + (i % 3) * 1.5, x = Math.cos(a) * r, y = Math.sin(a) * r * .92, w = 1.5 + (i % 2) * .8;
        s += '<path d="M' + n2(x - w) + ' ' + n2(y) + 'L' + n2(x - w * .3) + ' ' + n2(y - w * .9) + 'L' + n2(x + w) + ' ' + n2(y - w * .4) + 'L' + n2(x + w * .7) + ' ' + n2(y + w * .7) + 'L' + n2(x - w * .5) + ' ' + n2(y + w * .8) + 'Z" fill="#EBDDBE" stroke="#8A6A40" stroke-opacity=".5" stroke-width=".22"/>';
      }
    }
    if (kind === 'rash') {
      s += '<ellipse cx="0" cy="0" rx="12" ry="11" fill="#D9473F" opacity=".26"/><ellipse cx="0" cy="0" rx="8" ry="7.4" fill="#D9473F" opacity=".22"/>';
      for (i = 0; i < 16; i++) { var b = i * 2.4, rr = 3.5 + (i * 7 % 8); s += '<circle cx="' + n2(Math.cos(b) * rr) + '" cy="' + n2(Math.sin(b) * rr * .9) + '" r=".5" fill="#B8302C" opacity=".6"/>'; }
    }
    if (kind === 'inward') {
      s += '<ellipse cx="0" cy="0" rx="5" ry="4.4" fill="url(#k-areola)"/><ellipse cx="0" cy="0.2" rx="3.6" ry="2.4" fill="rgb(var(--st-shadow))" opacity=".6"/><ellipse cx="-.3" cy="-.4" rx="2.2" ry="1.1" fill="rgb(var(--st-shadow))" opacity=".5"/><path d="M-3.4 .8Q0 3.4 3.4 .8" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".4"/>';
    }
    if (kind === 'fluid') s += '<g transform="translate(0 3.4)">' + brDropShape(DROPS[2][0], .2) + '</g>';
    return s;
  }
  function brNipTile(kind) {
    var s = '<rect width="80" height="88" fill="url(#k-skin-v)"/><rect width="80" height="88" fill="url(#k-sh-edge-h)" opacity=".35"/>';
    s += '<g transform="translate(40 44) scale(2.9)">' + K.breast(1, NIPC, { areola: 8, nip: 2.7 }) + brNipOver(kind) + '</g>';
    return s;
  }

  stage.define('s-br-nipple', {
    dur: 12,
    phases: [
      { at: 0, cap: ['Look closely at each nipple', 'Katso tarkasti kumpaakin nänniä', 'Titta noga på varje bröstvårta'] },
      { at: 2.8, cap: ['Is there any fluid? It can be watery, milky, yellow or blood', 'Tuleeko nestettä? Se voi olla vetistä, maitomaista, keltaista tai verta', 'Kommer det någon vätska? Den kan vara vattnig, mjölkaktig, gul eller blod'] },
      { at: 6.8, cap: ['Look for crusting or a rash on the nipple and the skin around it', 'Katso, onko nännissä tai sen ympärillä rupea tai ihottumaa', 'Titta efter sårskorpor eller utslag på vårtan och huden runt den'] },
      { at: 9.4, cap: ['Look for a nipple that has turned inwards', 'Katso, onko nippa kääntynyt sisäänpäin', 'Titta efter en bröstvårta som dragits inåt'] }
    ],
    desc: [
      'A close-up of a nipple and the darker skin around it, which slowly grows larger. Drops in four colours appear one after another: clear and watery, milky, yellow and blood-red, to show the kinds of fluid to look for. Then flaky crusts and a red rash appear around the nipple, and finally a nipple that has turned inwards. Four small panels below repeat these signs: fluid, crusting, rash and a nipple turned inwards. The pictures are examples only. Any change is worth showing to a doctor.',
      'Lähikuva nännistä ja sitä ympäröivästä tummemmasta ihosta, joka suurenee hitaasti. Neljän värin pisarat ilmestyvät peräkkäin: kirkas ja vetinen, maitomainen, keltainen ja veren punainen, jotta nähdään, millaista nestettä tulee katsoa. Sitten nännin ympärille ilmestyy hilseileviä rupia ja punaista ihottumaa, ja lopuksi sisäänpäin kääntynyt nippa. Neljä pientä kuvaa alla toistaa merkit: neste, rupi, ihottuma ja sisäänpäin kääntynyt nippa. Kuvat ovat vain esimerkkejä. Jokainen muutos kannattaa näyttää lääkärille.',
      'En närbild av en bröstvårta och den mörkare huden runt den, som långsamt blir större. Droppar i fyra färger visas efter varandra: klar och vattnig, mjölkaktig, gul och blodröd, för att visa vilka slags vätska man ska titta efter. Sedan syns fjällande sårskorpor och röda utslag runt vårtan, och till sist en bröstvårta som dragits inåt. Fyra små rutor nedanför upprepar tecknen: vätska, sårskorpa, utslag och en indragen bröstvårta. Bilderna är bara exempel. Varje förändring är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', still = c.still, PW = 336, PH = 156, cx = 150, cy = 70, SC = 4.4;
      var main = '<rect width="' + PW + '" height="' + PH + '" fill="url(#k-skin-v)"/><rect width="' + PW + '" height="' + PH + '" fill="url(#k-sh-edge-h)" opacity=".4"/>' + K.skinPatch({ x: 0, y: 0, w: PW, h: PH, r: 0, seed: 31, lite: true });
      var nip = K.breast(1, NIPC, { areola: 8, nip: 2.7 });
      var inner = nip + c.show(6.9, 9.6, brNipOver('crust') + brNipOver('rash'), { fade: .5, still: true }) + c.show(9.4, 12, brNipOver('inward'), { fade: .5, hold: true, still: false });
      main += '<g transform="translate(' + cx + ' ' + cy + ')">' + c.anim([{ t: 0, s: 2.6 }, { t: 2.6, s: SC, ease: 'out' }], inner, { pivot: [0, 0] }) + '</g>';
      /* the drops of fluid: one colour after another, each swelling at the tip and falling */
      var dr = '';
      DROPS.forEach(function (d, k) {
        var t0 = 3.1 + k * .95;
        dr += c.show(t0, t0 + 1.0, c.anim([{ t: t0, y: 0, s: .25 }, { t: t0 + .35, y: 0, s: 1, ease: 'out' }, { t: t0 + 1.0, y: 36, s: 1, o: 0, ease: 'in' }], '<g transform="translate(0 10)">' + brDropShape(d[0], 1.25) + '</g>', { pivot: [0, 10] }), { fade: .05, still: false });
      });
      if (still) dr += '<g transform="translate(0 18)">' + brDropShape(DROPS[3][0], 1.25) + '</g>';
      main += '<g transform="translate(' + cx + ' ' + (cy + 14) + ')">' + dr + '</g>';
      /* the four colours as a key; the one on show is lit */
      var key = '';
      DROPS.forEach(function (d, k) {
        var y = 32 + k * 30, name = tr(d[1][0], d[1][1], d[1][2]);
        key += '<g transform="translate(' + (PW - 98) + ' ' + (y - 6) + ')"><circle r="12" fill="var(--st-pill)" stroke="var(--st-contour)" stroke-width=".8"/><g transform="translate(0 1)">' + brDropShape(d[0], .85) + '</g></g>';
        key += '<text class="st-lbl-halo" x="' + (PW - 80) + '" y="' + (y - 2) + '" font-size="12">' + A.esc(name) + '</text>';
        if (!still) key += c.show(3.0 + k * .95, 3.9 + k * .95 + .2, '<circle cx="' + (PW - 98) + '" cy="' + (y - 6) + '" r="15" class="st-ring" style="stroke-width:2.4"/>', { fade: .15 });
      });
      main += c.fade(still ? [[0, 1]] : [[0, 0], [2.8, 0], [3.3, 1], [6.5, 1], [7, 0]], '<g class="st-call">' + key + '</g>', {});
      s += K.room({ kind: 'wall', w: 360, h: 300 });
      s += brPanel(c, 'pm', 12, 12, PW, PH, 16, main);
      s += c.show(0.2, 2.8, c.pulse(0.4, 2.8, K.ring(12 + cx, 12 + cy, 36, { dash: true }), { count: 2, scale: 1.1 }), { fade: .3 });
      s += c.marker(0, 32, 32, 11) + c.marker(1, 12 + PW - 100, 32, 11);
      /* the strip of things to look for */
      var tiles = [['fluid', tr('Fluid', 'Neste', 'Vätska')], ['crust', tr('Crusting', 'Rupi', 'Skorpa')], ['rash', tr('Rash', 'Ihottuma', 'Utslag')], ['inward', tr('Turned\ninwards', 'Sisään-\npäin', 'Indragen')]];
      tiles.forEach(function (t, k) {
        var x = 12 + k * 85.3;
        s += brPanel(c, 'pt' + k, x, 176, 80, 88, 12, brNipTile(t[0]));
        s += K.callout(t[1], [x + 40, 276], null, { align: 'middle', size: 12 });
        var a = [[2.8, 6.8], [6.8, 9.4], [6.8, 9.4], [9.4, 12]][k];
        if (!still) s += c.show(a[0], a[1], '<path d="' + K.rr(x - 2, 174, 84, 92, 14) + '" class="st-ring" style="stroke-width:2.6"/>', { fade: .3, hold: k === 3 });
      });
      s += c.marker(2, 24, 188, 11) + c.marker(3, 266, 188, 11);
      return s;
    }
  });

  /* ================================================================================================================
     The person lying on a bed (shared by s-br-lie, s-br-circles and the poster): the kit's 'lying' torso, turned 35 degrees.
     ================================================================================================================ */
  var LP = { x: 128, y: 168, r: -35, s: 1.1 };
  var LT = [45, 52];                     /* the spot on the breast, body coordinates */
  function brLyingBase(c, o) {
    o = o || {};
    var s = K.bed({ w: 360, h: 300 });
    s += K.pillow({ x: 62, y: 74, w: 158, h: 104, r: -35 });
    var sp = K.mapper(LP)([80, 22]);
    if (o.shoulderPillow) s += K.pillow({ x: sp[0] + 6, y: sp[1] + 10, w: 124, h: 92, r: -35 });
    var body = '';
    body += K.head({ x: 0, y: -50, hair: 'fan', layer: 'back' });
    body += K.contact(0, 62, 118, 96, .55);
    body += K.torso({ form: 'female', view: 'lying', len: 128 });
    body += K.arm({ side: 'r', wrist: [24, -84], bend: 1 });
    body += K.head({ x: 0, y: -50, hair: 'fan', eyes: 'closed', layer: 'front' });
    var sheet = 'M-140 104C-100 98 -70 110 -30 104C10 98 40 108 80 102C110 98 130 104 150 100L150 280L-140 280Z';
    body += K.contact(0, 112, 150, 14, .5) + K.cloth(sheet, { kind: 'sheet', fibre: false }) + K.folds(-140, 112, 290, 80, 5, 18, 12);
    return s + K.place(LP, body);
  }
  /* the arm and hand that come in from the flank to the spot (body coordinates) */
  function brLyingHand(o) {
    var T = LT, E = [-86, 117], dx = T[0] - E[0], dy = T[1] - E[1], dl = Math.hypot(dx, dy), W = [T[0] - 62 * dx / dl, T[1] - 62 * dy / dl];
    var oo = { side: 'l', wrist: W, lenU: Math.hypot(E[0] + 70, E[1] - 14), lenF: Math.hypot(W[0] - E[0], W[1] - E[1]), bend: 1, hand: o.hand === 'lite' ? null : (o.hand || 'flat3'), handFlip: false };
    var arm = o.hand === 'lite' ? brArmLite(oo) : K.arm(oo);
    return '<ellipse cx="' + T[0] + '" cy="' + T[1] + '" rx="13" ry="11" fill="var(--st-rd)" opacity=".18"/>' + K.contact(T[0] + 3, T[1] + 4, 24, 14, .55) + arm;
  }

  /* ================================================================================================================
     6. s-br-lie: lying on the back, a pillow under the shoulder, the arm behind the head, the other hand flat on the breast.
     ================================================================================================================ */
  function brProfile(kind) {
    /* a breast seen from the side on the chest wall: standing (a tall dome) or lying (spread out, flat) */
    var h = kind === 'lie' ? 7 : 20, w = kind === 'lie' ? 46 : 34, s = '<rect width="124" height="46" fill="var(--st-lens-bg)"/>';
    s += '<path d="M0 40L124 40L124 46L0 46Z" fill="url(#k-sh-b)"/><path d="M0 38H124" stroke="#C9B9A6" stroke-width="5" stroke-linecap="round" opacity=".5"/>';
    var d = 'M' + (78 - w) + ' 38C' + (78 - w * .6) + ' ' + (38 - h) + ' ' + (78 + w * .6) + ' ' + (38 - h) + ' ' + (78 + w) + ' 38Z';
    s += '<path d="' + d + '" fill="url(#k-skin-dome)"/><path d="' + d + '" class="st-contour" stroke-opacity="1"/>';
    var tis = 'M' + (78 - w * .7) + ' 38C' + (78 - w * .45) + ' ' + (38 - h * .62) + ' ' + (78 + w * .45) + ' ' + (38 - h * .62) + ' ' + (78 + w * .7) + ' 38Z';
    s += '<path d="' + tis + '" fill="#E3868E" opacity=".5"/>';
    return s;
  }
  stage.define('s-br-lie', {
    dur: 12,
    phases: [
      { at: 0, cap: ['Lie flat on your back', 'Makaa selällään', 'Ligg platt på rygg'] },
      { at: 2.6, cap: ['Put the arm on the side you are checking behind your head. A pillow under that shoulder can help', 'Laita tutkittavan puolen käsi pään taakse. Tyyny olkapään alla voi auttaa', 'Lägg armen på den sida du kontrollerar bakom huvudet. En kudde under axeln kan hjälpa'] },
      { at: 5.4, cap: ['Rest your other hand flat on the breast you are checking', 'Laita toinen käsi litteänä tutkittavan rinnan päälle', 'Lägg den andra handen platt på bröstet du kontrollerar'] },
      { at: 8.6, cap: ['Lying down spreads the breast out, so it is easier to feel all of it', 'Selällään rinta levittyy, jolloin sen kaikki osat on helpompi tunnustella', 'När du ligger sprids bröstet ut, så det blir lättare att känna hela'] }
    ],
    desc: [
      'A person lies flat on their back on a bed. The arm on the side being checked is placed behind the head, and a pillow sits under that shoulder, which helps with large breasts. The other hand comes in and rests flat on the breast. Two small side views then compare a standing breast, which is tall, with a breast lying down, which is spread out thin over the chest, so it is easier to feel all of it.',
      'Henkilö makaa selällään sängyllä. Tutkittavan puolen käsi on pään takana ja olkapään alla on tyyny, mikä auttaa suurien rintojen kanssa. Toinen käsi tulee ja asettuu litteänä rinnan päälle. Kaksi pientä sivukuvaa vertaa seisovaa, korkeaa rintaa makuulla olevaan, ohueksi levinneeseen rintaan, jota on helpompi tunnustella kokonaan.',
      'En person ligger platt på rygg i en säng. Armen på den sida som kontrolleras ligger bakom huvudet och en kudde ligger under axeln, vilket hjälper vid stora bröst. Den andra handen kommer in och vilar platt på bröstet. Två små sidobilder jämför ett stående bröst, som är högt, med ett liggande bröst som sprids tunt över bröstkorgen, så att det är lättare att känna hela.'
    ],
    draw: function (c) {
      var s = '', still = c.still, M = K.mapper(LP);
      s += brLyingBase(c, { shoulderPillow: true });
      /* the other hand arrives and rests flat */
      var keys = [{ t: 0, x: -157, y: 79 }, { t: 5.0, x: -157, y: 79 }, { t: 6.8, x: 0, y: 0, ease: 'out' }, { t: 11.6, x: 0, y: 0 }, { t: 11.9, x: -157, y: 79 }];
      s += K.place(LP, c.show(4.9, 11.9, c.anim(keys, brLyingHand({ hand: 'open' }), { stillT: 7 }), { fade: .5 }));
      var Tw = M([LT[0] + 4, LT[1] + 2]);
      /* spreading: small arrows going out from the breast */
      var sp = '';
      [[-.7, .7], [0, 1], [-1, 0], [.5, .9]].forEach(function (d) { var p = M([LT[0] + d[0] * 36 - 4, LT[1] + d[1] * 30]), q = M([LT[0] + d[0] * 52 - 4, LT[1] + d[1] * 43]); sp += K.arrow(p[0], p[1], q[0], q[1], { head: 5 }); });
      s += c.show(8.7, 12, c.pulse(8.8, 12, sp, { count: 3, scale: 1.1 }), { fade: .4 });
      /* callouts */
      var cl = '';
      cl += c.phaseShow(0, K.callout(tr('Lie flat,\non your back', 'Makaa\nselällään', 'Ligg platt\npå rygg'), [70, 22], null, { align: 'middle' }) + c.marker(0, 22, 22, 11), { fade: .35 });
      cl += c.phaseShow(1, K.callout(tr('Arm behind\nyour head', 'Käsi pään\ntaakse', 'Armen bakom\nhuvudet'), [300, 30], M([112, -84]), { align: 'middle' }) + K.callout(tr('Pillow under\nthe shoulder', 'Tyyny olkapään\nalla', 'Kudde under\naxeln'), [300, 100], M([112, 44]), { align: 'middle' }) + c.marker(1, 242, 30, 11), { fade: .35 });
      cl += c.phaseShow(2, K.callout(tr('Other hand flat\non the breast', 'Toinen käsi\nlitteänä rinnalla', 'Andra handen\nplatt på bröstet'), [110, 258], [Tw[0] + 6, Tw[1] + 8], { align: 'middle' }) + c.marker(2, 36, 258, 11), { fade: .35 });
      s += cl;
      /* the two small side views */
      var cp = '';
      cp += brPanel(c, 'ca', 226, 150, 124, 46, 10, brProfile('stand')) + brPanel(c, 'cb', 226, 202, 124, 46, 10, brProfile('lie'));
      cp += '<g class="st-call"><text class="st-lbl-halo" x="234" y="166" font-size="12">' + A.esc(tr('Standing', 'Seisten', 'Stående')) + '</text><text class="st-lbl-halo" x="234" y="218" font-size="12">' + A.esc(tr('Lying down', 'Makuulla', 'Liggande')) + '</text></g>';
      cp += c.marker(3, 238, 266, 11);
      s += c.fade(still ? [[0, 1]] : [[0, 0], [8.4, 0], [9, 1], [13, 1]], cp);
      return s;
    }
  });

  /* ================================================================================================================
     7. s-br-circles: three flat finger pads in small coin-sized circles (the kit's exemplar, on the same bed as s-br-lie).
     ================================================================================================================ */
  var CIRCLE_R = 5, LAPS = 4;
  function brCirclePath(cx, cy, r) { return 'M' + (cx + r) + ' ' + cy + 'A' + r + ' ' + r + ' 0 1 1 ' + (cx - r) + ' ' + cy + 'A' + r + ' ' + r + ' 0 1 1 ' + (cx + r) + ' ' + cy; }
  stage.define('s-br-circles', {
    dur: 13,
    phases: [
      { at: 0, cap: ['Lie on your back, the arm on that side behind your head', 'Makaa selällään, tutkittavan puolen käsi pään taakse', 'Ligg på rygg, armen på den sidan bakom huvudet'] },
      { at: 3.2, cap: ['Use flat finger pads, held together', 'Käytä litteitä sormenpäitä yhdessä', 'Använd platta fingertoppar, tätt ihop'] },
      { at: 6, cap: ['Press in small circles, about the size of a coin (2.5 cm)', 'Paina pienin ympyröin, noin kolikon kokoisina (2,5 cm)', 'Tryck i små cirklar, ungefär stora som ett mynt (2,5 cm)'] },
      { at: 10.4, cap: ['Right hand on the left breast, then swap hands', 'Oikea käsi vasemmalle rinnalle, sitten vaihda kättä', 'Höger hand på vänster bröst, byt sedan hand'] }
    ],
    desc: [
      'A person lies on their back on a bed, one arm behind the head. The other hand lies flat on the breast with three finger pads together and moves in small circles about the size of a coin. A magnified inset shows the pads and the 2.5 centimetre circle. Then the hands swap sides. A change you find is worth showing to a doctor.',
      'Henkilö makaa selällään sängyllä, toinen käsi pään takana. Toinen käsi on litteänä rinnan päällä, kolme sormenpäätä yhdessä, ja liikkuu pienin kolikon kokoisin ympyröin. Suurennettu kuva näyttää sormenpäät ja 2,5 sentin ympyrän. Sitten kädet vaihdetaan. Löydös on syytä näyttää lääkärille.',
      'En person ligger på rygg i en säng med ena armen bakom huvudet. Den andra handen ligger platt på bröstet med tre fingertoppar tätt ihop och rör sig i små cirklar stora som ett mynt. En förstoring visar topparna och cirkeln på 2,5 centimeter. Sedan byter händerna sida. En förändring är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', T = LT, R = CIRCLE_R, M = K.mapper(LP), Tw = M(T);
      s += brLyingBase(c, {});
      var hand = c.show(3.1, 12.6, c.anim([{ t: 0, x: -157, y: 79 }, { t: 3.2, x: -157, y: 79 }, { t: 5.6, x: 0, y: 0, ease: 'out' }, { t: 10.4, x: 0, y: 0, ease: 'inOut' }, { t: 12.4, x: -70, y: 34 }], c.orbit(0, 0, R, 6, 10.2, LAPS, brLyingHand({ hand: 'flat3' })), { stillT: 5.8 }), { fade: .5 });
      var tr_ = c.show(5.6, 10.4, c.pulse(5.6, 10.4, K.ring(T[0], T[1], R + 5.4, { dash: true }), { count: 3, scale: 1.06 }), { fade: .3 });
      tr_ += K.trail(c, brCirclePath(T[0], T[1], R), 6, 10.2, { repeat: LAPS, until: 10.6, tipR: 4.6, orbit: [T[0], T[1], R] });
      s += K.place(LP, hand) + K.place(LP, tr_);
      /* the lens: the pads magnified, with the 2.5 cm circle */
      var Z = 4.0, lens = K.skinPatch({ x: -60, y: -60, w: 120, h: 120, r: 0, seed: 8 });
      lens += '<circle cx="0" cy="0" r="' + (R * Z) + '" fill="none" class="st-ring-dash"/>';
      var pads = '';
      [-1, 0, 1].forEach(function (i) {
        pads += '<ellipse cx="' + (i * 27) + '" cy="4" rx="14.5" ry="18" fill="url(#k-skin-dome)"/><ellipse cx="' + (i * 27) + '" cy="4" rx="14.5" ry="18" class="st-contour"/>' +
          '<ellipse cx="' + (i * 27 - 3) + '" cy="-3" rx="6" ry="8" fill="url(#k-hi-r)" opacity=".55"/><path d="M' + (i * 27 - 9) + ' 9q9 5 18 0" class="st-crease" stroke-opacity=".3"/>';
      });
      lens += '<ellipse cx="14" cy="34" rx="62" ry="26" fill="url(#k-sh-r-soft)" opacity=".5"/>';
      lens += c.orbit(0, 0, R * Z, 6, 10.2, LAPS, '<g transform="translate(0 -6)"><ellipse cx="0" cy="22" rx="46" ry="26" fill="url(#k-sh-r)" opacity=".5"/>' + pads + '</g>');
      lens += K.scaleBar(-21, 49, 42, '2.5 cm');
      s += c.show(3.1, 12.6, K.lens(292, 84, 54, lens, { target: M([T[0] + 2, T[1] - 2]) }), { fade: .5 });
      var cl = '', RX = 296;
      cl += c.phaseShow(0, K.callout(tr('Arm behind\nyour head', 'Käsi pään\ntaakse', 'Armen bakom\nhuvudet'), [250, 28], M([112, -84]), { align: 'middle' }) + c.marker(0, 205, 28, 11) +
        K.callout(tr('Lie flat, on your back', 'Makaa selällään', 'Ligg platt på rygg'), [92, 262], M([-40, 60]), { align: 'middle' }), { fade: .35 });
      cl += c.phaseShow(1, K.callout(tr('Flat finger pads,\ntogether', 'Litteät sormenpäät\nyhdessä', 'Platta fingertoppar,\ntätt ihop'), [RX, 192], [Tw[0] + 5, Tw[1] + 6], { align: 'middle' }) + c.marker(1, RX - 66, 192, 11), { fade: .35 });
      cl += c.phaseShow(2, K.callout(tr('Small circles,\nabout a coin', 'Pienet ympyrät,\nkolikon kokoiset', 'Små cirklar,\nstora som ett mynt'), [RX, 236], [Tw[0] + 7, Tw[1] - 3], { align: 'middle' }) + c.marker(2, RX - 66, 236, 11), { fade: .35 });
      var swap = '<g transform="translate(214 280)"><path d="M-12 -3a12 12 0 0 1 24 0" class="st-arrow" fill="none"/><path d="M12 -3l-3-5M12 -3l5-3" class="st-arrow"/><path d="M12 3a12 12 0 0 1-24 0" class="st-arrow" fill="none"/><path d="M-12 3l3 5M-12 3l-5 3" class="st-arrow"/></g>';
      cl += c.phaseShow(3, swap + K.callout(tr('Then swap\nhands', 'Sitten vaihda\nkättä', 'Byt sedan\nhand'), [RX + 6, 280], null, { align: 'middle' }) + c.marker(3, 238, 280, 11), { fade: .35 });
      return s + cl;
    }
  });

  /* ================================================================================================================
     8. s-br-press: light, medium and firm pressure, shown as a cross-section of the breast with a depth gauge.
     ================================================================================================================ */
  stage.define('s-br-press', {
    dur: 12,
    phases: [
      { at: 0, cap: ['Light: press just under the skin', 'Kevyt: paina juuri ihon alle', 'Lätt: tryck precis under huden'] },
      { at: 4, cap: ['Medium: press into the middle of the breast', 'Keskitaso: paina rinnan keskiosaan', 'Medel: tryck in i mitten av bröstet'] },
      { at: 8, cap: ['Firm: press deep, until you feel the ribs', 'Napakka: paina syvälle, kunnes tunnet kylkiluut', 'Fast: tryck djupt, tills du känner revbenen'] }
    ],
    desc: [
      'A cross-section of the breast shows the skin, a layer of fat, the gland tissue, the chest muscle and the ribs. A fingertip presses down in three steps: light, just under the skin, medium, into the middle of the breast, and firm, deep down until the ribs can be felt. A depth gauge fills as the finger goes deeper, and a small picture shows where the cross-section is taken. The picture is a simplified drawing.',
      'Rinnan poikkileikkauksessa näkyvät iho, rasvakerros, rauhaskudos, rintalihas ja kylkiluut. Sormenpää painaa alas kolmessa vaiheessa: kevyesti aivan ihon alle, keskitasolla rinnan keskelle ja napakasti syvälle, kunnes kylkiluut tuntuvat. Syvyysmittari täyttyy, kun sormi menee syvemmälle, ja pieni kuva näyttää, mistä poikkileikkaus on otettu. Kuva on yksinkertaistettu piirros.',
      'Ett tvärsnitt av bröstet visar huden, ett fettlager, körtelvävnaden, bröstmuskeln och revbenen. En fingertopp trycker ned i tre steg: lätt, precis under huden, medel, in i mitten av bröstet, och fast, djupt tills revbenen känns. En djupmätare fylls när fingret går djupare, och en liten bild visar var tvärsnittet tas. Bilden är en förenklad teckning.'
    ],
    draw: function (c) {
      var s = '', still = c.still, SX = 108, SY = 34, SW = 110, SH = 220;
      s += K.room({ kind: 'wall', w: 360, h: 300 });
      var D = [0.04, .36, .8];
      var keys = [{ t: 0, depth: 0 }, { t: .8, depth: D[0] }, { t: 3.4, depth: D[0] }, { t: 4.8, depth: D[1], ease: 'soft' }, { t: 7.4, depth: D[1] }, { t: 8.8, depth: D[2], ease: 'soft' }, { t: 11.2, depth: D[2] }, { t: 12, depth: 0 }];
      s += K.section({ x: SX, y: SY, w: SW, h: SH, depth: .8, c: still ? null : c, keys: still ? null : keys, marks: false });
      /* the names of the layers, on the left; the depths, on the right */
      var layers = [[tr('Skin', 'Iho', 'Hud'), .05], [tr('Fat', 'Rasva', 'Fett'), .21], [tr('Gland tissue', 'Rauhaskudos', 'Körtelvävnad'), .48], [tr('Chest muscle', 'Rintalihas', 'Bröstmuskel'), .72], [tr('Ribs', 'Kylkiluut', 'Revben'), .9]];
      layers.forEach(function (l) { var y = SY + l[1] * SH; s += '<g class="st-call"><path d="M' + (SX - 10) + ' ' + y + 'L' + (SX + 6) + ' ' + y + '" class="st-leader"/><text class="st-lbl-halo" x="' + (SX - 14) + '" y="' + (y + 4) + '" text-anchor="end" font-size="12">' + A.esc(l[0]) + '</text></g>'; });
      var dn = [[tr('light', 'kevyt', 'lätt'), .1], [tr('medium', 'keskitaso', 'medel'), .4], [tr('firm', 'napakka', 'fast'), .78]];
      dn.forEach(function (d) { var y = SY + d[1] * SH; s += '<g class="st-call"><path d="M' + (SX + SW + 3) + ' ' + y + 'L' + (SX + SW + 15) + ' ' + y + '" class="st-leader"/><text class="st-lbl-halo" x="' + (SX + SW + 19) + '" y="' + (y + 4) + '" font-size="12">' + A.esc(d[0]) + '</text></g>'; });
      /* the gauge: a track that fills as the finger goes deeper */
      var gx = 334, gy = SY + 4, gh = SH - 8;
      s += '<g class="st-call"><rect class="st-pill" x="' + (gx - 13) + '" y="' + (gy - 14) + '" width="30" height="' + (gh + 28) + '" rx="15"/><rect x="' + (gx - 6) + '" y="' + gy + '" width="16" height="' + gh + '" rx="8" fill="none" stroke="var(--st-guide)" stroke-width="1.6"/></g>';
      var bar = '<rect x="' + (gx - 6) + '" y="' + gy + '" width="16" height="' + gh + '" rx="8" fill="var(--st-guide)" fill-opacity=".85"/>';
      s += still ? '<g class="st-call"><rect x="' + (gx - 6) + '" y="' + gy + '" width="16" height="' + (gh * .8) + '" rx="8" fill="var(--st-guide)" fill-opacity=".85"/></g>' :
        '<g class="st-call">' + c.anim([{ t: 0, sy: 0 }, { t: .8, sy: .08 }, { t: 3.4, sy: .08 }, { t: 4.8, sy: .4 }, { t: 7.4, sy: .4 }, { t: 8.8, sy: .8 }, { t: 11.2, sy: .8 }, { t: 12, sy: 0 }], bar, { pivot: [gx, gy] }) + '</g>';
      s += '<g class="st-call"><text class="st-lbl-halo" x="' + (gx + 2) + '" y="' + (gy + gh + 30) + '" text-anchor="middle" font-size="12">' + A.esc(tr('Depth', 'Syvyys', 'Djup')) + '</text></g>';
      /* where the cross-section is taken: a small breast, the finger and a dashed cut */
      var ins = '<g transform="scale(1.1)"><rect x="-60" y="-60" width="120" height="120" fill="url(#k-skin-v)"/>' + K.breast(1, { cx: 0, cy: 0, rx: 29, ry: 27 }, { areola: 8, nip: 2.7 }) + '</g><path d="M0 -60V60" class="st-ring-dash" style="stroke-width:2.2"/><ellipse cx="0" cy="-14" rx="8" ry="11" fill="url(#k-skin-dome)" stroke="var(--st-contour)"/><ellipse cx="-2" cy="-18" rx="3" ry="4.6" fill="url(#k-hi-r)" opacity=".6"/>';
      s += K.lens(282, 246, 33, ins, {});
      s += c.marker(0, SX + SW - 13, SY + .1 * SH, 10) + c.marker(1, SX + SW - 13, SY + .4 * SH, 10) + c.marker(2, SX + SW - 13, SY + .78 * SH, 10);
      return s;
    }
  });

  /* ================================================================================================================
     9. s-br-pattern: the whole area, and the "mowing the lawn" path over it. Two small pictures show the other patterns.
     ================================================================================================================ */
  var PT = { x: 112, y: 62, s: 1.12 };
  var ZONE = 'M3 -2C28 -10 52 -6 68 8L73 34L69 74L64 100C44 107 22 105 3 100Z';
  var LAWN = 'M9 0V98H18V0H27V98H36V0H45V98H54V0H63V98';
  function brSpiral(r0, turns) {
    var d = '', i, n = 60;
    for (i = 0; i <= n; i++) { var u = i / n, r = r0 * (1 - u) + 2, a = u * turns * 6.283 - 1.2; d += (i ? 'L' : 'M') + n2(Math.cos(a) * r) + ' ' + n2(Math.sin(a) * r * .94); }
    return d;
  }
  function brPatternLens(kind, c) {
    var s = '<rect x="-40" y="-40" width="80" height="80" fill="url(#k-skin-v)"/><g transform="scale(.8)">' + K.breast(1, NIPC, { areola: 8, nip: 2.7 });
    if (kind === 'ring') s += '<path d="' + brSpiral(32, 3.2) + '" fill="none" stroke="var(--st-guide)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + n2(Math.cos(-1.2 + 3.2 * 6.283) * 34) + '" cy="0" r="0"/>';
    else {
      var a0 = -2.2, a1 = -1.2, R = 32;
      s += '<path d="M0 0L' + n2(Math.cos(a0) * R) + ' ' + n2(Math.sin(a0) * R) + 'A' + R + ' ' + R + ' 0 0 1 ' + n2(Math.cos(a1) * R) + ' ' + n2(Math.sin(a1) * R) + 'Z" fill="var(--st-guide)" fill-opacity=".28"/>';
      [0, 1, 2, 3, 4, 5, 6, 7].forEach(function (i) { var a = i * .785 + .3; s += '<path d="M' + n2(Math.cos(a) * 7) + ' ' + n2(Math.sin(a) * 7) + 'L' + n2(Math.cos(a) * 31) + ' ' + n2(Math.sin(a) * 31) + '" fill="none" stroke="var(--st-guide)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="' + (i === 3 ? '0' : '3 3') + '" opacity="' + (i === 3 ? 1 : .8) + '"/>'; });
      s += '<path d="M0 0L' + n2(Math.cos(-1.7) * R) + ' ' + n2(Math.sin(-1.7) * R) + '" stroke="var(--st-guide)" stroke-width="2.4" stroke-linecap="round"/>';
    }
    return s + '</g>';
  }
  stage.define('s-br-pattern', {
    dur: 14,
    phases: [
      { at: 0, cap: ['Cover the whole area: collarbone to bra line, armpit to breastbone', 'Käy läpi koko alue: soluluusta rintaliivien reunaan, kainalosta rintalastaan', 'Täck hela området: från nyckelbenet till bh-linjen, från armhålan till bröstbenet'] },
      { at: 3.6, cap: ['Move up and down in rows, like mowing a lawn', 'Liiku ylös ja alas riveittäin kuin ruohoa leikaten', 'Rör dig upp och ned i rader, som när man klipper gräs'] },
      { at: 10.6, cap: ['Or use rings or wedges, working out from the nipple', 'Tai käytä kehiä tai siivuja nännistä ulospäin edeten', 'Eller använd ringar eller skivor, med början vid bröstvårtan'] }
    ],
    desc: [
      'The upper body from the front, with the area to check outlined on one breast: from the collarbone down to the bra line, and from the armpit across to the breastbone. A fingertip then travels up and down in neat vertical rows across the whole area, like mowing a lawn, leaving a fading trail. Two small pictures show the other patterns that work as well: rings spiralling in towards the nipple, and wedges working outwards from the nipple. Any lump or change is worth showing to a doctor.',
      'Ylävartalo edestä, ja tutkittava alue on rajattu toisessa rinnassa: soluluusta rintaliivien reunaan ja kainalosta rintalastaan. Sormenpää kulkee sitten ylös ja alas tasaisina pystyriveinä koko alueen yli kuin ruohoa leikaten ja jättää haalenevan jäljen. Kaksi pientä kuvaa näyttää muut toimivat tavat: sisäänpäin kiertyvät kehät ja nännistä ulospäin etenevät siivut. Jokainen kyhmy tai muutos kannattaa näyttää lääkärille.',
      'Överkroppen framifrån, med området som ska kontrolleras markerat på ena bröstet: från nyckelbenet ned till bh-linjen och från armhålan in till bröstbenet. En fingertopp rör sig sedan upp och ned i snygga lodräta rader över hela området, som när man klipper gräs, och lämnar ett bleknande spår. Två små bilder visar de andra mönstren som fungerar lika bra: ringar som spiralar inåt mot bröstvårtan och skivor som arbetar sig utåt från bröstvårtan. Varje knöl eller förändring är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', still = c.still, M = K.mapper(PT);
      s += K.room({ kind: 'wall', w: 360, h: 300 });
      var body = K.torso({ form: 'female', len: 190 });
      body += '<path d="' + ZONE + '" fill="var(--st-guide)" fill-opacity=".1"/>';
      body += c.show(0.2, 14, '<path d="' + ZONE + '" class="st-ring-dash" style="stroke-width:2.4"/>', { fade: .5, hold: true });
      /* the bra line, and the collarbone line */
      body += c.show(0.5, 3.6, '<path d="M-72 104C-40 112 40 112 72 104" class="st-ring-dash" style="stroke-width:1.6;opacity:.7"/>', { fade: .4, still: false });
      body += '<g class="br-lawn">' + K.trail(c, LAWN, 3.8, 10.4, { tipR: 5.4, until: 10.8, stillAt: .55, ease: 'linear' }) + '</g>';
      s += K.place(PT, body);
      var cl = '';
      cl += c.phaseShow(0, K.callout(tr('Collarbone', 'Solisluu', 'Nyckelben'), [292, 36], M([42, -12]), { align: 'middle', size: 12 }) + K.callout(tr('Armpit', 'Kainalo', 'Armhåla'), [296, 80], M([71, 34]), { align: 'middle', size: 12 }) +
        K.callout(tr('Bra line', 'Rintaliivien\nreuna', 'Bh-linjen'), [288, 128], M([46, 103]), { align: 'middle', size: 12 }) + K.callout(tr('Breastbone', 'Rintalasta', 'Bröstben'), [52, 38], M([2, 40]), { align: 'middle', size: 12 }) + c.marker(0, 22, 62, 11), { fade: .35 });
      cl += c.phaseShow(1, K.callout(tr('Rows, up and\ndown, like\nmowing a lawn', 'Rivit ylös\nja alas, kuin\nruohoa leikaten', 'Rader upp och ned\nsom när man\nklipper gräs'), [290, 176], null, { align: 'middle', size: 12 }) + c.marker(1, 226, 150, 11), { fade: .35 });
      s += cl;
      /* the other two patterns */
      var th = brAt(0, 0, K.lens(256, 238, 28, brPatternLens('ring'), {}) + K.lens(322, 238, 28, brPatternLens('wedge'), {}));
      th += K.callout(tr('Rings', 'Kehät', 'Ringar'), [256, 282], null, { size: 12 }) + K.callout(tr('Wedges', 'Siivut', 'Skivor'), [322, 282], null, { size: 12 }) + c.marker(2, 226, 214, 11);
      s += c.fade(still ? [[0, 1]] : [[0, .5], [10, .5], [10.8, 1], [14, 1]], th);
      return s;
    }
  });

  /* ================================================================================================================
     10. s-br-shower: standing in the shower, soapy fingers gliding over the breast, the arm raised, at the side, stretched out, then the other breast.
     ================================================================================================================ */
  var SHW = { x: 124, y: 118, s: .74 };
  function brShowerArms(c) {
    /* the picture-left hand works on the picture-right breast; the picture-right arm goes up, down to the side and out. After the body turns (flips) the same arms feel the other breast. */
    var T = [36, 58], E = [-96, 104], dx = T[0] - E[0], dy = T[1] - E[1], dl = Math.hypot(dx, dy), W = [T[0] - 62 * dx / dl, T[1] - 62 * dy / dl], s = '';
    var up = brIK(1, [58, -124], 1), side = [8, 3], out = [88, 4];
    var k1 = [{ t: 0, r: 0 }, { t: .5, r: 0 }, { t: 1.9, r: up[0] }, { t: 6.0, r: up[0] }, { t: 7.0, r: side[0] }, { t: 8.0, r: side[0] }, { t: 9.0, r: out[0] }, { t: 9.8, r: out[0] }, { t: 10.9, r: up[0] }, { t: 13.4, r: up[0] }, { t: 14, r: 0 }];
    var k2 = [{ t: 0, r: 0 }, { t: .5, r: 0 }, { t: 1.9, r: up[1] }, { t: 6.0, r: up[1] }, { t: 7.0, r: side[1] }, { t: 8.0, r: side[1] }, { t: 9.0, r: out[1] }, { t: 9.8, r: out[1] }, { t: 10.9, r: up[1] }, { t: 13.4, r: up[1] }, { t: 14, r: 0 }];
    s += brArm(c, 1, k1, k2, { stillT: 5 });
    var arm = K.arm({ side: 'l', wrist: W, lenU: Math.hypot(E[0] + 70, E[1] - 14), lenF: Math.hypot(W[0] - E[0], W[1] - E[1]), bend: 1, hand: 'flat3', handFlip: false });
    var press = '<ellipse cx="' + T[0] + '" cy="' + T[1] + '" rx="13" ry="11" fill="var(--st-rd)" opacity=".16"/>' + K.bubbles(T[0] - 20, T[1] - 18, 40, 34, 8, 6);
    var hand = '<g transform="translate(5 0)">' + press + arm + '</g>';
    var keys = [{ t: 0, x: -28, y: 34 }, { t: 2.0, x: -28, y: 34 }, { t: 3.0, x: 0, y: 0, ease: 'out' }, { t: 13.4, x: 0, y: 0 }, { t: 13.9, x: -28, y: 34 }];
    s += c.show(2.0, 13.9, c.anim(keys, c.orbit(-5, 0, 5, 3.2, 9.4, 7, c.orbit(-5, 0, 5, 11.4, 13.2, 3, hand)), { stillT: 5 }), { fade: .5 });
    return { arms: s, T: T };
  }
  stage.define('s-br-shower', {
    dur: 14,
    phases: [
      { at: 0, cap: ['Wet, soapy skin lets your fingers glide', 'Märkä, saippuainen iho auttaa sormia liukumaan', 'Blöt, tvålig hud gör att fingrarna glider lätt'] },
      { at: 2.6, cap: ['Arm raised on the side you check: small circles with soapy fingers', 'Tutkittavan puolen käsi ylhäällä: pieniä ympyröitä saippuaisin sormin', 'Armen lyft på den sida du kontrollerar: små cirklar med tvålade fingrar'] },
      { at: 6.4, cap: ['Repeat with your arm by your side, then stretched out', 'Toista käsi sivulla ja sitten sivulle ojennettuna', 'Upprepa med armen längs sidan och sedan utsträckt'] },
      { at: 10, cap: ['Then feel the other breast the same way', 'Tunnustele sitten toinen rinta samalla tavalla', 'Känn sedan på det andra bröstet på samma sätt'] }
    ],
    desc: [
      'A woman stands in a shower with tiled walls, water running from the shower head and steam rising. One arm is raised behind her head and the fingers of the other hand, covered in soap, glide over the breast in small circles, with soap bubbles on the skin. The raised arm is then lowered to her side and stretched out, and the circles repeat. Finally the arms swap and the other breast is felt in the same way. Any change you feel is worth showing to a doctor.',
      'Nainen seisoo laatoitetussa suihkussa, vesi valuu suihkupäästä ja höyry nousee. Toinen käsi on pään takana ja toisen käden saippuaiset sormet liukuvat rinnan päällä pienin ympyröin, ja iholla on saippuakuplia. Ylhäällä ollut käsi lasketaan sivulle ja ojennetaan sivulle, ja ympyrät toistetaan. Lopuksi kädet vaihtavat paikkaa ja toinen rinta tunnustellaan samalla tavalla. Jokainen tuntemasi muutos kannattaa näyttää lääkärille.',
      'En kvinna står i en duschkabin med kaklade väggar, vattnet rinner från duschhuvudet och ånga stiger. Ena armen är lyft bakom huvudet och fingrarna på den andra handen, täckta av tvål, glider över bröstet i små cirklar, med tvålbubblor på huden. Den lyfta armen sänks sedan längs sidan och sträcks ut, och cirklarna upprepas. Till sist byter armarna plats och det andra bröstet känns på samma sätt. Varje förändring du känner är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', still = c.still;
      s += K.room({ kind: 'bath', w: 360, h: 300 });
      s += '<rect x="0" y="0" width="30" height="300" fill="var(--st-glass)" opacity=".4"/><rect x="28" y="0" width="3" height="300" fill="var(--st-metal)"/><rect x="0" y="0" width="30" height="300" fill="url(#k-streak)" opacity=".6"/>';
      var body = K.head({ x: 0, y: -50, hair: 'bun', layer: 'back' }) + K.torso({ form: 'female', len: 225 }) + K.head({ x: 0, y: -50, hair: 'bun', eyes: 'open', layer: 'front' });
      /* water on the skin */
      body += K.drops(-66, 0, 132, 150, 16, 4);
      var A_ = brShowerArms(c);
      var turned = still ? body + A_.arms : c.anim([{ t: 0, sx: 1 }, { t: 9.9, sx: 1 }, { t: 10.25, sx: .04 }, { t: 10.26, sx: -.04 }, { t: 10.7, sx: -1 }, { t: 13.5, sx: -1 }, { t: 13.85, sx: -.04 }, { t: 13.86, sx: .04 }, { t: 14, sx: 1 }], body + A_.arms, { pivot: [0, 0] });
      s += '<g transform="translate(' + SHW.x + ' ' + SHW.y + ') scale(' + SHW.s + ')">' + turned + '</g>';
      /* shower head and the water, in front of the wall, to the right of the woman */
      s += K.showerHead({ x: 250, y: 24, s: .85, r: -22, c: c, streams: 10, len: 230 });
      var M = K.mapper(SHW), tA = M(A_.T), tB = M([-36, 58]);
      var cl = '';
      cl += c.phaseShow(0, K.callout(tr('Warm water,\nsoapy skin', 'Lämmin vesi,\nsaippuainen iho', 'Varmt vatten,\ntvålig hud'), [300, 186], M([20, 20]), { align: 'middle' }) + c.marker(0, 244, 186, 11), { fade: .35 });
      cl += c.phaseShow(1, K.callout(tr('Small circles,\nsoapy fingers', 'Pieniä ympyröitä,\nsaippuaiset sormet', 'Små cirklar,\ntvålade fingrar'), [300, 240], [tA[0] + 4, tA[1] + 4], { align: 'middle' }) + c.marker(1, 232, 240, 11), { fade: .35 });
      cl += c.phaseShow(2, K.callout(tr('Arm by your side,\nthen stretched out', 'Käsi sivulla,\nsitten ojennettuna', 'Armen längs sidan,\nsedan utsträckt'), [296, 118], null, { align: 'middle' }) + c.marker(2, 222, 118, 11), { fade: .35 });
      cl += c.phaseShow(3, K.callout(tr('Now the other\nbreast', 'Nyt toinen\nrinta', 'Nu det andra\nbröstet'), [56, 270], [tB[0] - 4, tB[1] + 4], { align: 'middle' }) + c.marker(3, 20, 232, 11), { fade: .35 });
      s += cl;
      return s;
    }
  });

  /* ================================================================================================================
     11. s-br-armpit: all around the nipple and over it, then flat fingers sweeping the armpit with the arm raised.
     ================================================================================================================ */
  var AP = { x: 108, y: 114, s: .76 };
  stage.define('s-br-armpit', {
    dur: 14,
    phases: [
      { at: 0, cap: ['Feel all around the nipple', 'Tunnustele nännin ympäristö kauttaaltaan', 'Känn runt hela bröstvårtan'] },
      { at: 4.6, cap: ['Then over the top of it', 'Sitten myös sen päältä', 'Känn sedan över själva vårtan'] },
      { at: 7.4, cap: ['Feel the side of your chest and the armpit: sweep flat fingers up and down', 'Tunnustele rinnan sivu ja kainalo: pyyhkäise litteillä sormilla ylös ja alas', 'Känn på sidan av bröstkorgen och armhålan: svep med platta fingrar upp och ned'] }
    ],
    desc: [
      'A woman stands with the arm on the side being checked raised behind her head. The fingers of her other hand feel all around the nipple in a ring, then over the top of it, while a magnified circle shows the path on the nipple and the dark skin around it. The hand then moves out to the armpit, which is softly highlighted, and sweeps flat fingers up and down over the side of the chest and the armpit. Fluid from the nipple, a nipple turning inwards or a rash is worth showing to a doctor.',
      'Nainen seisoo, tutkittavan puolen käsi pään takana. Toisen käden sormet tunnustelevat nännin ympäristön kehänä ja sitten nännin päältä, ja suurennettu ympyrä näyttää reitin nännin ja sitä ympäröivän tumman ihon päällä. Käsi siirtyy sitten kainaloon, joka korostuu pehmeästi, ja pyyhkäisee litteillä sormilla ylös ja alas rinnan sivulla ja kainalossa. Nännistä tuleva neste, sisäänpäin kääntynyt nippa tai ihottuma kannattaa näyttää lääkärille.',
      'En kvinna står med armen på den sida som kontrolleras lyft bakom huvudet. Fingrarna på den andra handen känner runt hela bröstvårtan i en ring och sedan över själva vårtan, medan en förstorad cirkel visar rörelsen över vårtan och den mörka huden runt den. Handen flyttas sedan ut till armhålan, som lyses upp mjukt, och sveper med platta fingrar upp och ned över sidan av bröstkorgen och armhålan. Vätska från bröstvårtan, en bröstvårta som dras inåt eller utslag är värt att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '', still = c.still, M = K.mapper(AP);
      s += K.room({ kind: 'bath', w: 360, h: 300 });
      var N = [37, 61.5], Ta = [62, 34], E = [-96, 104];
      var body = K.head({ x: 0, y: -50, hair: 'bun', layer: 'back' }) + K.torso({ form: 'female', len: 225 }) + K.head({ x: 0, y: -50, hair: 'bun', eyes: 'open', layer: 'front' });
      /* the armpit, softly lit once the hand gets there */
      body += c.show(7.2, 14, c.pulse(7.4, 14, '<ellipse cx="72" cy="30" rx="20" ry="36" fill="url(#k-hi-r)" opacity=".9"/><ellipse cx="72" cy="30" rx="20" ry="36" class="st-ring-dash"/>', { count: 5, scale: 1.05 }), { fade: .5, hold: true });
      var up = brIK(1, [58, -124], 1);
      body += brArm(c, 1, [{ t: 0, r: 0 }, { t: .4, r: 0 }, { t: 1.6, r: up[0] }], [{ t: 0, r: 0 }, { t: .4, r: 0 }, { t: 1.6, r: up[1] }], { stillT: 3, hand: 'open' });
      /* the working hand: arrives at the nipple, circles round it, circles over it, goes to the armpit and sweeps */
      var dx = Ta[0] - E[0], dy = Ta[1] - E[1], dl = Math.hypot(dx, dy), W = [Ta[0] - 62 * dx / dl, Ta[1] - 62 * dy / dl];
      var arm = K.arm({ side: 'l', wrist: W, lenU: Math.hypot(E[0] + 70, E[1] - 14), lenF: Math.hypot(W[0] - E[0], W[1] - E[1]), bend: 1, hand: 'flat3', handFlip: false });
      var oN = [N[0] - Ta[0], N[1] - Ta[1]], R1 = 12, R2 = 3.4;
      var base = [{ t: 0, x: -60, y: 70 }, { t: 1.2, x: -60, y: 70 }, { t: 2.0, x: oN[0] + R1, y: oN[1], ease: 'out' }, { t: 4.5, x: oN[0] + R1, y: oN[1] }, { t: 5.0, x: oN[0] + R2, y: oN[1], ease: 'inOut' }, { t: 7.0, x: oN[0] + R2, y: oN[1] }, { t: 7.8, x: 0, y: 0, ease: 'inOut' }, { t: 13.2, x: 0, y: 0 }, { t: 13.8, x: -60, y: 70 }];
      var sweep = [{ t: 0, y: 0 }, { t: 8.2, y: 0 }, { t: 8.9, y: -22 }, { t: 9.9, y: 22 }, { t: 10.9, y: -22 }, { t: 11.9, y: 22 }, { t: 12.7, y: 0 }];
      var inner = c.orbit(-R2, 0, R2, 5.2, 6.9, 3, c.anim(sweep, arm, { stillT: 8.9 }));
      body += c.show(1.0, 13.9, c.anim(base, c.orbit(-R1, 0, R1, 2.2, 4.4, 2, inner), { stillT: 8.9 }), { fade: .5 });
      body += K.trail(c, brCirclePath(N[0], N[1], R1), 2.2, 4.4, { repeat: 2, until: 4.8, tipR: 4.6, orbit: [N[0], N[1], R1] });
      body += K.trail(c, brCirclePath(N[0], N[1], R2), 5.2, 6.9, { repeat: 3, until: 7.2, tipR: 3.4, orbit: [N[0], N[1], R2] });
      body += c.show(8.2, 13, '<path d="M72 4L72 58" class="st-trail" style="stroke-dasharray:1 5"/>' + K.arrow(86, 38, 86, 8, { head: 6 }) + K.arrow(86, 22, 86, 52, { head: 6 }), { fade: .4, still: true });
      s += '<g transform="translate(' + AP.x + ' ' + AP.y + ') scale(' + AP.s + ')">' + body + '</g>';
      /* the magnified nipple with the two paths */
      var Z = 2.6, lens = '<rect x="-60" y="-60" width="120" height="120" fill="url(#k-skin-v)"/>' + K.skinPatch({ x: -60, y: -60, w: 120, h: 120, r: 0, seed: 12, lite: true });
      lens += '<g transform="scale(' + Z + ')">' + K.breast(1, NIPC, { areola: 8, nip: 2.7 }) + '</g>';
      lens += c.show(0.6, 4.8, K.trail(c, brCirclePath(0, 0, 25), 2.2, 4.4, { repeat: 2, until: 4.8, tipR: 5.4, orbit: [0, 0, 25] }), { fade: .3, still: true });
      lens += c.show(5.0, 7.4, K.trail(c, brCirclePath(0, 0, 8), 5.2, 6.9, { repeat: 3, until: 7.2, tipR: 4.4, orbit: [0, 0, 8] }), { fade: .3, still: false });
      s += c.fade(still ? [[0, 1]] : [[0, 1], [7.2, 1], [7.8, 0], [13.6, 0], [14, 1]], K.lens(290, 74, 52, lens, { target: M(N) }));
      var cl = '';
      cl += c.phaseShow(0, K.callout(tr('All around\nthe nipple', 'Nännin\nympäri', 'Runt hela\nvårtan'), [290, 150], null, { align: 'middle' }) + c.marker(0, 232, 150, 11), { fade: .35 });
      cl += c.phaseShow(1, K.callout(tr('Over the\ntop of it', 'Myös sen\npäältä', 'Över själva\nvårtan'), [290, 196], null, { align: 'middle' }) + c.marker(1, 232, 196, 11), { fade: .35, still: true });
      cl += c.show(7.4, 14, K.callout(tr('Side of chest\nand armpit:\nup and down', 'Rinnan sivu ja\nkainalo: ylös\nja alas', 'Sidan av bröstet\noch armhålan:\nupp och ned'), [296, 254], M([76, 34]), { align: 'middle' }) + c.marker(2, 226, 254, 11), { fade: .35, hold: true });
      s += cl;
      return s;
    }
  });

  /* ================================================================================================================
     12. s-doctor: telling a doctor. A person with a note, a phone with a booking, a talk at the desk. Shared with the skin and testicle checks,
     so there is nothing about the breast in it.
     ================================================================================================================ */
  function brPerson(o) {
    /* upper body, origin at the chin; o.coat for a white coat, o.col for the colour of a jumper, o.yaw turns the head, o.hair */
    var s = '', S = o.s || 1;
    var sh = 'M-60 70C-60 44 -42 26 -18 20L18 20C42 26 60 44 60 70L64 130L-64 130Z';
    s += K.head({ x: 0, y: 0, hair: o.hair || 'short', layer: 'back' });
    s += '<path d="' + sh + '" fill="rgb(var(--st-shadow))" opacity=".3" transform="translate(3 6)"/>';
    s += K.limb([0, -6], [0, 24], 24, 30, { bulge: 0 });
    if (o.coat) {
      s += '<path d="' + sh + '" fill="url(#k-sheet)"/><path d="' + sh + '" fill="url(#k-sh-edge-h)"/><path d="' + sh + '" class="st-contour" stroke-opacity=".7"/>';
      s += '<path d="M-14 20L0 70L14 20L26 22L10 84L0 130L-10 84L-26 22Z" fill="' + o.col + '"/><path d="M-14 20L0 70L14 20" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".3"/>';
      s += '<path d="M-26 22L-8 62L-22 70L-38 34Z" fill="url(#k-sheet)" stroke="rgb(var(--st-shadow))" stroke-opacity=".4" stroke-width=".8"/><path d="M26 22L8 62L22 70L38 34Z" fill="url(#k-sheet)" stroke="rgb(var(--st-shadow))" stroke-opacity=".4" stroke-width=".8"/>';
      /* a stethoscope round the neck, and a name badge */
      s += '<path d="M-22 26C-26 52 -16 78 0 84C16 78 26 52 22 26" fill="none" stroke="#3B4350" stroke-width="3.4" stroke-linecap="round"/><path d="M-22 26C-26 52 -16 78 0 84" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1" transform="translate(-1 -1)"/><circle cx="0" cy="88" r="6.4" fill="url(#k-metal)" stroke="var(--st-metal-d)" stroke-width="1"/>';
      s += '<rect x="26" y="78" width="22" height="14" rx="2" fill="#fff" stroke="rgb(var(--st-shadow))" stroke-opacity=".4"/><rect x="30" y="82" width="12" height="2" fill="' + o.col + '"/><rect x="30" y="86" width="14" height="1.6" fill="rgb(var(--st-shadow))" opacity=".3"/>';
    } else {
      s += '<path d="' + sh + '" fill="' + o.col + '"/><path d="' + sh + '" fill="url(#k-sh-edge-h)"/><path d="' + sh + '" fill="url(#k-hi-tl)" opacity=".4"/>';
      s += '<path d="M-14 20L0 46L14 20Z" fill="url(#k-skin-soft)"/><path d="M-16 20L0 48L16 20" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".35" stroke-width="1.4"/>';
      s += '<path d="M-44 60C-40 86 -38 110 -40 128M40 60C38 86 36 110 40 128" fill="none" stroke="rgb(var(--st-shadow))" stroke-opacity=".14" stroke-width="3" filter="url(#k-b1)"/><path d="' + sh + '" class="st-contour" stroke-opacity=".7"/>';
    }
    s += K.head({ x: 0, y: 0, hair: o.hair || 'short', eyes: 'open', yaw: o.yaw || 0, layer: 'front' });
    return K.place({ x: o.x, y: o.y, s: S }, s);
  }
  function brBookingUi(big) {
    /* the booking screen: a header, a month of days with one chosen, and a confirm button; drawn 100 wide, 120 high, origin top left */
    var s = '<rect width="100" height="120" fill="#F7F9FB"/><rect width="100" height="22" fill="var(--st-guide)"/><text x="50" y="15" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">' + A.esc(tr('Booking', 'Ajanvaraus', 'Tidsbokning')) + '</text>', i;
    for (i = 0; i < 20; i++) { var cx = 12 + (i % 5) * 19, cy = 38 + Math.floor(i / 5) * 15; s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (i === 12 ? 7 : 1.7) + '" fill="' + (i === 12 ? 'var(--st-guide)' : '#9AA5B1') + '"/>'; }
    s += '<path d="M44 82L50 88L60 76" transform="translate(-20 -35) scale(1)" fill="none" stroke="none"/><text x="67" y="42" font-size="0" fill="none"></text>';
    s += '<rect x="12" y="98" width="76" height="16" rx="8" fill="var(--st-ok)"/><text x="50" y="110" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">' + A.esc(tr('Book', 'Varaa', 'Boka')) + '</text>';
    s += '<path d="M44 38L49 43L56 33" transform="translate(' + (12 + 2 * 19 - 50) + ' ' + (38 + 2 * 15 - 38) + ')" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  }
  stage.define('s-doctor', {
    dur: 12,
    phases: [
      { at: 0, cap: ['If you notice anything new or unusual, write it down', 'Jos huomaat jotain uutta tai epätavallista, kirjoita se ylös', 'Om du märker något nytt eller ovanligt, skriv ned det'] },
      { at: 3, cap: ['Book an appointment at your health centre', 'Varaa aika terveysasemalta', 'Boka tid på din hälsocentral'] },
      { at: 6.4, cap: ['Tell the doctor or nurse what you noticed', 'Kerro lääkärille tai hoitajalle, mitä huomasit', 'Berätta för läkaren eller sjuksköterskan vad du märkt'] },
      { at: 9.4, cap: ['Usually the cause is harmless, but it is better to have it checked early', 'Syy on yleensä vaaraton, mutta asia kannattaa tarkistaa ajoissa', 'Orsaken är oftast ofarlig, men det är bättre att få det kontrollerat tidigt'] }
    ],
    desc: [
      'A warm scene in a health centre. A person sits at a desk holding a note about something they noticed. A phone on the desk shows a booking screen where an appointment is chosen and confirmed. The person then talks calmly with a doctor in a white coat, shown by two speech bubbles. A friendly green check mark ends the scene: usually the cause is harmless, but it is better to have it checked early. A health centre sign hangs on the wall.',
      'Lämmin kohtaus terveysasemalla. Henkilö istuu pöydän ääressä ja pitää kädessään muistilappua huomaamastaan asiasta. Pöydällä olevan puhelimen ajanvarausnäytöllä valitaan aika ja vahvistetaan se. Sitten henkilö keskustelee rauhallisesti valkotakkisen lääkärin kanssa, mitä kuvaavat kaksi puhekuplaa. Kohtaus päättyy ystävälliseen vihreään valintamerkkiin: syy on yleensä vaaraton, mutta asia kannattaa tarkistaa ajoissa. Seinällä on terveysaseman kyltti.',
      'En varm scen på en hälsocentral. En person sitter vid ett skrivbord med en lapp om något hen har märkt. En mobil på skrivbordet visar en bokningsskärm där en tid väljs och bekräftas. Personen pratar sedan lugnt med en läkare i vit rock, vilket visas med två pratbubblor. Scenen slutar med en vänlig grön bock: orsaken är oftast ofarlig, men det är bättre att få det kontrollerat tidigt. På väggen hänger en skylt för hälsocentralen.'
    ],
    draw: function (c) {
      var s = '', still = c.still;
      s += K.room({ kind: 'wall', w: 360, h: 300 });
      /* the health centre sign, top left */
      s += '<g transform="translate(10 8)"><path d="' + K.rr(0, 0, 146, 34, 9) + '" fill="rgb(var(--st-shadow))" opacity=".25" transform="translate(2 4)"/><path d="' + K.rr(0, 0, 146, 34, 9) + '" fill="var(--st-ok)"/><path d="' + K.rr(0, 0, 146, 34, 9) + '" fill="url(#k-hi-v)"/><rect x="6" y="5" width="24" height="24" rx="5" fill="#fff"/><path d="M15 8.5H21V14.5H27V20.5H21V26.5H15V20.5H9V14.5H15Z" fill="var(--st-ok)"/><text x="37" y="22.5" font-size="12.5" font-weight="800" fill="#fff">' + A.esc(tr('Health centre', 'Terveysasema', 'Hälsocentral')) + '</text></g>';
      /* a window on the right, with soft daylight */
      s += '<g transform="translate(300 52)"><rect width="48" height="60" rx="4" fill="#CBE3F2"/><rect width="48" height="60" rx="4" fill="' + brLinear(c, 'win', 0, 0, 1, 1, [[0, '#fff', .8], [1, '#fff', 0]]) + '"/><path d="M24 0V60M0 30H48" stroke="var(--st-metal)" stroke-width="2.4"/><path d="' + K.rr(-2, -2, 52, 64, 5) + '" fill="none" stroke="var(--st-metal)" stroke-width="3"/><rect width="48" height="60" rx="4" fill="url(#k-streak)" opacity=".5"/></g>';
      /* the two people */
      s += brPerson({ x: 84, y: 134, s: .86, col: '#4E8EA2', hair: 'bun', yaw: .45 });
      s += brPerson({ x: 270, y: 130, s: .86, col: '#2F8F6B', hair: 'short', yaw: -.45, coat: true });
      /* the desk, in front of them */
      s += '<rect x="0" y="196" width="360" height="104" fill="url(#k-wood)"/><rect x="0" y="196" width="360" height="104" fill="url(#k-hi-v)" opacity=".6"/><rect x="0" y="194" width="360" height="4" fill="#fff" opacity=".22"/><path d="M0 196H360" stroke="rgb(var(--st-shadow))" stroke-opacity=".35"/><rect x="0" y="196" width="360" height="104" fill="url(#k-vig)"/>';
      s += '<path d="M0 198H360" stroke="rgb(var(--st-shadow))" stroke-opacity=".3" stroke-width="7" filter="url(#k-b2)" transform="translate(0 4)"/>';
      /* a plant on the desk */
      s += '<g transform="translate(336 192)"><path d="M-12 8L12 8L9 30L-9 30Z" fill="#C9744F"/><path d="M-12 8L12 8L11 13L-11 13Z" fill="#E0906A"/><ellipse cx="0" cy="8" rx="12" ry="3" fill="#7A4A32"/><path d="M0 8C-10 -4 -14 -14 -8 -26C-2 -16 0 -6 0 8Z" fill="#4F9B6A"/><path d="M0 8C10 -2 16 -12 11 -24C4 -16 0 -6 0 8Z" fill="#3E8758"/><path d="M0 8C-3 -8 2 -22 6 -32C6 -20 4 -8 0 8Z" fill="#62B07C"/></g>';
      /* the note the person holds up: a small paper with a few lines, lit up in the first phase */
      var note = '<g transform="translate(140 170) rotate(-8)"><rect x="-19" y="-24" width="38" height="48" rx="3" fill="rgb(var(--st-shadow))" opacity=".25" transform="translate(2 3)"/><rect x="-19" y="-24" width="38" height="48" rx="3" fill="url(#k-paper)"/><path d="M-12 -14H12M-12 -7H12M-12 0H12M-12 7H4" stroke="rgb(var(--st-shadow))" stroke-opacity=".4" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="14" r="4" fill="var(--st-guide)"/></g>';
      s += K.hand({ pose: 'pinch', gap: 0, x: 140, y: 214, r: -10, s: .8, flip: false }) + note;
      s += c.show(0, 3.4, c.pulse(0.3, 3.4, '<path d="' + K.rr(116, 142, 52, 64, 8) + '" class="st-ring" style="stroke-width:2.6"/>', { count: 3, scale: 1.08 }), { fade: .3 });
      /* the phone with the booking */
      var ph = K.phone({ x: 0, y: 0, w: 70, h: 130, screen: 'dark', content: '<g transform="translate(-30 -55) scale(.6)">' + brBookingUi() + '</g>' });
      s += '<g transform="translate(250 246) rotate(-8)">' + ph + '</g>';
      /* phase 2: the booking, larger (not in the still frame, where the phone is enough) */
      s += c.show(3.2, 6.6, K.lens(190, 92, 52, '<rect x="-60" y="-60" width="120" height="120" fill="#F7F9FB"/><g transform="translate(-50 -58) scale(1)">' + brBookingUi() + '</g>', { target: [250, 222] }), { fade: .4, still: false });
      /* phase 3: the talk */
      var bub = function (x, y, w, dots) { return '<g transform="translate(' + x + ' ' + y + ')"><path d="' + K.rr(0, 0, w, 34, 16) + '" fill="rgb(var(--st-shadow))" opacity=".18" transform="translate(2 3)"/><path d="' + K.rr(0, 0, w, 34, 16) + '" class="st-pill"/>' + dots + '</g>'; };
      var dots = function (w) { return [0, 1, 2].map(function (i) { return '<circle cx="' + (w / 2 - 12 + i * 12) + '" cy="17" r="3.2" fill="var(--st-guide)"/>'; }).join(''); };
      s += c.show(6.6, 9.4, c.anim([{ t: 6.6, s: .6, o: 0 }, { t: 7.1, s: 1, o: 1, ease: 'out' }], bub(112, 52, 56, dots(56)), { pivot: [140, 86] }), { fade: .3 });
      s += c.show(7.6, 9.4, c.anim([{ t: 7.6, s: .6, o: 0 }, { t: 8.1, s: 1, o: 1, ease: 'out' }], bub(196, 70, 56, dots(56)), { pivot: [224, 104] }), { fade: .3 });
      if (still) s += bub(112, 52, 56, dots(56)) + bub(196, 70, 56, dots(56));
      /* the check mark */
      var ok = '<g transform="translate(184 140)"><circle r="28" fill="var(--st-ok)" opacity=".18"/><circle r="20" fill="var(--st-ok)"/><circle r="20" fill="url(#k-hi-tl)"/><path d="M-8 1L-2 7L9 -6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>';
      s += c.show(9.6, 12, c.anim([{ t: 9.6, s: .5, o: 0 }, { t: 10.2, s: 1, o: 1, ease: 'out' }], ok, { pivot: [184, 140] }), { fade: .3, hold: true });
      var cl = '';
      cl += c.phaseShow(0, K.callout(tr('A note of what\nyou noticed', 'Muistiinpano\nhuomioistasi', 'En lapp om det\ndu märkt'), [72, 232], [132, 204], { align: 'middle', size: 12 }) + c.marker(0, 14, 232, 11), { fade: .3 });
      cl += c.phaseShow(1, K.callout(tr('Book a time', 'Varaa aika', 'Boka en tid'), [316, 282], [262, 262], { align: 'middle', size: 12 }) + c.marker(1, 258, 282, 11), { fade: .3 });
      cl += c.phaseShow(2, K.callout(tr('Talk to a doctor\nor nurse', 'Puhu lääkärin\ntai hoitajan kanssa', 'Prata med en läkare\neller sköterska'), [164, 272], null, { align: 'middle', size: 12 }) + c.marker(2, 76, 272, 11), { fade: .3 });
      cl += c.phaseShow(3, K.callout(tr('Usually harmless,\nbest checked early', 'Yleensä vaaraton,\ntarkista silti', 'Oftast ofarligt,\nbäst att kolla'), [262, 28], null, { align: 'middle', size: 12, tone: 'ok' }) + c.marker(3, 176, 28, 11), { fade: .3, hold: true });
      s += cl;
      return s;
    }
  });

  /* ================================================================================================================
     13. pos-breast: the poster of the check page. The three positions side by side, each in a small vignette.
     ================================================================================================================ */
  stage.define('pos-breast', {
    dur: 9,
    phases: [
      { at: 0, cap: ['Standing at a mirror', 'Seisten peilin edessä', 'Stående vid en spegel'] },
      { at: 3, cap: ['Lying on your back', 'Selällään makuulla', 'Liggande på rygg'] },
      { at: 6, cap: ['Standing in the shower', 'Seisten suihkussa', 'Stående i duschen'] }
    ],
    desc: [
      'Three small scenes side by side show the three positions for checking the breasts: standing at a bathroom mirror with the arms raised, lying on the back on a bed with one hand on the breast, and standing in the shower with soapy fingers. They light up one after another.',
      'Kolme pientä kuvaa vierekkäin näyttää rintojen tutkimisen kolme asentoa: seisten kylpyhuoneen peilin edessä kädet ylhäällä, selällään sängyllä toinen käsi rinnalla ja seisten suihkussa saippuaisin sormin. Ne valaistuvat vuorotellen.',
      'Tre små scener bredvid varandra visar de tre lägena för att undersöka brösten: stående vid en badrumsspegel med armarna uppe, liggande på rygg i en säng med ena handen på bröstet och stående i duschen med tvålade fingrar. De lyser upp i tur och ordning.'
    ],
    draw: function (c) {
      var s = '', still = c.still, PW = 108, PH = 196, PY = 22, PX = [8, 126, 244], i;
      /* 1: the mirror */
      brUse(54, 66, .36);
      var up = brIK(1, [58, -124], 1), upL = brIK(-1, [-58, -124], -1);
      var fig = '<g transform="translate(' + 54 + ' ' + 66 + ') scale(.36)">' + brHeadBack() + K.torso({ form: 'female', len: 190 }) + brHeadFront() + brArm(c, -1, [{ t: 0, r: upL[0] }], [{ t: 0, r: upL[1] }], { hand: 'open' }) + brArm(c, 1, [{ t: 0, r: up[0] }], [{ t: 0, r: up[1] }], { hand: 'open' }) + '</g>';
      var p1 = '<rect width="' + PW + '" height="' + PH + '" fill="url(#k-tile)"/><rect width="' + PW + '" height="' + PH + '" fill="url(#k-vig)"/>' + K.wallMirror({ x: 12, y: 14, w: 84, h: 150, content: brGlassBack(84, 150) + fig });
      /* 2: lying on the bed */
      var LPP = { x: 54, y: 84, s: .42 };
      var p2 = '<rect width="' + PW + '" height="' + PH + '" fill="url(#k-wood)"/><rect width="' + PW + '" height="' + PH + '" fill="url(#k-vig)"/>' + K.cloth(K.rr(8, 8, 92, 180, 14), { kind: 'sheet', fibre: false }) + K.folds(10, 120, 88, 60, 3, 4, 5) + K.pillow({ x: 54, y: 34, w: 84, h: 52 }) +
        K.place(LPP, K.head({ x: 0, y: -50, hair: 'fan', layer: 'back' }) + K.contact(0, 62, 118, 96, .55) + K.torso({ form: 'female', view: 'lying', len: 128 }) + K.arm({ side: 'r', wrist: [60, -84], bend: 1 }) + K.head({ x: 0, y: -50, hair: 'fan', eyes: 'closed', layer: 'front' }) +
          brLyingHand({ hand: 'lite' }) + K.contact(0, 112, 150, 14, .5) + K.cloth('M-140 112C-100 106 -70 118 -30 112C10 106 40 116 80 110C110 106 130 112 150 108L150 280L-140 280Z', { kind: 'sheet', fibre: false }));
      /* 3: the shower */
      var wk = brArmLite({ side: 'l', wrist: [-18, 36], lenU: 96, lenF: 92, bend: 1 });
      var p3 = '<rect width="' + PW + '" height="' + PH + '" fill="url(#k-tile)"/><rect width="' + PW + '" height="' + PH + '" fill="url(#k-vig)"/>' + K.showerHead({ x: 80, y: 20, s: .6, r: -18, c: c, streams: 8, len: 170 }) +
        '<g transform="translate(50 92) scale(.4)">' + K.head({ x: 0, y: -50, hair: 'bun', layer: 'back' }) + K.torso({ form: 'female', len: 190 }) + K.head({ x: 0, y: -50, hair: 'bun', eyes: 'open', layer: 'front' }) + K.drops(-60, 0, 120, 110, 10, 4) +
        brArm(c, 1, [{ t: 0, r: up[0] }], [{ t: 0, r: up[1] }], { hand: 'open' }) + wk + K.bubbles(16, 40, 40, 30, 6, 5) + '</g>';
      var pans = [p1, p2, p3], names = [tr('At the\nmirror', 'Peilin\nedessä', 'Vid\nspegeln'), tr('Lying\ndown', 'Makuulla', 'Liggande'), tr('In the\nshower', 'Suihkussa', 'I\nduschen')];
      for (i = 0; i < 3; i++) {
        var a = i * 3, b = a + 3;
        var ks = [[0, 1]];
        if (!still) { ks = i === 0 ? [[0, 1], [3, 1], [3.4, .66], [8.4, .66], [9, 1]] : i === 1 ? [[0, .66], [2.6, .66], [3.2, 1], [5.8, 1], [6.3, .66], [9, .66]] : [[0, .66], [5.6, .66], [6.2, 1], [8.4, 1], [9, .66]]; }
        s += c.fade(ks, brPanel(c, 'pp' + i, PX[i], PY, PW, PH, 16, pans[i]));
        s += K.callout(names[i], [PX[i] + PW / 2, PY + PH + 38], null, { align: 'middle', size: 12.5 });
        if (!still) s += c.show(a, b, '<path d="' + K.rr(PX[i] - 3, PY - 3, PW + 6, PH + 6, 18) + '" class="st-ring" style="stroke-width:3"/>', { fade: .3 });
        s += c.marker(i, PX[i] + 14, PY + 14, 11);
      }
      return s;
    }
  });

  /* @@END@@ */
})();
