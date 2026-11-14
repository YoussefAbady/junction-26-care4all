import { A as C4A } from "../app.js";

/* care4all scans: the list of self-checks, the list of regular scans and tests, and the national programme screen.
   Facts come from the sources named on each item. Times marked "about" are the figures those sources give. */
(function () {
  'use strict';
  var A = C4A, D = A.D, S = A.S, esc = A.esc, ic = A.icon, tr = A.tr, V = A.views, H = A.vh;
  var cell = H.cell, group = H.group, lead = H.lead, chips = H.chips, footer = H.footer, secH = H.secH;
  var DAY = 864e5;

  /* ---------- self-check facts and scans ----------
     The facts about each self-check (D.CHECK_META), the scans and tests (D.SCANS) and the national programmes (D.NAT) are
     content. It is filled in before the first screen is drawn, so these are read when a screen needs them, never when this
     module loads. */
  function scanById(id) { return D.SCANS.filter(function (s) { return s.id === id; })[0]; }
  A.scansFor = function (topic) { return D.SCANS.filter(function (s) { return s.topic === topic && s.kind !== 'notnational'; }); };

  function ago(ts) {
    var d = Math.round((Date.now() - ts) / DAY);
    if (d < 1) return 'today';
    if (d < 14) return d + (d === 1 ? ' day ago' : ' days ago');
    if (d < 60) return Math.round(d / 7) + ' weeks ago';
    if (d < 700) return Math.round(d / 30.4) + ' months ago';
    return (Math.round(d / 36.5) / 10) + ' years ago';
  }
  A.agoText = ago;

  /* What a scan or test is, and when the person last had it (the date they logged). Whether and when someone is
     invited is never worked out here: the invitation letter is the source of truth. */
  A.scanInfo = function (id) {
    var sc = scanById(id), out = { sc: sc, fit: 'ask', label: '', why: '', last: null, lastText: 'Not logged', next: null, nextText: '', due: false };
    if (sc.kind === 'invited') {
      out.label = 'By invitation';
      out.why = sc.who + '. Your invitation letter tells you whether and when you are invited.';
    } else {
      out.label = sc.kind === 'doctor' ? 'Arranged by a doctor' : 'Not a national programme';
      out.why = sc.who;
    }
    var l = S.scans[id];
    if (l && l.ts) { out.last = l.ts; out.lastText = A.fmtDate(l.ts) + ' (' + ago(l.ts) + ')'; }
    return out;
  };

  /* ---------- small building blocks ---------- */
  function meta(icon, label, text) {
    return '<div class="meta"><span class="m-i" aria-hidden="true">' + ic(icon, 16) + '</span><span class="m-t">' + (label ? '<span class="m-l">' + esc(label) + ':</span> ' : '') + esc(text) + '</span></div>';
  }
  function pill(text, cls) { return '<span class="status-pill ' + (cls || '') + '">' + esc(text) + '</span>'; }
  function checkStatus(id) {
    var ch = S.checks[id], m = D.CHECK_META[id];
    if (!ch) return { key: 'new', label: 'New', last: 'Not done yet' };
    var days = (Date.now() - ch.ts) / DAY;
    if (ch.result === 'change') return { key: 'change', label: 'Found something', last: 'Last: ' + ago(ch.ts) + ', you found something' };
    if (days >= m.every + 5) return { key: 'due', label: 'Due', last: 'Last: ' + ago(ch.ts) };
    return { key: 'ok', label: 'Up to date', last: 'Last: ' + ago(ch.ts) };
  }
  A.checkStatus = checkStatus;
  A.selfChecks = function () {
    var sx = S.profile && S.profile.sex, age = A.age();
    return ['breast', 'testicular', 'skin'].filter(function (id) { return D.TOPICS[id] && D.TOPICS[id].check; }).map(function (id) {
      var fit = id === 'breast' ? sx !== 'male' : id === 'testicular' ? (sx !== 'female' && age >= 15 && age <= 60) : true;
      return { id: id, fit: fit };
    }).sort(function (a, b) { return (b.fit ? 1 : 0) - (a.fit ? 1 : 0); });
  };

  /* ---------- what you can tick after a self-check ---------- */
  var FINDINGS = {
    breast: { side: true, placeholder: 'For example: a small lump on the left, near the nipple, about the size of a pea',
      opts: [
        { v: 'lump', label: 'A new lump or thickened area in a breast or armpit', urg: 1 },
        { v: 'skin', label: 'Dimpling, puckering or redness of the skin', urg: 1 },
        { v: 'shape', label: 'A change in the size or shape of a breast', urg: 1 },
        { v: 'nipple', label: 'A nipple that turned inwards, or a rash or crust on it', urg: 1 },
        { v: 'fluid', label: 'Fluid coming from a nipple (not milk)', urg: 1 },
        { v: 'pain', label: 'Pain in one area that does not go away', urg: 0 }
      ] },
    testicular: { side: true, placeholder: 'For example: a small hard lump on the front of the right testicle',
      opts: [
        { v: 'lump', label: 'A lump, even a small one, on a testicle', urg: 1 },
        { v: 'size', label: 'One testicle bigger, or changed in shape', urg: 1 },
        { v: 'heavy', label: 'A heavy or hard feeling in the scrotum', urg: 1 },
        { v: 'ache', label: 'A dull ache in the scrotum, groin or tummy', urg: 0 },
        { v: 'sudden', label: 'Sudden, severe pain or swelling in the scrotum', urg: 3 }
      ] },
    skin: { side: false, placeholder: 'For example: a new dark mole on my left shoulder, about 7 mm wide',
      opts: [
        { v: 'new', label: 'A new mole or spot that looks different from the others', urg: 1 },
        { v: 'changed', label: 'A mole that has changed in size, shape or colour', urg: 1 },
        { v: 'abcde', label: 'A mole with an uneven shape, a ragged edge, several colours, or wider than a pencil end', urg: 1 },
        { v: 'sore', label: 'A sore that will not heal, or a spot that is itchy, crusty or bleeding', urg: 1 },
        { v: 'rough', label: 'A rough, scaly patch', urg: 0 },
        { v: 'nail', label: 'A dark streak or patch under a nail that was not an injury', urg: 1 }
      ] }
  };
  A.CHECK_FINDINGS = FINDINGS;
  var SIDES = [['left', 'Left'], ['right', 'Right'], ['both', 'Both'], ['unsure', 'Not sure']];
  var HERO_STEP = { breast: 6, testicular: 2, skin: 5 };
  A.CHECK_HERO = HERO_STEP;

  /* Self-check results come from the account's observations (S.checklog, newest first). */
  function allResults() { return S.checklog.filter(function (r) { return D.CHECK_META[r.check]; }); }
  function resultsFor(id) { return allResults().filter(function (r) { return !id || r.check === id; }); }
  A.checkResults = resultsFor;
  /* The account's note has no field for a side, so "Side: left" is kept with the findings and read back from them. */
  var SIDE_RE = /^Side: (left|right|both)$/;
  function norm(r) {
    var side = r.side || '', findings = (r.findings || []).filter(function (f) {
      var m = SIDE_RE.exec(f);
      if (m) { side = m[1]; return false; }
      return true;
    });
    return Object.assign({}, r, { findings: findings, side: side });
  }
  function resultSummary(r) {
    r = norm(r);
    var parts = r.findings.slice();
    if (r.side && r.side !== 'unsure') parts.push('Side: ' + r.side);
    return parts;
  }
  function recText(r) {
    r = norm(r);
    return [D.CHECK_META[r.check].name + ', ' + A.fmtDate(r.ts), r.result === 'clear' ? 'Found: nothing new' : 'Found: ' + (r.findings.join('; ') || 'see my words below')]
      .concat(r.side && r.side !== 'unsure' ? ['Side: ' + r.side] : []).concat(r.other ? ['In my words: ' + r.other] : []).join('\n');
  }
  A.checkText = recText;

  /* The last step of a guided check: a checklist, plus a place to write anything else. */
  A.findingsHtml = function (id) {
    var F = FINDINGS[id], M = D.CHECK_META[id];
    return '<form class="form" data-form="checkfind" data-topic="' + id + '" novalidate>' +
      '<p class="small" style="font-weight:700;color:var(--ink)">Last step</p>' +
      '<h3 class="h3" id="gstep" tabindex="-1">What did you find in your ' + esc(M.name.toLowerCase()) + '?</h3>' +
      '<p class="small">Tick everything that applies. This is a record for you and for a doctor. It is not a diagnosis, and most changes turn out to be harmless.</p>' +
      '<fieldset class="find-set"><legend class="sr">What you found</legend>' + F.opts.map(function (o) {
        return '<label class="find-opt"><input type="checkbox" name="f" value="' + o.v + '"><span class="find-box" aria-hidden="true"></span><span class="find-t">' + esc(o.label) + '</span></label>';
      }).join('') + '<label class="find-opt none"><input type="checkbox" name="f" value="none"><span class="find-box" aria-hidden="true"></span><span class="find-t">I found nothing unusual</span></label></fieldset>' +
      (F.side ? '<fieldset class="find-side"><legend class="cap">Which side?</legend><div class="replies" role="radiogroup">' + SIDES.map(function (x) { return '<label class="rep"><input type="radio" name="side" value="' + x[0] + '"><span>' + x[1] + '</span></label>'; }).join('') + '</div></fieldset>' : '') +
      '<div class="fgroup"><label class="cap" for="cf-o">Anything else you noticed? (optional)</label><textarea class="textarea" id="cf-o" name="other" rows="3" maxlength="400" autocomplete="off" spellcheck="false" placeholder="' + esc(F.placeholder) + '"></textarea></div>' +
      '<p class="err" id="e-cf" hidden></p>' +
      '<div class="stack"><button class="btn primary block" type="submit">Save to my profile</button><button class="btn block" type="button" data-action="guide-back">Back to the steps</button></div></form>';
  };
  A.changes.checkfind = function (el, form) {
    if (el.name !== 'f') return;
    if (el.value === 'none' && el.checked) A.$$('input[name="f"]', form).forEach(function (i) { if (i !== el) i.checked = false; });
    else if (el.checked) A.$$('input[name="f"][value="none"]', form).forEach(function (i) { i.checked = false; });
    var e = A.$('#e-cf', form); if (e) e.hidden = true;
  };
  /* A suggestion to set the next self-check reminder, unless one is already set for this check. */
  function nextCheckHtml(id) {
    var M = D.CHECK_META[id], wl = { '4w': '4 weeks', '6m': '6 months' }[M.when] || M.when;
    if (S.reminders.some(function (x) { return x.status === 'active' && x.kind === 'selfcheck' && x.topic === id; })) return '';
    return '<p class="cap" style="margin-top:6px">Suggested next step</p><div class="fu-list"><article class="fu lvl-info" data-t="' + id + '"><p class="fu-tag"><span class="fu-dot" aria-hidden="true"></span>Good to know</p>' +
      '<h3 class="h3">Schedule your next ' + esc(D.TOPICS[id].name.toLowerCase()) + ' check</h3><p class="body">You did this one today. A reminder in ' + wl + ' keeps it easy.</p>' +
      '<div class="btn-row"><button class="btn sm tint" type="button" data-action="reminder-new" data-topic="' + id + '" data-kind="selfcheck" data-when="' + M.when + '">' + ic('bell', 16) + ' Remind me in ' + wl + '</button></div></article></div>';
  }
  function resultHtml(r) {
    r = norm(r);
    var M = D.CHECK_META[r.check], date = A.fmtDate(r.ts), found = r.result === 'change';
    var list = '<ul class="tick sx-sum"><li><span><b>Check:</b> ' + esc(M.name) + ' · ' + esc(date) + '</span></li><li><span><b>Result:</b> ' + (found ? 'You found something' : 'Nothing new') + '</span></li>' +
      (found ? resultSummary(r).map(function (x) { return '<li><span>' + esc(x) + '</span></li>'; }).join('') : '') + (r.other ? '<li><span><b>In your words:</b> “' + esc(r.other) + '”</span></li>' : '') + '</ul>';
    var foot = '<p class="small">Saved in Profile, under Self-check results.</p>';
    if (!found) {
      return '<div class="result" tabindex="-1"><p class="cap">Saved to your profile</p><h3 class="h3">Well done. Nothing new.</h3><p class="body">Knowing what is normal for you is what makes a change easy to spot.</p>' + list +
        nextCheckHtml(r.check) + foot +
        '<div class="btn-row"><button class="btn primary" type="button" data-action="sheet-close">Done</button><button class="btn ghost" type="button" data-action="sheet-go" data-to="results">See my results</button></div></div>';
    }
    var emerg = r.outcome === 'emergency', id = esc(r.id);
    return '<div class="result sx-out lvl-' + (emerg ? 'emergency' : 'doctor') + '" tabindex="-1"><p class="cap">Saved to your profile</p><h3 class="h2">' + (emerg ? 'Get help now' : 'Saved. Let’s talk about it') + '</h3>' +
      (emerg ? '<p class="sx-when">Sudden, severe pain or swelling in the scrotum needs help straight away. Call 112 or go to emergency.</p>' : '<p class="body">Tell me a little more. I will ask a few friendly questions and write it down, so you have a clear note for your appointment.</p>') + list + foot +
      '<div class="btn-row">' + (emerg ? '<a class="btn primary" href="tel:112">Call 112</a><button class="btn tint" type="button" data-action="chk-talk" data-id="' + id + '">' + ic('chat', 16) + ' Talk about it</button>' : '<button class="btn primary" type="button" data-action="chk-talk" data-id="' + id + '">' + ic('chat', 16) + ' Talk about it</button>') +
      '<button class="btn ghost" type="button" data-action="sheet-close">Not now</button></div></div>';
  }
  /* Saves what was found as an observation in the account, then shows the result in the sheet. */
  A.forms.checkfind = async function (form) {
    var id = form.getAttribute('data-topic'), F = FINDINGS[id], M = D.CHECK_META[id], err = A.$('#e-cf', form), btn = A.$('button[type="submit"]', form);
    var keys = A.$$('input[name="f"]:checked', form).map(function (i) { return i.value; }), none = keys.indexOf('none') > -1;
    keys = keys.filter(function (k) { return k !== 'none'; });
    var other = form.elements.other.value.trim(), sideEl = A.$('input[name="side"]:checked', form), side = sideEl ? sideEl.value : '';
    if (!keys.length && !none && !other) { err.hidden = false; err.textContent = 'Tick what you found, or tick “I found nothing unusual”.'; A.$('input[name="f"]', form).focus(); return; }
    var found = keys.length > 0 || (!!other && !none);
    var opts = keys.map(function (k) { return F.opts.filter(function (o) { return o.v === k; })[0]; }).filter(Boolean);
    var top = opts.reduce(function (m, o) { return Math.max(m, o.urg); }, found ? 1 : 0);
    var findings = opts.map(function (o) { return o.label.slice(0, 150); });
    if (found && F.side && side && side !== 'unsure') findings.push('Side: ' + side);
    var topic = A.apiTopic(id), details = { selfCheck: found ? 'change_noticed' : 'nothing_new', symptoms: findings.slice(0, 12) };
    if (topic) details.topic = topic;
    btn.disabled = true;
    var saved;
    try { saved = await A.svc.addObservation({ kind: 'observation', label: M.name, notes: other, details: details }); }
    catch (error) { btn.disabled = false; err.hidden = false; err.textContent = A.errorText(error); A.announce(err.textContent); return; }
    var logged = S.checklog.filter(function (x) { return x.id === saved.id; })[0] ||
      { id: saved.id, check: id, ts: Date.parse(saved.observedAt || saved.createdAt), result: found ? 'change' : 'clear', findings: findings, other: other, side: '', keys: [], outcome: 'recorded', urgency: '' };
    // The side and the outcome are only known here: the account keeps the findings and the note.
    A.sheet.setBody(resultHtml(Object.assign({}, logged, { side: found && F.side ? side : '', keys: keys, outcome: !found ? 'clear' : top >= 3 ? 'emergency' : 'talk' })), '.result');
    A.refresh();
  };
  A.actions['chk-talk'] = function (el) {
    var r = allResults().filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
    if (!r) return;
    r = norm(r);
    A.symStart(r.check, 'In my ' + D.CHECK_META[r.check].name.toLowerCase() + ' I found: ' + (r.findings.join(', ') || r.other) + (r.side && r.side !== 'unsure' ? ' (' + r.side + ')' : '') + '.');
  };

  /* ---------- Self-check list: small rows, each opens the full details ---------- */
  function checkTone(st) { return st.key === 'ok' ? 'on' : (st.key === 'change' || st.key === 'due') ? 'warn' : ''; }
  function checkRow(x) {
    var id = x.id, M = D.CHECK_META[id], st = checkStatus(id);
    return '<a class="chk-row" href="#chk-' + id + '" data-t="' + id + '" data-check="' + id + '">' + H.tIc(id, 26) +
      '<span class="chk-b"><span class="chk-h"><span class="chk-name">' + esc(M.name) + '</span>' + pill(st.label, checkTone(st)) + '</span>' +
      '<span class="chk-m"><span><span class="m-l">Last:</span> ' + esc(st.last.replace(/^Last: /, '').replace(/, you found something$/, '')) + '</span><span><span class="m-l">How often:</span> ' + esc(M.short) + '</span><span><span class="m-l">Takes:</span> about ' + M.min + ' min</span></span></span>' +
      H.chev() + '</a>';
  }
  V.checks = function () {
    var list = A.selfChecks(), h = '<p class="lede" style="margin-top:-18px">Short guided checks you can do at home. Tap one to see how it works, then start.</p>';
    var mine = list.filter(function (x) { return x.fit; }), other = list.filter(function (x) { return !x.fit; });
    h += '<section class="sec"><p class="cap">For you</p><div class="chk-list">' + mine.map(checkRow).join('') + '</div></section>';
    if (other.length) h += '<section class="sec"><p class="cap">Also available</p><p class="small">Not usually suggested for your age or sex. Nothing is hidden.</p><div class="chk-list">' + other.map(checkRow).join('') + '</div></section>';
    h += group([cell({ href: '#results', lead: lead('checklist', 'g'), title: 'My self-check results', detail: allResults().length ? 'What you found, saved in your account' : 'What you find is saved here', value: allResults().length ? String(allResults().length) : '' })], 'i');
    h += footer();
    return { title: 'Self-check', large: 'Self-check', html: h };
  };

  /* ---------- One self-check: the short version, with every result so far ---------- */
  /* Short steps for the first page. "i" is the step of the guide that opens when you tap it. */
  var CHECK_SUMMARY = {
    breast: [
      { h: 'Get ready', t: 'A private place, good light, bare to the waist. Best a few days after your period, when breasts are softest.', i: 0 },
      { h: 'Look in the mirror', t: 'Arms by your sides, then raised, then hands on your hips. Look at shape, skin and nipples.', i: 1 },
      { h: 'Feel lying down', t: 'Arm behind your head. Flat finger pads, small circles, light then firm pressure, collarbone to bra line and armpit to breastbone.', i: 5 },
      { h: 'Feel in the shower', t: 'Soapy fingers glide easily. Repeat the same circles with your arm raised.', i: 9 },
      { h: 'Armpit and nipple', t: 'Sweep up and down the armpit. Feel around each nipple.', i: 10 }
    ],
    testicular: [
      { h: 'Warm up', t: 'After a warm bath or shower, when the skin of the scrotum is relaxed.', i: 0 },
      { h: 'Hold and compare', t: 'Cup the scrotum in one hand. One testicle a little bigger or lower is normal.', i: 1 },
      { h: 'Roll each testicle', t: 'Roll one at a time between thumb and fingers, gently, without squeezing. Feel the whole surface.', i: 2 },
      { h: 'Find the soft tube', t: 'Behind each testicle is a soft tube, the epididymis. It is normal.', i: 4 }
    ],
    skin: [
      { h: 'Get ready', t: 'A bright room, a full-length mirror and a hand mirror.', i: 0 },
      { h: 'Look from head to toe', t: 'Scalp, face and ears, hands and nails, chest, arms and armpits, back, legs and soles.', i: 1 },
      { h: 'Compare your moles', t: 'Use VARO or ABCDE: uneven colour, size, edge, shape. Find the one that looks different.', i: 7 },
      { h: 'Take photos', t: 'A photo with a ruler beside it makes changes easy to see next time.', i: 9 }
    ]
  };
  A.CHECK_SUMMARY = CHECK_SUMMARY;

  /* Where and how to be, and what you need. These match the Finnish, European and world guides named in the sources. */
  var CHECK_SETUP = {
    breast: [['Where', 'Private, with a mirror, or in the shower'], ['When', 'A few days after your period ends. Pick a date you remember if you have none'], ['Position', 'Standing, then lying on your back with one arm behind your head']],
    testicular: [['Where', 'Private, in or just after a warm bath or shower'], ['When', 'When the skin is relaxed and warm'], ['Position', 'Standing, one hand cupping the scrotum']],
    skin: [['Where', 'A bright room with a full-length mirror and a hand mirror'], ['When', 'After a bath or shower, with a few quiet minutes'], ['Position', 'Standing, then sitting for your legs and feet']]
  };

  function resultRow(r) {
    var found = r.result === 'change';
    return '<div class="res-row" data-res="' + esc(r.id) + '"><div class="res-h"><span class="res-d">' + esc(A.fmtDate(r.ts)) + '</span>' + pill(found ? 'Found something' : 'Nothing new', found ? 'warn' : 'on') + '</div>' +
      (found ? '<p class="res-t">' + esc(resultSummary(r).join(' · ') || 'Something you noticed') + '</p>' : '') + (r.other ? '<p class="res-o">“' + esc(r.other) + '”</p>' : '') + '</div>';
  }
  V.check = function (id) {
    var T = D.TOPICS[id], M = D.CHECK_META[id];
    if (!T || !T.check || !M) return V.notfound();
    var c = T.check, st = checkStatus(id), sum = CHECK_SUMMARY[id] || [], setup = CHECK_SETUP[id] || [], past = resultsFor(id), h = '';
    h += '<header class="t-hero" data-t="' + id + '"><span class="glyph-bg" aria-hidden="true">' + A.organ(id, 230) + '</span><p class="cap">Self-check</p><h1 class="large" id="h">' + esc(M.name) + '</h1><p class="lede">' + esc(c.title) + '</p></header>';
    h += '<figure class="gh-art card" data-t="' + id + '">' + A.art.render('pos-' + id, 'How to position yourself for the ' + M.name.toLowerCase(), { demo: true }) + '</figure>';
    h += '<section class="card setup" aria-label="Best conditions"><p class="cap">Best conditions</p><dl class="setup-l">' + setup.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl></section>';
    h += '<section class="card" aria-label="About this check"><div class="scn-h"><h2 class="h3">Where you are</h2>' + pill(st.label, checkTone(st)) + '</div><div class="metas">' +
      meta('calendar', 'Last', st.last.replace(/^Last: /, '')) + meta('repeat', 'How often', M.rec) + meta('clock', 'Takes', 'about ' + M.min + ' minutes, ' + c.steps.length + ' steps') + '</div>' + chips(M.recSrc) +
      '<div class="btn-row"><button class="btn primary" type="button" data-action="guide" data-topic="' + id + '">Start the guided check</button>' +
      '<button class="btn tint" type="button" data-action="guide" data-topic="' + id + '" data-stage="find">' + ic('checklist', 16) + ' Record what I found</button>' +
      '<button class="btn ghost" type="button" data-action="reminder-new" data-topic="' + id + '" data-kind="selfcheck" data-when="' + M.when + '">' + ic('bell', 16) + ' Remind me</button></div></section>';
    h += '<section class="sec"><p class="cap">The check in short</p><ol class="group steps sum">' + sum.map(function (s) {
      return '<li><button type="button" class="step-link" data-action="guide" data-topic="' + id + '" data-i="' + s.i + '">' + esc(s.h) + '<span class="step-sub">' + esc(s.t) + '</span></button></li>';
    }).join('') + '</ol><p class="fnote">Tap a line to open the guide at that step.</p></section>';
    h += '<section class="sec" aria-labelledby="hist-h"><div class="scn-h"><h2 class="h3" id="hist-h">My results</h2>' + (past.length ? '<span class="status-pill">' + past.length + '</span>' : '') + '</div>' +
      (past.length ? '<div class="res-list">' + past.map(resultRow).join('') + '</div>' : '<div class="empty small"><p class="body">No results yet. After a guided check you tick what you found, and it is kept here.</p></div>') + '</section>';
    if (c.normal && c.normal.length) h += '<section class="card" aria-label="What is normal"><p class="cap">What is normal</p><ul class="tick">' + c.normal.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' + chips(c.normalSrc) + '</section>';
    if (c.videos && c.videos.length) h += '<section class="sec"><p class="cap">Watch a demonstration</p><div class="group">' + c.videos.map(function (v) {
      return cell({ href: v.url, ext: true, lead: lead('speaker', ''), title: v.title, detail: v.org + (v.lang && v.lang !== 'en' ? ' · ' + ({ fi: 'Finnish', sv: 'Swedish' }[v.lang] || v.lang) : '') + (v.length ? ' · ' + v.length : '') });
    }).join('') + '</div><p class="fnote">Videos open on the publisher’s site.</p></section>';
    h += '<section class="sec"><p class="cap">The pictures are based on</p>' + chips(M.drawSrc) + '</section>' + chips(c.src) + H.askRow(id, 'Ask about the ' + M.name.toLowerCase()) + footer();
    return { title: M.name, html: h, hero: true, navAt: 150 };
  };

  /* ---------- My self-check results (in Profile) ---------- */
  V.results = function () {
    var list = allResults(), h = '<p class="lede" style="margin-top:-18px">What you found in your self-checks. It is saved in your account, for you and your appointment. It is not a diagnosis.</p>';
    if (!list.length) {
      h += '<div class="empty"><span class="ic g" aria-hidden="true">' + ic('checklist', 28) + '</span><h2 class="h3">No results yet</h2><p class="body">Finish a guided self-check and tick what you found. It is saved here.</p><a class="btn primary" href="#checks">Do a self-check</a></div>';
    } else {
      h += '<div class="stack" style="gap:12px">' + list.map(function (r) {
        var found = r.result === 'change', id = esc(r.id);
        return '<article class="card res" data-t="' + esc(r.check) + '" data-res="' + id + '"><div class="scn-h"><div><p class="cap">' + esc(A.fmtDate(r.ts)) + '</p><h2 class="h3">' + esc(D.CHECK_META[r.check].name) + '</h2></div>' + pill(found ? 'Found something' : 'Nothing new', found ? 'warn' : 'on') + '</div>' +
          (found ? '<ul class="tick">' + resultSummary(r).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + (r.other ? '<p class="body">“' + esc(r.other) + '”</p>' : '') +
          (found ? '<div class="btn-row"><button class="btn sm tint" type="button" data-action="chk-talk" data-id="' + id + '">' + ic('chat', 16) + ' Talk about it</button></div>' : '') +
          '<div class="btn-row"><button class="btn sm ghost" type="button" data-action="chk-del" data-id="' + id + '">' + ic('trash', 16) + ' Delete</button></div></article>';
      }).join('') + '</div><button class="btn block" type="button" data-action="chk-copy">Copy all for my appointment</button>';
    }
    return { title: 'Self-check results', large: 'Self-check results', html: h + footer() };
  };
  A.actions['chk-copy'] = function () { A.open.copy(allResults().map(recText).join('\n\n---\n\n') + '\n\nThese are my own findings. They are not a diagnosis.', 'Copied. Paste it into a message or bring it to your appointment.'); };
  A.actions['chk-del'] = function (el) {
    var id = el.getAttribute('data-id');
    A.open.action({ title: 'Delete this result?', message: 'It is deleted from your account. Your other results stay.', actions: [{ label: 'Delete result', kind: 'destructive', run: async function () {
      try { await A.svc.removeObservation(id); A.toast('Result deleted.'); }
      catch (error) {
        if (error && error.code === 'not_found') await A.svc.loadObservations().catch(function () { /* shown as is */ });
        A.fail(error);
      }
      A.refresh();
    } }] });
  };

  /* ---------- Scans list ---------- */
  function scanCard(id) {
    var inf = A.scanInfo(id), sc = inf.sc;
    return '<article class="scn" data-t="' + sc.topic + '" data-scan="' + id + '"><div class="scn-b">' +
      '<p class="cap">' + esc(sc.type) + '</p><div class="scn-h"><h3 class="h3">' + esc(sc.name) + '</h3>' + pill(inf.label) + '</div>' +
      '<p class="small">' + esc(inf.why) + '</p>' +
      '<div class="metas">' + meta('calendar', 'Last', inf.lastText) + meta('clock', 'Takes', sc.time.charAt(0).toLowerCase() + sc.time.slice(1)) + meta('repeat', 'How often', sc.freq.charAt(0).toLowerCase() + sc.freq.slice(1)) + '</div>' +
      '<div class="btn-row"><button class="btn sm primary" type="button" data-action="scan-open" data-id="' + id + '">Details</button>' +
      '<button class="btn sm tint" type="button" data-action="scan-log" data-id="' + id + '">' + (inf.last ? 'Update date' : 'I had this') + '</button>' +
      '<button class="btn sm ghost" type="button" data-action="reminder-new" data-topic="' + sc.topic + '" data-kind="' + (sc.kind === 'invited' ? 'letter' : 'gp') + '" data-when="' + (sc.kind === 'invited' ? '3m' : '2w') + '">' + ic('bell', 16) + ' Remind me</button></div></div></article>';
  }
  A.scanCard = scanCard;
  V.scans = function () {
    var inv = D.SCANS.filter(function (s) { return s.kind === 'invited'; }), oth = D.SCANS.filter(function (s) { return s.kind === 'doctor'; });
    var h = '<p class="lede" style="margin-top:-18px">Regular tests and scans that medical providers suggest, how long they take, and when you last had them.</p>';
    h += '<section class="sec" aria-labelledby="inv-h">' + secH('By invitation', '', 'inv-h') + '<p class="small">National screening. Free, voluntary, and sent to you by letter. Take part when you are invited.</p><div class="scn-list">' + inv.map(function (s) { return scanCard(s.id); }).join('') + '</div></section>';
    h += '<section class="sec" aria-labelledby="doc-h">' + secH('If a doctor refers you', '', 'doc-h') + '<p class="small">Arranged by a doctor, for example after a screening test finds something.</p><div class="scn-list">' + oth.map(function (s) { return scanCard(s.id); }).join('') + '</div></section>';
    h += group([cell({ href: '#national', lead: lead('shield', 'g'), title: 'National screening programme', detail: 'How it works, ages and the tests' })], 'i') + footer();
    return { title: 'Scans', large: 'Scans', html: h };
  };

  function scanSheet(id) {
    var inf = A.scanInfo(id), sc = inf.sc;
    var h = '<p class="body">' + esc(sc.what) + '</p>' +
      '<div class="card"><div class="metas">' + meta('user', 'Who', sc.who) + meta('clock', 'Takes', sc.time) + meta('repeat', 'How often', sc.freq) + meta('flag', 'Where', sc.where) + meta('calendar', 'Last', inf.lastText) + '</div></div>';
    if (sc.note) h += '<p class="body">' + esc(sc.note) + '</p>';
    if (sc.kind === 'invited') h += '<div class="note"><b>' + esc(inf.label) + '.</b> Your invitation letter is the source of truth for whether and when you are invited.</div>';
    h += chips(sc.src) + '<div class="stack">' +
      (sc.journey && D.JOURNEYS && D.JOURNEYS[sc.journey] && sc.kind === 'invited' ? '<button class="btn primary block" type="button" data-action="sheet-go" data-to="how-' + esc(sc.journey) + '">See how it works, step by step</button>' : '') +
      '<button class="btn ' + (sc.kind === 'invited' ? '' : 'primary ') + 'block" type="button" data-action="scan-log" data-id="' + id + '">' + (inf.last ? 'Update the date' : 'I have had this') + '</button>' +
      (sc.kind === 'invited' ? '' : '<button class="btn block" type="button" data-action="scan-talk">How to talk to a doctor</button>') +
      '<button class="btn ghost block" type="button" data-action="sheet-close">Close</button></div>';
    A.sheet.open({ kicker: sc.type, title: sc.name, large: true, html: h });
  }
  A.actions['scan-open'] = function (el) { scanSheet(el.getAttribute('data-id')); };
  A.actions['scan-talk'] = function () { A.sheet.close(true); H.askOpen(tr('What should I ask at my appointment?', 'Mitä kysyä vastaanotolla?')); };
  A.actions['scan-log'] = function (el) {
    var id = el.getAttribute('data-id'), sc = scanById(id), cur = S.scans[id], today = new Date().toISOString().slice(0, 10);
    var val = cur && cur.ts ? new Date(cur.ts).toISOString().slice(0, 10) : '';
    A.sheet.open({ kicker: sc.name, title: 'When did you last have it?',
      html: '<form class="form" data-form="scanlog" data-id="' + id + '" novalidate><div class="fgroup"><div class="group"><label class="cell field" for="sl-d"><span class="fl">Date</span><input class="fi" id="sl-d" name="date" type="date" max="' + today + '" value="' + val + '" aria-describedby="e-sl"></label></div>' +
        '<p class="err" id="e-sl" hidden></p><p class="fnote">An approximate date is fine. It is saved in your account, so you can see it here next time.</p></div>' +
        '<div class="stack"><button class="btn primary block" type="submit">Save</button>' + (cur ? '<button class="btn block" type="button" data-action="scan-clear" data-id="' + id + '">Remove the date</button>' : '') + '<button class="btn ghost block" type="button" data-action="sheet-close">Cancel</button></div></form>' });
  };
  /* The date is saved as an observation in the account. A new date replaces the one logged before for the same scan. */
  A.forms.scanlog = async function (form) {
    var id = form.getAttribute('data-id'), sc = scanById(id), v = form.elements.date.value, err = A.$('#e-sl', form), btn = A.$('button[type="submit"]', form);
    var ts = /^\d{4}-\d{2}-\d{2}$/.test(v) ? Date.parse(v + 'T12:00:00Z') : NaN;
    if (!sc || isNaN(ts) || ts > Date.now() + DAY) { err.hidden = false; err.textContent = 'Pick a date that is today or earlier.'; form.elements.date.focus(); return; }
    var before = S.scans[id], topic = A.apiTopic(sc.topic), details = { scanId: id };
    if (topic) details.topic = topic;
    btn.disabled = true;
    try { await A.svc.addObservation({ kind: 'observation', label: sc.name, observedAt: v + 'T12:00:00Z', details: details }); }
    catch (error) { btn.disabled = false; err.hidden = false; err.textContent = A.errorText(error); A.announce(err.textContent); return; }
    if (before && before.id) { try { await A.svc.removeObservation(before.id); } catch (error) { /* the newer date is the one shown */ } }
    A.sheet.close(true); A.refresh(); A.toast('Saved. ' + sc.name + ': ' + A.fmtDate(ts) + '.');
  };
  A.actions['scan-clear'] = async function (el) {
    var cur = S.scans[el.getAttribute('data-id')];
    if (!cur || !cur.id) { A.sheet.close(true); return; }
    el.disabled = true;
    try { await A.svc.removeObservation(cur.id); }
    catch (error) {
      if (error && error.code === 'not_found') await A.svc.loadObservations().catch(function () { /* shown as is */ });
      else { el.disabled = false; A.fail(error); return; }
    }
    A.sheet.close(true); A.refresh(); A.toast('Date removed.');
  };

  /* ---------- National screening programme ---------- */
  /* Programme information only. Whether and when someone is invited is in their invitation letter. */
  V.national = function () {
    var ids = ['breast', 'cervical', 'bowel'], h = '';
    h += '<p class="lede" style="margin-top:-18px">Finland invites you by letter to three free screenings. Taking part is your choice.</p>';
    h += '<section class="hero-card nat-push" aria-labelledby="np-h"><p class="cap">When you are invited</p><h2 class="h2" id="np-h">Please take part</h2><p class="body" style="color:var(--panel-ink2);padding-bottom:6px">Screening looks for a problem before you feel anything. It is free and takes only a few minutes. If you are not sure, “Step by step” shows what happens, and you can always say no.</p></section>';
    h += '<div class="note">Your invitation letter is the source of truth. It tells you whether and when you are invited, and where to go. This page describes the programmes, not your own invitation.</div>';
    ids.forEach(function (id) {
      var T = D.TOPICS[id], n = D.NAT[id], inf = A.scanInfo(n.scan);
      h += '<article class="card nat-card" data-t="' + id + '" aria-labelledby="nat-' + id + '"><div class="nat-h"><span class="ic" data-t="' + id + '" aria-hidden="true">' + A.organ(id, 26) + '</span><div class="cell-b"><h2 class="h3" id="nat-' + id + '">' + esc(A.sname(id)) + '</h2>' +
        '<span class="s-lab-d">' + esc(n.kind) + '</span></div></div><div>' + pill('By invitation letter') + '</div>' +
        '<p class="body">' + esc(H.firstSentences(T.screeningText, 2)) + '</p>' +
        '<div class="metas">' + meta('user', 'Who', n.ages) + meta('repeat', 'How often', n.freq.toLowerCase()) + meta('scan', 'The test', n.test) + meta('calendar', 'Last', inf.lastText) + '</div>' +
        '<p class="small">' + esc(n.pick) + '. Booking and results differ between counties.</p>' + chips(T.screeningSrc) +
        '<div class="btn-row"><a class="btn sm primary" href="#how-' + id + '">Step by step</a>' +
        '<button class="btn sm tint" type="button" data-action="reminder-new" data-topic="' + id + '" data-kind="letter" data-when="3m">' + ic('bell', 16) + ' Remind me</button>' +
        '<a class="btn sm ghost" href="#t-' + id + '">Learn more</a></div></article>';
    });
    h += '<section class="sec" aria-labelledby="hk-h">' + secH('Home kits', '', 'hk-h') + '<p class="small">Whether you get a home kit depends on your invitation and on the screening provider that sends it. Open the provider’s own information.</p>' +
      '<div class="btn-row"><button class="btn sm tint" type="button" data-action="kit-links" data-topic="bowel">Bowel test kit</button><button class="btn sm tint" type="button" data-action="kit-links" data-topic="cervical">Cervical home sampling</button></div><div id="elig" aria-live="polite"></div></section>';
    h += group([cell({ href: '#scans', lead: lead('scan', 'o'), title: 'All regular scans and tests', detail: 'Including ones to ask a doctor about' })], 'i') +
      chips(['suomifi', 'stm']) + footer();
    return { title: 'National screening', large: 'National screening programme', html: h };
  };
})();
