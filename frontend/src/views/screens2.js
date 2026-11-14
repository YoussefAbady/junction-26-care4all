import { A as C4A } from "../app.js";

/* care4all views, part 2: next steps and the illustrated screening walkthroughs. Same return shape as screens.js.
   The conversation screens live in sessions.js and views/ask.js. Consent and privacy are in views/account.js. */
(function () {
  'use strict';
  var A = C4A, D = A.D, S = A.S, esc = A.esc, tr = A.tr, ic = A.icon, V = A.views, H = A.vh;
  var chips = H.chips, footer = H.footer, secH = H.secH;

  /* ---------- next steps ---------- */
  /* The next action and the suggestions come from the backend (S.next). They point to places and questions.
     They never say whether someone is invited to a screening, or what a symptom is. */
  V.next = function () {
    var nx = S.next, h = '<p class="lede" style="margin-top:-18px">' + esc(tr('Your next step comes from what you have saved in your account. It is a suggestion, not a diagnosis.', 'Seuraava askeleesi perustuu tilillesi tallentamiisi tietoihin. Se on ehdotus, ei diagnoosi.')) + '</p>';
    if (!nx || !nx.nextAction) {
      h += '<div class="empty"><span class="ic o" aria-hidden="true">' + ic('info', 28) + '</span><h2 class="h3">' + esc(tr('Your next step is not available right now', 'Seuraava askeleesi ei ole nyt saatavilla')) + '</h2>' +
        '<p class="body">' + esc(tr('Check your connection and try again.', 'Tarkista yhteytesi ja yritä uudelleen.')) + '</p><button class="btn primary" type="button" data-action="next-retry">' + esc(tr('Try again', 'Yritä uudelleen')) + '</button></div>';
    } else {
      h += H.nextCard(nx);
      if (nx.suggestedTopics && nx.suggestedTopics.length) {
        h += '<section class="sec" aria-labelledby="more-h">' + secH(tr('More ways to continue', 'Lisää tapoja jatkaa'), '', 'more-h') + H.suggestChips(nx.suggestedTopics) + '</section>';
      }
      h += '<details class="sx-how"><summary>' + esc(tr('Why am I seeing this?', 'Miksi näen tämän?')) + '</summary><p class="small">' +
        esc(tr('care4all looks at what you have saved: whether you have finished getting to know you, and any symptom note or self-check you saved. It then points you to a place to continue. It does not decide whether you are invited to a screening, how urgent something is, or what it is.', 'care4all katsoo tallentamiasi tietoja: oletko täyttänyt esitiedot ja oletko tallentanut oiremerkinnän tai omatarkkailun tuloksen. Sen jälkeen se ehdottaa paikkaa, josta jatkaa. Se ei päätä, kutsutaanko sinut seulontaan, kuinka kiireellistä jokin on tai mistä on kyse.')) + '</p></details>';
    }
    return { title: 'Next steps', large: 'Your next steps', html: h + footer() };
  };
  A.actions['next-retry'] = function () {
    A.svc.loadNext().then(function () { A.refresh(); }, function (error) { A.fail(error); });
  };

  /* ---------- screening walkthrough ---------- */
  var ART_OPTS = {
    breast: { next: '2 years', items: ['Extra pictures', 'Ultrasound'] },
    cervical: { next: '5 years', items: ['Repeat test', 'A closer look'] },
    bowel: { next: '2 years', items: ['A colonoscopy'] }
  };
  V.how = function (id) {
    var T = D.TOPICS[id], J = D.JOURNEYS && D.JOURNEYS[id];
    if (!T || !J) return V.notfound();
    var name = A.sname(id), o = ART_OPTS[id] || {}, h = '';
    h += '<header class="t-hero" data-t="' + id + '"><span class="glyph-bg" aria-hidden="true">' + A.organ(id, 230) + '</span><p class="cap">Step by step</p><h1 class="large" id="h">How ' + esc(name.toLowerCase()) + ' works</h1>' +
      '<p class="lede">' + esc(J.intro) + '</p>' + chips(J.src.slice(0, 3)) + '</header>';
    h += '<section class="card up" aria-label="How you are invited"><p class="cap">How you are invited</p><p class="h3">By invitation letter</p><p class="body">Your invitation letter tells you whether and when you are invited. Taking part is free and your choice.</p>' +
      '<div class="btn-row"><button class="btn sm tint" type="button" data-action="reminder-new" data-topic="' + id + '" data-kind="letter" data-when="3m">Remind me to look out for my letter</button></div></section>';
    h += '<ol class="tl" aria-label="The steps">' + J.steps.map(function (s, i) {
      return '<li class="tl-item" id="step-' + (i + 1) + '" data-t="' + id + '"><span class="tl-n" aria-hidden="true">' + (i + 1) + '</span><div class="tl-card">' +
        '<figure class="tl-art">' + A.art.render(s.art, s.h, o) + '</figure><p class="cap">Step ' + (i + 1) + ' of ' + J.steps.length + '</p><h2 class="h3">' + esc(s.h) + '</h2><p class="body">' + esc(s.t) + '</p>' +
        (s.tip ? '<p class="look"><span class="cap">Good to know</span>' + esc(s.tip) + '</p>' : '') + chips([s.src]) + '</div></li>';
    }).join('') + '</ol>';
    h += '<section class="card" data-t="' + id + '" aria-labelledby="bd-h"><figure class="tl-art">' + A.art.render('j-benefits', 'Benefits and downsides side by side') + '</figure><p class="cap">Both sides, honestly</p><h2 class="h3" id="bd-h">Benefits and downsides</h2>' +
      '<p class="cap" style="margin-top:6px">Benefits</p><ul class="tick">' + J.benefits.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<p class="cap" style="margin-top:6px">Downsides</p><ul class="tick warn">' + J.downsides.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' + chips(J.src) + '</section>';
    h += '<section class="card see" aria-labelledby="un-h"><p class="cap">Not sure about going?</p><h2 class="h3" id="un-h">It is your choice</h2><p class="body">' + esc(J.unsure) + '</p>' +
      '<div class="btn-row"><button class="btn sm primary" type="button" data-action="reminder-new" data-topic="' + id + '" data-kind="letter" data-when="3m">Set a reminder</button><button class="btn sm tint" type="button" data-action="ask-open" data-ctx="' + id + '">Ask a question</button></div></section>';
    h += '<p class="small">Booking, timing and how results reach you differ between counties and providers. Your letter has the details for you. ' + esc(D.COPY.help) + '</p>' + footer();
    return { title: name, html: h, hero: true, navAt: 150 };
  };
})();
