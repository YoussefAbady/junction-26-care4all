import { A } from "./app.js";
import "./pdf.js";
import "./styles/monitor.css";

/* care4all doctor: a short PDF (or text) summary to hand to, or share with, a doctor (design v2, section 8).
   It is made on this device, in this file, from data the app already holds: the symptom notes with their monitor updates, the
   self-check findings, age, sex and region from the profile, and, if the person ticks it, the interview answers (read through
   A.api.interview.get() when the sheet opens). The first name is left out unless they tick it. This file sends nothing anywhere
   (it makes no request of its own) and writes nothing to browser storage: the PDF only leaves if the person saves or shares it.
     A.doctorChoices()  A.doctorBlocks(o)  A.doctorPdf(o)  A.doctorText(o)  A.doctorFileName()  A.deliverPdf(bytes, name, mode)
     A.canSharePdf()  A.open.doctorPdf(noteId)
   o is { ids: [note ids], chk: bool (self-checks), bg: bool (interview answers), name: bool }. */

const DAY = 864e5;
const esc = s => A.esc(s);
const tr = (en, fi, sv) => A.tr(en, fi, sv);
const lang = () => (A.S.prefs && A.S.prefs.lang === "fi" ? "fi" : "en");
const lt = v => (v && typeof v === "object" ? String((v[lang()] != null ? v[lang()] : v.en) || "") : v == null ? "" : String(v));
const M = () => A.D.MONITOR || {};
const dict = key => M()[key] || {};
const GONE_STILL = "No, it has gone"; /* the text state/store.js gives a note whose course is "gone" */

/* The interview answers, read when the sheet opens. In memory only: forgotten when the person leaves. */
let interviewRows = [];
A.resetters.push(() => { interviewRows = []; });

/* ---------- what could go in it ---------- */
const recentNotes = () => A.S.notes.filter(n => n.kind === "symptom" && Date.now() - n.ts < 90 * DAY && n.still !== GONE_STILL).slice(0, 6);
const recentFindings = () => A.S.checklog.filter(r => r.result === "change" && Date.now() - r.ts < 90 * DAY).slice(0, 6);
/** The answered interview turns that have a value (not "not sure" or "prefer not to say") as [question, answer in words]. */
function rowsOf(interview) {
  return ((interview && interview.turns) || []).filter(t => t.answer && t.answer.value !== undefined && t.answer.label).map(t => [t.title, t.answer.label]);
}
A.doctorChoices = () => ({ notes: recentNotes(), finds: recentFindings(), bg: interviewRows });
/** Test hook and loader: the rows the "answers" option uses. */
A.doctorSetInterview = interview => { interviewRows = rowsOf(interview); return interviewRows; };

/* ---------- the content, as blocks that both the PDF and the text copy use ---------- */
const checkName = id => { const m = (A.D.CHECK_META || {})[id]; return m ? m.name : ""; };
const outLabel = n => {
  const log = n.monitor && n.monitor.log, last = log && log.length ? log[log.length - 1] : null;
  return last && ["emergency", "doctor", "watch"].indexOf(last.result) > -1 ? lt(dict("OUT")[last.result]) : "";
};
const courseOf = id => (dict("DOCTOR_TREND_WORD")[id] ? lt(dict("DOCTOR_TREND_WORD")[id]) : id === "comes" ? tr("comes and goes", "tulee ja menee") : id === "unsure" ? tr("not sure", "en ole varma") : String(id || ""));
const flagWord = id => lt(dict("FLAG_WORD")[id]) || (((M().FLAGS || []).filter(f => f.id === id)[0] || {}).label ? lt((M().FLAGS || []).filter(f => f.id === id)[0].label) : id);
const outOf10 = v => v + tr(" out of 10", " / 10");

