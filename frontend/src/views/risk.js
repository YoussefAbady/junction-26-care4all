import { A as C4A } from "../app.js";
import "../styles/risk.css";

/* The risk overview (docs/design-v2.md sections 6 and 11, Appendix A). It mirrors the design's script "care4all risk", but
   nothing is worked out here and no rule table, factor library or weight ships in the app: an AI model on the server writes
   every tag and every reason from the person's answers and from Finnish and European guidance in the database, and this
   module only draws the result (S.risk.assessment.result, a RiskResult). The tier words, the legend, the "how this is worked
   out" points, the gate text and the cancer type and factor names come from A.D.RISK. Every other word is A.tr(en, fi).

   Nothing on this screen reaches browser storage, and the service worker caches none of it. The text the model wrote is
   untrusted: it only goes into the page through A.esc(). */
(function () {
  'use strict';
  const A = C4A, S = A.S, esc = A.esc, ic = A.icon, V = A.views, H = A.vh;
  const T = (en, fi) => A.tr(en, fi);
  const lang = () => (S.prefs.lang === 'fi' ? 'fi' : 'en');           // the backend speaks English and Finnish; Swedish is shown English
  const R = () => A.D.RISK || null;
  const bi = v => (v && typeof v === 'object' ? (v[lang()] || v.en || '') : typeof v === 'string' ? v : '');
  const copy = key => { const r = R(); return r && r.COPY && r.COPY[key] ? bi(r.COPY[key]) : ''; };
  const tierWord = tier => { const r = R(); return r && r.TIERS && r.TIERS[tier] ? bi(r.TIERS[tier]) : ''; };
  const typeName = id => { const r = R(), t = r && r.TYPES && r.TYPES[id]; return t ? bi(t.name) : id; };
  const factorName = key => { const r = R(), f = r && r.FACTORS && r.FACTORS[key]; return f ? bi(f.name) : key; };
  const TIERS = ['high', 'raised', 'average', 'unknown'];
  const tierOf = value => (TIERS.includes(value) ? value : 'unknown');
  const chev = () => H.chev();

  /* ---------- state ---------- */
  /* { loaded, enabled, ready, assessment }: what GET /api/risk last said. integrate loads it at start-up (A.risk.load()). */
  const blank = () => ({ loaded: false, enabled: false, ready: false, assessment: null });
  S.risk = S.risk && typeof S.risk === 'object' ? Object.assign(S.risk, blank()) : blank();
  const ui = { gen: 0, loading: null, running: false, failed: '', timer: 0 };

  function reset() {
    ui.gen += 1; ui.loading = null; ui.running = false; ui.failed = '';
    clearTimeout(ui.timer); ui.timer = 0;
    Object.assign(S.risk, blank());
  }
  if (A.resetters) A.resetters.push(reset);

  /* ---------- reading the result ---------- */
  const assessment = () => S.risk.assessment || null;
  const result = () => { const a = assessment(); return a && a.status === 'complete' && a.result && Array.isArray(a.result.items) ? a.result : null; };
  const item = id => { const r = result(); return r ? r.items.find(it => it.cancer === id) || null : null; };
  const httpsUrl = url => { try { const u = new URL(url); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  const retrieved = () => {
    const ts = Date.parse(String(A.contentRetrieved || '') + 'T12:00:00Z');
    return Number.isNaN(ts) ? '' : T('retrieved ', 'haettu ') + A.fmtDate(ts);
  };
  const dateText = iso => { const ms = Date.parse(iso); return Number.isNaN(ms) ? '' : A.fmtDate(ms); };
  const uniq = list => [...new Set(list || [])];

  /* ---------- talking to the server ---------- */
  function apply(res) {
    const r = res || {};
    Object.assign(S.risk, { loaded: true, enabled: !!r.enabled, ready: !!r.ready, assessment: r.assessment || null });
    return S.risk;
  }
  /* Reads GET /api/risk. Several callers share one request. */
  function load() {
    if (!S.account) return Promise.resolve(S.risk);
    if (ui.loading) return ui.loading;
    const gen = ui.gen;
    ui.loading = A.api.risk.get().then(res => { if (gen === ui.gen) apply(res); return S.risk; }).finally(() => { if (gen === ui.gen) ui.loading = null; });
    return ui.loading;
  }
  /* Starts a run (the person has agreed on screen) and answers with the new assessment, or null when the model is off. */
  async function run() {
    const gen = ui.gen;
    const res = await A.api.risk.run({ language: lang() });
    if (gen !== ui.gen) return null;
    if (res && res.error === 'unavailable') { Object.assign(S.risk, { loaded: true, enabled: false }); return null; }
    if (res && res.assessment) Object.assign(S.risk, { loaded: true, enabled: true, ready: true, assessment: res.assessment });
    return res ? res.assessment || null : null;
  }

  /* ---------- polling: only while the screen is open and the page is visible ---------- */
  const running = () => { const a = assessment(); return !!a && a.status === 'running'; };
  const onScreen = () => location.hash === '#risk' && !!S.account;
  const stopPoll = () => { clearTimeout(ui.timer); ui.timer = 0; };
  const signature = () => { const a = assessment(); return a ? [a.status, a.progress && a.progress.done, a.progress && a.progress.total, a.stale, a.completedAt].join('|') : ''; };
  function schedule() {
    if (ui.timer || !running() || !onScreen() || document.hidden) return;
    const gen = ui.gen;
    ui.timer = setTimeout(async () => {
      ui.timer = 0;
      if (gen !== ui.gen || !running() || !onScreen() || document.hidden) return;
      const before = signature(), was = running();
      try { await load(); } catch (error) {
        if (error && error.code === 'expired') { signInAgain(error); return; }
        ui.failed = A.errorText(error);
      }
      if (gen !== ui.gen) return;
      if (signature() !== before || ui.failed) { repaint(); }
      if (was && !running()) done();
      schedule();
    }, 2000);
  }
  function done() {
    const a = assessment();
    if (a && a.status === 'complete') A.announce(T('Your risk overview is ready.', 'Riskikatsauksesi on valmis.'));
    if (A.svc && A.svc.loadNext) A.svc.loadNext().then(() => repaint(), () => { /* the next step stays as it was */ });
  }
  function signInAgain(error) {
    if (A.conv && A.conv.signInAgain) A.conv.signInAgain(error); else A.fail(error);
  }
  function repaint() {
    const cur = A.current();
    if (cur && cur.name === 'risk') A.refresh();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopPoll(); return; }
    if (onScreen() && running()) load().then(() => { repaint(); schedule(); }, () => { schedule(); });
  });
  window.addEventListener('hashchange', () => { if (location.hash !== '#risk') stopPoll(); else schedule(); });

  /* ---------- the public API (A.risk) ---------- */
  const risk = A.risk = {
    ready: () => !!S.risk.ready,
    enabled: () => !!S.risk.enabled && !!R(),
    assessment, result, load, run,
    /* The tag of one cancer type, or '' when there is none to show (no result, or the type needs more answers). */
    tier(id) { const it = item(id); return it && it.tier !== 'unknown' && TIERS.includes(it.tier) ? it.tier : ''; },
    tag(tier, label) { const t = tierOf(tier); return '<span class="rtag ' + t + '">' + esc(label || tierWord(t)) + '</span>'; },
    /* A small round badge on the corner of a cancer type's icon. It is decoration: the words come from risk.sr(). */
    dot(id) { const t = risk.tier(id); return t ? badge(t) : ''; },
    sr(id) { const t = risk.tier(id); return t ? '<span class="sr">' + esc(T('Your risk: ', 'Riskisi: ') + tierWord(t) + '.') + '</span>' : ''; },
    /* A small, expandable tag for the top of a cancer page. */
    strip(id) {
      const it = item(id);
      if (!it) return '';
      const label = T('Your risk', 'Riskisi');
      return '<section class="rk-strip" data-t="' + esc(id) + '" aria-label="' + esc(label) + '">' + itemHtml(it, 'rkt-' + id, label, true) + '</section>';
    },
    /* A one-card summary for Home and the end of the questions. */
    card() {
      const r = result();
      if (!r) return '';
      const o = r.overall, tier = tierOf(o.tier);
      return '<a class="rk-card" href="#risk" data-tier="' + tier + '"><span class="rk-ic" aria-hidden="true">' + ic('shield', 24) + '</span><span class="cell-b"><span class="cap">' + esc(T('Your risk overview', 'Riskikatsauksesi')) + '</span>' +
        '<span class="t-name">' + esc(T('Overall', 'Kokonaisuus')) + ' ' + risk.tag(tier) + '</span><span class="t-blurb">' + esc(o.line) + ' ' + esc(T('Tap to see why.', 'Napauta nähdäksesi perustelut.')) + '</span></span>' + chev() + '</a>';
    },
    /* The overall tag, directly under the person's name on Home. */
    userTag() {
      if (!S.profile || !R()) return '';
      const r = result();
      if (r) {
        const tier = tierOf(r.overall.tier), word = tierWord(tier);
        return '<a class="rk-under" data-tier="' + tier + '" href="#risk" aria-label="' + esc(T('Overall risk: ', 'Kokonaisriski: ') + word + '. ' + T('Tap to see why', 'Napauta nähdäksesi perustelut')) + '"><span class="rk-ui" aria-hidden="true">' + ic('shield', 16) +
          '</span><span class="rk-ut">' + esc(T('Overall risk', 'Kokonaisriski')) + '</span>' + risk.tag(tier) + chev() + '</a>';
      }
      if (!S.risk.enabled && !assessment()) return '';
      const label = running() ? T('Working it out', 'Työstetään') : T('Not assessed yet', 'Ei vielä arvioitu');
      return '<a class="rk-under off" href="#risk"><span class="rk-ui" aria-hidden="true">' + ic('shield', 16) + '</span><span class="rk-ut">' + esc(T('Risk overview', 'Riskikatsaus')) + '</span>' + risk.tag('unknown', label) + chev() + '</a>';
    },
    /* Under the list of the most common cancers: what the small badges mean. */
    legend() {
      const text = copy('legend');
      if (!result() || !text) return '';
      return '<p class="small rk-legend"><a href="#risk">' + esc(text) + '</a> ' + ['average', 'raised', 'high'].map(t => badge(t) + ' ' + esc(tierWord(t))).join(', ') + '</p>';
    }
  };

  const GLYPH = { high: '<path d="M12 6.5v7"/><circle cx="12" cy="17.4" r="1.1" fill="currentColor" stroke="none"/>', raised: '<path d="M7 14.5l5-5 5 5"/>', average: '<path d="M7 12.6l3.2 3.2L17 9"/>' };
  const badge = t => '<span class="rk-d ' + t + '" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + GLYPH[t] + '</svg></span>';

  /* ---------- pieces ---------- */
  const openKey = key => !!(A.ui && A.ui.open && A.ui.open[key]);
  const shortOrg = o => {
    if (/Käypä hoito/.test(o)) return 'Käypä hoito';
    if (/Cancer Society of Finland/.test(o)) return 'Cancer Society of Finland';
    if (/Duodecim/.test(o)) return 'Duodecim';
    return String(o || '').replace(/\s*\(.*\)$/, '');
  };
  /* Source links: https only, each with the date the content was retrieved. Unknown ids are left out. */
  function srcLinks(ids) {
    const D = A.D, list = uniq(ids).filter(id => D.SOURCES && D.SOURCES[id] && httpsUrl(D.SOURCES[id].url));
    if (!list.length) return '';
    const when = retrieved();
    const labels = list.map(id => {
      const x = D.SOURCES[id], yr = String(x.date || '').match(/(20\d\d)(?!.*20\d\d)/);
      return shortOrg(x.org) + (yr ? ' ' + yr[1] : '');
    });
    return '<div class="rk-srcs">' + list.map((id, i) => {
      const x = D.SOURCES[id];
      let label = labels[i];
      if (labels.indexOf(label) !== labels.lastIndexOf(label)) label += ' · ' + String(x.name || '').replace(/^[^:]*:\s*/, '').replace(/\s*\(.*\)\s*$/, '').split(' ').slice(0, 2).join(' ');
      return '<a class="rk-src" href="' + esc(httpsUrl(x.url)) + '" target="_blank" rel="noopener noreferrer" title="' + esc(x.name) + '"><span class="rk-sl"><span>' + esc(label) + '</span>' +
        (when ? '<small>' + esc(when) + '</small>' : '') + '</span>' + ic('ext', 12) + '<span class="sr">' + esc(T('Opens in a new tab', 'Avautuu uudessa välilehdessä')) + '</span></a>';
    }).join('') + '</div>';
  }

  function bodyHtml(it, strip) {
    const findings = Array.isArray(it.findings) ? it.findings : [];
    const by = d => findings.filter(f => f.direction === d);
    const fact = (f, cls) => '<div class="rk-f ' + cls + '"><span class="rk-dot" aria-hidden="true"></span><div class="rk-fb"><b>' + esc(f.title) + '</b>' + (f.text ? '<p>' + esc(f.text) + '</p>' : '') + srcLinks(f.sources) + '</div></div>';
    let h = '<div class="rk-b"><p class="rk-why"><b>' + esc(it.why) + '</b></p>' +
      '<p class="small rk-basis">' + (it.limited ? esc(T('Too few of the factors that matter were answered, so this is “average so far”. ', 'Tärkeistä tekijöistä on vastattu liian harvaan, joten tämä on “keskimääräinen toistaiseksi”. ')) : '') + esc(copy('compare')) + '</p>';
    const up = by('up'), down = by('down'), none = by('none'), info = by('info');
    if (up.length) h += '<p class="cap">' + esc(T('What raises it for you', 'Mikä nostaa sitä sinulla')) + '</p><div class="rk-list">' + up.map(f => fact(f, 'r-up')).join('') + '</div>';
    if (down.length) h += '<p class="cap">' + esc(T('What lowers it for you', 'Mikä laskee sitä sinulla')) + '</p><div class="rk-list">' + down.map(f => fact(f, 'r-down')).join('') + '</div>';
    if (none.length) h += '<p class="cap">' + esc(T('Not a factor for you', 'Ei sinulla tekijä')) + '</p><ul class="rk-n">' + none.map(f => '<li>' + esc(f.title) + '</li>').join('') + '</ul>';
    if (info.length) h += '<p class="cap">' + esc(T('Good to know', 'Hyvä tietää')) + '</p><div class="rk-list">' + info.map(f => fact(f, 'r-info')).join('') + '</div>';
    if (it.limited) h += '<div class="btn-row"><a class="btn sm tint" href="#interview">' + esc(T('Review my answers', 'Tarkista vastaukseni')) + '</a></div>';
    if (Array.isArray(it.tips) && it.tips.length) h += '<p class="cap">' + esc(T('What can help', 'Mikä voi auttaa')) + '</p><ul class="rk-n tips">' + it.tips.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>';
    if (Array.isArray(it.notCovered) && it.notCovered.length) {
      h += '<p class="small rk-not"><b>' + esc(T('Not covered by my questions:', 'Kysymykseni eivät kata:')) + '</b> ' + esc(it.notCovered.join('; ')) + '. ' + esc(T('Your doctor can look at these with you.', 'Lääkäri voi käydä nämä läpi kanssasi.')) + '</p>';
    }
    if (!strip && A.D.TOPICS && A.D.TOPICS[it.cancer]) h += '<div class="btn-row"><a class="btn sm tint" href="#t-' + esc(it.cancer) + '">' + esc(T('About ', 'Lisätietoa: ') + typeName(it.cancer).toLowerCase()) + '</a></div>';
    return h + '</div>';
  }
  function itemHtml(it, key, label, strip) {
    const open = openKey(key), tier = tierOf(it.tier), name = label || typeName(it.cancer);
    const tagLabel = it.limited && tier === 'average' ? T('Average so far', 'Keskimääräinen toistaiseksi') : null;
    return '<div class="acc rk-item' + (open ? ' open' : '') + '" id="' + esc(key) + '" data-tier="' + tier + '">' +
      '<button class="rk-h" type="button" aria-expanded="' + open + '" data-action="acc" data-id="' + esc(key) + '" aria-label="' + esc(name + ': ' + (tagLabel || tierWord(tier)) + '. ' + T('Tap to see why', 'Napauta nähdäksesi perustelut')) + '">' +
      '<span class="ic" data-t="' + esc(it.cancer) + '" aria-hidden="true">' + A.organ(it.cancer, 22) + '</span>' +
      '<span class="rk-t"><b>' + esc(name) + '</b><small>' + esc(it.brief) + '</small></span>' + risk.tag(tier, tagLabel) + chev() + '</button>' +
      '<div class="acc-b"><div>' + bodyHtml(it, strip) + '</div></div></div>';
  }

  function countLine(items) {
    const c = { high: 0, raised: 0, average: 0, unknown: 0 };
    items.forEach(it => { c[tierOf(it.tier)] += 1; });
    return TIERS.filter(t => c[t]).map(t => c[t] + ' ' + tierWord(t)).join(' · ');
  }
  function overallHtml(r) {
    const o = r.overall, open = openKey('rk-overall'), tier = tierOf(o.tier), counts = countLine(r.items);
    let h = '<div class="acc rk-item rk-ov' + (open ? ' open' : '') + '" id="rk-overall" data-tier="' + tier + '"><button class="rk-h" type="button" aria-expanded="' + open + '" data-action="acc" data-id="rk-overall" aria-label="' + esc(T('Overall risk: ', 'Kokonaisriski: ') + tierWord(tier) + '. ' + T('Tap to see why', 'Napauta nähdäksesi perustelut')) + '">' +
      '<span class="rk-big" aria-hidden="true">' + ic('shield', 26) + '</span><span class="rk-t"><b>' + esc(T('Overall', 'Kokonaisuus')) + '</b><small>' + esc(counts) + '</small></span>' + risk.tag(tier) + chev() + '</button>' +
      '<div class="acc-b"><div><div class="rk-b"><p class="rk-why"><b>' + esc(o.line) + '</b></p><p class="small rk-basis">' + esc(o.basis) + '</p>';
    const drivers = (o.drivers || []).filter(d => d && d.factor);
    if (drivers.length) {
      h += '<p class="cap">' + esc(T('What moves it most', 'Mikä vaikuttaa siihen eniten')) + '</p><ul class="rk-n tips">' +
        drivers.slice(0, 5).map(d => '<li><b>' + esc(factorName(d.factor)) + '</b>: ' + esc((d.cancers || []).map(typeName).join(', ')) + '.</li>').join('') + '</ul>';
    }
    const fin = R() && R().IN_FINLAND;
    if (fin && bi(fin.text)) h += '<p class="cap">' + esc(T('In Finland', 'Suomessa')) + '</p><p class="body">' + esc(bi(fin.text)) + '</p>' + srcLinks(fin.sources);
    return h + '</div></div></div></div>';
  }
  function howHtml() {
    const r = R(), points = [];
    for (let n = 1; copy('how_' + n); n += 1) points.push(copy('how_' + n));
    if (!points.length) return '';
    const open = openKey('rk-how');
    return '<div class="acc rk-item rk-how' + (open ? ' open' : '') + '" id="rk-how"><button class="rk-h plain" type="button" aria-expanded="' + open + '" data-action="acc" data-id="rk-how"><span class="ic k" aria-hidden="true">' + ic('info', 20) + '</span>' +
      '<span class="rk-t"><b>' + esc(copy('how_title') || T('How this is worked out', 'Miten tämä lasketaan')) + '</b><small>' + esc(copy('how_sub')) + '</small></span>' + chev() + '</button>' +
      '<div class="acc-b"><div><div class="rk-b"><ul class="rk-n tips">' + points.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' + srcLinks(r && r.RUBRIC ? r.RUBRIC.sources : []) + '</div></div></div></div>';
  }

  /* ---------- the states of the screen ---------- */
  const consentText = () => copy('how_2');
  function gateHtml() {
    return '<section class="card rk-gate"><span class="rk-ic" aria-hidden="true">' + ic('shield', 24) + '</span><h2 class="h3">' + esc(copy('gate_title')) + '</h2>' +
      '<p class="body">' + esc(copy('gate_body')) + '</p><div class="btn-row"><a class="btn primary" href="#interview">' + esc(T('Go to the questions', 'Siirry kysymyksiin')) + '</a></div></section>';
  }
  function offHtml() {
    return '<section class="card rk-gate" role="status"><span class="rk-ic" aria-hidden="true">' + ic('info', 24) + '</span><h2 class="h3">' + esc(T('The AI model is off', 'Tekoälymalli ei ole käytössä')) + '</h2>' +
      '<p class="body">' + esc(T('Your risk overview is written by an AI model, and none is switched on for this app right now. I will not show a made-up rating instead, and nothing is sent anywhere. Your answers stay saved.',
        'Riskikatsauksesi kirjoittaa tekoälymalli, eikä mitään mallia ole nyt kytketty päälle. En näytä sen tilalla keksittyä arviota, eikä mitään lähetetä minnekään. Vastauksesi pysyvät tallessa.')) + '</p>' +
      '<div class="btn-row"><a class="btn tint" href="#home">' + esc(T('Back to home', 'Takaisin etusivulle')) + '</a></div></section>';
  }
  function startHtml(again) {
    return '<section class="card rk-gate"><span class="rk-ic" aria-hidden="true">' + ic('shield', 24) + '</span><h2 class="h3">' + esc(again ? T('Try again', 'Yritä uudelleen') : T('Ready when you are', 'Valmis, kun sinäkin olet')) + '</h2>' +
      '<p class="body">' + esc(T('You have answered the questions. I can now work out your risk overview.', 'Olet vastannut kysymyksiin. Voin nyt laatia riskikatsauksesi.')) + '</p>' +
      '<p class="small">' + esc(consentText()) + '</p><div class="btn-row"><button class="btn primary" type="button" data-action="rk-run">' + esc(T('Yes, work out my overview', 'Kyllä, laadi katsaukseni')) + '</button></div></section>';
  }
  const STEPS = () => {
    const a = assessment(), p = a && a.progress ? a.progress : null;
    return p && p.total > 0 ? { done: Math.max(0, Math.min(p.done, p.total)), total: p.total } : { done: 0, total: 0 };
  };
  function runningHtml() {
    const p = STEPS();
    const text = !p.total || p.done === 0 ? T('Reading your answers', 'Luetaan vastauksiasi')
      : p.done >= p.total ? T('Checking the overall level against the guidance', 'Tarkistetaan kokonaistasoa ohjeistusta vasten')
        : T('Checking Finnish and European guidance', 'Tarkistetaan suomalaista ja eurooppalaista ohjeistusta');
    const pct = p.total ? Math.round(p.done / p.total * 100) : 0;
    return '<section class="card rk-run" role="status" aria-live="polite"><span class="rk-ic" aria-hidden="true">' + ic('shield', 24) + '</span><h2 class="h3">' + esc(text) + '</h2>' +
      (p.total ? '<p class="small">' + esc(T('Step ' + p.done + ' of ' + p.total, 'Vaihe ' + p.done + ' / ' + p.total)) + '</p>' : '<span class="dots" role="img" aria-label="' + esc(text) + '"><i></i><i></i><i></i></span>') +
      '<div class="rk-prog" role="progressbar" aria-label="' + esc(T('Progress', 'Edistyminen')) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<p class="small">' + esc(T('This can take a minute or two. You can leave this page: it keeps working on the server.', 'Tähän voi mennä minuutti tai pari. Voit poistua sivulta: työ jatkuu palvelimella.')) + '</p></section>';
  }
  function failedHtml() {
    const a = assessment(), why = a && a.failure === 'interrupted'
      ? T('It was interrupted before it finished.', 'Se keskeytyi ennen valmistumistaan.')
      : T('Something went wrong while it was being worked out.', 'Laatimisessa tapahtui virhe.');
    return '<section class="card rk-gate" role="alert"><span class="rk-ic" aria-hidden="true">' + ic('info', 24) + '</span><h2 class="h3">' + esc(T('I could not finish your overview', 'En saanut katsaustasi valmiiksi')) + '</h2>' +
      '<p class="body">' + esc(why + ' ' + T('Your answers are saved. You can try again.', 'Vastauksesi ovat tallessa. Voit yrittää uudelleen.')) + '</p>' +
      (S.risk.enabled && S.risk.ready ? '<p class="small">' + esc(consentText()) + '</p><div class="btn-row"><button class="btn primary" type="button" data-action="rk-run">' + esc(T('Try again', 'Yritä uudelleen')) + '</button></div>' : '') + '</section>';
  }
  function staleHtml(r) {
    const a = assessment();
    const mine = a.language !== lang() ? ' ' + T('It is written in ' + (a.language === 'fi' ? 'Finnish' : 'English') + '.', 'Se on kirjoitettu ' + (a.language === 'fi' ? 'suomeksi' : 'englanniksi') + '.') : '';
    if (!a.stale && !mine) return '';
    const text = a.stale ? T('Your answers or the guidance changed after this was worked out.', 'Vastauksesi tai ohjeistus muuttui sen jälkeen, kun tämä laadittiin.') + mine : mine.trim();
    const action = !S.risk.enabled ? '' : S.risk.ready ? '<button class="btn sm tint" type="button" data-action="rk-rerun">' + esc(T('Run again', 'Laadi uudelleen')) + '</button>'
      : '<a class="btn sm tint" href="#interview">' + esc(T('Finish the questions', 'Viimeistele kysymykset')) + '</a>';
    return '<section class="rk-banner" role="status"><span>' + esc(text) + '</span>' + (action ? '<div class="btn-row">' + action + '</div>' : '') + '</section>';
  }
  function resultHtml(r) {
    const a = assessment();
    let h = '<p class="lede" style="margin-top:-14px">' + esc(copy('lede')) + '</p>' + staleHtml(r) +
      '<section class="rk-note" role="note">' + ic('lock', 16) + '<span>' + esc(copy('note')) + (a.completedAt ? ' ' + esc(T('Worked out on ', 'Laadittu ') + dateText(a.completedAt) + '.') : '') + '</span></section>' +
      (r.audited === false ? '<p class="small rk-basis">' + esc(T('The second pass that checks these tags against the guidance did not finish, so please read them with care.', 'Toinen vaihe, joka tarkistaa nämä tasot ohjeistusta vasten, ei valmistunut, joten lue ne harkiten.')) + '</p>' : '') +
      overallHtml(r) + '<div class="sec-h"><h2 class="h2">' + esc(T('By cancer type', 'Syöpätyypeittäin')) + '</h2></div><div class="rk-grid">' + r.items.map(it => itemHtml(it, 'rk-' + it.cancer)).join('') + '</div>';
    if (Array.isArray(r.skipped) && r.skipped.length && copy('skipped')) h += '<p class="small rk-skip">' + esc(copy('skipped')) + '</p><div class="btn-row"><a class="btn sm tint" href="#you">' + esc(T('Check my basic answers', 'Tarkista perustietoni')) + '</a></div>';
    const cells = [
      H.cell({ href: '#interview', lead: H.lead('chat', 'b'), title: T('Review my answers', 'Tarkista vastaukseni'), detail: T('See the questions I asked and your answers.', 'Katso kysymykseni ja vastauksesi.') })
    ];
    if (S.risk.enabled && S.risk.ready) cells.push(H.cell({ action: 'rk-rerun', lead: H.lead('repeat', 'g'), title: T('Run it again', 'Laadi uudelleen'), detail: T('Work out the tags again from your current answers.', 'Laadi tasot uudelleen nykyisistä vastauksistasi.') }));
    cells.push(H.cell({ href: '#talk', lead: H.lead('heart', 'r'), title: T('Talk about a symptom', 'Keskustele oireesta'), detail: T('Tags are about risk. A symptom is a different question, and worth checking whatever your tag.', 'Tasot kertovat riskistä. Oire on eri kysymys, ja se kannattaa tarkistaa tasostasi riippumatta.') }));
    return h + '<div class="sec-h"><h2 class="h2">' + esc(T('Make it more accurate', 'Tarkenna arviota')) + '</h2></div>' + H.group(cells, 'i') + howHtml();
  }

  V.risk = function () {
    const title = T('Risk overview', 'Riskikatsaus'), large = T('Your risk overview', 'Riskikatsauksesi');
    const out = {
      title, large,
      onShow() {
        if (!S.risk.loaded) { const gen = ui.gen; load().then(() => { if (gen === ui.gen) { repaint(); schedule(); } }, error => { if (error && error.code === 'expired') signInAgain(error); else { ui.failed = A.errorText(error); repaint(); } }); }
        else { load().then(() => { repaint(); schedule(); }, () => { /* the screen shows what it has */ }); schedule(); }
      }
    };
    let h;
    const r = result(), a = assessment();
    if (!R() || !copy('lede')) h = offHtml();
    else if (!S.risk.loaded) h = ui.failed ? '<p class="err" role="alert">' + esc(ui.failed) + '</p>' : '<div class="msg-ai" role="status"><span class="dots" role="img" aria-label="' + esc(T('Loading', 'Ladataan')) + '"><i></i><i></i><i></i></span></div>';
    else if (a && a.status === 'running') h = runningHtml();
    else if (r) h = resultHtml(r);
    else if (a && a.status === 'failed') h = failedHtml();
    else if (!S.risk.enabled) h = offHtml();
    else if (!S.risk.ready) h = gateHtml();
    else h = startHtml(false);
    out.html = h + H.footer();
    return out;
  };

  /* ---------- actions ---------- */
  let busy = false;
  async function start() {
    if (busy) return;
    busy = true;
    try {
      const a = await run();
      if (!a && !S.risk.enabled) A.toast(T('The AI model is off, so I cannot work out your overview.', 'Tekoälymalli ei ole käytössä, joten en voi laatia katsaustasi.'));
    } catch (error) {
      if (error && error.code === 'expired') signInAgain(error);
      else if (error && error.code === 'interview') { S.risk.ready = false; A.toast(T('Finish the questions first.', 'Vastaa ensin kysymyksiin.')); }
      else if (error && error.code === 'limited') A.toast(T('You have run this a few times already. Try again in a while.', 'Olet laatinut tämän jo useita kertoja. Yritä myöhemmin uudelleen.'), 5500);
      else A.fail(error);
    } finally { busy = false; }
    ui.failed = '';
    repaint();
    schedule();
  }
  A.actions['rk-run'] = () => { start(); };
  /* A run started from a finished overview says what is sent first: the same text as the first run. */
  A.actions['rk-rerun'] = () => {
    if (!S.risk.enabled || !S.risk.ready) return;
    A.open.action({
      title: T('Run it again?', 'Laaditaanko uudelleen?'), message: consentText(),
      actions: [{ label: T('Yes, run it again', 'Kyllä, laadi uudelleen'), run: () => { start(); } }]
    });
  };
  A.actions['risk-open'] = () => A.go('risk');
})();
