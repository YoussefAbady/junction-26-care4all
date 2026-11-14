import { A as C4A } from "../app.js";

/* care4all views. Each returns { title, large?, pre?, trailing?, html, after?, hero?, navAt?, progress? }.
   ui.js wraps them in a native screen (nav bar, large title, scroller). */
(function () {
  'use strict';
  var A = C4A, D = A.D, S = A.S, esc = A.esc, t = A.t, ic = A.icon, tr = A.tr;
  var V = A.views = {};
  A.ui = A.ui || { q: '', seg: {}, open: {} };
  A.inputs = A.inputs || {};

  /* ---------- helpers ---------- */
  function uniq(ids) {
    var seen = {}, out = [];
    (ids || []).forEach(function (id) { if (D.SOURCES[id] && !seen[id]) { seen[id] = 1; out.push(id); } });
    return out;
  }
  function chips(ids) {
    ids = uniq(ids);
    if (!ids.length) return '';
    return '<div class="chips">' + ids.map(function (id) {
      var s = D.SOURCES[id];
      return '<a class="chip" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.org + (s.date ? ', ' + s.date : '')) + ic('ext', 14) + '</a>';
    }).join('') + '</div>';
  }
  A.chips = chips;

  /* ---------- backend content: language, citations and where a next action goes ---------- */
  /* The catalog answers in English or Finnish. Swedish is shown the English text. */
  function apiLang() { return S.prefs.lang === 'fi' ? 'fi' : 'en'; }
  function safeUrl(u) { return /^https:\/\//i.test(String(u || '')) ? String(u) : ''; }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function langName(l) { return l === 'fi' ? tr('Finnish', 'suomeksi') : l === 'en' ? tr('English', 'englanniksi') : ''; }
  /* "retrieved 14 Nov 2026". The catalog gives the day as YYYY-MM-DD. */
  function retrievedText(s) {
    var ts = Date.parse(String(s && s.retrieved || '') + 'T12:00:00Z');
    return isNaN(ts) ? '' : tr('retrieved ', 'haettu ') + A.fmtDate(ts);
  }
  /* Source citations from the backend, { title, url, retrieved }, as chips. */
  function cites(list) {
    var seen = {}, out = (list || []).filter(function (s) {
      if (!s || !s.title || !safeUrl(s.url) || seen[s.url]) return false;
      seen[s.url] = 1; return true;
    });
    if (!out.length) return '';
    return '<div class="chips">' + out.map(function (s) {
      return '<a class="chip" href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title + (s.retrieved ? ', ' + retrievedText(s) : '')) + ic('ext', 14) + '</a>';
    }).join('') + '</div>';
  }
  /* The same citations as a list of links, with the host, the language of the page and the day it was read. */
  function srcLinks(list) {
    var seen = {}, out = (list || []).filter(function (s) {
      if (!s || !s.title || !safeUrl(s.url) || seen[s.url]) return false;
      seen[s.url] = 1; return true;
    });
    if (!out.length) return '';
    return '<div class="lib-src"><p class="cap">' + esc(tr('Sources', 'Lähteet')) + '</p>' + out.map(function (s) {
      return '<a class="src-l" href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(s.title) + '</span><span class="small">' +
        esc([hostOf(s.url), langName(s.language), retrievedText(s)].filter(Boolean).join(' · ')) + '</span></a>';
    }).join('') + '</div>';
  }
  function askOpen(q, ctx) { var f = A.openAsk || (A.open && A.open.ask); if (f) f(q, ctx || ''); }
  function appointmentQ() { return tr('What should I ask at my appointment?', 'Mitä kysyä vastaanotolla?'); }
  /* A backend topic slug as a route to the design's topic page, or '' when the design has no such topic. */
  function topicRoute(slug) {
    var id = slug ? A.designTopic(slug) : '';
    return id && D.TOPICS[id] ? 't-' + id : '';
  }
  /* The request of a suggested topic (docs/chat-journeys.md) as a place to go. */
  function goRequest(req) {
    req = req || {};
    if (req.action === 'start_intake') A.go('you');
    else if (req.action === 'start_symptom') A.symStart(req.topic ? A.designTopic(req.topic) : '');
    else if (req.message) askOpen(req.message, req.topic ? A.designTopic(req.topic) : '');
    else if (req.open === 'professional_options') askOpen(appointmentQ());
    else A.go(topicRoute(req.topic) || 'learn');
  }
  /* The persistent next action. The id says where its button goes. */
  function goNextAction(na) {
    if (na.id === 'complete_intake') A.go('you');
    else if (na.id === 'contact_professional') askOpen(appointmentQ());
    else if (topicRoute(na.topic)) {
      var id = A.designTopic(na.topic);
      A.ui.seg[id] = 'learn'; A.ui.open['official-' + id] = true;   // land on the official information
      A.go('t-' + id);
    } else A.go('national');
  }
  A.actions['talk-symptoms'] = function (el) { A.symStart(el.getAttribute('data-topic') || ''); };
  A.actions['next-go'] = function () { if (S.next && S.next.nextAction) goNextAction(S.next.nextAction); };
  A.actions['next-suggest'] = function (el) {
    var id = el.getAttribute('data-id'), s = ((S.next && S.next.suggestedTopics) || []).filter(function (x) { return x.id === id; })[0];
    if (s) goRequest(s.request);
  };
  /* Closes the open sheet, then goes to a route. A link with data-action would only close it. */
  A.actions['sheet-go'] = function (el) { A.sheet.close(true); A.go(el.getAttribute('data-to')); };

  A.isStandalone = function () {
    try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; }
  };
  function topicName(id) { return id === 'general' ? 'General' : D.TOPICS[id].name; }
  function tIc(id, size) { return '<span class="ic" data-t="' + id + '" aria-hidden="true">' + A.organ(id, size || 22) + '</span>'; }
  function lead(name, cls) { return '<span class="ic ' + (cls || '') + '" aria-hidden="true">' + ic(name, 20) + '</span>'; }
  function dataAttrs(d) { var s = ''; for (var k in d) s += ' data-' + k + '="' + esc(d[k]) + '"'; return s; }
  function chev(name) { return ic(name || 'chev-r', 18).replace('<svg ', '<svg class="chev" '); }
  function cell(o) {
    var tag = o.href ? 'a' : (o.action ? 'button' : 'div'), a = '';
    if (o.href) a += ' href="' + esc(o.href) + '"' + (o.ext ? ' target="_blank" rel="noopener"' : '');
    if (o.action) a += ' type="button" data-action="' + o.action + '"';
    if (o.data) a += dataAttrs(o.data);
    if (o.label) a += ' aria-label="' + esc(o.label) + '"';
    var trail = o.trail !== undefined ? o.trail : ((o.href || o.action) ? chev(o.ext ? 'ext' : 'chev-r') : '');
    return '<' + tag + ' class="cell' + ((o.href || o.action) ? ' tap' : '') + (o.cls ? ' ' + o.cls : '') + '"' + a + '>' + (o.lead || '') +
      '<span class="cell-b"><span class="cell-t">' + (o.raw || esc(o.title)) + '</span>' + (o.rawDetail ? '<span class="cell-d">' + o.rawDetail + '</span>' : (o.detail ? '<span class="cell-d">' + esc(o.detail) + '</span>' : '')) + '</span>' +
      (o.value ? '<span class="cell-v">' + esc(o.value) + '</span>' : '') + trail + '</' + tag + '>';
  }
  function group(cells, cls) { return '<div class="group' + (cls ? ' ' + cls : '') + '">' + cells.join('') + '</div>'; }
  function secH(title, right, id) { return '<div class="sec-h"><h2 class="h2"' + (id ? ' id="' + id + '"' : '') + '>' + esc(title) + '</h2>' + (right || '') + '</div>'; }
  function footer() {
    return '<footer class="foot"><p class="small"><b>' + esc(D.COPY.disclaimer) + '</b></p><p class="small">Notice a change? Contact your health centre. ' + esc(D.COPY.help) + '</p></footer>';
  }
  function articleCell(a) {
    var s0 = null;
    a.sections.forEach(function (s) { if (!s0 && s.src && s.src.length) s0 = s.src[0]; });
    var org = s0 && D.SOURCES[s0] ? D.SOURCES[s0].org : '', read = A.isRead(a.id);
    return cell({ href: '#a-' + a.id, lead: tIc(a.topic), title: a.title, cls: read ? 'is-read' : '',
      rawDetail: (read ? '<span class="rd on">' + ic('check', 12) + ' Read</span> ' : '<span class="rd">New</span> ') + esc(a.minutes + ' min read' + (org ? ' · ' + org : '') + (A.offlineReady ? ' · Saved offline' : '')) });
  }
  /* Unread first, in the order given. Read ones follow. */
  function unreadFirst(list) { return list.filter(function (a) { return !A.isRead(a.id); }).concat(list.filter(function (a) { return A.isRead(a.id); })); }
  var FOR_YOU = ['breast', 'cervical', 'ovary', 'womb', 'prostate', 'testicular'];
  function forYou(id) { return FOR_YOU.indexOf(id) > -1 && A.isSuggested(id); }
  function svcDots(id) {
    var list = A.services(id);
    return '<span class="svc-dots" aria-hidden="true">' + list.map(function (s) { return '<span class="svc-d">' + ic(s.icon, 15) + '</span>'; }).join('') + '</span>' +
      '<span class="sr">Includes: ' + list.map(function (s) { return s.label; }).join(', ') + '</span>';
  }
  /* How common a cancer is in Finland. Uses your sex where the cancer is found in one sex, otherwise everyone.
     Source: GLOBOCAN 2024 estimates for Finland. The number is the chance of being diagnosed before age 75. */
  function sexKey() { var sx = S.profile && S.profile.sex; return sx === 'female' ? 'f' : sx === 'male' ? 'm' : ''; }
  function roundX(x) { return x < 100 ? Math.round(x) : Math.round(x / 10) * 10; }
  A.stat = function (id) {
    var st = D.STATS && D.STATS[id];
    if (!st) return null;
    var x = roundX(100 / st.risk), group = st.sex === 'f' ? 'women' : st.sex === 'm' ? 'men' : 'people';
    var key = sexKey(), pct = key && st.share ? st.share[key] : null;
    return { x: x, group: group, text: '1 in ' + x + ' ' + group, risk: st.risk, site: st.site, sexOnly: st.sex || '', pct: pct, pctGroup: key === 'f' ? 'women' : 'men', own: !st.sex || !key || st.sex === key };
  };
  /* Most common first, for your sex: the five most common in your sex, then the rest by number of cases. */
  A.burdenOrder = function () {
    var key = sexKey() || 'both', all = D.TOPIC_ORDER.filter(function (id) { return D.STATS[id]; });
    var cases = function (id, k) { var st = D.STATS[id]; return k === 'both' ? st.both : (st[k] || 0); };
    var top = (key === 'both' ? all.slice().sort(function (a, b) { return cases(b, 'both') - cases(a, 'both'); }) : all.filter(function (id) { return D.STATS[id].share && D.STATS[id].share[key]; }).sort(function (a, b) { return cases(b, key) - cases(a, key); })).slice(0, 5);
    var rest = all.filter(function (id) { return top.indexOf(id) < 0; }), other = function (id) { var st = D.STATS[id]; return key !== 'both' && st.sex && st.sex !== key ? 1 : 0; };
    rest.sort(function (a, b) { return (other(a) - other(b)) || (cases(b, 'both') - cases(a, 'both')); });
    return { top: top, rest: rest, key: key };
  };
  /* A small topic card: organ icon, name, one line, and the services it offers. */
  function tile(id) {
    var T = D.TOPICS[id], st = A.stat(id);
    return '<a class="tile" href="#t-' + id + '" data-t="' + id + '">' + tIc(id, 26) + (forYou(id) ? '<span class="sug">For you</span>' : '') +
      '<span class="tl-b"><span class="t-name">' + esc(T.name) + '</span>' + (T.national ? '<span class="tl-tag">National screening</span>' : '') +
      (st ? '<span class="tl-stat">' + esc(st.text) + '</span>' : '') + '<span class="t-blurb">' + esc(T.blurb) + '</span></span>' + svcDots(id) + '</a>';
  }
  function rankRow(id, i) {
    var T = D.TOPICS[id], st = A.stat(id);
    return '<a class="cr" href="#t-' + id + '" data-t="' + id + '"><span class="cr-n" aria-hidden="true">' + (i + 1) + '</span>' + tIc(id, 22) +
      '<span class="cr-b"><span class="t-name">' + esc(T.name) + '</span>' + (T.national ? '<span class="tl-tag">Screening</span>' : '') + '</span>' +
      '<span class="cr-s"><b>' + esc(st.text) + '</b></span>' + chev() + '</a>';
  }
  function statCard(id) {
    var st = A.stat(id);
    if (!st) return '';
    return '<section class="stat-card" data-t="' + id + '" aria-label="How common in Finland"><span class="sc-n">' + esc(st.text) + '</span>' +
      '<span class="sc-t">are diagnosed with ' + esc(st.site.toLowerCase()) + ' cancer before age 75 in Finland' + (st.pct ? ' · ' + st.pct + '% of all cancers in ' + st.pctGroup : '') + '</span>' +
      '<button class="sc-i" type="button" data-action="stat-info" aria-label="What does this number mean?">' + ic('info', 18) + '</button></section>';
  }
  function checkCard(id, cls) {
    var T = D.TOPICS[id], c = T.check, art = { breast: 2, testicular: 2, skin: 7 }[id] || 1, st = c.steps[art];
    return '<a class="chk-card ' + (cls || '') + '" href="#t-' + id + '" data-action="goto-seg" data-topic="' + id + '" data-p="check" data-t="' + id + '">' +
      '<span class="cc-art">' + A.art.render(st.art, st.h) + '</span><span class="cc-b"><span class="cap">Self-check</span><span class="t-name">' + esc(T.name) + ' check</span><span class="t-blurb">' + c.steps.length + ' animated steps</span></span></a>';
  }
  function askRow(ctx, label) {
    return group([cell({ action: 'ask-open', data: { ctx: ctx || '' }, lead: lead('sparkle', 'b'), title: label, detail: 'Answers come only from the sources listed' })]);
  }
  function reminderRow(topic) {
    return group([cell({ action: 'reminder-new', data: { topic: topic || '' }, lead: lead('bell', 'o'), title: 'Set a reminder', detail: 'A nudge to check or book' })]);
  }
  var READ_ORDER = ['what-is-cancer', 'breast-screening', 'bowel-home-test', 'prevention-code', 'know-your-moles', 'cervical-screening', 'testicular-awareness', 'what-screening-is'];

  /* ---------- Home: next action, get to know you, four doors, suggestions ---------- */
  /* The next action and the suggestions come from the backend (S.next, from /api/chat/next-action). Whether and
     when someone is invited to a screening is never worked out here: the invitation letter is the source of truth. */
  function homeCards() {
    var chk = A.selfChecks().filter(function (x) { return x.fit; }), last = 0;
    chk.forEach(function (x) { var c = S.checks[x.id]; if (c && c.ts > last) last = c.ts; });
    var q = [
      ['a', '#checks', 'hand', 'Self-check', chk.length + ' guides · ' + (last ? 'last ' + A.agoText(last) : 'none done yet'), ''],
      ['a', '#scans', 'scan', 'Scan', 'Regular tests · when you last had them', 'New'],
      ['button', 'talk-symptoms', 'heart', 'Talk about symptoms', 'Something feel different?', ''],
      ['a', '#national', 'shield', 'National screening', 'How the three programmes work', '']
    ];
    return '<section class="sec" aria-label="What would you like to do?"><div class="quick">' + q.map(function (x) {
      var inner = '<span class="qa-i">' + ic(x[2], 22) + '</span><span class="qa-t">' + x[3] + (x[5] ? ' <span class="new-tag">' + x[5] + '</span>' : '') + '</span><span class="qa-s">' + esc(x[4]) + '</span>';
      return x[0] === 'a' ? '<a class="qa" href="' + x[1] + '">' + inner + '</a>' : '<button class="qa" type="button" data-action="' + x[1] + '">' + inner + '</button>';
    }).join('') + '</div></section>';
  }
  /* Suggested topics from the backend: { id, label, request }. Where each goes is in goRequest. */
  function suggestChips(list) {
    list = (list || []).filter(function (x) { return x && x.id && x.label; });
    if (!list.length) return '';
    return '<div class="chips lg">' + list.map(function (x) {
      return '<button class="chip" type="button" data-action="next-suggest" data-id="' + esc(x.id) + '">' + esc(x.label) + '</button>';
    }).join('') + '</div>';
  }
  function suggested(nx) {
    if (!nx || !nx.suggestedTopics || !nx.suggestedTopics.length) return '';
    return '<section class="sec" aria-labelledby="sug-h">' + secH(tr('Suggested for you', 'Ehdotuksia sinulle'), '', 'sug-h') +
      '<p class="small">' + esc(tr('Ideas for what to do next. They are suggestions, not a diagnosis.', 'Ideoita jatkoon. Ne ovat ehdotuksia, eivät diagnooseja.')) + '</p>' + suggestChips(nx.suggestedTopics) + '</section>';
  }
  /* "Get to know you" is the next action until the questions are answered and confirmed, so the card only
     appears once that is done. While it is open, the next-action card leads to the same place. */
  function youCard(nx) {
    var na = nx && nx.nextAction;
    if (!na || na.id === 'complete_intake') return '';
    return '<a class="you-card done" href="#you"><span class="you-ic">' + ic('check', 24) + '</span><span class="cell-b"><span class="cap">Get to know you</span>' +
      '<span class="t-name">All answered</span><span class="t-blurb">Tap to review what I know, or change anything.</span>' +
      '<span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="Questions answered"><i style="width:100%"></i></span></span>' + chev() + '</a>';
  }
  /* The look of each next action: icon, level colour, the small heading and the button label. */
  var NEXT_META = {
    complete_intake: { icon: 'chat', level: 'plan', tag: ['Getting to know you', 'Tutustuminen'], go: ['Continue', 'Jatka'] },
    contact_professional: { icon: 'heart', level: 'plan', tag: ['Your saved information', 'Tallentamasi tiedot'], go: ['Prepare my questions', 'Valmistele kysymykseni'] },
    review_body_awareness: { icon: 'hand', level: 'info', tag: ['Body awareness', 'Omatarkkailu'], go: ['Read the guidance', 'Lue ohjeet'] },
    review_screening: { icon: 'shield', level: 'info', tag: ['Screening information', 'Seulontatieto'], go: ['See the programmes', 'Katso seulonnat'] }
  };
  function nextCard(nx) {
    var na = nx && nx.nextAction;
    if (!na || !na.title) return '';
    var m = NEXT_META[na.id] || { icon: 'checklist', level: 'plan', tag: ['Next step', 'Seuraava askel'], go: ['Open', 'Avaa'] };
    return '<section class="na lvl-' + m.level + '" data-na="' + esc(na.id) + '" aria-labelledby="na-h"><div class="na-top"><span class="na-i" aria-hidden="true">' + ic(m.icon, 22) + '</span><p class="cap">' +
      esc(tr('Next action', 'Seuraava askel') + ' · ' + tr(m.tag[0], m.tag[1])) + '</p></div>' +
      '<h2 class="na-t" id="na-h">' + esc(na.title) + '</h2><p class="na-w">' + esc(na.why) + '</p>' +
      (na.sources && na.sources.length ? '<div class="na-src">' + cites(na.sources) + '</div>' : '') +
      '<div class="btn-row"><button class="btn primary" type="button" data-action="next-go">' + esc(tr(m.go[0], m.go[1])) + '</button></div></section>';
  }
  /* Loads the next action again when it is missing (the backend may have been busy) or was written in another language. */
  var nextTried = 0;
  function nextLang(nx) {
    var all = [nx.priority].concat(nx.suggestedTopics || []), i, l;
    for (i = 0; i < all.length; i++) { l = all[i] && all[i].request && all[i].request.language; if (l) return l; }
    return '';
  }
  function keepNextFresh() {
    if (!S.account) return;
    var stale = !S.next || (nextLang(S.next) && nextLang(S.next) !== apiLang());
    if (!stale || Date.now() - nextTried < 30000) return;
    nextTried = Date.now();
    A.svc.loadNext().then(function () { A.refresh(); }, function () { /* the card stays hidden */ });
  }

  /* ---------- Home ---------- */
  V.home = function () {
    var p = S.profile, h = '', nx = S.next, due = S.reminders.filter(function (r) { return r.status === 'active' && r.due <= Date.now(); });
    if (due.length) {
      h += '<a class="banner alert" href="#reminders"><span class="ic k" aria-hidden="true">' + ic('bell', 20) + '</span><span class="cell-b"><b>Reminder due</b><span>You have ' + due.length + ' reminder' + (due.length > 1 ? 's' : '') + ' waiting.</span></span>' + chev() + '</a>';
    }
    h += nextCard(nx) + youCard(nx) + homeCards() + suggested(nx);
    if (!A.isStandalone() && !S.dismissInstall) {
      h += '<section class="banner" aria-label="Install care4all"><span class="ic" aria-hidden="true">' + ic('phone', 20) + '</span><span class="cell-b"><b>Install care4all</b><span>Opens from your Home Screen. Your records need a connection.</span></span>' +
        '<button class="btn sm dark" type="button" data-action="install">' + t('install') + '</button><button class="x" type="button" data-action="dismiss-install" aria-label="Dismiss install message">' + ic('close', 18) + '</button></section>';
    }
    h += footer();
    return {
      title: t('home'), large: t('hello') + (p.name ? ', ' + p.name : ''), html: h,
      trailing: '<a class="nav-btn round" href="#me" aria-label="' + t('profile') + '"><span class="av">' + esc(p.name ? p.name.charAt(0).toUpperCase() : '·') + '</span></a>',
      after: keepNextFresh
    };
  };

  /* ---------- Cancers (library and search) ---------- */
  function hay(arr) { return arr.join(' ').toLowerCase(); }
  function tiles(ids) { return '<div class="tiles">' + ids.map(tile).join('') + '</div>'; }
  A.searchResults = function (q) {
    q = String(q || '').trim().toLowerCase();
    var tops = A.topics(), arts = A.allArticles(), h = '';
    if (!q) {
      var bo = A.burdenOrder(), who = bo.key === 'f' ? 'women' : bo.key === 'm' ? 'men' : 'everyone';
      var all = unreadFirst(READ_ORDER.map(function (id) { return D.ARTICLES[id]; }).filter(function (a) { return a && (a.topic === 'general' || A.isSuggested(a.topic)); })), unread = all.filter(function (a) { return !A.isRead(a.id); }), read = all.filter(function (a) { return A.isRead(a.id); });
      h += '<div class="sec"><p class="cap">Most common in Finland · ' + who + '</p><p class="small cr-note">Chance of a diagnosis before age 75. <button class="link" type="button" data-action="stat-info">What does it mean?</button></p>' +
        '<div class="cr-list">' + bo.top.map(rankRow).join('') + '</div></div>';
      h += '<div class="sec"><p class="cap">Other cancer types</p><p class="small">What it is, signs to watch for, self-checks and scans for each. Types with a national screening programme are marked.</p>' + tiles(bo.rest) + '</div>';
      if (unread.length) h += '<div class="sec"><p class="cap">Up next to read</p>' + group(unread.slice(0, 4).map(articleCell), 'i') + '</div>';
      else h += '<div class="sec"><p class="cap">Reading</p><p class="small">You have read all the short reads. Well done.</p></div>';
      if (read.length) h += '<div class="sec"><p class="cap">Already read · ' + read.length + '</p>' + group(read.map(articleCell), 'i') + '</div>';
      return h;
    }
    var words = q.split(/\s+/).filter(Boolean);
    function hit(text) { return words.every(function (w) { return text.indexOf(w) > -1; }); }
    var tm = tops.filter(function (id) { var T = D.TOPICS[id]; return hit(hay([T.name, T.blurb, T.lede, T.programme, T.kicker, T.symptoms.items.map(function (i) { return i.title; }).join(' ')])); });
    var am = unreadFirst(arts.filter(function (a) { return hit(hay([a.title, a.inShort, a.sections.map(function (s) { return s.h; }).join(' ')])); }));
    if (tm.length) h += '<div class="sec"><p class="cap">Cancer types</p>' + tiles(tm) + '</div>';
    if (am.length) h += '<div class="sec"><p class="cap">Articles</p>' + group(am.map(articleCell), 'i') + '</div>';
    if (!tm.length && !am.length) {
      h += '<div class="empty"><span class="ic" aria-hidden="true">' + ic('search', 26) + '</span><h2 class="h3">No matches for “' + esc(q) + '”</h2><p class="small">Try a cancer type or an organ, or ask the assistant.</p></div>';
    }
    h += '<div class="sec">' + group([cell({ action: 'ask-open', data: { ctx: '', q: q }, lead: lead('sparkle', 'b'), title: 'Ask care4all “' + q + '”', detail: 'Answers come only from the sources listed' })]) + '</div>';
    return h;
  };
  /* ---------- Official source library (backend: /api/library) ----------
     Sourced passages from the versioned catalog, with search. What was typed stays in memory: it is not stored
     and never goes into the address. The catalog is in English and Finnish. Swedish is shown English. */
  var LIB_PAGE = 6;
  var lib = { q: '', draft: '', status: 'idle', lang: '', data: null, error: '', shown: LIB_PAGE, seq: 0, owner: null };
  function libReset() { lib.seq++; lib.q = lib.draft = ''; lib.status = 'idle'; lib.data = null; lib.error = ''; lib.shown = LIB_PAGE; }
  var STATUS_LABEL = {
    awareness_only: ['Awareness only', 'Vain tiedoksi'],
    programme_information: ['Programme information', 'Ohjelman tiedot'],
    unavailable: ['Not available', 'Ei saatavilla']
  };
  function statusPill(s) { var l = STATUS_LABEL[s]; return l ? '<span class="status-pill">' + esc(tr(l[0], l[1])) + '</span>' : ''; }
  function itemsList(items) { return '<ul class="tick">' + (items || []).map(function (x) { return '<li><span>' + esc(x) + '</span></li>'; }).join('') + '</ul>'; }
  function loadingRow(text, quiet) { return '<div class="lib-load"' + (quiet ? '' : ' role="status"') + '><span class="spin" aria-hidden="true"></span><span>' + esc(text) + '</span></div>'; }
  function failedBox(code, retryAction, extra) {
    return '<div class="empty small"><span class="ic o" aria-hidden="true">' + ic('info', 26) + '</span><p class="body">' + esc(A.errorText({ code: code })) + '</p>' +
      '<button class="btn sm" type="button" data-action="' + retryAction + '"' + (extra || '') + '>' + esc(tr('Try again', 'Yritä uudelleen')) + '</button></div>';
  }
  function libArticle(a) {
    var dt = A.designTopic(a.topic);
    return '<article class="card lib-art" data-t="' + esc(dt) + '"><div class="scn-h"><div class="lib-t">' + tIc(dt, 22) + '<h3 class="h3">' + esc(a.title) + '</h3></div>' + statusPill(a.status) + '</div>' +
      itemsList(a.items) + srcLinks(a.sources) + '</article>';
  }
  function libOut() {
    if (lib.status === 'idle') return '<p class="small">' + esc(tr('Search by cancer type or sign, for example colorectal or lump. Leave the box empty to browse everything.', 'Hae syöpätyypin tai oireen mukaan, esimerkiksi suolisto tai kyhmy. Tyhjällä haulla näet kaiken.')) + '</p>';
    if (lib.status === 'loading') return loadingRow(tr('Searching the library…', 'Haetaan kirjastosta…'), true);
    if (lib.status === 'error') return failedBox(lib.error, 'lib-retry');
    var d = lib.data || {}, arts = d.articles || [], h = d.notice ? '<p class="note">' + esc(d.notice) + '</p>' : '';
    if (!arts.length) {
      return h + '<div class="empty small"><span class="ic" aria-hidden="true">' + ic('search', 26) + '</span><h3 class="h3">' + esc(tr('No matches for “' + lib.q + '”', 'Ei tuloksia haulle “' + lib.q + '”')) + '</h3>' +
        '<p class="small">' + esc(tr('Try a cancer type such as breast, colorectal, cervical, skin, prostate or testicular.', 'Kokeile syöpätyyppiä, esimerkiksi rinta, suolisto, kohdunkaula, iho, eturauhanen tai kives.')) + '</p></div>';
    }
    h += '<p class="small" id="lib-count">' + esc(lib.q ? tr(arts.length + ' sourced passages for “' + lib.q + '”', arts.length + ' tulosta haulle “' + lib.q + '”') : tr(arts.length + ' sourced passages', arts.length + ' tulosta')) + '</p>' +
      '<div class="lib-list">' + arts.slice(0, lib.shown).map(libArticle).join('') + '</div>';
    if (arts.length > lib.shown) h += '<button class="btn block" type="button" data-action="lib-more">' + esc(tr('Show more', 'Näytä lisää') + ' (' + (arts.length - lib.shown) + ')') + '</button>';
    return h;
  }
  /* What a screen reader hears when the results change: one line, not every card. */
  function libStatus() {
    if (lib.status === 'loading') return tr('Searching the library…', 'Haetaan kirjastosta…');
    if (lib.status === 'error') return A.errorText({ code: lib.error });
    if (lib.status !== 'ok') return '';
    var n = lib.data && lib.data.articles ? lib.data.articles.length : 0;
    return n ? tr(n + ' sourced passages', n + ' tulosta') : tr('No matches', 'Ei tuloksia');
  }
  function paintLib() {
    A.$$('[data-lib-out]').forEach(function (el) { el.innerHTML = libOut(); });
    A.$$('[data-lib-status]').forEach(function (el) { el.textContent = libStatus(); });
  }
  function runLibrary(q) {
    var seq = ++lib.seq, lang = S.prefs.lang;
    lib.q = q; lib.draft = q; lib.lang = lang; lib.status = 'loading'; lib.shown = LIB_PAGE; lib.error = '';
    paintLib();
    A.api.library({ lang: lang, q: q }).then(function (data) {
      if (seq !== lib.seq) return;
      lib.data = data; lib.status = 'ok'; paintLib();
    }, function (error) {
      if (seq !== lib.seq) return;
      lib.error = (error && error.code) || 'unavailable'; lib.status = 'error'; paintLib();
    });
  }
  function libSection() {
    var label = tr('Search source library', 'Hae lähdekirjastosta');
    return '<section class="sec lib" aria-labelledby="lib-h">' + secH(tr('Official source library', 'Virallinen lähdekirjasto'), '', 'lib-h') +
      '<p class="small">' + esc(tr('Passages from Finnish and European health organisations, each with a link to its source. General information, not a diagnosis.', 'Suomalaisten ja eurooppalaisten terveysorganisaatioiden tekstejä lähdelinkkeineen. Yleistä tietoa, ei diagnoosi.')) + '</p>' +
      (S.prefs.lang === 'sv' ? '<p class="note">The library is in English and Finnish. Swedish shows the English text.</p>' : '') +
      '<form class="lib-form" data-form="libsearch" role="search" novalidate><div class="searchbar">' + ic('search', 20) +
      '<input id="lib-q" name="q" type="search" maxlength="100" placeholder="' + esc(tr('Search sourced passages', 'Hae kirjastosta')) + '" aria-label="' + esc(label) + '" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" value="' + esc(lib.draft) + '">' +
      '<button class="clear" type="button" data-action="lib-clear" aria-label="' + esc(tr('Clear library search', 'Tyhjennä haku')) + '"' + (lib.draft ? '' : ' hidden') + '>' + ic('close', 14) + '</button></div>' +
      '<button class="btn primary sm" type="submit">' + esc(tr('Search', 'Hae')) + '</button></form>' +
      '<div class="lib-out" data-lib-out>' + libOut() + '</div><p class="sr" role="status" data-lib-status></p></section>';
  }
  A.forms.libsearch = function (form) { runLibrary(form.elements.q.value.trim()); };
  A.inputs.libsearch = function (el, form) {
    lib.draft = el.value;
    var c = A.$('.clear', form); if (c) c.hidden = !el.value;
  };
  A.actions['lib-clear'] = function (el) {
    var form = el.closest('form'), inp = form && form.elements.q;
    libReset();
    if (inp) { inp.value = ''; inp.focus(); }
    el.hidden = true; paintLib();
  };
  A.actions['lib-retry'] = function () { runLibrary(lib.q); };
  A.actions['lib-more'] = function () {
    var from = lib.shown, root = A.$('[data-lib-out]');
    lib.shown += LIB_PAGE; paintLib();
    var cards = root ? A.$$('.lib-art', root) : [];
    if (cards[from]) { cards[from].setAttribute('tabindex', '-1'); cards[from].focus(); }
  };
  /* A language change needs the same search again in the new language. */
  function libAfter() {
    if (lib.status !== 'idle' && lib.status !== 'loading' && lib.lang && lib.lang !== S.prefs.lang) runLibrary(lib.q);
  }

  V.learn = function () {
    var who = S.account && S.account.username || '';
    if (lib.owner !== who) { libReset(); lib.owner = who; }   // a search typed by someone else is not kept
    var h = '<p class="lede" style="margin-top:-18px">Plain-language guides to ' + A.topics().length + ' cancer types, and short reads. Sources from Finland and Europe.</p>' +
      '<div class="searchbar" role="search">' + ic('search', 20) +
      '<input id="search" type="search" data-search placeholder="Search cancers, organs, signs" aria-label="Search cancers, organs and signs" autocomplete="off" autocapitalize="off" enterkeyhint="search" value="' + esc(A.ui.q) + '">' +
      '<button class="clear" type="button" data-action="search-clear" aria-label="Clear search"' + (A.ui.q ? '' : ' hidden') + '>' + ic('close', 14) + '</button></div>' +
      '<div class="content-r" id="results" style="display:flex;flex-direction:column;gap:28px" aria-live="polite">' + A.searchResults(A.ui.q) + '</div>' + libSection() + footer();
    return { title: 'Learn', large: 'Learn', html: h, after: libAfter };
  };
  V.cancers = V.learn;

  /* ---------- Topic ---------- */
  function firstSentences(text, n) { return String(text || '').split(/(?<=[.!?])\s+/).slice(0, n).join(' '); }
  function symCard(id, it) {
    return '<article class="sym" data-t="' + id + '"><figure class="sym-art">' + A.art.render(it.art, it.title + ' (illustration)') + '</figure>' +
      '<div class="sym-b"><h3 class="h3">' + esc(it.title) + '</h3><p class="body">' + esc(it.what) + '</p>' + chips([it.src]) + '</div></article>';
  }
  function toneSwitch() {
    var tones = [['1', 'Light'], ['2', 'Medium'], ['3', 'Deep']];
    return '<div class="tone" role="radiogroup" aria-label="Skin tone for the example pictures"><span class="cap">Show examples on</span><div class="tone-opts">' + tones.map(function (x) {
      return '<label><input type="radio" name="skin" value="' + x[0] + '" data-pref="skin"' + (String(S.prefs.skin || 1) === x[0] ? ' checked' : '') + '><span class="sw-t t' + x[0] + '"></span><span class="tn">' + x[1] + '</span></label>';
    }).join('') + '</div></div>';
  }
  function abcdeCard(T) {
    var arts = ['mole-asym', 'mole-border', 'mole-colour', 'mole-diam', 'mole-evolve'];
    return '<section class="card" data-t="skin" aria-labelledby="abcde-h"><p class="cap">The ABCDE rule</p><h2 class="h3" id="abcde-h">Five signs to check on a mole</h2><div class="abcde">' +
      T.check.abcde.map(function (a, i) {
        return '<div class="ab"><figure class="ab-art">' + A.art.render(arts[i], a.word) + '</figure><div><p class="h3"><span class="ab-l">' + a.letter + '</span> ' + esc(a.word) + '</p><p class="body">' + esc(a.t) + '</p></div></div>';
      }).join('') + '</div>' + chips([T.check.abcde[0].src]) + '</section>';
  }
  /* Instead of a "when to see a doctor" list: describe it, and the conversation writes the note. */
  function talkCard(id) {
    return '<section class="card talk-note" aria-label="Talk about your symptoms"><p class="cap">Noticed something?</p><h2 class="h3">Talk about your symptoms</h2><p class="body">Tell me what you notice. I will ask a few friendly questions and write it down, so you have a clear note for your appointment.</p>' +
      '<button class="btn primary block" type="button" data-action="talk-symptoms" data-topic="' + (id === 'general' ? '' : id) + '">' + ic('chat', 18) + ' Talk about symptoms</button></section>';
  }

  /* ---------- Official information on a topic page (backend: /api/cancers) ----------
     Opened on demand and kept in memory for this visit. It fails soft: the rest of the page never waits for it. */
  var official = {};   // "slug:lang" -> { status: 'loading' | 'ok' | 'error', data, error }
  var OFFICIAL_SECTIONS = [
    ['awareness', ['Overview and screening', 'Tietoa ja seulonta']],
    ['symptoms', ['Possible symptoms', 'Mahdolliset oireet']],
    ['selfExamination', ['Body awareness', 'Omatarkkailu']],
    ['homeKit', ['Home sampling', 'Kotinäytteenotto']],
    ['riskFactors', ['Risk factors', 'Riskitekijät']]
  ];
  function officialKey(id) { return A.apiTopic(id) + ':' + apiLang(); }
  function officialBody(id) {
    var o = official[officialKey(id)];
    if (!o || o.status === 'loading') return loadingRow(tr('Loading official information…', 'Ladataan virallista tietoa…'));
    if (o.status === 'error') return failedBox(o.error, 'official-retry', ' data-topic="' + esc(id) + '"');
    var d = o.data || {}, card = d.cancers && d.cancers[0];
    if (!card) return failedBox('not_found', 'official-retry', ' data-topic="' + esc(id) + '"');
    var h = S.prefs.lang === 'sv' ? '<p class="note">The official information is in English and Finnish. Swedish shows the English text.</p>' : '';
    if (d.notice) h += '<p class="note">' + esc(d.notice) + '</p>';
    if (card.summary) h += '<p class="body">' + esc(card.summary) + '</p>';
    OFFICIAL_SECTIONS.forEach(function (s) {
      var sec = card[s[0]];
      if (!sec || !sec.items || !sec.items.length) return;
      h += '<section class="off-sec"><div class="scn-h"><h3 class="h3">' + esc(tr(s[1][0], s[1][1])) + '</h3>' + statusPill(sec.status) + '</div>' + itemsList(sec.items) + srcLinks(sec.sources) + '</section>';
    });
    return h;
  }
  function paintOfficial(id) { A.$$('[data-official-body="' + id + '"]').forEach(function (el) { el.innerHTML = officialBody(id); }); }
  function loadOfficial(id) {
    var key = officialKey(id), cur = official[key];
    if (cur && (cur.status === 'loading' || cur.status === 'ok')) return;
    official[key] = { status: 'loading' };
    paintOfficial(id);
    A.api.cancers(apiLang(), A.apiTopic(id)).then(function (data) {
      official[key] = { status: 'ok', data: data }; paintOfficial(id);
    }, function (error) {
      official[key] = { status: 'error', error: (error && error.code) || 'unavailable' }; paintOfficial(id);
    });
  }
  function officialBox(id) {
    var key = 'official-' + id, open = !!A.ui.open[key];
    return '<div class="group"><div class="acc' + (open ? ' open' : '') + '" id="' + key + '"><button class="cell tap" type="button" aria-expanded="' + open + '" aria-controls="' + key + '-b" data-action="official-toggle" data-topic="' + id + '">' +
      '<span class="cell-b"><span class="cell-t">' + esc(tr('Official information', 'Virallinen tieto')) + '</span><span class="cell-d">' + esc(tr('From the source library, with links to each source', 'Lähdekirjastosta, lähdelinkkeineen')) + '</span></span>' + chev() + '</button>' +
      '<div class="acc-b" id="' + key + '-b"' + (open ? '' : ' inert') + '><div><div class="acc-in" data-official-body="' + id + '">' + officialBody(id) + '</div></div></div></div></div>';
  }
  A.actions['official-toggle'] = function (el) {
    var id = el.getAttribute('data-topic'), box = el.closest('.acc'), open = !box.classList.contains('open'), body = A.$('.acc-b', box);
    box.classList.toggle('open', open);
    el.setAttribute('aria-expanded', String(open));
    if (body) { if (open) body.removeAttribute('inert'); else body.setAttribute('inert', ''); }
    A.ui.open['official-' + id] = open;
    if (open) loadOfficial(id);
  };
  A.actions['official-retry'] = function (el) {
    var id = el.getAttribute('data-topic');
    delete official[officialKey(id)];
    loadOfficial(id);
  };

  /* Home kits: the provider's own pages. Whether a kit applies depends on the invitation, not on anything here. */
  var KIT_FALLBACK = { bowel: ['fimlab-crc'], cervical: ['fimlab-hpv'] };
  function kitHtml(topic, d, failed) {
    var links = d && d.providerLinks || [];
    return '<div class="result" tabindex="-1"><p class="cap">' + esc(tr('Official information', 'Virallinen tieto')) + '</p>' +
      '<h3 class="h3">' + esc(tr('Your invitation letter decides', 'Kutsukirje ratkaisee')) + '</h3>' +
      '<p class="body">' + esc(tr('Whether a home kit applies to you depends on your invitation and on the screening provider that sends it. Check your letter, or ask the provider named in it.', 'Se, koskeeko kotitesti sinua, riippuu kutsustasi ja sen lähettävästä seulontayksiköstä. Tarkista kutsukirjeesi tai kysy kirjeessä mainitulta yksiköltä.')) + '</p>' +
      (failed ? '<p class="small">' + esc(A.errorText(failed)) + '</p>' : '') +
      (links.length ? group(links.map(function (l) {
        return cell({ href: safeUrl(l.url), ext: true, title: l.title, detail: [hostOf(l.url), langName(l.language), retrievedText(l)].filter(Boolean).join(' · ') });
      })) : chips(KIT_FALLBACK[topic] || [])) + '</div>';
  }
  A.actions['kit-links'] = function (el) {
    var topic = el.getAttribute('data-topic'), slug = A.apiTopic(topic), box = A.$('#elig', el.closest('.screen'));
    if (!box || !slug) return;
    box.innerHTML = loadingRow(tr('Loading the official links…', 'Ladataan virallisia linkkejä…'));
    A.api.library({ topic: slug, lang: S.prefs.lang }).then(function (d) { box.innerHTML = kitHtml(topic, d); },
      function (error) { box.innerHTML = kitHtml(topic, null, error); });
  };

  V.topic = function (id) {
    var T = D.TOPICS[id];
    if (!T) return V.notfound();
    var sy = T.symptoms || {}, h = '';
    var scans = A.scansFor(id), segs = [['learn', t('learn')]];
    if (T.check) segs.push(['check', t('selfCheck')]);
    if (scans.length || T.kit) segs.push(['scans', 'Scans']);
    if (sy.items && sy.items.length) segs.push(['symptoms', t('watchFor')]);
    var cur = A.ui.seg[id] === 'kit' ? 'scans' : (A.ui.seg[id] || 'learn'), idx = 0;
    segs.forEach(function (s, i) { if (s[0] === cur) idx = i; });
    cur = segs[idx][0];

    h += '<header class="t-hero" data-t="' + id + '"><span class="glyph-bg" aria-hidden="true">' + A.organ(id, 230) + '</span>' +
      '<p class="cap">Cancer type</p>' +
      '<h1 class="large" id="h">' + esc(T.name + ' cancer') + '</h1><p class="lede">' + esc(T.lede) + '</p>' + chips(T.leadSrc) + '</header>';
    h += statCard(id);
    if (T.national) {
      var N = D.NAT[id], inf = A.scanInfo(N.scan);
      h += '<section class="card up nat-link" data-t="' + id + '" aria-labelledby="nl-h"><p class="cap">National screening programme</p><h2 class="h3" id="nl-h">' + esc(A.sname(id)) + '</h2>' +
        '<p class="body">Your invitation letter tells you whether and when you are invited. It is free and your choice. The test: ' + esc(N.test.charAt(0).toLowerCase() + N.test.slice(1)) + ' (' + esc(N.kind.toLowerCase()) + ').</p>' +
        '<div class="metas">' + '<div class="meta"><span class="m-i" aria-hidden="true">' + ic('user', 16) + '</span><span class="m-t"><span class="m-l">Who:</span> ' + esc(N.ages) + '</span></div>' +
        '<div class="meta"><span class="m-i" aria-hidden="true">' + ic('repeat', 16) + '</span><span class="m-t"><span class="m-l">How often:</span> ' + esc(N.freq.toLowerCase()) + '</span></div>' +
        '<div class="meta"><span class="m-i" aria-hidden="true">' + ic('calendar', 16) + '</span><span class="m-t"><span class="m-l">Last:</span> ' + esc(inf.lastText) + '</span></div></div>' +
        '<div class="btn-row"><a class="btn sm primary" href="#how-' + id + '">Guided steps</a><button class="btn sm tint" type="button" data-action="reminder-new" data-topic="' + id + '" data-kind="letter" data-when="3m">' + ic('bell', 16) + ' Remind me</button></div>' +
        '<p class="small">After that, carry on below: learn, self-check, scans and signs to watch for.</p></section>';
    }
    h += '<div class="segwrap"><div class="seg" role="tablist" aria-label="' + esc(T.name) + ' sections" style="--n:' + segs.length + ';--i:' + idx + '">' +
      segs.map(function (s, i) {
        return '<button type="button" role="tab" id="tab-' + id + '-' + s[0] + '" aria-selected="' + (s[0] === cur) + '" aria-controls="p-' + id + '-' + s[0] + '" data-action="seg" data-topic="' + id + '" data-p="' + s[0] + '" data-i="' + i + '">' + esc(s[1]) + '</button>';
      }).join('') + '</div></div>';

    var srcs = [];
    T.articles.forEach(function (aid) { D.ARTICLES[aid].sections.forEach(function (s) { srcs = srcs.concat(s.src || []); }); });
    srcs = uniq(srcs.concat(T.leadSrc || [], sy.src || [], (T.check && T.check.src) || [], (T.kit && T.kit.src) || []));
    var panel = function (pid, body) {
      return '<section class="panel-seg" role="tabpanel" id="p-' + id + '-' + pid + '" aria-labelledby="tab-' + id + '-' + pid + '"' + (pid === cur ? '' : ' hidden') + '>' + body + '</section>';
    };
    h += panel('learn', group(unreadFirst(T.articles.map(function (aid) { return D.ARTICLES[aid]; })).map(articleCell), 'i') +
      (A.apiTopic(id) ? officialBox(id) : '') +
      '<p class="cap" style="margin-top:8px">' + srcs.length + ' sources for this topic</p>' +
      '<div class="group">' + srcs.map(function (sid) { var s = D.SOURCES[sid]; return cell({ href: s.url, ext: true, title: s.name, detail: s.use + (s.date ? ' · ' + s.date : '') }); }).join('') + '</div>');

    if (T.check) {
      var c = T.check;
      h += panel('check', '<section class="card guide-hero" data-t="' + id + '"><figure class="gh-art">' + A.art.render('pos-' + id, 'How to position yourself', { demo: true }) + '</figure><h2 class="h3">' + esc(c.title) + '</h2>' + c.text.map(function (x) { return '<p class="body">' + esc(x) + '</p>'; }).join('') +
        '<a class="btn primary block" href="#chk-' + id + '">Open the self-check</a></section>' +
        (id === 'skin' ? abcdeCard(T) : '') +
        (c.normal && c.normal.length ? '<section class="card" aria-label="What is normal"><p class="cap">What is normal</p><ul class="tick">' + c.normal.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' + chips(c.normalSrc) + '</section>' : '') +
        (c.videos && c.videos.length ? '<section class="sec"><p class="cap">Watch a demonstration</p><div class="group">' + c.videos.map(function (v) {
          return cell({ href: v.url, ext: true, lead: lead('speaker', ''), title: v.title, detail: v.org + (v.lang && v.lang !== 'en' ? ' · ' + ({ fi: 'Finnish', sv: 'Swedish' }[v.lang] || v.lang) : '') + (v.length ? ' · ' + v.length : '') });
        }).join('') + '</div><p class="fnote">Videos open on the publisher’s site.</p></section>' : '') + chips(c.src));
    }
    if (scans.length || T.kit) {
      h += panel('scans', '<p class="body">Regular tests and scans that medical providers suggest for ' + esc(T.name.toLowerCase()) + ' cancer, how long they take, and when you last had them.</p><div class="scn-list">' + scans.map(function (sc) { return A.scanCard(sc.id); }).join('') + '</div>' +
        (T.kit ? '<div class="card"><h2 class="h3">' + esc(T.kit.title) + '</h2><p class="body">' + esc(T.kit.text) + '</p></div>' +
        '<button class="btn primary block" type="button" data-action="kit-links" data-topic="' + id + '">' + esc(tr('See the official instructions', 'Katso viralliset ohjeet')) + '</button>' +
        '<div id="elig" aria-live="polite"></div>' +
        (T.kit.video ? '<div class="group">' + cell({ href: T.kit.video.url, ext: true, lead: lead('speaker', ''), title: T.kit.video.title, detail: T.kit.video.org + ' · Finnish' + (T.kit.video.length ? ' · ' + T.kit.video.length : '') }) + '</div>' : '') + chips(T.kit.src) : '') +
        '<a class="link" href="#scans">See all scans and tests</a>');
    }
    if (sy.items && sy.items.length) {
      h += panel('symptoms', '<p class="body">Many of these have harmless causes. Look at the pictures and read the descriptions. If something fits, talk about it.</p>' +
        toneSwitch() +
        '<div class="syms">' + sy.items.map(function (it) { return symCard(id, it); }).join('') + '</div>' +
        talkCard(id));
    }
    h += askRow(id, 'Ask about ' + T.name.toLowerCase() + ' cancer') + footer();
    return { title: T.name, html: h, hero: true, navAt: 150, after: function () { if (A.apiTopic(id) && A.ui.open['official-' + id]) loadOfficial(id); } };
  };

  /* ---------- Article ---------- */
  function statsHtml(stats) {
    return group(stats.map(function (s) {
      var shown = s.text != null ? s.text : (s.prefix || '') + s.n + (s.suffix || '');
      var n = s.n != null && s.text == null
        ? '<span class="sr">' + esc(shown) + '</span><span aria-hidden="true" data-count="' + s.n + '" data-prefix="' + esc(s.prefix || '') + '" data-suffix="' + esc(s.suffix || '') + '">' + esc(shown) + '</span>'
        : esc(shown);
      return '<div class="cell stat"><span class="stat-n">' + n + '</span><span class="stat-l">' + esc(s.label) + '</span></div>';
    }));
  }
  function renderSection(sec) {
    var usePlain = S.prefs.plain && sec.plain && sec.plain.length;
    var paras = usePlain ? sec.plain : (sec.p || []);
    var o = '<section class="rsec" id="s-' + sec.id + '" aria-labelledby="h-' + sec.id + '"><h2 class="h2" id="h-' + sec.id + '">' + esc(sec.h) + '</h2>';
    if (sec.lead && !usePlain) o += '<p class="body">' + esc(sec.lead) + '</p>';
    if (sec.stats) o += statsHtml(sec.stats);
    if (sec.steps) o += '<ol class="group steps">' + sec.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    if (sec.cols) {
      if (usePlain) o += '<p class="body">Benefit: deaths from breast cancer are lower among women who go. Downside: some women are called for extra tests that were not needed.</p>';
      else o += sec.cols.map(function (c) { return '<div class="bcard ' + (/benefit/i.test(c.label) ? 'good' : 'bad') + '"><span class="status-pill">' + esc(c.label) + '</span><p class="body" style="font-size:1.0625rem">' + esc(c.text) + '</p></div>'; }).join('');
    }
    if (sec.list && !usePlain) o += '<div class="card"><ul class="tick">' + sec.list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    paras.forEach(function (x) { o += '<p class="body">' + esc(x) + '</p>'; });
    if (sec.pending) o += '<div class="placeholder">' + esc(sec.pending) + '</div>';
    if (sec.link) o += group([cell({ action: 'goto-seg', data: { topic: sec.link.topic, p: sec.link.anchor }, lead: lead('arrow-r', ''), title: sec.link.label })]);
    return o + chips(sec.src) + '</section>';
  }
  V.article = function (id) {
    var a = D.ARTICLES[id];
    if (!a) return V.notfound();
    var isNat = D.NATIONAL.indexOf(a.topic) > -1, secs = [], gotTalk = false;
    a.sections.forEach(function (sc) {
      if (sc.h === 'When to see a doctor') { if (!gotTalk) { gotTalk = true; secs.push({ talk: true }); } return; }
      if (sc.h === 'Screening' && !isNat && a.topic !== 'general') return;
      secs.push(sc);
    });
    var srcs = [];
    secs.forEach(function (s) { srcs = srcs.concat(s.src || []); });
    srcs = uniq(srcs);
    var h = '<header class="t-hero" data-t="' + a.topic + '"><span class="glyph-bg" aria-hidden="true">' + A.organ(a.topic, 230) + '</span>' +
      '<p class="cap">' + esc(topicName(a.topic)) + ' · ' + t('learn') + '</p>' +
      '<h1 class="large" id="h" style="font-size:1.9375rem">' + esc(a.title) + '</h1>' +
      '<p class="small">' + a.minutes + ' min read' + (A.offlineReady ? ' · Saved for offline reading' : '') + ' · <span id="read-state">' + (A.isRead(a.id) ? 'Read' : 'Not read yet') + '</span></p></header>';
    if (S.prefs.lang !== 'en') h += '<p class="note">' + esc(t('enOnly')) + '</p>';
    h += '<article class="reading" aria-labelledby="h"><aside class="inshort" aria-label="' + t('inShort') + '"><p class="cap" style="color:var(--accent-text)">' + t('inShort') + '</p><p class="big">' + esc(a.inShort) + '</p></aside>' +
      secs.map(function (sc) { return sc.talk ? talkCard(a.topic) : renderSection(sc); }).join('') + '</article>';
    h += '<section class="sec" aria-labelledby="gs-h"><p class="cap">Grounded in ' + srcs.length + ' source' + (srcs.length === 1 ? '' : 's') + '</p><h2 class="h2" id="gs-h">Sources</h2>' +
      group(srcs.map(function (sid) { var s = D.SOURCES[sid]; return cell({ href: s.url, ext: true, title: s.org, detail: s.name.replace(/^[^:]*:\s*/, '') + (s.date ? ' · ' + s.date : '') }); })) +
      '<p class="small">Clinically reviewed by [REVIEWER NAME, ROLE] on [DATE]. Sources checked on [DATE].</p></section>';
    var rel = unreadFirst((a.related || []).filter(function (r) { return D.ARTICLES[r]; }).map(function (r) { return D.ARTICLES[r]; }));
    h += '<section class="sec read-end" id="read-end" aria-label="Finished reading"><button class="btn block ' + (A.isRead(a.id) ? '' : 'primary') + '" type="button" data-action="read-toggle" data-id="' + a.id + '" aria-pressed="' + A.isRead(a.id) + '">' +
      (A.isRead(a.id) ? ic('check', 18) + ' Read. Tap to mark as not read' : 'Mark as read') + '</button><p class="small center">Articles you have read are marked, and I will not suggest them again.</p></section>';
    if (rel.length) h += '<section class="sec" aria-labelledby="rel-h"><h2 class="h2" id="rel-h">Keep reading</h2>' + group(rel.map(articleCell), 'i') + '</section>';
    h += askRow(a.topic === 'general' ? '' : a.topic, 'Ask about this article') + reminderRow(a.topic === 'general' ? '' : a.topic) + footer();
    return {
      title: a.title, html: h, hero: true, navAt: 150, progress: true,
      trailing: '<button class="nav-btn round" type="button" data-action="read-opts" aria-label="Reading options">' + ic('textsize', 22) + '</button>',
      after: function (root) {
        var end = A.$('.read-end .btn', root), sc = A.$('.scroller', root);
        if (!end || A.isRead(a.id) || typeof IntersectionObserver === 'undefined' || !sc || sc.scrollHeight < sc.clientHeight * 1.5) return;
        var t0 = Date.now(), io = new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            if (!en.isIntersecting || Date.now() - t0 < 4000 || A.isRead(a.id)) return;
            io.disconnect(); A.run('read-toggle', end);
          });
        }, { threshold: 0.9 });
        io.observe(end);
      }
    };
  };

  /* ---------- Sources and method ---------- */
  V.sources = function () {
    var ids = Object.keys(D.SOURCES), orgs = {};
    ids.forEach(function (id) { var o = D.SOURCES[id].org; (orgs[o] = orgs[o] || []).push(id); });
    var names = Object.keys(orgs).sort(function (x, y) { return orgs[y].length - orgs[x].length || x.localeCompare(y); });
    var h = '<p class="lede" style="margin-top:-18px">Every line in care4all traces to a named source. We use Finnish sources first, then European, then worldwide.</p>';
    h += '<section class="sec" aria-labelledby="who-h">' + secH('Who we use', '', 'who-h') + '<p class="small">' + ids.length + ' pages from ' + names.length + ' organisations. Finnish sources come first, then European, then worldwide.</p><div class="group">' + names.map(function (org, n) {
      var key = 'org-' + n, open = !!A.ui.open[key], list = orgs[org];
      return '<div class="acc' + (open ? ' open' : '') + '" id="' + key + '"><button class="cell tap" type="button" aria-expanded="' + open + '" data-action="acc" data-id="' + key + '"><span class="cell-b"><span class="cell-t">' + esc(org) + '</span></span><span class="cell-v">' + list.length + '</span>' + chev() + '</button>' +
        '<div class="acc-b"><div><div class="acc-in" style="gap:2px">' + list.map(function (id) { var s = D.SOURCES[id]; return '<a class="src-l" href="' + esc(s.url) + '" target="_blank" rel="noopener"><span>' + esc(s.name.replace(/^[^:]*:\s*/, '')) + '</span><span class="small">' + esc(s.use || '') + (s.date ? ' · ' + esc(s.date) : '') + '</span></a>'; }).join('') + '</div></div></div></div>';
    }).join('') + '</div></section>';
    h += '<section class="sec" aria-labelledby="ai-h">' + secH('How AI answers work', '', 'ai-h') +
      '<ol class="group steps"><li>Answers show only reviewed passages from the sources above and from the official source library. care4all writes none of its own.</li><li>Every answer lists the sources it used, with the date each one was read.</li><li>If the sources do not cover your question, care4all says so and points you to a health professional.</li></ol></section>';
    h += '<section class="sec" aria-labelledby="not-h">' + secH('What care4all does not do', '', 'not-h') +
      '<p class="body">It does not diagnose. It does not replace your health centre. If you notice a change, contact them.</p>' +
      group([cell({ action: 'source-report', lead: lead('flag', ''), title: 'Report a problem with a source' })]) + '</section>' + footer();
    return { title: t('sources'), large: 'Sources and method', html: h };
  };
  /* Report a problem with a source: saved privately on the server (/api/content-reports). */
  A.actions['source-report'] = function () {
    A.sheet.open({ title: tr('Report a problem', 'Ilmoita ongelmasta'),
      html: '<form class="form" data-form="source-report" novalidate><div class="fgroup"><label class="h3" for="rp">' + esc(tr('What is wrong or out of date?', 'Mikä on virheellistä tai vanhentunutta?')) + '</label>' +
        '<textarea class="textarea" id="rp" name="msg" maxlength="600" aria-describedby="h-rp"></textarea><p class="err" id="e-rp" hidden></p>' +
        '<p class="fnote" id="h-rp">' + esc(tr('Your report is saved privately. This demo has no review team yet, so you will not get a reply. Please do not include health details or personal information.', 'Ilmoituksesi tallennetaan yksityisesti. Demossa ei ole vielä tarkistajia, joten et saa vastausta. Älä kirjoita terveystietoja tai henkilötietoja.')) + '</p></div>' +
        '<div class="stack"><button class="btn primary block" type="submit">' + esc(tr('Send', 'Lähetä')) + '</button><button class="btn ghost block" type="button" data-action="sheet-close">' + t('cancel') + '</button></div></form>' });
  };
  A.forms['source-report'] = async function (form) {
    var msg = form.elements.msg.value.trim(), err = A.$('#e-rp', form), btn = A.$('button[type="submit"]', form);
    if (!msg) {
      err.hidden = false; err.textContent = tr('Write a few words about what is wrong.', 'Kirjoita muutama sana siitä, mikä on pielessä.');
      form.elements.msg.focus(); return;
    }
    btn.disabled = true;
    try { await A.api.contentReports.add(msg); }
    catch (error) { btn.disabled = false; err.hidden = false; err.textContent = A.errorText(error); A.announce(err.textContent); return; }
    A.sheet.close(); A.toast(tr('Thanks. Your report is saved.', 'Kiitos. Ilmoituksesi on tallennettu.'));
  };

  function dots(n) {
    return '<div class="progress-steps" aria-hidden="true"><span class="on"></span><span class="' + (n >= 2 ? 'on' : '') + '"></span><span class="' + (n >= 3 ? 'on' : '') + '"></span><span class="' + (n >= 4 ? 'on' : '') + '"></span></div>';
  }
  function langBtn() { return '<button class="nav-btn txt" type="button" id="lang-btn" data-action="lang-cycle" aria-label="Language: English. Change language">' + S.prefs.lang.toUpperCase() + '</button>'; }

  A.actions['stat-info'] = function () {
    A.sheet.open({ title: 'What “1 in 10” means', html: '<div class="stack" style="gap:14px"><p class="body">' + esc(D.STATS_NOTE) + '</p>' +
      '<p class="body">For cancers that are found in one sex, such as breast, prostate, womb, ovary, cervix and testis, the number is for that group. For all the others it is for men and women together, so your own chance may be a little higher or lower.</p>' +
      '<p class="small">I use your sex only to put the most common cancers for you first. Age-specific numbers are not included.</p>' + chips(D.STATS_SRC) + '</div>' });
  };
  A.vh = {
    unreadFirst: unreadFirst, uniq: uniq, chips: chips, tIc: tIc, lead: lead, dataAttrs: dataAttrs, chev: chev, cell: cell, group: group, secH: secH, footer: footer, articleCell: articleCell, tile: tile, askRow: askRow, reminderRow: reminderRow, dots: dots, langBtn: langBtn, checkCard: checkCard,
    // backend content: citations, language, next action and where it goes
    apiLang: apiLang, safeUrl: safeUrl, hostOf: hostOf, langName: langName, retrievedText: retrievedText, cites: cites, srcLinks: srcLinks, askOpen: askOpen, goRequest: goRequest,
    nextCard: nextCard, suggestChips: suggestChips, firstSentences: firstSentences, loadingRow: loadingRow, failedBox: failedBox, statusPill: statusPill, itemsList: itemsList
  };
  V.notfound = function () {
    return { title: 'Not found', large: 'That page is not here', html: '<a class="btn primary" href="#home">Home</a>' };
  };
})();