function noteBlock(n) {
  const m = n.monitor, watched = !!(m && m.log && m.log.length);
  const rows = [[tr("Noted on", "Kirjattu"), A.fmtDate(n.ts)]];
  if (n.when) rows.push([tr("First noticed", "Huomasin ensimmäisen kerran"), n.when]);
  if (n.still) rows.push([n.trend ? tr("Still there", "Onko vielä") : tr("Since then", "Sen jälkeen"), n.still]);
  if (n.where && n.where.length) rows.push([tr("Where", "Missä"), n.where.join(", ")]);
  if (n.trend) rows.push([tr("Since then", "Sen jälkeen"), n.trend]);
  if (n.level != null) rows.push([tr("How strong", "Voimakkuus"), outOf10(n.level) + (watched ? tr(" (latest)", " (viimeisin)") : "")]);
  (n.details || []).forEach(x => { const k = String(x).indexOf(": "); rows.push(k > 0 ? [String(x).slice(0, k), String(x).slice(k + 2)] : [tr("Detail", "Lisätieto"), x]); });
  if (n.note) rows.push([tr("Note", "Huomautus"), n.note]);
  const out = outLabel(n);
  if (out) rows.push([tr("care4all suggested", "care4all ehdotti"), out]);
  const b = { t: "note", title: n.symptoms.join(", "), rows };
  if (m && (watched || m.level0 != null)) {
    const rs = [];
    if (m.level0 != null || m.trend0) rs.push([A.fmtDate(m.start), tr("First note", "Ensimmäinen merkintä") + (m.trend0 ? ": " + courseOf(m.trend0) : ""), m.level0 != null ? m.level0 + " / 10" : "", ""]);
    m.log.forEach(e => {
      rs.push([A.fmtDate(e.ts), lt(dict("DOCTOR_TREND_WORD")[e.trend]) || e.trend, e.level != null ? e.level + " / 10" : "", (e.flags || []).map(flagWord).join("; ")]);
    });
    b.updates = { head: [tr("Date", "Päivä"), tr("Compared with before", "Verrattuna aiempaan"), tr("How strong", "Voimakkuus"), tr("Anything new", "Jotain uutta")], rows: rs, widths: [90, 150, 70, 150] };
  }
  return b;
}
function findingBlock(r) {
  const what = (r.findings && r.findings.length ? r.findings.join("; ") : r.other) || tr("Something unusual", "Jotain epätavallista");
  const rows = [[tr("Date", "Päivä"), A.fmtDate(r.ts)], [tr("What I found", "Mitä löysin"), what]];
  if (r.side && r.side !== "unsure") rows.push([tr("Side", "Puoli"), r.side.charAt(0).toUpperCase() + r.side.slice(1)]);
  if (r.other && r.findings && r.findings.length) rows.push([tr("In my words", "Omin sanoin"), r.other]);
  return { t: "note", title: checkName(r.check) || tr("Self-check", "Omatarkkailu"), rows };
}
A.doctorBlocks = function (o) {
  o = o || {};
  const p = A.S.profile || {}, ids = o.ids || [], notes = A.S.notes.filter(n => ids.indexOf(n.id) > -1 && n.kind === "symptom");
  const finds = o.chk ? recentFindings() : [], bg = o.bg ? interviewRows : [], B = [];
  B.push({ t: "title", text: tr("Notes for my appointment", "Muistiinpanot vastaanottoa varten"), sub: tr("Prepared on ", "Laadittu ") + A.fmtDate(Date.now()) + tr(" with care4all", " care4allilla") });
  const about = [];
  if (o.name && p.name) about.push([tr("Name", "Nimi"), p.name]);
  const sex = dict("SEX");
  about.push([tr("Age", "Ikä"), A.age() + tr(" years", " vuotta")], [tr("Sex registered at birth", "Syntymässä rekisteröity sukupuoli"), lt(sex[p.sex] || sex.none)]);
  if (p.county) about.push([tr("Region", "Alue"), A.countyShort(p.county)]);
  B.push({ t: "h2", text: tr("About me", "Minusta") }, { t: "kv", rows: about });
  const glance = notes.map(n => n.symptoms.join(", ") + " (" + tr("noted ", "kirjattu ") + A.fmtDate(n.ts) + (n.trend ? ", " + n.trend.toLowerCase() : "") + (n.level != null ? ", " + outOf10(n.level) : "") + ")" +
    (n.monitor && n.monitor.log.length ? ", " + n.monitor.log.length + (n.monitor.log.length > 1 ? tr(" updates", " päivitystä") : tr(" update", " päivitys")) + tr(" while watching", " seurannan aikana") : ""))
    .concat(finds.map(r => tr("Self-check, ", "Omatarkkailu, ") + (checkName(r.check) || tr("self-check", "omatarkkailu")).toLowerCase() + " (" + A.fmtDate(r.ts) + "): " + ((r.findings && r.findings.length ? r.findings.join("; ") : r.other) || tr("something unusual", "jotain epätavallista")).toLowerCase()));
  if (glance.length) B.push({ t: "h2", text: tr("At a glance", "Pähkinänkuoressa") }, { t: "box", title: tr("What I want to talk about", "Mistä haluan puhua"), lines: glance });
  if (notes.length) { B.push({ t: "h2", text: tr("What I have noticed", "Mitä olen huomannut") }); notes.forEach(n => { B.push(noteBlock(n)); }); }
  if (finds.length) { B.push({ t: "h2", text: tr("What I found in self-checks", "Mitä löysin omatarkkailussa") }); finds.forEach(r => { B.push(findingBlock(r)); }); }
  if (bg.length) B.push({ t: "h2", text: tr("Background I have shared", "Jakamani taustatiedot") }, { t: "kv", rows: bg });
  B.push({ t: "h2", text: tr("My questions and notes from the appointment", "Kysymykseni ja muistiinpanoni vastaanotolta") }, { t: "ruled", n: 7 });
  B.push({ t: "small", text: tr("A personal record made by me with care4all. care4all gives information and does not diagnose. This page is not a medical record, and what it says comes only from my own answers.",
    "Henkilökohtainen muistiinpano, jonka olen tehnyt care4allilla. care4all antaa tietoa eikä tee diagnooseja. Tämä sivu ei ole potilasasiakirja, ja se perustuu vain omiin vastauksiini.") });
  return B;
};

