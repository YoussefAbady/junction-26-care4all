import { A as C4A } from "../app.js";

/* The kit: shared, parametric illustration primitives for the self-check scenes (A.kit).

   Conventions
   - Every figure and prop takes an options object with x, y (where its local origin goes), s (scale), r (rotation in degrees,
     about the origin), flip (mirror left to right about the origin) and returns SVG markup. Figures are drawn facing front, the light
     comes from the upper left, and skin colour comes from CSS variables, so all skin tones and both themes work.
   - Units: a figure at s = 1 is about 3.8 units to the centimetre (shoulders 144 wide, head 86 tall, the breast 54 wide).
   - Gradients, filters and patterns are in one hidden <defs> block (ids start with "k-"), added to the page by K.ensureDefs().
     Inline ids made inside a figure come from K.uid(), so two figures on one page never clash.
   - Animated overlays (trail, pulse) take the scene context c from A.stage as their first argument.
   - Never put blur or turbulence filters on something that moves: they are for static layers only.

   Parts: 1 defs and helpers, 2 torso and head, 3 limbs and hands, 4 props, 5 overlays, 6 organs and skin close-ups. */
(function () {
  'use strict';
  var A = C4A, K = A.kit = {};
  var uidc = 0;
  K.uid = function (p) { return (p || 'k') + (++uidc) + 'x'; };
  function n2(v) { return +(+v).toFixed(2); }
  function P(x, y) { return n2(x) + ' ' + n2(y); }
  function CXY(x, y) { return 'cx="' + n2(x) + '" cy="' + n2(y) + '"'; }
  K.n2 = n2;
  var RAD = Math.PI / 180;

  /* ============================== 1. defs ============================== */
  var SK = 'var(--st-sk)', SKD = 'var(--st-sk-d)', SKA = 'var(--st-sk-a)', RD = 'var(--st-rd)', SHD = 'rgb(var(--st-shadow))';
  function mx(a, pa, b) { return 'color-mix(in srgb,' + a + ' ' + pa + '%,' + b + ')'; }
  function lighter(p) { return mx(SK, 100 - p, '#fff'); }
  function darker(p) { return mx(SK, 100 - p, SKD); }
  function stop(o, c, op) { return '<stop offset="' + o + '" style="stop-color:' + c + (op != null ? ';stop-opacity:' + op : '') + '"/>'; }
  function lg(id, a, stops) { return '<linearGradient id="k-' + id + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + a[2] + '" y2="' + a[3] + '">' + stops.join('') + '</linearGradient>'; }
  function rg(id, a, stops) { return '<radialGradient id="k-' + id + '" cx="' + a[0] + '" cy="' + a[1] + '" r="' + a[2] + '"' + (a[3] != null ? ' fx="' + a[3] + '" fy="' + a[4] + '"' : '') + '>' + stops.join('') + '</radialGradient>'; }

  /* The five stops of a lit cylinder: the lit edge turns away a little, then the highlight, the body, the shadow side, a faint rim of bounced light. */
  function cylStops(flip) {
    var s = [[0, darker(20)], [.2, lighter(22)], [.48, SK], [.84, darker(52)], [1, darker(32)]];
    if (flip) s = s.map(function (x) { return [+(1 - x[0]).toFixed(2), x[1]]; }).reverse();
    return s.map(function (x) { return stop(x[0], x[1]); });
  }
  K.cylStops = cylStops;

  function buildDefs() {
    var d = '';
    /* skin */
    d += lg('skin', [.15, 0, .85, 1], [stop(0, lighter(26)), stop(.4, lighter(8)), stop(.75, SK), stop(1, darker(36))]);
    d += lg('skin-soft', [.2, 0, .8, 1], [stop(0, lighter(10)), stop(.55, SK), stop(1, darker(20))]);
    d += lg('skin-h', [0, 0, 1, 0], cylStops(false));
    d += lg('skin-hr', [0, 0, 1, 0], cylStops(true));
    d += lg('skin-v', [0, 0, 0, 1], [stop(0, lighter(20)), stop(.35, SK), stop(.9, darker(46)), stop(1, darker(30))]);
    d += rg('skin-dome', [.4, .32, .82], [stop(0, lighter(28)), stop(.3, lighter(10)), stop(.62, SK), stop(1, darker(54))]);
    d += rg('skin-dome-soft', [.4, .32, .85], [stop(0, lighter(14)), stop(.55, SK), stop(1, darker(30))]);
    /* shadow, highlight (black and white with alpha, so they work on any tone) */
    d += lg('sh-edge-h', [0, 0, 1, 0], [stop(0, SHD, .3), stop(.18, SHD, 0), stop(.68, SHD, 0), stop(1, SHD, .42)]);
    d += lg('sh-edge-v', [0, 0, 0, 1], [stop(0, SHD, .12), stop(.2, SHD, 0), stop(.72, SHD, 0), stop(1, SHD, .4)]);
    d += lg('sh-br', [0, 0, 1, 1], [stop(0, SHD, 0), stop(.5, SHD, 0), stop(1, SHD, .4)]);
    d += lg('sh-b', [0, 0, 0, 1], [stop(0, SHD, 0), stop(.55, SHD, 0), stop(1, SHD, .45)]);
    d += rg('sh-r', [.5, .5, .5], [stop(0, SHD, .5), stop(.55, SHD, .22), stop(1, SHD, 0)]);
    d += rg('sh-r-soft', [.5, .5, .5], [stop(0, SHD, .3), stop(.6, SHD, .12), stop(1, SHD, 0)]);
    d += rg('hi-r', [.5, .5, .5], [stop(0, '#fff', .62), stop(.5, '#fff', .22), stop(1, '#fff', 0)]);
    d += rg('hi-tl', [.3, .26, .55], [stop(0, '#fff', .42), stop(1, '#fff', 0)]);
    d += lg('hi-v', [0, 0, 0, 1], [stop(0, '#fff', .34), stop(.5, '#fff', 0)]);
    d += rg('blush', [.5, .5, .5], [stop(0, RD, .3), stop(1, RD, 0)]);
    d += rg('bdome', [.4, .32, .78], [stop(0, lighter(22), .9), stop(.5, lighter(8), .55), stop(.82, SK, 0)]);
    d += rg('areola', [.5, .5, .5], [stop(0, mx(SKA, 80, RD)), stop(.72, mx(SKA, 94, SKD)), stop(1, mx(SKA, 94, SKD), 0)]);
    d += rg('nipple', [.38, .3, .8], [stop(0, mx(SKA, 84, '#fff')), stop(1, mx(SKA, 66, SKD))]);
    d += lg('nail', [0, 0, 0, 1], [stop(0, mx('var(--st-nail)', 55, '#fff')), stop(1, mx('var(--st-nail)', 62, SK))]);
    d += lg('lip', [0, 0, 0, 1], [stop(0, mx('var(--st-lip)', 100, SK)), stop(1, mx('var(--st-lip)', 76, SKD))]);
    d += lg('hair', [0, 0, 1, 1], [stop(0, 'var(--st-hair-l)'), stop(.55, 'var(--st-hair)'), stop(1, mx('var(--st-hair)', 70, '#000'))]);
    d += rg('hair-r', [.35, .25, .85], [stop(0, 'var(--st-hair-l)'), stop(.6, 'var(--st-hair)'), stop(1, mx('var(--st-hair)', 70, '#000'))]);
    /* room and cloth */
    d += lg('wall', [0, 0, 0, 1], [stop(0, 'var(--st-wall)'), stop(1, 'var(--st-wall2)')]);
    d += rg('vig', [.5, .5, .75], [stop(.55, SHD, 0), stop(1, SHD, .3)]);
    d += lg('sheet', [0, 0, 1, 1], [stop(0, 'var(--st-sheet)'), stop(.6, mx('var(--st-sheet)', 82, 'var(--st-sheet-d)')), stop(1, 'var(--st-sheet-d)')]);
    d += lg('sheet-tint', [0, 0, 1, 1], [stop(0, mx('var(--st-sheet)', 70, 'var(--st-sheet-tint)')), stop(1, mx('var(--st-sheet-tint)', 80, 'var(--st-sheet-d)'))]);
    d += lg('fold', [0, 0, 1, 0], [stop(0, SHD, 0), stop(.55, SHD, .2), stop(1, SHD, 0)]);
    d += rg('pillow', [.4, .3, .85], [stop(0, 'var(--st-pillow)'), stop(.62, mx('var(--st-pillow)', 82, 'var(--st-pillow-d)')), stop(1, 'var(--st-pillow-d)')]);
    d += lg('towel', [0, 0, 1, 1], [stop(0, mx('var(--st-towel)', 80, '#fff')), stop(1, 'var(--st-towel-d)')]);
    d += lg('wood', [0, 0, 0, 1], [stop(0, mx('var(--st-bed)', 88, '#fff')), stop(.5, 'var(--st-bed)'), stop(1, 'var(--st-bed-d)')]);
    d += lg('metal', [0, 0, 1, 0], [stop(0, 'var(--st-metal-d)'), stop(.28, mx('var(--st-metal)', 55, '#fff')), stop(.55, 'var(--st-metal)'), stop(1, 'var(--st-metal-d)')]);
    d += lg('metal-v', [0, 0, 0, 1], [stop(0, mx('var(--st-metal)', 55, '#fff')), stop(.5, 'var(--st-metal)'), stop(1, 'var(--st-metal-d)')]);
    d += lg('glass', [0, 0, 1, 1], [stop(0, 'var(--st-glass)', .55), stop(1, 'var(--st-glass)', .14)]);
    d += lg('mirror', [0, 0, 1, 1], [stop(0, 'var(--st-mirror)'), stop(.45, mx('var(--st-mirror)', 62, '#fff')), stop(.55, 'var(--st-mirror)'), stop(1, 'var(--st-mirror-d)')]);
    d += lg('streak', [0, 0, 1, 1], [stop(.34, '#fff', 0), stop(.48, '#fff', .38), stop(.6, '#fff', 0), stop(.7, '#fff', .16), stop(.76, '#fff', 0)]);
    d += rg('drop', [.5, .5, .5, .36, .28], [stop(0, '#fff', .92), stop(.4, 'var(--st-water)', .5), stop(1, 'var(--st-water)', .9)]);
    d += rg('bubble', [.5, .5, .5, .4, .32], [stop(0, '#fff', .05), stop(.72, '#fff', .22), stop(.92, '#fff', .75), stop(1, '#fff', .12)]);
    d += lg('paper', [0, 0, 1, 1], [stop(0, 'var(--st-paper)'), stop(1, 'var(--st-paper-d)')]);
    d += lg('tilegrad', [0, 0, 1, 1], [stop(0, '#fff', .3), stop(.5, '#fff', 0), stop(1, SHD, .1)]);
    d += '<pattern id="k-tile" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="var(--st-tile)"/><rect width="40" height="40" fill="url(#k-tilegrad)"/>' +
      '<path d="M0 0H40M0 0V40" stroke="var(--st-grout)" stroke-width="1.8" fill="none"/><path d="M2 2H38" stroke="#fff" stroke-opacity=".35" stroke-width="1" fill="none"/></pattern>';
    d += '<pattern id="k-weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3H6M3 0V6" stroke="rgb(var(--st-shadow))" stroke-opacity=".035" stroke-width=".6"/></pattern>';
    /* filters, for static layers only */
    [1, 2, 3, 5, 8].forEach(function (b) { d += '<filter id="k-b' + b + '" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="' + b + '"/></filter>'; });
    d += '<filter id="k-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="7" result="n"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .2  0 0 0 0 .12  0 0 0 0 .1  0 0 0 .5 -.2" result="a"/><feComposite in="a" in2="SourceAlpha" operator="in"/></filter>';
    d += '<filter id="k-fibre" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".04 .7" numOctaves="2" seed="3" result="n"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 .08  0 0 0 0 .06  0 0 0 .6 -.22" result="a"/><feComposite in="a" in2="SourceAlpha" operator="in"/></filter>';
    return d;
  }
  var defsDone = false;
  K.defsHtml = function () { return '<svg xmlns="http://www.w3.org/2000/svg" class="k-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>' + buildDefs() + '</defs></svg>'; };
  /* Adds the shared defs to the page once. A.stage.render calls it. */
  K.ensureDefs = function () {
    if (defsDone || typeof document === 'undefined' || !document.body) return;
    if (document.querySelector('svg.k-defs')) { defsDone = true; return; }
    var t = document.createElement('div');
    t.innerHTML = K.defsHtml();
    document.body.insertBefore(t.firstChild, document.body.firstChild);
    defsDone = true;
  };

  /* ============================== helpers ============================== */
  /* K.place({x, y, s, r, flip, sx, sy}, inner): a transform group. */
  function place(o, inner) {
    o = o || {};
    var s = o.s == null ? 1 : o.s, sx = (o.sx == null ? s : o.sx) * (o.flip ? -1 : 1), sy = o.sy == null ? s : o.sy;
    return '<g transform="translate(' + P(o.x || 0, o.y || 0) + ')' + (o.r ? ' rotate(' + n2(o.r) + ')' : '') + (sx !== 1 || sy !== 1 ? ' scale(' + n2(sx) + ' ' + n2(sy) + ')' : '') + '">' + inner + '</g>';
  }
  K.place = place;
  /* K.mapper(o): returns a function that turns a point in a figure's own coordinates into scene coordinates (same options as place). */
  K.mapper = function (o) {
    o = o || {};
    var s = o.s == null ? 1 : o.s, sx = (o.sx == null ? s : o.sx) * (o.flip ? -1 : 1), sy = o.sy == null ? s : o.sy, a = (o.r || 0) * RAD, ca = Math.cos(a), sa = Math.sin(a);
    return function (p) { var x = p[0] * sx, y = p[1] * sy; return [(o.x || 0) + x * ca - y * sa, (o.y || 0) + x * sa + y * ca]; };
  };
  function grain(d, op, extra) { return '<path d="' + d + '" fill="#000" opacity="' + (op == null ? .5 : op) + '" filter="url(#k-grain)" ' + (extra || '') + '/>'; }
  K.grain = grain;
  /* K.skinShape(d, o): a path drawn as skin with volume.
     o.grad 'diag' (default) | 'h' | 'hr' | 'v' | 'dome' | 'soft' | 'flat'; o.shade 'edge-h' | 'edge-v' | 'br' | 'b'; o.hi true (a highlight at the upper left);
     o.contour false to leave out the thin outline; o.grain 0..1 opacity of the skin grain (default 0). */
  K.skinShape = function (d, o) {
    o = o || {};
    var g = o.grad || 'diag', fill = g === 'flat' ? SK : 'url(#k-' + (g === 'diag' ? 'skin' : g === 'soft' ? 'skin-soft' : g === 'dome' ? 'skin-dome' : 'skin-' + g) + ')';
    var s = '<path d="' + d + '" fill="' + fill + '"/>';
    if (o.shade) s += '<path d="' + d + '" fill="url(#k-sh-' + o.shade + ')"/>';
    if (o.hi) s += '<path d="' + d + '" fill="url(#k-hi-tl)"/>';
    if (o.grain) s += grain(d, o.grain);
    if (o.contour !== false) s += '<path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    return s;
  };
  /* A soft contact shadow under an object: K.contact(cx, cy, rx, ry, opacity). Uses a gradient, not a filter. */
  K.contact = function (cx, cy, rx, ry, op) { return '<ellipse ' + CXY(cx, cy) + ' rx="' + n2(rx) + '" ry="' + n2(ry) + '" fill="url(#k-sh-r)" opacity="' + (op == null ? 1 : op) + '"/>'; };
  /* Blurred drop shadow of a path (a static layer): K.softShadow(d, {dx, dy, blur 1|2|3|5|8, op}). */
  K.softShadow = function (d, o) {
    o = o || {};
    return '<path d="' + d + '" transform="translate(' + (o.dx == null ? 3 : o.dx) + ' ' + (o.dy == null ? 5 : o.dy) + ')" fill="' + SHD + '" opacity="' + (o.op == null ? .3 : o.op) + '" filter="url(#k-b' + (o.blur || 3) + ')"/>';
  };
  /* A highlight spot: K.glint(cx, cy, rx, ry, rot, opacity). */
  K.glint = function (cx, cy, rx, ry, rot, op) { return '<ellipse ' + CXY(cx, cy) + ' rx="' + n2(rx) + '" ry="' + n2(ry) + '"' + (rot ? ' transform="rotate(' + rot + ' ' + P(cx, cy) + ')"' : '') + ' fill="url(#k-hi-r)" opacity="' + (op == null ? 1 : op) + '"/>'; };

  /* A path from the right half of a symmetric outline: start point, cubic segments [c1x, c1y, c2x, c2y, x, y], then straight across the bottom. */
  function symPath(start, segs) {
    var d = 'M' + P(start[0], start[1]), a = [start], i, s;
    for (i = 0; i < segs.length; i++) { s = segs[i]; d += 'C' + P(s[0], s[1]) + ' ' + P(s[2], s[3]) + ' ' + P(s[4], s[5]); a.push([s[4], s[5]]); }
    var end = a[a.length - 1];
    d += 'L' + P(-end[0], end[1]);
    for (i = segs.length - 1; i >= 0; i--) { s = segs[i]; d += 'C' + P(-s[2], s[3]) + ' ' + P(-s[0], s[1]) + ' ' + P(-a[i][0], a[i][1]); }
    return d + 'Z';
  }
  K.symPath = symPath;

  /* A tapered limb segment from p0 to p1 as a path (round ends), plus the unit vectors. */
  function limbD(p0, p1, w0, w1, bulge) {
    var dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, N = 8, l = [], r = [], i;
    for (i = 0; i <= N; i++) {
      var t = i / N, w = (w0 + (w1 - w0) * t) * (1 + (bulge || 0) * Math.sin(Math.PI * t)), cx = p0[0] + dx * t, cy = p0[1] + dy * t;
      l.push([cx + nx * w / 2, cy + ny * w / 2]); r.push([cx - nx * w / 2, cy - ny * w / 2]);
    }
    var d = 'M' + P(l[0][0], l[0][1]);
    for (i = 1; i <= N; i++) d += 'L' + P(l[i][0], l[i][1]);
    d += 'A' + n2(w1 / 2) + ' ' + n2(w1 / 2) + ' 0 0 0 ' + P(r[N][0], r[N][1]);
    for (i = N - 1; i >= 0; i--) d += 'L' + P(r[i][0], r[i][1]);
    d += 'A' + n2(w0 / 2) + ' ' + n2(w0 / 2) + ' 0 0 0 ' + P(l[0][0], l[0][1]) + 'Z';
    return { d: d, ux: ux, uy: uy, nx: nx, ny: ny, len: L };
  }
  /* A gradient in the user space of whatever references it (so it follows the group's transform): from (x1,y1) to (x2,y2). */
  function ugrad(id, x1, y1, x2, y2, stops) { return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + n2(x1) + '" y1="' + n2(y1) + '" x2="' + n2(x2) + '" y2="' + n2(y2) + '">' + stops + '</linearGradient>'; }
  K.ugrad = ugrad;
  var LIGHT = [-.55, -.83];   /* the direction the light travels from, in scene coordinates: from the upper left */
  K.LIGHT = LIGHT;
  /* K.limb(p0, p1, w0, w1, o): a shaded, tapered limb segment between two points (scene coordinates of the current group).
     The light stays at the upper left whatever the direction of the limb. o.bulge muscle swell (default .05), o.grad overrides the colour stops, o.grain. */
  K.limb = function (p0, p1, w0, w1, o) {
    o = o || {};
    var m = limbD(p0, p1, w0, w1, o.bulge == null ? .05 : o.bulge), id = K.uid('lb'), sgn = (m.nx * LIGHT[0] + m.ny * LIGHT[1]) < 0 ? 1 : -1;
    /* the vector from the lit edge to the shadow edge, across the limb */
    var cx = (p0[0] + p1[0]) / 2, cy = (p0[1] + p1[1]) / 2, hw = Math.max(w0, w1) / 2 * 1.04, ax = m.nx * sgn, ay = m.ny * sgn;
    var s = ugrad(id, cx - ax * hw, cy - ay * hw, cx + ax * hw, cy + ay * hw, cylStops(false).join(''));
    s += '<path d="' + m.d + '" fill="url(#' + id + ')"/>';
    if (o.grain) s += grain(m.d, o.grain);
    s += '<path d="' + m.d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    return s;
  };
  K.limbD = limbD;
  /* ============================== 2. torso and head ============================== */
  /* The right half of the outline of the upper body from the front, from the side of the neck down to the waist.
     Origin: the sternal notch. Shoulders about +-72 to +-86, waist +-54, len = how far down the picture goes. */
  var FORM = {
    female: { S: 84, A: 67, W: 54, tz: [[40, -12, 56, -9, 68, -5]] },
    male: { S: 91, A: 73, W: 57, tz: [[42, -14, 58, -12, 71, -8]] },
    neutral: { S: 87, A: 70, W: 55, tz: [[41, -13, 57, -10, 69, -6]] }
  };
  function torsoSegs(form, len) {
    var f = FORM[form] || FORM.neutral, S = f.S, A_ = f.A, W = f.W, t = f.tz[0];
    return [[15, -34, 17, -24, 23, -18], t.concat([]).slice(0, 4).concat([t[2] + (form === 'male' ? 2 : 0), t[3]]).slice(0, 6),
      [S - 4, -2, S + 2, 10, S, 24], [S - 2, 34, A_ + 5, 42, A_, 50], [A_ - 3, 78, W + 3, len - 52, W + 2, len - 30], [W, len - 20, W - 1, len - 8, W - 1, len + 2]];
  }
  /* the second trapezius segment needs its own end point at the shoulder tip */
  function torsoSegsFixed(form, len) {
    var f = FORM[form] || FORM.neutral, S = f.S, A_ = f.A, W = f.W, t = f.tz[0], ex = t[4], ey = t[5];
    return [[15, -34, 17, -24, 23, -18], [t[0], t[1], t[2], t[3], ex, ey], [S - 4, -2, S + 2, 10, S, 24], [S - 2, 34, A_ + 5, 42, A_, 50],
      [A_ - 3, 78, W + 3, len - 52, W + 2, len - 30], [W, len - 20, W - 1, len - 8, W - 1, len + 2]];
  }
  K.torsoAnchors = function (o) {
    o = o || {};
    var form = o.form || 'female', f = FORM[form] || FORM.neutral, lying = o.lying || o.view === 'lying', len = o.len || 160;
    var br = form === 'female' ? (lying ? { cx: 41, cy: 54, rx: 29, ry: 22 } : { cx: 36, cy: 58, rx: 27, ry: 26 }) : { cx: 32, cy: 54, rx: 31, ry: 21 };
    return { notch: [0, 0], neck: [0, -44], chin: [0, -50], shoulderL: [-(f.S - 14), 12], shoulderR: [f.S - 14, 12], breastL: [-br.cx, br.cy, br.rx, br.ry], breastR: [br.cx, br.cy, br.rx, br.ry], nippleL: [-br.cx - (lying ? 5 : -1), br.cy + 3], nippleR: [br.cx + (lying ? 5 : 1), br.cy + 3], navel: [0, len - 16], waist: [0, len] };
  };

  function breast(sx, b, o) {
    /* b: { cx, cy, rx, ry }; o: { lying, areola, nip, flat } ; sx -1 = image left, +1 = image right. Never mirrored, so the light stays at the upper left. */
    var cx = b.cx * sx, cy = b.cy, rx = b.rx, ry = b.ry, s = '', lying = o.lying, fl = o.flat;
    var nx = cx + sx * (lying ? 4.5 : 1), ny = cy + (lying ? 3 : 3.5);
    /* the shadow it throws on the chest and, lying down, where it slumps towards the arm */
    s += K.contact(cx + sx * 1.5, cy + ry * .82, rx * 1.02, ry * .36, fl ? .55 : .95);
    if (lying) s += K.contact(cx + sx * rx * .8, cy + ry * .5, rx * .5, ry * .55, .5);
    /* the mound: a soft light that fades out at the upper left (where it merges with the chest) and a crescent of shade on the lower right */
    s += '<ellipse ' + CXY(cx, cy) + ' rx="' + n2(rx) + '" ry="' + n2(ry) + '" fill="url(#k-bdome)" opacity="' + (fl ? .6 : 1) + '"/>';
    var crs = 'M' + P(cx - rx, cy) + 'A' + n2(rx) + ' ' + n2(ry) + ' 0 1 0 ' + P(cx + rx, cy) + 'A' + n2(rx) + ' ' + n2(ry) + ' 0 1 0 ' + P(cx - rx, cy) + 'ZM' + P(cx - rx * .97 - 2.6, cy - 4) + 'A' + n2(rx * .97) + ' ' + n2(ry * .96) + ' 0 1 0 ' + P(cx + rx * .97 - 2.6, cy - 4) + 'A' + n2(rx * .97) + ' ' + n2(ry * .96) + ' 0 1 0 ' + P(cx - rx * .97 - 2.6, cy - 4) + 'Z';
    s += '<path d="' + crs + '" fill-rule="evenodd" fill="' + SHD + '" opacity="' + (fl ? .14 : .2) + '" filter="url(#k-b1)"/>';
    /* lower contour: thin, low contrast */
    var a0 = 18 * RAD, a1 = 160 * RAD;
    s += '<path d="M' + P(cx + rx * Math.cos(a0), cy + ry * Math.sin(a0)) + 'A' + n2(rx) + ' ' + n2(ry) + ' 0 0 1 ' + P(cx + rx * Math.cos(a1), cy + ry * Math.sin(a1)) + '" class="st-contour" stroke-opacity=".7" stroke-width=".9" opacity="' + (fl ? .4 : .55) + '"/>';
    /* the soft rim of the underside */
    s += '<path d="M' + P(cx + rx * Math.cos(a0 + .1), cy + ry * Math.sin(a0 + .1) + 1.6) + 'A' + n2(rx) + ' ' + n2(ry) + ' 0 0 1 ' + P(cx + rx * Math.cos(a1 - .2), cy + ry * Math.sin(a1 - .2) + 1.6) + '" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.6" stroke-linecap="round"/>';
    s += K.glint(cx - rx * .26, cy - ry * .34, rx * .42, ry * .3, -18, fl ? .45 : .75);
    /* areola, Montgomery glands and nipple */
    var ar = o.areola || 7.8, ai = K.uid('ar');
    s += '<ellipse ' + CXY(nx, ny) + ' rx="' + n2(ar * 1.12) + '" ry="' + n2(ar * (lying ? .92 : 1)) + '" fill="url(#k-areola)"/>';
    if (!fl) for (var i = 0; i < 7; i++) {
      var an = i / 7 * 6.283 + .4, px = nx + Math.cos(an) * ar * .62, py = ny + Math.sin(an) * ar * .56;
      s += '<circle ' + CXY(px, py) + ' r=".75" fill="#fff" fill-opacity=".28"/><circle ' + CXY(px + .35, py + .4) + ' r=".5" fill="' + SHD + '" fill-opacity=".18"/>';
    }
    var nr = o.nip || 2.6;
    s += '<ellipse ' + CXY(nx + .9, ny + 1.2) + ' rx="' + n2(nr) + '" ry="' + n2(nr * .8) + '" fill="' + SHD + '" opacity=".3"/>';
    s += '<ellipse ' + CXY(nx, ny) + ' rx="' + n2(nr) + '" ry="' + n2(nr * .86) + '" fill="url(#k-nipple)"/>';
    s += '<ellipse ' + CXY(nx - nr * .3, ny - nr * .35) + ' rx="' + n2(nr * .35) + '" ry="' + n2(nr * .25) + '" fill="#fff" opacity=".55"/>';
    return s;
  }
  K.breast = breast;

  /* K.torso({form: 'female' | 'male' | 'neutral', view: 'front' | 'lying' | 'side', len, lying, fade, x, y, s, r, flip})
     The upper body from the notch of the throat to the waist, with a neck stub up to y = -44 (K.head sits on it: head origin at the chin, (0,-50)).
     'lying' is a person on their back seen from above: the front view with breasts that spread and slump to the sides.
     No arms: use K.arm with shoulder points from K.torsoAnchors. o.fade true fades the bottom edge into the background. */
  K.torso = function (o) {
    o = o || {};
    var view = o.view || 'front';
    if (view === 'side') return sideTorso(o);
    var form = o.form || 'female', len = o.len || 160, lying = !!(o.lying || view === 'lying'), d = symPath([15, -44], torsoSegsFixed(form, len)), s = '', an = K.torsoAnchors({ form: form, lying: lying, len: len });
    var f = FORM[form] || FORM.neutral;
    s += '<path d="' + d + '" fill="url(#k-skin)"/>';
    s += '<path d="' + d + '" fill="url(#k-sh-edge-h)"/><path d="' + d + '" fill="url(#k-sh-edge-v)"/>';
    /* neck: a cylinder, darker at the sides, with the hollow of the throat and the two neck muscles */
    s += '<path d="M-15 -44C-15 -34 -17 -24 -23 -18L23 -18C17 -24 15 -34 15 -44Z" fill="url(#k-sh-edge-h)"/>';
    [-1, 1].forEach(function (sx) {
      s += '<path d="M' + P(sx * 13, -42) + 'C' + P(sx * 11, -30) + ' ' + P(sx * 8, -20) + ' ' + P(sx * 5.5, -9) + '" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="3" stroke-linecap="round" filter="url(#k-b1)"/>';
      s += '<path d="M' + P(sx * 15, -40) + 'C' + P(sx * 13.5, -28) + ' ' + P(sx * 10.5, -19) + ' ' + P(sx * 7.5, -9) + '" class="st-crease" stroke-opacity=".28" stroke-width="1.2"/>';
      /* shoulder (deltoid) volume: lit on the left, in shade on the right */
      s += K.glint(sx * (f.S - 20), 8, 15, 19, sx * 10, sx < 0 ? .75 : .38);
      s += K.contact(sx * (f.S - 5), 30, 11, 22, sx < 0 ? .3 : .55);
      /* the collarbone: a bright ridge above a soft crease */
      var cl = 'M' + P(sx * 9, -9) + 'C' + P(sx * 22, -15) + ' ' + P(sx * 42, -17) + ' ' + P(sx * (f.S - 21), -8);
      s += '<path d="' + cl + '" transform="translate(0 -1.7)" fill="none" stroke="#fff" stroke-opacity=".36" stroke-width="3" stroke-linecap="round" filter="url(#k-b1)"/>';
      s += '<path d="' + cl + '" transform="translate(0 1.6)" class="st-crease" stroke-width="1.7" stroke-opacity=".6"/>';
    });
    s += '<ellipse cx="0" cy="-7" rx="7.5" ry="4" fill="url(#k-sh-r)"/>';
    if (form === 'female') {
      /* sternum, the cleft between the breasts, the ribs under them */
      s += '<ellipse cx="0" cy="34" rx="5" ry="30" fill="url(#k-hi-r)" opacity=".4"/><ellipse cx="0" cy="66" rx="6" ry="20" fill="url(#k-sh-r-soft)"/>';
      for (var k = 0; k < 4; k++) {
        var y0 = 94 + k * 11;
        [-1, 1].forEach(function (sx) {
          s += '<path d="M' + P(sx * 54, y0 + 7) + 'C' + P(sx * 38, y0 + 15) + ' ' + P(sx * 16, y0 + 15) + ' ' + P(sx * 5, y0 + 8) + '" class="st-crease" stroke-width=".8" stroke-opacity="' + (.5 - k * .08) + '"/>';
          s += '<path d="M' + P(sx * 54, y0 + 8.6) + 'C' + P(sx * 38, y0 + 16.6) + ' ' + P(sx * 16, y0 + 16.6) + ' ' + P(sx * 5, y0 + 9.6) + '" fill="none" stroke="#fff" stroke-opacity="' + (.16 - k * .03) + '" stroke-width="1.2"/>';
        });
      }
      s += breast(-1, { cx: an.breastL[0] * -1, cy: an.breastL[1], rx: an.breastL[2], ry: an.breastL[3] }, { lying: lying });
      s += breast(1, { cx: an.breastR[0], cy: an.breastR[1], rx: an.breastR[2], ry: an.breastR[3] }, { lying: lying });
    } else {
      s += '<ellipse cx="0" cy="40" rx="4" ry="28" fill="url(#k-hi-r)" opacity=".3"/>';
      var male = form === 'male';
      [-1, 1].forEach(function (sx) {
        s += breast(sx, { cx: male ? 31 : 30, cy: 52, rx: male ? 34 : 30, ry: male ? 21 : 18 }, { flat: true, areola: male ? 5.4 : 6, nip: male ? 1.8 : 2.1, lying: false });
      });
      if (male) {
        for (var q = 0; q < 3; q++) [-1, 1].forEach(function (sx) { s += '<path d="M' + P(sx * 3, 98 + q * 17) + 'C' + P(sx * 16, 100 + q * 17) + ' ' + P(sx * 28, 98 + q * 17) + ' ' + P(sx * 34, 94 + q * 17) + '" class="st-crease" stroke-width=".8" stroke-opacity=".38"/>'; });
        s += '<path d="M0 84L0 ' + (len - 22) + '" class="st-crease" stroke-width=".8" stroke-opacity=".4"/>';
      }
    }
    if (form !== 'female' || len > 120) {
      if (len > 130) {
        s += '<path d="M0 ' + (len - 40) + 'L0 ' + (len - 22) + '" class="st-crease" stroke-width=".8" stroke-opacity=".25"/>';
        s += '<ellipse cx="0" cy="' + (len - 16) + '" rx="3" ry="6.2" fill="url(#k-sh-r)" opacity=".85"/><ellipse cx="-1" cy="' + (len - 19) + '" rx="1.4" ry="2.4" fill="#fff" opacity=".28"/>';
      }
    }
    s += grain(d, .3);
    s += '<path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    if (o.fade) {
      var mid = K.uid('mk');
      s = '<defs><linearGradient id="' + mid + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="' + mid + '" maskUnits="userSpaceOnUse" x="-120" y="-60" width="240" height="' + (len + 80) + '"><rect x="-120" y="-60" width="240" height="' + (len + 80) + '" fill="url(#' + mid + 'g)"/></mask></defs><g mask="url(#' + mid + ')">' + s + '</g>';
    }
    return place(o, s);
  };

  /* The side view: facing right, origin at the base of the front of the neck. */
  function sideTorso(o) {
    var form = o.form || 'female', len = o.len || 160, fem = form === 'female', s = '';
    var br = fem ? 24 : 11, bx = fem ? 22 : 18;
    var d = 'M10 -44C11 -34 12 -24 17 -16C23 -8 28 4 ' + (bx + 4) + ' 22C' + (bx + br * .75) + ' 34 ' + (bx + br * 1.4) + ' ' + (44 + (fem ? 6 : 0)) + ' ' + (bx + br * 1.3) + ' ' + (58 + (fem ? 4 : 0)) +
      'C' + (bx + br) + ' ' + (72 + (fem ? 4 : 0)) + ' ' + (bx - 2) + ' ' + (78 + (fem ? 6 : 0)) + ' ' + (bx - 4) + ' 90C' + (bx - 4) + ' 112 30 130 ' + (fem ? 30 : 27) + ' ' + (len + 2) +
      'L-24 ' + (len + 2) + 'C-24 130 -30 100 -34 70C-38 40 -34 10 -26 -6C-18 -16 -14 -28 -12 -44Z';
    s += '<path d="' + d + '" fill="url(#k-skin-soft)"/><path d="' + d + '" fill="url(#k-sh-edge-v)"/><path d="' + d + '" fill="url(#k-sh-br)"/>';
    s += '<path d="M-12 -44C-12 -32 -14 -24 -18 -16L18 -16C14 -24 12 -34 10 -44Z" fill="url(#k-sh-edge-h)"/>';
    s += K.glint(-10, 20, 12, 22, 0, .35);
    if (fem) {
      s += K.contact(bx + 12, 74, 22, 8, .8);
      s += '<ellipse ' + CXY(bx + 12, 50) + ' rx="' + n2(br) + '" ry="' + n2(br * .95) + '" fill="url(#k-bdome)"/>';
      s += K.glint(bx + 5, 40, 9, 12, -20, .7);
      s += '<ellipse ' + CXY(bx + br * 1.18, 56) + ' rx="3.4" ry="4.4" fill="url(#k-nipple)"/><ellipse ' + CXY(bx + br * 1.12, 54) + ' rx="1.1" ry="1.5" fill="#fff" opacity=".5"/>';
      s += '<path d="M' + P(bx + 4, 28) + 'C' + P(bx + 14, 22) + ' ' + P(bx + br * 1.5, 40) + ' ' + P(bx + br * 1.3, 58) + 'C' + P(bx + br * 1.05, 76) + ' ' + P(bx + 4, 78) + ' ' + P(bx - 3, 80) + '" class="st-contour" stroke-opacity="1" stroke-width=".9" opacity=".7"/>';
    }
    s += '<ellipse ' + CXY(bx + 8, len - 16) + ' rx="2" ry="5" fill="url(#k-sh-r)"/>';
    s += grain(d, .35) + '<path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    return place(o, s);
  }

  /* ---------- head ---------- */
  var HEAD_D = 'M0 -86C17 -86 29 -70 29 -48C29 -26 20 -8 9 -3C5 -1 2 0 0 0C-2 0 -5 -1 -9 -3C-20 -8 -29 -26 -29 -48C-29 -70 -17 -86 0 -86Z';
  function hairShape(kind, layer) {
    var s = '', hid = 'url(#k-hair)';
    var strands = function (n, x0, x1, y0, y1, bend) {
      var t = '';
      for (var i = 0; i < n; i++) { var u = i / (n - 1), x = x0 + (x1 - x0) * u; t += '<path d="M' + P(x * .4, y0) + 'Q' + P(x + bend * (u - .5), (y0 + y1) / 2) + ' ' + P(x, y1) + '" fill="none" stroke="#fff" stroke-opacity="' + (.05 + .1 * Math.abs(Math.sin(i * 1.7))) + '" stroke-width=".9"/>'; }
      return t;
    };
    if (layer === 'back') {
      if (kind === 'long') s = '<path d="M-36 -52C-44 -20 -46 20 -40 62C-30 70 30 70 40 62C46 20 44 -20 36 -52C30 -86 -30 -86 -36 -52Z" fill="' + hid + '"/><path d="M-36 -52C-44 -20 -46 20 -40 62C-30 70 30 70 40 62C46 20 44 -20 36 -52Z" fill="url(#k-sh-b)"/>';
      else if (kind === 'fan') s = '<path d="M-33 -52C-52 -72 -62 -110 -46 -140C-30 -162 30 -162 46 -140C62 -110 52 -72 33 -52Z" fill="' + hid + '"/><path d="M-33 -52C-52 -72 -62 -110 -46 -140C-30 -162 30 -162 46 -140C62 -110 52 -72 33 -52Z" fill="url(#k-sh-b)" opacity=".5"/><ellipse cx="-14" cy="-120" rx="22" ry="9" fill="#fff" opacity=".1" transform="rotate(-20 -14 -120)"/>' + strands(11, -44, 44, -92, -150, 12);
      else if (kind === 'bun') s = '<circle cx="0" cy="-98" r="14" fill="' + hid + '"/><circle cx="-4" cy="-102" r="6" fill="url(#k-hi-r)" opacity=".5"/>';
      return s;
    }
    if (kind === 'none') return '';
    var cap = kind === 'short' ? 'M-30 -50C-33 -76 -18 -92 0 -92C18 -92 33 -76 30 -50C28 -60 24 -67 17 -71C9 -63 -9 -63 -17 -71C-24 -67 -28 -60 -30 -50Z'
      : 'M-31 -46C-35 -78 -18 -94 0 -94C18 -94 35 -78 31 -46C29 -58 25 -68 16 -72C6 -64 -6 -64 -16 -72C-25 -68 -29 -58 -31 -46Z';
    s += '<path d="' + cap + '" fill="' + hid + '"/>';
    if (kind === 'long') s += '<path d="M-31 -46C-34 -30 -34 -4 -30 14C-27 12 -24 -30 -26 -52Z" fill="' + hid + '"/><path d="M31 -46C34 -30 34 -4 30 14C27 12 24 -30 26 -52Z" fill="' + hid + '"/>';
    s += '<path d="' + cap + '" fill="url(#k-hi-tl)" opacity=".6"/>' + strands(8, -24, 24, -88, -64, 6);
    s += '<ellipse cx="-8" cy="-84" rx="11" ry="4" fill="#fff" opacity=".22" transform="rotate(-14 -8 -84)"/>';
    return s;
  }

  /* K.head({view: 'front' | 'side', yaw: -1..1 (front view turned, 0 straight), hair: 'short' | 'long' | 'bun' | 'fan' | 'none', face: 'calm' | 'mannequin',
     eyes: 'closed' | 'open', layer: 'all' | 'back' | 'front', x, y, s, r, flip})
     Origin at the chin; about 58 wide and 86 tall. Draw layer 'back' before the torso when the hair is long or fanned, then 'front' after it. */
  K.head = function (o) {
    o = o || {};
    var layer = o.layer || 'all', hair = o.hair || 'short', yaw = o.yaw || 0, mannequin = o.face === 'mannequin', open = o.eyes === 'open', s = '';
    if (o.view === 'side') return place(o, sideHead(o, layer));
    if (layer === 'back') return place(o, hairShape(hair, 'back'));
    var sh = yaw * 7;
    s += hairShape(hair, 'back');
    /* the shadow under the chin on the neck */
    s += '<ellipse cx="0" cy="3" rx="23" ry="9" fill="' + SHD + '" opacity=".32" filter="url(#k-b3)"/>';
    /* ears: the far one hides when the head turns */
    [-1, 1].forEach(function (sx) {
      var far = sx * yaw > .25, ex = sx * 29.5 + sh * .4;
      if (far) return;
      var ed = 'M' + P(ex, -52) + 'C' + P(ex + sx * 7, -52) + ' ' + P(ex + sx * 8, -34) + ' ' + P(ex + sx * 2, -30) + 'C' + P(ex - sx * .5, -30) + ' ' + P(ex - sx * 1, -36) + ' ' + P(ex - sx * 1, -46) + 'Z';
      s += '<path d="' + ed + '" fill="url(#k-skin-dome)"/><path d="M' + P(ex + sx * 1.6, -47) + 'C' + P(ex + sx * 4.6, -46) + ' ' + P(ex + sx * 4.6, -37) + ' ' + P(ex + sx * 1.8, -34.5) + '" class="st-crease" stroke-width=".8" stroke-opacity=".5"/><path d="' + ed + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    });
    s += '<path d="' + HEAD_D + '" fill="url(#k-skin-dome)"/><path d="' + HEAD_D + '" fill="url(#k-sh-edge-h)"/><path d="' + HEAD_D + '" fill="url(#k-sh-b)" opacity=".7"/>';
    if (yaw) s += '<path d="' + HEAD_D + '" fill="url(#k-sh-edge-h)" opacity="' + Math.abs(yaw) * .8 + '"/>';
    /* forehead light and cheeks */
    s += K.glint(-3 + sh, -68, 16, 8, 0, .55);
    s += '<ellipse ' + CXY(-16 + sh, -30) + ' rx="9" ry="7" fill="url(#k-blush)"/><ellipse ' + CXY(16 + sh, -30) + ' rx="9" ry="7" fill="url(#k-blush)"/>';
    s += '<ellipse ' + CXY(sh, -6) + ' rx="8" ry="3.4" fill="url(#k-sh-r-soft)"/>';
    var fx = '<g transform="translate(' + n2(sh) + ' 0)">';
    /* nose */
    fx += '<path d="M' + P(2.5, -56) + 'C' + P(4.5, -48) + ' ' + P(5, -38) + ' ' + P(5.8, -31) + '" fill="none" stroke="' + SHD + '" stroke-opacity=".2" stroke-width="3.2" stroke-linecap="round" filter="url(#k-b1)"/>';
    fx += '<ellipse ' + CXY(-.6, -31) + ' rx="4" ry="3" fill="url(#k-hi-r)" opacity=".75"/>';
    fx += '<path d="M' + P(-5, -27.5) + 'Q' + P(0, -25) + ' ' + P(5, -27.5) + '" class="st-crease" stroke-opacity=".5" stroke-width="1.1"/><circle ' + CXY(-3.3, -27.6) + ' r="1" fill="' + SHD + '" opacity=".4"/><circle ' + CXY(3.3, -27.6) + ' r="1" fill="' + SHD + '" opacity=".4"/>';
    if (mannequin) {
      fx += '<ellipse ' + CXY(-11, -49) + ' rx="8" ry="4" fill="' + SHD + '" opacity=".12"/><ellipse ' + CXY(11, -49) + ' rx="8" ry="4" fill="' + SHD + '" opacity=".16"/>';
    } else {
      /* brows, eyes, mouth */
      [-1, 1].forEach(function (sx) {
        var ex = sx * 11.5, sc = sx * yaw > .25 ? .8 : 1;
        fx += '<path d="M' + P(ex - 8 * sc, -57) + 'Q' + P(ex, -61.5) + ' ' + P(ex + 8 * sc, -58.5) + 'Q' + P(ex, -59.2) + ' ' + P(ex - 8 * sc, -55.8) + 'Z" fill="var(--st-hair)" opacity=".78"/>';
        if (open) {
          fx += '<ellipse ' + CXY(ex, -49) + ' rx="' + n2(6 * sc) + '" ry="3.1" fill="#F6F2EE"/><circle ' + CXY(ex + yaw * 1.5, -49) + ' r="2.8" fill="#4A3426"/><circle ' + CXY(ex + yaw * 1.5, -49) + ' r="1.2" fill="#141010"/><circle ' + CXY(ex + yaw * 1.5 - .9, -50) + ' r=".8" fill="#fff"/>';
          fx += '<path d="M' + P(ex - 6.4 * sc, -49) + 'Q' + P(ex, -53.4) + ' ' + P(ex + 6.4 * sc, -49) + '" class="st-crease" stroke-opacity=".8" stroke-width="1.2"/>';
        } else {
          fx += '<path d="M' + P(ex - 6.5 * sc, -49.5) + 'Q' + P(ex, -45.2) + ' ' + P(ex + 6.5 * sc, -49.5) + '" fill="none" stroke="#2c1d1b" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/>';
          fx += '<path d="M' + P(ex - 6 * sc, -49.7) + 'Q' + P(ex, -52.6) + ' ' + P(ex + 6 * sc, -49.7) + '" fill="none" stroke="' + SHD + '" stroke-opacity=".12" stroke-width="2.4" stroke-linecap="round"/>';
        }
      });
      fx += '<path d="M' + P(-8.5, -16.5) + 'Q' + P(-4, -19) + ' ' + P(0, -18.2) + 'Q' + P(4, -19) + ' ' + P(8.5, -16.5) + 'Q' + P(0, -15.2) + ' ' + P(-8.5, -16.5) + 'Z" fill="var(--st-lip)" opacity=".55"/>';
      fx += '<path d="M' + P(-8, -16.2) + 'Q' + P(0, -13.4) + ' ' + P(8, -16.2) + 'Q' + P(0, -10.4) + ' ' + P(-8, -16.2) + 'Z" fill="url(#k-lip)" opacity=".78"/>';
      fx += '<path d="M' + P(-8.5, -16.5) + 'Q' + P(0, -15) + ' ' + P(8.5, -16.5) + '" fill="none" stroke="#3a2222" stroke-opacity=".5" stroke-width="1"/>';
      fx += '<ellipse ' + CXY(-1.6, -13.2) + ' rx="3" ry="1" fill="#fff" opacity=".35"/>';
    }
    s += fx + '</g>' + grain(HEAD_D, .28) + '<path d="' + HEAD_D + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    if (layer !== 'back') s += hairShape(hair, 'front');
    return place(o, s);
  };
  function sideHead(o, layer) {
    var hair = o.hair || 'short', s = '';
    var d = 'M-2 -86C12 -86 23 -78 25 -66L25 -57C25 -54 23 -52 22 -49C24 -45 30 -40 33 -36C33 -33 29 -31 24 -30C26 -28 27 -25 26 -23C24 -21 24 -20 24 -18C26 -17 26 -14 24 -13C23 -10 24 -7 21 -4C18 0 10 2 4 -1C-4 -6 -10 -12 -16 -22C-24 -28 -29 -42 -28 -58C-27 -76 -16 -86 -2 -86Z';
    if (layer !== 'front') s += hair === 'long' ? '<path d="M-26 -60C-40 -30 -40 20 -30 56C-14 62 6 52 8 40C-4 10 -6 -40 6 -74Z" fill="url(#k-hair)"/>' : '';
    if (layer === 'back') return s;
    s += '<path d="' + d + '" fill="url(#k-skin-dome)"/><path d="' + d + '" fill="url(#k-sh-edge-h)" opacity=".7"/><path d="' + d + '" fill="url(#k-sh-b)" opacity=".6"/>';
    s += K.glint(8, -64, 12, 9, 0, .5) + '<ellipse ' + CXY(14, -34) + ' rx="8" ry="6" fill="url(#k-blush)"/>';
    s += '<path d="M' + P(8, -50) + 'Q' + P(14, -46) + ' ' + P(19.5, -50) + '" fill="none" stroke="#2c1d1b" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/>';
    s += '<path d="M' + P(7, -58) + 'Q' + P(15, -62) + ' ' + P(23, -58) + 'Q' + P(15, -59.6) + ' ' + P(7, -56.6) + 'Z" fill="var(--st-hair)" opacity=".78"/>';
    s += '<path d="M' + P(24, -17) + 'Q' + P(19, -15.5) + ' ' + P(15, -17) + '" fill="none" stroke="#3a2222" stroke-opacity=".5" stroke-width="1"/>';
    s += '<path d="M-14 -48C-21 -50 -21 -32 -14 -30C-9 -30 -8 -40 -8 -46Z" fill="url(#k-skin-dome)"/><path d="M-14.4 -45C-18 -44.5 -18 -36 -14 -34.4" class="st-crease" stroke-width=".8" stroke-opacity=".6"/><path d="M-14 -48C-21 -50 -21 -32 -14 -30" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    s += grain(d, .26) + '<path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    if (hair !== 'none') s += '<path d="M-29 -48C-33 -76 -18 -92 0 -92C14 -92 26 -84 27 -70C20 -78 6 -74 2 -62C-4 -50 -4 -44 -12 -46Z" fill="url(#k-hair)"/><path d="M-26 -70C-20 -84 -8 -88 4 -86" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.4"/>';
    return s;
  }
  /* ============================== 3. arms, hands, legs, feet ============================== */
  /* K.limb takes o.light (a vector towards the light, in the group's own coordinates) so shapes inside a rotated group stay lit from the upper left. */
  function localLight(rotDeg, flip) {
    var a = (rotDeg || 0) * RAD, ca = Math.cos(a), sa = Math.sin(a), lx = LIGHT[0] * ca + LIGHT[1] * sa, ly = -LIGHT[0] * sa + LIGHT[1] * ca;
    return [flip ? -lx : lx, ly];
  }
  K.localLight = localLight;
  var limbBase = K.limb;
  K.limb = function (p0, p1, w0, w1, o) {
    o = o || {};
    var m = limbD(p0, p1, w0, w1, o.bulge == null ? .05 : o.bulge), id = K.uid('lb'), Lv = o.light || LIGHT, sgn = (m.nx * Lv[0] + m.ny * Lv[1]) < 0 ? 1 : -1;
    var cx = (p0[0] + p1[0]) / 2, cy = (p0[1] + p1[1]) / 2, hw = Math.max(w0, w1) / 2 * 1.04, ax = m.nx * sgn, ay = m.ny * sgn;
    var s = ugrad(id, cx - ax * hw, cy - ay * hw, cx + ax * hw, cy + ay * hw, cylStops(false).join(''));
    s += '<path d="' + m.d + '" fill="url(#' + id + ')"/>';
    if (o.grain) s += grain(m.d, o.grain);
    s += '<path d="' + m.d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    return s;
  };

  /* ---------- hands ---------- */
  var HS = .38;   /* units per millimetre: the hand is drawn in millimetres and scaled to the body */
  function fingerD(len, w0, w1) {
    var N = 10, l = [], r = [], i;
    for (i = 0; i <= N; i++) {
      var t = i / N, w = w0 + (w1 - w0) * t;
      w *= 1 + .05 * Math.exp(-Math.pow((t - .5) / .08, 2)) + .035 * Math.exp(-Math.pow((t - .79) / .07, 2)) - .03 * Math.exp(-Math.pow((t - .64) / .06, 2));
      l.push([-w / 2, -len * t]); r.push([w / 2, -len * t]);
    }
    var d = 'M' + P(l[0][0], l[0][1]);
    for (i = 1; i <= N; i++) d += 'L' + P(l[i][0], l[i][1]);
    var rr = w1 / 2;
    d += 'A' + n2(rr) + ' ' + n2(rr * .96) + ' 0 0 1 ' + P(r[N][0], r[N][1]);
    for (i = N - 1; i >= 0; i--) d += 'L' + P(r[i][0], r[i][1]);
    return d + 'Z';
  }
  function nailD(w, nl, len) {
    var y0 = -len + 3.5, y1 = -len + nl, hw = w / 2;
    return 'M' + P(-hw, y1 - 3) + 'L' + P(-hw, y0 + nl * .3) + 'Q' + P(-hw, y0) + ' ' + P(0, y0) + 'Q' + P(hw, y0) + ' ' + P(hw, y0 + nl * .3) + 'L' + P(hw, y1 - 3) + 'Q' + P(hw * .5, y1 + 1.6) + ' ' + P(0, y1 + 1) + 'Q' + P(-hw * .5, y1 + 1.6) + ' ' + P(-hw, y1 - 3) + 'Z';
  }
  /* one finger, drawn upright from its base at (0,0); o: { x, y, len, w0, w1, rot, curl 0..1, nail, palm (palmar side), grad } */
  function digit(o) {
    var curl = o.curl || 0, len = o.len * (1 - .62 * curl), w0 = o.w0, w1 = o.w1 * (1 + .14 * curl), g = o.grad || 'skin-h', s = '';
    s += '<g transform="translate(' + P(o.x, o.y || 0) + ')' + (o.rot ? ' rotate(' + n2(o.rot) + ')' : '') + '">';
    var ext = o.ext || 0, d = fingerD(len + ext, w0, w1);
    if (ext) s = s.replace(/translate\(([-\d. ]+)\)/, function (m, p) { var q = p.split(' '); return 'translate(' + q[0] + ' ' + n2(+q[1] + ext) + ')'; });
    s += '<path d="' + d + '" fill="url(#k-' + g + ')"/>';
    if (curl > .55) s += '<ellipse ' + CXY(0, -len * .62) + ' rx="' + n2(w0 * .34) + '" ry="' + n2(len * .16) + '" fill="url(#k-hi-r)" opacity=".5"/>';
    else s += '<path d="' + d + '" fill="url(#k-sh-b)" opacity=".35"/>';
    /* knuckle creases, drawn on the back (or the pad creases on the palm) */
    var cr = function (t, wf, op) { var y = -len * t, hw = w1 * wf / 2 + (w0 - w1) * (1 - t) * .25; return '<path d="M' + P(-hw, y) + 'q' + P(hw, o.palm ? 1.8 : -1.8) + ' ' + P(hw * 2, 0) + '" class="st-crease" stroke-opacity="' + op + '" stroke-width=".9"/>'; };
    if (curl < .6) {
      s += cr(.5, .66, .45) + cr(.46, .5, .3) + cr(.79, .6, .4);
      if (o.palm) s += cr(.28, .68, .4) + cr(.08, .6, .3);
      if (!o.palm) s += K.glint(-w1 * .1, -len * .5, w1 * .3, len * .07, 0, .45);
    }
    if (o.nail && curl < .5 && !o.palm) {
      var nl = Math.min(len * .34, 25), nw = w1 * .72;
      s += '<path d="' + nailD(nw, nl, len) + '" fill="url(#k-nail)"/><path d="' + nailD(nw, nl, len) + '" class="st-contour" stroke-opacity="1" stroke-width=".7"/>';
      s += '<ellipse ' + CXY(-nw * .12, -len + nl * .38) + ' rx="' + n2(nw * .14) + '" ry="' + n2(nl * .2) + '" fill="#fff" opacity=".6" transform="rotate(-12 ' + P(-nw * .12, -len + nl * .38) + ')"/>';
      s += '<path d="M' + P(-nw * .36, -len + nl - 1.8) + 'Q' + P(0, -len + nl + 1.4) + ' ' + P(nw * .36, -len + nl - 1.8) + '" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.1"/>';
    }
    if (o.palm && curl < .5) s += '<ellipse ' + CXY(0, -len + 14) + ' rx="' + n2(w1 * .3) + '" ry="9" fill="url(#k-hi-r)" opacity=".35"/>';
    return s + '</g>';
  }
  var DIG = [  /* index, middle, ring, little: knuckle x, length, base and tip width */
    { x: -26.5, len: 72, w0: 17.5, w1: 15 }, { x: -8.8, len: 80, w0: 18, w1: 15.4 }, { x: 8.8, len: 73, w0: 17.5, w1: 14.8 }, { x: 26, len: 57, w0: 15.5, w1: 13 }
  ];
  var KY = -96;   /* the knuckle line */
  function thumb(o, Lv, tip, base, spread) {
    var s = '', p0 = base || [-24, -12], p1 = [-44, -44], p2 = tip || [-45, -92];
    s += K.limb(p0, p1, 27, 22, { light: Lv, bulge: .03 });
    s += K.limb(p1, p2, 21.5, 17, { light: Lv, bulge: .05 });
    if (!o.palm) {
      var dx = p2[0] - p1[0], dy = p2[1] - p1[1], ang = Math.atan2(dx, -dy) * 180 / Math.PI;
      s += '<g transform="translate(' + P(p2[0], p2[1]) + ') rotate(' + n2(ang) + ')">' + '<path d="' + nailD(14, 22, 19 * .5 + 8) + '" transform="translate(0 7)" fill="url(#k-nail)"/><path d="' + nailD(14, 22, 27) + '" transform="translate(0 7)" class="st-contour" stroke-opacity="1" stroke-width=".7"/></g>';
    }
    s += '<path d="M' + P(p1[0] - 7, p1[1] + 2) + 'q' + P(7, -2) + ' ' + P(14, 0) + '" class="st-crease" stroke-opacity=".4" stroke-width=".9"/>';
    return s;
  }
  function back(o, Lv) {
    var d = 'M-24 6C-30 -8 -42 -30 -41 -56C-41 -72 -39 -84 -37 -100L38 -100C40 -84 41 -70 38 -56C36 -32 30 -10 24 6C12 10 -12 10 -24 6Z', id = K.uid('bk'), s = '';
    s += '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".14" stop-color="#fff"/></linearGradient><mask id="' + id + '" maskUnits="userSpaceOnUse" x="-60" y="-110" width="120" height="130"><rect x="-60" y="-110" width="120" height="130" fill="url(#' + id + 'g)"/></mask>';
    s += '<g mask="url(#' + id + ')"><path d="' + d + '" fill="url(#k-skin-soft)"/><path d="' + d + '" fill="url(#k-sh-edge-h)" opacity=".5"/>';
    if (o.palm) {
      s += '<path d="' + d + '" fill="#fff" opacity=".1"/>';
      s += '<ellipse ' + CXY(-19, -36) + ' rx="19" ry="32" transform="rotate(-18 -19 -36)" fill="url(#k-hi-r)" opacity=".4"/>';
      s += '<path d="M-6 -86C-24 -76 -22 -50 -14 -34C-10 -24 -12 -12 -14 -4" class="st-crease" stroke-opacity=".5" stroke-width="1.1"/>';
      s += '<path d="M30 -70C14 -66 0 -62 -24 -66" class="st-crease" stroke-opacity=".42" stroke-width="1"/><path d="M32 -52C14 -50 -4 -44 -22 -44" class="st-crease" stroke-opacity=".34" stroke-width="1"/>';
    } else {
      s += '<ellipse ' + CXY(-10, -48) + ' rx="26" ry="34" fill="url(#k-hi-r)" opacity=".28"/>';
      [-16, -2, 12].forEach(function (x) { s += '<path d="M' + P(x * 1.15, -88) + 'Q' + P(x * .95, -50) + ' ' + P(x * .5, -10) + '" class="st-crease" stroke-opacity=".05" stroke-width="2.4"/>'; });
      s += '<ellipse ' + CXY(19, -2) + ' rx="6" ry="4" fill="url(#k-hi-r)" opacity=".5"/>';
    }
    s += '</g>';
    s += '<path d="M-24 6C-30 -8 -42 -30 -41 -56C-41 -72 -39 -84 -37 -100M24 6C30 -10 36 -32 38 -56C41 -70 40 -84 38 -100" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
    if (!o.palm) DIG.forEach(function (g) { s += K.glint(g.x, KY + 5, 8, 6, 0, .55); });
    return s;
  }
  var POSES = {
    flat3: function (o, Lv, G) {
      var s = '', f = DIG.map(function (g) { return Object.assign({}, g); });
      s += thumb(o, Lv, [-49, -84]);
      s += digit(Object.assign({}, f[3], { y: KY, curl: .9, grad: G, ext: 16 }));
      s += digit(Object.assign({}, f[2], { y: KY, nail: 1, grad: G, ext: 16 })) + digit(Object.assign({}, f[1], { y: KY, nail: 1, grad: G, ext: 16 })) + digit(Object.assign({}, f[0], { y: KY, nail: 1, grad: G, ext: 16 }));
      s += back(o, Lv);
      /* contact lines where the three fingers touch */
      [-17.6, 0].forEach(function (x) { s += '<path d="M' + P(x, KY - 6) + 'L' + P(x, KY - 70) + '" class="st-crease" stroke-opacity=".35" stroke-width="1"/>'; });
      return s;
    },
    open: function (o, Lv, G) {
      var s = thumb(o, Lv, [-76, -84], [-26, -14]) , rots = [-8, -2, 5, 13];
      s = s.replace('', '');
      [3, 2, 1, 0].forEach(function (i) { s += digit(Object.assign({}, DIG[i], { y: KY, rot: rots[i], nail: 1, grad: G, ext: 14 })); });
      s += back(o, Lv);
      return s;
    },
    point: function (o, Lv, G) {
      var s = '';
      s += digit(Object.assign({}, DIG[0], { y: KY, nail: 1, grad: G, ext: 14 }));
      [3, 2, 1].forEach(function (i) { s += digit(Object.assign({}, DIG[i], { y: KY + 2, curl: .92, grad: G, ext: 6 })); });
      s += back(o, Lv);
      s += thumb(o, Lv, [-34, -74], [-24, -12]);
      return s;
    },
    pinch: function (o, Lv, G) {
      var gap = o.gap == null ? 0 : o.gap, s = '';
      s += digit(Object.assign({}, DIG[0], { y: KY, rot: -16, curl: .36, nail: 1, grad: G, ext: 12 }));
      [3, 2, 1].forEach(function (i) { s += digit(Object.assign({}, DIG[i], { y: KY, curl: .72, grad: G, ext: 12 })); });
      s += back(o, Lv);
      s += thumb(o, Lv, [-24 + gap * 6, -88 + gap * 10], [-26, -14]);
      return s;
    },
    palm: function (o, Lv, G) {
      var s = '', rots = [-8, -2, 5, 13];
      s += thumb(Object.assign({}, o, { palm: true }), Lv, [-74, -82], [-26, -14]);
      [3, 2, 1, 0].forEach(function (i) { s += digit(Object.assign({}, DIG[i], { y: KY, rot: rots[i], palm: 1, grad: G, ext: 14 })); });
      s += back(Object.assign({}, o, { palm: true }), Lv);
      return s;
    },
    /* the four fingers wrapped round a handle that runs up the middle (x = 0), thumb over the top. For a mirror, a phone, a comb. */
    grip: function (o, Lv, G) {
      var s = '', ys = [-40, -16, 8, 32], ws = [60, 62, 58, 50];
      ys.forEach(function (y, i) {
        var d = 'M' + P(-ws[i] / 2, y) + 'L' + P(ws[i] / 2 - 9, y) + 'A11 11 0 0 1 ' + P(ws[i] / 2 - 9, y + 22) + 'L' + P(-ws[i] / 2, y + 22) + 'Z';
        var id = K.uid('gr');
        s += '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + [[0, lighter(16)], [.45, SK], [1, darker(48)]].map(function (x) { return stop(x[0], x[1]); }).join('') + '</linearGradient>';
        s += '<path d="' + d + '" fill="url(#' + id + ')"/><path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/><path d="M' + P(ws[i] / 2 - 18, y + 4) + 'q4 ' + 7 + ' 0 14" class="st-crease" stroke-width=".8" stroke-opacity=".4"/>';
      });
      s += '<path d="M-30 -42L-30 56C-38 60 -50 40 -48 4C-46 -24 -40 -38 -30 -42Z" fill="url(#k-skin-h)"/><path d="M-30 -42L-30 56C-38 60 -50 40 -48 4C-46 -24 -40 -38 -30 -42Z" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
      s += K.limb([-24, -34], [10, -72], 26, 19, { light: Lv, bulge: .04 });
      s += '<path d="' + nailD(13, 20, 22) + '" transform="translate(11 -62) rotate(32)" fill="url(#k-nail)" opacity=".95"/>';
      return s;
    },
    /* a cupped palm seen from the side, fingers curling up: for holding something in the hand */
    cup: function (o, Lv, G) {
      var s = '', bowl = 'M-40 -14C-34 12 -8 26 22 22C44 18 60 4 66 -22L50 -26C44 -8 30 2 14 4C-2 4 -16 -4 -20 -22Z';
      s += '<path d="' + bowl + '" fill="url(#k-skin-v)"/><path d="' + bowl + '" fill="url(#k-sh-b)"/><path d="' + bowl + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
      s += '<path d="M-20 -22C-16 -4 -2 4 14 4C30 2 44 -8 50 -26L50 -30C44 -14 30 -4 14 -2C-2 -2 -16 -10 -24 -28Z" fill="' + SHD + '" opacity=".16"/>';
      [3, 2, 1, 0].forEach(function (i) {
        var dx = i * -5, dy = i * -3;
        var p0 = [34 + dx, 10 + dy], p1 = [60 + dx, 2 + dy], p2 = [76 + dx, -20 + dy], p3 = [74 + dx, -44 + dy];
        s += K.limb(p0, p1, 17, 15, { light: Lv, bulge: .04 }) + K.limb(p1, p2, 15, 13.4, { light: Lv, bulge: .04 }) + K.limb(p2, p3, 13.4, 11.6, { light: Lv, bulge: .04 });
      });
      s += K.glint(12, 14, 26, 6, 0, .5);
      return s;
    }
  };
  /* K.hand({pose: 'flat3' | 'open' | 'palm' | 'point' | 'pinch' | 'grip' | 'cup', gap (pinch: 0 touching, 1 open), x, y, r, s, flip})
     (x, y) is the wrist; r turns the fingers (0 = up, 90 = to the right); s = 1 matches a body at the torso scale; flip = a left hand.
     'flat3': three flat fingers together (palpation), 'open'/'palm': open hand from the back or the palm, 'cup': a cupped palm from the side,
     'grip': four fingers wrapped round a handle that runs up the middle. Hands are about 74 units from wrist to middle fingertip at s = 1. */
  K.hand = function (o) {
    o = o || {};
    var pose = o.pose || 'flat3', Lv = localLight(o.r || 0, o.flip), G = Lv[0] < 0 ? 'skin-h' : 'skin-hr', fn = POSES[pose] || POSES.flat3;
    var s = fn(o, Lv, G);
    var oo = { x: o.x, y: o.y, r: o.r, flip: o.flip, s: (o.s == null ? 1 : o.s) * HS };
    return place(oo, s);
  };
  K.HAND = HS;

  /* ---------- arms ---------- */
  var ARM_POSE = {   /* [upper arm angle, forearm angle]: degrees from straight down, positive away from the body */
    down: [7, 3], relaxed: [10, -8], out: [88, 92], raised: [165, 176], bent: [22, -158], hip: [28, -62], behindHead: [140, -100], overHead: [172, 178], across: [-8, -112]
  };
  /* K.armPoints({side, shoulder, pose | upper, fore | wrist (+ bend), lenU, lenF}) -> { S, E, W, angle } in the figure's own coordinates. */
  K.armPoints = function (o) {
    o = o || {};
    var side = o.side === 'l' ? -1 : 1, S = o.shoulder || [side * 70, 14], LU = o.lenU || 104, LF = o.lenF || 92, E, W;
    if (o.wrist) {
      W = o.wrist;
      var dx = W[0] - S[0], dy = W[1] - S[1], d = Math.min(Math.hypot(dx, dy), LU + LF - .5);
      d = Math.max(d, Math.abs(LU - LF) + .5);
      var ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1), a = (LU * LU - LF * LF + d * d) / (2 * d), h = Math.sqrt(Math.max(0, LU * LU - a * a)), bend = o.bend == null ? side : o.bend;
      E = [S[0] + ux * a - uy * h * bend, S[1] + uy * a + ux * h * bend];
      W = [S[0] + ux * d, S[1] + uy * d];
    } else {
      var ang = o.upper != null ? [o.upper, o.fore] : (ARM_POSE[o.pose || 'down'] || ARM_POSE.down), a1 = ang[0] * RAD, a2 = (ang[1] != null ? ang[1] : ang[0]) * RAD;
      E = [S[0] + side * Math.sin(a1) * LU, S[1] + Math.cos(a1) * LU];
      W = [E[0] + side * Math.sin(a2) * LF, E[1] + Math.cos(a2) * LF];
    }
    return { S: S, E: E, W: W, angle: Math.atan2(W[0] - E[0], -(W[1] - E[1])) * 180 / Math.PI };
  };
  /* K.arm({side: 'l' | 'r' (the side of the picture), shoulder, pose: 'down' | 'relaxed' | 'out' | 'raised' | 'bent' | 'hip' | 'behindHead' | 'overHead' | 'across',
     or upper and fore angles, or wrist [x, y] with bend 1 | -1 (which way the elbow points), lenU, lenF, thick (1 default; 1.12 for a male arm),
     hand: a pose name for K.hand or omitted, handRot (extra degrees), handFlip, handGap, x, y, s, r, flip})
     Origin: the notch of the throat, like K.torso, so draw the arm with the same x, y, s as the torso. */
  K.arm = function (o) {
    o = o || {};
    var p = K.armPoints(o), th = o.thick || 1, s = '', side = o.side === 'l' ? -1 : 1;
    s += K.limb(p.S, p.E, 40 * th, 30 * th, { bulge: .06 });
    s += K.limb(p.E, p.W, 29 * th, 19.5 * th, { bulge: .1 });
    /* elbow and shoulder joints hide the seams between the segments */
    s += '<circle ' + CXY(p.E[0], p.E[1]) + ' r="' + n2(14.5 * th) + '" fill="url(#k-skin-dome)"/><ellipse ' + CXY(p.E[0] - 2, p.E[1] + 1) + ' rx="6" ry="4" fill="url(#k-sh-r-soft)" opacity=".5"/>';
    s += '<circle ' + CXY(p.S[0] + side * 4, p.S[1] - 2) + ' r="' + n2(21 * th) + '" fill="url(#k-bdome)"/>';
    if (o.hand) s += K.hand({ pose: o.hand, x: p.W[0], y: p.W[1], r: p.angle + (o.handRot || 0), flip: o.handFlip != null ? o.handFlip : (side > 0 ? false : true), gap: o.handGap, s: (o.hs || 1) * th });
    return place(o, s);
  };

  /* ---------- legs and feet ---------- */
  /* K.leg({side, hip, knee, ankle, thick, x, y, s, r, flip}): a thigh and a shin. Points are in the figure's own coordinates. */
  K.leg = function (o) {
    o = o || {};
    var hip = o.hip || [0, 0], knee = o.knee || [0, 150], ankle = o.ankle || [0, 290], th = o.thick || 1, s = '';
    s += K.limb(hip, knee, 52 * th, 36 * th, { bulge: .07 });
    s += K.limb(knee, ankle, 34 * th, 21 * th, { bulge: .1 });
    s += '<circle ' + CXY(knee[0], knee[1]) + ' r="' + n2(18 * th) + '" fill="url(#k-skin-dome)"/><ellipse ' + CXY(knee[0] - 3, knee[1] - 3) + ' rx="7" ry="6" fill="url(#k-hi-r)" opacity=".4"/>';
    return place(o, s);
  };
  var TOES = [[-11, -93, 8.6, 12], [-1.6, -91, 6.4, 10.4], [6.6, -86, 5.8, 9.4], [13.4, -79.5, 5.4, 8.6], [19.4, -71, 4.8, 7.4]];
  /* K.foot({view: 'top' | 'sole' | 'side', x, y, s, r, flip}): a right foot, toes up, about 100 units long; origin at the back of the heel. */
  K.foot = function (o) {
    o = o || {};
    var view = o.view || 'top', s = '';
    if (view === 'side') {
      var ds = 'M-8 -50C-10 -30 -6 -8 8 0C30 6 70 6 92 -4C100 -8 102 -18 94 -22C80 -26 66 -30 56 -42C46 -56 28 -58 14 -56C2 -56 -6 -56 -8 -50Z';
      s = '<path d="' + ds + '" fill="url(#k-skin-v)"/><path d="' + ds + '" fill="url(#k-sh-b)"/><path d="M-8 -50C-6 -60 10 -66 14 -56" fill="url(#k-skin-h)"/>' + K.glint(30, -38, 24, 8, 8, .5) + '<path d="' + ds + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>' + grain(ds, .25);
      s += '<path d="M90 -22C94 -26 98 -24 98 -20" class="st-crease" stroke-opacity=".28" stroke-width=".8"/><path d="M96 -12C98 -16 101 -14 101 -10" class="st-crease" stroke-opacity=".28" stroke-width=".8"/>';
      return place(o, s);
    }
    var d = view === 'sole' ? 'M-19 -4C-22 -22 -19 -44 -18 -60C-17 -70 -19 -80 -17 -86C-10 -92 14 -92 20 -80C24 -70 24 -52 24 -40C24 -26 22 -10 18 -3C12 6 -14 8 -19 -4Z'
      : 'M-17 -4C-22 -20 -19 -48 -17 -66C-16 -76 -16 -84 -14 -88C-6 -94 16 -92 21 -78C24 -66 24 -48 24 -36C24 -24 22 -10 18 -3C12 6 -12 8 -17 -4Z';
    s += '<path d="' + d + '" fill="url(#k-' + (view === 'sole' ? 'skin-soft' : 'skin-h') + ')"/>';
    if (view === 'sole') {
      s += '<path d="' + d + '" fill="#fff" opacity=".1"/><path d="M-19 -40C-8 -34 4 -34 12 -40C18 -22 14 -12 4 -8C-8 -6 -16 -14 -19 -40Z" fill="' + SHD + '" opacity=".1"/>';
      s += '<ellipse ' + CXY(-4, -62) + ' rx="15" ry="11" fill="url(#k-hi-r)" opacity=".45"/><ellipse ' + CXY(0, -6) + ' rx="14" ry="9" fill="url(#k-hi-r)" opacity=".4"/>';
      [[-30, 3], [-24, 3], [-18, 3]].forEach(function (c) { s += '<path d="M-14 ' + c[0] + 'C-6 ' + (c[0] + 4) + ' 6 ' + (c[0] + 4) + ' 16 ' + c[0] + '" class="st-crease" stroke-width=".8" stroke-opacity=".28"/>'; });
      TOES.forEach(function (t, i) { s += '<ellipse ' + CXY(t[0], t[1] + 3) + ' rx="' + n2(t[2]) + '" ry="' + n2(t[3] * .86) + '" fill="url(#k-skin-dome-soft)"/><ellipse ' + CXY(t[0] - 1, t[1] - 2) + ' rx="' + n2(t[2] * .5) + '" ry="3" fill="url(#k-hi-r)" opacity=".4"/><path d="M' + P(t[0] - t[2] * .6, t[1] + t[3] * .9) + 'q' + P(t[2] * .6, 2.2) + ' ' + P(t[2] * 1.2, 0) + '" class="st-crease" stroke-width=".8" stroke-opacity=".4"/>'; });
    } else {
      s += '<path d="' + d + '" fill="url(#k-sh-edge-h)" opacity=".8"/><path d="M-4 -82C-6 -60 -4 -30 -2 -8" class="st-crease" stroke-opacity=".12" stroke-width="2.6"/>';
      s += K.glint(-4, -58, 11, 22, 4, .4);
      for (var i = TOES.length - 1; i >= 0; i--) {
        var t = TOES[i], td = 'M' + P(t[0] - t[2], t[1] + t[3] * .5) + 'C' + P(t[0] - t[2], t[1] - t[3] * .9) + ' ' + P(t[0] + t[2], t[1] - t[3] * .9) + ' ' + P(t[0] + t[2], t[1] + t[3] * .5) + 'C' + P(t[0] + t[2] * .7, t[1] + t[3] * .9) + ' ' + P(t[0] - t[2] * .7, t[1] + t[3] * .9) + ' ' + P(t[0] - t[2], t[1] + t[3] * .5) + 'Z';
        s += '<path d="' + td + '" fill="url(#k-skin-dome)"/><path d="' + td + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>';
        var nw = t[2] * 1.15, ny = t[1] - t[3] * .62;
        s += '<path d="M' + P(t[0] - nw / 2, ny + 3.6) + 'Q' + P(t[0] - nw / 2, ny) + ' ' + P(t[0], ny) + 'Q' + P(t[0] + nw / 2, ny) + ' ' + P(t[0] + nw / 2, ny + 3.6) + 'Q' + P(t[0], ny + 5.6) + ' ' + P(t[0] - nw / 2, ny + 3.6) + 'Z" fill="url(#k-nail)"/>';
        s += '<ellipse ' + CXY(t[0] - nw * .15, ny + 1.8) + ' rx="1.1" ry=".8" fill="#fff" opacity=".6"/>';
      }
    }
    s += '<path d="' + d + '" class="st-contour" stroke-opacity="1" stroke-width=".9"/>' + grain(d, .24);
    return place(o, s);
  };
  /* ============================== 4. props ============================== */
  function rr(x, y, w, h, r) {
    return 'M' + P(x + r, y) + 'L' + P(x + w - r, y) + 'Q' + P(x + w, y) + ' ' + P(x + w, y + r) + 'L' + P(x + w, y + h - r) + 'Q' + P(x + w, y + h) + ' ' + P(x + w - r, y + h) + 'L' + P(x + r, y + h) + 'Q' + P(x, y + h) + ' ' + P(x, y + h - r) + 'L' + P(x, y + r) + 'Q' + P(x, y) + ' ' + P(x + r, y) + 'Z';
  }
  K.rr = rr;
  function rnd(seed) { var a = (seed || 1) >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  K.rnd = rnd;

  /* Soft fold lines on cloth: K.folds(x, y, w, h, n, angle, seed). Light on the upper side, shade on the lower, no filters. */
  K.folds = function (x, y, w, h, n, angle, seed) {
    var r = rnd(seed || 5), s = '<g transform="rotate(' + (angle || 0) + ' ' + P(x + w / 2, y + h / 2) + ')">', i;
    for (i = 0; i < n; i++) {
      var yy = y + (i + .5) / n * h + (r() - .5) * h / n * .6, a = (r() - .5) * 10, b = (r() - .5) * 10, d = 'M' + P(x, yy + a) + 'C' + P(x + w * .3, yy + b) + ' ' + P(x + w * .65, yy - a) + ' ' + P(x + w, yy + b);
      s += '<path d="' + d + '" transform="translate(0 3)" fill="none" stroke="' + SHD + '" stroke-opacity="' + (.05 + r() * .05) + '" stroke-width="' + n2(5 + r() * 4) + '" stroke-linecap="round" filter="url(#k-b2)"/>';
      s += '<path d="' + d + '" transform="translate(0 -1.5)" fill="none" stroke="#fff" stroke-opacity="' + (.14 + r() * .12) + '" stroke-width="' + n2(2 + r() * 2) + '" stroke-linecap="round" filter="url(#k-b1)"/>';
    }
    return s + '</g>';
  };
  /* A cloth shape: K.cloth(d, {kind: 'sheet' | 'towel' | 'pillow' | 'sheet-tint', folds: n, seed}) */
  K.cloth = function (d, o) {
    o = o || {};
    var kind = o.kind || 'sheet', fill = kind === 'pillow' ? 'url(#k-pillow)' : kind === 'towel' ? 'url(#k-towel)' : kind === 'sheet-tint' ? 'url(#k-sheet-tint)' : 'url(#k-sheet)';
    var s = '<path d="' + d + '" fill="' + fill + '"/>';
    if (o.fibre !== false) s += '<path d="' + d + '" fill="#000" opacity=".16" filter="url(#k-fibre)"/>';
    return s + '<path d="' + d + '" class="st-contour" stroke-opacity=".6"/>';
  };
  /* K.pillow({x, y, w, h, r, s}): a plump pillow with soft dents and a contact shadow; origin at the centre. */
  K.pillow = function (o) {
    o = o || {};
    var w = o.w || 150, h = o.h || 90, hw = w / 2, hh = h / 2, d = 'M' + P(-hw + 14, -hh) + 'Q' + P(0, -hh + 9) + ' ' + P(hw - 14, -hh) + 'Q' + P(hw + 2, -hh) + ' ' + P(hw, -hh + 16) + 'Q' + P(hw - 8, 0) + ' ' + P(hw, hh - 16) + 'Q' + P(hw + 2, hh) + ' ' + P(hw - 14, hh) + 'Q' + P(0, hh - 9) + ' ' + P(-hw + 14, hh) + 'Q' + P(-hw - 2, hh) + ' ' + P(-hw, hh - 16) + 'Q' + P(-hw + 8, 0) + ' ' + P(-hw, -hh + 16) + 'Q' + P(-hw - 2, -hh) + ' ' + P(-hw + 14, -hh) + 'Z';
    var s = K.contact(2, hh * .5, hw * 1.06, hh * .9, .8) + K.cloth(d, { kind: 'pillow', seed: 3 });
    s += K.glint(-hw * .28, -hh * .28, hw * .5, hh * .32, -8, .5);
    s += '<path d="M' + P(-hw + 6, -hh + 6) + 'Q' + P(-hw + 22, 0) + ' ' + P(-hw + 6, hh - 6) + '" fill="none" stroke="' + SHD + '" stroke-opacity=".1" stroke-width="3" stroke-linecap="round" filter="url(#k-b2)"/>';
    s += '<path d="M' + P(hw - 30, -hh + 8) + 'Q' + P(hw - 18, 0) + ' ' + P(hw - 30, hh - 8) + '" fill="none" stroke="' + SHD + '" stroke-opacity=".12" stroke-width="4" stroke-linecap="round" filter="url(#k-b3)"/>';
    return place(o, s);
  };
  /* K.bed({x, y, w, h, tint}): a bed seen from above: frame, mattress with sheet, soft vignette. Origin top left. The sheet over the body is drawn by the scene (K.cloth). */
  K.bed = function (o) {
    o = o || {};
    var w = o.w || 360, h = o.h || 300, s = '';
    s += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#k-wood)"/>';
    s += '<path d="' + rr(14, 12, w - 28, h - 24, 18) + '" fill="' + SHD + '" opacity=".35" transform="translate(0 3)" filter="url(#k-b3)"/>';
    s += K.cloth(rr(14, 12, w - 28, h - 24, 18), { kind: o.tint ? 'sheet-tint' : 'sheet', fibre: false });
    s += K.folds(24, 30, w - 48, h - 60, 6, -4, 7);
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#k-vig)"/>';
    return place(o, s);
  };
  /* K.room({kind: 'wall' | 'bath' | 'bed', w, h}): a backdrop with a soft vignette. */
  K.room = function (o) {
    o = o || {};
    var w = o.w || 360, h = o.h || 300, kind = o.kind || 'wall', s = '';
    if (kind === 'bath') s += '<rect width="' + w + '" height="' + h + '" fill="url(#k-tile)"/><rect width="' + w + '" height="' + h + '" fill="url(#k-vig)"/>';
    else s += '<rect width="' + w + '" height="' + h + '" fill="url(#k-wall)"/>' + (kind === 'bed' ? '<rect y="' + h * .82 + '" width="' + w + '" height="' + h * .18 + '" fill="var(--st-floor)"/><rect y="' + (h * .82 - 2) + '" width="' + w + '" height="3" fill="' + SHD + '" opacity=".12"/>' : '') + '<rect width="' + w + '" height="' + h + '" fill="url(#k-vig)"/>';
    return place(o, s);
  };
  /* K.desk({x, y, w, h}): a wooden desk top seen from above, with grain. */
  K.desk = function (o) {
    o = o || {};
    var w = o.w || 360, h = o.h || 300, s = '<rect width="' + w + '" height="' + h + '" fill="url(#k-wood)"/>', r = rnd(11), i;
    for (i = 0; i < 16; i++) { var y = r() * h; s += '<path d="M0 ' + n2(y) + 'C' + P(w * .3, y + (r() - .5) * 14) + ' ' + P(w * .7, y + (r() - .5) * 14) + ' ' + P(w, y + (r() - .5) * 10) + '" fill="none" stroke="' + SHD + '" stroke-opacity="' + n2(.06 + r() * .1) + '" stroke-width="' + n2(.6 + r() * 1.6) + '"/>'; }
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#k-hi-v)" opacity=".5"/><rect width="' + w + '" height="' + h + '" fill="url(#k-vig)"/>';
    return place(o, s);
  };
  /* K.showerHead({x, y, s, r, c, streams}): a shower head, origin at the middle of its face, pointing down. With the scene context c the water runs and steam rises. */
  K.showerHead = function (o) {
    o = o || {};
    var c = o.c, s = '', n = o.streams || 9, i;
    s += '<path d="M-5 -46L5 -46L5 -22L-5 -22Z" fill="url(#k-metal)"/><path d="M-5 -46L5 -46L5 -22L-5 -22Z" class="st-contour" stroke-opacity=".5"/>';
    s += '<path d="M-14 -22C-14 -28 14 -28 14 -22L26 -4C28 0 24 6 18 6L-18 6C-24 6 -28 0 -26 -4Z" fill="url(#k-metal)"/><path d="M-14 -22C-14 -28 14 -28 14 -22L26 -4C28 0 24 6 18 6L-18 6C-24 6 -28 0 -26 -4Z" class="st-contour" stroke-opacity=".6"/>';
    s += '<ellipse cx="0" cy="6" rx="26" ry="5" fill="url(#k-metal-v)"/><ellipse cx="0" cy="6" rx="22" ry="3.4" fill="' + SHD + '" opacity=".35"/>';
    for (i = 0; i < 11; i++) s += '<circle cx="' + n2(-18 + i * 3.6) + '" cy="6.4" r=".9" fill="#fff" opacity=".7"/>';
    s += K.glint(-10, -10, 8, 5, -20, .8);
    var water = '', hs = '';
    for (i = 0; i < n; i++) {
      var x0 = -17 + i * (34 / (n - 1)), x1 = x0 * 2.2 + (i - (n - 1) / 2) * 1.2;
      water += '<path d="M' + P(x0, 8) + 'L' + P(x1, o.len || 112) + '" stroke="#fff" stroke-opacity=".78" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="7 9" fill="none"/>' +
        '<path d="M' + P(x0 + .3, 8) + 'L' + P(x1 + .3, o.len || 112) + '" stroke="var(--st-water)" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="7 9" fill="none"/>';
    }
    if (c) {
      var A1 = c.loop(.8, [{ t: 0, y: 0, o: 0 }, { t: .12, o: 1 }, { t: .8, y: 16, o: 0 }], '<g>' + water + '</g>', { ease: 'linear' });
      var A2 = c.loop(.8, [{ t: 0, y: -8, o: 0 }, { t: .12, o: 1 }, { t: .8, y: 8, o: 0 }], '<g>' + water + '</g>', { ease: 'linear' });
      hs = A1 + A2;
      for (i = 0; i < 3; i++) hs += c.loop(3.2, [{ t: 0, x: (i - 1) * 16, y: 80, o: 0, s: .6 }, { t: .5, o: .55 }, { t: 3.2, x: (i - 1) * 30 + 10, y: 10, o: 0, s: 1.7 }], '<circle cx="0" cy="0" r="22" fill="url(#k-hi-r)"/>', { ease: 'linear', center: true });
    } else hs = '<g opacity=".7">' + water + '</g>';
    return place(o, hs + s);
  };
  /* K.wallMirror({x, y, w, h, r, content, tilt}): a framed wall mirror; content is what shows in the glass (clipped), drawn in the mirror's own coordinates (origin top left of the glass). */
  K.wallMirror = function (o) {
    o = o || {};
    var w = o.w || 110, h = o.h || 200, id = K.uid('wm'), s = '', fr = 7;
    s += '<path d="' + rr(-fr, -fr, w + fr * 2, h + fr * 2, 16) + '" fill="' + SHD + '" opacity=".4" transform="translate(3 6)" filter="url(#k-b3)"/>';
    s += '<path d="' + rr(-fr, -fr, w + fr * 2, h + fr * 2, 16) + '" fill="var(--st-frame)"/><path d="' + rr(-fr, -fr, w + fr * 2, h + fr * 2, 16) + '" fill="url(#k-hi-v)" opacity=".5"/>';
    s += '<clipPath id="' + id + '"><path d="' + rr(0, 0, w, h, 10) + '"/></clipPath><path d="' + rr(0, 0, w, h, 10) + '" fill="url(#k-mirror)"/>';
    s += '<g clip-path="url(#' + id + ')">' + (o.content || '') + '<rect width="' + w + '" height="' + h + '" fill="url(#k-streak)"/><rect width="' + w + '" height="' + h + '" fill="url(#k-sh-edge-h)" opacity=".5"/></g>';
    s += '<path d="' + rr(0, 0, w, h, 10) + '" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>';
    return place(o, s);
  };
  /* K.reflect(inner, {axis}): a reflection in a mirror: the scene flipped about the vertical line x = axis, a little softer. */
  K.reflect = function (inner, o) {
    o = o || {};
    var ax = o.axis == null ? 0 : o.axis;
    return '<g transform="translate(' + n2(2 * ax) + ' 0) scale(-1 1)" opacity="' + (o.opacity == null ? .92 : o.opacity) + '">' + inner + '</g><rect x="' + (o.x || -999) + '" y="' + (o.y || -999) + '" width="' + (o.w || 3000) + '" height="' + (o.h || 3000) + '" fill="var(--st-mirror)" opacity=".14"/>';
  };
  /* K.handMirror({x, y, s, r, content}): a round hand mirror with a handle running down; origin at the centre of the glass (radius 30). */
  K.handMirror = function (o) {
    o = o || {};
    var id = K.uid('hm'), R = 30, s = '';
    s += '<path d="M-5 28L5 28L7 92C7 98 -7 98 -7 92Z" fill="url(#k-metal)"/><path d="M-5 28L5 28L7 92C7 98 -7 98 -7 92Z" class="st-contour" stroke-opacity=".6"/>';
    s += '<circle cx="2" cy="4" r="' + (R + 5) + '" fill="' + SHD + '" opacity=".3" filter="url(#k-b3)"/><circle r="' + (R + 4) + '" fill="url(#k-metal)"/><circle r="' + (R + 4) + '" class="st-contour" stroke-opacity=".6"/>';
    s += '<clipPath id="' + id + '"><circle r="' + R + '"/></clipPath><circle r="' + R + '" fill="url(#k-mirror)"/><g clip-path="url(#' + id + ')">' + (o.content || '') + '<circle r="' + R + '" fill="url(#k-streak)"/></g>';
    s += '<circle r="' + R + '" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2"/>';
    return place(o, s);
  };
  /* K.comb({x, y, s, r}): a comb with its teeth down; origin at the middle of the spine. */
  K.comb = function (o) {
    o = o || {};
    var s = '', i;
    s += '<path d="' + rr(-40, -8, 80, 10, 4) + '" transform="translate(1.5 3)" fill="' + SHD + '" opacity=".25" filter="url(#k-b1)"/>';
    for (i = 0; i < 22; i++) s += '<path d="M' + n2(-37 + i * 3.4) + ' 0L' + n2(-37 + i * 3.4) + ' 22" stroke="var(--st-metal-d)" stroke-width="1.7" stroke-linecap="round"/><path d="M' + n2(-37.4 + i * 3.4) + ' 0L' + n2(-37.4 + i * 3.4) + ' 20" stroke="#fff" stroke-opacity=".5" stroke-width=".7" stroke-linecap="round"/>';
    s += '<path d="' + rr(-40, -8, 80, 11, 4.5) + '" fill="url(#k-metal-v)"/><path d="' + rr(-40, -8, 80, 11, 4.5) + '" class="st-contour" stroke-opacity=".6"/>';
    return place(o, s);
  };
  /* K.ruler({x, y, cm, u, s, r}): a transparent ruler, cm centimetres long, u units to the centimetre (default 38 = the body scale); origin at its left end, top edge. */
  K.ruler = function (o) {
    o = o || {};
    var cm = o.cm || 10, u = o.u || 38, w = cm * u, s = '', i, h = 26;
    s += '<path d="' + rr(-8, 0, w + 16, h, 3) + '" fill="' + SHD + '" opacity=".22" transform="translate(2 4)" filter="url(#k-b2)"/>';
    s += '<path d="' + rr(-8, 0, w + 16, h, 3) + '" fill="var(--st-glass)" fill-opacity=".72"/><path d="' + rr(-8, 0, w + 16, h, 3) + '" fill="url(#k-hi-v)"/><path d="' + rr(-8, 0, w + 16, h, 3) + '" class="st-contour" stroke-opacity=".7"/>';
    var tk = '', tb = '';
    for (i = 0; i <= cm * 10; i++) {
      var x = i * u / 10, big = i % 10 === 0, mid = i % 5 === 0;
      if (big) tb += 'M' + n2(x) + ' 0v11'; else tk += 'M' + n2(x) + ' 0v' + (mid ? 8 : 5);
      if (big && i < cm * 10) s += '<text x="' + n2(x + 2.2) + '" y="22" font-size="9" font-weight="700" fill="var(--st-ink)" fill-opacity=".85">' + (i / 10) + '</text>';
    }
    s += '<path d="' + tk + '" stroke="var(--st-ink)" stroke-opacity=".8" stroke-width=".7"/><path d="' + tb + '" stroke="var(--st-ink)" stroke-opacity=".85" stroke-width="1.1"/>';
    return place(o, s);
  };
  /* K.eraser({x, y, s, r}): the rubber end of a pencil (about 6 mm across, to compare a mole with); the rubber is at the origin, the pencil runs down. */
  K.eraser = function (o) {
    o = o || {};
    var u = o.u || 38, w = .62 * u, s = '';
    s += '<path d="M' + P(-w / 2 - 1, 0) + 'L' + P(w / 2 + 1, 0) + 'L' + P(w / 2 + 1, 150) + 'L' + P(-w / 2 - 1, 150) + 'Z" fill="' + SHD + '" opacity=".22" transform="translate(5 5)" filter="url(#k-b2)"/>';
    s += '<path d="M' + P(-w / 2, 40) + 'L' + P(w / 2, 40) + 'L' + P(w / 2, 150) + 'L' + P(-w / 2, 150) + 'Z" fill="#E4B93C"/><path d="M' + P(-w / 2, 40) + 'L' + P(-w * .1, 40) + 'L' + P(-w * .1, 150) + 'L' + P(-w / 2, 150) + 'Z" fill="#fff" opacity=".28"/><path d="M' + P(w * .18, 40) + 'L' + P(w / 2, 40) + 'L' + P(w / 2, 150) + 'L' + P(w * .18, 150) + 'Z" fill="' + SHD + '" opacity=".2"/>';
    s += '<rect x="' + n2(-w / 2) + '" y="14" width="' + n2(w) + '" height="26" fill="url(#k-metal)"/><path d="M' + P(-w / 2, 22) + 'L' + P(w / 2, 22) + 'M' + P(-w / 2, 31) + 'L' + P(w / 2, 31) + '" stroke="' + SHD + '" stroke-opacity=".3"/>';
    s += '<path d="M' + P(-w / 2, 14) + 'L' + P(-w / 2, 6) + 'Q' + P(-w / 2, 0) + ' ' + P(0, 0) + 'Q' + P(w / 2, 0) + ' ' + P(w / 2, 6) + 'L' + P(w / 2, 14) + 'Z" fill="#E98C97"/><path d="M' + P(-w / 2, 14) + 'L' + P(-w / 2, 6) + 'Q' + P(-w / 2, 0) + ' ' + P(-w * .1, 0) + 'L' + P(-w * .1, 14) + 'Z" fill="#fff" opacity=".3"/><path d="M' + P(w * .2, 0) + 'Q' + P(w / 2, 0) + ' ' + P(w / 2, 6) + 'L' + P(w / 2, 14) + 'L' + P(w * .2, 14) + 'Z" fill="' + SHD + '" opacity=".16"/>';
    return place(o, s);
  };
  /* K.phone({x, y, s, r, w, h, screen: 'camera' | 'dark', content}): a phone with a camera viewfinder on the screen; origin at the centre. content is drawn inside the screen (clipped). */
  K.phone = function (o) {
    o = o || {};
    var w = o.w || 92, h = o.h || 176, id = K.uid('ph'), s = '';
    s += '<path d="' + rr(-w / 2, -h / 2, w, h, 14) + '" fill="' + SHD + '" opacity=".35" transform="translate(3 7)" filter="url(#k-b3)"/>';
    s += '<path d="' + rr(-w / 2, -h / 2, w, h, 14) + '" fill="#1B1E24"/><path d="' + rr(-w / 2, -h / 2, w, h, 14) + '" fill="url(#k-hi-tl)" opacity=".5"/><path d="' + rr(-w / 2, -h / 2, w, h, 14) + '" class="st-contour" stroke-opacity=".8"/>';
    var sw = w - 9, sh = h - 18;
    s += '<clipPath id="' + id + '"><path d="' + rr(-sw / 2, -sh / 2 + 1, sw, sh, 9) + '"/></clipPath><path d="' + rr(-sw / 2, -sh / 2 + 1, sw, sh, 9) + '" fill="#0E1116"/>';
    s += '<g clip-path="url(#' + id + ')">' + (o.content || '');
    if (o.screen !== 'dark') {
      var m = 11, x0 = -sw / 2 + m, x1 = sw / 2 - m, y0 = -sh / 2 + 22, y1 = sh / 2 - 44;
      [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(function (c) { s += '<path d="M' + P(c[0], c[1] + c[3] * 10) + 'L' + P(c[0], c[1]) + 'L' + P(c[0] + c[2] * 10, c[1]) + '" fill="none" stroke="#FFD43B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'; });
      s += '<circle cx="0" cy="' + n2(sh / 2 - 22) + '" r="10" fill="none" stroke="#fff" stroke-width="2"/><circle cx="0" cy="' + n2(sh / 2 - 22) + '" r="7" fill="#fff"/>';
    }
    s += '<rect x="' + n2(-sw / 2) + '" y="' + n2(-sh / 2) + '" width="' + sw + '" height="' + sh + '" fill="url(#k-streak)" opacity=".5"/></g>';
    s += '<circle cx="0" cy="' + n2(-h / 2 + 5.4) + '" r="1.5" fill="#3A4150"/>';
    return place(o, s);
  };
  /* K.calendar({x, y, w, h, month, day, marks}): a calendar page; marks = day numbers to ring. Origin top left. */
  K.calendar = function (o) {
    o = o || {};
    var w = o.w || 104, h = o.h || 96, s = '', hd = 24;
    s += '<path d="' + rr(0, 0, w, h, 8) + '" fill="' + SHD + '" opacity=".3" transform="translate(2 4)" filter="url(#k-b2)"/><path d="' + rr(0, 0, w, h, 8) + '" fill="url(#k-paper)"/>';
    s += '<path d="M8 0L' + (w - 8) + ' 0Q' + w + ' 0 ' + w + ' 8L' + w + ' ' + hd + 'L0 ' + hd + 'L0 8Q0 0 8 0Z" fill="var(--st-guide)"/>';
    s += '<text x="' + w / 2 + '" y="17" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff">' + A.esc(o.month || '') + '</text>';
    s += '<circle cx="22" cy="2" r="3" fill="var(--st-metal-d)"/><circle cx="' + (w - 22) + '" cy="2" r="3" fill="var(--st-metal-d)"/>';
    var i, marks = o.marks || [];
    for (i = 0; i < 28; i++) {
      var cx = 9 + (i % 7) * ((w - 18) / 6), cy = hd + 12 + Math.floor(i / 7) * ((h - hd - 18) / 3), mk = marks.indexOf(i + 1) >= 0;
      if (mk) s += '<circle cx="' + n2(cx) + '" cy="' + n2(cy) + '" r="6.2" fill="none" stroke="var(--st-guide)" stroke-width="1.8"/>';
      s += '<circle cx="' + n2(cx) + '" cy="' + n2(cy) + '" r="1.5" fill="var(--st-ink)" opacity="' + (mk ? .9 : .35) + '"/>';
    }
    return place(o, s);
  };
  /* K.clock({x, y, r, hour, minute, s}): a round wall clock; origin at the centre. */
  K.clock = function (o) {
    o = o || {};
    var R = o.r || 22, s = '', i, hh = ((o.hour == null ? 10 : o.hour) % 12 + (o.minute || 10) / 60) * 30, mm = (o.minute == null ? 10 : o.minute) * 6;
    s += '<circle cx="1.5" cy="3" r="' + (R + 2) + '" fill="' + SHD + '" opacity=".3" filter="url(#k-b2)"/><circle r="' + (R + 3) + '" fill="url(#k-metal)"/><circle r="' + R + '" fill="url(#k-paper)"/><circle r="' + R + '" fill="url(#k-hi-tl)"/>';
    for (i = 0; i < 12; i++) s += '<path d="M0 ' + (-R + 3) + 'L0 ' + (-R + (i % 3 ? 5.4 : 7.4)) + '" transform="rotate(' + i * 30 + ')" stroke="var(--st-ink)" stroke-width="' + (i % 3 ? 1 : 1.6) + '" stroke-linecap="round"/>';
    s += '<path d="M0 3L0 ' + n2(-R * .5) + '" transform="rotate(' + n2(hh) + ')" stroke="var(--st-ink)" stroke-width="2.4" stroke-linecap="round"/><path d="M0 3L0 ' + n2(-R * .75) + '" transform="rotate(' + n2(mm) + ')" stroke="var(--st-ink)" stroke-width="1.7" stroke-linecap="round"/><circle r="2" fill="var(--st-guide)"/>';
    return place(o, s);
  };
  /* Water drops (static): K.drops(x, y, w, h, n, seed) and soap bubbles K.bubbles(x, y, w, h, n, seed). */
  K.drops = function (x, y, w, h, n, seed) {
    var r = rnd(seed || 9), s = '', i;
    for (i = 0; i < n; i++) {
      var dx = x + r() * w, dy = y + r() * h, rx = 1.6 + r() * 2.8, ry = rx * (1.1 + r() * .5);
      s += '<ellipse cx="' + n2(dx + .7) + '" cy="' + n2(dy + 1.3) + '" rx="' + n2(rx) + '" ry="' + n2(ry) + '" fill="' + SHD + '" opacity=".16"/><ellipse cx="' + n2(dx) + '" cy="' + n2(dy) + '" rx="' + n2(rx) + '" ry="' + n2(ry) + '" fill="url(#k-drop)"/><circle cx="' + n2(dx - rx * .35) + '" cy="' + n2(dy - ry * .4) + '" r="' + n2(Math.max(.5, rx * .28)) + '" fill="#fff" opacity=".9"/>';
    }
    return s;
  };
  K.bubbles = function (x, y, w, h, n, seed) {
    var r = rnd(seed || 4), s = '', i;
    for (i = 0; i < n; i++) { var cx = x + r() * w, cy = y + r() * h, R = 3 + r() * 7; s += '<circle cx="' + n2(cx) + '" cy="' + n2(cy) + '" r="' + n2(R) + '" fill="url(#k-bubble)"/><circle cx="' + n2(cx - R * .35) + '" cy="' + n2(cy - R * .4) + '" r="' + n2(R * .18) + '" fill="#fff" opacity=".9"/>'; }
    return s;
  };
  /* ============================== 5. overlays ============================== */
  /* K.badge(n, x, y, r): a numbered disc in the topic colour. */
  K.badge = function (n, x, y, r) {
    r = r || 11;
    return '<g transform="translate(' + P(x, y) + ')"><circle class="st-badge-bg" r="' + r + '"/><text class="st-badge-tx" y="' + n2(r * .36) + '" text-anchor="middle" font-size="' + n2(r * 1.15) + '">' + n + '</text></g>';
  };
  /* K.arrow(x1, y1, x2, y2, o): a straight arrow with a head at the end (o.curve bends it, o.head size, o.both). */
  K.arrow = function (x1, y1, x2, y2, o) {
    o = o || {};
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hs = o.head || 7, bend = o.curve || 0;
    var cx = (x1 + x2) / 2 - uy * bend, cy = (y1 + y2) / 2 + ux * bend, ex = x2 - ux * hs * .6, ey = y2 - uy * hs * .6;
    var ax = bend ? (x2 - cx) : dx, ay = bend ? (y2 - cy) : dy, al = Math.hypot(ax, ay) || 1, vx = ax / al, vy = ay / al;
    var s = '<path d="M' + P(x1, y1) + (bend ? 'Q' + P(cx, cy) + ' ' + P(ex, ey) : 'L' + P(ex, ey)) + '" class="st-arrow"/>';
    s += '<path d="M' + P(x2, y2) + 'L' + P(x2 - vx * hs - vy * hs * .6, y2 - vy * hs + vx * hs * .6) + 'L' + P(x2 - vx * hs + vy * hs * .6, y2 - vy * hs - vx * hs * .6) + 'Z" class="st-arrow-head"/>';
    return s;
  };
  /* K.ring(cx, cy, r, o): a ring that marks a place (o.dash for a dashed one). Wrap in c.pulse() to make it breathe. */
  K.ring = function (cx, cy, r, o) {
    o = o || {};
    return '<circle ' + CXY(cx, cy) + ' r="' + n2(r) + '" class="' + (o.dash ? 'st-ring-dash' : 'st-ring') + '"/>';
  };
  /* K.callout(text, anchor, target, o): a label in a pill with a leader line to the thing it names.
     anchor [x, y]: where the pill sits (o.align 'middle' | 'start' | 'end' says which point of the pill that is); target [x, y]: where the leader ends (omit for a plain label).
     \n makes lines. o.size font size (default 12.5, which is 11.6 px on a phone), o.tone 'guide' | 'ok' | 'warn'. */
  K.callout = function (text, anchor, target, o) {
    o = o || {};
    var size = o.size || 12.5, lines = String(text).split('\n'), w = Math.max.apply(null, lines.map(function (l) { return l.length; })) * size * .6 + 18, h = lines.length * (size + 3) + 9;
    var al = o.align || 'middle', x0 = al === 'start' ? anchor[0] : al === 'end' ? anchor[0] - w : anchor[0] - w / 2, y0 = anchor[1] - h / 2, cx = x0 + w / 2, cy = y0 + h / 2, s = '';
    var tone = o.tone === 'ok' ? 'var(--st-ok)' : o.tone === 'warn' ? 'var(--st-warn)' : 'var(--st-guide)';
    if (target) {
      var dx = target[0] - cx, dy = target[1] - cy, t = Math.min(dx ? (w / 2) / Math.abs(dx) : 1e9, dy ? (h / 2) / Math.abs(dy) : 1e9);
      if (t < 1) s += '<path d="M' + P(cx + dx * t, cy + dy * t) + 'L' + P(target[0], target[1]) + '" class="st-leader" style="stroke:' + tone + '"/><circle ' + CXY(target[0], target[1]) + ' r="3.2" class="st-leader-dot" style="fill:' + tone + '"/>';
    }
    s += '<rect class="st-pill" x="' + n2(x0) + '" y="' + n2(y0) + '" width="' + n2(w) + '" height="' + n2(h) + '" rx="' + n2(Math.min(h / 2, 12)) + '"/>';
    s += '<text class="st-lbl" text-anchor="middle" font-size="' + size + '">' + lines.map(function (l, i) { return '<tspan x="' + n2(cx) + '" y="' + n2(y0 + 5 + (i + 1) * (size + 3) - 3.4) + '">' + A.esc(l) + '</tspan>'; }).join('') + '</text>';
    return '<g class="st-call">' + s + '</g>';
  };
  /* K.scaleBar(x, y, len, label): a scale bar with end ticks and a label under it. */
  K.scaleBar = function (x, y, len, label) {
    return '<g class="st-call"><path d="M' + P(x, y) + 'L' + P(x + len, y) + 'M' + P(x, y - 4) + 'L' + P(x, y + 4) + 'M' + P(x + len, y - 4) + 'L' + P(x + len, y + 4) + '" class="st-scale"/><text class="st-lbl-halo" x="' + n2(x + len / 2) + '" y="' + n2(y + 16) + '" text-anchor="middle">' + A.esc(label) + '</text></g>';
  };
  /* K.depthGauge(x, y, level, o): a small vertical gauge: level 0 to 3 fills light, medium and firm. o.labels false hides the words. */
  K.depthGauge = function (x, y, level, o) {
    o = o || {};
    var s = '<g class="st-call" transform="translate(' + P(x, y) + ')">', names = [A.tr('light', 'kevyt', 'lätt'), A.tr('medium', 'keskitaso', 'medel'), A.tr('firm', 'napakka', 'fast')], i;
    s += '<rect class="st-pill" x="-9" y="-6" width="' + (o.labels === false ? 24 : 92) + '" height="76" rx="12"/>';
    for (i = 0; i < 3; i++) {
      var on = level > i - .001;
      s += '<rect x="-3" y="' + (i * 21) + '" width="12" height="17" rx="4" fill="' + (on ? 'var(--st-guide)' : 'none') + '" fill-opacity="' + (on ? .35 + i * .3 : 1) + '" stroke="var(--st-guide)" stroke-width="1.4"/>';
      if (o.labels !== false) s += '<text class="st-lbl" x="16" y="' + (i * 21 + 13) + '" font-size="12" opacity="' + (on ? 1 : .55) + '">' + A.esc(names[i]) + '</text>';
    }
    return s + '</g>';
  };
  /* K.lens(x, y, r, content, o): a round magnifier inset with its own picture. content is drawn in lens coordinates (0,0 at the centre, -r to r).
     o.target [x, y]: the spot on the main picture it magnifies (a leader joins them), o.handle true draws a handle, o.label a caption below. */
  K.lens = function (x, y, r, content, o) {
    o = o || {};
    var id = K.uid('ln'), s = '<g class="st-lens">';
    if (o.target) {
      var dx = o.target[0] - x, dy = o.target[1] - y, L = Math.hypot(dx, dy) || 1;
      s += '<path d="M' + P(x + dx / L * r, y + dy / L * r) + 'L' + P(o.target[0], o.target[1]) + '" class="st-leader" stroke-dasharray="3 3"/><circle ' + CXY(o.target[0], o.target[1]) + ' r="4.5" class="st-ring"/>';
    }
    if (o.handle) s += '<path d="M' + P(x + r * .7, y + r * .7) + 'L' + P(x + r * 1.35, y + r * 1.35) + '" stroke="var(--st-metal-d)" stroke-width="7" stroke-linecap="round"/><path d="M' + P(x + r * .7, y + r * .7) + 'L' + P(x + r * 1.35, y + r * 1.35) + '" stroke="var(--st-metal)" stroke-width="4" stroke-linecap="round"/>';
    s += '<circle cx="' + n2(x + 2) + '" cy="' + n2(y + 4) + '" r="' + n2(r + 3) + '" fill="' + SHD + '" opacity=".3" filter="url(#k-b3)"/>';
    s += '<circle ' + CXY(x, y) + ' r="' + n2(r) + '" fill="var(--st-lens-bg)"/>';
    s += '<g transform="translate(' + P(x, y) + ')"><clipPath id="' + id + '"><circle r="' + n2(r) + '"/></clipPath><g clip-path="url(#' + id + ')">' + content + '<circle r="' + n2(r) + '" fill="url(#k-streak)" opacity=".45"/><circle r="' + n2(r) + '" fill="url(#k-vig)"/></g></g>';
    s += '<circle ' + CXY(x, y) + ' r="' + n2(r) + '" class="st-lens-edge"/><circle ' + CXY(x, y) + ' r="' + n2(r + 1.5) + '" class="st-lens-ring"/>';
    if (o.label) s += K.callout(o.label, [x, y + r + 14], null, { size: o.size });
    return s + '</g>';
  };
  /* K.compare({x, y, w, h, left, right, labels: [a, b], tones: ['ok', 'warn']}): two panels side by side, each with its own picture (drawn in panel
     coordinates, 0,0 at the top left of the panel, w/2 wide) and a heading pill. */
  K.compare = function (o) {
    var w = o.w, h = o.h, pw = w / 2 - 3, ida = K.uid('cp'), idb = K.uid('cp'), s = '<g transform="translate(' + P(o.x || 0, o.y || 0) + ')">', lab = o.labels || ['', ''], tn = o.tones || ['ok', 'warn'];
    [[0, o.left, ida, lab[0], tn[0]], [pw + 6, o.right, idb, lab[1], tn[1]]].forEach(function (p) {
      s += '<g transform="translate(' + p[0] + ' 0)"><clipPath id="' + p[2] + '"><path d="' + rr(0, 0, pw, h, 12) + '"/></clipPath><path d="' + rr(0, 0, pw, h, 12) + '" fill="var(--st-lens-bg)"/><g clip-path="url(#' + p[2] + ')">' + (p[1] || '') + '</g><path d="' + rr(0, 0, pw, h, 12) + '" fill="none" stroke="' + (p[4] === 'warn' ? 'var(--st-warn)' : 'var(--st-ok)') + '" stroke-width="2"/>';
      if (p[3]) s += K.callout(p[3], [pw / 2, h - 13], null, { size: o.size });
      s += '</g>';
    });
    return s + '</g>';
  };
  /* K.trail(c, d, t0, t1, o): the movement of a fingertip. A path that draws itself on, a wide faint ghost under it, and a fingertip marker that travels
     along it with a fading tail of echoes. o.repeat n laps of the path between t0 and t1 (the line is drawn during the first lap), o.until when everything
     starts to fade (default end of loop), o.orbit [cx, cy, r] when the path is a circle (the marker then uses c.orbit: far fewer keyframes), o.tip false for no marker, o.tipR ring radius (default 7), o.stillAt where the marker stands in the still frame (0..1).
     The path is drawn in the scene's coordinates, so put it inside the same transform group as the thing it belongs to. */
  K.trail = function (c, d, t0, t1, o) {
    o = o || {};
    var rep = o.repeat || 1, lap = (t1 - t0) / rep, until = o.until != null ? o.until : c.dur - .5, s = '', i, R = o.tipR || 7, orb = o.orbit;
    s += c.draw(d, t0, t0 + lap, 'class="st-ghost"', { until: until, ease: 'linear' });
    s += c.draw(d, t0, t0 + lap, 'class="st-trail"', { until: until, ease: 'linear' });
    if (o.tip !== false) {
      var tip = '<circle r="' + R + '" class="st-tip-ring"/><circle r="' + n2(R * .42) + '" class="st-tip-dot"/>', ech = '';
      if (!c.still) {
        [[.09, .4], [.2, .2]].forEach(function (e, k) {
          var a = Math.min(c.dur - .05, t0 + e[0]), b = Math.min(c.dur, t1 + e[0]), dot = '<circle r="' + n2(R * (.6 - k * .12)) + '" fill="var(--st-guide)"/>';
          ech += '<g opacity="' + e[1] + '">' + (orb ? c.orbit(orb[0], orb[1], orb[2], a, b, rep, dot) : c.move(d, a, b, dot, { repeat: rep, ease: o.ease || 'linear' })) + '</g>';
        });
        s += c.show(t0 - .2, until, ech, { fade: .25 });
      }
      s += c.show(t0 - .2, until, orb ? c.orbit(orb[0], orb[1], orb[2], t0, t1, rep, tip) : c.move(d, t0, t1, tip, { repeat: rep, ease: o.ease || 'linear', still: o.stillAt == null ? .5 : o.stillAt }), { fade: .25 });
    }
    return s;
  };
  /* K.section({x, y, w, h, depth, c, keys, marks}): a cross-section of the skin layers over the chest wall with a fingertip pressing to a depth.
     Layers from the top: skin, fat, breast tissue, muscle, rib. depth 0 to 1 is how far the fingertip goes down (static). With the scene context c, keys
     [{t, depth}] animate it. o.marks true labels light, medium and firm at their depths. Origin top left; the fingertip comes from above the box. */
  K.section = function (o) {
    var w = o.w || 120, h = o.h || 120, id = K.uid('sc'), s = '', hh = [h * .1, h * .22, h * .32, h * .16, h * .2], y = 0, cols = ['url(#k-skin-v)', '#F3DDA0', '#E9A9AD', '#B6474A', '#F1ECDF'], i;
    s += '<clipPath id="' + id + '"><path d="' + rr(0, 0, w, h, 10) + '"/></clipPath><g clip-path="url(#' + id + ')">';
    for (i = 0; i < 5; i++) { s += '<rect x="0" y="' + n2(y) + '" width="' + w + '" height="' + n2(hh[i] + 1) + '" fill="' + cols[i] + '"/>'; y += hh[i]; }
    var r = rnd(6), j;
    y = hh[0];
    for (j = 0; j < 26; j++) s += '<circle cx="' + n2(r() * w) + '" cy="' + n2(y + r() * hh[1]) + '" r="' + n2(1.5 + r() * 3) + '" fill="#fff" fill-opacity=".28" stroke="#C9A34F" stroke-opacity=".35" stroke-width=".7"/>';
    y += hh[1];
    for (j = 0; j < 7; j++) { var cx = 12 + r() * (w - 24), cy = y + 5 + r() * (hh[2] - 10); s += '<ellipse cx="' + n2(cx) + '" cy="' + n2(cy) + '" rx="' + n2(8 + r() * 8) + '" ry="' + n2(4 + r() * 4) + '" fill="#D6757D" fill-opacity=".55"/>'; }
    y += hh[2];
    for (j = 0; j < 9; j++) s += '<path d="M0 ' + n2(y + 4 + j * (hh[3] - 6) / 8) + 'C' + P(w * .3, y + 6 + j * (hh[3] - 6) / 8 + r() * 3) + ' ' + P(w * .7, y + 2 + j * (hh[3] - 6) / 8) + ' ' + P(w, y + 4 + j * (hh[3] - 6) / 8) + '" fill="none" stroke="#8E2F33" stroke-opacity=".5" stroke-width="1"/>';
    y += hh[3];
    for (j = 0; j < 3; j++) s += '<ellipse cx="' + n2(w * (.2 + j * .3)) + '" cy="' + n2(y + hh[4] * .55) + '" rx="' + n2(w * .13) + '" ry="' + n2(hh[4] * .36) + '" fill="#FFFDF6" stroke="#CBBFA0" stroke-width="1"/>';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#k-sh-edge-h)" opacity=".5"/></g><path d="' + rr(0, 0, w, h, 10) + '" class="st-contour" stroke-opacity=".8"/>';
    var tipTop = -h * .34, tipW = w * .22, tipH = h * .5;
    var finger = '<path d="M' + P(-tipW / 2, tipTop) + 'L' + P(-tipW / 2, tipTop + tipH - tipW / 2) + 'A' + n2(tipW / 2) + ' ' + n2(tipW / 2 * 1.1) + ' 0 0 0 ' + P(tipW / 2, tipTop + tipH - tipW / 2) + 'L' + P(tipW / 2, tipTop) + 'Z" fill="url(#k-skin-h)"/><path d="M' + P(-tipW / 2, tipTop) + 'L' + P(-tipW / 2, tipTop + tipH - tipW / 2) + 'A' + n2(tipW / 2) + ' ' + n2(tipW / 2 * 1.1) + ' 0 0 0 ' + P(tipW / 2, tipTop + tipH - tipW / 2) + 'L' + P(tipW / 2, tipTop) + '" class="st-contour"/>';
    var dEnd = o.depth == null ? .3 : o.depth, base = h * .1, travel = h * .86;
    var tipG = '<g transform="translate(' + n2(w / 2) + ' ' + n2(base - tipTop - tipH + tipW / 2 + 2) + ')">' + finger + '</g>';
    if (o.c && o.keys) {
      var ks = o.keys.map(function (k) { return { t: k.t, y: k.depth * travel }; });
      s += '<g clip-path="url(#' + id + 'o)">' + o.c.anim(ks, tipG, { ease: 'inOut' }) + '</g>';
      s = '<clipPath id="' + id + 'o"><rect x="-20" y="-60" width="' + (w + 40) + '" height="' + (h + 70) + '"/></clipPath>' + s;
    } else s += '<g transform="translate(0 ' + n2(dEnd * travel) + ')">' + tipG + '</g>';
    if (o.marks) {
      var nm = [A.tr('light', 'kevyt', 'lätt'), A.tr('medium', 'keskitaso', 'medel'), A.tr('firm', 'napakka', 'fast')], ys = [h * .1, h * .4, h * .78];
      ys.forEach(function (yy, k) { s += '<path d="M' + P(w - 4, yy) + 'L' + P(w + 8, yy) + '" class="st-leader"/>' + '<text class="st-lbl-halo" x="' + (w + 12) + '" y="' + n2(yy + 4) + '" font-size="12">' + A.esc(nm[k]) + '</text>'; });
    }
    return place(o, s);
  };
  /* ============================== 6. skin close-ups and organs ============================== */
  /* A smooth closed path through points (Catmull-Rom to cubic Bezier). */
  function smoothClosed(pts) {
    var n = pts.length, d = 'M' + P(pts[0][0], pts[0][1]), i;
    for (i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + P(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6) + ' ' + P(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6) + ' ' + P(p2[0], p2[1]);
    }
    return d + 'Z';
  }
  K.smoothClosed = smoothClosed;
  /* K.skinPatch({x, y, w, h, seed, r}): a close-up of skin: fine relief lines, pores, a few downy hairs and grain, in a rounded rectangle. Origin top left. */
  K.skinPatch = function (o) {
    o = o || {};
    var w = o.w || 200, h = o.h || 200, rd = rnd(o.seed || 21), id = K.uid('sp'), s = '', i, r1 = function (v) { return Math.round(v); };
    s += '<clipPath id="' + id + '"><path d="' + rr(0, 0, w, h, o.r == null ? 14 : o.r) + '"/></clipPath><g clip-path="url(#' + id + ')">';
    s += '<rect width="' + w + '" height="' + h + '" fill="url(#k-skin-soft)"/><rect width="' + w + '" height="' + h + '" fill="url(#k-hi-tl)" opacity=".7"/>';
    var n = o.lite ? Math.round(w * h / 2400) : Math.round(w * h / 1300), lines = '', pores = '', hairs = '';
    for (i = 0; i < n; i++) {
      var x = rd() * w, y = rd() * h, a = (rd() < .5 ? 38 : -38) + (rd() - .5) * 16, L = 7 + rd() * 14;
      lines += 'M' + r1(x) + ' ' + r1(y) + 'l' + r1(Math.cos(a * RAD) * L) + ' ' + r1(Math.sin(a * RAD) * L);
    }
    s += '<path d="' + lines + '" fill="none" stroke="' + SHD + '" stroke-opacity=".07" stroke-width=".7" stroke-linecap="round"/>';
    if (!o.lite) {
      for (i = 0; i < n * .9; i++) pores += 'M' + r1(rd() * w) + ' ' + r1(rd() * h) + 'h.1';
      s += '<path d="' + pores + '" fill="none" stroke="' + SHD + '" stroke-opacity=".28" stroke-width="1.1" stroke-linecap="round"/>';
      for (i = 0; i < Math.round(w * h / 9000); i++) { var hx = rd() * w, hy = rd() * h, ha = rd() * 360, hl = 9 + rd() * 9; hairs += 'M' + r1(hx) + ' ' + r1(hy) + 'q' + r1(Math.cos(ha * RAD) * hl * .5) + ' ' + r1(Math.sin(ha * RAD) * hl * .5 - 3) + ' ' + r1(Math.cos(ha * RAD) * hl) + ' ' + r1(Math.sin(ha * RAD) * hl); }
      s += '<path d="' + hairs + '" fill="none" stroke="var(--st-hair)" stroke-opacity=".38" stroke-width=".6" stroke-linecap="round"/>';
    }
    s += '<rect width="' + w + '" height="' + h + '" fill="#000" opacity="' + (o.lite ? .22 : .3) + '" filter="url(#k-grain)"/><rect width="' + w + '" height="' + h + '" fill="url(#k-sh-edge-h)" opacity=".35"/></g>';
    return place(o, s);
  };
  /* K.mole({x, y, r, seed, irr, ragged, tone, raised, halo, blur, colors, s, r2})
     A realistic mole, centred on the origin, about r units in radius. irr 0..1 makes it lopsided (asymmetry), ragged 0..1 makes the border notched,
     tone 'brown' (even, default) | 'multi' (tan, brown, black, pink and blue-grey blotches) | 'dark' | 'tan' | 'red', blur 0..1 softens the border,
     raised adds a dome of light, halo adds a faint reddened rim. Drawn once, static: put it in a c.show() or c.fade() to bring it in. */
  K.mole = function (o) {
    o = o || {};
    var R = o.r || 18, rd = rnd(o.seed || 3), N = 40, pts = [], i, irr = o.irr || 0, rag = o.ragged || 0, id = K.uid('ml'), s = '';
    var f1 = rd() * 6.28, f2 = rd() * 6.28, f3 = rd() * 6.28, tone = o.tone || 'brown';
    for (i = 0; i < N; i++) {
      var th = i / N * 6.2832, rr_ = R * (1 + irr * (.3 * Math.sin(2 * th + f1) + .22 * Math.sin(3 * th + f2) + .12 * Math.sin(5 * th + f3)) + rag * (rd() - .5) * .34);
      pts.push([Math.cos(th) * rr_ * (1 + irr * .12), Math.sin(th) * rr_]);
    }
    var d = smoothClosed(pts);
    var pal = { brown: ['#8A5A38', '#6B4328', '#4A2E1B'], dark: ['#4D3322', '#2E1D14', '#1A100B'], tan: ['#C9966A', '#A9774F', '#8A5E3C'], red: ['#B8605A', '#9A4640', '#6F2F2C'], multi: ['#9A6840', '#5E3A24', '#231712'] }[tone] || ['#8A5A38', '#6B4328', '#4A2E1B'];
    s += '<radialGradient id="' + id + 'g" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="' + pal[0] + '"/><stop offset=".6" stop-color="' + pal[1] + '"/><stop offset="1" stop-color="' + pal[2] + '"/></radialGradient>';
    s += '<defs><path id="' + id + 'p" d="' + d + '"/><clipPath id="' + id + '"><use href="#' + id + 'p"/></clipPath></defs>';
    if (o.halo) s += '<use href="#' + id + 'p" transform="scale(1.35)" fill="var(--st-rd)" opacity=".22" filter="url(#k-b5)"/>';
    s += '<use href="#' + id + 'p" transform="translate(1.6 2.4)" fill="' + SHD + '" opacity=".25" filter="url(#k-b1)"/>';
    s += '<g' + (o.blur ? ' filter="url(#k-b' + (o.blur > .6 ? 2 : 1) + ')"' : '') + '><use href="#' + id + 'p" fill="url(#' + id + 'g)"/><g clip-path="url(#' + id + ')">';
    var blots = tone === 'multi' ? [['#2A1914', .85, 2], ['#C2946A', .8, 2], ['#B8605A', .55, 1], ['#4F5C6B', .5, 1], ['#1A100C', .8, 1], ['#7A4A2C', .7, 2]] : [[pal[2], .5, 3], [pal[0], .45, 2]];
    blots.forEach(function (b) {
      for (var k = 0; k < b[2]; k++) { var a = rd() * 6.28, dist = rd() * R * .6, rx = R * (.18 + rd() * .3); s += '<ellipse cx="' + n2(Math.cos(a) * dist) + '" cy="' + n2(Math.sin(a) * dist) + '" rx="' + n2(rx) + '" ry="' + n2(rx * (.6 + rd() * .5)) + '" transform="rotate(' + n2(rd() * 180) + ' ' + n2(Math.cos(a) * dist) + ' ' + n2(Math.sin(a) * dist) + ')" fill="' + b[0] + '" opacity="' + b[1] + '" filter="url(#k-b2)"/>'; }
    });
    var spk = ''; for (i = 0; i < 22; i++) { var a2 = rd() * 6.28, d2 = Math.sqrt(rd()) * R * .85; spk += 'M' + n2(Math.cos(a2) * d2) + ' ' + n2(Math.sin(a2) * d2) + 'h.1'; } s += '<path d="' + spk + '" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.1" stroke-linecap="round"/>';
    s += '</g></g>';
    if (o.raised !== false) s += '<g clip-path="url(#' + id + ')"><ellipse cx="' + n2(-R * .32) + '" cy="' + n2(-R * .38) + '" rx="' + n2(R * .42) + '" ry="' + n2(R * .26) + '" fill="url(#k-hi-r)" opacity=".6" transform="rotate(-24)"/></g>';
    s += '<use href="#' + id + 'p" fill="none" stroke="#000" stroke-opacity="' + (o.blur ? .08 : .22) + '" stroke-width=".8"/>';
    return place({ x: o.x, y: o.y, s: o.s, r: o.rot }, s);
  };
  /* K.moleD(o): the outline of the mole K.mole(o) draws (same options), as a path in the mole's own coordinates, for dashed guides and traces. */
  K.moleD = function (o) {
    o = o || {};
    var R = o.r || 18, rd = rnd(o.seed || 3), N = 40, pts = [], i, irr = o.irr || 0, rag = o.ragged || 0;
    var f1 = rd() * 6.28, f2 = rd() * 6.28, f3 = rd() * 6.28;
    for (i = 0; i < N; i++) {
      var th = i / N * 6.2832, rr_ = R * (1 + irr * (.3 * Math.sin(2 * th + f1) + .22 * Math.sin(3 * th + f2) + .12 * Math.sin(5 * th + f3)) + rag * (rd() - .5) * .34);
      pts.push([Math.cos(th) * rr_ * (1 + irr * .12), Math.sin(th) * rr_]);
    }
    return smoothClosed(pts);
  };
  /* K.testis({x, y, s, r, cut}): the testicle and epididymis as a clinical anatomical drawing. cut true removes the front of the outer coat to show the
     lobules; the epididymis (a soft coiled tube) lies behind and above, and the vas deferens leaves at the top. Origin at the middle of the testicle (34 wide, 46 tall). */
  K.testis = function (o) {
    o = o || {};
    var s = '', id = K.uid('ts'), i;
    var body = 'M0 -46C22 -46 36 -26 36 0C36 28 22 46 0 46C-22 46 -36 28 -36 0C-36 -26 -22 -46 0 -46Z';
    /* vas deferens and epididymis, behind */
    s += '<path d="M24 -50C26 -66 18 -80 22 -96" fill="none" stroke="#D9A39A" stroke-width="9" stroke-linecap="round"/><path d="M24 -50C26 -66 18 -80 22 -96" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2.4" stroke-linecap="round" transform="translate(-2 0)"/>';
    s += '<path d="M14 -48C34 -52 50 -38 52 -10C54 20 46 40 34 50C30 54 24 48 28 42C38 28 40 10 38 -8C36 -26 30 -34 18 -36Z" fill="#D9A39A"/><path d="M14 -48C34 -52 50 -38 52 -10C54 20 46 40 34 50C30 54 24 48 28 42C38 28 40 10 38 -8C36 -26 30 -34 18 -36Z" fill="url(#k-sh-br)"/>';
    for (i = 0; i < 9; i++) s += '<path d="M' + P(32 + i * 2, -40 + i * 9) + 'q' + P(8, 3) + ' ' + P(14, 0) + '" fill="none" stroke="#9C5F58" stroke-opacity=".5" stroke-width="1"/>';
    s += '<path d="M14 -48C34 -52 50 -38 52 -10C54 20 46 40 34 50C30 54 24 48 28 42C38 28 40 10 38 -8C36 -26 30 -34 18 -36Z" class="st-contour"/>';
    /* the testis with a cut-away */
    s += '<path d="' + body + '" transform="translate(2 4)" fill="' + SHD + '" opacity=".25" filter="url(#k-b2)"/>';
    s += '<path d="' + body + '" fill="#F4EEE6"/><path d="' + body + '" fill="url(#k-skin-dome-soft)" opacity=".25"/>';
    if (o.cut !== false) {
      var cut = 'M-6 -40C-24 -38 -32 -18 -32 0C-32 24 -20 40 -4 42C6 34 4 14 8 0C10 -12 6 -30 -6 -40Z';
      s += '<clipPath id="' + id + '"><path d="' + cut + '"/></clipPath><path d="' + cut + '" fill="#EBC9A2"/><g clip-path="url(#' + id + ')">';
      for (i = 0; i < 9; i++) { var a = (-70 + i * 16) * RAD; s += '<path d="M' + P(8, -4) + 'L' + P(8 - Math.cos(a) * 52, -4 + Math.sin(a) * 52) + '" stroke="#C98F63" stroke-opacity=".7" stroke-width="1.1"/>'; }
      for (i = 0; i < 16; i++) { var yy = -36 + i * 5; s += '<path d="M' + P(-30 + (i % 3) * 3, yy) + 'q' + P(8, 4) + ' ' + P(14, 0) + 't' + P(14, 0) + '" fill="none" stroke="#B87A52" stroke-opacity=".5" stroke-width=".8"/>'; }
      s += '</g><ellipse cx="9" cy="-2" rx="3.4" ry="9" fill="#F7EFE3" stroke="#C9B79B" stroke-width=".8"/>';
      s += '<path d="' + cut + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/><path d="' + cut + '" class="st-contour" stroke-opacity=".6"/>';
    }
    s += '<path d="' + body + '" class="st-contour" stroke-opacity=".7"/>' + K.glint(-14, -24, 12, 7, -30, .6);
    return place(o, s);
  };






})();
