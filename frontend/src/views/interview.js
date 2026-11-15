import { A as C4A } from "../app.js";
import "../styles/risk.css";

/* The AI interview (docs/design-v2.md section 5). After the basic questions an AI model asks one question at a time, each based
   on all the earlier answers. The server keeps the whole transcript and makes every question (from the model, or from the
   database when the model fails), so this screen is a conversation like the basics chat in sessions.js: message bubbles, reply
   chips, multi-choice pills with a Continue button, a number field, "Not sure" and "Prefer not to say", Back as undo, a
   progress bar from the answered count, and the consent bubble first.

   Everything the model wrote (the title, the help, the option labels) is untrusted text and goes in only through A.esc().
   Nothing here reaches browser storage and the service worker caches none of it. The agreement is asked on every visit. */
(function () {
  'use strict';
  const A = C4A, S = A.S, esc = A.esc, ic = A.icon, V = A.views, $ = A.$, $$ = A.$$;
  const T = (en, fi) => A.tr(en, fi);
  const lang = () => (S.prefs.lang === 'fi' ? 'fi' : 'en');
  const bi = v => (v && typeof v === 'object' ? (v[lang()] || v.en || '') : '');
  const consentText = () => { const c = A.D.INTERVIEW && A.D.INTERVIEW.COPY; return c && c.consent ? bi(c.consent) : ''; };
  const riskConsent = () => { const c = A.D.RISK && A.D.RISK.COPY; return c && c.how_2 ? bi(c.how_2) : ''; };
  const MARK = { unsure: ['Not sure', 'En ole varma'], declined: ['Prefer not to say', 'En halua vastata'] };

  /* ---------- state (in memory only) ---------- */
  const blank = () => ({
    gen: 0, loaded: false, loading: false, enabled: true, basics: false, iv: null, consent: false, busy: false,
    error: null, pending: null, retry: null, focus: false, finishing: false
  });
  const st = blank();
  function reset() { const gen = st.gen + 1; Object.assign(st, blank(), { gen }); }
  if (A.resetters) A.resetters.push(reset);

  const turns = () => (st.iv && Array.isArray(st.iv.turns) ? st.iv.turns : []);
  const current = () => (st.iv && st.iv.current ? st.iv.current : null);
  const complete = () => !!st.iv && st.iv.status === 'complete';

  /* What the screen is showing. Computed from the state, never stored. */
  function phase() {
    if (!consentText()) return 'unavailable';
    if (st.error) return 'error';
    if (!st.loaded) return 'loading';
    if (complete()) return 'done';
    if (!st.iv && !st.basics) return 'basics';
    if (!st.consent) return 'consent';
    if (st.busy) return 'wait';
    if (current()) return 'asking';
    return 'wait';
  }

  /* ---------- drawing ---------- */
  const who = () => '<span class="who">care4all</span>';
  const ai = (html, cls) => '<div class="msg-ai' + (cls ? ' ' + cls : '') + '">' + who() + html + '</div>';
  const say = (text, why, id) => ai('<p' + (id ? ' id="' + id + '"' : '') + '>' + esc(text) + '</p>' + (why ? '<p class="why">' + esc(why) + '</p>' : ''));
  const user = (text, fresh) => '<div class="msg-user' + (fresh ? ' fresh f0' : '') + '">' + esc(text) + '</div>';
  const wait = () => ai('<span class="dots" role="img" aria-label="' + esc(T('Thinking of the next question', 'Mietin seuraavaa kysymystä')) + '"><i></i><i></i><i></i></span>');
  const btn = (action, label, cls, extra) => '<button class="btn ' + cls + '" type="button" data-action="' + action + '"' + (extra || '') + '>' + esc(label) + '</button>';
  const link = (action, label, extra) => '<button class="link" type="button" data-action="' + action + '"' + (extra || '') + '>' + label + '</button>';

  function chatHtml() {
    const p = phase();
    let h = say(T('Now I will ask you some more questions about your health, your habits and your family, one at a time. Each one builds on your earlier answers. You can answer “Not sure” or “Prefer not to say” to any of them.',
      'Seuraavaksi kysyn sinulta lisää kysymyksiä terveydestäsi, tavoistasi ja suvustasi yksi kerrallaan. Jokainen perustuu aiempiin vastauksiisi. Voit vastata mihin tahansa “En ole varma” tai “En halua vastata”.'));
    if (p === 'unavailable') return h + say(T('The interview is not available right now. Try again in a moment.', 'Haastattelu ei ole nyt käytettävissä. Yritä hetken kuluttua uudelleen.'));
    if (p === 'loading') return h + wait();
    if (p === 'basics') return h + say(T('I need your basic answers first: age, sex, height and weight. They take a minute.', 'Tarvitsen ensin perustietosi: iän, sukupuolen, pituuden ja painon. Niihin menee minuutti.'));
    if (!st.enabled && !complete()) h += say(T('The AI model is off, so I will ask a fixed set of questions instead. Nothing is sent to an AI model, and your risk overview cannot be written until a model is on.',
      'Tekoälymalli ei ole käytössä, joten kysyn kiinteän kysymyssarjan. Mitään ei lähetetä tekoälymallille, eikä riskikatsausta voi laatia ennen kuin malli on käytössä.'));
    for (const t of turns()) h += say(t.title, t.help) + user(t.answer && t.answer.label ? t.answer.label : '');
    if (p === 'consent') return st.enabled ? h + ai('<p>' + esc(consentText()) + '</p>') : h;
    const cur = current();
    if (p === 'asking' && cur) h += say(cur.title, cur.help, 'iv-q');
    if (p === 'wait') {
      if (cur && st.pending) h += say(cur.title, cur.help) + user(st.pending);
      h += wait();
    }
    if (p === 'error') h += '<div class="msg-ai" role="alert">' + who() + '<p>' + esc(st.error.text) + '</p></div>';
    if (p === 'done') h += say(T('That was the last question. Thank you.', 'Tämä oli viimeinen kysymys. Kiitos.')) + doneBubble();
    return h;
  }
  const riskState = () => (A.risk && A.risk.assessment ? A.risk.assessment() : null);
  function doneBubble() {
    const a = riskState();
    if (a && (a.status === 'running' || a.status === 'complete')) {
      const card = a.status === 'complete' && A.risk && A.risk.card ? A.risk.card() : '';
      return say(a.status === 'running' ? T('Your risk overview is being worked out.', 'Riskikatsaustasi laaditaan.') : T('Your risk overview is ready.', 'Riskikatsauksesi on valmis.')) + (card ? '<div class="rk-wrap">' + card + '</div>' : '');
    }
    if (!st.enabled) return '';
    return ai('<p>' + esc(T('Next I can work out your risk overview from your answers and Finnish and European guidance.', 'Seuraavaksi voin laatia riskikatsauksesi vastaustesi sekä suomalaisen ja eurooppalaisen ohjeistuksen pohjalta.')) + '</p><p>' + esc(riskConsent()) + '</p>');
  }

  const pills = (options, name, extra) =>
    '<div class="replies multi" role="group"' + (extra || '') + '>' + options.map(o =>
      '<label class="rep"><input type="checkbox" name="' + esc(name) + '" value="' + esc(o.id) + '"' + (o.exclusive ? ' data-ex="1"' : '') + '><span>' + esc(o.label) + '</span></label>').join('') + '</div>';
  function numberField(t) {
    const n = t.number || {}, dec = n.decimals > 0;
    const range = n.min != null && n.max != null ? T('Between ' + n.min + ' and ' + n.max + (n.unit ? ' ' + n.unit : '') + '.', 'Väliltä ' + n.min + '–' + n.max + (n.unit ? ' ' + n.unit : '') + '.') : '';
    return '<div class="group"><label class="cell field" for="iv-v"><span class="fl">' + esc(T('Your answer', 'Vastauksesi')) + '</span><input class="fi" id="iv-v" name="v" type="text" inputmode="' + (dec ? 'decimal' : 'numeric') +
      '" autocomplete="off" aria-required="true" aria-describedby="iv-range"' + '>' + (n.unit ? '<span class="unit">' + esc(n.unit) + '</span>' : '') + '</label></div><p class="fnote" id="iv-range">' + esc(range) + '</p>';
  }
  function widget(t) {
    const form = (inner) => '<form data-form="iv-answer" data-keep data-kind="' + t.kind + '" novalidate>' + inner + '<button class="btn primary sm" type="submit">' + esc(A.t('cont')) + '</button></form>';
    if (t.kind === 'choice') {
      return '<div class="replies" role="group" aria-labelledby="iv-q">' + (t.options || []).map(o =>
        '<button class="rep" type="button" data-action="iv-pick" data-v="' + esc(o.id) + '">' + esc(o.label) + '</button>').join('') + '</div>';
    }
    if (t.kind === 'multi') {
      return form(pills(t.options || [], 'v', ' aria-labelledby="iv-q"') + '<p class="fnote">' + esc(T('Choose every answer that applies.', 'Valitse kaikki sopivat vastaukset.')) + '</p>');
    }
    if (t.kind === 'number') return form(numberField(t));
    return '<p class="small">' + esc(T('This kind of question is not supported in this version of the app.', 'Tämän tyyppistä kysymystä ei tueta tässä sovellusversiossa.')) + '</p>';
  }
  function foot(t) {
    const left = (turns().length ? link('iv-back', ic('chev-l', 14) + ' ' + esc(A.t('back'))) : '') +
      (t.markers || []).filter(m => MARK[m]).map(m => link('iv-marker', esc(T(...MARK[m])), ' data-m="' + m + '"')).join('');
    return '<div class="reply-foot"><span class="rf">' + left + '</span>' + link('iv-pause', ic('pause', 14) + ' ' + esc(T('Pause and exit', 'Tauko ja poistu'))) + '</div>';
  }
  const leaveBtn = () => '<a class="btn ghost sm" href="#home">' + esc(T('Back to home', 'Takaisin etusivulle')) + '</a>';

  /* The reply area, and whether it needs the taller layout. */
  function barHtml() {
    const p = phase();
    if (p === 'basics') return { html: '<div class="btn-row"><a class="btn primary" href="#you">' + esc(T('Answer the basic questions', 'Vastaa perustietoihin')) + '</a></div>', cls: 'reply' };
    if (p === 'consent') return { html: '<div class="btn-row">' + btn('iv-yes', st.enabled ? T('Yes, ask me the questions', 'Kyllä, kysy minulta') : T('Start the questions', 'Aloita kysymykset'), 'primary') + btn('iv-no', T('Not now', 'Ei nyt'), 'ghost') + '</div>', cls: 'reply' };
    if (p === 'error') return { html: '<div class="btn-row">' + btn('iv-retry', T('Try again', 'Yritä uudelleen'), 'primary sm') + leaveBtn() + '</div>', cls: 'reply' };
    if (p === 'unavailable') return { html: '<div class="btn-row">' + leaveBtn() + '</div>', cls: 'reply' };
    if (p === 'done') {
      const a = riskState(), shown = a && (a.status === 'running' || a.status === 'complete');
      const main = shown ? '<a class="btn primary" href="#risk">' + esc(T('See my risk overview', 'Katso riskikatsaukseni')) + '</a>'
        : st.enabled && (!a || a.status === 'failed') ? btn('iv-finish', a ? T('Try again', 'Yritä uudelleen') : T('Yes, work out my overview', 'Kyllä, laadi katsaukseni'), 'primary', st.finishing ? ' disabled' : '') : '<a class="btn primary" href="#home">' + esc(T('Done', 'Valmis')) + '</a>';
      return { html: '<div class="btn-row">' + main + (shown || !st.enabled ? '' : leaveBtn()) + '</div><div class="reply-foot"><span class="rf">' +
        link('iv-restart', ic('repeat', 14) + ' ' + esc(T('Answer the questions again', 'Vastaa kysymyksiin uudelleen'))) + '</span></div>', cls: 'reply' };
    }
    const t = p === 'asking' ? current() : null;
    if (!t) return { html: '', cls: 'reply' };
    const answered = turns().length, max = st.iv.max || 28;
    return {
      html: '<div class="reply-prog" aria-hidden="true"><i style="width:' + Math.min(100, Math.round(answered / Math.max(1, max) * 100)) + '%"></i></div>' +
        '<p class="small reply-n">' + esc(T('Question ' + (answered + 1) + ' of up to ' + max, 'Kysymys ' + (answered + 1) + ' / enintään ' + max)) + '</p>' +
        widget(t) + '<p class="err" id="e-iv" role="alert" hidden></p>' + foot(t),
      cls: t.kind === 'choice' ? 'reply' : 'reply tall'
    };
  }

  const rootEl = () => { const list = document.querySelectorAll('.screen[data-name="interview"]'); return list.length ? list[list.length - 1] : null; };
  function scrollEnd(root, focus) {
    const sc = $('.scroller', root);
    const end = () => { if (sc && document.contains(sc)) sc.scrollTop = sc.scrollHeight; };
    end();
    if (window.requestAnimationFrame) requestAnimationFrame(end);
    setTimeout(end, 300);
    if (focus) {
      const f = $('#iv-bar .rep, #iv-bar input:not([type="hidden"]), #iv-bar .btn.primary, #iv-bar .link', root);
      if (f) { try { f.focus({ preventScroll: true }); } catch { /* ignore */ } }
    }
  }
  function repaint() {
    const root = rootEl();
    const chat = root && $('#iv-chat', root), bar = root && $('#iv-bar', root);
    if (!chat || !bar) return;
    const b = barHtml();
    chat.innerHTML = chatHtml();
    bar.className = 'composer-bar ' + b.cls + (st.busy ? ' is-busy' : '');
    bar.innerHTML = b.html;
    const focus = st.focus && phase() === 'asking';
    st.focus = false;
    scrollEnd(root, focus);
  }
  function showError(text, input) {
    const root = rootEl(), box = root && $('#e-iv', root);
    if (box) { box.textContent = text; box.hidden = false; }
    if (input) { input.setAttribute('aria-invalid', 'true'); const c = input.closest('.cell.field'); if (c) c.setAttribute('data-invalid', ''); try { input.focus(); } catch { /* ignore */ } }
  }
  function clearError(root) {
    const box = root && $('#e-iv', root);
    if (box) { box.hidden = true; box.textContent = ''; }
    if (root) $$('[aria-invalid]', root).forEach(el => { el.removeAttribute('aria-invalid'); const c = el.closest('.cell.field'); if (c) c.removeAttribute('data-invalid'); });
  }

  /* ---------- talking to the server ---------- */
  const failure = error => {
    const code = error && error.code;
    if (code === 'limited') return T('I need a short break from asking questions. Try again in a few minutes.', 'Tarvitsen pienen tauon kysymyksistä. Yritä muutaman minuutin kuluttua uudelleen.');
    return A.errorText(error);
  };
  function signInAgain(error) { if (A.conv && A.conv.signInAgain) A.conv.signInAgain(error); else A.fail(error); }

  /* Where things stand: whether the basics are done, and the interview so far. Asks nothing of the model. */
  async function load() {
    if (st.loading || st.busy) return;
    const gen = st.gen;
    st.loading = true;
    try {
      const res = await A.api.interview.get();
      if (gen !== st.gen) return;
      Object.assign(st, { loaded: true, enabled: !!(res && res.enabled), basics: !!(res && res.basics && res.basics.complete), iv: res && res.interview ? res.interview : null, error: null });
      if (A.risk && A.risk.load) A.risk.load().then(() => repaint(), () => { /* the risk screen reports its own trouble */ });
    } catch (error) {
      if (gen !== st.gen) return;
      if (error && error.code === 'expired') { signInAgain(error); return; }
      st.error = { text: failure(error), code: error && error.code };
      st.retry = load;
    } finally { if (gen === st.gen) st.loading = false; }
    repaint();
  }

  /* One call that may make the model write the next question. The answer shows at once, and the question follows. */
  async function post(body, pendingLabel) {
    if (st.busy) return;
    const gen = st.gen;
    Object.assign(st, { busy: true, error: null, pending: pendingLabel || null });
    repaint();
    try {
      const res = await A.api.interview.send({ language: lang(), ...body });
      if (gen !== st.gen) return;
      if (res && res.interview) st.iv = res.interview;
      st.focus = true;
      if (res && res.outcome === 'complete' && st.iv) {
        st.iv.status = 'complete';
        // The interview is finished: the risk overview can be asked for now, and the next step changes with it.
        if (A.risk && A.risk.load) A.risk.load().then(() => repaint(), () => { /* the risk screen reports its own trouble */ });
        if (A.svc && A.svc.loadNext) A.svc.loadNext().catch(() => { /* the next step stays as it was */ });
      }
    } catch (error) {
      if (gen !== st.gen) return;
      if (error && error.code === 'expired') { st.busy = false; signInAgain(error); return; }
      if (error && error.code === 'basics') { st.basics = false; st.iv = null; }
      st.error = { text: error && error.code === 'conflict' ? T('This changed in another tab. I will reload it.', 'Tämä muuttui toisessa välilehdessä. Lataan sen uudelleen.') : failure(error), code: error && error.code };
      st.retry = error && error.code === 'conflict' ? () => { st.error = null; return load(); } : () => post(body, pendingLabel);
    } finally { if (gen === st.gen) Object.assign(st, { busy: false, pending: null }); }
    repaint();
  }
  const start = () => post({ action: 'start' });

  /* Finishing: the person agrees, the risk assessment starts, and the overview opens. Whatever happens, #risk says the rest. */
  async function finish() {
    if (st.finishing || !A.risk) return;
    st.finishing = true;
    repaint();
    try { await A.risk.run(); }
    catch (error) {
      if (error && error.code === 'expired') { st.finishing = false; signInAgain(error); return; }
      if (error && error.code === 'limited') A.toast(T('You have run the overview a few times already. Try again in a while.', 'Olet laatinut katsauksen jo useita kertoja. Yritä myöhemmin uudelleen.'), 5500);
      else if (!error || error.code !== 'interview') A.fail(error);
    }
    st.finishing = false;
    A.go('risk');
  }

  function answer(value, marker, label) {
    const t = current();
    if (!t || st.busy || phase() !== 'asking') return;
    const body = { action: 'answer', position: t.position };
    if (marker) body.marker = marker; else body.value = value;
    post(body, label);
  }
  const optionLabel = (t, id) => { const o = (t.options || []).find(x => x.id === id); return o ? o.label : ''; };

  /* ---------- the screen ---------- */
  V.interview = function () {
    const title = T('More questions', 'Lisää kysymyksiä');
    const b = barHtml();
    return {
      title, large: title,
      html: '<div class="chat you iv" id="iv-chat" role="log" aria-live="polite" aria-label="' + esc(T('Conversation: more questions', 'Keskustelu: lisää kysymyksiä')) + '">' + chatHtml() + '</div>' +
        '<div class="composer-bar ' + b.cls + (st.busy ? ' is-busy' : '') + '" id="iv-bar" aria-label="' + esc(T('Your answer', 'Vastauksesi')) + '">' + b.html + '</div>',
      onShow(root) {
        const sc = $('.scroller', root);
        if (sc) sc.scrollTop = sc.scrollHeight;
        if (!st.consent) st.error = null;
        load();
      }
    };
  };

  A.interview = { state: st, load, open: () => A.go('interview') };
  A.actions['interview-open'] = () => A.go('interview');
  /* The agreement is for this visit only. An interview already under way carries on from its open question. */
  A.actions['iv-yes'] = () => { st.consent = true; if (current()) { st.focus = true; repaint(); } else start(); };
  A.actions['iv-no'] = () => { if (A.stackDepth() > 1) A.back(); else A.go('home'); };
  A.actions['iv-retry'] = () => { const again = st.retry; st.error = null; repaint(); if (again) again(); else load(); };
  A.actions['iv-pick'] = el => {
    const t = current(), id = el.getAttribute('data-v');
    if (t) answer(id, null, optionLabel(t, id));
  };
  A.actions['iv-marker'] = el => {
    const m = el.getAttribute('data-m');
    if (MARK[m]) answer(null, m, T(...MARK[m]));
  };
  A.actions['iv-back'] = () => { if (!st.busy && turns().length && phase() === 'asking') post({ action: 'undo' }); };
  A.actions['iv-pause'] = () => {
    A.toast(T('Saved. You can pick up where you left off.', 'Tallennettu. Voit jatkaa siitä, mihin jäit.'), 4500);
    if (A.stackDepth() > 1) A.back(); else A.go('home');
  };
  A.actions['iv-finish'] = () => { finish(); };
  A.actions['iv-restart'] = () => {
    if (st.busy || !st.enabled) { if (!st.enabled) A.toast(T('The AI model is off, so the questions cannot be asked again right now.', 'Tekoälymalli ei ole käytössä, joten kysymyksiä ei voi nyt kysyä uudelleen.')); return; }
    A.open.action({
      title: T('Answer the questions again?', 'Vastataanko kysymyksiin uudelleen?'),
      message: T('Your questions and answers are deleted and I ask again from the start. Your risk overview is kept but marked out of date. ', 'Kysymykset ja vastauksesi poistetaan ja kysyn alusta. Riskikatsauksesi säilyy, mutta merkitään vanhentuneeksi. ') + consentText(),
      actions: [{ label: T('Yes, start again', 'Kyllä, aloita alusta'), kind: 'destructive', run: () => { st.consent = true; post({ action: 'restart' }); } }]
    });
  };

  /* ---------- reading what was entered ---------- */
  function readNumber(t, text) {
    const n = t.number || {}, raw = String(text || '').trim().replace(',', '.');
    const range = () => T('Enter a number between ' + n.min + ' and ' + n.max + '.', 'Anna luku väliltä ' + n.min + '–' + n.max + '.');
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return { error: n.min != null ? range() : T('Enter a number.', 'Anna luku.') };
    const value = Number(raw), places = (raw.split('.')[1] || '').length;
    if (places > (n.decimals || 0)) return { error: n.decimals ? T('Use at most ' + n.decimals + ' decimal places.', 'Käytä enintään ' + n.decimals + ' desimaalia.') : T('Enter a whole number.', 'Anna kokonaisluku.') };
    if ((n.min != null && value < n.min) || (n.max != null && value > n.max)) return { error: range() };
    return { value, label: String(raw) + (n.unit ? ' ' + n.unit : '') };
  }
  A.forms['iv-answer'] = form => {
    const t = current();
    if (!t || st.busy) return;
    const root = form.closest('.screen');
    clearError(root);
    if (t.kind === 'multi') {
      const picked = $$('input[name="v"]:checked', form).map(i => i.value);
      if (!picked.length) { showError(T('Choose at least one answer, or use “Not sure” below.', 'Valitse vähintään yksi vastaus tai käytä alla olevaa “En ole varma”.'), null); return; }
      answer(picked, null, picked.map(id => optionLabel(t, id)).join(', '));
    } else if (t.kind === 'number') {
      const input = form.querySelector('[name="v"]'), r = readNumber(t, input ? input.value : '');
      if (r.error) { showError(r.error, input); return; }
      answer(r.value, null, r.label);
    }
  };
  A.changes['iv-answer'] = (el, form) => {
    if (el.type !== 'checkbox') { clearError(form.closest('.screen')); return; }
    if (!el.checked) return;
    const box = el.closest('.replies');
    if (!box) return;
    const exclusive = el.getAttribute('data-ex') === '1';
    $$('input[type="checkbox"]', box).forEach(o => { if (o !== el && (exclusive || o.getAttribute('data-ex') === '1')) o.checked = false; });
    clearError(form.closest('.screen'));
  };
  A.inputs['iv-answer'] = (el, form) => { clearError(form.closest('.screen')); };
})();
