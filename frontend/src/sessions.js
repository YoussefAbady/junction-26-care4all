import { A as C4A } from "./app.js";

/* care4all sessions: the conversation screens. Two of them are conversations the server leads.
   "Get to know you" is the medical-history intake and "Talk about symptoms" is a short symptom note. The server sends one
   question at a time (POST /api/chat, see docs/chat-journeys.md), validates each answer and keeps the progress, so these
   screens only draw what it sends and post what the person answers. Reopening a screen resumes where the person was.
   The general question chat is views/ask.js. It shares the helpers at the top of this file through A.conv.

   Nothing typed here is stored in this browser. Transcripts and unsent answers live in memory until the page closes,
   answers and drafts live on the server. The prototype's local question banks and rule engine are gone: what the
   server decides is shown as the server sent it. */
(function () {
  'use strict';
  const A = C4A, D = A.D, S = A.S, esc = A.esc, ic = A.icon, V = A.views, H = A.vh;
  const $ = A.$, $$ = A.$$;
  const { cell, group, lead, secH } = H;

  /* ================= helpers shared with views/ask.js (A.conv) ================= */
  const lang = () => (S.prefs.lang === 'fi' ? 'fi' : 'en');           // the backend speaks English and Finnish
  const T = (en, fi) => A.tr(en, fi);
  /* Swedish is not spoken by the backend yet, so the conversation runs in English and says so. */
  const svNote = () => (S.prefs.lang === 'sv' ? '<p class="small">Frågorna ställs på engelska, eftersom samtalet ännu inte finns på svenska.</p>' : '');
  const send = body => A.api.chat.send({ language: lang(), ...body });
  const httpsUrl = url => { try { const u = new URL(url); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  const when = iso => { const ms = Date.parse(iso); return Number.isNaN(ms) ? '' : A.fmtDate(ms); };
  const errText = error => A.errorText(error);

  /* Source links from the backend: https only, each with the date the passage was retrieved. */
  function sourceChips(list) {
    const seen = new Set(), out = [];
    for (const s of list || []) {
      const url = s && httpsUrl(s.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const meta = [];
      if (s.language && s.language !== lang()) meta.push(s.language === 'fi' ? T('In Finnish', 'Suomeksi') : T('In English', 'Englanniksi'));
      if (s.retrieved && when(s.retrieved)) meta.push(T('Retrieved ', 'Haettu ') + when(s.retrieved));
      out.push('<a class="chip src" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer"><span class="src-b"><span class="src-t">' + esc(s.title) + '</span>' +
        (meta.length ? '<span class="src-d">' + esc(meta.join(' · ')) + '</span>' : '') + '</span>' + ic('ext', 14) +
        '<span class="sr">' + esc(T('Opens in a new tab', 'Avautuu uudessa välilehdessä')) + '</span></a>');
    }
    return out.length ? '<div class="chips">' + out.join('') + '</div>' : '';
  }

  /* The server suggests where to go next as requests. They are kept here and the chips point at them by number. */
  const requests = [];
  const reg = request => requests.push(request) - 1;
  function run(request) {
    if (!request) return;
    if (request.action === 'start_intake') openScreen(A.engines.you);
    else if (request.action === 'start_symptom') A.symStart(request.topic ? A.designTopic(request.topic) : '');
    else if (typeof request.message === 'string') A.openAsk(request.message);
    else if (request.open === 'professional_options') { if (A.gpSheet) A.gpSheet(); else A.go('home'); }
    else if (request.open === 'library') {
      const id = request.topic ? A.designTopic(request.topic) : '';
      A.go(id && D.TOPICS[id] ? 't-' + id : 'learn');
    }
  }
  A.actions['conv-go'] = el => run(requests[+el.getAttribute('data-r')]);

  /* An emergency answer. It comes first, it is announced at once, and it carries the call button. */
  function emergencyHtml(d, whoHtml) {
    const phone = d.action && /^\d{3,6}$/.test(d.action.phone || '') ? d.action.phone : '';
    const body = (d.passages || []).map(p => (p.items || []).map(t => '<p>' + esc(t) + '</p>').join('') + sourceChips(p.sources)).join('');
    return '<div class="msg-ai is-alert" role="alert" data-kind="emergency">' + (whoHtml || '<span class="who">care4all</span>') +
      (d.message ? '<p class="ans-title">' + esc(d.message) + '</p>' : '') + body +
      (phone ? '<div class="btn-row"><a class="btn primary" href="tel:' + phone + '">' + esc(T('Call ', 'Soita ') + phone) + '</a></div>' : '') +
      (d.safety ? '<div class="ans-safety"><p class="small">' + esc(d.safety.text) + '</p>' + sourceChips([d.safety.source]) + '</div>' : '') + '</div>';
  }

  /* The session is over. The shell ends it when it is told of an expired session: it forgets the account's records, clears
     what the screens remember (through A.resetters, which includes resetAll below) and opens sign-in. */
  function signInAgain(error) {
    A.fail(error);
    if (S.account) { resetAll(); if (A.svc && A.svc.reset) A.svc.reset(); A.go('signin'); }
  }

  /* After the intake changes the next action may too. One refresh a moment after the last answer is enough. */
  let nextTimer = 0;
  function touchNext(now) {
    clearTimeout(nextTimer);
    const refresh = () => A.svc.loadNext().then(() => {
      const cur = A.current();
      A.refresh(!!cur && (cur.name === 'you' || cur.name === 'symptom'));
    }, () => { /* the next action stays as it was */ });
    if (now) refresh(); else nextTimer = setTimeout(refresh, 1500);
  }

  /* ================= state ================= */
  const blank = id => ({
    id, interaction: null, log: [], hist: [], editing: null, fresh: null, notices: [], busy: false, loading: false, error: null,
    lang: '', phase: 'idle', resumed: null, seed: null, prefill: null, topic: undefined, owned: false, canReplay: false,
    next: null, priority: null, saved: null, draftId: '', editNext: '', sync: ''
  });
  A.sx = { you: blank('you'), sym: blank('sym') };
  A.engines = {};
  A.inputs = A.inputs || {};
  let intakeInfo = { done: 0, total: 0, complete: false };
  let owner = null;

  /* Conversations belong to the signed-in account. A different account never sees the previous one's transcript. */
  function resetAll() {
    A.sx.you = blank('you'); A.sx.sym = blank('sym');
    intakeInfo = { done: 0, total: 0, complete: false };
    Object.assign(A.chat, { log: [], ctx: '', pending: '', topic: undefined, sugg: [], hush: false, busy: false, gen: (A.chat.gen || 0) + 1 });
    requests.length = 0;
    clearTimeout(nextTimer);
  }
  function ensureOwner() {
    const who = S.account ? S.account.username : '';
    if (owner !== null && owner !== who) resetAll();
    owner = who;
  }
  A.resetConversations = resetAll;
  if (A.resetters) A.resetters.push(resetAll);    // the shell calls these when a person signs out or the session ends
  A.conv = { lang, T, send, sourceChips, reg, run, emergencyHtml, ensureOwner, signInAgain, errText, reset: resetAll };

  /* ================= words and values ================= */
  const MARK = { unsure: ['Not sure', 'En ole varma'], declined: ['Prefer not to say', 'En halua vastata'], skipped: ['Skipped', 'Ohitettu'] };
  const MARK_BTN = { unsure: ['Not sure', 'En ole varma'], declined: ['Prefer not to say', 'En halua vastata'], skipped: ['Skip this', 'Ohita'] };
  const isMarker = v => !!v && typeof v === 'object' && !Array.isArray(v) && '$' in v;
  const qkey = (e, q) => (e.id === 'you' ? q.id : q.step);
  const scaleWord = n => (n === 0 ? T('None', 'Ei lainkaan') : n <= 3 ? T('Mild', 'Lievä') : n <= 6 ? T('Moderate', 'Kohtalainen') : n <= 8 ? T('Strong', 'Voimakas') : T('Severe', 'Erittäin voimakas'));
  const scaleText = v => T(v + ' out of 10, ' + scaleWord(v).toLowerCase(), v + ' / 10, ' + scaleWord(v).toLowerCase());
  const scaleColor = v => 'hsl(' + Math.round(145 - v * 13.5) + ' 62% 40%)';
  A.scaleWord = scaleWord;

  const optLabel = (options, id) => { const o = (options || []).find(x => x.id === id); return o ? o.label : String(id); };
  function dateLabel(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? A.fmtDate(new Date(+m[1], +m[2] - 1, +m[3]).getTime()) : String(iso);
  }
  function fieldText(f, v) {
    if (Array.isArray(v)) return v.map(x => fieldText(f, x)).join(', ');
    if (f.type === 'choice' || f.type === 'multi') return optLabel(f.options, v);
    if (f.type === 'number') return v + (f.unit ? ' ' + f.unit : '');
    return String(v);
  }
  const entryText = (fields, entry) => fields.filter(f => entry[f.id] !== undefined && entry[f.id] !== '').map(f => f.label + ': ' + fieldText(f, entry[f.id])).join(' · ');
  /* The plain-language form of an answer, for the transcript and the review. */
  function valueLabel(q, v) {
    if (isMarker(v)) return T(...MARK[v.$]);
    switch (q.input) {
      case 'choice': return optLabel(q.options, v);
      case 'multi': case 'body': return v.map(x => optLabel(q.options, x)).join(', ');
      case 'number': return v + (q.unit ? ' ' + q.unit : '');
      case 'scale': return scaleText(v);
      case 'date': return dateLabel(v);
      case 'form': return entryText(q.fields, v);
      case 'list': return v.map(entry => entryText(q.fields, entry)).join('\n');
      default: return String(v) || T('Nothing to add', 'Ei lisättävää');
    }
  }

  /* ================= the reply controls ================= */
  const pillGroup = (options, picked, name, extra) =>
    '<div class="replies multi" role="group"' + (extra || '') + '>' + options.map(o =>
      '<label class="rep"><input type="checkbox" name="' + esc(name) + '" value="' + esc(o.id) + '"' + (o.exclusive || o.id === 'all' ? ' data-ex="1"' : '') + (picked.includes(o.id) ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>').join('') + '</div>';

  /* One field of a form or a list row. The name is also the id, unless an id is given. */
  function fieldRow(f, name, v, id) {
    const label = esc(f.label || ''), n = esc(name), i = esc(id || name);
    if (f.type === 'multi') return '<fieldset class="sx-multi"><legend class="cap">' + label + '</legend>' + pillGroup(f.options, Array.isArray(v) ? v : [], name) + '</fieldset>';
    const req = f.optional ? '' : ' aria-required="true"';
    if (f.type === 'choice') {
      return '<label class="cell field" for="' + i + '"><span class="fl">' + label + '</span><select class="fi" id="' + i + '" name="' + n + '"' + req + '><option value="">' + esc(T('Choose', 'Valitse')) + '</option>' +
        f.options.map(o => '<option value="' + esc(o.id) + '"' + (v === o.id ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select></label>';
    }
    const num = f.type === 'number', yr = f.type === 'year';
    const mode = num ? ' inputmode="' + (f.decimals ? 'decimal' : 'numeric') + '"' : yr ? ' inputmode="numeric" maxlength="4"' : ' maxlength="' + (f.max || 200) + '"';
    return '<label class="cell field" for="' + i + '"><span class="fl">' + label + '</span><input class="fi" id="' + i + '" name="' + n + '" type="text"' + mode + req + ' autocomplete="off"' +
      (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + ' value="' + esc(v == null ? '' : v) + '">' + (num && f.unit ? '<span class="unit">' + esc(f.unit) + '</span>' : '') + '</label>';
  }
  /* Neighbouring one-line fields share a grouped list. A multiple-choice field stands on its own. */
  function fieldsHtml(fields, prefix, entry) {
    let h = '', open = false;
    for (const f of fields) {
      const row = fieldRow(f, prefix + f.id, entry ? entry[f.id] : undefined);
      if (f.type === 'multi') { if (open) { h += '</div>'; open = false; } h += row; }
      else { if (!open) { h += '<div class="group">'; open = true; } h += row; }
    }
    return h + (open ? '</div>' : '');
  }
  function listRow(q, n, entry, removable) {
    return '<fieldset class="sx-row" data-row="' + n + '"><legend class="cap">' + esc(T('Entry ', 'Merkintä ') + (n + 1)) + '</legend>' + fieldsHtml(q.fields, 'r' + n + '-', entry) +
      '<button class="link" type="button" data-action="sx-row-del" data-e="you"' + (removable ? '' : ' hidden') + '>' + esc(T('Remove this entry', 'Poista tämä merkintä')) + '</button></fieldset>';
  }
  const range = (q, f) => (f.min != null ? T('Between ' + f.min + ' and ' + f.max + (q.unit ? ' ' + q.unit : '') + '.', 'Väliltä ' + f.min + '–' + f.max + (q.unit ? ' ' + q.unit : '') + '.') : '');

  function widget(e, q, prev) {
    const k = qkey(e, q), at = ' data-e="' + e.id + '" data-q="' + esc(k) + '"';
    const form = (inner, label) => '<form data-form="sx-answer" data-keep' + at + ' novalidate>' + inner + '<button class="btn primary sm" type="submit">' + esc(label || A.t('cont')) + '</button></form>';
    const was = prev !== undefined && !isMarker(prev) ? prev : undefined;
    switch (q.input) {
      case 'choice':
        return '<div class="replies" role="group" aria-labelledby="sx-q">' + q.options.map(o =>
          '<button class="rep' + (was === o.id ? ' on' : '') + '" type="button" data-action="sx-pick"' + at + ' data-v="' + esc(o.id) + '"' + (was === o.id ? ' aria-pressed="true"' : '') + '>' + esc(o.label) + '</button>').join('') + '</div>';
      case 'multi': case 'body': {
        const note = q.max ? '<p class="fnote">' + esc(T('Choose up to ' + q.max + '.', 'Valitse enintään ' + q.max + '.')) + '</p>' : '';
        return form(pillGroup(q.options, Array.isArray(was) ? was : [], 'v', ' aria-labelledby="sx-q" data-max="' + (q.max || '') + '"') + note);
      }
      case 'scale': {
        const v = typeof was === 'number' ? was : 5;
        return form('<div class="scale" data-sc style="--p:' + v * 10 + '%;--sc:' + scaleColor(v) + '"><div class="scale-top"><output class="scale-n" id="sx-n" aria-hidden="true">' + v + '</output><span class="scale-w" id="sx-w" aria-hidden="true">' + esc(scaleWord(v)) + '</span></div>' +
          '<label class="sr" for="sx-r">' + esc(q.title) + '</label><input class="range" id="sx-r" name="v" type="range" min="0" max="10" step="1" value="' + v + '" aria-valuetext="' + esc(scaleText(v)) + '"></div>' +
          '<div class="scale-ends" aria-hidden="true"><span>' + esc(q.low || '') + '</span><span>' + esc(q.high || '') + '</span></div>', T('Save', 'Tallenna'));
      }
      case 'number': case 'year': {
        const year = q.input === 'year';
        const f = { type: q.input, min: year ? 1900 : q.min, max: year ? new Date().getFullYear() : q.max, decimals: q.decimals, unit: q.unit, label: year ? T('Year', 'Vuosi') : T('Your answer', 'Vastauksesi') };
        return form('<div class="group">' + fieldRow(f, 'v', was, 'sx-v') + '</div><p class="fnote">' + esc(year ? T('A year from 1900 to ' + f.max + ', for example 1998.', 'Vuosiluku väliltä 1900–' + f.max + ', esimerkiksi 1998.') : range(q, f)) + '</p>');
      }
      case 'date': {
        const now = new Date(), iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const youngest = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate()), oldest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
        return form('<div class="group"><label class="cell field" for="sx-v"><span class="fl">' + esc(T('Date', 'Päivämäärä')) + '</span><input class="fi" id="sx-v" name="v" type="date" aria-required="true" min="' + iso(oldest) + '" max="' + iso(youngest) + '" value="' + esc(was || '') + '"></label></div>');
      }
      case 'text': {
        const max = q.max || 500, long = max > 80, ph = e.id === 'sym' ? q.placeholder : '';
        return form('<label class="sr" for="sx-v">' + esc(q.title) + '</label>' + (long
          ? '<textarea class="textarea" id="sx-v" name="v" rows="' + (max > 400 ? 3 : 2) + '" maxlength="' + max + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' + esc(was || '') + '</textarea>'
          : '<input class="fi-box" id="sx-v" name="v" type="text" maxlength="' + max + '" autocomplete="off" enterkeyhint="send" value="' + esc(was || '') + '">'));
      }
      case 'form':
        return form(fieldsHtml(q.fields, 'f-', was && typeof was === 'object' ? was : null));
      case 'list': {
        const rows = Array.isArray(was) && was.length ? was : [null];
        return form('<div class="sx-rows" data-next="' + rows.length + '">' + rows.map((entry, n) => listRow(q, n, entry, rows.length > 1)).join('') + '</div>' +
          '<button class="btn sm tint" type="button" data-action="sx-row-add" data-e="you"' + (q.max ? ' data-max="' + q.max + '"' : '') + '>' + esc(T('Add another', 'Lisää toinen')) + '</button>' +
          (q.max ? '<p class="fnote">' + esc(T('Up to ' + q.max + ' entries.', 'Enintään ' + q.max + ' merkintää.')) + '</p>' : ''));
      }
      default:
        return '<p class="small">' + esc(T('This kind of question is not supported in this version of the app.', 'Tämän tyyppistä kysymystä ei tueta tässä sovellusversiossa.')) + '</p>';
    }
  }

  /* ---------- reading what was typed. Mirrors the server's own checks, so most mistakes are caught before sending. ---------- */
  const named = (form, name) => form.querySelector('[name="' + CSS.escape(name) + '"]');
  /* One field: { value }, { empty: true }, or { error, input }. */
  function readField(form, f, name, label) {
    const pre = label ? label + ': ' : '', node = named(form, name);
    switch (f.type) {
      case 'multi': {
        const picked = $$('input[name="' + CSS.escape(name) + '"]:checked', form).map(i => i.value);
        return picked.length ? { value: picked } : { empty: true };
      }
      case 'choice': return node.value ? { value: node.value } : { empty: true };
      case 'text': {
        const v = node.value.trim(), max = f.max || 200;
        if (!v) return { empty: true };
        return v.length > max ? { error: pre + T('Use at most ' + max + ' characters.', 'Käytä enintään ' + max + ' merkkiä.'), input: node } : { value: v };
      }
      case 'number': {
        const raw = node.value.trim().replace(',', '.');
        if (!raw) return { empty: true };
        const n = Number(raw);
        if (!/^\d+(\.\d+)?$/.test(raw) || n < f.min || n > f.max) {
          return { error: pre + T('Enter a number between ' + f.min + ' and ' + f.max + (f.unit ? ' (' + f.unit + ')' : '') + '.', 'Anna luku väliltä ' + f.min + '–' + f.max + (f.unit ? ' (' + f.unit + ')' : '') + '.'), input: node };
        }
        if (Number(n.toFixed(f.decimals || 0)) !== n) return { error: pre + T('Use at most ' + (f.decimals || 0) + ' decimal places.', 'Käytä enintään ' + (f.decimals || 0) + ' desimaalia.'), input: node };
        return { value: n };
      }
      case 'year': {
        const raw = node.value.trim();
        if (!raw) return { empty: true };
        const last = new Date().getFullYear();
        return /^\d{4}$/.test(raw) && +raw >= 1900 && +raw <= last ? { value: +raw } : { error: pre + T('Enter a year from 1900 to ' + last + ', for example 1998.', 'Anna vuosiluku väliltä 1900–' + last + ', esimerkiksi 1998.'), input: node };
      }
    }
    return { empty: true };
  }
  /* The fields of a form, or of one list row, as an object. */
  function readEntry(form, fields, prefix, where) {
    const entry = {};
    for (const f of fields) {
      const r = readField(form, f, prefix + f.id, f.label);
      if (r.error) return { error: where + r.error, input: r.input };
      if (r.empty) {
        if (f.optional) continue;
        const text = f.type === 'choice' || f.type === 'multi' ? T('Choose an answer.', 'Valitse vastaus.') : T('Fill this in to continue.', 'Täytä tämä jatkaaksesi.');
        return { error: where + (f.label ? f.label + ': ' : '') + text, input: named(form, prefix + f.id) };
      }
      entry[f.id] = r.value;
    }
    return { value: entry };
  }
  const rowEmpty = (form, fields, prefix) => fields.every(f => readField(form, f, prefix + f.id, '').empty);
  /* What to send, or { error, input }, or { skip: true } when the person left an optional answer empty. */
  function collect(e, q, form) {
    const canSkip = (q.markers || []).includes('skipped') || (e.id === 'sym' && q.optional);
    switch (q.input) {
      case 'multi': case 'body': {
        const picked = $$('input[name="v"]:checked', form).map(i => i.value);
        if (!picked.length) return canSkip ? { skip: true } : { error: T('Choose at least one.', 'Valitse vähintään yksi.'), input: $('input[name="v"]', form) };
        return q.max && picked.length > q.max ? { error: T('Choose up to ' + q.max + '.', 'Valitse enintään ' + q.max + '.') } : { value: picked };
      }
      case 'scale': return { value: +form.elements.v.value };
      case 'text': {
        const node = form.elements.v, v = node.value.trim();
        if (!v) return canSkip ? { skip: true } : { error: T('Write a few words to continue.', 'Kirjoita muutama sana jatkaaksesi.'), input: node };
        return { value: v };
      }
      case 'number': case 'year': {
        const r = readField(form, { type: q.input, min: q.min, max: q.max, decimals: q.decimals, unit: q.unit }, 'v', '');
        if (r.empty) return canSkip ? { skip: true } : { error: T('Fill this in to continue.', 'Täytä tämä jatkaaksesi.'), input: form.elements.v };
        return r;
      }
      case 'date': {
        const node = form.elements.v, m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(node.value);
        if (!m) return { error: T('Choose your date of birth.', 'Valitse syntymäaikasi.'), input: node };
        const now = new Date(), born = new Date(+m[1], +m[2] - 1, +m[3]);
        let age = now.getFullYear() - born.getFullYear();
        if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
        if (age < 18) return { error: T('care4all is for adults, 18 or older.', 'care4all on aikuisille, 18-vuotiaille ja vanhemmille.'), input: node };
        return age > 120 ? { error: T('Check the year.', 'Tarkista vuosi.'), input: node } : { value: node.value };
      }
      case 'form': {
        const r = readEntry(form, q.fields, 'f-', '');
        return r.error || Object.keys(r.value).length || !canSkip ? r : { skip: true };
      }
      case 'list': {
        const rows = $$('fieldset[data-row]', form), list = [];
        for (let i = 0; i < rows.length; i++) {
          const prefix = 'r' + rows[i].getAttribute('data-row') + '-';
          if (rows.length > 1 && rowEmpty(form, q.fields, prefix)) continue;      // an empty extra row is just left out
          const r = readEntry(form, q.fields, prefix, rows.length > 1 ? T('Entry ' + (i + 1) + ', ', 'Merkintä ' + (i + 1) + ', ') : '');
          if (r.error) return r;
          list.push(r.value);
        }
        return list.length ? { value: list } : { error: T('Add at least one entry.', 'Lisää vähintään yksi merkintä.') };
      }
    }
    return { error: T('This kind of question is not supported in this version of the app.', 'Tämän tyyppistä kysymystä ei tueta tässä sovellusversiossa.') };
  }

  /* ================= the transcript ================= */
  const bubble = (text, why, cls) =>
    '<div class="msg-ai' + (cls ? ' ' + cls : '') + '"><span class="who">care4all</span><p>' + esc(text) + '</p>' + (why ? '<p class="why">' + esc(why) + '</p>' : '') + '</div>';
  const bubbleHtml = (inner, cls) => '<div class="msg-ai' + (cls ? ' ' + cls : '') + '"><span class="who">care4all</span>' + inner + '</div>';

  function questionBubble(q, cls, current, prefix) {
    const help = q.input === 'body' ? T('Choose every place that applies.', 'Valitse kaikki sopivat kohdat.') : q.help;
    return '<div class="msg-ai' + (cls ? ' ' + cls : '') + '"><span class="who">care4all</span><p' + (current ? ' id="sx-q"' : '') + '>' + esc((prefix || '') + q.title) + '</p>' + (help ? '<p class="why">' + esc(help) + '</p>' : '') + '</div>';
  }
  /* What the person answered. In the intake a tap on it changes it. The symptom note has no way back to a saved step. */
  function answerBubble(e, p, fresh) {
    const cls = fresh ? ' fresh f0' : '';
    if (e.id !== 'you') return '<div class="msg-user' + cls + '">' + esc(p.label) + '</div>';
    return '<button class="msg-user editable' + cls + '" type="button" data-action="sx-edit" data-e="you" data-q="' + esc(p.q.id) + '" aria-label="' + esc(p.q.title + ': ' + p.label + '. ' + T('Change this answer', 'Muuta tätä vastausta')) + '"><span>' + esc(p.label) + '</span><span class="chg" aria-hidden="true">' + esc(T('Change', 'Muuta')) + '</span></button>';
  }
  const infoBubble = text => '<div class="msg-ai" role="status"><span class="who">care4all</span><p>' + esc(text) + '</p></div>';
  const waitBubble = () => '<div class="msg-ai"><span class="who">care4all</span><span class="dots" role="img" aria-label="' + esc(T('Getting your place', 'Haetaan kohtaa')) + '"><i></i><i></i><i></i></span></div>';
  const failBubble = text => '<div class="msg-ai" role="alert"><span class="who">care4all</span><p>' + esc(text) + '</p></div>';

  /* ================= the reply area ================= */
  /* Whether there is an answer from this visit to go back to. A request in flight does not matter here: the reply area ignores taps while it waits. */
  function canBack(e) {
    const st = e.st;
    if (st.editing || !st.log.length) return false;
    return e.id === 'you' ? true : st.canReplay && st.hist.length === st.log.length;
  }
  const backLink = e => '<button class="link" type="button" data-action="sx-back" data-e="' + e.id + '">' + ic('chev-l', 14) + ' ' + esc(A.t('back')) + '</button>';
  const pauseLink = e => '<button class="link" type="button" data-action="sx-pause" data-e="' + e.id + '">' + ic('pause', 14) + ' ' + esc(T('Pause and exit', 'Tauko ja poistu')) + '</button>';
  function foot(e, q, editing) {
    const marks = (q.markers || []).concat(e.id === 'sym' && q.optional ? ['skipped'] : []);
    const left = (!editing && canBack(e) ? backLink(e) : '') +
      marks.map(m => '<button class="link" type="button" data-action="sx-marker" data-e="' + e.id + '" data-m="' + m + '">' + esc(T(...MARK_BTN[m])) + '</button>').join('');
    const right = editing ? '<button class="link" type="button" data-action="sx-cancel" data-e="' + e.id + '">' + esc(T('Cancel change', 'Peruuta muutos')) + '</button>' : pauseLink(e);
    return '<div class="reply-foot"><span class="rf">' + left + '</span>' + right + '</div>';
  }
  function questionBar(e, q) {
    const st = e.st, ed = st.editing, p = e.progress();
    const prev = ed ? ed.value : st.prefill && st.prefill.step === qkey(e, q) ? st.prefill.value : undefined;
    const skippable = (q.markers || []).includes('skipped') || (e.id === 'sym' && q.optional);
    return '<div class="reply-prog" aria-hidden="true"><i style="width:' + Math.round(p.done / Math.max(1, p.total) * 100) + '%"></i></div>' +
      '<p class="small reply-n">' + esc(e.count(p) + (skippable ? T(' · optional, skip if you prefer', ' · vapaaehtoinen, voit ohittaa') : '')) + '</p>' +
      widget(e, q, prev) + '<p class="err" id="e-sx" role="alert" hidden></p>' + foot(e, q, !!ed);
  }
  /* The message is in the transcript, where it is announced. The reply area only offers the way on. */
  const errBar = e => '<div class="btn-row"><button class="btn primary sm" type="button" data-action="sx-retry" data-e="' + e.id + '">' +
    esc(T('Try again', 'Yritä uudelleen')) + '</button>' + '<button class="btn ghost sm" type="button" data-action="sx-leave">' + esc(T('Leave', 'Poistu')) + '</button></div>';
  /* The review step: one clear button, and the way back or out. */
  const reviewBar = (e, label) => '<div class="btn-row"><button class="btn primary" type="button" data-action="sx-confirm" data-e="' + e.id + '">' + esc(label) + '</button></div><p class="err" id="e-sx" role="alert" hidden></p>' +
    '<div class="reply-foot"><span class="rf">' + (canBack(e) ? backLink(e) : '') + e.reviewTail() + '</span>' + pauseLink(e) + '</div>';

  /* A question with a form, a list or many choices gets a taller reply area. */
  const barClass = q => (/^(form|list|body|multi)$/.test(q.input) ? 'reply tall' : 'reply');

  /* ---------- building the whole screen from state ---------- */
  function build(e) {
    const st = e.st, ed = st.editing;
    let chat = e.intro() + st.log.filter(p => !ed || p.q.id !== ed.id).map(p => questionBubble(p.q) + answerBubble(e, p, false)).join('');
    let bar, cls = 'reply';
    if (ed) {
      chat += questionBubble(ed.q, '', true, T('Sure, let us change that one. ', 'Selvä, muutetaan sitä. '));
      bar = questionBar(e, ed.q); cls = barClass(ed.q);
    } else if (!st.interaction) {
      chat += st.error ? failBubble(st.error.text) : waitBubble();
      bar = st.error ? errBar(e) : '';
    } else {
      const c = e.current();
      chat += (st.sync ? infoBubble(st.sync) : '') + c.chat; bar = c.bar; cls = c.cls || cls;
    }
    chat += st.notices.join('');
    return { chat, bar, cls: cls + (st.busy ? ' is-busy' : '') };
  }
  const liveRoot = e => { const list = $$('.screen[data-name="' + e.route + '"]'); return list.length ? list[list.length - 1] : null; };

  function scrollEnd(root, focus) {
    const sc = $('.scroller', root);
    const end = () => { if (sc && document.contains(sc)) sc.scrollTop = sc.scrollHeight; };
    end();
    if (window.requestAnimationFrame) requestAnimationFrame(end);
    setTimeout(end, 300);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(end);
    if (focus) {
      const f = $('#sx-reply .rep, #sx-reply textarea, #sx-reply input:not([type="hidden"]), #sx-reply select, #sx-reply .btn.primary, #sx-reply .link', root);
      if (f) { try { f.focus({ preventScroll: true }); } catch { /* ignore */ } }
    }
  }
  /* Draws everything again. A screen that is not open is skipped: it is built from state when it opens. */
  function repaint(e, o = {}) {
    const root = liveRoot(e);
    if (!root) return;
    const chat = $('#sx-chat', root), bar = $('#sx-reply', root);
    if (!chat || !bar) return;
    const b = build(e);
    chat.innerHTML = b.chat; bar.className = 'composer-bar ' + b.cls; bar.innerHTML = b.bar;
    scrollEnd(root, o.focus);
  }
  /* Adds to the end of the transcript, so a screen reader reads only what is new. o.bar false leaves the reply area as it is. */
  function append(e, html, o = {}) {
    const root = liveRoot(e);
    if (!root) return;
    const chat = $('#sx-chat', root), bar = $('#sx-reply', root);
    if (!chat || !bar) return;
    if (o.bar !== false) { const old = $('#sx-q', chat); if (old) old.removeAttribute('id'); }
    chat.insertAdjacentHTML('beforeend', html);
    if (o.bar !== false) { const b = build(e); bar.className = 'composer-bar ' + b.cls; bar.innerHTML = b.bar; }
    scrollEnd(root, o.focus);
  }
  function showError(e, text, input) {
    const root = liveRoot(e), box = root && $('#e-sx', root);
    if (box) { box.textContent = text; box.hidden = false; }
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      const c = input.closest('.cell.field'); if (c) c.setAttribute('data-invalid', '');
      try { input.focus(); } catch { /* ignore */ }
    }
  }
  function clearError(root) {
    if (!root) return;
    $$('.err', $('#sx-reply', root) || root).forEach(p => { p.hidden = true; p.textContent = ''; });
    $$('[aria-invalid]', root).forEach(i => i.removeAttribute('aria-invalid'));
    $$('[data-invalid]', root).forEach(i => i.removeAttribute('data-invalid'));
  }
  const setBusyClass = (e, on) => {
    const root = liveRoot(e), bar = root && $('#sx-reply', root);
    if (!bar) return;
    bar.classList.toggle('is-busy', on);
    if (on) bar.setAttribute('aria-busy', 'true'); else bar.removeAttribute('aria-busy');
  };

  /* ================= talking to the server ================= */
  /* Runs one thing that changes the conversation, and deals with every way it can fail. */
  async function act(e, fn) {
    const st = e.st;
    if (st.busy || st.loading) return;
    st.busy = true;
    clearError(liveRoot(e));
    setBusyClass(e, true);
    try { await fn(); }
    catch (error) { await failed(e, error); }
    finally { st.busy = false; setBusyClass(e, false); }
  }
  async function failed(e, error) {
    const code = error && error.code;
    if (code === 'expired') { signInAgain(error); return; }
    if (code === 'conflict' || code === 'not_found') {          // changed somewhere else: load where things stand now
      await resync(e, T('This changed in another tab, so I loaded where you are now.', 'Tämä muuttui toisessa välilehdessä, joten haen kohdan, jossa olet nyt.'));
      return;
    }
    showError(e, errText(error));                               // offline, unavailable, limited, invalid: the answer stays in the form
  }
  async function resync(e, note) {
    const st = e.st;
    Object.assign(st, { editing: null, log: [], hist: [], interaction: null, owned: false, canReplay: false, prefill: null, notices: [], sync: note || '' });
    try { e.accept(await e.fetch()); st.error = null; }
    catch (error) { if (error && error.code === 'expired') { signInAgain(error); return; } st.error = { text: errText(error) }; }
    repaint(e, { focus: true });
  }

  /* Opens the conversation: the server returns the question the person is on. */
  async function load(e) {
    const st = e.st;
    if (st.loading || st.busy) return;
    st.loading = true; st.error = null;
    if (!st.interaction) repaint(e);
    try {
      const before = st.prefill, res = await e.fetch(), prev = st.interaction;
      if (prev && e.moved(prev, res.interaction)) {         // the conversation moved on somewhere else: what was shown here no longer applies
        Object.assign(st, { log: [], hist: [], editing: null, notices: [] });
        if (st.prefill === before) st.prefill = null;         // unless fetch() just set a new one
        if (res.interaction.step !== 'label') Object.assign(st, { owned: false, canReplay: false });
      }
      e.accept(res);
    } catch (error) {
      if (error && error.code === 'expired') { st.loading = false; signInAgain(error); return; }
      if (!st.interaction) st.error = { text: errText(error) }; else A.toast(errText(error), 4500);
    }
    st.loading = false;
    repaint(e);
    if (st.editNext) { const id = st.editNext; st.editNext = ''; startEdit(e, id); }   // a tap on "Change" somewhere else brought the person here
  }
  /* Opens a conversation screen. When it is already in the stack just below, the shell goes back to it without drawing it
     again and without calling onShow, so it is drawn from state here. */
  function openScreen(e) {
    const cur = A.current();
    if (!(cur && cur.name === e.route)) A.go(e.route);
    repaint(e);
    load(e);
  }

  async function answer(e, value) {
    const st = e.st, q = st.editing ? st.editing.q : st.interaction;
    if (!q || st.busy || st.loading) return;
    if (st.editing) { changeAnswer(e, value); return; }
    await act(e, async () => {
      const { res, saved } = await e.submit(q, value);
      if (!saved) {                                              // an emergency: show it, keep the question open, save nothing
        st.notices = [emergencyHtml(res)];
        append(e, st.notices[0], { bar: false });
        return;
      }
      const pair = { q, value, label: valueLabel(q, value) };
      st.log.push(pair);
      if (e.id === 'sym') st.hist.push({ step: q.step, value });
      st.notices = []; st.prefill = null; st.sync = '';
      e.accept(res);
      append(e, answerBubble(e, pair, true) + e.current(true).chat, { focus: true });
      e.saved(res);
    });
  }

  /* ================= engine 1: get to know you ================= */
  const you = A.engines.you = {
    id: 'you', route: 'you',
    get st() { return A.sx.you; },
    title: () => T('Get to know you', 'Tutustutaan sinuun'),
    count: p => T(p.done + ' of ' + p.total + ' answered', p.done + ' / ' + p.total + ' vastattu'),
    progress() {
      const it = this.st.interaction;
      if (it && it.type === 'intake_question') return { done: it.progress.answered, total: it.progress.total };
      return { done: intakeInfo.done, total: intakeInfo.total };
    },
    fetch: () => send({ action: 'start_intake' }),
    moved: (a, b) => a.type !== b.type || a.id !== b.id,
    accept(res) {
      const st = this.st, it = res.interaction;
      if (st.resumed === null) st.resumed = it.type !== 'intake_question' || it.progress.answered > 0;
      st.interaction = it; st.lang = lang(); st.phase = it.type === 'intake_complete' ? 'done' : 'active';
      if (res.nextAction) st.next = res.nextAction;
      if (res.priority) st.priority = res.priority;
      noteInfo(it);
    },
    async submit(q, value) { return { res: await send({ action: 'answer_intake', questionId: q.id, revision: q.revision, value }), saved: true }; },
    saved() { touchNext(false); },
    reviewTail: () => '',
    intro() {
      const st = this.st, name = A.firstName();
      if (st.resumed) return bubble(T('Welcome back' + (name ? ', ' + name : '') + '. Let us carry on where you left off.', 'Tervetuloa takaisin' + (name ? ', ' + name : '') + '. Jatketaan siitä, mihin jäit.'));
      return bubble(T('Hi' + (name ? ' ' + name : '') + '. I would like to get to know you a little, so I can point you to the right information and the next steps for you.', 'Hei' + (name ? ' ' + name : '') + '. Haluaisin tutustua sinuun hieman, jotta voin ohjata sinut oikean tiedon ja sinulle sopivien seuraavien askelten pariin.')) +
        bubbleHtml('<p>' + esc(T('I only ask what I can use. You can skip a question or say you are not sure, pause whenever you like, and pick up exactly where you left off. Your answers are saved on your account.', 'Kysyn vain sellaista, mitä voin käyttää. Voit ohittaa kysymyksen tai sanoa, ettet ole varma, pitää tauon milloin vain ja jatkaa täsmälleen siitä, mihin jäit. Vastauksesi tallentuvat tilillesi.')) + '</p>' +
          '<p class="small">' + esc(T('This is a demo. Please use made-up details.', 'Tämä on demo. Käytä kuvitteellisia tietoja.')) + '</p>' + svNote());
    },
    /* The bubble and reply area for the question the server is on. */
    current(anim) {
      const it = this.st.interaction, cls = anim ? 'fresh f1' : '';
      switch (it.type) {
        case 'intake_question': return { chat: questionBubble(it, cls, true), bar: questionBar(this, it), cls: barClass(it) };
        case 'review_intake': return { chat: reviewHtml(this, it, cls), bar: reviewBar(this, T('Confirm and save', 'Vahvista ja tallenna')), cls: 'reply done' };
        case 'intake_complete': return { chat: doneHtml(this, cls), bar: doneBar(), cls: 'reply done' };
      }
      return { chat: infoBubble(T('I could not show this step. Try again.', 'En voinut näyttää tätä vaihetta. Yritä uudelleen.')), bar: '' };
    }
  };

  /* How many answers sit on the account beyond the ones shown. Finnish uses the singular for one. */
  function savedLine(kind, n) {
    const one = n === 1;
    if (kind === 'review') {
      return T(n + ' earlier ' + (one ? 'answer is' : 'answers are') + ' saved on your account and included when you confirm.',
        one ? '1 aiempi vastaus on tallennettu tilillesi, ja se otetaan mukaan, kun vahvistat.' : n + ' aiempaa vastausta on tallennettu tilillesi, ja ne otetaan mukaan, kun vahvistat.');
    }
    if (kind === 'done') {
      return T(n + ' ' + (one ? 'answer is' : 'answers are') + ' saved on your account. You can forget them all below.',
        one ? '1 vastaus on tallennettu tilillesi. Voit unohtaa sen alla.' : n + ' vastausta on tallennettu tilillesi. Voit unohtaa ne kaikki alla.');
    }
    return T(n + ' more ' + (one ? 'answer is' : 'answers are') + ' saved from earlier visits. Open Get to know you to carry on, or forget everything below.',
      (one ? '1 vastaus on' : n + ' vastausta on') + ' tallennettu aiemmilta käynneiltä. Jatka avaamalla Tutustutaan sinuun tai unohda kaikki alla.');
  }
  /* What the person told me. The server sends the answers without their wording, so this shows what was answered in this
     visit with its question, and how many older ones are saved. If the server sends a summary, that is used instead. */
  function reviewHtml(e, it, cls) {
    const st = e.st, answers = it.answers || {}, change = id => '<button class="btn sm ghost" type="button" data-action="sx-edit" data-e="you" data-q="' + esc(id) + '">' + esc(T('Change', 'Muuta')) + '</button>';
    let rows, shown = 0;
    if (Array.isArray(it.summary)) {
      rows = it.summary.map(sec => '<p class="cap">' + esc(sec.title) + '</p>' + (sec.items || []).map(item => {
        shown++;
        return '<div class="know-row"><span class="cell-b"><span class="cell-t">' + esc(item.label) + '</span><span class="cell-d">' + esc(Array.isArray(item.value) ? item.value.join('\n') : item.value) + '</span></span>' +
          (st.log.some(p => p.q.id === item.id) ? change(item.id) : '') + '</div>';
      }).join('')).join('');
    } else {
      const here = st.log.filter(p => answers[p.q.id] !== undefined);
      shown = here.length;
      rows = here.map(p => '<div class="know-row"><span class="cell-b"><span class="cell-t">' + esc(p.q.title) + '</span><span class="cell-d">' + esc(valueLabel(p.q, answers[p.q.id])) + '</span></span>' + change(p.q.id) + '</div>').join('');
    }
    const older = Object.keys(answers).length - shown;
    return bubbleHtml('<p>' + esc(it.title) + '</p><p class="why">' + esc(T('Look through your answers. Nothing is final until you confirm. You can change an answer here, or go back.', 'Käy vastauksesi läpi. Mikään ei ole lopullista ennen kuin vahvistat. Voit muuttaa vastausta tässä tai palata taaksepäin.')) + '</p>' +
      (rows ? '<div class="sx-review">' + rows + '</div>' : '') +
      (older > 0 ? '<p class="small">' + esc(savedLine('review', older)) + '</p>' : ''), cls);
  }
  /* What a suggested request does, in a few words for its button. */
  function requestLabel(r) {
    if (r.action === 'start_intake') return T('Continue', 'Jatka');
    if (r.open === 'professional_options') return T('How to reach a professional', 'Miten tavoittaa ammattilainen');
    if (r.open === 'library') return T('Open the library', 'Avaa kirjasto');
    return T('Open', 'Avaa');
  }
  /* The server's next action, as a card. Its sources are shown with it. */
  function nextCard(e) {
    const st = e.st, n = st.next;
    if (!n) return '';
    const r = st.priority && st.priority.request;
    return '<article class="fu lvl-plan" data-fu="' + esc(n.id) + '"><p class="fu-tag"><span class="fu-dot" aria-hidden="true"></span>' + esc(T('Your next step', 'Seuraava askeleesi')) + '</p><h3 class="h3">' + esc(n.title) + '</h3><p class="body">' + esc(n.why) + '</p>' +
      sourceChips(n.sources) + (r ? '<div class="btn-row"><button class="btn sm tint" type="button" data-action="conv-go" data-r="' + reg(r) + '">' + esc(requestLabel(r)) + '</button></div>' : '') + '</article>';
  }
  function doneHtml(e, cls) {
    const name = A.firstName();
    return bubble(T('That is everything for now' + (name ? ', ' + name : '') + '. Thank you. Your answers are saved on your account.', 'Siinä kaikki toistaiseksi' + (name ? ', ' + name : '') + '. Kiitos. Vastauksesi on tallennettu tilillesi.'), '', cls) +
      '<div class="' + (cls ? 'fu-wrap fresh f2' : 'fu-wrap') + '">' + nextCard(e) + '</div>';
  }
  const doneBar = () => '<div class="btn-row"><a class="btn primary sm" href="#next">' + esc(T('See all my next steps', 'Katso kaikki seuraavat askeleeni')) + '</a><a class="btn tint sm" href="#home">' + esc(T('Back to home', 'Takaisin etusivulle')) + '</a></div>' +
    '<p class="small reply-n">' + esc(T('You can look at or forget what I know with the eye button at the top.', 'Näet tai unohdat tallentamani tiedot yläreunan silmäpainikkeesta.')) + '</p>';

  /* The progress the intake reports, kept for the screens that show it without opening the conversation. */
  function noteInfo(it) {
    if (!it) return;
    if (it.type === 'intake_question') intakeInfo = { done: it.progress.answered, total: it.progress.total, complete: false };
    else if (it.type === 'review_intake') { const n = Math.max(intakeInfo.total, Object.keys(it.answers || {}).length); intakeInfo = { done: n, total: n, complete: false }; }
    else if (it.type === 'intake_complete') { const n = Math.max(intakeInfo.total, intakeInfo.done); intakeInfo = { done: n, total: n, complete: true }; }
  }

  /* ================= engine 2: talk about symptoms ================= */
  const STEPS = ['label', 'onset', 'course', 'impact', 'notes'];
  const SYM_WORDS = {
    onset: { today: ['Today', 'Tänään'], week: ['In the past week', 'Viimeisen viikon aikana'], weeks: ['One to four weeks ago', '1–4 viikkoa sitten'], month: ['More than a month ago', 'Yli kuukausi sitten'], unsure: ['Not sure', 'En ole varma'] },
    course: { same: ['About the same', 'Suunnilleen ennallaan'], worse: ['Getting worse', 'Pahentunut'], better: ['Getting better', 'Helpottanut'], comes: ['Comes and goes', 'Tulee ja menee'], gone: ['Gone', 'Mennyt ohi'], unsure: ['Not sure', 'En ole varma'] },
    impact: { none: ['No effect', 'Ei vaikutusta'], some: ['Some effect', 'Jonkin verran'], limits: ['Limits daily activities', 'Rajoittaa arkea'], unsure: ['Not sure', 'En ole varma'] }
  };
  const symWord = (kind, id) => (SYM_WORDS[kind] && SYM_WORDS[kind][id] ? T(...SYM_WORDS[kind][id]) : String(id || ''));

  const sym = A.engines.sym = {
    id: 'sym', route: 'symptom',
    get st() { return A.sx.sym; },
    title: () => T('Talk about symptoms', 'Kerro oireista'),
    count: p => T(p.done + ' of ' + p.total + ' steps done', p.done + ' / ' + p.total + ' vaihetta tehty'),
    progress() {
      const st = this.st, it = st.interaction, gone = st.hist.some(h => h.step === 'course' && h.value === 'gone');
      const total = gone ? 4 : 5;
      if (!it) return { done: 0, total };
      if (it.type === 'review_symptom') return { done: total, total };
      const at = Math.max(0, STEPS.indexOf(it.step));
      return { done: at - (at > 3 && gone ? 1 : 0), total };
    },
    moved: (a, b) => a.id !== b.id,
    accept(res) {
      const st = this.st, it = res.interaction;
      if (st.resumed === null) st.resumed = it.type === 'review_symptom' || (it.type === 'symptom_question' && it.step !== 'label');
      st.interaction = it; st.lang = lang();
      if (it.id) st.draftId = it.id;
      st.phase = it.type === 'symptom_saved' || it.type === 'symptom_cancelled' ? 'done' : 'active';
      if (res.nextAction) st.next = res.nextAction;
    },
    /* Opens the draft the server keeps for this account, or starts one. A draft takes its topic when it is made, so an
       empty one this page did not start, or one with another topic, is replaced: nothing in it is lost. */
    async fetch() {
      const st = this.st, seed = st.seed, topic = seed ? seed.topic : undefined, body = { action: 'start_symptom' };
      if (topic) body.topic = topic;
      let res = await send(body), it = res.interaction;
      if (it.step === 'label') {
        const made = st.owned && it.id !== st.draftId, held = st.owned && it.id === st.draftId;
        if (!made && (!held || (seed && topic !== st.topic))) {
          await send({ action: 'cancel_symptom', id: it.id });
          res = await send(body);
          st.topic = topic;
        } else if (made) st.topic = topic;
        st.owned = true; st.canReplay = true;
        if (seed && seed.text) st.prefill = { step: 'label', value: seed.text.length > 120 ? seed.text.slice(0, 120).replace(/\s+\S*$/, '') : seed.text };
      }
      st.seed = null;
      return res;
    },
    async submit(q, value) {
      const res = await send({ action: 'answer_symptom', id: q.id, step: q.step, value });
      return { res, saved: res.kind !== 'emergency' };
    },
    saved() { /* nothing is saved as a note until the review is confirmed */ },
    reviewTail: () => '<button class="link" type="button" data-action="sx-discard" data-e="sym">' + esc(T('Discard this note', 'Hylkää tämä merkintä')) + '</button>',
    intro() {
      const st = this.st, name = A.firstName();
      if (st.resumed) {
        return bubbleHtml('<p>' + esc(T('You have a note in progress, so we carry on with that.', 'Sinulla on keskeneräinen merkintä, joten jatketaan siitä.')) + '</p>' +
          '<div class="btn-row"><button class="btn sm tint" type="button" data-action="sym-new">' + esc(T('Discard it and start a new note', 'Hylkää se ja aloita uusi merkintä')) + '</button></div>');
      }
      return bubble(T('Hi' + (name ? ' ' + name : '') + '. Tell me what is on your mind. I will ask a few short questions, one at a time, so you have a clear note for yourself and for a healthcare professional.', 'Hei' + (name ? ' ' + name : '') + '. Kerro, mikä mieltäsi painaa. Kysyn muutaman lyhyen kysymyksen yksi kerrallaan, jotta sinulla on selkeä merkintä itsellesi ja terveydenhuollon ammattilaiselle.')) +
        bubbleHtml('<p>' + esc(T('I do not diagnose, and I will not decide anything for you. Nothing is saved as a note until you have looked it over and chosen Save. You can leave at any time and the draft will be here when you come back. If it is an emergency, call 112.', 'En tee diagnooseja enkä päätä mitään puolestasi. Mitään ei tallenneta merkinnäksi ennen kuin olet katsonut sen läpi ja valinnut Tallenna. Voit poistua milloin vain, ja luonnos odottaa sinua. Hätätilanteessa soita numeroon 112.')) + '</p>' +
          '<p class="small">' + esc(T('This is a demo. Please use made-up details.', 'Tämä on demo. Käytä kuvitteellisia tietoja.')) + '</p>' + svNote());
    },
    current(anim) {
      const it = this.st.interaction, cls = anim ? 'fresh f1' : '';
      switch (it.type) {
        case 'symptom_question': {
          const hint = it.step === 'label' ? T('For example: a lump in my left breast', 'Esimerkiksi: patti vasemmassa rinnassa') : it.step === 'notes' ? T('For example: it started after a fall', 'Esimerkiksi: se alkoi kaatumisen jälkeen') : '';
          const q = { ...it, placeholder: hint };
          return { chat: questionBubble(q, cls, true), bar: questionBar(this, q) };
        }
        case 'review_symptom': return { chat: symReview(it, cls), bar: reviewBar(this, T('Confirm and save', 'Vahvista ja tallenna')), cls: 'reply done' };
        case 'symptom_saved': return { chat: symSaved(this, cls), bar: symSavedBar(), cls: 'reply done' };
        case 'symptom_cancelled': return { chat: bubble(T('I have discarded that draft. Nothing was saved.', 'Olen hylännyt luonnoksen. Mitään ei tallennettu.'), '', cls), bar: symCancelledBar(), cls: 'reply done' };
      }
      return { chat: infoBubble(T('I could not show this step. Try again.', 'En voinut näyttää tätä vaihetta. Yritä uudelleen.')), bar: '' };
    }
  };
  /* The draft the server holds, as a list. */
  function symList(d) {
    const rows = [[T('What', 'Mitä'), d.label], [T('Started', 'Alkoi'), d.onset ? symWord('onset', d.onset).toLowerCase() : ''], [T('Since then', 'Sen jälkeen'), d.course ? symWord('course', d.course).toLowerCase() : ''],
      [T('Daily life', 'Arki'), d.impact ? symWord('impact', d.impact).toLowerCase() : ''], [T('Topic', 'Aihe'), d.topic ? A.tname(A.designTopic(d.topic)) : ''], [T('Anything else', 'Muuta'), d.notes]];
    return '<ul class="tick sx-sum">' + rows.filter(r => r[1]).map(r => '<li><span><b>' + esc(r[0]) + ':</b> ' + esc(r[1]) + '</span></li>').join('') + '</ul>';
  }
  function symReview(it, cls) {
    return bubbleHtml('<p>' + esc(it.title) + '</p>' + symList(it.draft || {}) + '<p class="why">' + esc(T('This is a note for you and for a healthcare professional. It is not a diagnosis.', 'Tämä on merkintä sinulle ja terveydenhuollon ammattilaiselle. Se ei ole diagnoosi.')) + '</p>', cls);
  }
  function symSaved(e, cls) {
    return bubbleHtml('<p>' + esc(T('Saved to your symptom notes.', 'Tallennettu oiremerkintöihisi.')) + '</p>' + (e.st.saved ? symList(e.st.saved) : '') +
      '<p class="why">' + esc(T('This is not a diagnosis. If it gets worse or you notice something new, tell me again. ', 'Tämä ei ole diagnoosi. Jos oire pahenee tai huomaat jotain uutta, kerro minulle uudelleen. ') + D.COPY.help) + '</p>', cls);
  }
  const symSavedBar = () => '<div class="btn-row"><a class="btn primary sm" href="#home">' + esc(T('Done', 'Valmis')) + '</a><button class="btn tint sm" type="button" data-action="sx-copy" data-e="sym">' + esc(T('Copy my note', 'Kopioi merkintäni')) + '</button>' +
    '<a class="btn ghost sm" href="#notes">' + esc(T('See my notes', 'Katso merkintäni')) + '</a><button class="btn ghost sm" type="button" data-action="sym-new">' + esc(T('Start a new note', 'Aloita uusi merkintä')) + '</button></div>';
  const symCancelledBar = () => '<div class="btn-row"><button class="btn primary sm" type="button" data-action="sym-new">' + esc(T('Start a new note', 'Aloita uusi merkintä')) + '</button><a class="btn ghost sm" href="#home">' + esc(T('Back to home', 'Takaisin etusivulle')) + '</a></div>';

  /* ---------- the symptom note's own steps: save, discard, back ---------- */
  async function saveNote(e) {
    const st = e.st, it = st.interaction;
    if (!it || it.type !== 'review_symptom') return;
    await act(e, async () => {
      const res = await send({ action: 'save_symptom', id: it.id });
      Object.assign(st, { saved: it.draft || null, hist: [], log: [], notices: [], owned: true, canReplay: false });
      e.accept(res);
      append(e, e.current(true).chat, { focus: true });
      await Promise.all([A.svc.loadObservations(), A.svc.loadNext()]).catch(() => { /* the note is saved. The lists catch up on the next visit */ });
      A.refresh(true);
    });
  }
  async function discardNote(e) {
    const st = e.st, it = st.interaction;
    if (!it || !it.id) return;
    await act(e, async () => {
      const res = await send({ action: 'cancel_symptom', id: it.id });
      Object.assign(st, { log: [], hist: [], notices: [], saved: null, prefill: null, owned: true, canReplay: false });
      e.accept(res);
      repaint(e, { focus: true });
    });
  }
  /* The server cannot reopen an earlier step, so going back starts the draft again and replays the answers before it. */
  async function replayBack(e) {
    const st = e.st;
    if (!canBack(e)) return;
    const keep = st.hist.slice(0, -1), undone = st.hist[st.hist.length - 1], id = st.interaction.id;
    await act(e, async () => {
      try {
        await send({ action: 'cancel_symptom', id });
        let res = await send({ action: 'start_symptom', ...(st.topic ? { topic: st.topic } : {}) });
        for (const h of keep) {
          const it = res.interaction;
          if (!it || it.type !== 'symptom_question' || it.step !== h.step) throw new Error('replay');
          res = await send({ action: 'answer_symptom', id: it.id, step: h.step, value: h.value });
        }
        st.hist = keep; st.log = st.log.slice(0, keep.length); st.notices = [];
        st.prefill = { step: undone.step, value: undone.value };
        e.accept(res);
        repaint(e, { focus: true });
      } catch (error) {
        if (error && error.code === 'expired') throw error;
        /* The draft was deleted to start it again, so whatever happened, show what the server holds now. */
        await resync(e, T('I could not go back, so I loaded where the note stands. You may need to enter the last answers again.', 'En voinut palata, joten haen merkinnän tilanteen. Joudut ehkä antamaan viimeiset vastaukset uudelleen.'));
      }
    });
  }

  /* A new note. Asks first when there are unsaved answers to lose. */
  function startNew(e) {
    const st = e.st, it = st.interaction;
    const inProgress = it && st.phase === 'active' && (it.type === 'review_symptom' || (it.type === 'symptom_question' && it.step !== 'label'));
    const go = async () => {
      if (it && it.id && st.phase === 'active') {
        try { await send({ action: 'cancel_symptom', id: it.id }); } catch (error) { if (error && error.code === 'expired') { signInAgain(error); return; } }
      }
      Object.assign(st, blank('sym'), { seed: st.seed, owned: true });
      openScreen(e);
    };
    if (inProgress) {
      A.open.action({ title: T('Discard this note?', 'Hylätäänkö tämä merkintä?'), message: T('What you have answered so far is deleted. Nothing is saved as a note.', 'Tähän mennessä antamasi vastaukset poistetaan. Mitään ei tallenneta merkinnäksi.'),
        actions: [{ label: T('Discard and start again', 'Hylkää ja aloita alusta'), kind: 'destructive', run: go }] });
    } else go();
  }

  /* ================= changing an answer in the intake ================= */
  /* The server accepts an answer only for the question it is on. An earlier answer is changed through the survey record. */
  async function putProgress(change) {
    for (let attempt = 0; ; attempt++) {
      const { progress } = await A.api.survey.get();
      try { return (await A.api.survey.put(change(progress))).progress; }
      catch (error) { if (!(error && error.code === 'conflict' && attempt < 2)) throw error; }
    }
  }
  const reopen = p => ({ ...p, cursor: '', complete: false, confirmed: false, language: lang() });

  function startEdit(e, id) {
    const st = e.st, p = st.log.find(x => x.q.id === id);
    if (!p || st.busy || st.loading) return;
    if (A.sheet && A.sheet.body && A.sheet.body()) A.sheet.close(true);
    st.editing = { id, q: p.q, value: p.value };
    repaint(e, { focus: true });
  }
  async function changeAnswer(e, value) {
    const st = e.st, ed = st.editing;
    await act(e, async () => {
      await putProgress(p => ({ ...reopen(p), answers: { ...p.answers, [ed.id]: value } }));
      const pair = st.log.find(x => x.q.id === ed.id);
      if (pair) { pair.value = value; pair.label = valueLabel(pair.q, value); }
      st.editing = null;
      e.accept(await e.fetch());
      repaint(e, { focus: true });
      touchNext(false);
    });
  }

  /* ================= the screens ================= */
  function sxScreen(e, extra) {
    ensureOwner();
    const b = build(e);
    return Object.assign({
      title: e.title(), large: e.title(),
      html: '<div class="chat you sx" id="sx-chat" role="log" aria-live="polite" aria-label="' + esc(T('Conversation: ', 'Keskustelu: ') + e.title()) + '">' + b.chat + '</div>' +
        '<div class="composer-bar ' + b.cls + '" id="sx-reply" aria-label="' + esc(T('Your answer', 'Vastauksesi')) + '">' + b.bar + '</div>',
      onShow: root => opened(e, root),
      /* Runs each time the screen is drawn. A language switch draws it again, and the question is then asked in the new language. */
      after: () => {
        const st = e.st;
        if (st.interaction && st.lang && st.lang !== lang() && !st.loading) {
          Object.assign(st, { log: [], hist: [], editing: null, notices: [], owned: false, canReplay: false, interaction: null, resumed: null });
          load(e);
        }
      }
    }, extra || {});
  }
  /* The person arrived on the screen: scroll to the end, and ask the server where things stand. */
  function opened(e, root) {
    const st = e.st;
    scrollEnd(root, false);
    if (st.loading || st.busy) return;
    if (e.id === 'sym' && st.phase === 'done') { Object.assign(st, blank('sym'), { seed: st.seed, owned: true }); repaint(e); }
    load(e);
  }
  V.you = function () {
    return sxScreen(you, { trailing: '<button class="nav-btn round" type="button" data-action="you-know" aria-label="' + esc(T('What I know about you', 'Mitä tiedän sinusta')) + '">' + ic('eye', 22) + '</button>' });
  };
  V.symptom = function () {
    return sxScreen(sym, { navTitle: T('Symptoms', 'Oireet'), trailing: '<a class="nav-btn round" href="#notes" aria-label="' + esc(T('My symptom notes', 'Oiremerkintäni')) + '">' + ic('note', 22) + '</a>' });
  };

  const eng = el => A.engines[el.getAttribute('data-e')] || you;
  A.actions['sx-pick'] = el => { answer(eng(el), el.getAttribute('data-v')); };
  A.actions['sx-marker'] = el => { const e = eng(el); answer(e, e.id === 'you' ? { $: el.getAttribute('data-m') } : ''); };
  A.actions['sx-back'] = el => {
    const e = eng(el), st = e.st;
    if (e.id === 'you') { const last = st.log[st.log.length - 1]; if (last) startEdit(e, last.q.id); } else replayBack(e);
  };
  A.actions['sx-edit'] = el => {
    const e = eng(el), id = el.getAttribute('data-q'), cur = A.current();
    if (cur && cur.name === e.route) startEdit(e, id); else { e.st.editNext = id; if (A.sheet.body()) A.sheet.close(true); openScreen(e); }
  };
  A.actions['sx-cancel'] = el => { const e = eng(el); if (e.st.busy) return; e.st.editing = null; repaint(e, { focus: true }); };
  A.actions['sx-confirm'] = el => {
    const e = eng(el), it = e.st.interaction;
    if (!it) return;
    if (e.id === 'sym') { saveNote(e); return; }
    if (it.type !== 'review_intake') return;
    act(e, async () => {
      const res = await send({ action: 'finish_intake', revision: it.revision, confirmed: true });
      e.accept(res);
      append(e, e.current(true).chat, { focus: true });
      touchNext(true);
    });
  };
  A.actions['sx-retry'] = el => { const e = eng(el); e.st.error = null; if (e.st.interaction) repaint(e); else load(e); };
  A.actions['sx-discard'] = el => {
    const e = eng(el);
    A.open.action({ title: T('Discard this note?', 'Hylätäänkö tämä merkintä?'), message: T('Nothing is saved as a note.', 'Mitään ei tallenneta merkinnäksi.'), actions: [{ label: T('Discard', 'Hylkää'), kind: 'destructive', run: () => discardNote(e) }] });
  };
  A.actions['sx-leave'] = () => { if (A.stackDepth() > 1) A.back(); else A.go('home'); };
  A.actions['sx-pause'] = el => {
    const e = eng(el);
    A.toast(e.id === 'sym' ? T('Saved. You can carry on from Home or Talk.', 'Tallennettu. Voit jatkaa etusivulta tai Keskustele-osiosta.') : T('Saved. You can pick up where you left off from Home or Profile.', 'Tallennettu. Voit jatkaa siitä, mihin jäit, etusivulta tai profiilista.'), 4500);
    if (e.id === 'you') touchNext(true);
    if (A.stackDepth() > 1) A.back(); else A.go('home');
  };
  A.actions['sx-copy'] = () => {
    const d = sym.st.saved;
    if (!d || !A.open || !A.open.noteText) return;
    const note = { ts: Date.now(), kind: 'symptom', topic: d.topic ? A.designTopic(d.topic) : 'general', symptoms: [d.label], when: d.onset ? symWord('onset', d.onset) : '', still: d.course ? symWord('course', d.course) : '', note: d.notes || '' };
    A.open.copy(A.open.noteText(note), T('Copied. Paste it into a message or bring it to your appointment.', 'Kopioitu. Liitä se viestiin tai ota se mukaan vastaanotolle.'));
  };
  A.actions['sx-row-add'] = el => {
    const form = el.closest('form'), rows = $('.sx-rows', form), st = you.st, q = st.editing ? st.editing.q : st.interaction;
    const count = $$('fieldset[data-row]', rows).length, max = +el.getAttribute('data-max') || 0;
    if (!q || (max && count >= max)) { A.toast(T('That is the most entries I can take.', 'Enempää merkintöjä en voi ottaa.')); return; }
    const n = +rows.getAttribute('data-next') || count;
    rows.setAttribute('data-next', String(n + 1));
    rows.insertAdjacentHTML('beforeend', listRow(q, n, null, true));
    numberRows(rows);
    const first = $('fieldset[data-row="' + n + '"] input, fieldset[data-row="' + n + '"] select', rows);
    if (first) first.focus();
  };
  A.actions['sx-row-del'] = el => {
    const rows = el.closest('.sx-rows'), row = el.closest('fieldset');
    if ($$('fieldset[data-row]', rows).length < 2) return;
    const next = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    numberRows(rows);
    const f = next && $('input, select', next);
    if (f) f.focus();
  };
  /* Rows are numbered by position. The remove link is only there while there is more than one. */
  function numberRows(rows) {
    const list = $$('fieldset[data-row]', rows);
    list.forEach((row, i) => { $('legend', row).textContent = T('Entry ', 'Merkintä ') + (i + 1); $('.link', row).hidden = list.length < 2; });
  }
  A.actions['sym-new'] = () => startNew(sym);
  /* A tap on a starter in Talk. */
  A.actions['sym-start'] = el => {
    const s = STARTERS[el.getAttribute('data-pick')];
    A.symStart(s ? s.topic : '', s ? T(s.en, s.fi) : '');
  };
  /* Starts a symptom conversation, optionally from a topic (a design topic id) and from words the person already wrote. */
  A.symStart = function (topic, text) {
    if (A.sheet && A.sheet.body && A.sheet.body()) A.sheet.close(true);
    ensureOwner();
    const st = sym.st;
    st.seed = { topic: A.apiTopic(topic), text: String(text || '').trim() };
    if (st.phase === 'done') Object.assign(st, blank('sym'), { seed: st.seed, owned: true });   // the last note is finished: this one is new
    openScreen(sym);
  };

  A.forms['sx-answer'] = form => {
    const e = eng(form), st = e.st, q = st.editing ? st.editing.q : st.interaction;
    if (!q || st.busy) return;
    clearError(form.closest('.screen'));
    const r = collect(e, q, form);
    if (r.error) { showError(e, r.error, r.input); return; }
    answer(e, r.skip ? (e.id === 'you' ? { $: 'skipped' } : '') : r.value);
  };
  A.changes['sx-answer'] = (el, form) => {
    if (el.type !== 'checkbox') { clearError(form.closest('.screen')); return; }
    if (!el.checked) return;
    const box = el.closest('.replies');
    if (!box) return;
    const exclusive = el.getAttribute('data-ex') === '1';
    $$('input[type="checkbox"]', box).forEach(o => { if (o !== el && (exclusive || o.getAttribute('data-ex') === '1')) o.checked = false; });
    const max = +box.getAttribute('data-max') || 0;
    if (max && $$('input:checked', box).length > max) {
      el.checked = false;
      showError(eng(form), T('You can choose up to ' + max + '.', 'Voit valita enintään ' + max + '.'), null);
    } else clearError(form.closest('.screen'));
  };
  A.inputs['sx-answer'] = (el, form) => {
    if (el.type === 'range') {
      const v = +el.value, box = $('[data-sc]', form);
      box.style.setProperty('--p', v * 10 + '%'); box.style.setProperty('--sc', scaleColor(v));
      $('#sx-n', form).textContent = v; $('#sx-w', form).textContent = scaleWord(v);
      el.setAttribute('aria-valuetext', scaleText(v));
    } else clearError(form.closest('.screen'));        // typing again answers the complaint about the last try
  };

  /* ================= what I know ================= */
  function knownLine() {
    const p = S.profile;
    if (!p) return '';
    const sexL = { female: T('female', 'nainen'), male: T('male', 'mies') }[p.sex] || '';
    return [T(A.age() + ' years old', A.age() + ' vuotta'), sexL, A.countyShort(p.county)].filter(Boolean).join(', ');
  }
  function knowHtml(count) {
    const here = you.st.log;
    const rows = here.map(p => '<div class="know-row"><span class="cell-b"><span class="cell-t">' + esc(p.q.title) + '</span><span class="cell-d">' + esc(p.label) + '</span></span>' +
      '<button class="btn sm ghost" type="button" data-action="you-edit" data-q="' + esc(p.q.id) + '">' + esc(T('Change', 'Muuta')) + '</button><button class="btn sm ghost" type="button" data-action="you-forget" data-q="' + esc(p.q.id) + '">' + esc(T('Forget', 'Unohda')) + '</button></div>').join('');
    const older = count == null ? 0 : Math.max(0, count - here.length);
    const notes = S.notes.filter(n => n.kind === 'symptom').slice(0, 3);
    return '<p class="body">' + esc(T('This is what I use to personalise your suggestions. It is saved on your account, and you can change or forget it.', 'Tämän perusteella räätälöin ehdotuksesi. Tiedot on tallennettu tilillesi, ja voit muuttaa tai unohtaa ne.')) + '</p>' +
      (S.profile ? '<div class="card"><p class="cap">' + esc(T('From your profile', 'Profiilistasi')) + '</p><div class="know-row"><span class="cell-b"><span class="cell-t">' + esc(T('Age, sex, county', 'Ikä, sukupuoli, maakunta')) + '</span><span class="cell-d">' + esc(knownLine()) + '</span></span><button class="btn sm ghost" type="button" data-action="you-go" data-to="edit">' + esc(T('Edit', 'Muokkaa')) + '</button></div></div>' : '') +
      '<div class="card"><p class="cap">' + esc(T('From our conversation', 'Keskustelustamme') + (count == null ? '' : ' · ' + T(count + ' answered', count + ' vastattu'))) + '</p>' + rows +
      (older ? '<p class="small">' + esc(savedLine(A.survey.complete() ? 'done' : 'more', older)) + '</p>' : '') +
      (!rows && !older ? '<p class="body">' + esc(T('Nothing yet. Answer a question and it shows up here.', 'Ei vielä mitään. Vastaa kysymykseen, niin se näkyy tässä.')) + '</p>' : '') + '</div>' +
      (notes.length ? '<div class="card"><p class="cap">' + esc(T('From your symptom notes', 'Oiremerkinnöistäsi')) + '</p>' + notes.map(n => '<div class="know-row"><span class="cell-b"><span class="cell-t">' + esc(n.symptoms.join(', ')) + '</span><span class="cell-d">' + esc(A.fmtDate(n.ts)) + '</span></span></div>').join('') + '<a class="link" href="#notes" data-action="you-go" data-to="notes">' + esc(T('See all notes', 'Katso kaikki merkinnät')) + '</a></div>' : '') +
      (S.checklog.length ? '<div class="card"><p class="cap">' + esc(T('From your self-checks', 'Omatarkkailustasi')) + '</p>' + S.checklog.slice(0, 3).map(r => '<div class="know-row"><span class="cell-b"><span class="cell-t">' + esc((A.CHECK_META[r.check] ? A.CHECK_META[r.check].name : r.check) + ': ' + (r.result === 'clear' ? T('nothing new', 'ei mitään uutta') : r.findings.join(', ') || T('found something', 'löysit jotain'))) + '</span><span class="cell-d">' + esc(A.fmtDate(r.ts)) + '</span></span></div>').join('') + '<a class="link" href="#results" data-action="you-go" data-to="results">' + esc(T('See all results', 'Katso kaikki tulokset')) + '</a></div>' : '') +
      '<div class="stack"><button class="btn danger block" type="button" data-action="you-forget-all">' + esc(T('Forget all my answers', 'Unohda kaikki vastaukseni')) + '</button><button class="btn ghost block" type="button" data-action="sheet-close">' + esc(T('Close', 'Sulje')) + '</button></div>';
  }
  async function knowSheet() {
    ensureOwner();
    A.sheet.open({ kicker: T('Get to know you', 'Tutustutaan sinuun'), title: T('What I know about you', 'Mitä tiedän sinusta'), large: true, html: knowHtml(null) });
    try {
      const { progress } = await A.api.survey.get();
      if (A.sheet.body()) A.sheet.setBody(knowHtml(Object.keys(progress.answers).length));
    } catch (error) { if (error && error.code === 'expired') signInAgain(error); }
  }
  A.actions['you-know'] = knowSheet;
  A.knowSheet = knowSheet;
  A.actions['you-go'] = el => { if (A.sheet.body()) A.sheet.close(true); A.go(el.getAttribute('data-to')); };
  A.actions['you-edit'] = el => { el.setAttribute('data-e', 'you'); A.actions['sx-edit'](el); };
  A.actions['you-forget'] = async el => {
    const id = el.getAttribute('data-q'), st = you.st;
    el.disabled = true;
    try {
      await putProgress(p => { const answers = { ...p.answers }; delete answers[id]; return { ...reopen(p), answers }; });
      st.log = st.log.filter(p => p.q.id !== id);
      st.interaction = null; st.phase = 'idle';
      A.toast(T('Forgotten.', 'Unohdettu.'));
      touchNext(false);
      knowSheet();
      if (A.current() && A.current().name === 'you') load(you);
    } catch (error) { el.disabled = false; if (error && error.code === 'expired') signInAgain(error); else A.fail(error); }
  };
  A.actions['you-forget-all'] = () => {
    A.open.action({ title: T('Forget all my answers?', 'Unohdetaanko kaikki vastaukseni?'), message: T('Your profile and notes stay. Only your answers to these questions are removed.', 'Profiilisi ja merkintäsi säilyvät. Vain vastauksesi näihin kysymyksiin poistetaan.'),
      actions: [{ label: T('Forget all answers', 'Unohda kaikki vastaukset'), kind: 'destructive', run: async () => {
        try {
          await putProgress(p => ({ ...reopen(p), answers: {}, acks: [] }));
          A.sx.you = blank('you'); intakeInfo = { done: 0, total: 0, complete: false };
          touchNext(true);
          A.toast(T('All answers forgotten.', 'Kaikki vastaukset unohdettu.'));
          if (A.current() && A.current().name === 'you') { repaint(you); load(you); }
        } catch (error) { if (error && error.code === 'expired') signInAgain(error); else A.fail(error); }
      } }] });
  };

  /* ================= Talk: the front door to all three conversations ================= */
  /* A note is half done when this page has seen the draft past its first question. After a reload the draft is only
     known once the screen has been opened, because asking for it from here would start an empty one on the server. */
  function symInProgress() {
    const st = sym.st, it = st.interaction;
    return !!it && st.phase === 'active' && (it.type === 'review_symptom' || (it.type === 'symptom_question' && it.step !== 'label'));
  }
  const STARTERS = {
    lump: { en: 'A lump or swelling', fi: 'Patti tai turvotus', chip: ['A lump', 'Patti'], topic: '' },
    pain: { en: 'Pain that will not go away', fi: 'Kipu, joka ei mene ohi', chip: ['Pain', 'Kipu'], topic: '' },
    bleed: { en: 'Bleeding or blood', fi: 'Verenvuoto tai verta', chip: ['Blood', 'Verta'], topic: '' },
    cough: { en: 'A cough or hoarse voice', fi: 'Yskä tai käheä ääni', chip: ['A cough', 'Yskä'], topic: '' },
    skin: { en: 'A mole or skin change', fi: 'Luomi- tai ihomuutos', chip: ['A mole or skin', 'Luomi tai iho'], topic: 'skin' },
    other: { en: '', fi: '', chip: ['Something else', 'Jotain muuta'], topic: '' }
  };
  function youCardBody() {
    const pr = A.survey.progress(), pct = Math.round(pr.done / Math.max(1, pr.total) * 100), complete = A.survey.complete();
    const text = complete ? T('All answered. Open it to carry on or look at what I know.', 'Kaikki vastattu. Avaa jatkaaksesi tai katsoaksesi, mitä tiedän.')
      : pr.total && pr.done >= pr.total ? T('All answered. Open it to look them over and confirm.', 'Kaikki vastattu. Avaa tarkistaaksesi ja vahvistaaksesi vastaukset.')
        : pr.done ? T(pr.done + ' of ' + pr.total + ' answered. Pause and continue any time.', pr.done + ' / ' + pr.total + ' vastattu. Voit pitää tauon ja jatkaa milloin vain.')
          : T('A short chat so I can suggest the right next steps.', 'Lyhyt keskustelu, jotta voin ehdottaa oikeita seuraavia askelia.');
    return '<p class="body">' + esc(text) + '</p><span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (complete ? 100 : pct) + '" aria-label="' + esc(T('Questions answered', 'Vastatut kysymykset')) + '"><i style="width:' + Math.max(4, complete ? 100 : pct) + '%"></i></span>';
  }
  V.talk = function () {
    ensureOwner();
    const sp = sym.progress(), inProg = symInProgress();
    let h = '<p class="lede" style="margin-top:-18px">' + esc(T('I can listen, ask the right questions, and answer yours. I do not diagnose.', 'Voin kuunnella, kysyä oikeat kysymykset ja vastata omiisi. En tee diagnooseja.')) + '</p>';
    h += '<section class="talk-card feel" aria-labelledby="tk-1"><span class="tk-i" aria-hidden="true">' + ic('heart', 24) + '</span><div class="cell-b"><p class="cap">' + esc(inProg ? T('In progress', 'Kesken') : T('Symptoms', 'Oireet')) + '</p><h2 class="h3" id="tk-1">' + esc(T('Talk about symptoms', 'Kerro oireista')) + '</h2>' +
      '<p class="body">' + esc(inProg ? T('You have a note half done: ' + sp.done + ' of ' + sp.total + ' steps. Pick up where you left off.', 'Sinulla on merkintä kesken: ' + sp.done + ' / ' + sp.total + ' vaihetta. Jatka siitä, mihin jäit.')
        : T('Something feel different? Tell me in your own words, or tap what fits. I will ask a few short questions and write it down.', 'Tuntuuko jokin erilaiselta? Kerro omin sanoin tai napauta sopiva. Kysyn muutaman lyhyen kysymyksen ja kirjoitan sen muistiin.')) + '</p>' +
      (inProg ? '<div class="btn-row"><a class="btn sm primary" href="#symptom">' + esc(A.t('cont')) + '</a><button class="btn sm ghost" type="button" data-action="sym-new">' + esc(T('Start a new one', 'Aloita uusi')) + '</button></div>'
        : '<div class="replies talk-starters" role="group" aria-label="' + esc(T('Start with', 'Aloita näistä')) + '">' + Object.keys(STARTERS).map(k => '<button class="rep" type="button" data-action="sym-start" data-pick="' + k + '">' + esc(T(...STARTERS[k].chip)) + '</button>').join('') + '</div>' +
          '<button class="btn sm primary" type="button" data-action="sym-start">' + ic('chat', 16) + ' ' + esc(T('Talk about something else', 'Kerro jostain muusta')) + '</button>') + '</div></section>';
    h += '<a class="talk-card you" href="#you"><span class="tk-i" aria-hidden="true">' + ic('user', 24) + '</span><div class="cell-b" id="tk-you"><p class="cap">' + esc(T('About you', 'Sinusta')) + '</p><h2 class="h3">' + esc(T('Get to know you', 'Tutustutaan sinuun')) + '</h2>' + youCardBody() + '</div>' + H.chev() + '</a>';
    h += '<a class="talk-card ask" href="#ask"><span class="tk-i" aria-hidden="true">' + ic('sparkle', 24) + '</span><div class="cell-b"><p class="cap">' + esc(T('Questions', 'Kysymykset')) + '</p><h2 class="h3">' + esc(T('Ask me anything', 'Kysy mitä tahansa')) + '</h2><p class="body">' + esc(T('About cancer or screening in Finland. Every answer shows its sources.', 'Syövästä tai seulonnasta Suomessa. Jokaisen vastauksen lähteet näytetään.')) + '</p></div>' + H.chev() + '</a>';
    const notes = S.notes.filter(n => n.kind === 'symptom').slice(0, 2);
    if (notes.length) {
      h += '<section class="sec">' + secH(T('Your recent notes', 'Viimeisimmät merkintäsi'), '<a class="link" href="#notes">' + esc(T('See all', 'Näytä kaikki')) + '</a>') + group(notes.map(n =>
        cell({ href: '#notes', lead: lead('note', 'o'), title: n.symptoms.join(', '), detail: A.fmtDate(n.ts) })), 'i') + '</section>';
    }
    h += '<p class="small">' + esc(D.COPY.disclaimer) + ' ' + esc(D.COPY.help) + '</p>';
    return { title: T('Talk', 'Keskustele'), large: T('Talk', 'Keskustele'), html: h, after: root => peek(root) };
  };
  /* The card for Get to know you shows the server's progress. Asking where the person is changes nothing. */
  let peeked = 0;
  async function peek(root) {
    if (Date.now() - peeked < 4000 || !S.account) return;
    peeked = Date.now();
    try {
      noteInfo((await send({ action: 'start_intake' })).interaction);
      const box = $('#tk-you', root), body = box && $('.body', box), bar = box && $('.bar', box);
      if (body && bar) { body.remove(); bar.remove(); box.insertAdjacentHTML('beforeend', youCardBody()); }
    } catch (error) { if (error && error.code === 'expired') signInAgain(error); }
  }

  /* ================= what the other screens still call ================= */
  /* The Profile screen in the prototype reads the intake's progress. It gets what the server last said: the question
     count from the last intake step this page saw, and whether the intake is finished from the server's next action.
     Once Profile reads A.S.next instead, this can go. */
  A.survey = {
    progress: () => ({ done: intakeInfo.done, total: intakeInfo.total }),
    complete: () => (S.next && S.next.nextAction ? S.next.nextAction.id !== 'complete_intake' : intakeInfo.complete)
  };
})();