/* ---------- the PDF ---------- */
A.doctorPdf = function (o) {
  const title = tr("Notes for my appointment", "Muistiinpanot vastaanottoa varten");
  const d = A.pdf.doc({
    title, running: title, continued: tr("continued", "jatkuu"), pageWord: tr("Page", "Sivu"), ofWord: tr("of", "/"),
    footer: tr("Made by me with care4all. A personal record, not a diagnosis.", "Tehty care4allilla. Henkilökohtainen muistiinpano, ei diagnoosi."),
  });
  A.doctorBlocks(o).forEach(b => {
    if (b.t === "title") d.title(b.text, b.sub);
    else if (b.t === "h2") d.h2(b.text);
    else if (b.t === "kv") d.kv(b.rows).space(6);
    else if (b.t === "box") d.box(b.title, b.lines);
    else if (b.t === "ruled") d.ruled(b.n);
    else if (b.t === "small") d.space(10).p(b.text, { size: 8.5, color: A.pdf.colors.gray });
    else if (b.t === "note") {
      d.h3(b.title); d.kv(b.rows);
      if (b.updates) { d.space(4).p(tr("Updates while watching", "Päivitykset seurannan aikana"), { size: 9.5, bold: true, color: A.pdf.colors.gray }); d.table(b.updates.head, b.updates.rows, b.updates.widths); }
      d.space(8);
    }
  });
  return d.build();
};
/* the same content as plain text, to copy */
A.doctorText = function (o) {
  const out = [];
  A.doctorBlocks(o).forEach(b => {
    if (b.t === "title") out.push(b.text.toUpperCase(), b.sub, "");
    else if (b.t === "h2") out.push("", b.text.toUpperCase());
    else if (b.t === "kv") b.rows.forEach(r => { out.push(r[0] + ": " + r[1]); });
    else if (b.t === "box") b.lines.forEach(l => { out.push("- " + l); });
    else if (b.t === "note") {
      out.push("", b.title); b.rows.forEach(r => { out.push("  " + r[0] + ": " + r[1]); });
      if (b.updates) { out.push("  " + tr("Updates while watching", "Päivitykset seurannan aikana") + ":"); b.updates.rows.forEach(r => { out.push("    " + r[0] + ": " + r[1] + (r[2] ? ", " + r[2] : "") + (r[3] ? ", " + tr("new: ", "uutta: ") + r[3] : "")); }); }
    } else if (b.t === "small") out.push("", b.text);
  });
  return out.join("\n");
};
A.doctorFileName = function () {
  const d = new Date(), p = x => (x < 10 ? "0" : "") + x;
  return "care4all-for-my-doctor-" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + ".pdf";
};

