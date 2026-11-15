import { A as C4A } from "../app.js";
import "../styles/selfcheck-testicular.css";

/* The testicular self-check scenes: s-te-warm, s-te-hold, s-te-roll, s-te-surface, s-te-epi and the poster pos-testicular.
   Every picture is clinical and cropped, like a patient leaflet: a hand, the oval under the skin and a simple anatomical cut-away.
   Nothing else of the body is shown. The helpers below (te*) draw the hands, the pouch and the organ for all of the scenes.
   Texts: English is the source; the Finnish and Swedish are drafts for a native speaker to check. */
(function () {
  'use strict';
  var A = C4A, K = A.kit, stage = A.stage;
  var tr = function (a, b, c) { return A.tr(a, b, c); };
  var n2 = K.n2, uid = K.uid, esc = A.esc;
  var SK = 'var(--st-sk)', SKD = 'var(--st-sk-d)', SKA = 'var(--st-sk-a)', RD = 'var(--st-rd)', SHD = 'rgb(var(--st-shadow))';
  var LIGHT = K.LIGHT;
  function P(x, y) { return n2(x) + ' ' + n2(y); }
  function mix(a, p, b) { return 'color-mix(in srgb,' + a + ' ' + p + '%,' + b + ')'; }
  function lt(p) { return mix(SK, 100 - p, '#fff'); }
  function dk(p) { return mix(SK, 100 - p, SKD); }
  function stp(o, col, op) { return '<stop offset="' + o + '" style="stop-color:' + col + (op != null ? ';stop-opacity:' + op : '') + '"/>'; }
  function rgrad(id, cx, cy, r, stops, fx, fy) { return '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + (fx != null ? ' fx="' + fx + '" fy="' + fy + '"' : '') + '>' + stops + '</radialGradient>'; }
  function lgrad(id, x1, y1, x2, y2, stops) { return '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops + '</linearGradient>'; }

  /* ---------- smooth tubes: fingers, thumbs, vessels ---------- */
  /* a Catmull-Rom curve through the points, per samples between each pair */
  function spl(pts, per) {
    var out = [], n = pts.length, i, j;
    for (i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (j = 0; j < per; j++) {
        var t = j / per, t2 = t * t, t3 = t2 * t;
        out.push([.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
          .5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    out.push(pts[n - 1]);
    return out;
  }
  function poly(a) { var d = 'M' + P(a[0][0], a[0][1]), i; for (i = 1; i < a.length; i++) d += 'L' + P(a[i][0], a[i][1]); return d; }
  /* a shaded tube along the control points with a width at each; the tip is round. o.creases lists the control points that get a skin crease,
     o.nail {k, w, l} a nail near the tip, o.base true rounds the base, o.pad true flattens the tip into a finger pad, o.lite fewer details. */
  function tube(pts, ws, o) {
    o = o || {};
    var per = o.per || 5, C = spl(pts, per), n = C.length, L = [], R = [], W = [], N = [], i, mid = Math.floor(n * .5);
    for (i = 0; i < n; i++) {
      var seg = Math.min(pts.length - 2, Math.floor(i / per)), f = Math.min(1, (i - seg * per) / per);
      var w = ws[seg] + (ws[seg + 1] - ws[seg]) * f; W.push(w);
      var a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      N.push([nx, ny]);
      L.push([C[i][0] + nx * w / 2, C[i][1] + ny * w / 2]); R.push([C[i][0] - nx * w / 2, C[i][1] - ny * w / 2]);
    }
    var e = C[n - 1], pr = C[n - 2], af = Math.atan2(e[1] - pr[1], e[0] - pr[0]), wr = W[n - 1] / 2, cap = [], k, m = 7;
    for (k = 1; k < m; k++) { var th = af + Math.PI / 2 - Math.PI * k / m; cap.push([e[0] + wr * Math.cos(th) * (o.pad ? .9 : 1), e[1] + wr * Math.sin(th) * (o.pad ? 1 : 1)]); }
    var bc = [];
    if (o.base) { var b0 = C[0], b1 = C[1], ab = Math.atan2(b0[1] - b1[1], b0[0] - b1[0]), wb = W[0] / 2; for (k = 1; k < m; k++) { var tb = ab + Math.PI / 2 - Math.PI * k / m; bc.push([b0[0] + wb * Math.cos(tb), b0[1] + wb * Math.sin(tb)]); } }
    var ring = L.concat(cap, R.slice().reverse(), bc), d = poly(ring) + 'Z';
    var sg = (N[mid][0] * LIGHT[0] + N[mid][1] * LIGHT[1]) > 0 ? 1 : -1, hw = Math.max.apply(null, W) / 2 * 1.02, mc = C[mid];
    var gid = uid('tg'), cid = uid('tc'), s = '';
    s += K.ugrad(gid, mc[0] + N[mid][0] * sg * hw, mc[1] + N[mid][1] * sg * hw, mc[0] - N[mid][0] * sg * hw, mc[1] - N[mid][1] * sg * hw, o.stops || K.cylStops(false).join(''));
    s += '<clipPath id="' + cid + '"><path d="' + d + '"/></clipPath><path d="' + d + '" fill="url(#' + gid + ')"/><g clip-path="url(#' + cid + ')" fill="none" stroke-linecap="round" stroke-linejoin="round">';
    var step = o.lite ? 4 : 3, hl = [], sh = [], rm = [];
    for (i = 0; i < n; i += step) { hl.push([C[i][0] + N[i][0] * sg * W[i] * .2, C[i][1] + N[i][1] * sg * W[i] * .2]); sh.push([C[i][0] - N[i][0] * sg * W[i] * .36, C[i][1] - N[i][1] * sg * W[i] * .36]); rm.push([C[i][0] - N[i][0] * sg * W[i] * .5, C[i][1] - N[i][1] * sg * W[i] * .5]); }
    var wm = Math.max.apply(null, W);
    s += '<path d="' + poly(sh) + '" stroke="' + SHD + '" stroke-opacity=".13" stroke-width="' + n2(wm * .36) + '"/>';
    s += '<path d="' + poly(rm) + '" stroke="' + SHD + '" stroke-opacity=".12" stroke-width="' + n2(wm * .16) + '"/>';
    s += '<path d="' + poly(hl) + '" stroke="#fff" stroke-opacity=".16" stroke-width="' + n2(wm * .3) + '"/><path d="' + poly(hl) + '" stroke="#fff" stroke-opacity=".3" stroke-width="' + n2(wm * .13) + '"/>';
    if (o.creases) o.creases.forEach(function (ci) {
      var j = Math.min(n - 1, ci * per), c0 = C[j], w = W[j] * .46, nn = N[j], tx = -nn[1], ty = nn[0];
      s += '<path d="M' + P(c0[0] + nn[0] * w, c0[1] + nn[1] * w) + 'Q' + P(c0[0] + tx * 2.2, c0[1] + ty * 2.2) + ' ' + P(c0[0] - nn[0] * w, c0[1] - nn[1] * w) + '" stroke="' + SHD + '" stroke-opacity=".3" stroke-width=".9"/>';
      if (!o.lite) s += '<path d="M' + P(c0[0] + nn[0] * w * .7 + tx * 3, c0[1] + nn[1] * w * .7 + ty * 3) + 'Q' + P(c0[0] + tx * 5, c0[1] + ty * 5) + ' ' + P(c0[0] - nn[0] * w * .7 + tx * 3, c0[1] - nn[1] * w * .7 + ty * 3) + '" stroke="' + SHD + '" stroke-opacity=".16" stroke-width=".8"/>';
    });
    s += '</g><path d="' + d + '" class="st-contour" stroke-opacity=".95" stroke-width=".85"/>';
    if (o.nail) {
      var nk = n - 1, ux = Math.cos(af), uy = Math.sin(af), c1 = [e[0] - ux * wr * (o.nail.back || 1.25), e[1] - uy * wr * (o.nail.back || 1.25)], dir = Math.atan2(e[1] - pr[1], e[0] - pr[0]) * 180 / Math.PI + 90, nw = o.nail.w, nl = o.nail.l;
      s += '<g transform="translate(' + P(c1[0] + N[nk][0] * sg * (o.nail.off || 0), c1[1] + N[nk][1] * sg * (o.nail.off || 0)) + ') rotate(' + n2(dir) + ')"><path d="M' + P(-nw / 2, nl * .5) + 'L' + P(-nw / 2, -nl * .18) + 'Q' + P(-nw / 2, -nl * .5) + ' 0 ' + n2(-nl * .5) + 'Q' + P(nw / 2, -nl * .5) + ' ' + P(nw / 2, -nl * .18) + 'L' + P(nw / 2, nl * .5) + 'Q0 ' + n2(nl * .6) + ' ' + P(-nw / 2, nl * .5) + 'Z" fill="url(#k-nail)" stroke="' + SHD + '" stroke-opacity=".28" stroke-width=".7"/><ellipse cx="' + n2(-nw * .14) + '" cy="' + n2(-nl * .1) + '" rx="' + n2(nw * .14) + '" ry="' + n2(nl * .2) + '" fill="#fff" opacity=".55"/><path d="M' + P(-nw / 2, nl * .5) + 'Q0 ' + n2(nl * .66) + ' ' + P(nw / 2, nl * .5) + '" stroke="#fff" stroke-opacity=".5" stroke-width="1" fill="none"/></g>';
    }
    return { s: s, d: d, C: C, W: W, N: N, tip: e, ang: af * 180 / Math.PI };
  }
  /* a smooth blob in skin with a soft shade: palm, back of hand, pouch */
  function skinBlob(pts, o) {
    o = o || {};
    var d = K.smoothClosed(pts), s = '';
    s += '<path d="' + d + '" fill="url(#k-skin-' + (o.grad || 'v') + ')"/>';
    if (o.shade !== false) s += '<path d="' + d + '" fill="url(#k-sh-' + (o.shade || 'br') + ')" opacity="' + (o.sop == null ? .8 : o.sop) + '"/>';
    s += '<path d="' + d + '" fill="url(#k-hi-tl)" opacity=".55"/>' + K.grain(d, o.grain == null ? .2 : o.grain);
    return { s: s + (o.contour === false ? '' : '<path d="' + d + '" class="st-contour" stroke-opacity=".9" stroke-width=".85"/>'), d: d };
  }

  /* ---------- the organ under the skin ---------- */
  function eggD(rx, ry) {
    return 'M0 ' + -ry + 'C' + rx * .92 + ' ' + -ry + ' ' + rx * 1.02 + ' ' + ry * .15 + ' ' + rx * .66 + ' ' + ry * .76 + 'C' + rx * .36 + ' ' + ry * 1.04 + ' ' + -rx * .36 + ' ' + ry * 1.04 + ' ' + -rx * .66 + ' ' + ry * .76 + 'C' + -rx * 1.02 + ' ' + ry * .15 + ' ' + -rx * .92 + ' ' + -ry + ' 0 ' + -ry + 'Z';
  }
  /* fine surface vessels and the faint seam, drawn in the oval's own coordinates (they turn with it) */
  function teSurface(rx, ry, o) {
    o = o || {};
    var r = K.rnd(o.seed || 4), s = '', i;
    s += '<path d="M' + P(rx * .06, -ry) + 'C' + P(rx * .32, -ry * .4) + ' ' + P(rx * .3, ry * .4) + ' ' + P(rx * .06, ry) + '" fill="none" stroke="' + SHD + '" stroke-opacity=".12" stroke-width="2.2"/>';
    for (i = 0; i < 4; i++) {
      var x = (r() - .5) * rx * 1.7, y = -ry * .8 + r() * ry * .5, d = 'M' + P(x, y);
      var k = 4 + Math.floor(r() * 2), px = x, py = y;
      while (k--) { px += (r() - .5) * 14; py += 9 + r() * 12; d += 'Q' + P(px + (r() - .5) * 8, py - 6) + ' ' + P(px, py); }
      s += '<path d="' + d + '" fill="none" stroke="' + mix(SKA, 50, RD) + '" stroke-opacity="' + n2(.22 + r() * .14) + '" stroke-width="' + n2(.7 + r() * .9) + '" stroke-linecap="round"/>';
    }
    if (o.dot) s += '<circle cx="' + n2(-rx * .3) + '" cy="' + n2(-ry * .05) + '" r="3.2" fill="var(--st-guide)" stroke="var(--st-halo)" stroke-width="1.2"/>';
    for (i = 0; i < 8; i++) { var x2 = (r() - .5) * rx * 2.8, y2 = (r() - .5) * ry * 1.8; s += '<path d="M' + P(x2, y2) + 'q' + P(3 + r() * 4, r() * 3 - 1) + ' ' + P(7 + r() * 7, r() * 2) + '" fill="none" stroke="' + SHD + '" stroke-opacity="' + n2(.05 + r() * .06) + '" stroke-width=".9" stroke-linecap="round"/>'; }
    return s;
  }
  /* the testicle as felt through the skin: a smooth oval with a soft sheen. o.surface = markup that turns with it, o.lump a hard pea-sized spot. */
  function teOval(rx, ry, o) {
    o = o || {};
    var d = eggD(rx, ry), id = uid('eg'), gid = uid('eo'), s = '';
    s += rgrad(gid, .38, .3, .85, stp(0, lt(34)) + stp(.32, lt(12)) + stp(.7, mix(SK, 90, SKA)) + stp(1, dk(58)));
    if (!o.noShadow) s += K.softShadow(d, { dx: 3, dy: 6, blur: 5, op: .3 });
    s += '<path d="' + d + '" fill="url(#' + gid + ')"/><path d="' + d + '" fill="url(#k-sh-br)" opacity=".8"/>';
    s += '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath><g clip-path="url(#' + id + ')">' + (o.surface || '') +
      '<path d="M' + P(-rx * .98, ry * .3) + 'C' + P(-rx * .9, ry * .9) + ' ' + P(rx * .4, ry * 1.1) + ' ' + P(rx * .95, ry * .35) + '" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="3.4"/></g>';
    s += K.glint(-rx * .3, -ry * .4, rx * .42, ry * .2, -20, .75) + K.grain(d, .2);
    if (o.lump) {
      var lx = rx * .4, ly = -ry * .16, lr = rx * .24;
      s += '<ellipse cx="' + n2(lx + 2) + '" cy="' + n2(ly + 3) + '" rx="' + n2(lr * 1.1) + '" ry="' + n2(lr) + '" fill="' + SHD + '" opacity=".3" filter="url(#k-b2)"/>' +
        '<path d="' + K.smoothClosed([[lx - lr, ly], [lx - lr * .5, ly - lr * .9], [lx + lr * .5, ly - lr], [lx + lr * 1.05, ly - lr * .1], [lx + lr * .6, ly + lr * .9], [lx - lr * .4, ly + lr]]) + '" fill="url(#k-skin-dome)"/>' +
        '<path d="' + K.smoothClosed([[lx - lr, ly], [lx - lr * .5, ly - lr * .9], [lx + lr * .5, ly - lr], [lx + lr * 1.05, ly - lr * .1], [lx + lr * .6, ly + lr * .9], [lx - lr * .4, ly + lr]]) + '" class="st-contour" stroke-opacity=".9"/>' +
        '<ellipse cx="' + n2(lx - lr * .3) + '" cy="' + n2(ly - lr * .4) + '" rx="' + n2(lr * .42) + '" ry="' + n2(lr * .28) + '" fill="#fff" opacity=".65"/>';
    }
    s += '<path d="' + d + '" class="st-contour" stroke-opacity=".8"/>';
    return s;
  }

  /* the skin pouch around ONE testicle, cropped at the top of the picture where it joins the rest: origin at the centre of the testicle.
     The skin is drawn thin and a little see-through, with a few wrinkles near the neck. */
  function teSleeve(rx, ry) {
    var m = 20, pts = [[-rx * 1.15, -230], [-rx * 1.12, -140], [-rx - m * .8, -84], [-rx - m, -30], [-rx - m * 1.2, 24], [-rx - m * .9, ry * .72], [-rx * .5, ry + m * 1.1], [0, ry + m * 1.45], [rx * .5, ry + m * 1.1], [rx + m * .9, ry * .72], [rx + m * 1.2, 24], [rx + m, -30], [rx + m * .8, -84], [rx * 1.12, -140], [rx * 1.15, -230]];
    var d = K.smoothClosed(pts), id = uid('sl'), s = '', r = K.rnd(5), i;
    s += K.softShadow(d, { dx: 7, dy: 12, blur: 8, op: .3 });
    s += '<path d="' + d + '" fill="url(#k-skin-v)"/><path d="' + d + '" fill="url(#k-sh-edge-h)"/>';
    s += '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath><g clip-path="url(#' + id + ')">';
    s += '<ellipse cx="' + n2(-rx * .5) + '" cy="-70" rx="' + n2(rx * .5) + '" ry="90" fill="url(#k-hi-r)" opacity=".4"/>';
    for (i = 0; i < 10; i++) {
      var y = -200 + i * 27 + r() * 8, w = rx * (.5 + r() * .5), x = (r() - .5) * rx * .6;
      s += '<path d="M' + P(x - w, y) + 'q' + P(w, 4 + r() * 6) + ' ' + P(w * 2, (r() - .5) * 4) + '" fill="none" stroke="' + SHD + '" stroke-opacity="' + n2(.08 + r() * .08) + '" stroke-width="' + n2(1 + r() * 1.4) + '" stroke-linecap="round"/><path d="M' + P(x - w, y - 1.8) + 'q' + P(w, 4 + r() * 6) + ' ' + P(w * 2, (r() - .5) * 4) + '" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".9" stroke-linecap="round"/>';
    }
    s += '</g>' + K.grain(d, .22) + '<path d="' + d + '" class="st-contour" stroke-opacity=".9" stroke-width=".9"/>';
    return s;
  }

  /* ---------- the two panels: what is healthy and what to show to a doctor ---------- */
  function teFeel(x, y, level, w) {
    var names = [tr('soft', 'pehmeä', 'mjuk'), tr('firm', 'napakka', 'fast'), tr('hard', 'kova', 'hård')], s = '<g class="st-call" transform="translate(' + P(x, y) + ')">', i, zw = w / 3;
    for (i = 0; i < 3; i++) {
      var on = i === level, col = !on ? 'var(--st-contour)' : i === 2 ? 'var(--st-warn)' : 'var(--st-ok)';
      s += '<rect x="' + n2(i * zw) + '" y="0" width="' + n2(zw - 3) + '" height="22" rx="8" fill="' + (on ? col : 'none') + '" fill-opacity="' + (on ? .92 : 1) + '" stroke="' + col + '" stroke-width="1.5"/><text x="' + n2(i * zw + (zw - 3) / 2) + '" y="15.5" text-anchor="middle" font-size="12.5" font-weight="700" fill="' + (on ? '#fff' : 'var(--st-pill-ink)') + '" opacity="' + (on ? 1 : .7) + '">' + esc(names[i]) + '</text>';
    }
    return s + '</g>';
  }
  function tePanels(x, y, w, h, k, o) {
    o = o || {};
    var pw = w / 2 - 3, cx = pw / 2, cy = o.compact ? h * .4 : h * .44, rx = 34 * k, ry = 44 * k, gy = h - 64;
    var left = '<rect width="' + n2(pw) + '" height="' + h + '" fill="var(--st-lens-bg)"/><g transform="translate(' + P(cx, cy) + ')">' + teOval(rx, ry, { surface: teSurface(rx, ry) }) + '</g>' + (o.compact ? '' : teFeel(pw * .06, gy, 1, pw * .88));
    var right = '<rect width="' + n2(pw) + '" height="' + h + '" fill="var(--st-lens-bg)"/><g transform="translate(' + P(cx, cy) + ')">' + teOval(rx, ry, { surface: teSurface(rx, ry, { seed: 6 }), lump: true }) + '</g>' + (o.compact ? '' : teFeel(pw * .06, gy, 2, pw * .88) + K.callout(tr('Lump or\nhard spot', 'Patti tai\nkova kohta', 'Knöl eller\nhård punkt'), [pw * .5, 26], [cx + rx * .44, cy - ry * .17], { tone: 'warn', size: 12.5 }));
    var labels = o.compact ? [tr('Smooth, firm', 'Sileä, napakka', 'Slät, fast'), tr('Lump: show a doctor', 'Patti: näytä lääkärille', 'Knöl: visa för läkare')] : [tr('Smooth, fairly firm', 'Sileä, melko napakka', 'Slät, ganska fast'), tr('Show a doctor', 'Näytä lääkärille', 'Visa för en läkare')];
    return K.compare({ x: x, y: y, w: w, h: h, left: left, right: right, labels: labels, size: 12.5 });
  }

  /* ---------- the pinching hand: thumb above, two fingers below, the palm and forearm to the right ---------- */
  function teHandParts() {
    var thumb = tube([[380, 98], [330, 70], [270, 58], [218, 64], [172, 80], [130, 100]], [56, 50, 46, 43, 38, 34], { creases: [3, 4], nail: { w: 17, l: 21, off: 3 }, pad: true, base: true });
    var idx = tube([[380, 164], [324, 184], [274, 196], [230, 200], [186, 196], [154, 189], [128, 178]], [50, 45, 40, 41, 36, 36, 32], { creases: [3, 5], pad: true, base: true });
    var mid = tube([[384, 214], [328, 226], [278, 232], [234, 232], [192, 226], [160, 220], [134, 210]], [50, 45, 40, 41, 36, 36, 32], { creases: [3, 5], pad: true, base: true });
    var palm = skinBlob([[364, 80], [396, 58], [450, 54], [600, 70], [600, 280], [450, 292], [398, 284], [362, 256], [350, 214], [354, 170], [348, 134], [344, 104]], { grad: 'v', shade: 'edge-v' });
    var det = '';
    det += '<path d="M352 110C372 124 390 148 394 184" class="st-crease" stroke-opacity=".24" stroke-width="1.8"/><path d="M360 206C384 214 420 220 460 216" class="st-crease" stroke-opacity=".16" stroke-width="1.5"/><path d="M366 246C392 252 424 252 452 246" class="st-crease" stroke-opacity=".12" stroke-width="1.4"/>';
    det += '<ellipse cx="392" cy="96" rx="40" ry="26" fill="url(#k-hi-r)" opacity=".45" transform="rotate(-14 392 96)"/><ellipse cx="420" cy="170" rx="30" ry="40" fill="url(#k-hi-r)" opacity=".16"/>';
    var r = K.rnd(8), i;
    for (i = 0; i < 12; i++) { var hx = 380 + r() * 100, hy = 90 + r() * 180; det += '<path d="M' + P(hx, hy) + 'l' + P(5 + r() * 5, -1 + r() * 3) + '" stroke="' + SHD + '" stroke-opacity=".12" stroke-width=".7" fill="none" stroke-linecap="round"/>'; }
    return { thumb: thumb.s, index: idx.s, middle: mid.s, palm: palm.s + det };
  }

  var EX = 104, EY = 148, TILT = 12;
  function teRollKeys(t0, t1, cycles, amp, sign, base, prop) {
    var keys = [], n = cycles * 8, i;
    for (i = 0; i <= n; i++) { var k = { t: t0 + (t1 - t0) * i / n, ease: 'linear' }; k[prop] = base + sign * amp * Math.sin(i / 8 * Math.PI * 2); keys.push(k); }
    return keys;
  }
  /* the cross-section of the grip: the thumb pad above, the finger pads below, a testicle in between, and the arrows of the light pressure */
  function tePressInset(c, x, y, r) {
    var s = '', rot = teRollKeys(3, 7.2, 3, 22, 1, 0, 'r'), id = uid('pi');
    var core = '';
    core += '<circle r="24" fill="' + mix(SKA, 70, '#fff') + '"/><circle r="24" fill="url(#k-sh-br)"/>';
    var lobes = '', i;
    for (i = 0; i < 12; i++) { var a = i * 30 * Math.PI / 180; lobes += '<path d="M' + P(Math.cos(a) * 4, Math.sin(a) * 4) + 'L' + P(Math.cos(a) * 19, Math.sin(a) * 19) + '" stroke="#C98F63" stroke-opacity=".6" stroke-width="1"/>'; }
    core += '<circle r="19.5" fill="#EBC9A2"/>' + lobes + '<circle r="19.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/><ellipse cx="0" cy="0" rx="3" ry="5" fill="#F7EFE3"/>';
    core += '<circle r="24" fill="none" stroke="' + SHD + '" stroke-opacity=".35" stroke-width=".9"/><circle cx="0" cy="-20" r="2.6" fill="var(--st-guide)"/><path d="M0 -24L0 -29" stroke="var(--st-guide)" stroke-width="1.6" stroke-linecap="round"/>';
    s += '<rect x="-60" y="-60" width="120" height="120" fill="var(--st-lens-bg)"/>';
    s += c.anim(rot.concat([{ t: 7.5, r: 0, ease: 'inOut' }]), core, { pivot: [0, 0], stillT: 5.3 });
    var pad = function (up) {
      var d = up ? 'M-15 -42C-15 -36 -12 -30 0 -27.5C12 -30 15 -36 15 -42L15 -60L-15 -60Z' : 'M-17 44C-17 38 -13 32 0 29.5C13 32 17 38 17 44L17 60L-17 60Z';
      return '<path d="' + d + '" fill="url(#k-skin-v)"/><path d="' + d + '" fill="url(#k-sh-edge-v)"/><path d="' + d + '" class="st-contour" stroke-opacity=".9"/>';
    };
    var tk = teRollKeys(3, 7.2, 3, 5, 1, 0, 'x'), fk = teRollKeys(3, 7.2, 3, 5, -1, 0, 'x');
    s += c.anim(tk.concat([{ t: 7.5, x: 0 }]), pad(true), { stillT: 5.3 }) + c.anim(fk.concat([{ t: 7.5, x: 0 }]), pad(false), { stillT: 5.3 });
    s += '<path d="M-26 -22L-26 -12" stroke="var(--st-guide)" stroke-width="2.4" stroke-linecap="round"/><path d="M-26 -9L-29.5 -14.5L-22.5 -14.5Z" fill="var(--st-guide)"/><path d="M26 22L26 12" stroke="var(--st-guide)" stroke-width="2.4" stroke-linecap="round"/><path d="M26 9L22.5 14.5L29.5 14.5Z" fill="var(--st-guide)"/>';
    var cut = K.lens(x, y, r, s, {});
    return cut;
  }

  stage.define('s-te-roll', {
    dur: 12,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Hold one testicle gently between your thumb and two fingers', 'Ota yksi kives varovasti peukalon ja kahden sormen väliin', 'Håll en testikel försiktigt mellan tummen och två fingrar'] },
      { at: 3, cap: ['Roll it slowly between your thumb and fingers, like a small egg', 'Pyörittele sitä hitaasti peukalon ja sormien välissä kuin pientä munaa', 'Rulla den långsamt mellan tumme och fingrar, som ett litet ägg'] },
      { at: 7.5, cap: ['A healthy testicle feels smooth and fairly firm, never hard. A lump or hard spot is worth showing to a doctor', 'Terve kives tuntuu sileältä ja melko napakalta, ei koskaan kovalta. Patti tai kova kohta kannattaa näyttää lääkärille', 'En frisk testikel känns slät och ganska fast, aldrig hård. En knöl eller hård punkt är värd att visa för en läkare'] }
    ],
    desc: [
      'A clinical close-up of a hand. The thumb and two fingers hold one testicle, shown as a smooth oval under the skin, and roll it slowly like a small egg. A round inset shows a cross-section of the testicle with the thumb pad above and the finger pads below, pressing gently. Then two ovals are compared: a healthy one that feels smooth and fairly firm, and one with a lump or hard spot that is worth showing to a doctor.',
      'Kliininen lähikuva kädestä. Peukalo ja kaksi sormea pitävät yhtä kivestä, joka näkyy ihon alla sileänä soikiona, ja pyörittävät sitä hitaasti kuin pientä munaa. Pyöreä lähikuva näyttää kiveksen poikkileikkauksen: peukalon pehmus on ylhäällä ja sormien pehmusteet alhaalla, ja ne painavat kevyesti. Lopuksi verrataan kahta soikiota: terve tuntuu sileältä ja melko napakalta, toisessa on patti tai kova kohta, joka kannattaa näyttää lääkärille.',
      'En klinisk närbild av en hand. Tummen och två fingrar håller en testikel, som syns som en slät oval under huden, och rullar den långsamt som ett litet ägg. En rund infälld bild visar ett tvärsnitt av testikeln med tummens kudde ovanför och fingrarnas kuddar nedanför, som trycker lätt. Sedan jämförs två ovaler: en frisk som känns slät och ganska fast, och en med en knöl eller hård punkt som är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = '<rect width="360" height="300" fill="url(#k-wall)"/>';
      var hp = teHandParts();
      s += '<rect width="360" height="300" fill="url(#k-vig)"/>' + K.place({ x: EX, y: EY }, teSleeve(38, 52));
      var seamAnim = c.anim([{ t: 0, x: 0 }, { t: 3, x: 0 }].concat(teRollKeys(3, 7.2, 3, 9, 1, 0, 'x')).concat([{ t: 7.5, x: 0, ease: 'inOut' }]), teSurface(38, 52, { dot: true }), { stillT: 5 });
      var eggTurn = c.anim([{ t: 0, r: TILT }, { t: 3, r: TILT }].concat(teRollKeys(3, 7.2, 3, 8, 1, TILT, 'r')).concat([{ t: 7.5, r: TILT, ease: 'inOut' }]), teOval(38, 52, { surface: seamAnim, noShadow: true }), { stillT: 5 });
      var main = '<g transform="translate(' + EX + ' ' + EY + ')">' + K.softShadow(eggD(38, 52), { dx: 6, dy: 10, blur: 5, op: .36 }) + eggTurn + '</g>';
      /* where the thumb and the fingers press, and the shadow they throw */
      var shad = '<ellipse cx="150" cy="122" rx="28" ry="14" fill="' + SHD + '" opacity=".34" filter="url(#k-b3)"/><ellipse cx="146" cy="190" rx="26" ry="13" fill="' + SHD + '" opacity=".34" filter="url(#k-b3)"/><ellipse cx="190" cy="124" rx="70" ry="22" fill="' + SHD + '" opacity=".16" filter="url(#k-b5)"/><ellipse cx="210" cy="226" rx="80" ry="26" fill="' + SHD + '" opacity=".18" filter="url(#k-b5)"/>';
      var thumbK = [{ t: 0, x: 8, y: -8 }, { t: 1.6, x: 8, y: -8 }, { t: 2.8, x: 0, y: 0, ease: 'out' }].concat(teRollKeys(3, 7.2, 3, 7, 1, 0, 'x').slice(1)).concat([{ t: 7.5, x: 0 }]);
      var fingK = [{ t: 0, x: 8, y: 8 }, { t: 1.6, x: 8, y: 8 }, { t: 2.8, x: 0, y: 0, ease: 'out' }].concat(teRollKeys(3, 7.2, 3, 7, -1, 0, 'x').slice(1)).concat([{ t: 7.5, x: 0 }]);
      var approach = [{ t: 0, x: 150 }, { t: .4, x: 150 }, { t: 2.4, x: 0, ease: 'out' }, { t: 7.3, x: 0 }, { t: 8, x: 190, ease: 'inOut' }];
      var hand = c.anim(approach, '<g transform="translate(34 30) scale(.8)">' + c.anim(fingK, hp.middle + hp.index, { stillT: 5 }) + c.anim(thumbK, hp.thumb, { stillT: 5 }) + hp.palm + '</g>', { stillT: 5 });
      main += c.show(2.2, 7.8, shad, { fade: .5 }) + hand;
      var roll = K.arrow(46, 98, 42, 200, { curve: -22, head: 8 });
      main += c.phaseShow(1, roll, { fade: .4 });
      var inset = tePressInset(c, 62, 242, 38);
      var insetLbl = K.callout(tr('Gentle pressure', 'Kevyt paine', 'Lätt tryck'), [74, 289], null, { size: 12.5 });
      var cap0 = K.callout(tr('Thumb and\ntwo fingers', 'Peukalo ja\nkaksi sormea', 'Tumme och\ntvå fingrar'), [70, 34], [128, 92], { align: 'middle' });
      var cap1 = K.callout(tr('Roll slowly,\nlike a small egg', 'Pyörittele hitaasti,\nkuin pientä munaa', 'Rulla långsamt,\nsom ett litet ägg'), [86, 34], [46, 130], { align: 'middle' });
      if (c.still) {
        var st = K.place({ x: 2, y: -4, s: .7 }, main);
        st += K.place({ x: 258, y: 6, s: .8 }, tePressInset(c, 40, 52, 40) + '');
        st += K.callout(tr('Thumb and\ntwo fingers', 'Peukalo ja\nkaksi sormea', 'Tumme och\ntvå fingrar'), [60, 28], [96, 62], { align: 'middle' }) + c.marker(0, 10, 28, 10);
        st += K.callout(tr('Roll slowly,\nlike a small egg', 'Pyörittele hitaasti,\nkuin pientä munaa', 'Rulla långsamt,\nsom ett litet ägg'), [78, 150], [40, 112], { align: 'middle' }) + c.marker(1, 10, 150, 10);
        st += tePanels(8, 204, 344, 90, .5, { compact: true }) + c.marker(2, 20, 214, 10);
        return s + st;
      }
      s += c.show(0, 8.1, main, { fade: .4 });
      s += c.show(.6, 7.7, inset + insetLbl, { fade: .4 });
      s += c.phaseShow(0, cap0 + c.marker(0, 12, 34, 10), { fade: .35 });
      s += c.phaseShow(1, cap1 + c.marker(1, 12, 34, 10), { fade: .35 });
      s += c.phaseShow(2, tePanels(12, 14, 336, 272, 1.45) + c.marker(2, 26, 28, 11), { fade: .5 });
      return s;
    }
  });

  /* ---------- clinical colours of the anatomical drawing (they stay the same in light and dark: the plate is a lit drawing) ---------- */
  var COL = { epi: '#D9A39A', epiD: '#A66C65', epiL: '#EBC0B6', vas: '#E2B8AB', cord: '#EBCFC4', tun: '#F6EEE6', tis: '#EBC9A2', sept: '#F8F0E4', tub: '#B77C52' };
  function stopsOf(base, lite, dark, edge) { return stp(0, edge) + stp(.2, lite) + stp(.48, base) + stp(.84, dark) + stp(1, edge); }
  /* a simple lit pipe along a curve, for the vas deferens and the cord */
  function pipe(pts, w, col, hi) {
    var d = poly(spl(pts, 6));
    return '<path d="' + d + '" fill="none" stroke="' + SHD + '" stroke-opacity=".3" stroke-width="' + n2(w + 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" transform="translate(' + n2(-w * .17) + ' ' + n2(-w * .12) + ')" fill="none" stroke="#fff" stroke-opacity="' + (hi || .38) + '" stroke-width="' + n2(w * .28) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  /* the epididymis: a soft coiled tube. w scales its thickness, tone 'ok' (salmon) or 'sore' (swollen, red and darker) */
  function epiTube(pts, ws, tone, lite) {
    var sore = tone === 'sore', t = tube(pts, ws, { per: 6, lite: true, stops: sore ? stopsOf('#C4605E', '#E0908A', '#8F3F43', '#7A3036') : stopsOf(COL.epi, COL.epiL, '#B87B73', COL.epiD) });
    var C = t.C, N = t.N, W = t.W, s = t.s, i, id = uid('ec');
    s += '<clipPath id="' + id + '"><path d="' + t.d + '"/></clipPath><g clip-path="url(#' + id + ')" fill="none" stroke-linecap="round">';
    for (i = 2; i < C.length - 2; i += (lite ? 3 : 2)) {
      var n = N[i], w = W[i] * .5, tx = -n[1] * 3, ty = n[0] * 3;
      s += '<path d="M' + P(C[i][0] + n[0] * w - tx, C[i][1] + n[1] * w - ty) + 'L' + P(C[i][0] - n[0] * w + tx, C[i][1] - n[1] * w + ty) + '" stroke="' + (sore ? '#6C2A30' : '#8F5750') + '" stroke-opacity=".42" stroke-width="' + (sore ? 1.3 : .9) + '"/><path d="M' + P(C[i][0] + n[0] * w - tx + 1.4, C[i][1] + n[1] * w - ty - 1) + 'L' + P(C[i][0] - n[0] * w + tx + 1.4, C[i][1] - n[1] * w + ty - 1) + '" stroke="#fff" stroke-opacity=".22" stroke-width=".8"/>';
    }
    return s + '</g>';
  }

  /* ---------- the anatomical drawing: testicle (cut open), epididymis behind it, vas deferens and the cord. Origin: the middle of the testicle. 38 wide x 52 tall (half sizes). ---------- */
  var TES_D = 'M0 -52C22 -52 38 -30 38 0C38 30 22 52 0 52C-22 52 -38 30 -38 0C-38 -30 -22 -52 0 -52Z';
  var CUT_D = 'M5 -51C-22 -51 -38 -28 -38 0C-38 28 -22 51 5 51C16 36 20 12 20 -4C20 -26 13 -42 5 -51Z';
  function teAnat(o) {
    o = o || {};
    var LITE = !!o.lite;
    var s = '', i, id = uid('an'), cid = uid('ac');
    /* cord and vas deferens, behind */
    s += pipe([[46, -64], [47, -110], [43, -180]], 24, COL.cord, .3);
    s += '<path d="M40 -70C41 -110 37 -150 35 -180" fill="none" stroke="#B96A6A" stroke-opacity=".7" stroke-width="1.5"/><path d="M52 -70C53 -110 49 -150 47 -180" fill="none" stroke="#7E93BE" stroke-opacity=".7" stroke-width="1.5"/>';
    s += pipe([[26, 60], [44, 66], [60, 42], [64, -20], [62, -70], [52, -112], [46, -180]], 7.4, COL.vas, .5);
    /* epididymis: head over the upper pole, body down the back, tail at the bottom */
    s += epiTube([[0, -58], [20, -63], [42, -52], [53, -24], [54, 12], [47, 42], [34, 59], [25, 58]], [14, 23, 21, 16, 15, 14, 15, 11], 'ok', LITE);
    /* the testicle */
    s += K.softShadow(TES_D, { dx: 3, dy: 5, blur: 3, op: .3 });
    s += rgrad(id + 'g', .38, .3, .85, stp(0, '#FFFFFF') + stp(.35, COL.tun) + stp(1, '#CDB8A6'));
    s += '<path d="' + TES_D + '" fill="url(#' + id + 'g)"/>';
    if (o.cut !== false) {
      s += rgrad(id + 'i', .55, .45, .75, stp(0, '#F3D5B1') + stp(.7, COL.tis) + stp(1, '#CFA079'));
      s += '<clipPath id="' + cid + '"><path d="' + CUT_D + '"/></clipPath><path d="' + CUT_D + '" fill="url(#' + id + 'i)"/><g clip-path="url(#' + cid + ')" fill="none" stroke-linecap="round">';
      for (i = 0; i < (LITE ? 7 : 11); i++) {
        var a = (118 + i * (LITE ? 20 : 12.6)) * Math.PI / 180, ex = 15 + Math.cos(a) * 66, ey = -2 + Math.sin(a) * 66;
        s += '<path d="M15 -2L' + P(ex, ey) + '" stroke="' + COL.sept + '" stroke-opacity=".85" stroke-width="1.5"/>';
        var b = a + .1, k, d2 = 'M' + P(15 + Math.cos(b) * 12, -2 + Math.sin(b) * 12), r = 12;
        for (k = 0; k < 7; k++) { r += 6.6; d2 += 'q' + P(Math.cos(b + (k % 2 ? .12 : -.12)) * 3.2, Math.sin(b + (k % 2 ? .12 : -.12)) * 3.2) + ' ' + P(Math.cos(b) * 6.6 + (k % 2 ? 1.8 : -1.8) * -Math.sin(b), Math.sin(b) * 6.6 + (k % 2 ? 1.8 : -1.8) * Math.cos(b)); }
        s += '<path d="' + d2 + '" stroke="' + COL.tub + '" stroke-opacity=".6" stroke-width=".9"/>';
      }
      s += '</g><ellipse cx="14" cy="-2" rx="3.6" ry="11" fill="#FAF3E8" stroke="#BFA98C" stroke-width=".7"/>';
      /* the cut edge: the pearly outer coat has a thickness, and the cut throws a faint shadow */
      s += '<path d="' + CUT_D + '" fill="none" stroke="' + SHD + '" stroke-opacity=".22" stroke-width="3" transform="translate(1.2 1.6)"/><path d="' + CUT_D + '" fill="none" stroke="#FFFDF8" stroke-width="2"/><path d="' + CUT_D + '" class="st-contour" stroke-opacity=".55" stroke-width=".7"/>';
      for (i = 0; i < 3; i++) s += '<path d="M18 ' + (-12 + i * 9) + 'C26 ' + (-24 + i * 6) + ' 30 ' + (-40 + i * 3) + ' 30 -50" fill="none" stroke="#E7C3B8" stroke-width="1.1" stroke-opacity=".9"/>';
    }
    s += '<path d="M24 -30C32 -20 34 -4 33 14C32 28 26 40 18 46" fill="none" stroke="#C98A82" stroke-opacity=".5" stroke-width=".9"/><path d="M28 -34C36 -20 38 0 36 18" fill="none" stroke="#C98A82" stroke-opacity=".35" stroke-width=".8"/>';
    s += '<path d="' + TES_D + '" fill="url(#k-sh-br)" opacity=".5"/><path d="' + TES_D + '" class="st-contour" stroke-opacity=".75"/>' + K.glint(-14, -34, 13, 7, -26, .65);
    return s;
  }
  /* the soft skin of the scrotum seen as a veil over the drawing, so the fingertip can touch it */
  function teVeil() {
    var d = K.smoothClosed([[-50, -84], [-64, -30], [-66, 28], [-46, 72], [0, 90], [50, 80], [80, 38], [84, -20], [74, -72], [44, -100]]);
    return '<path d="' + d + '" fill="' + SK + '" fill-opacity=".2"/><path d="' + d + '" fill="url(#k-sh-br)" opacity=".5"/><path d="' + d + '" fill="none" stroke="' + SK + '" stroke-opacity=".7" stroke-width="2.2"/><path d="' + d + '" class="st-contour" stroke-opacity=".55" stroke-dasharray="1 0"/><ellipse cx="-30" cy="-44" rx="22" ry="12" fill="#fff" opacity=".3" transform="rotate(-30 -30 -44)"/>';
  }
  /* the plate behind the anatomical scenes: soft paper with a vignette */
  function tePlate() { return '<rect width="360" height="300" fill="url(#k-wall)"/><rect width="360" height="300" fill="url(#k-vig)"/>'; }
  /* a finger seen from the side, pad at the origin, coming from the right (r turns it about the pad) */
  function teFinger(len, w, o) {
    o = o || {};
    return tube([[len, 9], [len * .7, 1], [len * .42, -5], [len * .18, -3], [0, 0]], [w * 1.1, w, w * 1.07, w * .98, w * .9], { creases: [2, 3], pad: true, base: true, nail: o.nail, per: 5 }).s;
  }

  /* ---------- s-te-warm ---------- */
  function teClock(c, x, y, r) {
    var s = '<g transform="translate(' + P(x, y) + ')"><circle cx="1.5" cy="3" r="' + (r + 2) + '" fill="' + SHD + '" opacity=".3" filter="url(#k-b2)"/><circle r="' + (r + 4) + '" fill="url(#k-metal)"/><circle r="' + r + '" fill="url(#k-paper)"/><circle r="' + r + '" fill="url(#k-hi-tl)"/>', i;
    for (i = 0; i < 12; i++) s += '<path d="M0 ' + (-r + 3) + 'L0 ' + (-r + (i % 3 ? 5.4 : 7.6)) + '" transform="rotate(' + i * 30 + ')" stroke="var(--st-ink)" stroke-width="' + (i % 3 ? 1 : 1.7) + '" stroke-linecap="round"/>';
    s += c.anim([{ t: 0, r: 300 }, { t: 3, r: 300 }, { t: 8, r: 345, ease: 'linear' }], '<path d="M0 3L0 ' + n2(-r * .5) + '" stroke="var(--st-ink)" stroke-width="2.6" stroke-linecap="round"/>', { pivot: [0, 0], stillT: 8 });
    s += c.anim([{ t: 0, r: 0 }, { t: 3, r: 0 }, { t: 8, r: 270, ease: 'linear' }], '<path d="M0 4L0 ' + n2(-r * .78) + '" stroke="var(--st-guide)" stroke-width="1.9" stroke-linecap="round"/>', { pivot: [0, 0], stillT: 8 });
    return s + '<circle r="2.4" fill="var(--st-ink)"/></g>';
  }
  function teWater(c, x, y, r, s, len) {
    var water = '', i, n = 6;
    for (i = 0; i < n; i++) {
      var x0 = -17 + i * (34 / (n - 1)), x1 = x0 * 2.2 + (i - (n - 1) / 2) * 1.2;
      water += '<path d="M' + P(x0, 8) + 'L' + P(x1, len) + '" stroke="#fff" stroke-opacity=".92" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="8 9" fill="none"/><path d="M' + P(x0 + .4, 8) + 'L' + P(x1 + .4, len) + '" stroke="var(--st-water)" stroke-opacity=".9" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 9" fill="none"/>';
    }
    if (c.still) return K.place({ x: x, y: y, r: r, s: s }, '<g opacity=".85">' + water + '</g>');
    return K.place({ x: x, y: y, r: r, s: s }, c.loop(.7, [{ t: 0, y: 0, o: 0 }, { t: .1, o: 1 }, { t: .7, y: 17, o: 0 }], '<g>' + water + '</g>', { ease: 'linear' }) + c.loop(.7, [{ t: 0, y: -8.5, o: 0 }, { t: .1, o: 1 }, { t: .7, y: 8.5, o: 0 }], '<g>' + water + '</g>', { ease: 'linear' }));
  }
  function teSteam(c) {
    var s = '', i, pos = [[170, 150], [220, 130], [120, 130], [268, 160], [186, 100]];
    for (i = 0; i < pos.length; i++) { var pr = [3, 4, 6, 4, 6][i]; s += c.loop(pr, [{ t: 0, x: 0, y: 40, o: 0, s: .7 }, { t: pr * .2, o: .5 }, { t: pr, x: (i % 2 ? 22 : -22), y: -46, o: 0, s: 1.7 }], '<circle cx="' + pos[i][0] + '" cy="' + pos[i][1] + '" r="' + (30 + i * 4) + '" fill="url(#k-hi-r)"/>', { ease: 'linear', center: true }); }
    return s;
  }
  /* the same two drawings, small, for the motion-off picture: k scales the 165 x 272 drawing, dy is the part of its top that is cut off */
  function teCompact(x, y, w, h, left, right, k, dy, labels, tones) {
    var pw = w / 2 - 3, ox = (pw - 165 * k) / 2, mk = function (g) { return '<g transform="translate(' + P(ox, -dy * k) + ') scale(' + k + ')">' + g + '</g>'; };
    var bg = '<rect width="' + n2(pw) + '" height="' + h + '" fill="var(--st-lens-bg)"/>';
    return K.compare({ x: x, y: y, w: w, h: h, left: bg + mk(left), right: bg + mk(right), labels: labels, tones: tones, size: 12.5 });
  }
  function teWarmSide(cold, pw, h) {
    var ox = pw / 2, oy = 124, k1 = .66, k2 = .84, g = '<rect x="-400" y="-400" width="1200" height="1200" fill="' + (cold ? '#6FA7D8' : '#F2A25C') + '" opacity=".14"/>';
    if (cold) return g + '<g transform="translate(' + P(ox, oy) + ') scale(' + k1 + ')">' + teColdBag() + '</g>';
    g += '<g transform="translate(' + P(ox, oy) + ') scale(' + k2 + ')">' + teAnat({ cut: false, lite: true }) + teVeil() + '</g>';
    var by = oy + 50 * k1, ey = oy + 92 * k2;
    return g + '<g class="st-call"><path d="M8 ' + n2(by) + 'L' + n2(pw - 8) + ' ' + n2(by) + '" stroke="var(--st-guide)" stroke-width="1.6" stroke-dasharray="4 4"/><path d="M' + n2(pw - 22) + ' ' + n2(by + 2) + 'L' + n2(pw - 22) + ' ' + n2(ey - 12) + '" class="st-arrow"/><path d="M' + n2(pw - 22) + ' ' + n2(ey) + 'l-7 -13l14 0Z" class="st-arrow-head"/></g>';
  }
  function teWarmPanels(x, y, w, h, compact) {
    var pw = w / 2 - 3, bg = '<rect width="' + n2(pw) + '" height="' + h + '" fill="var(--st-lens-bg)"/>';
    if (compact) return teCompact(x, y, w, h, teWarmSide(true, 165, 272), teWarmSide(false, 165, 272), .46, 34, [tr('Cold: drawn up', 'Kylmä: supistunut', 'Kall: hoptdragen'), tr('Warm: hangs lower', 'Lämmin: alempana', 'Varm: hänger lägre')], ['warn', 'ok']);
    var lo = bg + teWarmSide(true, pw, h) + K.callout(tr('Drawn up, tight', 'Supistunut, kireä', 'Hoptdragen, spänd'), [pw / 2, 232], null, { size: 12.5 }) + K.callout(tr('Cold', 'Kylmä', 'Kall'), [pw / 2, 22], null, { size: 12.5 });
    var ro = bg + teWarmSide(false, pw, h) + K.callout(tr('Hangs lower', 'Roikkuu alempana', 'Hänger lägre'), [pw / 2, 232], null, { size: 12.5 }) + K.callout(tr('Warm', 'Lämmin', 'Varm'), [pw / 2, 22], null, { size: 12.5 });
    return K.compare({ x: x, y: y, w: w, h: h, left: lo, right: ro, labels: ['', ''], tones: ['warn', 'ok'], size: 12.5 });
  }
  stage.define('s-te-warm', {
    dur: 12,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Pick a warm moment: a warm bath or shower', 'Valitse lämmin hetki: lämmin kylpy tai suihku', 'Välj ett varmt ögonblick: ett varmt bad eller en varm dusch'] },
      { at: 3, cap: ['Let the warm water relax the skin for a few minutes', 'Anna lämpimän veden rentouttaa ihoa muutaman minuutin ajan', 'Låt det varma vattnet slappna av huden i några minuter'] },
      { at: 8, cap: ['Check during or just after the bath or shower, when the scrotum has warmed up and loosened', 'Tarkista kylvyn tai suihkun aikana tai heti sen jälkeen, kun kivespussi on lämmennyt ja löystynyt', 'Undersök under eller strax efter badet eller duschen, när pungen har blivit varm och slapp'] }
    ],
    desc: [
      'A bathroom with tiled walls. A shower head runs warm water onto the shoulders of a person while steam rises, and a wall clock turns for a few minutes. Then two small drawings are compared: in the cold the skin of the scrotum is drawn up and tight, and when warm it is loose and relaxed and hangs lower. The best time to check is during or just after a warm bath or shower.',
      'Kylpyhuone, jonka seinät ovat laatoitettu. Suihku valuttaa lämmintä vettä henkilön hartioille höyryn noustessa, ja seinäkello kiertää muutaman minuutin. Sitten verrataan kahta pientä kuvaa: kylmässä kivespussin iho on supistunut ja kireä, lämpimänä se on löysä ja rento ja roikkuu alempana. Paras hetki tarkistaa on lämpimän kylvyn tai suihkun aikana tai heti sen jälkeen.',
      'Ett badrum med kaklade väggar. Ett duschhuvud låter varmt vatten rinna över en persons axlar medan ånga stiger, och en väggklocka går några minuter. Sedan jämförs två små teckningar: i kyla är pungens hud hopdragen och spänd, och när den är varm är den slapp och avslappnad och hänger lägre. Bästa tidpunkten att undersöka är under eller strax efter ett varmt bad eller en varm dusch.'
    ],
    draw: function (c) {
      var s = K.room({ kind: 'bath' });
      /* the person: head and shoulders only, eyes closed in the warm water */
      var person = K.torso({ form: 'male', len: 150 }) + K.head({ x: 0, y: -50, hair: 'short', eyes: 'closed', face: 'calm' });
      var shoulders = '<ellipse cx="-44" cy="-4" rx="22" ry="8" fill="url(#k-hi-r)" opacity=".7"/><ellipse cx="46" cy="-2" rx="18" ry="6" fill="url(#k-hi-r)" opacity=".55"/>' + K.drops(-72, -10, 140, 34, 10, 14) + K.drops(-34, -92, 20, 14, 2, 5);
      s += K.place({ x: 262, y: 262, s: .86 }, person + shoulders);
      s += K.showerHead({ x: 112, y: 64, r: -24, s: 1.1, c: c, streams: 4, len: 150 }) + teWater(c, 112, 64, -24, 1.1, 176);
      s += teSteam(c);
      s += teClock(c, 318, 52, 26);
      var warm = K.callout(tr('Warm shower\nor bath', 'Lämmin suihku\ntai kylpy', 'Varm dusch\neller bad'), [66, 150], [118, 112], { align: 'middle' });
      var few = K.callout(tr('A few\nminutes', 'Muutama\nminuutti', 'Några\nminuter'), [276, 108], [318, 80], { align: 'middle' });
      if (c.still) {
        var st = s + warm + few + c.marker(0, 16, 166, 10);
        st += teWarmPanels(8, 190, 344, 104, true);
        return st + c.marker(2, 20, 204, 10);
      }
      s += c.phaseShow(0, warm + c.marker(0, 18, 178, 10), { fade: .35 });
      s += c.phaseShow(1, few + c.marker(1, 18, 178, 10), { fade: .35 });
      var scene = s;
      return '<g>' + c.fade([[0, 1], [7.4, 1], [8, 0]], scene, { stillO: 1 }) + '</g>' + c.phaseShow(2, teWarmPanels(12, 14, 336, 272) + c.marker(2, 26, 28, 11), { fade: .5 });
    }
  });

  /* ---------- s-te-hold ---------- */
  /* a pearly testicle seen through the skin, for the little balance */
  function teTestisFront(rx, ry) {
    var d = eggD(rx, ry), gid = uid('tf'), s = '';
    s += K.softShadow(d, { dx: 3, dy: 5, blur: 3, op: .28 });
    s += rgrad(gid, .38, .3, .85, stp(0, '#FFFFFF') + stp(.38, COL.tun) + stp(1, '#CDB8A6'));
    s += '<path d="' + d + '" fill="url(#' + gid + ')"/><path d="' + d + '" fill="url(#k-sh-br)" opacity=".5"/>';
    s += '<path d="M' + P(-rx * .1, -ry * .8) + 'C' + P(rx * .3, -ry * .5) + ' ' + P(rx * .4, ry * .2) + ' ' + P(rx * .1, ry * .7) + '" fill="none" stroke="#C98A82" stroke-opacity=".5" stroke-width=".9"/>';
    s += '<path d="' + d + '" class="st-contour" stroke-opacity=".75"/>' + K.glint(-rx * .3, -ry * .4, rx * .4, ry * .2, -20, .7);
    return s;
  }
  /* the scrotum in cold weather, seen from the side: a small skin bag drawn up close to the body, with fine wrinkles. Same frame as teAnat + teVeil. */
  function teAnatMini() {
    var d = eggD(34, 46), gid = uid('am'), s = '';
    s += pipe([[24, -40], [30, -110], [22, -200]], 20, COL.cord, .3) + pipe([[24, -40], [26, 20], [22, 40]], 9, COL.epi, .4);
    s += K.softShadow(d, { dx: 3, dy: 5, blur: 3, op: .28 }) + rgrad(gid, .38, .3, .85, stp(0, '#FFFFFF') + stp(.38, COL.tun) + stp(1, '#CDB8A6'));
    return s + '<path d="' + d + '" fill="url(#' + gid + ')"/><path d="' + d + '" fill="url(#k-sh-br)" opacity=".5"/><path d="' + d + '" class="st-contour" stroke-opacity=".75"/>' + K.glint(-12, -20, 12, 6, -24, .65);
  }
  function teColdBag() {
    var d = K.smoothClosed([[-46, -64], [-56, -30], [-54, 8], [-34, 38], [0, 48], [34, 38], [56, 8], [58, -30], [48, -64], [26, -88], [0, -96], [-24, -88]]), id = uid('cb'), r = K.rnd(15), i, s = '';
    s += K.softShadow(d, { dx: 3, dy: 6, blur: 4, op: .22 });
    s += '<g transform="translate(2 -10) scale(.95)">' + teAnatMini() + '</g>';
    s += '<path d="' + d + '" fill="' + SK + '" fill-opacity=".34"/><path d="' + d + '" fill="url(#k-sh-br)" opacity=".55"/><clipPath id="' + id + '"><path d="' + d + '"/></clipPath><g clip-path="url(#' + id + ')" fill="none" stroke-linecap="round">';
    for (i = 0; i < 18; i++) {
      var x = -56 + r() * 112, y = -50 + r() * 100, len = 10 + r() * 22;
      s += '<path d="M' + P(x, y) + 'q' + P(len / 2, (r() - .3) * 6) + ' ' + P(len, (r() - .5) * 3) + '" stroke="' + SHD + '" stroke-opacity="' + n2(.22 + r() * .12) + '" stroke-width="' + n2(.9 + r() * 1.3) + '"/><path d="M' + P(x, y - 1.8) + 'q' + P(len / 2, (r() - .3) * 4) + ' ' + P(len, (r() - .5) * 2) + '" stroke="#fff" stroke-opacity=".22" stroke-width=".8"/>';
    }
    return s + '</g><path d="' + d + '" fill="none" stroke="' + SK + '" stroke-opacity=".7" stroke-width="2.2"/><path d="' + d + '" class="st-contour" stroke-opacity=".6"/>';
  }
  /* the cupped hand seen from the side: the fingers curl up in front of the bag, the thumb lies along the near side, the palm is under it and the wrist leaves at
     the bottom right. Drawn for a bag whose lowest point is at (150, 210). Returns { back, front } (behind the bag, and in front of it). */
  function teCupHand(lite) {
    var back = tube([[238, 214], [196, 214], [152, 206], [116, 190], [96, 164]], [34, 33, 31, 29, 26], { pad: true, base: true, lite: true }).s +
      tube([[236, 206], [196, 204], [152, 196], [120, 178], [104, 152]], [34, 33, 31, 29, 26], { creases: [2, 3], pad: true, base: true, lite: true }).s;
    var idx = tube([[250, 232], [200, 232], [154, 224], [114, 208], [90, 182], [82, 160]], [40, 38, 36, 36, 32, 30], { creases: [2, 4], pad: true, base: true, lite: !!lite, nail: { w: 15, l: 19, off: 2 } });
    var palm = skinBlob([[200, 226], [250, 212], [310, 220], [356, 244], [400, 300], [228, 306], [196, 270]], { grad: 'v', shade: 'edge-v' });
    var wrist = '<path d="M260 244C284 252 316 258 346 264" class="st-crease" stroke-opacity=".2" stroke-width="1.6"/><path d="M236 262C262 272 292 278 322 282" class="st-crease" stroke-opacity=".14" stroke-width="1.3"/><ellipse cx="270" cy="236" rx="30" ry="12" fill="url(#k-hi-r)" opacity=".4"/>';
    var thumb = tube([[300, 262], [262, 238], [234, 206], [214, 178]], [50, 44, 38, 32], { creases: [2], pad: true, base: true, lite: !!lite, nail: { w: 13, l: 17, off: 2 } });
    var shadow = '<ellipse cx="170" cy="206" rx="64" ry="12" fill="' + SHD + '" opacity=".26" filter="url(#k-b3)"/>';
    return { back: back, front: shadow + idx.s + palm.s + wrist + thumb.s };
  }
  function teHandAt(x, y, s, m) { return '<g transform="translate(' + P(x, y) + ') scale(' + s + ') translate(-150 -210)">' + m + '</g>'; }
  function teBalance(c, w) {
    /* a small balance: the left pan is a little lower and holds the slightly bigger testicle. Origin: top left of the panel. */
    var cx = w / 2, py = 92, L = 40, s = '';
    var keys = [{ t: 0, r: 0 }, { t: 6.3, r: 0 }, { t: 7.1, r: -10 }, { t: 7.9, r: 6 }, { t: 8.6, r: -3.4 }, { t: 9.1, r: -5.5 }];
    var yl = keys.map(function (k) { return { t: k.t, y: -L * Math.sin(k.r * Math.PI / 180) }; }), yr = keys.map(function (k) { return { t: k.t, y: L * Math.sin(k.r * Math.PI / 180) }; });
    s += '<path d="M' + P(cx - 24, py + 84) + 'L' + P(cx + 24, py + 84) + 'L' + P(cx + 11, py + 70) + 'L' + P(cx - 11, py + 70) + 'Z" fill="url(#k-metal)"/><path d="M' + P(cx - 4, py) + 'L' + P(cx - 4, py + 72) + 'L' + P(cx + 4, py + 72) + 'L' + P(cx + 4, py) + 'Z" fill="url(#k-metal)"/>';
    var pan = function (x, y, rx, ry) {
      var g = '<path d="M' + P(x - rx * .9, y) + 'L' + P(x, y - 38) + 'L' + P(x + rx * .9, y) + '" fill="none" stroke="var(--st-metal-d)" stroke-width="1.1"/>';
      g += '<path d="M' + P(x - rx - 6, y) + 'Q' + P(x, y + 18) + ' ' + P(x + rx + 6, y) + 'Z" fill="url(#k-metal-v)" stroke="' + SHD + '" stroke-opacity=".3" stroke-width=".8"/>';
      g += '<g transform="translate(' + P(x, y - ry + 2) + ')">' + teTestisFront(rx, ry) + '</g>';
      return g;
    };
    var beam = '<path d="M' + P(cx - L - 4, py - 3) + 'L' + P(cx + L + 4, py - 3) + 'L' + P(cx + L + 4, py + 3) + 'L' + P(cx - L - 4, py + 3) + 'Z" fill="url(#k-metal-v)" stroke="' + SHD + '" stroke-opacity=".3" stroke-width=".8"/><circle cx="' + cx + '" cy="' + py + '" r="5" fill="url(#k-metal)" stroke="' + SHD + '" stroke-opacity=".4" stroke-width=".8"/>';
    s += c ? c.anim(keys, beam, { pivot: [cx, py], stillT: 9.1 }) : '<g transform="rotate(-5.5 ' + cx + ' ' + py + ')">' + beam + '</g>';
    var gl = pan(cx - L, py + 40, 15, 20), gr = pan(cx + L, py + 40, 13, 17);
    s += c ? c.anim(yl, gl, { stillT: 9.1 }) + c.anim(yr, gr, { stillT: 9.1 }) : '<g transform="translate(0 3.8)">' + gl + '</g><g transform="translate(0 -3.8)">' + gr + '</g>';
    return s;
  }
  function teHoldPanel(c, x, y, w, h) {
    var s = '<g transform="translate(' + P(x, y) + ')"><path d="' + K.rr(0, 0, w, h, 12) + '" fill="var(--st-lens-bg)"/><path d="' + K.rr(0, 0, w, h, 12) + '" fill="none" stroke="var(--st-contour)" stroke-width="1.2"/>';
    s += teBalance(c, w);
    s += K.callout(tr('Compare size\nand weight', 'Vertaa kokoa\nja painoa', 'Jämför\nstorlek och\nvikt'), [w / 2, 42], null, { size: 12.5 });
    s += '<text class="st-lbl-halo" x="' + n2(w / 2 - 40) + '" y="' + (h - 12) + '" text-anchor="middle" font-size="12.5">' + esc(tr('Left', 'Vasen', 'Vänster')) + '</text><text class="st-lbl-halo" x="' + n2(w / 2 + 40) + '" y="' + (h - 12) + '" text-anchor="middle" font-size="12.5">' + esc(tr('Right', 'Oikea', 'Höger')) + '</text>';
    return s + '</g>';
  }
  stage.define('s-te-hold', {
    dur: 12,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Cup your scrotum, the skin pouch around the testicles, in the palm of one hand', 'Ota kivespussi, kivesten ympärillä oleva ihopussi, toisen kätesi kämmenelle', 'Låt pungen, hudpåsen runt testiklarna, vila i handflatan på ena handen'] },
      { at: 2.8, cap: ['Gently lift and hold it', 'Nosta ja pidä sitä varovasti', 'Lyft och håll den försiktigt'] },
      { at: 6, cap: ['Compare the size and weight of the two sides', 'Vertaa molempien puolten kokoa ja painoa', 'Jämför storlek och vikt på de två sidorna'] },
      { at: 9.5, cap: ['One testicle a little bigger or lower is common', 'Toinen kives hieman isompana tai alempana on tavallista', 'Att den ena testikeln är lite större eller hänger lägre är vanligt'] }
    ],
    desc: [
      'A clinical side view. The scrotum is drawn as a thin skin bag with a testicle showing through it. A hand rises from below and cups it in the palm, with the fingers curled up in front and the thumb along the side, then gently lifts and holds it. A second testicle appears behind, a little lower, and a small balance compares the left and right sides for size and weight, with the note that one testicle a little bigger or lower is common.',
      'Kliininen sivukuva. Kivespussi on piirretty ohueksi ihopussiksi, jonka läpi kives näkyy. Käsi nousee alhaalta ja ottaa sen kämmenelleen, sormet kaareutuvat ylös edessä ja peukalo on sivulla, ja nostaa ja pitää sitä sitten varovasti. Toinen kives tulee näkyviin takana hieman alempana, ja pieni vaaka vertaa vasenta ja oikeaa puolta koon ja painon suhteen. Huomautus kertoo, että toinen kives hieman isompana tai alempana on tavallista.',
      'En klinisk sidovy. Pungen är ritad som en tunn hudpåse med en testikel synlig genom den. En hand stiger underifrån och tar den i handflatan, med fingrarna böjda uppåt framtill och tummen längs sidan, och lyfter och håller den sedan försiktigt. En andra testikel syns bakom, något lägre, och en liten våg jämför vänster och höger sida i storlek och vikt, med anmärkningen att det är vanligt att den ena testikeln är lite större eller hänger lägre.'
    ],
    draw: function (c) {
      var s = tePlate(), hand = teCupHand(), OX = 114, OY = 112, SC = 1.08, BY = OY + 90 * SC;
      var bag = '<g transform="translate(' + OX + ' ' + OY + ') scale(' + SC + ')">' + teAnat() + teVeil() + '</g>';
      var ghost = '<g transform="translate(' + (OX - 30) + ' ' + (OY + 26) + ') scale(' + SC * .98 + ')"><path d="' + TES_D + '" fill="' + COL.tun + '" fill-opacity=".5"/><path d="' + TES_D + '" fill="none" stroke="var(--st-guide)" stroke-width="2" stroke-dasharray="5 4"/></g>';
      var bagAnim = c.anim([{ t: 0, sy: 1 }, { t: 3, sy: 1 }, { t: 5, sy: .965, ease: 'inOut' }, { t: 10.5, sy: .965 }, { t: 11.5, sy: 1 }], bag, { pivot: [OX, OY - 80], stillT: 6 });
      var rise = [{ t: 0, y: 70 }, { t: .4, y: 70 }, { t: 2.6, y: 0, ease: 'out' }, { t: 3, y: 0 }, { t: 5, y: -8, ease: 'inOut' }, { t: 10.5, y: -8 }, { t: 11.5, y: 70, ease: 'inOut' }];
      var main = c.anim(rise, teHandAt(OX, BY, 1, hand.back), { stillT: 6 }) + bagAnim + c.anim(rise, teHandAt(OX, BY, 1, hand.front), { stillT: 6 });
      var lift = K.arrow(30, 258, 30, 212, { head: 9 });
      var thisSide = K.callout(tr('This side', 'Tämä puoli', 'Den här sidan'), [58, 92], [OX - 14, OY + 8], { align: 'middle' }), otherSide = K.callout(tr('Other side', 'Toinen puoli', 'Andra sidan'), [52, 150], [OX - 46, OY + 52], { align: 'middle' });
      var cap0 = K.callout(tr('Palm under the\nscrotum', 'Kämmen\nkivespussin alla', 'Handflata under\npungen'), [84, 266], [OX - 14, BY + 20], { align: 'middle' });
      var cap1 = K.callout(tr('Lift gently', 'Nosta varovasti', 'Lyft försiktigt'), [54, 188], null, { align: 'middle' });
      var note = K.callout(tr('One a little\nbigger or lower\nis common', 'Toinen hieman\nisompi tai alempana\non tavallista', 'Att en är lite\nstörre eller lägre\när vanligt'), [352, 238], [OX + 40, OY + 40], { align: 'end', tone: 'ok' });
      var panel = teHoldPanel(c, 244, 12, 112, 178);
      if (c.still) {
        var st = s + teHandAt(OX, BY, 1, hand.back) + ghost + bag + teHandAt(OX, BY, 1, hand.front);
        st += K.callout(tr('Palm under the\nscrotum', 'Kämmen\nkivespussin alla', 'Handflata under\npungen'), [84, 268], [OX - 14, BY + 20], { align: 'middle' }) + c.marker(0, 12, 268, 10);
        st += lift + c.marker(1, 30, 236, 10) + thisSide + otherSide;
        st += teHoldPanel(null, 244, 12, 112, 178) + c.marker(2, 256, 16, 9);
        st += note + c.marker(3, 210, 238, 10);
        return st;
      }
      s += main;
      s += c.phaseShow(0, cap0 + c.marker(0, 12, 268, 10), { fade: .35 });
      s += c.phaseShow(1, lift + cap1 + c.marker(1, 30, 266, 10), { fade: .35 });
      s += c.show(6, 11.6, panel + c.marker(2, 256, 16, 9), { fade: .5 });
      s += c.show(6.2, 11.6, ghost + thisSide + otherSide, { fade: .5 });
      s += c.phaseShow(3, note + c.marker(3, 210, 238, 10), { fade: .4 });
      return s;
    }
  });

  /* ---------- s-te-surface ---------- */
  /* faint latitude and meridian curves: they make the oval read as a rounded 3D form */
  function teGrid(rx, ry) {
    var s = '', i;
    for (i = -2; i <= 2; i++) {
      var y = i * ry * .34, w = rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry)));
      s += '<path d="M' + P(-w, y) + 'Q0 ' + n2(y + ry * .1) + ' ' + P(w, y) + '" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/><path d="M' + P(-w, y + 2) + 'Q0 ' + n2(y + ry * .1 + 2) + ' ' + P(w, y + 2) + '" fill="none" stroke="' + SHD + '" stroke-opacity=".06" stroke-width="1"/>';
    }
    s += '<path d="M0 ' + -ry + 'Q' + n2(rx * .2) + ' 0 0 ' + ry + '" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="1.2"/>';
    return s;
  }
  /* a back-and-forth path over the oval, row by row */
  function teSweep(rx, ry) {
    var d = '', i, rows = 5, pw = 0, py = 0, pdir = 1;
    for (i = 0; i < rows; i++) {
      var y = ry * (-.68 + i * .34), w = rx * .7 * Math.sqrt(Math.max(.05, 1 - (y / ry) * (y / ry))), dir = i % 2 ? -1 : 1;
      if (i === 0) d += 'M' + P(-w, y); else d += 'C' + P(pdir * (pw + 7), py) + ' ' + P(pdir * (w + 7), y) + ' ' + P(pdir * w, y);
      d += 'L' + P(dir * w, y); pw = w; py = y; pdir = dir;
    }
    return d;
  }
  function teBumps(rx, ry) {
    var s = '', pos = [[.34, -.34, .1], [-.26, .16, .085], [.3, .46, .075], [-.4, -.4, .06]];
    pos.forEach(function (p, i) {
      var x = rx * p[0], y = ry * p[1], r = rx * p[2] * 1.2;
      s += '<ellipse cx="' + n2(x + 2) + '" cy="' + n2(y + 3) + '" rx="' + n2(r * 1.2) + '" ry="' + n2(r) + '" fill="' + SHD + '" opacity=".3" filter="url(#k-b2)"/><circle cx="' + n2(x) + '" cy="' + n2(y) + '" r="' + n2(r) + '" fill="url(#k-skin-dome)"/><circle cx="' + n2(x) + '" cy="' + n2(y) + '" r="' + n2(r) + '" class="st-contour" stroke-opacity=".7"/><ellipse cx="' + n2(x - r * .3) + '" cy="' + n2(y - r * .36) + '" rx="' + n2(r * .42) + '" ry="' + n2(r * .28) + '" fill="#fff" opacity=".7"/>';
    });
    return s;
  }
  function teProfile(w, bumpy) {
    var d = 'M0 0', i;
    var x = 0;
    d = 'M' + P(0, 14) + 'C' + P(w * .25, 4) + ' ' + P(w * .75, 4) + ' ' + P(w, 14);
    if (bumpy) d = 'M' + P(0, 14) + 'C' + P(w * .1, 8) + ' ' + P(w * .2, 6) + ' ' + P(w * .26, 5) + 'C' + P(w * .3, -8) + ' ' + P(w * .36, -8) + ' ' + P(w * .4, 3) + 'C' + P(w * .5, 1) + ' ' + P(w * .56, 1) + ' ' + P(w * .6, 1) + 'C' + P(w * .64, -6) + ' ' + P(w * .7, -6) + ' ' + P(w * .74, 3) + 'C' + P(w * .84, 5) + ' ' + P(w * .92, 8) + ' ' + P(w, 14);
    return '<path d="' + d + 'L' + P(w, 40) + 'L0 40Z" fill="url(#k-skin-v)"/><path d="' + d + '" fill="none" stroke="' + (bumpy ? 'var(--st-warn)' : 'var(--st-ok)') + '" stroke-width="2.6" stroke-linecap="round"/>';
  }
  function teSurfaceSide(bump, pw, h) {
    var cx = pw / 2, cy = 100, rx = 46, ry = 62;
    var g = '<g transform="translate(' + P(cx, cy) + ')">' + teOval(rx, ry, { surface: teSurface(rx, ry, { seed: bump ? 9 : 4 }) + teGrid(rx, ry) + (bump ? teBumps(rx, ry) : '') }) + '</g>';
    return g + '<g transform="translate(' + P(pw * .12, 188) + ')">' + teProfile(pw * .76, bump) + '</g>';
  }
  function teSurfacePanels(x, y, w, h, compact) {
    var pw = w / 2 - 3, cx = pw / 2, cy = 100, rx = 46, ry = 62, bg = '<rect width="' + n2(pw) + '" height="' + h + '" fill="var(--st-lens-bg)"/>';
    var labels = [tr('Smooth surface', 'Sileä pinta', 'Slät yta'), tr('Show a doctor', 'Näytä lääkärille', 'Visa för en läkare')];
    if (compact) return teCompact(x, y, w, h, teSurfaceSide(false, 165, 272), teSurfaceSide(true, 165, 272), .42, 40, labels, ['ok', 'warn']);
    var right = bg + teSurfaceSide(true, pw, h) + K.callout(tr('Bumps or\nany change', 'Kyhmyjä tai\nmuutoksia', 'Knölar eller\nförändringar'), [pw * .5, 22], [cx + rx * .34, cy - ry * .34], { tone: 'warn' });
    return K.compare({ x: x, y: y, w: w, h: h, left: bg + teSurfaceSide(false, pw, h), right: right, labels: labels, size: 12.5 });
  }
  stage.define('s-te-surface', {
    dur: 13,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Turn the testicle in your fingers and feel its whole surface for lumps or bumps', 'Käännä kivestä sormissasi ja tunnustele sen koko pinta kyhmyjen ja patien varalta', 'Vänd testikeln mellan fingrarna och känn över hela ytan efter knölar eller knottror'] },
      { at: 2.6, cap: ['Slide your fingertips over the whole surface: first the front', 'Liu\'uta sormenpäitä koko pinnan yli: ensin etupuoli', 'Låt fingertopparna glida över hela ytan: först framsidan'] },
      { at: 6.6, cap: ['Then the back. Do each side in turn', 'Sitten takapuoli. Tee kumpikin puoli vuorollaan', 'Sedan baksidan. Gör varje sida i tur och ordning'] },
      { at: 10, cap: ['Feel for bumps. Any change in the surface is worth showing to a doctor', 'Tunnustele kyhmyjä. Kaikki pinnan muutokset kannattaa näyttää lääkärille', 'Känn efter knottror. Varje förändring i ytan är värd att visa för en läkare'] }
    ],
    desc: [
      'Two drawings of the same testicle as a smooth oval under the skin: the front and the back. Two fingertips slide over the whole front surface in a back-and-forth path, then over the back, leaving a pink trail so no part is missed. Finally a smooth surface is compared with one that has bumps: any bump or change in the surface is worth showing to a doctor.',
      'Kaksi piirrosta samasta kiveksestä ihon alla sileänä soikiona: etupuoli ja takapuoli. Kaksi sormenpäätä liukuu koko etupinnan yli edestakaisin kulkevaa reittiä, sitten takapinnan yli, ja vaaleanpunainen jälki näyttää, ettei mikään kohta jää väliin. Lopuksi sileää pintaa verrataan pintaan, jossa on kyhmyjä: kaikki kyhmyt tai pinnan muutokset kannattaa näyttää lääkärille.',
      'Två teckningar av samma testikel som en slät oval under huden: framsidan och baksidan. Två fingertoppar glider över hela framsidan i ett fram och tillbaka-mönster, sedan över baksidan, och lämnar ett rosa spår så att ingen del missas. Till sist jämförs en slät yta med en med knottror: varje knöl eller förändring i ytan är värd att visa för en läkare.'
    ],
    draw: function (c) {
      var s = tePlate(), RX = 52, RY = 70, FX = 92, BX = 266, CY = 140;
      var oval = function (back) {
        var ridge = back ? '<path d="M' + n2(-RX * .78) + ' ' + n2(-ry(.6)) + 'C' + n2(-RX * .98) + ' -20 ' + n2(-RX * .98) + ' 30 ' + n2(-RX * .74) + ' ' + n2(ry(.64)) + '" fill="none" stroke="#C98A82" stroke-opacity=".75" stroke-width="13" stroke-linecap="round"/><path d="M' + n2(-RX * .78) + ' ' + n2(-ry(.6)) + 'C' + n2(-RX * .98) + ' -20 ' + n2(-RX * .98) + ' 30 ' + n2(-RX * .74) + ' ' + n2(ry(.64)) + '" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2.4" transform="translate(1.5 -1)" stroke-linecap="round"/>' : '';
        return teOval(RX, RY, { surface: teSurface(RX, RY, { seed: back ? 7 : 4 }) + teGrid(RX, RY) + ridge });
      };
      function ry(f) { return RY * f; }
      var lbl = function (t, x) { return K.callout(t, [x, 250], null, { size: 12.5 }); };
      var sweep = teSweep(RX, RY);
      var fingers = function () { return '<g transform="translate(12 10)">' + teFinger(112, 32) + '</g>' + teFinger(112, 34, { nail: { w: 13, l: 17, off: 2 } }); };
      var rot = function (a) { return '<g transform="rotate(' + a + ')">' + fingers() + '</g>'; };
      var front = '<g transform="translate(' + FX + ' ' + CY + ')">' + oval(false) + '</g>';
      var back = '<g transform="translate(' + BX + ' ' + CY + ')">' + oval(true) + '</g>';
      var trl = function (t0, t1, until) { return c.draw(sweep, t0, t1, 'fill="none" stroke="var(--st-guide)" stroke-opacity=".16" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:8px"', { until: until, ease: 'linear' }) + c.draw(sweep, t0, t1, 'fill="none" stroke="var(--st-guide)" stroke-opacity=".85" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:2px"', { until: until, ease: 'linear' }); };
      var fwd = '<g transform="translate(' + FX + ' ' + CY + ')">' + trl(2.8, 6.2, 6.6) + '</g>';
      var bwd = '<g transform="translate(' + BX + ' ' + CY + ')">' + trl(6.8, 9.8, 10) + '</g>';
      /* the fingers: one set, moving along the path on the front and then on the back */
      var fd = rot(-46);
      var moveF = '<g transform="translate(' + FX + ' ' + CY + ')">' + c.move(sweep, 2.8, 6.2, fd, { ease: 'linear' }) + '</g>';
      var moveB = '<g transform="translate(' + BX + ' ' + CY + ')">' + c.move(sweep, 6.8, 9.8, fd, { ease: 'linear' }) + '</g>';
      var turn = '<g class="st-call">' + K.arrow(FX + 64, 150, BX - 64, 150, { curve: -22, head: 9 }) + '</g>';
      var tlbl = K.callout(tr('Turn it', 'Käännä', 'Vänd'), [180, 176], null, { size: 12.5 });
      if (c.still) {
        var st = s + K.place({ x: 33, y: -8, s: .72 }, front + back + '<g transform="translate(' + FX + ' ' + CY + ')">' + trl(0, 1, 13) + '</g><g transform="translate(' + BX + ' ' + CY + ')">' + trl(0, 1, 13) + '</g><g transform="translate(' + FX + ' ' + CY + ')">' + c.move(sweep, 0, 1, '<g transform="scale(.9)">' + rot(-46) + '</g>', { still: .72 }) + '</g>');
        st += '<g class="st-call">' + K.arrow(144, 96, 188, 96, { curve: -12, head: 8 }) + '</g>' + K.callout(tr('Turn it', 'Käännä', 'Vänd'), [166, 128], null, { size: 12.5 });
        st += K.callout(tr('Front', 'Etupuoli', 'Framsida'), [102, 168], null, { size: 12.5 }) + K.callout(tr('Back', 'Takapuoli', 'Baksida'), [230, 168], null, { size: 12.5 });
        st += c.marker(0, 166, 150, 10) + c.marker(1, 34, 34, 10) + c.marker(2, 196, 34, 10);
        st += teSurfacePanels(8, 190, 344, 104, true) + c.marker(3, 20, 204, 10);
        return st;
      }
      s += front + back;
      s += c.show(2.4, 11, fwd + bwd, { fade: .4, still: false });
      s += c.show(1.0, 6.7, moveF, { fade: .45 }) + c.show(6.6, 10.2, moveB, { fade: .45 });
      s += c.show(0, 9.8, lbl(tr('Front', 'Etupuoli', 'Framsida'), FX) + lbl(tr('Back', 'Takapuoli', 'Baksida'), BX), { fade: .4 });
      s += c.phaseShow(0, turn + tlbl + c.marker(0, 180, 212, 10), { fade: .4 });
      s += c.phaseShow(1, c.marker(1, FX - 62, 48, 10), { fade: .35 }) + c.phaseShow(2, c.marker(2, BX - 62, 48, 10), { fade: .35 });
      s += c.phaseShow(3, teSurfacePanels(12, 14, 336, 272) + c.marker(3, 26, 28, 11), { fade: .5 });
      return s;
    }
  });

  /* ---------- s-te-epi ---------- */
  function teEpiSide(sore, pw, h) {
    var g = '', id = uid('ep');
    var tes = 'M-10 -122C58 -122 98 -66 98 0C98 66 58 122 -10 122Z';
    g += rgrad(id, .3, .3, .9, stp(0, '#F9F3EC') + stp(.4, '#EDE3D8') + stp(1, '#C4AE9B'));
    if (sore) g += rgrad(id + 'r', .5, .5, .5, stp(0, '#E0605A', .34) + stp(1, '#E0605A', 0)) + '<ellipse cx="112" cy="112" rx="64" ry="104" fill="url(#' + id + 'r)"/>';
    g += '<g transform="translate(0 130)"><path d="' + tes + '" fill="url(#' + id + ')"/><path d="' + tes + '" fill="url(#k-sh-br)" opacity=".6"/><path d="' + tes + '" class="st-contour" stroke-opacity=".7"/>' + K.glint(30, -66, 28, 14, -30, .7) + '</g>';
    var ws = sore ? [28, 44, 38, 47, 36, 28] : [13, 15, 14, 15, 13, 11];
    g += epiTube([[72, 30], [100, 48], [110, 88], [110, 132], [100, 170], [82, 194]], ws, sore ? 'sore' : 'ok');
    if (sore) g += '<g class="st-call" stroke="var(--st-warn)" stroke-width="2.2" stroke-linecap="round"><path d="M138 52l9 -9M146 70l12 -3M140 92l11 4"/></g>';
    return g;
  }
  function teEpiPanels(x, y, w, h, compact) {
    var pw = w / 2 - 3, bg = '<rect width="' + n2(pw) + '" height="' + h + '" fill="var(--st-lens-bg)"/>';
    var labels = [tr('Normal tube', 'Normaali tiehyt', 'Normal gång'), tr('Show a doctor', 'Näytä lääkärille', 'Visa för en läkare')];
    if (compact) return teCompact(x, y, w, h, teEpiSide(false, 165, 272), teEpiSide(true, 165, 272), .4, 24, labels, ['ok', 'warn']);
    var right = bg + teEpiSide(true, pw, h) + K.callout(tr('Hard, swollen\nor painful', 'Kova, turvonnut\ntai kipeä', 'Hård, svullen\neller öm'), [pw * .5, 44], [114, 96], { tone: 'warn' });
    var left = bg + teEpiSide(false, pw, h) + K.callout(tr('Soft, small\nand painless', 'Pehmeä, pieni\nja kivuton', 'Mjuk, liten\noch smärtfri'), [pw * .5, 44], [110, 96], { tone: 'ok' });
    return K.compare({ x: x, y: y, w: w, h: h, left: left + teFeel(pw * .06, h - 64, 0, pw * .88), right: right + teFeel(pw * .06, h - 64, 2, pw * .88), labels: labels, size: 12.5 });
  }
  stage.define('s-te-epi', {
    dur: 13,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Feel behind each testicle for the small, soft tube there. This is the epididymis, a normal part of the body', 'Tunnustele kunkin kiveksen takaa pientä, pehmeää tiehyttä. Se on lisäkives, ja se on normaali osa kehoa', 'Känn bakom varje testikel efter den lilla mjuka gången. Det är bitestikeln, en normal del av kroppen'] },
      { at: 3.4, cap: ['Slide a finger up and down behind the testicle, over the soft tube. Then do the other side', 'Liu\'uta sormea ylös ja alas kiveksen takana pehmeän tiehyen yli. Tee sitten toinen puoli', 'Låt ett finger glida upp och ned bakom testikeln, över den mjuka gången. Gör sedan andra sidan'] },
      { at: 8.6, cap: ['A tube behind the testicle that feels hard, swollen or painful is worth showing to a doctor', 'Kiveksen takana oleva tiehyt, joka tuntuu kovalta, turvonneelta tai kipeältä, kannattaa näyttää lääkärille', 'En gång bakom testikeln som känns hård, svullen eller öm är värd att visa för en läkare'] }
    ],
    desc: [
      'An anatomical drawing of a testicle, cut open to show its inner lobules, with the epididymis lying behind it as a small soft coiled tube and the vas deferens leaving at the top. A finger touches the skin behind the testicle and slides up and down over the epididymis. Then a normal soft tube is compared with one that is hard, swollen or painful, which is worth showing to a doctor.',
      'Anatominen piirros kiveksestä, joka on avattu näyttämään sen sisäiset lohkot. Lisäkives on sen takana pienenä pehmeänä kiemurtelevana tiehyenä ja siemenjohdin lähtee ylhäältä. Sormi koskettaa ihoa kiveksen takana ja liukuu ylös ja alas lisäkiveksen yli. Lopuksi normaalia pehmeää tiehyttä verrataan kovaan, turvonneeseen tai kipeään, joka kannattaa näyttää lääkärille.',
      'En anatomisk teckning av en testikel, uppskuren för att visa de inre loberna, med bitestikeln bakom som en liten mjuk hoprullad gång och sädesledaren som går ut upptill. Ett finger rör vid huden bakom testikeln och glider upp och ned över bitestikeln. Sedan jämförs en normal mjuk gång med en som är hård, svullen eller öm, vilket är värt att visa för en läkare.'
    ],
    draw: function (c) {
      var S = 1.4, OX = 110, OY = 172, s = tePlate();
      var anat = '<g transform="translate(' + OX + ' ' + OY + ') scale(' + S + ')">' + teAnat() + teVeil() + '</g>';
      s += anat;
      var FXp = OX + 70 * S, fingerK = [{ t: 0, x: 120, y: -56 }, { t: .5, x: 120, y: -56 }, { t: 3, x: 0, y: -50, ease: 'out' }, { t: 3.4, x: 0, y: -50 }].concat((function () { var k = [], i; for (i = 0; i <= 24; i++) k.push({ t: 3.6 + 4.6 * i / 24, y: -6 - 54 * Math.cos(i / 8 * Math.PI * 2) + 0, ease: 'linear' }); return k; })()).concat([{ t: 8.8, y: 0, x: 0 }, { t: 9.4, x: 140, y: 0, ease: 'inOut' }]);
      var finger = c.anim(fingerK, '<g transform="translate(' + FXp + ' ' + OY + ')">' + teFinger(180, 44, { nail: { w: 15, l: 20, off: 2 } }) + '</g>', { stillT: 5.2 });
      var shadowF = '<ellipse cx="' + (FXp + 52) + '" cy="' + (OY + 12) + '" rx="70" ry="16" fill="' + SHD + '" opacity=".22" filter="url(#k-b5)"/>';
      var arrows = '<g class="st-call">' + K.arrow(FXp + 4, OY - 78, FXp + 4, OY - 108, { head: 8 }) + K.arrow(FXp + 4, OY + 78, FXp + 4, OY + 108, { head: 8 }) + '</g>';
      var cT = K.callout(tr('Testicle', 'Kives', 'Testikel'), [44, 188], [OX - 30, OY + 8], { align: 'middle' });
      var cV = K.callout(tr('Vas deferens', 'Siemenjohdin', 'Sädesledare'), [80, 40], [OX + 62 * S, 50], { align: 'middle' });
      var cE = K.callout(tr('Epididymis:\na normal, soft tube', 'Lisäkives:\nnormaali, pehmeä tiehyt', 'Bitestikel:\nen normal, mjuk gång'), [274, 64], [OX + 48 * S, OY - 54 * S], { align: 'middle', tone: 'ok' });
      var ringE = '<g transform="translate(' + (OX + 54 * S) + ' ' + OY + ')">' + K.ring(0, 0, 66, { dash: true }) + '</g>';
      var path = '<g class="st-call"><path d="M' + P(FXp - 12, OY - 70) + 'L' + P(FXp - 12, OY + 70) + '" class="st-trail" stroke-opacity=".5" stroke-dasharray="2 5"/></g>';
      if (c.still) {
        var mp = function (x, y) { return [8 + .66 * x, -12 + .66 * y]; };
        var st = tePlate() + K.place({ x: 8, y: -12, s: .66 }, anat + shadowF + finger);
        var tE = mp(OX + 48 * S, OY - 54 * S), tT = mp(OX - 30, OY + 8), tV = mp(OX + 62 * S, 50);
        st += K.callout(tr('Vas deferens', 'Siemenjohdin', 'Sädesledare'), [84, 22], tV, { align: 'middle' }) + K.callout(tr('Testicle', 'Kives', 'Testikel'), [52, 150], tT, { align: 'middle' });
        st += K.callout(tr('Epididymis:\na normal, soft tube', 'Lisäkives:\nnormaali, pehmeä tiehyt', 'Bitestikel:\nen normal, mjuk gång'), [262, 44], tE, { align: 'middle', tone: 'ok' });
        st += '<g class="st-call">' + K.arrow(150, 66, 150, 46, { head: 8 }) + K.arrow(150, 138, 150, 158, { head: 8 }) + '</g>' + K.callout(tr('Up and down', 'Ylös ja alas', 'Upp och ned'), [292, 150], null, { align: 'middle' });
        st += c.marker(0, 12, 22, 10) + c.marker(1, 228, 150, 10);
        st += teEpiPanels(8, 190, 344, 104, true) + c.marker(2, 20, 204, 10);
        return st;
      }
      s += c.show(0, 9.4, shadowF, { fade: .5 }) + finger;
      s += c.phaseShow(0, cT + cV + cE + c.pulse(.6, 3.2, ringE, { count: 2, scale: 1.05 }) + c.marker(0, 14, 40, 10), { fade: .4 });
      s += c.phaseShow(1, K.callout(tr('Epididymis', 'Lisäkives', 'Bitestikel'), [58, 70], [OX + 48 * S, OY - 54 * S], { align: 'middle', tone: 'ok' }) + arrows + K.callout(tr('Up and down', 'Ylös ja alas', 'Upp och ned'), [352, 40], null, { align: 'end' }) + c.marker(1, 232, 40, 10), { fade: .4 });
      s += c.phaseShow(2, '<rect width="360" height="300" fill="url(#k-wall)"/>' + teEpiPanels(12, 14, 336, 272) + c.marker(2, 16, 14, 9), { fade: .5 });
      return s;
    }
  });

  /* ---------- pos-testicular: the poster ---------- */
  stage.define('pos-testicular', {
    dur: 9,
    viewBox: [360, 300],
    phases: [
      { at: 0, cap: ['Cup the scrotum in one hand and compare the two sides', 'Ota kivespussi kämmenelle ja vertaa kahta puolta', 'Håll pungen i handen och jämför de två sidorna'] },
      { at: 3, cap: ['Roll one testicle at a time and feel its whole surface', 'Pyörittele yhtä kivestä kerrallaan ja tunnustele koko pinta', 'Rulla en testikel i taget och känn över hela ytan'] },
      { at: 6, cap: ['Feel behind it for the soft tube, the epididymis', 'Tunnustele sen takaa pehmeä tiehyt, lisäkives', 'Känn bakom den efter den mjuka gången, bitestikeln'] }
    ],
    desc: [
      'A clean anatomical diagram of a testicle cut open, with the epididymis behind it and the vas deferens leaving at the top. Three numbered hand positions are shown in turn: 1, a hand cupped under the scrotum to compare both sides; 2, a thumb and two fingers rolling one testicle; 3, a finger behind the testicle feeling the soft epididymis.',
      'Selkeä anatominen kaavio kiveksestä, joka on avattu, ja sen takana lisäkives sekä ylhäältä lähtevä siemenjohdin. Kolme numeroitua käden asentoa näytetään vuorotellen: 1, kämmen kivespussin alla molempien puolten vertaamiseksi; 2, peukalo ja kaksi sormea pyörittävät yhtä kivestä; 3, sormi kiveksen takana tunnustelee pehmeää lisäkivestä.',
      'Ett rent anatomiskt diagram av en uppskuren testikel, med bitestikeln bakom och sädesledaren som går ut upptill. Tre numrerade handpositioner visas i tur och ordning: 1, en hand under pungen för att jämföra båda sidor; 2, tumme och två fingrar som rullar en testikel; 3, ett finger bakom testikeln som känner på den mjuka bitestikeln.'
    ],
    draw: function (c) {
      var S = 1.22, OX = 176, OY = 132, s = tePlate();
      s += '<g transform="translate(' + OX + ' ' + OY + ') scale(' + S + ')">' + teAnat() + teVeil() + '</g>';
      /* hand position 1: the cupped hand under it */
      var ch = teCupHand(true);
      var p1 = teHandAt(OX - 4, OY + 90 * S + 34, .76, ch.back + ch.front);
      /* position 2: thumb above and two fingers below, from the left */
      var thumb = tube([[-170, -62], [-140, -52], [-112, -34], [-88, -18]], [40, 36, 32, 28], { pad: true, base: true, lite: true, nail: { w: 11, l: 14, off: 2 } });
      var f1 = tube([[-170, 40], [-136, 38], [-108, 26], [-86, 14]], [34, 31, 28, 26], { pad: true, base: true, lite: true });
      var f2 = tube([[-170, 66], [-136, 62], [-108, 48], [-88, 34]], [34, 31, 28, 26], { pad: true, base: true, lite: true });
      var p2 = '<g transform="translate(' + OX + ' ' + OY + ') scale(' + S + ')">' + f2.s + f1.s + thumb.s + '</g>';
      /* position 3: a finger from the right, behind */
      var p3 = '<g transform="translate(' + (OX + 70 * S) + ' ' + OY + ') scale(' + S + ')">' + teFinger(130, 36, { nail: { w: 12, l: 16, off: 2 } }) + '</g>';
      var rollArrow = K.arrow(OX - 120, OY - 70, OX - 112, OY + 66, { curve: -16, head: 8 });
      var upDown = K.arrow(272, OY - 50, 272, OY - 80, { head: 8 }) + K.arrow(272, OY + 50, 272, OY + 80, { head: 8 });
      var lab = K.callout(tr('Testicle', 'Kives', 'Testikel'), [56, 262], [OX - 30, OY + 16], { align: 'middle' }) + K.callout(tr('Epididymis', 'Lisäkives', 'Bitestikel'), [300, 262], [OX + 30 * S, OY + 58 * S], { align: 'middle', tone: 'ok' }) + K.callout(tr('Vas deferens', 'Siemenjohdin', 'Sädesledare'), [298, 26], [OX + 62 * S, OY - 100 * S], { align: 'middle' });
      var m1 = c.marker(0, 30, OY + 100, 12), m2 = c.marker(1, 40, 40, 12), m3 = c.marker(2, 322, OY + 40, 12);
      if (c.still) return s + p1 + p2 + p3 + rollArrow + upDown + lab + m1 + m2 + m3;
      s += c.fade([[0, 1], [2.6, 1], [3.2, .22], [5.6, .22], [6.2, .22], [8.4, .22], [9, 1]], p1, {});
      s += c.fade([[0, 0], [2.6, 0], [3.2, 1], [5.6, 1], [6.2, 0], [9, 0]], p2 + rollArrow, {});
      s += c.fade([[0, 0], [5.6, 0], [6.2, 1], [8.6, 1], [9, 0]], p3 + upDown, {});
      s += lab + m1 + m2 + m3;
      return s;
    }
  });
})();
