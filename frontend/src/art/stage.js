import { A as C4A } from "../app.js";

/* The stage: the timeline engine behind the self-check illustrations.

   A scene is registered with A.stage.define(id, spec). Everything in a scene loops together for spec.dur seconds, and the
   captions under the picture switch with the phases of that loop. There are no JS timers: every movement is a CSS keyframe
   animation that lives in a <style> element next to the picture, and all of them share one duration, so they stay in step.
   Only transform, opacity and stroke-dashoffset are animated.

   spec = {
     dur:      seconds in the loop (8 to 14),
     viewBox:  [width, height], default [360, 300],
     phases:   [{ at: seconds, cap: [en, fi, sv] }, ...]   (3 to 5, in order; a phase lasts until the next one starts),
     desc:     [en, fi, sv]   what happens, in words (the <desc> of the picture),
     draw(c):  returns the inner SVG. c is the scene context (see makeCtx).
   }

   Time conventions, for every helper that takes t0 and t1: seconds on the loop, 0 <= t0 < t1 <= dur.
   Loop seam: at dur the animation jumps back to 0. Whatever is animated must be hidden or equal at both ends,
   so wrap moving things in c.show(): it starts hidden and ends faded out.
   Still frame: with motion off the helpers return the finished state (everything visible, every path drawn in full,
   moving things at the place given by o.still) and draw() runs with c.still === true. */
