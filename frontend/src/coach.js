import { A as C4A } from "./app.js";

/* care4all coach: names, and the "See your health centre" sheet.
   The prototype's question banks, symptom engine and follow-up rules are gone: the server leads those conversations
   (sessions.js) and works out the next action itself (A.S.next, from /api/chat/next-action).
     A.tname, A.firstName   names for notes and greetings
     A.gpSheet              "See your health centre", opened from a suggestion to contact a professional */
(function () {
  'use strict';
  var A = C4A, D = A.D, S = A.S;
  var DAY = 864e5;

  A.tname = function (id) { return id === 'general' ? 'General' : (D.TOPICS[id] ? D.TOPICS[id].name : id); };
  A.firstName = function () { return (S.profile && S.profile.name) || ''; };

  /* ---------- see your health centre ---------- */
  function esc(x) { return A.esc(x); }
  function leave() { if (A.sheet && A.sheet.body && A.sheet.body()) A.sheet.close(true); }
  function recentNotes() {
    return S.notes.filter(function (n) { return n.kind === 'symptom' && n.still !== 'No, it has gone' && Date.now() - n.ts < 90 * DAY; });
  }
  function recentFindings() {
    return S.checklog.filter(function (r) { return r.result === 'change' && Date.now() - r.ts < 90 * DAY; });
  }
  A.gpSheet = function () {
    var recent = recentNotes(), found = recentFindings(), some = recent.length || found.length;
    var h = '<p class="body">' + esc(A.tr('Contact your health centre, occupational health clinic or a private clinic. You do not need to wait for a screening letter.', 'Ota yhteyttä terveyskeskukseen, työterveyteen tai yksityiselle klinikalle. Sinun ei tarvitse odottaa seulontakutsua.')) + '</p>' +
      '<p class="body"><b>' + esc(D.COPY.help) + '</b></p>';
    if (some) {
      h += '<div class="card"><p class="cap">' + esc(A.tr('What to tell them', 'Mitä kertoa')) + '</p><ul class="tick">' +
        recent.map(function (n) { return '<li>' + esc(n.symptoms.join(', ')) + (n.when ? ' <span class="muted">(' + esc(n.when.toLowerCase()) + ')</span>' : '') + '</li>'; }).join('') +
        found.map(function (r) { return '<li>' + esc((D.CHECK_META[r.check] || {}).name || r.check) + ': ' + esc(r.findings.join(', ') || r.other) + ' <span class="muted">(' + esc(A.fmtDate(r.ts)) + ')</span></li>'; }).join('') + '</ul></div>';
    }
    h += '<p class="small">' + esc(D.COPY.disclaimer) + '</p><div class="stack">' +
      (some ? '<button class="btn primary block" type="button" data-action="gp-copy">' + esc(A.tr('Copy my notes for the appointment', 'Kopioi muistiinpanoni vastaanottoa varten')) + '</button>' : '') +
      '<button class="btn ' + (some ? '' : 'primary ') + 'block" type="button" data-action="gp-remind">' + esc(A.tr('Remind me to book', 'Muistuta minua varaamaan aika')) + '</button>' +
      '<button class="btn ghost block" type="button" data-action="sheet-close">' + esc(A.tr('Close', 'Sulje')) + '</button></div>';
    A.sheet.open({ kicker: A.tr('Next step', 'Seuraava askel'), title: A.tr('See your health centre', 'Ota yhteyttä terveyskeskukseen'), html: h });
  };
  A.actions['gp-copy'] = function () {
    var l = recentNotes().map(A.open.noteText), cr = recentFindings().map(A.checkText);
    if (l.length || cr.length) A.open.copy(l.concat(cr).join('\n\n---\n\n'), A.tr('Copied. Paste it into a message or bring it to your appointment.', 'Kopioitu. Liitä se viestiin tai ota se mukaan vastaanotolle.'));
  };
  A.actions['gp-remind'] = function () { leave(); A.open.reminder('', { kind: 'gp', when: '2w' }); };
})();
