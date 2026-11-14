import { A as C4A } from "../app.js";

/* The Ask tab: grounded answers from the backend.

   A question goes to POST /api/chat through A.api.chat.send. The server answers from its reviewed passages and names a
   source for each one, so this screen only draws what comes back: the passages with their links, the next steps,
   the safety notice, the person's own saved information that was taken into account, questions to take to a
   professional, and where to go next. The transcript lives in memory only. Nothing typed here is stored in the
   browser, and the server does not keep chat messages either.

   For a general question the server can have an AI model write the answer from the passages it found. That answer comes
   as `generated` and is drawn under a "Written by AI" label, with the source links in view and the passages it was
   written from one tap away. The model is sent only the typed question and public passages, never saved information
   (see intro() and the privacy notice, which say so in plain words).

   Helpers shared with the other two conversation screens (language, source links, errors, the emergency card) are in
   A.conv, defined in sessions.js. They are looked up when used, so the order of the two files does not matter. */
(function () {
  'use strict';
  const A = C4A, S = A.S, esc = A.esc, ic = A.icon, V = A.views, $ = A.$;
  const K = () => A.conv;
  const T = (en, fi) => A.tr(en, fi);

  /* The conversation: { log, ctx, pending, topic, sugg, busy, gen }. screens.js made the first three for the prototype. */
  A.chat = A.chat || { log: [], ctx: '', pending: '' };
  Object.assign(A.chat, { topic: undefined, sugg: [], hush: false, busy: false, gen: 0 });

  /* ---------- example questions, shown until the first answer brings suggestions of its own ---------- */
  const EXAMPLES_FI = {
    breast: ['Milloin saan kutsun mammografiaan?', 'Mitä rintojen muutoksia kannattaa tutkituttaa?', 'Mitä rintasyöpäseulonta on?'],
    cervical: ['Voinko ottaa kohdunkaulan näytteen kotona?', 'Onko kohdunkaulan seulonta ilmaista?', 'Mitä HPV on?'],
    bowel: ['Miten FIT-ulostenäyte toimii?', 'Keitä kutsutaan suolistosyöpäseulontaan?', 'Mitä oireita suolistosyöpä aiheuttaa?'],
    skin: ['Mitkä luomet kannattaa näyttää lääkärille?', 'Ketkä ovat suuremmassa melanoomariskissä?', 'Mitä ihosyöpä on?'],
    prostate: ['Onko Suomessa eturauhassyövän seulontaa?', 'Mitä eturauhassyövän oireita on?', 'Mitkä ovat eturauhassyövän riskitekijät?'],
    testicular: ['Mitä kivessyövän oireita on?', 'Miten kivekset tarkistetaan itse?', 'Mitkä ovat kivessyövän riskitekijät?']
  };
  const DEFAULT_FI = ['Miten voin pienentää syöpäriskiäni?', 'Mitä syöpäseulonta tarkoittaa?', 'Mitä syöpä on?', 'Mistä saan syöpäneuvontaa?'];
  const examples = ctx => (S.prefs.lang === 'fi' ? (EXAMPLES_FI[ctx] || DEFAULT_FI) : A.suggestions(ctx));

  /* ---------- drawing one message ---------- */
  const STATUS = {
    awareness_only: ['Awareness information', 'Yleistä tietoa'],
    programme_information: ['Programme information', 'Ohjelmatietoa'],
    unavailable: ['Not available here', 'Ei saatavilla tässä']
  };
  /* For these kinds the message is a heading ("Colorectal cancer"). For the others it is a sentence. */
  const HEADED = new Set(['education', 'general', 'additional']);
  const who = () => '<span class="who">' + esc(T('AI assistant', 'Tekoälyavustaja')) + '</span>';

  function intro() {
    return '<div class="msg-ai">' + who() + '<p>' + esc(T(
      'Hi. I answer questions about cancer and cancer screening in Finland, using reviewed sources that I show with each answer. I do not diagnose.',
      'Hei. Vastaan kysymyksiin syövästä ja syöpäseulonnoista Suomessa tarkistettujen lähteiden pohjalta ja näytän lähteet jokaisen vastauksen yhteydessä. En tee diagnooseja.')) + '</p>' +
      '<p>' + esc(T(
      'An AI model, Google Gemini, can write the answer from the reviewed source passages that match your question. Then it is sent only your typed question and those public passages: no account details, saved information or notes. Each answer says when an AI wrote it. I do not keep what you type, and Google handles the question under its own terms, so please do not type personal details.',
      'Tekoälymalli, Google Gemini, voi kirjoittaa vastauksen kysymykseesi sopivien tarkistettujen lähdekatkelmien pohjalta. Silloin sille lähetetään vain kirjoittamasi kysymys ja nämä julkiset katkelmat: ei tilitietoja, tallennettuja tietoja eikä muistiinpanoja. Jokaisessa vastauksessa kerrotaan, kun tekoäly on sen kirjoittanut. En tallenna kirjoittamaasi, ja Google käsittelee kysymyksen omien ehtojensa mukaan, joten älä kirjoita henkilötietoja.')) + '</p>' +
      '<p class="small">' + esc(T('This is a demo. Please use made-up details.', 'Tämä on demo. Käytä kuvitteellisia tietoja.')) + '</p></div>';
  }

  const passageText = p => (p.items || []).map(t => '<p>' + esc(t) + '</p>').join('');
  function passage(p) {
    const label = STATUS[p.status] ? '<span class="status-pill ans-st">' + esc(T(...STATUS[p.status])) + '</span>' : '';
    return '<div class="ans-pass">' + label + passageText(p) + K().sourceChips(p.sources) + '</div>';
  }

  /* An answer an AI model wrote from the passages the server found. It says so, the source links stay in view, and the
     passages it was written from are one tap away. The text is plain (the server refuses markdown and links), so each line
     is a paragraph and nothing more. */
  const PROVIDER = { gemini: 'Google Gemini', verda: 'Verda' };
  function generatedHtml(g, passages) {
    const paragraphs = String(g.text).split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (!paragraphs.length) return '';
    const model = PROVIDER[g.provider] ? ' (' + PROVIDER[g.provider] + ')' : '';
    const sources = [].concat(...passages.map(p => p.sources || []));
    const basis = passages.length
      ? '<details class="sx-how ans-ctx"><summary>' + esc(T('What this answer is based on', 'Mihin vastaus perustuu')) + '</summary>' +
        passages.map(p => '<div class="ans-pass">' + passageText(p) + '</div>').join('') + '</details>'
      : '';
    return '<div class="ans-gen"><span class="status-pill ans-st ans-ai">' + ic('sparkle', 14) + esc(T('Written by AI', 'Tekoälyn kirjoittama')) + '</span>' +
      K().textHtml(g.text) +
      '<p class="small">' + esc(T('Written from the sources below' + model + '. AI can make mistakes, so please check them.', 'Kirjoitettu alla olevien lähteiden pohjalta' + model + '. Tekoäly voi erehtyä, joten tarkista ne.')) + '</p>' +
      K().sourceChips(sources) + basis + '</div>';
  }

  const SEX = { female: ['Female', 'Nainen'], male: ['Male', 'Mies'], intersex: ['Intersex', 'Intersukupuolinen'], other: ['Other', 'Muu'], declined: ['Prefers not to say', 'Ei halua kertoa'], none: ['Not specified', 'Ei määritelty'] };

  /* What the answer took into account. It is the person's own saved information, so it is kept apart from the answer. */
  function contextHtml(ctx) {
    if (!ctx) return '';
    const rows = [];
    const dm = ctx.demographics || {};
    if (dm.birthYear != null) rows.push([T('Year of birth', 'Syntymävuosi'), String(dm.birthYear)]);
    if (dm.age != null) rows.push([T('Age', 'Ikä'), String(dm.age)]);
    if (dm.sex) rows.push([T('Sex', 'Sukupuoli'), SEX[dm.sex] ? T(...SEX[dm.sex]) : String(dm.sex)]);
    if (dm.region && A.countyShort(dm.region)) rows.push([T('County', 'Maakunta'), A.countyShort(dm.region)]);
    for (const s of ctx.survey || []) rows.push([s.label, Array.isArray(s.value) ? s.value.join(' · ') : String(s.value)]);
    for (const o of ctx.observations || []) {
      const date = o.date ? (o.dateKind === 'observed' ? T('Noticed ', 'Havaittu ') : T('Logged ', 'Kirjattu ')) + o.date : '';
      rows.push([o.label, [date, o.notes].filter(Boolean).join(' · ')]);
    }
    if (!rows.length) return '';
    return '<details class="sx-how ans-ctx"><summary>' + esc(T('Saved information considered', 'Huomioidut tallennetut tiedot')) + '</summary>' +
      '<p class="small">' + esc(T('Reported by you. I use it only to suggest what to raise with a professional.', 'Sinun kertomaasi. Käytän sitä vain ehdottamaan, mitä kannattaa ottaa puheeksi ammattilaisen kanssa.')) + '</p>' +
      '<dl class="ans-dl">' + rows.map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl></details>';
  }
  /* A reply that carries a conversation to start: the person asked to be asked questions, so offer the screen for it. */
  function goHtml(it) {
    if (!it) return '';
    const sym = /symptom/.test(it.type);
    return '<div class="ans-go"><p class="small">' + esc(sym
      ? T('I can ask a few short questions and help you write it down. Nothing is saved until you review it.', 'Voin kysyä muutaman lyhyen kysymyksen ja auttaa kirjaamaan asian. Mitään ei tallenneta ennen kuin tarkistat sen.')
      : T('It is a short conversation, saved as you go. You can pause at any time.', 'Se on lyhyt keskustelu, joka tallentuu sitä mukaa. Voit pitää tauon milloin vain.')) + '</p>' +
      '<button class="btn sm primary" type="button" data-action="ask-go" data-to="' + (sym ? 'symptom' : 'you') + '">' + esc(sym ? T('Talk about symptoms', 'Kerro oireista') : T('Get to know you', 'Tutustutaan sinuun')) + '</button></div>';
  }

  function answerHtml(d, i) {
    if (d.kind === 'emergency') return K().emergencyHtml(d, who());
    const parts = [];
    const written = d.generated && typeof d.generated.text === 'string' ? generatedHtml(d.generated, d.passages || []) : '';
    /* When no topic was recognised the server's own sentence says it has no sourced answer. A written answer contradicts
       that, so it is not shown above one. */
    const apology = written && (d.kind === 'clarify' || d.kind === 'unsupported');
    if (d.message && !apology) parts.push(HEADED.has(d.kind) ? '<p class="ans-title">' + esc(d.message) + '</p>' : '<p>' + esc(d.message) + '</p>');
    else if (d.interaction) parts.push('<p>' + esc(T('Happy to. That works best as a short conversation of its own.', 'Mielelläni. Se toimii parhaiten omana lyhyenä keskusteluna.')) + '</p>');
    if (written) parts.push(written);
    else for (const p of d.passages || []) parts.push(passage(p));
    if ((d.nextSteps || []).length) parts.push('<div class="ans-steps"><p class="cap">' + esc(T('Next steps', 'Seuraavat askeleet')) + '</p>' + d.nextSteps.map(passage).join('') + '</div>');
    parts.push(goHtml(d.interaction));
    if (d.safety) parts.push('<div class="ans-safety"><p class="small">' + esc(d.safety.text) + '</p>' + K().sourceChips([d.safety.source]) + '</div>');
    parts.push(contextHtml(d.patientContext));
    if ((d.questionsForProfessional || []).length) {
      parts.push('<div class="ans-q"><p class="cap">' + esc(T('Questions you could ask a professional', 'Kysymyksiä, joita voit esittää ammattilaiselle')) + '</p><ul class="tick">' +
        d.questionsForProfessional.map(q => '<li>' + esc(q) + '</li>').join('') + '</ul></div>');
    }
    if (d.shareText) parts.push('<button class="btn sm ghost" type="button" data-action="ask-copy" data-i="' + i + '">' + esc(T('Copy answer and sources', 'Kopioi vastaus ja lähteet')) + '</button>');
    return '<div class="msg-ai" data-kind="' + esc(d.kind || '') + '">' + who() + parts.join('') + '</div>';
  }

  function errorHtml(m, i) {
    return '<div class="msg-ai ans-err" role="alert">' + who() + '<p>' + esc(m.text) + '</p><div class="btn-row"><button class="btn sm primary" type="button" data-action="ask-retry" data-i="' + i + '">' +
      esc(T('Try again', 'Yritä uudelleen')) + '</button></div></div>';
  }
  function chatMsg(m, i) {
    if (m.role === 'user') return '<div class="msg-user">' + esc(m.text) + '</div>';
    return m.error ? errorHtml(m, i) : answerHtml(m.data, i);
  }
  const waitHtml = () => '<div class="msg-ai" id="chat-wait">' + who() + '<span class="dots" role="img" aria-label="' + esc(T('Looking through the sources', 'Selaan lähteitä')) + '"><i></i><i></i><i></i></span></div>';

  /* ---------- suggestions: the server's own, or example questions until there are any ---------- */
  function suggestionsHtml() {
    const c = A.chat;
    if (c.hush) return '';                    // after an emergency answer nothing competes with the call button
    if (c.sugg.length) {
      return c.sugg.map(s => {
        if (s.r === undefined) s.r = K().reg(s.request);
        return '<button class="chip' + (s.focus ? ' focus' : '') + '" type="button" data-action="conv-go" data-r="' + s.r + '">' + esc(s.label) + '</button>';
      }).join('');
    }
    return examples(c.ctx).map(q => '<button class="chip" type="button" data-action="ask-suggest" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('');
  }
  /* The assistant's own continuation first, then the alternatives. The server sends up to three, the first of them twice. */
  function suggestionsFrom(d) {
    if (d.kind === 'emergency') return [];
    const focus = d.conversationFocus, list = (d.suggestedTopics || []).filter(s => !focus || s.id !== focus.id);
    return (focus ? [{ ...focus, focus: true }] : []).concat(list).filter(s => s && s.label && s.request);
  }

  /* ---------- the screen ---------- */
  const rootEl = () => { const list = document.querySelectorAll('.screen[data-name="ask"]'); return list.length ? list[list.length - 1] : null; };
  const scroller = () => { const r = rootEl(); return r && $('.scroller', r); };
  function toEnd() { const sc = scroller(); if (sc) sc.scrollTop = sc.scrollHeight; }
  /* A long answer is read from its first line, a short one is shown whole. The layout position is used, not the drawn one:
     a bubble that is still animating in is scaled, and that would put its top edge in the wrong place. */
  function toAnswer(el) {
    const sc = scroller();
    if (!sc || !el) return;
    if (el.offsetHeight < sc.clientHeight - 180) { toEnd(); return; }
    let top = 0;
    for (let n = el; n && n !== sc; n = n.offsetParent) top += n.offsetTop;
    sc.scrollTop = Math.max(0, top - 64);
  }

  V.ask = function () {
    K().ensureOwner();
    const c = A.chat;
    const note = S.prefs.lang === 'sv' ? '<p class="note">Svar ges på engelska eller finska. Svenska frågor besvaras på engelska.</p>' : '';
    const html = note + '<div class="chat" id="chat" role="log" aria-live="polite" aria-label="' + esc(T('Conversation', 'Keskustelu')) + '">' + intro() +
      c.log.map(chatMsg).join('') + (c.busy ? waitHtml() : '') + '</div>' +
      '<div class="composer-bar"><div class="sugg hscroll" id="chat-sug" role="group" aria-label="' + esc(T('Suggested questions', 'Ehdotettuja kysymyksiä')) + '">' + suggestionsHtml() + '</div>' +
      '<form class="composer" data-form="ask-in" data-keep><div class="box"><label class="sr" for="chat-q">' + esc(A.t('askQ')) + '</label>' +
      '<input id="chat-q" name="q" type="text" maxlength="1500" autocomplete="off" enterkeyhint="send" placeholder="' + esc(T('Ask about cancer or screening', 'Kysy syövästä tai seulonnasta')) + '">' +
      '<button class="send" type="submit" aria-label="' + esc(T('Send question', 'Lähetä kysymys')) + '"' + (c.busy ? ' disabled' : '') + '>' + ic('send', 20) + '</button></div></form></div>';
    return {
      title: A.t('ask'), large: A.t('ask'), html,
      trailing: '<button class="nav-btn txt" type="button" data-action="ask-clear"' + (c.log.length ? '' : ' hidden') + '>' + esc(T('Clear', 'Tyhjennä')) + '</button>',
      onShow(root) {
        const sc = $('.scroller', root);
        if (sc) sc.scrollTop = sc.scrollHeight;
        if (c.pending) { const q = c.pending; c.pending = ''; ask(q); }
      }
    };
  };

  /* ---------- asking ---------- */
  /* A short follow-up carries the topic of the last answer, and so does the first question after a topic screen. */
  function topicFor(text) {
    const c = A.chat;
    if (!c.topic) return undefined;
    const noAnswerYet = !c.log.some(m => m.role === 'ai' && m.data);
    return noAnswerYet || text.split(/\s+/).length <= 8 ? c.topic : undefined;
  }

  function paintQuestion(text) {
    const chat = $('#chat');
    if (!chat) return;
    chat.insertAdjacentHTML('beforeend', '<div class="msg-user">' + esc(text) + '</div>' + waitHtml());
    const send = $('.composer .send', rootEl()); if (send) send.disabled = true;
    const clear = $('[data-action="ask-clear"]', rootEl()); if (clear) clear.hidden = false;
    toEnd();
  }
  function paintReply(index) {
    const root = rootEl(), chat = $('#chat', root);
    if (!chat) return;
    const wait = $('#chat-wait', chat);
    if (wait) wait.remove();
    chat.insertAdjacentHTML('beforeend', chatMsg(A.chat.log[index], index));
    const sug = $('#chat-sug', root); if (sug) sug.innerHTML = suggestionsHtml();
    const send = $('.composer .send', root); if (send) send.disabled = false;
    toAnswer(chat.lastElementChild);
  }

  async function ask(question) {
    const k = K(), c = A.chat;
    k.ensureOwner();
    const text = String(question || '').trim().slice(0, 1500);
    if (!text || c.busy) return;
    const gen = c.gen;
    c.busy = true;
    c.log.push({ role: 'user', text });
    paintQuestion(text);
    let reply;
    try {
      const body = { message: text };
      const topic = topicFor(text);
      if (topic) body.topic = topic;
      const data = await A.api.chat.send({ language: k.lang(), ...body });
      reply = { role: 'ai', data };
    } catch (error) {
      if (gen !== c.gen) return;
      if (error && error.code === 'expired') { c.busy = false; k.signInAgain(error); return; }
      reply = { role: 'ai', error: true, text: k.errText(error), retry: text };
    }
    if (gen !== c.gen) return;               // the conversation was cleared while this was on its way
    c.busy = false;
    c.hush = false;
    if (reply.data) {
      c.topic = A.apiTopic(reply.data.topic);
      c.sugg = suggestionsFrom(reply.data);
      c.hush = reply.data.kind === 'emergency';
    }
    c.log.push(reply);
    paintReply(c.log.length - 1);
  }

  /* Opens the Ask tab, optionally with a question to send and the topic it is about (a design topic id). */
  function openAsk(q, ctx) {
    const c = A.chat;
    K().ensureOwner();
    if (ctx !== undefined && (ctx || '') !== c.ctx) { c.ctx = ctx || ''; c.topic = A.apiTopic(c.ctx); c.sugg = []; }
    const cur = A.current();
    if (cur && cur.name === 'ask') {
      const sug = $('#chat-sug', rootEl()); if (sug) sug.innerHTML = suggestionsHtml();
      if (q) ask(q); else { const input = $('#chat-q', rootEl()); if (input) input.focus(); }
      return;
    }
    c.pending = q || '';
    A.go('ask');
    /* A new screen asks the pending question when it opens. When the shell goes back to an Ask screen that is already
       in the stack it does not open it again, so check a moment later whether the question is still waiting. */
    setTimeout(() => {
      const now = A.current();
      if (c.pending && now && now.name === 'ask') { const p = c.pending; c.pending = ''; ask(p); }
    }, 80);
  }
  A.openAsk = openAsk;
  /* Sends a question in the Ask tab, opening the tab first when another screen is showing. */
  A.chatAsk = q => { const cur = A.current(); if (cur && cur.name === 'ask') ask(q); else openAsk(q); };

  /* ---------- actions ---------- */
  A.actions['ask-open'] = el => openAsk(el.getAttribute('data-q') || '', el.getAttribute('data-ctx') || '');
  A.actions['ask-suggest'] = el => { ask(el.getAttribute('data-q')); };
  A.actions['ask-clear'] = () => {
    const c = A.chat;
    c.gen++;
    Object.assign(c, { log: [], topic: A.apiTopic(c.ctx), sugg: [], hush: false, busy: false });
    const root = rootEl();
    if (root) {
      const chat = $('#chat', root); if (chat) chat.innerHTML = intro();
      const sug = $('#chat-sug', root); if (sug) sug.innerHTML = suggestionsHtml();
      const send = $('.composer .send', root); if (send) send.disabled = false;
      const clear = $('[data-action="ask-clear"]', root); if (clear) clear.hidden = true;
      const input = $('#chat-q', root); if (input) input.focus();
    }
    A.announce(T('Conversation cleared', 'Keskustelu tyhjennetty'));
  };
  A.actions['ask-copy'] = el => {
    const m = A.chat.log[+el.getAttribute('data-i')];
    if (m && m.data && m.data.shareText) A.open.copy(m.data.shareText, T('Copied with the source links.', 'Kopioitu lähdelinkkeineen.'));
  };
  A.actions['ask-retry'] = el => {
    const c = A.chat, i = +el.getAttribute('data-i'), m = c.log[i];
    if (!m || !m.retry || c.busy) return;
    c.log.splice(i - 1, 2);                  // the question and the failure message, both drawn again by ask()
    const chat = $('#chat', rootEl());
    if (chat) chat.innerHTML = intro() + c.log.map(chatMsg).join('');
    ask(m.retry);
  };
  A.actions['ask-go'] = el => { if (el.getAttribute('data-to') === 'symptom') A.symStart(''); else A.go('you'); };

  A.forms['ask-in'] = form => {
    const input = form.elements.q;
    if (A.chat.busy || !input.value.trim()) return;
    const text = input.value;
    input.value = '';
    ask(text);
    input.focus();
  };
})();