/* ---------- getting the file to the person ---------- */
function viaAnchor(bytes, name) {
  try {
    const u = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), a = document.createElement("a");
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => { URL.revokeObjectURL(u); }, 4000);
    return true;
  } catch { return false; }
}
function canShareFile(bytes, name) {
  try {
    if (!navigator.share || !navigator.canShare) return null;
    const f = new File([bytes], name, { type: "application/pdf" });
    return navigator.canShare({ files: [f] }) ? f : null;
  } catch { return null; }
}
A.canSharePdf = () => !!canShareFile(new Uint8Array([37, 80, 68, 70]), "a.pdf");
/* mode "share" opens the phone's share sheet (mail, messages, ...); otherwise the file is saved. Answers "shared", "saved", "declined" or "unavailable". */
A.deliverPdf = function (bytes, name, mode) {
  if (mode === "share") {
    const f = canShareFile(bytes, name);
    if (f) return navigator.share({ files: [f], title: tr("Notes for my appointment", "Muistiinpanot vastaanottoa varten") }).then(() => "shared", e => (e && e.name === "AbortError" ? "declined" : "unavailable"));
  }
  return Promise.resolve(viaAnchor(bytes, name) ? "saved" : "unavailable");
};

/* ---------- the sheet ---------- */
function noteOpt(n, checked) {
  const upd = n.monitor && n.monitor.log.length ? " · " + n.monitor.log.length + (n.monitor.log.length > 1 ? tr(" updates", " päivitystä") : tr(" update", " päivitys")) : "";
  const out = outLabel(n);
  return '<label class="find-opt"><input type="checkbox" name="n" value="' + esc(n.id) + '"' + (checked ? " checked" : "") + '><span class="find-box" aria-hidden="true"></span><span class="find-t">' + esc(n.symptoms.join(", ")) +
    "<small>" + esc(A.fmtDate(n.ts) + upd + (out ? " · " + out : "")) + "</small></span></label>";
}
function bgOption(count) {
  if (!count) return "";
  return '<label class="find-opt"><input type="checkbox" name="bg"><span class="find-box" aria-hidden="true"></span><span class="find-t">' + esc(tr("My answers to the interview questions", "Vastaukseni haastattelun kysymyksiin")) +
    "<small>" + esc(count + (count > 1 ? tr(" answers", " vastausta") : tr(" answer", " vastaus")) + tr(". Off unless you tick it", ". Pois päältä, ellet valitse sitä")) + "</small></span></label>";
}
function sheetHtml(first) {
  const c = A.doctorChoices();
  if (!c.notes.length && !c.finds.length) {
    return '<div class="stack" style="gap:14px"><p class="body">' + esc(tr("There is nothing to put in it yet. Talk about a symptom first, or record what you find in a self-check, and I will add it here.",
      "Mukaan ei ole vielä mitään laitettavaa. Kerro ensin oireesta tai kirjaa omatarkkailussa löytämäsi, niin lisään sen tähän.")) + "</p>" +
      '<button class="btn primary block" type="button" data-action="mon-log">' + esc(tr("Talk about symptoms", "Kerro oireista")) + "</button></div>";
  }
  const ord = c.notes.slice().sort((a, b) => (a.id === first ? -1 : 0) - (b.id === first ? -1 : 0));
  const share = A.canSharePdf();
  return '<form class="form" data-form="docpdf" novalidate><p class="body">' + esc(tr("A short summary you can hand to your doctor or send to them, so you do not have to remember everything. It is made on this device from what is saved in your account. Making it sends nothing anywhere, and it only leaves if you save or share it.",
    "Lyhyt yhteenveto, jonka voit antaa lääkärillesi tai lähettää hänelle, jotta sinun ei tarvitse muistaa kaikkea. Se tehdään tällä laitteella tilillesi tallennetuista tiedoista. Sen tekeminen ei lähetä mitään minnekään, ja se poistuu laitteelta vain, jos tallennat tai jaat sen.")) + "</p>" +
    '<fieldset class="find-set"><legend class="cap">' + esc(tr("What to put in it", "Mitä laitetaan mukaan")) + "</legend>" + ord.map(n => noteOpt(n, true)).join("") +
    (c.finds.length ? '<label class="find-opt"><input type="checkbox" name="chk" checked><span class="find-box" aria-hidden="true"></span><span class="find-t">' + esc(tr("What I found in self-checks", "Mitä löysin omatarkkailussa")) + "<small>" + c.finds.length + esc(c.finds.length > 1 ? tr(" results", " tulosta") : tr(" result", " tulos")) + "</small></span></label>" : "") +
    '<span id="doc-bg">' + bgOption(c.bg.length) + "</span></fieldset>" +
    '<fieldset class="find-set"><legend class="cap">' + esc(tr("About me", "Minusta")) + '</legend><label class="find-opt"><input type="checkbox" name="name"><span class="find-box" aria-hidden="true"></span><span class="find-t">' + esc(tr("My first name", "Etunimeni")) +
    "<small>" + esc(tr("Off unless you tick it. Age, sex and region are always on it.", "Pois päältä, ellet valitse sitä. Ikä, sukupuoli ja alue ovat aina mukana.")) + "</small></span></label></fieldset>" +
    '<p class="err" id="e-doc" hidden></p>' +
    '<div class="stack"><button class="btn primary block" type="submit">' + A.icon("download", 18) + " " + esc(tr("Save as PDF", "Tallenna PDF-tiedostona")) + "</button>" +
    (share ? '<button class="btn block" type="button" data-action="doc-share">' + A.icon("send", 18) + " " + esc(tr("Share with my doctor…", "Jaa lääkärilleni…")) + "</button>" : "") +
    '<button class="btn ghost block" type="button" data-action="doc-copy">' + esc(tr("Copy as text instead", "Kopioi tekstinä")) + "</button></div>" +
    '<p class="fnote" style="text-align:center">' + esc(tr("A PDF only leaves this device if you save or share it.", "PDF poistuu tältä laitteelta vain, jos tallennat tai jaat sen.")) + "</p></form>";
}
A.open = A.open || {};
A.open.doctorPdf = function (first) {
  A.sheet.open({ kicker: tr("See your doctor", "Lääkärikäynti"), title: tr("PDF for my doctor", "PDF lääkärilleni"), html: sheetHtml(first) });
  /* The interview answers are the account's own and are read, not sent. They are offered once they arrive. */
  if (!A.api || !A.api.interview) return;
  A.api.interview.get().then(r => {
    interviewRows = rowsOf(r && r.interview);
    const slot = A.$("#doc-bg");
    if (slot && !slot.innerHTML) slot.innerHTML = bgOption(interviewRows.length);
  }, () => {});
};
A.actions["doc-pdf"] = el => A.open.doctorPdf(el.getAttribute("data-id") || "");
A.actions["mon-log"] = () => { if (A.sheet.body()) A.sheet.close(true); if (A.open.log) A.open.log(); };

