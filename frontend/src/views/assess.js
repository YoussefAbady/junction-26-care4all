import { A as C4A } from "../app.js";

/* The AI review of the intake answers (docs/ai-review.md). After "Get to know you" the person can agree to let an AI model
   ask up to three more questions and write a short review of risk factors worth raising with a professional.

   The server reads the saved answers itself and removes everything that could identify the person (name, username, exact
   date of birth, city and anything typed in their own words) before anything reaches the model. This screen therefore sends
   only the language, the person's agreement and the AI's own earlier questions with the option picked for each. It asks
   first, every time the page is opened. The transcript lives in memory only: nothing here is stored in the browser. */
(function () {
  'use strict';
  const A = C4A, S = A.S, esc = A.esc, ic = A.icon, V = A.views, $ = A.$;
  const K = () => A.conv;
  const T = (en, fi) => A.tr(en, fi);
  const MAX_QUESTIONS = 3;
  const PROVIDER = { gemini: 'Google Gemini', verda: 'Verda' };
  const lang = () => (S.prefs.lang === 'fi' ? 'fi' : 'en');

  /* phase: intro (asking for agreement), wait, asking, review, unavailable, error */
  const blank = () => ({ gen: 0, consent: false, phase: 'intro', history: [], question: null, review: null, error: '', retry: 'next' });
  const st = A.assess = blank();
  const reset = () => { const gen = st.gen + 1; Object.assign(st, blank(), { gen }); };
  if (A.resetters) A.resetters.push(reset);

  /* ---------- words ---------- */
  const INTRO = () => T(
    'I can look at your answers, ask up to three more questions and write a short review of risk factors that are worth raising with a healthcare professional. It is information, not a diagnosis.',
    'Voin tarkastella vastauksiasi, kysyä enintään kolme lisäkysymystä ja kirjoittaa lyhyen katsauksen riskitekijöistä, jotka kannattaa ottaa puheeksi terveydenhuollon ammattilaisen kanssa. Se on tietoa, ei diagnoosi.');
  const CONSENT = () => T(
    'To do this, your answers to the health questions are sent to Google Gemini, an AI model. Not sent: your name, username, exact date of birth, city and anything you typed in your own words. I do not keep the review or the extra questions, and Google handles the answers under its own terms. Please use made-up details in this demo.',
    'Tätä varten terveyskysymyksiin antamasi vastaukset lähetetään Google Geminille, tekoälymallille. Ei lähetetä: nimeäsi, käyttäjätunnustasi, tarkkaa syntymäaikaasi, kaupunkiasi eikä mitään, minkä kirjoitit omin sanoin. En tallenna katsausta enkä lisäkysymyksiä, ja Google käsittelee vastaukset omien ehtojensa mukaan. Käytä tässä demossa kuvitteellisia tietoja.');

  /* ---------- drawing ---------- */
  const ai = html => '<div class="msg-ai"><span class="who">' + esc(T('AI assistant', 'Tekoälyavustaja')) + '</span>' + html + '</div>';
  const user = text => '<div class="msg-user">' + esc(text) + '</div>';
  const wait = () => '<div class="msg-ai"><span class="who">' + esc(T('AI assistant', 'Tekoälyavustaja')) + '</span><span class="dots" role="img" aria-label="' + esc(T('Reading your answers', 'Luen vastauksiasi')) + '"><i></i><i></i><i></i></span></div>';
  const btn = (action, label, cls, extra) => '<button class="btn ' + cls + '" type="button" data-action="' + action + '"' + (extra || '') + '>' + esc(label) + '</button>';

  function reviewHtml(r) {
    const g = r.generated, passages = r.passages || [];
    const model = PROVIDER[g.provider] ? ' (' + PROVIDER[g.provider] + ')' : '';
    const basis = passages.length
      ? '<details class="sx-how ans-ctx"><summary>' + esc(T('What this review is based on', 'Mihin katsaus perustuu')) + '</summary>' +
        passages.map(p => '<div class="ans-pass">' + (p.items || []).map(t => '<p>' + esc(t) + '</p>').join('') + '</div>').join('') + '</details>'
      : '';
    return ai('<div class="ans-gen"><span class="status-pill ans-st ans-ai">' + ic('sparkle', 14) + esc(T('Written by AI', 'Tekoälyn kirjoittama')) + '</span>' + K().textHtml(g.text) +
      '<p class="small">' + esc(T('Written from your answers and the sources below' + model + '. It is information, not a diagnosis, and AI can make mistakes, so please check it.',
        'Kirjoitettu vastaustesi ja alla olevien lähteiden pohjalta' + model + '. Se on tietoa, ei diagnoosi, ja tekoäly voi erehtyä, joten tarkista se.')) + '</p>' +
      K().sourceChips([].concat(...passages.map(p => p.sources || []))) + basis + '</div>' +
      (r.safety && r.safety.text ? '<div class="ans-safety"><p class="small">' + esc(r.safety.text) + '</p>' + K().sourceChips(r.safety.source ? [r.safety.source] : []) + '</div>' : ''));
  }

  function chatHtml() {
    let h = ai('<p>' + esc(INTRO()) + '</p>');
    if (st.phase === 'intro') h += ai('<p>' + esc(CONSENT()) + '</p>');
    for (const item of st.history) h += ai('<p>' + esc(item.q) + '</p>') + user(item.label);
    if (st.phase === 'asking' && st.question) h += ai('<p id="as-q">' + esc(st.question.title) + '</p>');
    if (st.phase === 'wait') h += wait();
    if (st.phase === 'review' && st.review) h += reviewHtml(st.review);
    if (st.phase === 'unavailable') h += ai('<p>' + esc(T('The AI review is not available right now. Your answers are saved, and you can try again later.', 'Tekoälykatsaus ei ole juuri nyt käytettävissä. Vastauksesi on tallennettu, ja voit yrittää myöhemmin uudelleen.')) + '</p>');
    if (st.phase === 'error') h += '<div class="msg-ai ans-err" role="alert"><span class="who">' + esc(T('AI assistant', 'Tekoälyavustaja')) + '</span><p>' + esc(st.error) + '</p></div>';
    return h;
  }

  function barHtml() {
    switch (st.phase) {
      case 'intro':
        return '<div class="btn-row">' + btn('as-yes', T('Yes, review my answers with AI', 'Kyllä, tarkista vastaukseni tekoälyllä'), 'primary') + btn('as-no', T('Not now', 'Ei nyt'), 'ghost') + '</div>';
      case 'asking': {
        const n = st.history.length + 1;
        return '<p class="small reply-n">' + esc(T('Question ' + n + ' of up to ' + MAX_QUESTIONS, 'Kysymys ' + n + ' / enintään ' + MAX_QUESTIONS)) + '</p>' +
          '<div class="replies" role="group" aria-labelledby="as-q">' +
          st.question.options.concat([{ id: 'unsure', label: T('Not sure', 'En ole varma') }]).map(o => '<button class="rep" type="button" data-action="as-pick" data-v="' + esc(o.id) + '">' + esc(o.label) + '</button>').join('') + '</div>';
      }
      case 'review':
        return '<div class="btn-row"><a class="btn primary sm" href="#home">' + esc(T('Done', 'Valmis')) + '</a>' + btn('as-ask', T('Ask a question', 'Kysy kysymys'), 'tint sm') + '</div>';
      case 'unavailable':
        return '<div class="btn-row">' + btn('as-retry', T('Try again', 'Yritä uudelleen'), 'primary sm') + '<a class="btn ghost sm" href="#home">' + esc(T('Back to home', 'Takaisin etusivulle')) + '</a></div>';
      case 'error':
        return '<div class="btn-row">' + btn('as-retry', T('Try again', 'Yritä uudelleen'), 'primary sm') + '<a class="btn ghost sm" href="#home">' + esc(T('Back to home', 'Takaisin etusivulle')) + '</a></div>';
      default:
        return '';
    }
  }

  const rootEl = () => { const list = document.querySelectorAll('.screen[data-name="assess"]'); return list.length ? list[list.length - 1] : null; };
  function repaint() {
    const root = rootEl();
    const chat = root && $('#as-chat', root), bar = root && $('#as-bar', root);
    if (!chat || !bar) return;
    chat.innerHTML = chatHtml();
    bar.innerHTML = barHtml();
    const sc = $('.scroller', root);
    if (!sc) return;
    // A finished review is read from its first line. Everything else follows the end of the conversation.
    const last = chat.lastElementChild;
    if (st.phase === 'review' && last) { let top = 0; for (let n = last; n && n !== sc; n = n.offsetParent) top += n.offsetTop; sc.scrollTop = Math.max(0, top - 64); }
    else sc.scrollTop = sc.scrollHeight;
  }

  /* ---------- talking to the server ---------- */
  /* One step: "next" asks for the next question, "review" for the written review. History holds only what the AI asked and
     which option was picked. Anything else the server needs, it reads from the saved answers itself. */
  async function step(kind) {
    const gen = st.gen;
    st.phase = 'wait'; st.retry = kind;
    repaint();
    try {
      const res = await A.api.assess.send({ language: lang(), step: kind, history: st.history.map(h => ({ q: h.q, options: h.options, a: h.a })) });
      if (gen !== st.gen) return;
      if (kind === 'next') {
        const q = res && res.kind === 'question' ? cleanQuestion(res.question) : null;
        if (q && st.history.length < MAX_QUESTIONS) { st.question = q; st.phase = 'asking'; }
        else { await step('review'); return; }
      } else if (res && res.kind === 'review' && res.generated && typeof res.generated.text === 'string' && res.generated.text.trim()) {
        st.review = res; st.phase = 'review';
      } else st.phase = 'unavailable';
    } catch (error) {
      if (gen !== st.gen) return;
      if (error && error.code === 'expired') { K().signInAgain(error); return; }
      st.error = A.errorText(error); st.phase = 'error';
    }
    repaint();
  }
  function cleanQuestion(q) {
    if (!q || typeof q.title !== 'string' || !Array.isArray(q.options)) return null;
    const options = q.options.filter(o => o && typeof o.id === 'string' && typeof o.label === 'string' && o.id !== 'unsure').slice(0, 6);
    return q.title.trim() && options.length >= 2 ? { title: q.title.trim(), options } : null;
  }
  function pick(id) {
    const q = st.question;
    if (st.phase !== 'asking' || !q) return;
    const found = q.options.find(o => o.id === id);
    if (!found && id !== 'unsure') return;
    st.history.push({ q: q.title, options: q.options, a: id, label: found ? found.label : T('Not sure', 'En ole varma') });
    st.question = null;
    step(st.history.length >= MAX_QUESTIONS ? 'review' : 'next');
  }

  /* ---------- the screen ---------- */
  V.assess = function () {
    K().ensureOwner();
    const title = T('AI review', 'Tekoälykatsaus');
    return {
      title, large: title,
      html: '<div class="chat" id="as-chat" role="log" aria-live="polite" aria-label="' + esc(T('Conversation: AI review', 'Keskustelu: tekoälykatsaus')) + '">' + chatHtml() + '</div>' +
        '<div class="composer-bar reply" id="as-bar" aria-label="' + esc(T('Your answer', 'Vastauksesi')) + '">' + barHtml() + '</div>',
      onShow(root) { const sc = $('.scroller', root); if (sc) sc.scrollTop = sc.scrollHeight; }
    };
  };

  A.actions['assess-open'] = () => A.go('assess');
  /* The agreement is for this page only. It is asked again when the page is opened again. */
  A.actions['as-yes'] = () => { st.consent = true; step('next'); };
  A.actions['as-no'] = () => A.go('home');
  A.actions['as-pick'] = el => pick(el.getAttribute('data-v'));
  A.actions['as-retry'] = () => { if (st.consent) step(st.retry === 'review' || st.history.length >= MAX_QUESTIONS ? 'review' : 'next'); };
  A.actions['as-ask'] = () => A.openAsk('');
})();