(function () {
  'use strict';
  var A = C4A, art = A.art;
  var specs = Object.create(null), seq = 0;
  var stage = A.stage = {};

  var EASE = {
    linear: 'linear', inOut: 'cubic-bezier(.45,0,.55,1)', soft: 'cubic-bezier(.37,0,.2,1)', out: 'cubic-bezier(.16,.84,.3,1)', 'in': 'cubic-bezier(.5,0,.84,.25)'
  };
  var JSEASE = {
    linear: function (u) { return u; },
    inOut: function (u) { return u * u * (3 - 2 * u); },
    soft: function (u) { return u * u * (3 - 2 * u); },
    out: function (u) { return 1 - Math.pow(1 - u, 3); },
    'in': function (u) { return u * u * u; }
  };
  function n2(v) { return +(+v).toFixed(2); }
  function tr(a) { return a ? A.tr(a[0], a[1], a[2]) : ''; }

  /* ---------- path flattening and sampling ---------- */
  var samplers = {};
  function flatten(d) {
    var t = String(d).match(/[a-df-zA-DF-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    var i = 0, pts = [], x = 0, y = 0, sx = 0, sy = 0, cmd = '', cx2 = 0, cy2 = 0, lastC = '';
    function num() { return parseFloat(t[i++]); }
    function push(px, py) { pts.push([px, py]); }
    function cubic(x0, y0, x1, y1, x2, y2, x3, y3) {
      for (var k = 1; k <= 18; k++) {
        var u = k / 18, v = 1 - u;
        push(v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3);
      }
    }
    function quad(x0, y0, x1, y1, x2, y2) {
      for (var k = 1; k <= 14; k++) { var u = k / 14, v = 1 - u; push(v * v * x0 + 2 * v * u * x1 + u * u * x2, v * v * y0 + 2 * v * u * y1 + u * u * y2); }
    }
    function arc(x0, y0, rx, ry, rot, large, sweep, x1, y1) {
      if (!rx || !ry) { push(x1, y1); return; }
      var phi = rot * Math.PI / 180, cp = Math.cos(phi), sp = Math.sin(phi);
      var dx = (x0 - x1) / 2, dy = (y0 - y1) / 2, xp = cp * dx + sp * dy, yp = -sp * dx + cp * dy;
      rx = Math.abs(rx); ry = Math.abs(ry);
      var lam = xp * xp / (rx * rx) + yp * yp / (ry * ry);
      if (lam > 1) { var sl = Math.sqrt(lam); rx *= sl; ry *= sl; }
      var num_ = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, den = rx * rx * yp * yp + ry * ry * xp * xp;
      var co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num_ / den));
      var cxp = co * rx * yp / ry, cyp = -co * ry * xp / rx;
      var ccx = cp * cxp - sp * cyp + (x0 + x1) / 2, ccy = sp * cxp + cp * cyp + (y0 + y1) / 2;
      var a0 = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx), a1 = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx), da = a1 - a0;
      if (!sweep && da > 0) da -= 2 * Math.PI; else if (sweep && da < 0) da += 2 * Math.PI;
      var steps = Math.max(8, Math.ceil(Math.abs(da) / (Math.PI / 24)));
      for (var k = 1; k <= steps; k++) {
        var a = a0 + da * k / steps, ex = rx * Math.cos(a), ey = ry * Math.sin(a);
        push(cp * ex - sp * ey + ccx, sp * ex + cp * ey + ccy);
      }
    }
    while (i < t.length) {
      if (/^[a-zA-Z]$/.test(t[i])) cmd = t[i++];
      var rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0, nx, ny;
      if (C === 'M') { x = num() + ox; y = num() + oy; sx = x; sy = y; push(x, y); cmd = rel ? 'l' : 'L'; lastC = ''; }
      else if (C === 'L') { x = num() + ox; y = num() + oy; push(x, y); lastC = ''; }
      else if (C === 'H') { x = num() + ox; push(x, y); lastC = ''; }
      else if (C === 'V') { y = num() + oy; push(x, y); lastC = ''; }
      else if (C === 'C') { var a1 = num() + ox, b1 = num() + oy, a2 = num() + ox, b2 = num() + oy; nx = num() + ox; ny = num() + oy; cubic(x, y, a1, b1, a2, b2, nx, ny); cx2 = a2; cy2 = b2; x = nx; y = ny; lastC = 'C'; }
      else if (C === 'S') { var r1 = lastC === 'C' ? 2 * x - cx2 : x, s1 = lastC === 'C' ? 2 * y - cy2 : y, r2 = num() + ox, s2 = num() + oy; nx = num() + ox; ny = num() + oy; cubic(x, y, r1, s1, r2, s2, nx, ny); cx2 = r2; cy2 = s2; x = nx; y = ny; lastC = 'C'; }
      else if (C === 'Q') { var q1 = num() + ox, q2 = num() + oy; nx = num() + ox; ny = num() + oy; quad(x, y, q1, q2, nx, ny); cx2 = q1; cy2 = q2; x = nx; y = ny; lastC = 'Q'; }
      else if (C === 'T') { var tq1 = lastC === 'Q' ? 2 * x - cx2 : x, tq2 = lastC === 'Q' ? 2 * y - cy2 : y; nx = num() + ox; ny = num() + oy; quad(x, y, tq1, tq2, nx, ny); cx2 = tq1; cy2 = tq2; x = nx; y = ny; lastC = 'Q'; }
      else if (C === 'A') { var arx = num(), ary = num(), arot = num(), alg = num(), asw = num(); nx = num() + ox; ny = num() + oy; arc(x, y, arx, ary, arot, alg, asw, nx, ny); x = nx; y = ny; lastC = ''; }
      else if (C === 'Z') { push(sx, sy); x = sx; y = sy; lastC = ''; }
      else i++;
    }
    return pts;
  }
  /* sampler(d | [[x,y],...]) -> { len, at(u) -> [x, y, angleDeg] } with u in 0..1 by arc length */
  function sampler(d) {
    var key = typeof d === 'string' ? d : null;
    if (key && samplers[key]) return samplers[key];
    var pts = key ? flatten(d) : d, cum = [0], i;
    for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var len = cum[cum.length - 1] || 1e-6;
    var s = {
      len: len,
      at: function (u) {
        u = Math.max(0, Math.min(1, u));
        var L = u * len, lo = 0, hi = cum.length - 1;
        while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= L) lo = mid; else hi = mid; }
        var a = pts[lo], b = pts[Math.min(hi, pts.length - 1)] || a, seg = cum[hi] - cum[lo] || 1e-6, f = (L - cum[lo]) / seg;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI];
      }
    };
    if (key) samplers[key] = s;
    return s;
  }
  stage.path = sampler;

  /* ---------- the scene context ---------- */
  function makeCtx(spec, n, still) {
    var dur = spec.dur, rules = [], defs = [], k = 0, vb = spec.viewBox || [360, 300], phases = spec.phases || [];
    var pe = function (t) { return Math.max(0, Math.min(100, t / dur * 100)); };
    var c = { dur: dur, still: !!still, w: vb[0], h: vb[1], n: n, phases: phases, tr: tr, esc: A.esc, n2: n2, path: sampler };
    c.id = function (name) { return 's' + n + '-' + name; };
    c.ref = function (name) { return 'url(#s' + n + '-' + name + ')'; };
    /* Adds markup to the scene's own <defs> (clipPaths, masks, local gradients). Use c.id(name) for the ids. */
    c.defs = function (markup) { defs.push(markup); return ''; };
    c.phase = function (i) {
      var p = phases[i] || { at: 0 }, nx = phases[i + 1];
      return { t0: p.at, t1: nx ? nx.at : dur };
    };

    function frames(list) {
      /* list: [{p, css, ease}] in order. Percentages are nudged so that they strictly increase. */
      var out = [], last = -1;
      list.forEach(function (f) {
        var p = Math.max(0, Math.min(100, f.p));
        if (p <= last) p = last + 0.002;
        if (p > 100) p = 100;
        last = p;
        out.push(n2(p * 1000) / 1000 + '%{' + f.css + (f.ease ? ';animation-timing-function:' + f.ease : '') + '}');
      });
      return out.join('');
    }
    function make(list, extra, inner, cls) {
      var name = 's' + n + 'a' + (k++);
      rules.push('@keyframes ' + name + '{' + frames(list) + '}');
      return '<g class="st-a' + (cls ? ' ' + cls : '') + '" style="animation:' + name + ' ' + dur + 's linear infinite;' + (extra || '') + '">' + inner + '</g>';
    }
    c._rules = rules; c._defs = defs;

    /* c.show(t0, t1, inner, o): visible between t0 and t1, with a fade of o.fade seconds (default .4) at each end.
       o.still false hides it in the still frame. o.hold true: no fade out (stays to the end of the loop). */
    c.show = function (t0, t1, inner, o) {
      o = o || {};
      if (still) return o.still === false ? '' : inner;
      var fi = o.fadeIn != null ? o.fadeIn : (o.fade != null ? o.fade : .4), fo = o.fadeOut != null ? o.fadeOut : (o.fade != null ? o.fade : .4);
      var f = [{ p: 0, css: 'opacity:0' }, { p: pe(t0), css: 'opacity:0' }, { p: pe(t0 + fi), css: 'opacity:1' }];
      if (t1 >= dur || o.hold) f.push({ p: 100, css: 'opacity:1' });
      else f.push({ p: pe(t1 - fo), css: 'opacity:1' }, { p: pe(t1), css: 'opacity:0' }, { p: 100, css: 'opacity:0' });
      return make(f, '', inner);
    };
    /* c.phaseShow(i, inner, o): visible during phase i. */
    c.phaseShow = function (i, inner, o) { var p = c.phase(i); return c.show(p.t0, p.t1, inner, o); };
    /* c.marker(i, x, y): the number of phase i in a badge, lit during that phase and dimmed in the others. Still frame: all lit. */
    c.marker = function (i, x, y, r) {
      r = r || 11;
      var b = '<g transform="translate(' + x + ' ' + y + ')"><circle class="st-badge-bg" r="' + r + '"/><text class="st-badge-tx" y="' + n2(r * .36) + '" text-anchor="middle" font-size="' + n2(r * 1.15) + '">' + (i + 1) + '</text></g>';
      if (still) return b;
      var p = c.phase(i);
      return make([{ p: 0, css: 'opacity:.4' }, { p: pe(p.t0), css: 'opacity:.4' }, { p: pe(p.t0 + .3), css: 'opacity:1' }, { p: pe(p.t1 - .3), css: 'opacity:1' }, { p: pe(p.t1), css: 'opacity:.4' }, { p: 100, css: 'opacity:.4' }], '', b);
    };

    /* c.anim(keys, inner, o): the general tween. keys = [{ t, x, y, r (deg), s | sx, sy, o (opacity), ease }].
       A key keeps the values of the one before it for anything it does not name. Before the first key the first key holds,
       after the last the last holds. o.pivot [px, py] is the centre of rotation and scale (default the origin 0,0).
       o.center true: pivot is the middle of the shape. o.stillT: the time whose state shows in the still frame (default the last key). */
    c.anim = function (keys, inner, o) {
      o = o || {};
      var st = { x: 0, y: 0, r: 0, sx: 1, sy: 1, o: 1 }, ks = [];
      keys.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (kk) {
        var s = (kk.s != null) ? kk.s : null;
        st = { t: kk.t, x: kk.x != null ? kk.x : st.x, y: kk.y != null ? kk.y : st.y, r: kk.r != null ? kk.r : st.r, sx: kk.sx != null ? kk.sx : (s != null ? s : st.sx), sy: kk.sy != null ? kk.sy : (s != null ? s : st.sy), o: kk.o != null ? kk.o : st.o, ease: kk.ease };
        ks.push(st);
      });
      function xf(s) { return 'translate(' + n2(s.x) + 'px,' + n2(s.y) + 'px) rotate(' + n2(s.r) + 'deg) scale(' + n2(s.sx) + ',' + n2(s.sy) + ')'; }
      var origin = o.center ? 'transform-box:fill-box;transform-origin:50% 50%' : (o.pivot ? 'transform-origin:' + n2(o.pivot[0]) + 'px ' + n2(o.pivot[1]) + 'px' : '');
      if (still) {
        var T = o.stillT != null ? o.stillT : ks[ks.length - 1].t, s0 = ks[0], s1 = ks[ks.length - 1], f = 0, lo = s0, hi = s0;
        if (T >= s1.t) lo = hi = s1; else if (T > s0.t) { for (var q = 0; q < ks.length - 1; q++) { if (T >= ks[q].t && T <= ks[q + 1].t) { lo = ks[q]; hi = ks[q + 1]; f = (T - lo.t) / ((hi.t - lo.t) || 1); break; } } }
        var m = function (a) { return lo[a] + (hi[a] - lo[a]) * f; };
        var cur = { x: m('x'), y: m('y'), r: m('r'), sx: m('sx'), sy: m('sy'), o: m('o') };
        var pv = o.pivot ? ' translate(' + n2(o.pivot[0]) + ' ' + n2(o.pivot[1]) + ')' : '', pvb = o.pivot ? ' translate(' + n2(-o.pivot[0]) + ' ' + n2(-o.pivot[1]) + ')' : '';
        return '<g transform="' + pv + ' translate(' + n2(cur.x) + ' ' + n2(cur.y) + ') rotate(' + n2(cur.r) + ') scale(' + n2(cur.sx) + ' ' + n2(cur.sy) + ')' + pvb + '"' + (cur.o < 1 ? ' opacity="' + n2(cur.o) + '"' : '') + '>' + inner + '</g>';
      }
      var list = [], def = o.ease || 'inOut';
      if (ks[0].t > 0) list.push({ p: 0, css: 'transform:' + xf(ks[0]) + ';opacity:' + n2(ks[0].o), ease: EASE[ks[0].ease || def] || ks[0].ease });
      ks.forEach(function (s) { list.push({ p: pe(s.t), css: 'transform:' + xf(s) + ';opacity:' + n2(s.o), ease: EASE[s.ease || def] || s.ease || EASE[def] }); });
      var last = ks[ks.length - 1];
      if (last.t < dur) list.push({ p: 100, css: 'transform:' + xf(last) + ';opacity:' + n2(last.o) });
      return make(list, origin, inner);
    };

    /* c.move(path, t0, t1, inner, o): puts the origin (0,0) of inner on the path, and moves it along the path between t0 and t1.
       path is an SVG path string (M L H V C S Q T A Z, absolute or relative) or an array of [x, y] points.
       o.ease 'inOut' (default) | 'linear' | 'out' | 'in', o.repeat n (go round the path n times, linear), o.rotate 'auto' | degrees (default none),
       o.back true (travel back to the start in the second half), o.still fraction 0..1 of the path shown in the still frame (default 1).
       Before t0 the content sits at the start and after t1 at the end: wrap it in c.show() to hide it then. */
    c.move = function (path, t0, t1, inner, o) {
      o = o || {};
      var sp = sampler(path), rot = o.rotate, ease = o.repeat ? 'linear' : (o.ease || 'inOut'), fn = JSEASE[ease] || JSEASE.inOut;
      function at(u) {
        var p = sp.at(u), r = rot === 'auto' ? p[2] + (o.rotOffset || 0) : (typeof rot === 'number' ? rot : 0);
        return 'translate(' + n2(p[0]) + 'px,' + n2(p[1]) + 'px) rotate(' + n2(r) + 'deg)';
      }
      if (still) {
        var ps = sp.at(o.still != null ? o.still : 1), rs = rot === 'auto' ? ps[2] + (o.rotOffset || 0) : (typeof rot === 'number' ? rot : 0);
        return '<g transform="translate(' + n2(ps[0]) + ' ' + n2(ps[1]) + ') rotate(' + n2(rs) + ')">' + inner + '</g>';
      }
      var N = Math.max(10, Math.min(64, Math.round(sp.len / 5))) * (o.repeat || 1), list = [{ p: 0, css: 'transform:' + at(0) }], i;
      if (t0 > 0) list.push({ p: pe(t0), css: 'transform:' + at(0) });
      for (i = 1; i <= N; i++) {
        var u = i / N, v = o.repeat ? (u * o.repeat) % 1 || (i === N ? 1 : 0) : u;
        if (o.back) v = u < .5 ? fn(u * 2) : 1 - fn((u - .5) * 2);
        else if (!o.repeat) v = fn(u);
        list.push({ p: pe(t0 + (t1 - t0) * u), css: 'transform:' + at(v) });
      }
      if (t1 < dur) list.push({ p: 100, css: 'transform:' + at(o.back ? 0 : 1) });
      return make(list, '', inner);
    };

    /* c.draw(d, t0, t1, attrs, o): a stroke that draws itself on between t0 and t1 and fades out at the end of the loop
       (o.until: seconds when it starts to fade, default dur - .5). attrs: markup for the <path>, for example 'class="st-trail"'. */
    c.draw = function (d, t0, t1, attrs, o) {
      o = o || {};
      if (still) return '<path d="' + d + '" ' + (attrs || '') + '/>';
      var until = o.until != null ? o.until : dur - .5, fn = EASE[o.ease || 'inOut'];
      var f = [{ p: 0, css: 'stroke-dashoffset:1;opacity:0' }, { p: pe(t0), css: 'stroke-dashoffset:1;opacity:1', ease: fn }, { p: pe(t1), css: 'stroke-dashoffset:0;opacity:1' }];
      if (until < dur) f.push({ p: pe(until), css: 'stroke-dashoffset:0;opacity:1' }, { p: pe(until + .45), css: 'stroke-dashoffset:0;opacity:0' }, { p: 100, css: 'stroke-dashoffset:0;opacity:0' });
      else f.push({ p: 100, css: 'stroke-dashoffset:0;opacity:1' });
      var name = 's' + n + 'a' + (k++);
      rules.push('@keyframes ' + name + '{' + frames(f) + '}');
      return '<path d="' + d + '" pathLength="1" ' + (attrs || '') + ' style="stroke-dasharray:1 1.05;animation:' + name + ' ' + dur + 's linear infinite"/>';
    };

    /* c.pulse(t0, t1, inner, o): visible between t0 and t1, breathing (scale and opacity) o.count times (default 3). o.scale default 1.14. */
    c.pulse = function (t0, t1, inner, o) {
      o = o || {};
      if (still) return inner;
      var cnt = o.count || 3, sc = o.scale || 1.14, f = [{ p: 0, css: 'opacity:0;transform:scale(1)' }, { p: pe(t0), css: 'opacity:0;transform:scale(1)' }], i;
      var span = (t1 - t0 - .5) / cnt;
      for (i = 0; i < cnt; i++) {
        var a = t0 + .25 + span * i;
        f.push({ p: pe(a), css: 'opacity:' + (i ? .55 : 0) + ';transform:scale(1)', ease: EASE.soft }, { p: pe(a + span * .45), css: 'opacity:1;transform:scale(' + sc + ')', ease: EASE.soft });
      }
      f.push({ p: pe(t1 - .25), css: 'opacity:1;transform:scale(1)' }, { p: pe(t1), css: 'opacity:0;transform:scale(1)' }, { p: 100, css: 'opacity:0;transform:scale(1)' });
      return make(f, 'transform-box:fill-box;transform-origin:50% 50%', inner);
    };

    /* c.fade(keys, inner): opacity only. keys = [[t, opacity], ...] linear in between. */
    c.fade = function (keys, inner, o) {
      o = o || {};
      if (still) return o.still === false ? '' : (o.stillO != null ? '<g opacity="' + o.stillO + '">' + inner + '</g>' : inner);
      var f = [];
      if (keys[0][0] > 0) f.push({ p: 0, css: 'opacity:' + keys[0][1] });
      keys.forEach(function (kk) { f.push({ p: pe(kk[0]), css: 'opacity:' + kk[1] }); });
      if (keys[keys.length - 1][0] < dur) f.push({ p: 100, css: 'opacity:' + keys[keys.length - 1][1] });
      return make(f, '', inner);
    };

    /* c.orbit(cx, cy, r, t0, t1, laps, inner, o): the origin (0,0) of inner goes round a circle of radius r about (cx, cy), laps times between t0 and t1,
       without the content turning (two nested rotations: only two keyframes however many laps). It starts at angle o.a0 degrees (0 = to the right of the centre,
       90 = below it) and, outside t0 to t1, rests there. For something drawn in true coordinates use cx = cy = 0: it is then shifted by up to r. */
    c.orbit = function (cx, cy, r, t0, t1, laps, inner, o) {
      o = o || {};
      var a0 = o.a0 || 0, a1 = a0 + 360 * laps;
      var inn = c.anim([{ t: 0, r: -a0 }, { t: t0, r: -a0, ease: 'linear' }, { t: t1, r: -a1 }], inner, { pivot: [0, 0], stillT: t0 });
      return c.anim([{ t: 0, r: a0 }, { t: t0, r: a0, ease: 'linear' }, { t: t1, r: a1 }], '<g transform="translate(' + n2(cx + r) + ' ' + n2(cy) + ')">' + inn + '</g>', { pivot: [cx, cy], stillT: t0 });
    };
    /* c.loop(period, keys, inner, o): a repeating movement (water, steam, a pulse). keys are as in c.anim, with t from 0 to period.
       The pattern repeats to fill the loop: the period is rounded so that a whole number of repeats fits in dur.
       o.delay (seconds) starts the pattern later. Give the first and last key the same state so the repeat is seamless. */
    c.loop = function (period, keys, inner, o) {
      o = o || {};
      var reps = Math.max(1, Math.round(dur / period)), p = dur / reps, all = [];
      for (var r = 0; r < reps; r++) {
        keys.forEach(function (kk) { var q = {}; for (var a in kk) q[a] = kk[a]; q.t = r * p + kk.t * p / period; all.push(q); });
      }
      return c.anim(all, inner, o);
    };
    return c;
  }

  /* ---------- registry ---------- */
  stage.define = function (id, spec) { specs[id] = spec; return id; };
  stage.has = function (id) { return !!specs[id]; };
  stage.ids = function () { return Object.keys(specs); };
  /* Makes `id` draw the same scene as `target` (used for the poster figures until they get a scene of their own). */
  stage.alias = function (id, target) { specs[id] = { alias: target }; };
  function resolve(id) { var s = specs[id], g = 0; while (s && s.alias && g++ < 4) s = specs[s.alias]; return s; }

  function motionOn(o) {
    if (o.motion != null) return !!o.motion;
    if (o.still) return false;
    return art.demoOn() && !A.reduceMotion();
  }
  function reducedByDevice() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) && !(A.S && A.S.prefs.motion === false); } catch (e) { return false; }
  }
  var IC = {
    pause: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="5" width="4" height="14" rx="1.4" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.4" fill="currentColor"/></svg>',
    play: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.9l11-6.8a1 1 0 0 0 0-1.8l-11-6.8A1 1 0 0 0 8 5.2z" fill="currentColor"/></svg>',
    replay: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4.5v4.6h4.600"/></svg>'
  };
  function toggleBtn(paused) {
    return '<button type="button" class="demo-toggle st-btn" data-stage-act="toggle" aria-pressed="' + (paused ? 'true' : 'false') + '">' + (paused ? IC.play + '<span>' + A.esc(A.tr('Play', 'Toista', 'Spela')) + '</span>' : IC.pause + '<span>' + A.esc(A.tr('Pause', 'Tauko', 'Paus')) + '</span>') + '</button>';
  }

  /* A.stage.render(id, label, opts) -> HTML of the whole figure.
     opts.demo      true: the figure with captions and progress (the guide, the posters). Without it: a still picture without captions (a thumbnail).
     opts.controls  true: Pause/Play and Replay buttons.
     opts.motion    true or false forces the moving or the still version. opts.still true: still.
     opts.captions  false: leave the captions out. */
  stage.render = function (id, label, o) {
    o = o || {};
    var spec = resolve(id);
    if (!spec) return '';
    if (A.kit && A.kit.ensureDefs) A.kit.ensureDefs();
    var demo = !!o.demo, moving = demo && motionOn(o), still = !moving, n = ++seq;
    var c = makeCtx(spec, n, still), inner = '', vb = spec.viewBox || [360, 300];
    try { inner = spec.draw(c); } catch (e) { if (window.console) console.error('stage scene ' + id, e); inner = ''; }
    /* path data to one decimal: the eye cannot tell, and it takes a quarter off the markup */
    inner = inner.replace(/ d="([^"]+)"/g, function (m, d) { return ' d="' + d.replace(/(\d+\.\d{2,})/g, function (v) { return String(+(+v).toFixed(1)); }) + '"'; });
    var phases = spec.phases || [], dur = spec.dur, captions = demo && o.captions !== false;
    var cls = 'st-fig demo' + (still ? ' still' : ' playing') + (demo ? '' : ' thumb');
    var h = '<div class="' + cls + '" data-stage="' + A.esc(id) + '" data-sid="' + A.esc(id) + '" data-label="' + A.esc(label || '') + '" data-opts="' + A.esc(JSON.stringify({ demo: demo, controls: !!o.controls, captions: o.captions !== false })) + '" data-dur="' + dur + '" style="--st-dur:' + dur + 's">';
    /* captions and progress share the phase keyframes */
    var capRules = '', capHtml = '', dots = '';
    if (captions) {
      phases.forEach(function (ph, i) {
        var t0 = ph.at, t1 = i + 1 < phases.length ? phases[i + 1].at : dur, P = function (t) { return n2(Math.max(0, Math.min(100, t / dur * 100)) * 1000) / 1000; };
        var text = '<span class="st-n" aria-hidden="true">' + (i + 1) + '</span><span class="st-ct">' + A.esc(tr(ph.cap)) + '</span>';
        if (moving) {
          var a = t0 <= 0 ? 0.001 : P(t0), b = P(Math.min(dur, t0 + .3)), cc = P(Math.max(t0, t1 - .3)), d = P(t1);
          capRules += '@keyframes s' + n + 'c' + i + '{0%{opacity:0}' + (a > 0.001 ? a + '%{opacity:0}' : '') + b + '%{opacity:1}' + cc + '%{opacity:1}' + (d >= 100 ? '100%{opacity:0}' : d + '%{opacity:0}100%{opacity:0}') + '}';
          capRules += '@keyframes s' + n + 'f' + i + '{0%{transform:scaleX(0)}' + P(t0) + '%{transform:scaleX(0)}' + P(t1) + '%{transform:scaleX(1)}100%{transform:scaleX(1)}}';
          capHtml += '<p class="st-cap" style="animation:s' + n + 'c' + i + ' ' + dur + 's linear infinite">' + text + '</p>';
          dots += '<span class="st-dot"><i style="animation:s' + n + 'f' + i + ' ' + dur + 's linear infinite"></i></span>';
        } else {
          capHtml += '<p class="st-cap">' + text + '</p>';
        }
      });
    }
    var kf = c._rules.join('') + capRules;
    if (kf) h += '<style>' + kf + '</style>';
    var descId = 's' + n + '-d';
    h += '<svg class="art st-svg" viewBox="0 0 ' + vb[0] + ' ' + vb[1] + '" role="img" aria-label="' + A.esc(label || '') + '" aria-describedby="' + descId + '" focusable="false">' +
      '<desc id="' + descId + '">' + A.esc(tr(spec.desc)) + '</desc>' + (c._defs.length ? '<defs>' + c._defs.join('') + '</defs>' : '') +
      '<rect class="st-bg" width="' + vb[0] + '" height="' + vb[1] + '"/>' + inner + '</svg>';
    if (captions) {
      h += '<div class="st-caps' + (moving ? '' : ' list') + '">' + capHtml + '</div>';
      if (moving) h += '<div class="st-dots" aria-hidden="true">' + dots + '</div>';
    }
    if (demo && o.controls) {
      h += '<div class="st-ctl">' + (moving ? toggleBtn(false) + '<button type="button" class="demo-toggle st-btn" data-stage-act="replay">' + IC.replay + '<span>' + A.esc(A.tr('Replay', 'Toista alusta', 'Spela om')) + '</span></button>'
        : (reducedByDevice() && o.motion == null && !o.still ? '<button type="button" class="demo-toggle st-btn" data-stage-act="play-motion">' + IC.play + '<span>' + A.esc(A.tr('Play animation', 'Toista animaatio', 'Spela animation')) + '</span></button>' : '')) + '</div>';
    }
    return h + '</div>';
  };

  /* ---------- playback ---------- */
  function wrapOf(root) { return root && root.closest ? (root.closest('.st-fig') || root) : root; }
  function anims(root) { var w = wrapOf(root); return w && w.getAnimations ? w.getAnimations({ subtree: true }) : []; }
  /* Pauses every animation inside the stage at `seconds` (CSS animations here, Web Animations and SMIL if a scene ever adds them). */
  stage.seek = function (root, seconds) {
    var w = wrapOf(root);
    if (!w) return;
    w.classList.add('is-paused');
    anims(w).forEach(function (a) { a.pause(); a.currentTime = seconds * 1000; });
    var svg = w.querySelector && w.querySelector('svg');
    if (svg && svg.pauseAnimations) { svg.pauseAnimations(); svg.setCurrentTime(seconds); }
  };
  stage.setPaused = function (root, paused) {
    var w = wrapOf(root);
    anims(w).forEach(function (a) { if (paused) a.pause(); else a.play(); });
    w.classList.toggle('is-paused', !!paused);
  };
  stage.replay = function (root) {
    var w = wrapOf(root);
    anims(w).forEach(function (a) { a.currentTime = 0; a.play(); });
    w.classList.remove('is-paused');
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-stage-act]');
      if (!b) return;
      var fig = b.closest('.st-fig');
      if (!fig) return;
      var act = b.getAttribute('data-stage-act');
      if (act === 'toggle') {
        var paused = !fig.classList.contains('is-paused');
        stage.setPaused(fig, paused);
        b.outerHTML = toggleBtn(paused);
        var nb = fig.querySelector('[data-stage-act="toggle"]');
        if (nb) nb.focus();
      } else if (act === 'replay') {
        stage.replay(fig);
        var tb = fig.querySelector('[data-stage-act="toggle"]');
        if (tb) tb.outerHTML = toggleBtn(false);
      } else if (act === 'play-motion') {
        var opts = {};
        try { opts = JSON.parse(fig.getAttribute('data-opts') || '{}'); } catch (err) { opts = {}; }
        opts.motion = true;
        fig.outerHTML = stage.render(fig.getAttribute('data-sid'), fig.getAttribute('data-label'), opts);
      }
    });
  }
})();