function readOpts(f) {
  return { ids: A.$$('input[name="n"]:checked', f).map(i => i.value), chk: !!A.$('input[name="chk"]:checked', f), bg: !!A.$('input[name="bg"]:checked', f), name: !!A.$('input[name="name"]:checked', f) };
}
function run(f, mode) {
  const o = readOpts(f), err = A.$("#e-doc", f);
  if (!o.ids.length && !o.chk) { err.hidden = false; err.textContent = tr("Tick at least one thing to put in it.", "Valitse ainakin yksi asia mukaan."); return; }
  err.hidden = true;
  if (mode === "copy") { A.open.copy(A.doctorText(o), tr("Copied. Paste it into a message or bring it to your appointment.", "Kopioitu. Liitä se viestiin tai ota se mukaan vastaanotolle.")); return; }
  const bytes = A.doctorPdf(o), name = A.doctorFileName();
  A.deliverPdf(bytes, name, mode).then(r => {
    if (r === "saved") A.toast(tr("PDF saved. You can share it with your doctor.", "PDF tallennettu. Voit jakaa sen lääkärillesi."), 5000);
    else if (r === "shared") A.toast(tr("Shared.", "Jaettu."));
    else if (r === "declined") A.toast(tr("Not saved.", "Ei tallennettu."));
    else { err.hidden = false; err.textContent = tr("This view cannot save files. Open care4all in its own browser tab to save the PDF, or copy it as text.", "Tämä näkymä ei voi tallentaa tiedostoja. Avaa care4all omalla selainvälilehdellään tallentaaksesi PDF:n tai kopioi se tekstinä."); }
  });
}
A.forms.docpdf = f => { run(f, "save"); };
A.actions["doc-share"] = el => { const f = el.closest("form"); if (f) run(f, "share"); };
A.actions["doc-copy"] = el => { const f = el.closest("form"); if (f) run(f, "copy"); };
