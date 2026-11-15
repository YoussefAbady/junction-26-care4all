import { A as C4A } from "./app.js";
import { registerServiceWorker } from "./pwa.js";
import { NOTICE, NOTICE_INTRO } from "./privacy-copy.js";

/* care4all ui: the shell. Boot, navigation stack, tab bar, sheets, gestures, actions, reminders. Everything personal
   is read from A.S and changed through A.svc (src/state), which keeps the account on the server up to date. */
(function () {
  'use strict';
  var A = C4A, D = A.D, S = A.S, V = A.views, $ = A.$, $$ = A.$$, esc = A.esc, t = A.t, tr = A.tr, ic = A.icon;
  var stackEl, appEl, liveEl, toastsEl, sheetRoot;
  var LANG_NAMES = A.LANG_NAMES;
  var TAB_ROOTS = { home: 1, me: 1 };
  /* Screens that start a navigation stack of their own. Every other screen is pushed on top of one of them. */
  var ROOTS = { home: 1, me: 1, welcome: 1, about: 1, plan: 1, unavailable: 1 };
  /* interview and risk are the AI questions and the risk overview (views/interview.js, views/risk.js). They are behind the sign-in like every route that is not in PUBLIC. */
  var NAMED = { welcome: 1, signin: 1, signup: 1, about: 1, plan: 1, home: 1, learn: 1, ask: 1, reminders: 1, sources: 1, me: 1, edit: 1, notes: 1, privacy: 1, you: 1, interview: 1, risk: 1, next: 1, checks: 1, scans: 1, national: 1, talk: 1, symptom: 1, results: 1, unavailable: 1 };
  /* Open to a signed-out visitor. Signed in without a profile, only "about" opens. Everything else needs the profile too. */
  var PUBLIC = { welcome: 1, signin: 1, signup: 1, privacy: 1, sources: 1 };
  var nav = { stack: [], pushed: 0, instant: false, pendingScroll: null };
  var wanted = '';   // the route to open again once the server answers

  /* ---------- helpers ---------- */
  A.announce = function (msg) {
    if (!liveEl) return;
    liveEl.textContent = '';
    setTimeout(function () { liveEl.textContent = msg; }, 30);
  };
  /* A very light tap, on phones that can do it, for the main controls. Never when animations are off or the device asks for reduced motion. */
  A.haptic = function (ms) { try { if (navigator.vibrate && !A.reduceMotion()) navigator.vibrate(ms || 8); } catch (e) { /* ignore */ } };
  A.tap = function () { A.haptic(6); };
  A.toast = function (msg, ms) {
    if (!toastsEl) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastsEl.appendChild(el);
    while (toastsEl.children.length > 2) toastsEl.removeChild(toastsEl.firstChild);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, A.reduceMotion() ? 0 : 250);
    }, ms || 3600);
  };
  function copyText(text) {
    return new Promise(function (resolve) {
      function fallback() {
        var prev = document.activeElement;
        try {
          var ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px;top:0';
          document.body.appendChild(ta); ta.select();
          var ok = document.execCommand && document.execCommand('copy');
          document.body.removeChild(ta);
          if (prev && prev.focus) prev.focus();
          resolve(!!ok);
        } catch (e) { resolve(false); }
      }
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { resolve(true); }, fallback); return; } } catch (e) { /* fall through */ }
      fallback();
    });
  }
  function doCopy(text, okMsg) {
    copyText(text).then(function (ok) {
      A.toast(ok ? (okMsg || tr('Copied.', 'Kopioitu.', 'Kopierat.')) : tr('Could not copy. Select the text and copy it.', 'Kopiointi ei onnistunut. Valitse teksti ja kopioi se.', 'Det gick inte att kopiera. Markera texten och kopiera den.'));
    });
  }
  function field(form, name) { return form.elements[name]; }
  function checked(form, name) { return $$('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; }); }
  function showErr(form, id, msg, input) {
    var p = $('#' + id, form);
    if (p) { p.textContent = msg; p.hidden = false; }
    if (input) { input.setAttribute('aria-invalid', 'true'); var c = input.closest('.cell.field'); if (c) c.setAttribute('data-invalid', ''); }
  }
  function clearErrs(form) {
    $$('.err', form).forEach(function (p) { p.hidden = true; p.textContent = ''; });
    $$('[aria-invalid]', form).forEach(function (i) { i.removeAttribute('aria-invalid'); });
    $$('[data-invalid]', form).forEach(function (i) { i.removeAttribute('data-invalid'); });
  }
  /* A form that waits for the server accepts no second submit, and its button says it is busy. */
  function setPending(form, on) {
    if (on) form.setAttribute('data-pending', ''); else form.removeAttribute('data-pending');
    $$('button[type="submit"]', form).forEach(function (b) {
      b.disabled = !!on;
      if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy');
    });
  }
  function actionBtn(label, action, extra, cls) {
    return '<button class="btn ' + (cls || '') + '" type="button" data-action="' + action + '"' + (extra || '') + '>' + label + '</button>';
  }
  /* One option row of a radio or checkbox group. extra is added to the input, for example ' required'. */
  function opt(type, name, value, label, sub, isChecked, extra) {
    return '<label class="opt"><input type="' + type + '" name="' + name + '" value="' + value + '"' + (isChecked ? ' checked' : '') + (extra || '') + '><span class="o-b"><span>' + esc(label) + '</span>' + (sub ? '<span class="o-s">' + esc(sub) + '</span>' : '') + '</span><span class="mark">' + ic('check', 14) + '</span></label>';
  }
  /* Form helpers for the account screens (views/account.js), which load before this file. */
  A.formUi = { field: field, checked: checked, showErr: showErr, clearErrs: clearErrs, setPending: setPending, opt: opt };

  /* ---------- display preferences ----------
     Language, text size, plain language and animations are saved on the account and on this device. The skin tone
     stays on this device. Writes are queued so the last choice is always the one the account ends up with. */
  function applyPrefs() {
    var h = document.documentElement;
    if (S.prefs.scale > 0) h.setAttribute('data-scale', String(S.prefs.scale)); else h.removeAttribute('data-scale');
    h.setAttribute('data-motion', S.prefs.motion === false ? 'off' : 'on');
    h.setAttribute('data-skin', String(S.prefs.skin || 1));
    h.lang = S.prefs.lang;
  }
  A.applyPrefs = applyPrefs;
  var prefWrites = Promise.resolve();
  function savePrefs(deviceOnly) {
    A.save('prefs');
    if (deviceOnly || bootFailed()) return;   // never overwrite an account that could not be loaded
    prefWrites = prefWrites.catch(function () { /* the next write carries the latest choices */ }).then(function () { return A.svc.savePrefs(); });
    prefWrites.catch(function (error) { A.fail(error); });
  }
  /* Changes one display preference everywhere: the page, this device and the account. */
  function setPref(key, value) {
    S.prefs[key] = value;
    applyPrefs();
    savePrefs(key === 'skin');
  }
  A.setPref = setPref;

  /* ---------- animation helper (Web Animations; instant when unsupported or reduced) ---------- */
  function anim(el, frames, opts) {
    if (!el || !el.animate || A.reduceMotion()) return Promise.resolve();
    var a;
    try { a = el.animate(frames, Object.assign({ duration: 400, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'both' }, opts || {})); } catch (e) { return Promise.resolve(); }
    return a.finished.then(function () { try { a.cancel(); } catch (e) { /* ignore */ } }, function () { /* cancelled */ });
  }
  /* The content of a screen arrives with a short stagger, the first time the screen is shown (.screen.enter in app.css). The
     class goes again before anything can be drawn a second time: a screen that is redrawn at once would otherwise play it twice. */
  function enterFx(s) {
    if (!s || A.reduceMotion()) return;
    s.el.classList.add('enter');
    setTimeout(function () { s.el.classList.remove('enter'); }, 950);
  }

  /* ---------- screens ----------
     Where a person may be depends on the account: signed out, signed in without a profile, or signed in with one. */
  function stage() { return !S.account ? 'out' : !S.profile ? 'new' : 'in'; }
  function startFor(st) { return st === 'out' ? 'welcome' : st === 'new' ? 'about' : 'home'; }
  /* True when the server could not be reached or the account could not be read. A failed read must never be
     mistaken for "no profile yet", or the profile form would offer to overwrite the saved one. */
  function bootFailed() { return !!S.bootError && S.bootError !== 'expired'; }
  function parse(hash) {
    var n = String(hash || '').replace(/^#/, '') || startFor(stage()), m;
    if (n === 'topics' || n === 'cancers') n = 'learn';
    if (n === 'screening') n = 'national';
    if (n === 'consent') n = 'signup';
    if ((m = /^t-([a-z]+)$/.exec(n))) return { view: 'topic', arg: m[1], name: n };
    if ((m = /^a-([a-z-]+)$/.exec(n))) return { view: 'article', arg: m[1], name: n };
    if ((m = /^how-([a-z]+)$/.exec(n)) && D.JOURNEYS && D.JOURNEYS[m[1]]) return { view: 'how', arg: m[1], name: n };
    if ((m = /^chk-([a-z]+)$/.exec(n)) && D.TOPICS[m[1]] && D.TOPICS[m[1]].check) return { view: 'check', arg: m[1], name: n };
    if (NAMED[n]) return { view: n, name: n };
    return { view: 'notfound', name: n };
  }
  function silentGo(name) {
    try { history.replaceState(null, '', '#' + name); } catch (e) { location.hash = '#' + name; }
    return parse('#' + name);
  }
  /* The route to open instead of r, or null when r is fine as it is. */
  function gate(r) {
    var st = stage(), v = r.view;
    if (bootFailed()) { if (v !== 'unavailable') wanted = r.name; return v === 'unavailable' ? null : 'unavailable'; }
    if (v === 'unavailable') return startFor(st);
    if (st === 'out') return PUBLIC[v] ? null : 'welcome';
    if (st === 'new') return v === 'about' ? null : 'about';
    return (v === 'welcome' || v === 'signin' || v === 'signup' || v === 'about') ? 'home' : null;
  }
  function guard(r) {
    var to = gate(r);
    return to ? silentGo(to) : r;
  }
  function rootFor(r) {
    if (ROOTS[r.view]) return r;
    if (r.view === 'signin' || r.view === 'signup' || !S.account) return parse('#welcome');
    var m = { reminders: 'me', me: 'me', edit: 'me', notes: 'me', sources: 'me', privacy: 'me', results: 'me' };
    return parse('#' + (m[r.view] || 'home'));
  }
  function top() { return nav.stack[nav.stack.length - 1]; }
  function shortTitle(s) { return s.out.navTitle || s.out.title; }

  function onScrollFor(s) {
    var sc = s.sc, navEl = s.navEl, out = s.out, at = out.navAt || (out.large ? 44 : 24);
    return function () {
      var y = sc.scrollTop;
      if (y > at) navEl.setAttribute('data-solid', ''); else navEl.removeAttribute('data-solid');
      if (y > at && !navEl.hasAttribute('data-fit')) {
        navEl.setAttribute('data-fit', '');
        var bk = navEl.querySelector('.nav-btn.back'), tt = navEl.querySelector('.nav-title');
        if (bk && tt && bk.getBoundingClientRect().right > tt.getBoundingClientRect().left - 6) navEl.setAttribute('data-tight', '');
      }
      if (out.progress) {
        var max = sc.scrollHeight - sc.clientHeight;
        navEl.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(3) : '0');
        navEl.style.setProperty('--po', y > 20 ? '1' : '0');
      }
    };
  }
  function fill(s) {
    var out = s.out;
    var back = (s.back && !out.noBack) ? '<button class="nav-btn back" type="button" data-action="back" aria-label="' + esc(tr('Back to ', 'Takaisin: ', 'Tillbaka till ') + s.back) + '">' + ic('chev-l', 22) + '<span>' + esc(s.back) + '</span></button>' : '';
    var largeText = out.large === true ? out.title : out.large;
    s.el.setAttribute('aria-label', out.title);
    s.el.innerHTML = '<header class="nav"><div class="nav-l">' + back + '</div><h2 class="nav-title" aria-hidden="true">' + esc(out.navTitle || out.title) + '</h2><div class="nav-r">' + (out.trailing || '') + '</div></header>' +
      '<div class="scroller" tabindex="-1"><div class="content">' + (out.pre || '') + (largeText ? '<h1 class="large" id="h">' + esc(largeText) + '</h1>' : '') + out.html + '</div></div>';
    s.sc = $('.scroller', s.el); s.navEl = $('.nav', s.el);
    var fn = onScrollFor(s);
    s.sc.addEventListener('scroll', fn, { passive: true });
    fn();
    if (out.after) out.after(s.el);
  }
  function build(r, back) {
    var out = (V[r.view] || V.notfound)(r.arg);
    var el = document.createElement('section');
    el.className = 'screen' + (out.hero ? ' hero' : '');
    el.setAttribute('data-name', r.name);
    var s = { name: r.name, r: r, out: out, el: el, back: back };
    fill(s);
    return s;
  }

  /* count-up and reveal effects */
  function runCounts(root) {
    var els = $$('[data-count]', root);
    if (!els.length || A.reduceMotion() || typeof IntersectionObserver === 'undefined') return;
    els.forEach(function (el) { el.textContent = (el.getAttribute('data-prefix') || '') + '0' + (el.getAttribute('data-suffix') || ''); });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); countUp(en.target); } });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      els.forEach(function (el) {
        if (el.getAttribute('data-done')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth) { io.unobserve(el); countUp(el); }
      });
    }, 1600);
  }
  function countUp(el) {
    if (el.getAttribute('data-done')) return;
    el.setAttribute('data-done', '1');
    var n = +el.getAttribute('data-count'), pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '', t0 = null;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / 900), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(n * e) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function runReveal(root) {
    if (A.reduceMotion() || typeof IntersectionObserver === 'undefined') return;
    var els = $$('.rsec', root);
    if (!els.length) return;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el, i) {
      if (i < 2) return;
      el.classList.add('rv');
      io.observe(el);
    });
  }
  function effects(s) { runCounts(s.el); runReveal(s.el); }

  function syncInert() {
    nav.stack.forEach(function (s, i) {
      if (i === nav.stack.length - 1) { s.el.removeAttribute('inert'); s.el.removeAttribute('aria-hidden'); }
      else { s.el.setAttribute('inert', ''); s.el.setAttribute('aria-hidden', 'true'); }
    });
  }
  function chrome() {
    var s0 = nav.stack[0], tp = top();
    var on = stage() === 'in' && !!s0 && !!TAB_ROOTS[s0.name];   // the tab bar belongs to a signed-in person with a profile
    appEl.setAttribute('data-tabs', on ? 'on' : 'off');
    var tb = $('#tabbar');
    if (tb) { if (on) tb.removeAttribute('inert'); else tb.setAttribute('inert', ''); }
    $$('[data-nav]').forEach(function (el) {
      if (s0 && el.getAttribute('data-nav') === s0.name) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.documentElement.lang = S.prefs.lang;
    $$('#lang-btn, [data-lang-btn]').forEach(function (lb) {   // several screens of the stack can each carry one
      lb.textContent = S.prefs.lang.toUpperCase();
      lb.setAttribute('aria-label', tr('Language: ' + LANG_NAMES[S.prefs.lang] + '. Change language', 'Kieli: ' + LANG_NAMES[S.prefs.lang] + '. Vaihda kieli', 'Språk: ' + LANG_NAMES[S.prefs.lang] + '. Byt språk'));
    });
    if (tp) document.title = tp.out.title + ' · care4all';
    $$('[data-install-cell]').forEach(function (el) { el.hidden = A.isStandalone() || !!A.installed; });
  }
  function focusScreen(s, quiet) {
    var h = $('#h', s.el) || s.sc;
    if (!h) return;
    h.setAttribute('tabindex', '-1');
    try { h.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    if (!quiet) A.announce(s.out.title);
  }
  function afterNav(s) {
    if (s && s.out && s.out.onShow) s.out.onShow(s.el);
    var id = nav.pendingScroll;
    nav.pendingScroll = null;
    if (id) setTimeout(function () { scrollToId(id); }, A.reduceMotion() ? 30 : 420);
  }
  function scrollToId(id) {
    var tp = top(), el = tp && $('#' + id, tp.el);
    if (!el) return;
    var sc = tp.sc, y = sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 70;
    try { sc.scrollTo({ top: Math.max(0, y), behavior: A.reduceMotion() ? 'auto' : 'smooth' }); } catch (e) { sc.scrollTop = Math.max(0, y); }
  }

  /* ---------- navigation ---------- */
  function init(r) {
    var base = rootFor(r);
    var list;
    if (base.name === r.name) list = [build(r, null)];
    else { var b = build(base, null); list = [b, build(r, shortTitle(b))]; }
    nav.stack = list; nav.pushed = 0;
    list.forEach(function (s, i) { stackEl.appendChild(s.el); if (i < list.length - 1) s.el.classList.add('under'); });
    syncInert(); chrome();
    list.forEach(effects);
    enterFx(top());
    afterNav(top());
  }
  function push(r) {
    var prev = top(), s = build(r, shortTitle(prev));
    nav.stack.push(s); nav.pushed++;
    stackEl.appendChild(s.el);
    syncInert(); chrome();
    var ps = [];
    if (!A.reduceMotion() && s.el.animate) {
      s.el.classList.add('lift');
      ps.push(anim(s.el, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }]));
      ps.push(anim(prev.el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-28%)' }]));
      ps.push(anim(prev.el, [{ opacity: 0 }, { opacity: .14 }], { pseudoElement: '::after', easing: 'ease-out' }));   // dim the screen underneath
      enterFx(s);
    }
    if (ps.length) Promise.all(ps).then(function () { s.el.classList.remove('lift'); if (top() !== prev) prev.el.classList.add('under'); });
    else prev.el.classList.add('under');
    effects(s); focusScreen(s); afterNav(s);
  }
  function pop(instant) {
    if (nav.stack.length < 2) return;
    var s = nav.stack.pop(), prev = top();
    nav.pushed = Math.max(0, nav.pushed - 1);
    prev.el.classList.remove('under');
    s.el.setAttribute('inert', '');
    syncInert(); chrome();
    function done() { if (s.el.parentNode) s.el.parentNode.removeChild(s.el); }
    if (instant || A.reduceMotion() || !s.el.animate) done();
    else {
      s.el.classList.add('lift');
      Promise.all([anim(s.el, [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }]), anim(prev.el, [{ transform: 'translateX(-28%)' }, { transform: 'translateX(0)' }]),
        anim(prev.el, [{ opacity: .14 }, { opacity: 0 }], { pseudoElement: '::after', easing: 'ease-out' })]).then(done);
      setTimeout(done, 1000);   // animations stand still while the page is hidden: never leave the old screen behind
    }
    focusScreen(prev);
  }
  function popToRoot() {
    while (nav.stack.length > 2) { var m = nav.stack.splice(1, 1)[0]; if (m.el.parentNode) m.el.parentNode.removeChild(m.el); }
    pop();
  }
  function switchRoot(r) {
    var old = nav.stack.slice(), s = build(r, null);
    nav.stack = [s]; nav.pushed = 0;
    stackEl.appendChild(s.el);
    old.forEach(function (o) { o.el.setAttribute('inert', ''); });
    syncInert(); chrome();
    function cleanup() { old.forEach(function (o) { if (o.el.parentNode) o.el.parentNode.removeChild(o.el); }); }
    if (A.reduceMotion() || !s.el.animate || !old.length) cleanup();
    else { anim(s.el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' }).then(cleanup); setTimeout(cleanup, 1000); enterFx(s); }
    effects(s); focusScreen(s); afterNav(s);
  }
  function onHash() {
    if (!booted) return;   // the first route waits for the account (see start)
    var r = guard(parse(location.hash));
    if (location.hash !== '#' + r.name && r.view !== 'notfound') r = silentGo(r.name);
    if (!nav.stack.length) return init(r);
    var tp = top();
    if (tp.name === r.name) return;
    var s0 = nav.stack[0];
    if (ROOTS[r.view]) {
      if (s0.name === r.name) { if (nav.stack.length > 1) popToRoot(); return; }
      return switchRoot(r);
    }
    var prev = nav.stack[nav.stack.length - 2];
    if (prev && prev.name === r.name) { var ins = nav.instant; nav.instant = false; return pop(ins); }
    push(r);
  }
  A.go = function (name) { if (location.hash === '#' + name) onHash(); else location.hash = '#' + name; };
  A.back = function (instant) {
    if (nav.stack.length < 2) return;
    nav.instant = !!instant;
    var prev = nav.stack[nav.stack.length - 2];
    if (nav.pushed > 0 && history.length > 1) history.back(); else location.hash = '#' + prev.name;
  };
  A.current = function () { var s = top(); return s ? s.r : null; };
  A.stackDepth = function () { return nav.stack.length; };

  function snap() {
    var tp = top(), el = document.activeElement;
    if (!tp || !el || el === document.body || !tp.el.contains(el)) return null;
    var g = function (a) { return el.getAttribute(a); };
    if (g('id')) return '#' + g('id');
    if (g('data-action')) {
      var s = '[data-action="' + g('data-action') + '"]';
      ['data-id', 'data-p', 'data-kind', 'data-topic'].forEach(function (a) { if (g(a)) s += '[' + a + '="' + g(a) + '"]'; });
      return s;
    }
    if (g('name') && g('value') != null) return el.tagName.toLowerCase() + '[name="' + g('name') + '"][value="' + g('value') + '"]';
    return null;
  }
  /* A form marked data-keep keeps what the person typed when its screen is drawn again, for example after
     they switch language half way through signing up. Nothing is stored: the values only live in the page. */
  function keepDrafts(root) {
    return $$('form[data-keep]', root).map(function (form) {
      var vals = {};
      $$('input,select,textarea', form).forEach(function (f) {
        if (!f.name || f.type === 'submit' || f.type === 'button') return;
        if (f.type === 'radio') { if (f.checked) vals[f.name] = f.value; }
        else if (f.type === 'checkbox') vals[f.name + '=' + f.value] = f.checked;
        else vals[f.name] = f.value;
      });
      return { id: form.getAttribute('data-form'), vals: vals };
    });
  }
  function restoreDrafts(root, drafts) {
    drafts.forEach(function (d) {
      var form = $('form[data-form="' + d.id + '"]', root);
      if (!form) return;
      $$('input,select,textarea', form).forEach(function (f) {
        if (!f.name) return;
        if (f.type === 'radio') {
          if (!(f.name in d.vals)) return;
          f.checked = d.vals[f.name] === f.value;
          var seg = f.checked && f.closest('.seg');
          if (seg) setSeg(seg, $$('label', seg).indexOf(f.closest('label')));
        } else if (f.type === 'checkbox') { if ((f.name + '=' + f.value) in d.vals) f.checked = d.vals[f.name + '=' + f.value]; }
        else if (f.name in d.vals && f.type !== 'submit' && f.type !== 'button') f.value = d.vals[f.name];
      });
    });
  }
  A.refresh = function (skipTop) {
    if (!nav.stack.length) return;
    var away = gate(top().r);   // the account changed under this screen, for example after signing out
    if (away) { A.go(away); return; }
    var sel = skipTop ? null : snap();
    nav.stack.forEach(function (s, i) {
      if (skipTop && i === nav.stack.length - 1) return;
      var y = s.sc ? s.sc.scrollTop : 0, hadSolid = s.navEl && s.navEl.hasAttribute('data-solid'), drafts = keepDrafts(s.el);
      s.out = (V[s.r.view] || V.notfound)(s.r.arg);
      if (i > 0) s.back = shortTitle(nav.stack[i - 1]);
      s.el.classList.remove('enter');   // drawn again: the entrance belongs to the first view only
      fill(s);
      restoreDrafts(s.el, drafts);
      s.sc.scrollTop = y;
      runCounts(s.el);
      if (hadSolid) s.navEl.setAttribute('data-solid', '');
    });
    chrome();
    var tp = top(), tgt = sel && $(sel, tp.el);
    if (tgt) { if (!tgt.matches('a,button,input,select,textarea')) tgt.setAttribute('tabindex', '-1'); try { tgt.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    else if (sel) focusScreen(tp, true);
  };

  /* swipe back from the left edge */
  function bindSwipe() {
    var sw = null;
    function end() {
      if (!sw) return;
      var st = sw; sw = null;
      if (!st.on) return;
      var tp = top(), pv = nav.stack[nav.stack.length - 2];
      if (!tp || !pv) return;
      var commit = st.dx > st.w * 0.38 || (st.dx > 40 && st.dx / Math.max(1, Date.now() - st.t0) > 0.5);
      tp.el.style.transition = 'transform .28s cubic-bezier(.32,.72,0,1)';
      pv.el.style.transition = 'transform .28s cubic-bezier(.32,.72,0,1)';
      tp.el.style.transform = commit ? 'translateX(100%)' : '';
      pv.el.style.transform = commit ? 'translateX(0)' : 'translateX(-28%)';
      setTimeout(function () {
        tp.el.style.transition = ''; pv.el.style.transition = ''; pv.el.style.transform = '';
        if (commit) { A.back(true); }
        else { tp.el.style.transform = ''; tp.el.classList.remove('lift'); pv.el.classList.add('under'); }
      }, A.reduceMotion() ? 0 : 290);
    }
    stackEl.addEventListener('touchstart', function (e) {
      if (nav.stack.length < 2 || sheetOpen() || e.touches.length !== 1) return;
      var rect = stackEl.getBoundingClientRect();
      if (e.touches[0].clientX - rect.left > 26) return;
      sw = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, w: rect.width, on: false, dx: 0, t0: Date.now() };
    }, { passive: true });
    stackEl.addEventListener('touchmove', function (e) {
      if (!sw) return;
      var dx = e.touches[0].clientX - sw.x0, dy = e.touches[0].clientY - sw.y0;
      if (!sw.on) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
        if (dx < 10) return;
        sw.on = true;
        var tp0 = top(), pv0 = nav.stack[nav.stack.length - 2];
        pv0.el.classList.remove('under'); tp0.el.classList.add('lift');
      }
      sw.dx = Math.max(0, dx);
      if (e.cancelable) e.preventDefault();
      var tp = top(), pv = nav.stack[nav.stack.length - 2];
      tp.el.style.transform = 'translateX(' + sw.dx + 'px)';
      pv.el.style.transform = 'translateX(' + (-28 * (1 - Math.min(1, sw.dx / sw.w))) + '%)';
    }, { passive: false });
    stackEl.addEventListener('touchend', end);
    stackEl.addEventListener('touchcancel', end);
  }

  /* ---------- sheets ---------- */
  var sheetEl = null, lastFocus = null, actionList = [];
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function sheetOpen() { return !!sheetEl; }
  function bgInert(on) {
    ['stack', 'tabbar'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else if (!(id === 'tabbar' && appEl.getAttribute('data-tabs') === 'off')) { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }
  function bindDrag(wrap) {
    var sh = $('.sheet', wrap), bd = $('.backdrop', wrap), st = null;
    function down(e) {
      if (e.target.closest && e.target.closest('button,a,input,select,textarea')) return;
      st = { y0: e.clientY, y: 0, t0: Date.now() };
      sh.style.transition = 'none';
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    }
    function move(e) {
      if (!st) return;
      st.y = Math.max(0, e.clientY - st.y0);
      sh.style.transform = 'translateY(' + st.y + 'px)';
      bd.style.opacity = String(1 - Math.min(1, st.y / 420));
    }
    function up() {
      if (!st) return;
      var y = st.y, v = y / Math.max(1, Date.now() - st.t0);
      st = null;
      if (y > 110 || (v > 0.6 && y > 30)) A.sheet.close();
      else { sh.style.transition = 'transform .3s cubic-bezier(.32,.72,0,1)'; sh.style.transform = ''; bd.style.transition = 'opacity .3s'; bd.style.opacity = ''; }
    }
    [$('.grab', wrap), $('.sheet-head', wrap)].forEach(function (el) {
      el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }
  A.sheet = {
    open: function (o) {
      if (sheetEl) { var old = sheetEl; sheetEl = null; if (old.parentNode) old.parentNode.removeChild(old); }
      else lastFocus = document.activeElement;
      var id = 'sh-' + A.uid(), wrap = document.createElement('div');
      wrap.className = 'sheet-wrap';
      wrap.innerHTML = '<div class="backdrop" data-action="sheet-close"></div>' +
        '<div class="sheet' + (o.large ? ' tall' : '') + (o.flush ? ' flush' : '') + (o.cls ? ' ' + o.cls : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t" tabindex="-1">' +
        '<div class="grab" aria-hidden="true"></div>' +
        '<div class="sheet-head"><div class="stack" style="gap:2px;min-width:0">' + (o.kicker ? '<p class="cap">' + esc(o.kicker) + '</p>' : '') + '<h2 class="sheet-title" id="' + id + '-t" tabindex="-1">' + esc(o.title) + '</h2></div>' +
        '<button class="icon-btn" type="button" data-action="sheet-close" aria-label="' + esc(tr('Close', 'Sulje', 'Stäng')) + '">' + ic('close', 20) + '</button></div>' +
        '<div class="sheet-body">' + o.html + '</div></div>';
      sheetRoot.appendChild(wrap);
      sheetEl = wrap;
      bgInert(true);
      bindDrag(wrap);
      var f = o.focus && $(o.focus, wrap);
      (f || $('.sheet', wrap)).focus();
      if (o.onOpen) o.onOpen(wrap);
      return wrap;
    },
    close: function (noRestore) {
      if (!sheetEl) return;
      var w = sheetEl; sheetEl = null;
      bgInert(false);
      var sh = $('.sheet', w), bd = $('.backdrop', w);
      if (sh.classList.contains('fight')) { sh.style.transition = 'transform .22s cubic-bezier(.4,0,1,1), opacity .18s'; sh.style.transform = 'translateY(16px) scale(.72)'; sh.style.opacity = '0'; }
      else { sh.style.transition = 'transform .3s cubic-bezier(.32,.72,0,1)'; sh.style.transform = 'translateY(100%)'; }
      bd.style.transition = 'opacity .25s'; bd.style.opacity = '0';
      setTimeout(function () {
        if (w.parentNode) w.parentNode.removeChild(w);
        if (noRestore || sheetEl) return;
        var f = lastFocus;
        if (f && document.contains(f) && f.focus) f.focus(); else { var tp = top(); if (tp) focusScreen(tp, true); }
      }, A.reduceMotion() ? 0 : 300);
    },
    body: function () { return sheetEl && $('.sheet-body', sheetEl); },
    setBody: function (html, focusSel) {
      var b = A.sheet.body();
      if (!b) return;
      b.innerHTML = html;
      b.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap');
      var f = focusSel && $(focusSel, b);
      if (f) { f.setAttribute('tabindex', '-1'); f.focus(); }
    }
  };
  function trapKeys(e) {
    if (!sheetEl) return;
    if (e.key === 'Escape') { e.preventDefault(); A.sheet.close(); return; }
    if (e.key !== 'Tab') return;
    var list = $$(FOCUSABLE, $('.sheet', sheetEl)).filter(function (el) { return !el.closest('[hidden]'); });
    if (!list.length) { e.preventDefault(); return; }
    var first = list[0], last = list[list.length - 1], cur = document.activeElement;
    if (e.shiftKey && (cur === first || cur === $('.sheet', sheetEl))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  }
  function actionSheet(o) {
    actionList = o.actions;
    var cellBtn = function (label, cls, attrs) { return '<button class="cell tap ' + (cls || '') + '" type="button" ' + attrs + '><span class="cell-b"><span class="cell-t" style="text-align:center">' + esc(label) + '</span></span></button>'; };
    A.sheet.open({
      title: o.title, cls: 'action',
      html: (o.message ? '<p class="small">' + esc(o.message) + '</p>' : '') +
        '<div class="group">' + o.actions.map(function (a, i) { return cellBtn(a.label, a.kind === 'destructive' ? 'danger' : '', 'data-action="act" data-i="' + i + '"'); }).join('') + '</div>' +
        '<div class="group">' + cellBtn(t('cancel'), '', 'data-action="sheet-close"') + '</div>'
    });
  }
  /* ---------- assistant ----------
     The Ask tab is its own module (views/ask.js). It provides A.openAsk(question, ctx) and A.chatAsk(question) and
     registers the ask-* actions, which take over from the forwarder below. Everything is looked up at call time. */
  function openAsk(q, ctx) {
    if (A.openAsk) return A.openAsk(q, ctx);
    A.go('ask');
  }

  /* ---------- reminders ----------
     Reminders are saved on the account (A.svc). A device notification is an optional extra that works only while
     care4all is open. It never names a cancer type or a screening, and the lock screen preview stays neutral. */
  function askPermission() {
    try {
      if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
      if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
      var p = Notification.requestPermission();
      return (p && p.then) ? p : Promise.resolve(Notification.permission);
    } catch (e) { return Promise.resolve('denied'); }
  }
  function neutralNote() {
    return [tr('A note from care4all', 'Viesti care4allilta', 'Ett meddelande från care4all'), tr('You have a reminder. Open care4all to see it.', 'Sinulla on muistutus. Avaa care4all nähdäksesi sen.', 'Du har en påminnelse. Öppna care4all för att se den.')];
  }
  function pushNotify(title, body, tag) {
    try {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(title, { body: body, tag: tag, icon: '/icons/icon-192.png' }); });
      else new Notification(title, { body: body, tag: tag });
      return true;
    } catch (e) { return false; }
  }
  A.permText = function () {
    var perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
    return {
      granted: tr('Allowed. Shown while care4all is open', 'Sallittu. Näytetään, kun care4all on auki', 'Tillåtet. Visas medan care4all är öppet'),
      denied: tr('Blocked. Reminders show inside the app', 'Estetty. Muistutukset näkyvät sovelluksessa', 'Blockerat. Påminnelser visas i appen'),
      'default': tr('Asked when you save a reminder', 'Kysytään, kun tallennat muistutuksen', 'Du får frågan när du sparar en påminnelse'),
      unsupported: tr('Not available here. Reminders show inside the app', 'Ei käytettävissä täällä. Muistutukset näkyvät sovelluksessa', 'Inte tillgängligt här. Påminnelser visas i appen')
    }[perm];
  };
  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function openReminder(topic, preset) {
    preset = preset || {};
    var kinds = Object.keys(A.REM_KINDS), pk = preset.kind && A.REM_KINDS[preset.kind] ? preset.kind : kinds[0], pw = preset.when || '3m';
    var canNotify = typeof Notification !== 'undefined', n = neutralNote();
    A.sheet.open({
      kicker: t('reminders'), title: t('setReminder'),
      html: '<form class="form" data-form="reminder" data-topic="' + esc(topic || '') + '" novalidate>' +
        '<div class="fgroup"><p class="cap" style="padding:0 4px">' + esc(tr('What for?', 'Mihin tarkoitukseen?', 'Vad gäller det?')) + '</p><div class="group">' + kinds.map(function (k) { var K = A.REM_KINDS[k]; return opt('radio', 'kind', k, K.label, K.sub, k === pk); }).join('') + '</div></div>' +
        '<div class="fgroup"><p class="cap" style="padding:0 4px">' + esc(tr('When?', 'Milloin?', 'När?')) + '</p><div class="group">' + A.WHEN.map(function (w) { return opt('radio', 'when', w[0], w[1], '', w[0] === pw); }).join('') + '</div>' +
        '<div class="group" id="date-field" hidden><label class="cell field" id="c-date" for="r-date"><span class="fl">' + esc(tr('Date', 'Päivämäärä', 'Datum')) + '</span><input class="fi" id="r-date" name="date" type="date" min="' + today() + '" aria-describedby="e-date"></label></div><p class="err" id="e-date" hidden></p></div>' +
        '<div class="fgroup"><p class="cap" style="padding:0 4px">' + esc(tr('How should we remind you?', 'Miten muistutamme sinua?', 'Hur ska vi påminna dig?')) + '</p><div class="group">' +
        (canNotify ? opt('checkbox', 'chan', 'push', tr('Notification on this device', 'Ilmoitus tällä laitteella', 'Avisering på den här enheten'), tr('Works while care4all is open', 'Toimii, kun care4all on auki', 'Fungerar medan care4all är öppet'), Notification.permission === 'granted') : '') +
        opt('checkbox', 'chan', 'ics', tr('Calendar file (.ics)', 'Kalenteritiedosto (.ics)', 'Kalenderfil (.ics)'), tr('A neutral event you can open in your calendar', 'Neutraali tapahtuma, jonka voit avata kalenterissasi', 'En neutral händelse som du kan öppna i din kalender'), false) + '</div>' +
        '<p class="fnote">' + esc(tr('You always see it inside care4all.', 'Näet sen aina care4allissa.', 'Du ser den alltid i care4all.')) + '</p></div>' +
        '<div class="lock" aria-label="' + esc(tr('What a notification looks like', 'Miltä ilmoitus näyttää', 'Så ser en avisering ut')) + '"><p>' + esc(tr('Lock screen preview', 'Lukitusnäytön esikatselu', 'Förhandsvisning av låsskärmen')) + '</p><p style="font-weight:800;margin-top:6px">' + esc(n[0]) + '</p><p class="small">' + esc(n[1]) + '</p></div>' +
        '<p class="err" id="e-form" hidden></p>' +
        '<div class="stack"><button class="btn primary block" type="submit">' + t('saveReminder') + '</button><button class="btn ghost block" type="button" data-action="sheet-close">' + t('cancel') + '</button></div></form>'
    });
  }
  async function submitReminder(form) {
    if (form.hasAttribute('data-pending')) return;
    clearErrs(form);
    var kind = checked(form, 'kind')[0] || 'letter', when = checked(form, 'when')[0] || '3m', chans = checked(form, 'chan');
    var due = A.calcDue(when, field(form, 'date').value);
    if (isNaN(due) || due <= Date.now()) { showErr(form, 'e-date', tr('Pick a date in the future.', 'Valitse päivämäärä tulevaisuudesta.', 'Välj ett datum i framtiden.'), field(form, 'date')); field(form, 'date').focus(); return; }
    var wantPush = chans.indexOf('push') > -1, wantIcs = chans.indexOf('ics') > -1, made;
    var asked = wantPush ? askPermission() : Promise.resolve('');   // asked now, while the tap is still fresh
    setPending(form, true);
    try {
      made = await A.svc.addReminder({ kind: kind, topic: form.getAttribute('data-topic') || '', due: due });
    } catch (error) {
      setPending(form, false);
      if (error && error.code === 'expired') { A.fail(error); return; }
      showErr(form, 'e-form', A.errorText(error)); A.announce(A.errorText(error));
      return;
    }
    A.sheet.close(true);
    A.refresh();
    A.toast(tr('Reminder saved. ', 'Muistutus tallennettu. ', 'Påminnelsen är sparad. ') + A.fmtDue(due) + '.', 5000);
    if (wantIcs) saveCalendar(made.id);
    // The permission question may stay unanswered for a while, so the list and the toast do not wait for it.
    asked.then(function (perm) {
      if (wantPush && perm !== 'granted') A.toast(tr('Notifications are off, so you will see it inside care4all.', 'Ilmoitukset ovat pois päältä, joten näet sen care4allissa.', 'Aviseringar är avstängda, så du ser den i care4all.'), 5000);
    });
  }
  /* Saves the neutral calendar file the server makes for one reminder. */
  function saveCalendar(id) {
    A.api.reminders.saveCalendar(id).then(function () {
      A.toast(tr('Calendar file downloaded.', 'Kalenteritiedosto ladattu.', 'Kalenderfilen har laddats ned.'));
    }, function (error) { A.fail(error); });
  }
  function findRem(id) { return S.reminders.filter(function (x) { return x.id === id; })[0]; }
  function checkDue() {
    var fired = false, n = neutralNote(), tp = top();
    S.reminders.forEach(function (r) {
      if (r.status === 'active' && r.due <= Date.now() && !r.notified) {
        A.svc.markNotified(r.id); fired = true;
        A.toast(r.monitor ? tr('Time to log an update on how you are doing.', 'Aika kirjata päivitys siitä, miten voit.') : tr('A reminder is due. Open Reminders.', 'Muistutus erääntyy. Avaa Muistutukset.', 'En påminnelse förfaller. Öppna Påminnelser.'), 7000);
        pushNotify(n[0], n[1], r.id);
      }
    });
    // Drawing a screen again would wipe a form someone is filling in, so those wait for the next visit.
    if (fired && !sheetEl && !(tp && $('form', tp.el))) A.refresh();
  }
  A.checkDue = checkDue;


  /* ---------- guide (self-check stepper) and symptom log ---------- */
  var guide = null;
  function openGuide(topic, start, stage) {
    var T = D.TOPICS[topic];
    if (!T || !T.check) return;
    guide = { topic: topic, i: Math.max(0, Math.min(T.check.steps.length - 1, +start || 0)), stage: stage === 'find' ? 'find' : 'steps' };
    A.sheet.open({ kicker: T.name, title: guide.stage === 'find' ? 'Record your findings' : T.check.title, large: true, html: '<div id="guide" class="stack" style="gap:16px" data-t="' + topic + '"></div>', onOpen: function () { drawGuide(true); } });
  }
  function drawGuide(first) {
    var T = D.TOPICS[guide.topic], steps = T.check.steps, i = guide.i, st = steps[i], last = i === steps.length - 1, box = $('#guide'), hd;
    if (guide.stage === 'find') {
      box.innerHTML = A.findingsHtml(guide.topic);
      hd = $('#gstep', box); if (!first && hd) hd.focus();
      return;
    }
    var hint = D.STEP_HINTS && D.STEP_HINTS[guide.topic] && D.STEP_HINTS[guide.topic][i];
    var h = '<p class="small" style="font-weight:700;color:var(--ink)">Step ' + (i + 1) + ' of ' + steps.length + '</p><div class="dots-nav" aria-hidden="true">' + steps.map(function (x, k) { return '<span class="' + (k <= i ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
      '<figure class="step-art" id="step-art">' + A.art.render(st.art, st.h, { demo: true }) + '</figure>' +
      (hint ? '<div class="hint-row"><p class="hint"><span class="cap">Your position</span>' + esc(hint.pose) + '</p><p class="hint"><span class="cap">What to do</span>' + esc(hint.move) + '</p></div>' : '') +
      '<div class="step-card"><span class="num" aria-hidden="true">' + (i + 1) + '</span><h3 class="h3" id="gstep">' + esc(st.h) + '</h3><p class="body">' + esc(st.t) + '</p>' +
      (st.look ? '<p class="look"><span class="cap">What to look for</span>' + esc(st.look) + '</p>' : '') + '</div>' +
      (last && T.check.videos && T.check.videos.length ? '<div class="group">' + (function (v) { return '<a class="cell tap" href="' + esc(v.url) + '" target="_blank" rel="noopener"><span class="ic" aria-hidden="true">' + ic('speaker', 20) + '</span><span class="cell-b"><span class="cell-t">Watch a demonstration</span><span class="cell-d">' + esc(v.org) + '</span></span>' + ic('ext', 18).replace('<svg ', '<svg class="chev" ') + '</a>'; })(T.check.videos[0]) + '</div>' : '') +
      A.chips([st.src]);
    h += '<div class="btn-row">' + (i > 0 ? actionBtn(t('back'), 'guide-back', '', 'block') : '') + (last ? '' : actionBtn('Next', 'guide-next', '', 'dark block')) + '</div>';
    h += '<div class="rec-box">' + actionBtn(ic('checklist', 20) + ' Record my findings', 'guide-record', '', (last ? 'primary' : 'tint') + ' block rec-btn') + '<p class="fnote" style="text-align:center">' + (last ? 'Tick what you found. It is saved in your profile.' : 'You can record what you found at any step.') + '</p></div>';
    box.innerHTML = h;
    if (!first) { hd = $('#gstep', box); hd.setAttribute('tabindex', '-1'); hd.focus(); }
  }
  /* The text of a note, to paste into a message or bring to an appointment. Parts the note does not have are left out. */
  function noteText(n) {
    var o = { emergency: 'Go to emergency (call 112)', doctor: 'See a doctor about this', watch: 'Keep watching closely' };
    return [tr('care4all symptom note', 'care4all-oiremuistiinpano'), tr('Date: ', 'Päivämäärä: ') + A.fmtDate(n.ts), tr('Topic: ', 'Aihe: ') + A.topicLabel(n.topic), tr('Noticed: ', 'Huomasin: ') + n.symptoms.join('; ')]
      .concat(n.when ? [tr('First noticed: ', 'Huomasin ensimmäisen kerran: ') + n.when] : []).concat(n.still ? [tr('Still there: ', 'Onko vielä: ') + n.still] : [])
      .concat(n.where && n.where.length ? [tr('Where: ', 'Missä: ') + n.where.join(', ')] : [])
      .concat(n.trend ? [tr('Since then: ', 'Sen jälkeen: ') + n.trend.toLowerCase()] : []).concat(n.level != null ? [tr('How strong: ', 'Voimakkuus: ') + n.level + tr(' out of 10', ' / 10')] : [])
      .concat(n.details && n.details.length ? n.details : []).concat(n.note ? [tr('Note: ', 'Huomautus: ') + n.note] : []).concat(A.monitorLines ? A.monitorLines(n) : []).concat(n.outcome ? ['What care4all suggested: ' + o[n.outcome]] : [])
      .concat(['', tr('This is a personal note. It is not a diagnosis.', 'Tämä on henkilökohtainen muistiinpano. Se ei ole diagnoosi.')]).join('\n');
  }

  /* ---------- reading options and listen ---------- */
  var speaking = false;
  function stopSpeech() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    speaking = false;
    var b = $('#listen-btn');
    if (b) { b.setAttribute('aria-pressed', 'false'); b.innerHTML = ic('speaker', 20) + t('listen'); }
  }
  function toggleListen() {
    var ss = window.speechSynthesis;
    if (!ss || typeof SpeechSynthesisUtterance === 'undefined') { A.toast(tr('Listening is not available in this browser.', 'Kuuntelu ei ole käytettävissä tässä selaimessa.', 'Uppläsning finns inte i den här webbläsaren.')); return; }
    if (speaking) { stopSpeech(); return; }
    var tp = top(), parts = [];
    $$('.reading h2, .reading p, .reading li, .reading .stat, .inshort p', tp.el).forEach(function (el) {
      if (el.classList.contains('stat')) {
        var sr = $('.stat-n .sr', el);
        parts.push((((sr || $('.stat-n', el)).textContent) + '. ' + $('.stat-l', el).textContent).trim());
      } else if (!el.closest('.stat') && !el.closest('.chips') && !el.classList.contains('cap')) parts.push(el.textContent.trim());
    });
    parts = parts.filter(Boolean);
    if (!parts.length) { A.toast(tr('Open an article to listen to it.', 'Avaa artikkeli kuunnellaksesi sen.', 'Öppna en artikel för att lyssna på den.')); return; }
    speaking = true;
    var b = $('#listen-btn');
    if (b) { b.setAttribute('aria-pressed', 'true'); b.innerHTML = ic('close', 20) + t('stopListen'); }
    parts.forEach(function (txt, i) {
      var u = new SpeechSynthesisUtterance(txt);
      u.lang = 'en-GB'; u.rate = 0.95;
      if (i === parts.length - 1) u.onend = function () { stopSpeech(); };
      u.onerror = function () { if (i === 0) stopSpeech(); };
      ss.speak(u);
    });
  }
  function openReadOpts() {
    A.sheet.open({
      title: tr('Reading options', 'Lukuasetukset', 'Läsalternativ'),
      html: '<div class="group">' +
        '<div class="cell"><span class="cell-b"><span class="cell-t" id="ro-ts">' + t('textSize') + '</span></span></div>' +
        '<div class="cell" style="padding-top:0"><div class="seg tall" role="radiogroup" aria-labelledby="ro-ts" style="--n:3;--i:' + S.prefs.scale + ';width:100%">' +
        A.sizeNames().map(function (n, i) { return '<label><input type="radio" name="scale" value="' + i + '" data-pref="scale"' + (S.prefs.scale === i ? ' checked' : '') + '><span>' + esc(n) + '</span></label>'; }).join('') + '</div></div>' +
        '<div class="cell"><span class="cell-b"><span class="cell-t" id="ro-pl">' + t('plain') + '</span><span class="cell-d">' + esc(tr('Shorter wording where available', 'Lyhyempää sanamuotoa, kun saatavilla', 'Kortare formuleringar där det finns')) + '</span></span><button class="sw" type="button" role="switch" aria-checked="' + !!S.prefs.plain + '" aria-labelledby="ro-pl" data-action="plain-switch"></button></div></div>' +
        '<button class="btn dark block" type="button" id="listen-btn" data-action="listen" aria-pressed="false">' + ic('speaker', 20) + t('listen') + '</button>'
    });
  }

  /* ---------- info sheets ---------- */
  var INFO = {
    access: {
      title: function () { return tr('Accessibility', 'Saavutettavuus', 'Tillgänglighet'); },
      body: function () {
        return '<p class="body">' + esc(tr('care4all aims to meet WCAG 2.2 level AA. This prototype has not been audited by an outside tester.', 'care4all pyrkii täyttämään WCAG 2.2 -tason AA vaatimukset. Ulkopuolinen testaaja ei ole auditoinut tätä prototyyppiä.')) + '</p>' +
          '<div class="card"><ul class="tick">' + [
            tr('Use it with a keyboard or a screen reader. Focus is always visible.', 'Voit käyttää sitä näppäimistöllä tai ruudunlukijalla. Kohdistus on aina näkyvissä.'),
            tr('Change the text size and turn on plain language in your profile.', 'Muuta tekstin kokoa ja ota selkokieli käyttöön profiilissasi.'),
            tr('Turn off animations, or let your device setting do it.', 'Poista animaatiot käytöstä tai anna laitteesi asetuksen tehdä se.'),
            tr('Listen to any article read aloud, where your browser supports it.', 'Kuuntele artikkeli ääneen luettuna, jos selaimesi tukee sitä.'),
            tr('Colours are checked in light and dark mode. Meaning never relies on colour alone.', 'Värit on tarkistettu vaalealla ja tummalla teemalla. Merkitys ei ole koskaan pelkän värin varassa.')
          ].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="placeholder">' + esc(tr('Accessibility statement and feedback contact: ', 'Saavutettavuusseloste ja palautteen yhteystieto: ')) + '[PENDING LEGAL AND ORGANISATION REVIEW]</div>';
      }
    },
    privacy: {
      title: function () { return tr('Privacy notice', 'Tietosuojaseloste', 'Integritetspolicy'); },
      /* The wording is in privacy-copy.js, where the welcome screen, the privacy page and the consent text read the same sentences. */
      body: function () {
        function sec(h, text) { return '<div class="card"><p class="cap">' + esc(tr.apply(null, h)) + '</p><p class="body">' + esc(tr.apply(null, text)) + '</p></div>'; }
        var legal = '<div class="placeholder">' + esc(tr('Data controller, data protection officer contact and the final legal text: ', 'Rekisterinpitäjä, tietosuojavastaavan yhteystiedot ja lopullinen juridinen teksti: ')) + '[PENDING LEGAL REVIEW].</div>';
        return '<p class="body">' + esc(tr.apply(null, NOTICE_INTRO)) + '</p>' + NOTICE.map(function (n) { return sec(n[0], n[1]); }).join('') + legal;
      }
    },
    install: {
      title: function () { return tr('Install care4all', 'Asenna care4all', 'Installera care4all'); },
      body: function () {
        return (A.IN_FRAME ? '<div class="note">' + esc(tr('You are viewing a preview inside another page. Open care4all in its own browser tab first, then install it from there.', 'Katsot esikatselua toisen sivun sisällä. Avaa care4all ensin omalla selainvälilehdellään ja asenna se sieltä.')) + '</div>' : '') +
          '<p class="body">' + esc(tr('Installing puts care4all on your home screen and lets it open without a connection. Signing in and saving still need one.', 'Asennus tuo care4allin aloitusnäytölle ja antaa sen avautua ilman yhteyttä. Kirjautuminen ja tallennus tarvitsevat silti yhteyden.')) + '</p>' +
          '<ol class="group steps"><li><span><b>' + esc(tr('iPhone or iPad (Safari):', 'iPhone tai iPad (Safari):')) + '</b> ' + esc(tr('tap Share, then Add to Home Screen. Open care4all from your Home Screen. Notifications need iOS 16.4 or later.', 'napauta Jaa ja sitten Lisää Koti-valikkoon. Avaa care4all Koti-valikosta. Ilmoitukset vaativat iOS 16.4:n tai uudemman.')) + '</span></li>' +
          '<li><span><b>' + esc(tr('Android (Chrome):', 'Android (Chrome):')) + '</b> ' + esc(tr('open the menu, then Install app.', 'avaa valikko ja valitse Asenna sovellus.')) + '</span></li>' +
          '<li><span><b>' + esc(tr('Computer (Chrome or Edge):', 'Tietokone (Chrome tai Edge):')) + '</b> ' + esc(tr('click the install icon in the address bar.', 'napsauta osoitepalkin asennuskuvaketta.')) + '</span></li></ol>';
      }
    }
  };
  function openInfo(kind) {
    var I = INFO[kind];
    if (I) A.sheet.open({ title: I.title(), html: I.body() + '<button class="btn block" type="button" data-action="sheet-close">' + esc(tr('Close', 'Sulje', 'Stäng')) + '</button>' });
  }

  /* ---------- report a problem ---------- */
  async function submitReport(form) {
    if (form.hasAttribute('data-pending')) return;
    clearErrs(form);
    var box = field(form, 'msg'), message = box.value.trim();
    if (!message) { showErr(form, 'e-rp', tr('Write a few words about what is wrong.', 'Kirjoita muutama sana siitä, mikä on pielessä.', 'Skriv några ord om vad som är fel.'), box); box.focus(); return; }
    setPending(form, true);
    try {
      await A.api.contentReports.add(message, A.apiTopic(form.getAttribute('data-topic') || ''));
    } catch (error) {
      setPending(form, false);
      if (error && error.code === 'expired') { A.fail(error); return; }
      showErr(form, 'e-rp', A.errorText(error), box); A.announce(A.errorText(error));
      return;
    }
    A.sheet.close();
    A.toast(tr('Thanks. Your report is saved.', 'Kiitos. Ilmoituksesi on tallennettu.', 'Tack. Din rapport har sparats.'));
  }

  /* ---------- actions ---------- */
  function setLang(l) { setPref('lang', l); A.refresh(); A.announce(LANG_NAMES[l]); }
  /* Ends the close monitoring of a symptom. A.monitorStop (monitor.js) talks to the server, so it may answer later. */
  function stopWatching(n) {
    Promise.resolve(A.monitorStop(n, 'stopped')).then(function () {
      A.refresh();
      A.toast(tr('Stopped watching. Your note is kept.', 'Seuranta lopetettu. Muistiinpanosi säilyy.'));
    }, function (error) { A.fail(error); });
  }
  function setSeg(seg, i) { seg.style.setProperty('--i', String(i)); seg.removeAttribute('data-none'); }
  /* Forget what the screens remember about the person who just left. The shell clears its own state. Modules that keep
     personal data in memory (the conversations, the account views) add a function to A.resetters, and it runs here. */
  A.resetSession = function () {
    if (A.ui) { A.ui.q = ''; A.ui.seg = {}; A.ui.open = {}; }
    (A.resetters || []).forEach(function (fn) { try { fn(); } catch (e) { /* the others still need to reset */ } });
    guide = null;
    stopSpeech();
  };
  var ACTIONS = {
    back: function () { A.back(); },
    'lang-cycle': function () { var o = ['en', 'fi', 'sv']; setLang(o[(o.indexOf(S.prefs.lang) + 1) % 3]); },
    'lang-menu': function () {
      actionSheet({ title: t('language'), actions: ['en', 'fi', 'sv'].map(function (l) { return { label: LANG_NAMES[l] + (S.prefs.lang === l ? ' ✓' : ''), run: function () { setLang(l); } }; }) });
    },
    info: function (el) { openInfo(el.getAttribute('data-kind')); },
    'sheet-close': function () { A.sheet.close(); },
    act: function (el) {
      var a = actionList[+el.getAttribute('data-i')];
      A.sheet.close();
      if (a && a.run) setTimeout(a.run, A.reduceMotion() ? 0 : 120);
    },
    /* views/ask.js registers ask-open, ask-suggest and ask-clear. This forwarder covers the time before it does. */
    'ask-open': function (el) { openAsk(el.getAttribute('data-q') || '', el.getAttribute('data-ctx') || ''); },
    fight: function () {
      var T = [
        ['checks', 'hand', tr('Self-check', 'Itsetarkistus', 'Självundersökning'), tr('Guided, step by step', 'Ohjattu, vaihe vaiheelta', 'Guidad, steg för steg')],
        ['talk', 'chat', tr('Talk', 'Keskustele', 'Prata'), tr('Ask, or get to know you', 'Kysy tai kerro itsestäsi', 'Fråga, eller berätta om dig själv')],
        ['symptom', 'heart', tr('Talk about symptoms', 'Puhu oireista', 'Prata om symtom'), tr('Something feel different?', 'Tuntuuko jokin erilaiselta?', 'Känns något annorlunda?')],
        ['learn', 'book', t('learn'), tr('Cancers and short reads', 'Syövät ja lyhyet artikkelit', 'Cancertyper och korta texter')]
      ];
      A.sheet.open({ title: tr('What do you want to do?', 'Mitä haluat tehdä?', 'Vad vill du göra?'), cls: 'fight', html: '<div class="fight-grid">' + T.map(function (x, i) {
        return '<button class="fg" type="button" style="--i:' + i + '" data-action="fight-go" data-to="' + x[0] + '"><span class="fg-i" aria-hidden="true">' + ic(x[1], 22) + '</span><span class="fg-t">' + esc(x[2]) + '</span><span class="fg-s">' + esc(x[3]) + '</span></button>';
      }).join('') + '</div>' });
    },
    'fight-go': function (el) {
      var to = el.getAttribute('data-to');
      A.sheet.close(true);
      if (to === 'symptom') A.symStart(''); else A.go(to);
    },
    'read-toggle': function (el) {
      var id = el.getAttribute('data-id'), on = !A.isRead(id);
      A.markRead(id, on);
      el.setAttribute('aria-pressed', String(on)); el.classList.toggle('primary', !on);
      el.innerHTML = on ? ic('check', 18) + ' Read. Tap to mark as not read' : 'Mark as read';
      var st = $('#read-state', top().el); if (st) st.textContent = on ? 'Read' : 'Not read yet';
      A.toast(on ? 'Marked as read. I will not suggest it again.' : 'Marked as not read.');
      A.refresh(true);
    },
    seg: function (el) {
      var id = el.getAttribute('data-topic'), p = el.getAttribute('data-p'), tab = el.parentNode, root = el.closest('.screen');
      A.ui.seg[id] = p;
      $$('[role="tab"]', tab).forEach(function (b) { b.setAttribute('aria-selected', String(b === el)); });
      setSeg(tab, +el.getAttribute('data-i'));
      $$('[role="tabpanel"]', root).forEach(function (pn) { pn.hidden = pn.id !== 'p-' + id + '-' + p; });
      A.tap();
    },
    'goto-seg': function (el) {
      var tp = el.getAttribute('data-topic'), pg = el.getAttribute('data-p');
      if (pg === 'how') { A.go('how-' + tp); return; }
      A.ui.seg[tp] = pg; A.go('t-' + tp);
    },
    acc: function (el) {
      var id = el.getAttribute('data-id'), box = document.getElementById(id), open = !box.classList.contains('open');
      box.classList.toggle('open', open);
      el.setAttribute('aria-expanded', String(open));
      A.ui.open[id] = open;
    },
    'search-clear': function () {
      var inp = $('#search', top().el);
      inp.value = ''; A.ui.q = ''; $('#results', top().el).innerHTML = A.searchResults(''); el_toggleClear(false); inp.focus();
    },
    install: function () {
      if (A.deferredInstall) { var d = A.deferredInstall; A.deferredInstall = null; d.prompt(); if (d.userChoice) d.userChoice.then(function () { A.refresh(); }); }
      else openInfo('install');
    },
    'dismiss-install': function () { S.dismissInstall = true; A.save('dismissInstall'); A.refresh(); },
    'update-app': function () { if (A.applyUpdate) A.applyUpdate(); },
    'retry-boot': function (el) {
      if (el.disabled) return;
      el.disabled = true; el.setAttribute('aria-busy', 'true');
      S.bootError = null;
      A.svc.boot().then(function () {
        el.disabled = false; el.removeAttribute('aria-busy');
        applyPrefs();
        if (bootFailed()) { A.toast(A.errorText({ code: S.bootError }), 5500); return; }
        var to = wanted; wanted = '';
        reopen(to || startFor(stage()));
        applyPrefs();
      });
    },
    'reminder-new': function (el) { openReminder(el.getAttribute('data-topic') || '', { kind: el.getAttribute('data-kind') || '', when: el.getAttribute('data-when') || '' }); },
    'reminder-done': function (el) {
      var r = findRem(el.getAttribute('data-id'));
      if (!r) return;
      A.tap();
      A.svc.setReminderDone(r.id, r.status !== 'done').then(function () { A.refresh(); }, function (error) { A.fail(error); });
    },
    'reminder-menu': function (el) {
      var r = findRem(el.getAttribute('data-id'));
      if (!r) return;
      actionSheet({
        title: A.remLabel ? A.remLabel(r) : (A.REM_KINDS[r.kind] || { label: r.kind }).label, message: A.fmtDue(r.due) + ' · ' + A.fmtDate(r.due),
        actions: (r.monitor && r.status !== 'done' && A.open.checkin ? [{ label: tr('Log an update', 'Kirjaa päivitys'), run: function () { A.open.checkin(r.monitor); } }] : []).concat([
          { label: r.status === 'done' ? tr('Mark as not done', 'Merkitse tekemättömäksi', 'Markera som ogjord') : tr('Mark as done', 'Merkitse tehdyksi', 'Markera som klar'), run: function () { A.svc.setReminderDone(r.id, r.status !== 'done').then(function () { A.refresh(); }, function (error) { A.fail(error); }); } },
          { label: tr('Add to calendar', 'Lisää kalenteriin', 'Lägg till i kalendern'), run: function () { saveCalendar(r.id); } },
          { label: tr('Delete reminder', 'Poista muistutus', 'Ta bort påminnelsen'), kind: 'destructive', run: function () { A.svc.removeReminder(r.id).then(function () { A.refresh(); A.toast(tr('Reminder deleted.', 'Muistutus poistettu.', 'Påminnelsen har tagits bort.')); }, function (error) { A.fail(error); }); } }
        ])
      });
    },
    'notif-test': function () {
      askPermission().then(function (perm) {
        var n = neutralNote();
        if (perm === 'granted') { pushNotify(n[0], tr('This is a test. Nothing about you is shown here.', 'Tämä on testi. Tässä ei näytetä mitään sinusta.', 'Det här är ett test. Inget om dig visas här.'), 'test'); A.toast(tr('Test notification sent.', 'Testi-ilmoitus lähetetty.', 'Testaviseringen är skickad.')); }
        else if (perm === 'unsupported') A.toast(tr('Notifications are not available here. Reminders show inside care4all.', 'Ilmoitukset eivät ole käytettävissä täällä. Muistutukset näkyvät care4allissa.', 'Aviseringar finns inte här. Påminnelser visas i care4all.'));
        else A.toast(tr('Notifications are blocked. Reminders show inside care4all.', 'Ilmoitukset on estetty. Muistutukset näkyvät care4allissa.', 'Aviseringar är blockerade. Påminnelser visas i care4all.'));
        var pt = $('#perm-text', top().el); if (pt) pt.textContent = A.permText();
      });
    },
    guide: function (el) { openGuide(el.getAttribute('data-topic'), el.getAttribute('data-i'), el.getAttribute('data-stage')); },
    'guide-next': function () { if (guide) { guide.i++; drawGuide(); } },
    'guide-back': function () { if (!guide) return; if (guide.stage === 'find') { guide.stage = 'steps'; drawGuide(); } else if (guide.i > 0) { guide.i--; drawGuide(); } },
    'guide-record': function () { if (guide) { guide.stage = 'find'; drawGuide(); } },
    'read-opts': openReadOpts,
    listen: toggleListen,
    'plain-switch': function () {
      setPref('plain', !S.prefs.plain);
      $$('[data-action="plain-switch"]').forEach(function (b) { b.setAttribute('aria-checked', String(!!S.prefs.plain)); });
      A.tap(); A.refresh();
    },
    'motion-switch': function (el) {
      setPref('motion', S.prefs.motion === false);
      el.setAttribute('aria-checked', String(S.prefs.motion !== false)); A.tap();
    },
    'note-menu': function (el) {
      var n = S.notes.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      if (!n) return;
      var topic = A.topicLabel(n.topic), watching = !!(A.monitorActive && A.monitorActive(n)), acts = [];
      // The PDF and the close monitoring come from their own modules (pdf.js, doctor.js, monitor.js): an entry shows only when its opener exists.
      if (A.open.doctorPdf) acts.push({ label: tr('PDF for my doctor', 'PDF lääkärilleni'), run: function () { A.open.doctorPdf(n.id); } });
      acts.push({ label: tr('Copy note', 'Kopioi muistiinpano', 'Kopiera anteckningen'), run: function () { doCopy(noteText(n), tr('Copied. Paste it into a message or bring it to your appointment.', 'Kopioitu. Liitä se viestiin tai ota se mukaan vastaanotolle.', 'Kopierat. Klistra in det i ett meddelande eller ta med det till besöket.')); } });
      var offer = A.monitorOffer ? A.monitorOffer(n) : null;   // "Watch this closely", only for a symptom note that can be watched
      if (offer) acts.push(offer);
      if (watching && A.open.checkin) acts.push({ label: tr('Log an update', 'Kirjaa päivitys'), run: function () { A.open.checkin(n.id); } });
      if (watching) acts.push({ label: tr('Stop watching closely', 'Lopeta tarkka seuranta'), run: function () { stopWatching(n); } });
      acts.push({ label: tr('Delete note', 'Poista muistiinpano', 'Ta bort anteckningen'), kind: 'destructive', run: function () { A.svc.removeObservation(n.id).then(function () { A.refresh(); A.toast(tr('Note deleted.', 'Muistiinpano poistettu.', 'Anteckningen har tagits bort.')); }, function (error) { A.fail(error); }); } });
      actionSheet({ title: tr(topic + ' note', 'Muistiinpano: ' + topic, topic + ', anteckning'), message: A.fmtDate(n.ts), actions: acts });
    },
    'copy-note': function (el) {
      var n = S.notes.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      if (n) doCopy(noteText(n), tr('Copied. Paste it into a message or bring it to your appointment.', 'Kopioitu. Liitä se viestiin tai ota se mukaan vastaanotolle.', 'Kopierat. Klistra in det i ett meddelande eller ta med det till besöket.'));
    },
    report: function (el) {
      A.sheet.open({ title: tr('Report a problem', 'Ilmoita ongelmasta', 'Rapportera ett problem'), html: '<form class="form" data-form="report" data-topic="' + esc((el && el.getAttribute && el.getAttribute('data-topic')) || '') + '" novalidate><div class="fgroup"><label class="h3" for="rp">' + esc(tr('What is wrong or out of date?', 'Mikä on pielessä tai vanhentunutta?', 'Vad är fel eller inaktuellt?')) + '</label><textarea class="textarea" id="rp" name="msg" maxlength="600" aria-describedby="h-rp e-rp"></textarea><p class="err" id="e-rp" hidden></p><p class="fnote" id="h-rp">' + esc(tr('Saved privately with your account. This prototype has no review team, so you will not get a reply.', 'Tallennetaan yksityisesti tilillesi. Tässä prototyypissä ei ole tarkistustiimiä, joten et saa vastausta.', 'Sparas privat på ditt konto. Den här prototypen har inget granskningsteam, så du får inget svar.')) + '</p></div>' +
        '<div class="stack"><button class="btn primary block" type="submit">' + esc(tr('Send', 'Lähetä', 'Skicka')) + '</button><button class="btn ghost block" type="button" data-action="sheet-close">' + t('cancel') + '</button></div></form>' });
    }
  };
  /* Handlers registered by other files (account.js, coach.js, ask.js and so on) join the table, and win over the ones above. */
  Object.keys(A.actions).forEach(function (k) { ACTIONS[k] = A.actions[k]; });
  A.run = function (name, el) { var f = ACTIONS[name]; if (f) f(el || { getAttribute: function () { return ''; } }); };
  /* Other modules add openers to A.open before this file loads (A.open.checkin, A.open.doctorPdf), so the table is extended, never replaced. */
  A.open = Object.assign(A.open || {}, { guide: openGuide, log: function (tp) { A.symStart(tp); }, reminder: openReminder, ask: openAsk, copy: doCopy, noteText: noteText, action: actionSheet });

  function el_toggleClear(on) { var c = $('.searchbar .clear', top().el); if (c) c.hidden = !on; }

  /* ---------- events ---------- */
  function onClick(e) {
    if (e.target && e.target.closest && e.target.closest('.tab, .sw, .btn.primary')) A.haptic(8);
    var el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (el) {
      var fn = ACTIONS[el.getAttribute('data-action')];
      if (fn) { if (el.tagName === 'A') e.preventDefault(); fn(el, e); }
      return;
    }
    var tab = e.target && e.target.closest ? e.target.closest('a[data-nav]') : null;
    if (tab && tab.getAttribute('href') === location.hash && top()) {
      e.preventDefault();
      try { top().sc.scrollTo({ top: 0, behavior: A.reduceMotion() ? 'auto' : 'smooth' }); } catch (x) { top().sc.scrollTop = 0; }
      return;
    }
    var l = e.target && e.target.closest ? e.target.closest('a[data-scroll]') : null;
    if (l) {
      nav.pendingScroll = l.getAttribute('data-scroll');
      if (l.getAttribute('href') === location.hash) { e.preventDefault(); var id = nav.pendingScroll; nav.pendingScroll = null; scrollToId(id); }
    }
  }
  function onSubmit(e) {
    var form = e.target.closest ? e.target.closest('[data-form]') : null;
    if (!form) return;
    e.preventDefault();
    var kind = form.getAttribute('data-form'), run = A.forms[kind];
    if (!run && kind === 'reminder') run = submitReminder;
    if (!run && kind === 'report') run = submitReport;
    if (!run) return;
    var result = run(form, e);
    // A handler that forgets to catch a failed request must not leave an unhandled rejection behind.
    if (result && result.catch) result.catch(function (error) { if (import.meta.env.DEV) console.error(error); A.fail(error); });
  }
  function onChange(e) {
    var el = e.target;
    if (el.type === 'radio') {
      var seg = el.closest('.seg');
      if (seg) setSeg(seg, $$('label', seg).indexOf(el.closest('label')));
    }
    var pref = el.getAttribute && el.getAttribute('data-pref');
    if (pref) {
      if (pref === 'scale') { setPref('scale', +el.value); A.tap(); }
      if (pref === 'skin') { setPref('skin', +el.value); A.tap(); $$('input[data-pref="skin"]').forEach(function (r) { r.checked = r.value === el.value; var sg = r.closest('.seg'); if (sg && r.checked) setSeg(sg, $$('label', sg).indexOf(r.closest('label'))); }); }
      return;
    }
    var form = el.closest && el.closest('form');
    if (!form) return;
    var kind = form.getAttribute('data-form');
    if (A.changes[kind]) A.changes[kind](el, form);
    if (kind === 'reminder' && el.name === 'when') $('#date-field', form).hidden = el.value !== 'date';
  }
  function onInput(e) {
    var el = e.target;
    // Typing in a field that was flagged clears its error, and the message that described it.
    if (el.getAttribute && el.getAttribute('aria-invalid')) {
      el.removeAttribute('aria-invalid');
      var c = el.closest('.cell.field'); if (c) c.removeAttribute('data-invalid');
      (el.getAttribute('aria-describedby') || '').split(' ').forEach(function (id) {
        var p = /^e-/.test(id) ? document.getElementById(id) : null;
        if (p) { p.hidden = true; p.textContent = ''; }
      });
    }
    var fm = el.closest && el.closest('[data-form]');
    if (fm && A.inputs && A.inputs[fm.getAttribute('data-form')]) A.inputs[fm.getAttribute('data-form')](el, fm);
    if (el.hasAttribute && el.hasAttribute('data-search')) {
      A.ui.q = el.value;
      $('#results', top().el).innerHTML = A.searchResults(A.ui.q);
      el_toggleClear(!!el.value);
    }
  }


  /* ---------- session end, install, keyboard ---------- */
  /* Starts the navigation stack again at a route, for example once the server answers after an outage. */
  function reopen(name) {
    var r = guard(parse('#' + name));
    silentGo(r.name);
    nav.stack.forEach(function (s) { if (s.el.parentNode) s.el.parentNode.removeChild(s.el); });
    nav.stack = [];
    init(r);
  }
  /* A session that ended while the app was open: forget the account's records and ask for a sign-in. */
  var failBase = A.fail;
  A.fail = function (error) {
    if (error && error.code === 'expired' && S.account) {
      A.svc.reset(); A.resetSession(); A.sheet.close(true);
      reopen('signin');   // a fresh stack, so nothing of the old session stays behind the sign-in screen
      A.toast(A.errorText(error), 5500);
      return;
    }
    failBase(error);
  };
  function bindKeyboard() {
    var vv = window.visualViewport;
    if (!vv) return;
    function fit() { appEl.style.setProperty('--kb', Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) + 'px'); }
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
  }

  /* ---------- init ----------
     The first screen waits for the server to say who is signed in, so a deep link never flashes the wrong screen. */
  var booted = false;
  function start() {
    stackEl = $('#stack'); appEl = $('#app'); liveEl = $('#live'); toastsEl = $('#toasts'); sheetRoot = $('#sheet-root');
    $$('[data-icon]').forEach(function (el) { el.innerHTML = ic(el.getAttribute('data-icon'), 24); });
    applyPrefs();
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', trapKeys);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); A.deferredInstall = e; });
    window.addEventListener('appinstalled', function () { A.deferredInstall = null; A.installed = true; S.dismissInstall = true; A.save('dismissInstall'); A.refresh(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkDue(); });
    bindSwipe(); bindKeyboard();
    // These containers never scroll. The browser can still nudge one when it brings a focused field into view.
    document.addEventListener('scroll', function (e) {
      var el = e.target;
      if (el && el.nodeType === 1 && (el === appEl || el === stackEl || el.classList.contains('screen') || el.classList.contains('stage'))) { el.scrollTop = 0; el.scrollLeft = 0; }
    }, true);
    registerServiceWorker();
    stackEl.innerHTML = '<div class="boot" role="status"><span class="spin" aria-hidden="true"></span><span class="sr">' + esc(tr('Loading care4all', 'Ladataan care4allia', 'Laddar care4all')) + '</span></div>';
    A.svc.boot().then(function () {
      booted = true;
      stackEl.innerHTML = '';
      applyPrefs();
      onHash();
      checkDue();
      setInterval(checkDue, 15000);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
