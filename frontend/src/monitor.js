import { A } from "./app.js";
import "./styles/monitor.css";

/* care4all monitor: close monitoring of a symptom that was NOT sent to a doctor (design v2, section 7).
   A watch is kept by the server (/api/monitors). A symptom note can start one, the app asks for an update on the days the
   server's rules name (a reminder, and a "Close monitoring" next step when one is due), and each update is evaluated BY THE
   SERVER: this module never decides a level. It posts trend, level, flags and serious, and shows the result it gets back
   (level, the why lines, the urgency). The steps, trends, flags, the serious wording and the texts come from A.D.MONITOR.
   Mirrors the design's names:
     A.monitorActive(n)  A.monitored()  A.monitorWhen(ts)  A.MONITOR_STEPS  A.remLabel(r)  A.monitorLines(n)  A.monitorItems(act)
     A.monitorStart(n)  A.monitorStop(n, status)  A.monitorSnooze(id)  A.monitorSave(n, input)   (these four talk to the server and return promises)
     A.open.checkin(id)   the check-in sheet
   Also: A.monitorLoad() reads GET /api/monitors into S.monitors, A.monitorOffer(n) is the "Watch this closely" entry for a note's menu,
   A.monitorDo(verb, arg) runs the design's follow-up verbs checkin, monsnooze, gp and pdf.
   The shape of a watch on a note (n.monitor, built by state/store.js) is { id, status, start, due, level0, trend0, log: [{ ts, trend, level, flags, result }] }
   with times in milliseconds. Nothing here writes browser storage. */

const DAY = 864e5;
const GONE_STILL = "No, it has gone"; /* the text state/store.js gives a note whose course is "gone" */

const esc = s => A.esc(s);
const tr = (en, fi, sv) => A.tr(en, fi, sv);
const ic = (name, size) => A.icon(name, size);
const lang = () => (A.S.prefs && A.S.prefs.lang === "fi" ? "fi" : "en");
/** A { en, fi } leaf in the language of the screen (Swedish uses English). A plain string stays as it is. */
const lt = v => (v && typeof v === "object" ? String((v[lang()] != null ? v[lang()] : v.en) || "") : v == null ? "" : String(v));
const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (all, k) => (vars && vars[k] != null ? vars[k] : all));

/* ---------- the server's configuration ---------- */
let loaded = null; /* the config of GET /api/monitors, used when the content payload has no MONITOR */
const M = () => A.D.MONITOR || {};
const cfg = () => {
  const m = M(), c = loaded || {};
  return { steps: m.STEPS || c.steps || [], trends: m.TRENDS || c.trends || [], flags: m.FLAGS || c.flags || [], serious: m.SERIOUS || c.serious || null };
};
const copy = (key, vars) => fill(lt((M().COPY || {})[key]), vars);
const trendWord = id => lt((M().TREND_WORD || {})[id]) || id;
/** The course a note was saved with (same, worse, better, comes, unsure) in words. */
const courseWord = id => (M().TREND_WORD && M().TREND_WORD[id] ? trendWord(id) : id === "comes" ? tr("comes and goes", "tulee ja menee") : id === "unsure" ? tr("not sure", "en ole varma") : String(id || ""));
const flagLabel = id => { const f = cfg().flags.filter(x => x.id === id)[0]; return f ? lt(f.label) : id; };
const flagWord = id => lt((M().FLAG_WORD || {})[id]) || flagLabel(id);

Object.defineProperty(A, "MONITOR_STEPS", { configurable: true, enumerable: true, get: () => cfg().steps.slice() });

/* ---------- watches on notes ---------- */
const ms = iso => { const t = Date.parse(iso); return Number.isNaN(t) ? 0 : t; };
/** The server's item of /api/monitors as the design's shape on a note. */
function shape(item) {
  return {
    id: item.id, status: item.status, start: ms(item.startedAt), due: ms(item.dueAt),
    level0: item.level0 == null ? null : item.level0, trend0: item.trend0 || "",
    log: (item.checkins || []).map(c => ({ ts: ms(c.ts), trend: c.trend, level: c.level == null ? null : c.level, flags: (c.flags || []).slice(), result: c.result })),
  };
}
const noteById = id => A.S.notes.filter(n => n.id === id)[0];
const isActive = n => !!n && n.kind === "symptom" && !!n.monitor && n.monitor.status === "active";
A.monitorActive = isActive;
A.monitored = () => A.S.notes.filter(isActive).sort((a, b) => a.monitor.due - b.monitor.due);
const label = n => n.symptoms.join(", ").toLowerCase();
const day = n => Math.max(0, Math.floor((Date.now() - n.monitor.start) / DAY));
const when = ts => {
  try { return new Intl.DateTimeFormat(A.locale(), { weekday: "short", day: "numeric", month: "short" }).format(new Date(ts)); } catch { return A.fmtDate(ts); }
};
A.monitorWhen = when;

/** Puts what the server says about a watch on S.monitors and on its note. */
function apply(item) {
  const S = A.S;
  S.monitors = (S.monitors || []).filter(m => m.id !== item.id && m.observationId !== item.observationId);
  S.monitors.push(item);
  S.monitors.sort((a, b) => ms(b.startedAt) - ms(a.startedAt));
  const n = noteById(item.observationId);
  if (n) n.monitor = shape(item);
}
/** After a reload of the notes and reminders, a note or a reminder that lost its watch gets it back from S.monitors. */
function attach() {
  const S = A.S, list = S.monitors || [], byNote = {};
  list.forEach(m => { byNote[m.observationId] = m; });
  S.notes.forEach(n => { const m = byNote[n.id]; if (m && !n.monitor) n.monitor = shape(m); });
  S.reminders.forEach(r => {
    if (r.monitor || r.kind !== "recheck" || r.status !== "active") return;
    const m = list.filter(x => x.status === "active" && ms(x.dueAt) === r.due)[0];
    if (m) r.monitor = m.observationId;
  });
}
/** Reads the notes and the reminders again (the server changed both) and redraws. */
function sync() {
  const calls = [];
  if (A.svc.loadObservations) calls.push(A.svc.loadObservations());
  if (A.svc.loadReminders) calls.push(A.svc.loadReminders());
  return Promise.all(calls).catch(() => {}).then(() => attach());
}
const redraw = () => { try { A.refresh(true); } catch { /* the screen is gone */ } };

A.monitorLoad = function () {
  return A.api.monitors.list().then(r => {
    A.S.monitors = (r.monitors || []).slice();
    if (r.config) loaded = r.config;
    attach();
    return A.S.monitors;
  });
};
A.resetters.push(() => { loaded = null; A.S.monitors = []; });

/* A watch is started, snoozed, stopped and updated on the server. Each call answers with the watch, which is put on its note. */
A.monitorStart = function (n) {
  if (!n) return Promise.resolve(null);
  if (isActive(n)) return Promise.resolve(n.monitor);
  return A.api.monitors.send({ action: "start", observationId: n.id }).then(r => {
    apply(r.monitor);
    return sync().then(() => { const x = noteById(n.id); return x ? x.monitor : null; });
  });
};
A.monitorStop = function (n, status) {
  if (!n || !n.monitor || n.monitor.status !== "active") return Promise.resolve();
  /* Only "stop" exists on the server. A note that was marked gone is resolved by the server itself, so reading it again is enough. */
  if (status && status !== "stopped") return sync();
  return A.api.monitors.send({ action: "stop", observationId: n.id }).then(r => { apply(r.monitor); return sync(); });
};
A.monitorSnooze = function (id) {
  const n = noteById(id);
  if (!isActive(n)) return Promise.resolve();
  return A.api.monitors.send({ action: "snooze", observationId: n.id }).then(r => { apply(r.monitor); return sync(); });
};
/** Posts one update and answers with the server's result { level, why, urgency }. Nothing is evaluated here. */
A.monitorSave = function (n, inp) {
  const body = {
    action: "checkin", observationId: n.id, trend: inp.trend, level: typeof inp.level === "number" ? inp.level : null,
    flags: (inp.flags || []).slice(), serious: !!inp.serious, language: lang(),
  };
  return A.api.monitors.send(body).then(r => {
    apply(r.monitor);
    if (r.result && r.result.level === "gone") n.still = GONE_STILL;
    sync().then(redraw);
    return r.result;
  });
};

/** What a failed call says. "ended": the watch is over already. "not_found": the note is gone. */
function errorLine(error) {
  const code = error && error.code;
  if (code === "ended") return tr("This watch has ended, so there is nothing to update.", "Tämä seuranta on päättynyt, joten päivitettävää ei ole.");
  if (code === "not_found") return tr("That note could not be found. It may already be deleted.", "Muistiinpanoa ei löytynyt. Se saattaa olla jo poistettu.");
  return A.errorText(error);
}
function failed(error) {
  A.toast(errorLine(error), 5500);
  if (error && (error.code === "ended" || error.code === "not_found")) A.monitorLoad().then(() => sync()).then(redraw, () => {});
}

/* lines for a doctor: how it changed over time (used by the note text) */
A.monitorLines = function (n) {
  if (!n.monitor || !n.monitor.log.length) return [];
  return [tr("Updates while watching (started ", "Päivitykset seurannan aikana (alkoi ") + A.fmtDate(n.monitor.start) + "):"].concat(n.monitor.log.map(e =>
    "  " + A.fmtDate(e.ts) + ": " + trendWord(e.trend) + (e.level != null ? ", " + e.level + tr(" out of 10", " / 10") : "") +
    (e.flags && e.flags.length ? ", " + tr("new: ", "uutta: ") + e.flags.map(flagWord).join("; ") : "")));
};

/* The name of a reminder. The reminder of a watch does not name the symptom. */
A.remLabel = function (r) {
  return r.monitor ? tr("Log an update on a symptom you are watching", "Kirjaa päivitys seuraamastasi oireesta") : (A.REM_KINDS[r.kind] || { label: r.kind }).label;
};

/* ---------- next steps (the design calls this from its follow-up list) ---------- */
const actDefault = (text, d, arg, arg2, kind) => ({ label: text, do: d, arg: arg || "", arg2: arg2 || "", kind: kind || "" });
A.monitorItems = function (act) {
  act = act || actDefault;
  const out = [];
  A.monitored().forEach(n => {
    if (Date.now() - n.ts > 90 * DAY) return;
    const m = n.monitor, due = m.due <= Date.now(), list = n.symptoms.join(", "), topic = n.topic === "general" ? "" : n.topic;
    const tag = tr("Close monitoring", "Tarkka seuranta");
    if (due) {
      out.push({
        id: "mon-" + n.id, level: "soon", cat: "monitor", tag, topic, noRemind: true,
        title: tr("Log an update: ", "Kirjaa päivitys: ") + list,
        why: copy("due_why", { start: A.fmtDate(m.start), day: day(n), next: when(m.due) }),
        actions: [act(tr("Log an update", "Kirjaa päivitys"), "checkin", n.id, "", "primary"), act(tr("Remind me tomorrow", "Muistuta huomenna"), "monsnooze", n.id), act(tr("See a doctor anyway", "Hakeudu silti lääkäriin"), "gp", n.id)],
      });
    } else {
      out.push({
        id: "mon-" + n.id, level: "plan", cat: "monitor", tag, topic, noRemind: true,
        title: tr("Keeping a close eye on: ", "Seurataan tarkasti: ") + list,
        why: copy("wait_why", { next: when(m.due) }),
        actions: [act(tr("Log an update now", "Kirjaa päivitys nyt"), "checkin", n.id, "", "primary"), act(tr("See a doctor anyway", "Hakeudu silti lääkäriin"), "gp", n.id)],
      });
    }
  });
  return out;
};

/* ---------- the check-in sheet ---------- */
function context(n) {
  const m = n.monitor, last = m.log.length ? m.log[m.log.length - 1] : null, lv = last && last.level != null ? last.level : m.level0;
  const bits = [tr("Since ", "Alkaen ") + A.fmtDate(m.start) + tr(" (day ", " (päivä ") + day(n) + ")"];
  if (lv != null) bits.push(tr("last time ", "viimeksi ") + lv + tr(" out of 10", " / 10"));
  if (last) bits.push(trendWord(last.trend));
  else if (m.trend0) bits.push(courseWord(m.trend0));
  const steps = cfg().steps.map((s, i) => '<li class="' + (i < m.log.length ? "on" : i === m.log.length ? "now" : "") + '"><span>' + esc(tr("Day ", "Päivä ") + s) + "</span></li>").join("");
  return '<section class="mon-ctx" aria-label="' + esc(tr("Your watch", "Seurantasi")) + '"><p class="cap">' + esc(tr("Watching closely", "Tarkka seuranta")) + '</p><h3 class="h3">' + esc(n.symptoms.join(", ")) + '</h3><p class="small">' + esc(bits.join(" · ")) +
    '</p><ol class="mon-steps" aria-label="' + esc(tr("Check-in days", "Seurantapäivät")) + '">' + steps + "</ol></section>";
}
function form(n) {
  const c = cfg();
  if (!c.trends.length) return '<p class="body">' + esc(tr("Updates are not available right now. Try again in a moment.", "Päivitykset eivät ole juuri nyt käytettävissä. Yritä hetken kuluttua uudelleen.")) + "</p>";
  const m = n.monitor, last = m.log.length ? m.log[m.log.length - 1] : null;
  const v = last && last.level != null ? last.level : m.level0 != null ? m.level0 : 3;
  const word = A.scaleWord || (() => "");
  return '<form class="form" data-form="mon" data-id="' + esc(n.id) + '" novalidate>' + context(n) +
    '<fieldset class="find-side"><legend class="h3" style="margin-bottom:8px">' + esc(tr("Compared with last time, it is…", "Viime kertaan verrattuna se on…")) + '</legend><div class="replies" role="radiogroup">' +
    c.trends.map(x => '<label class="rep"><input type="radio" name="trend" value="' + esc(x.id) + '"><span>' + esc(lt(x.label)) + "</span></label>").join("") + "</div></fieldset>" +
    '<div class="mon-lv" data-lv><p class="h3" style="margin-bottom:6px">' + esc(tr("How much is it bothering you right now?", "Kuinka paljon se vaivaa sinua juuri nyt?")) + "</p>" +
    '<div class="scale" data-sc style="--p:' + (v * 10) + "%;--sc:hsl(" + Math.round(145 - v * 13.5) + ' 62% 40%)"><div class="scale-top"><output class="scale-n" id="mon-n" aria-hidden="true">' + v + '</output><span class="scale-w" id="mon-w" aria-hidden="true">' + esc(word(v)) + "</span></div>" +
    '<label class="sr" for="mon-r">' + esc(tr("How much is it bothering you right now?", "Kuinka paljon se vaivaa sinua juuri nyt?")) + '</label><input class="range" id="mon-r" name="level" type="range" min="0" max="10" step="1" value="' + v + '"></div>' +
    '<div class="scale-ends" aria-hidden="true"><span>' + esc(tr("Not at all", "Ei lainkaan")) + "</span><span>" + esc(tr("As bad as it can be", "Pahimmillaan")) + "</span></div></div>" +
    '<fieldset class="find-set"><legend class="h3" style="margin-bottom:8px">' + esc(tr("Anything new since last time?", "Onko jotain uutta viime kerran jälkeen?")) + "</legend>" +
    c.flags.map(o => '<label class="find-opt"><input type="checkbox" name="f" value="' + esc(o.id) + '"><span class="find-box" aria-hidden="true"></span><span class="find-t">' + esc(lt(o.label)) + "</span></label>").join("") +
    '<label class="find-opt none"><input type="checkbox" name="f" value="none"><span class="find-box" aria-hidden="true"></span><span class="find-t">' + esc(tr("Nothing new", "Ei mitään uutta")) + "</span></label>" +
    (c.serious ? '<label class="find-opt urgent"><input type="checkbox" name="serious" value="1"><span class="find-box" aria-hidden="true"></span><span class="find-t">' + esc(lt(c.serious)) + "</span></label>" : "") + "</fieldset>" +
    '<p class="err" id="e-mon" hidden></p>' +
    '<div class="stack"><button class="btn primary block" type="submit">' + esc(tr("Save update", "Tallenna päivitys")) + '</button><p class="fnote" style="text-align:center">' + esc(copy("privacy")) + "</p></div></form>";
}
A.open = A.open || {};
A.open.checkin = function (id) {
  const n = id ? noteById(id) : A.monitored()[0];
  if (!isActive(n)) return;
  A.sheet.open({ kicker: tr("Close monitoring", "Tarkka seuranta"), title: tr("How is it now?", "Miten se voi nyt?"), html: form(n) });
};

/* The result of an update, from what the server answered. */
function result(n, o) {
  const m = n.monitor;
  const why = o.why && o.why.length ? '<ul class="tick">' + o.why.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "";
  const disc = '<p class="small">' + esc(copy("suggestion") + " " + lt(A.D.COPY && A.D.COPY.help)) + "</p>";
  const saved = '<p class="cap">' + esc(tr("Saved", "Tallennettu")) + "</p>";
  const gp = (cls, text) => '<button class="btn ' + cls + '" type="button" data-action="mon-gp">' + esc(text) + "</button>";
  if (o.level === "gone") {
    return '<div class="result sx-out lvl-watch" tabindex="-1">' + saved + '<h3 class="h2">' + esc(copy("gone_title")) + '</h3><p class="body">' + esc(copy("gone_body")) + "</p>" +
      '<div class="btn-row"><button class="btn primary" type="button" data-action="sheet-close">' + esc(tr("Done", "Valmis")) + "</button></div></div>";
  }
  if (o.level === "emergency") {
    return '<div class="result sx-out lvl-emergency" tabindex="-1">' + saved + '<h3 class="h2">' + esc(copy("emergency_title")) + '</h3><p class="sx-when">' + esc(copy("emergency_when")) + "</p>" + why + disc +
      '<div class="btn-row"><a class="btn primary" href="tel:112">' + esc(tr("Call 112", "Soita 112")) + "</a></div></div>";
  }
  if (o.level === "doctor") {
    const urg = M().URGENCY || {};
    return '<div class="result sx-out lvl-doctor" tabindex="-1">' + saved + '<h3 class="h2">' + esc(copy("doctor_title")) + '</h3><p class="sx-when">' + esc(lt(urg[o.urgency] || urg.weeks)) + "</p>" + why +
      '<p class="small">' + esc(copy("doctor_body")) + "</p>" + disc +
      '<div class="btn-row">' + gp("primary", tr("How to get seen", "Näin pääset vastaanotolle")) +
      '<button class="btn tint" type="button" data-action="mon-pdf" data-id="' + esc(n.id) + '">' + esc(tr("PDF for my doctor", "PDF lääkärilleni")) + "</button></div></div>";
  }
  return '<div class="result sx-out lvl-watch" tabindex="-1">' + saved + '<h3 class="h2">' + esc(copy("watch_title")) + '</h3><p class="sx-when">' + esc(tr("Next update: ", "Seuraava päivitys: ") + (m ? when(m.due) : "")) + "</p>" + why +
    '<p class="body">' + esc(copy("watch_body")) + "</p>" + disc +
    '<div class="btn-row"><button class="btn primary" type="button" data-action="sheet-close">' + esc(tr("Done", "Valmis")) + "</button>" + gp("", tr("See a doctor anyway", "Hakeudu silti lääkäriin")) + "</div></div>";
}
A.forms.mon = function (f) {
  const id = f.getAttribute("data-id"), n = noteById(id), err = A.$("#e-mon", f);
  if (!isActive(n)) { A.sheet.close(true); return; }
  const picked = A.$('input[name="trend"]:checked', f);
  if (!picked) {
    err.hidden = false; err.textContent = tr("Please choose how it is compared with last time.", "Valitse, miten se on viime kertaan verrattuna.");
    A.$('input[name="trend"]', f).focus();
    return;
  }
  const flags = A.$$('input[name="f"]:checked', f).map(i => i.value).filter(v => v !== "none");
  const button = A.$('button[type="submit"]', f);
  if (button) button.disabled = true;
  return A.monitorSave(n, { trend: picked.value, level: +f.elements.level.value, flags, serious: !!A.$('input[name="serious"]:checked', f) }).then(o => {
    A.sheet.setBody(result(noteById(id) || n, o), ".result");
    redraw();
  }, error => {
    if (button) button.disabled = false;
    err.hidden = false; err.textContent = errorLine(error);
    if (error && (error.code === "ended" || error.code === "not_found")) failed(error);
  });
};
A.inputs.mon = function (el, f) {
  if (el.name !== "level") return;
  const v = +el.value, sc = A.$("[data-sc]", f), word = A.scaleWord ? A.scaleWord(v) : "";
  if (sc) { sc.style.setProperty("--p", v * 10 + "%"); sc.style.setProperty("--sc", "hsl(" + Math.round(145 - v * 13.5) + " 62% 40%)"); }
  const num = A.$("#mon-n", f), w = A.$("#mon-w", f);
  if (num) num.textContent = String(v);
  if (w) w.textContent = word;
  el.setAttribute("aria-valuetext", v + tr(" out of 10", " / 10") + (word ? ", " + word.toLowerCase() : ""));
};
A.changes.mon = function (el, f) {
  if (el.name === "f") {
    if (el.value === "none" && el.checked) A.$$('input[name="f"]', f).forEach(i => { if (i !== el) i.checked = false; });
    else if (el.checked) A.$$('input[name="f"][value="none"]', f).forEach(i => { i.checked = false; });
  }
  const e = A.$("#e-mon", f);
  if (e) e.hidden = true;
};

/* ---------- actions ---------- */
A.actions["mon-checkin"] = el => A.open.checkin(el.getAttribute("data-id") || "");
A.actions["mon-start"] = el => {
  const n = noteById(el.getAttribute("data-id"));
  if (!n) return;
  return A.monitorStart(n).then(m => {
    redraw();
    A.toast(m && m.status === "active" ? copy("watching", { next: when(m.due) }) : copy("keep_eye"), 5000);
  }, failed);
};
A.actions["mon-stop"] = el => {
  const n = noteById(el.getAttribute("data-id"));
  if (!n || !n.monitor) return;
  return A.monitorStop(n, "stopped").then(() => { redraw(); A.toast(tr("Stopped watching. Your note is kept.", "Seuranta lopetettu. Muistiinpanosi säilyy.")); }, failed);
};
A.actions["mon-snooze"] = el => A.monitorSnooze(el.getAttribute("data-id")).then(() => { redraw(); A.toast(tr("I will remind you tomorrow.", "Muistutan huomenna.")); }, failed);
A.actions["mon-gp"] = () => { if (A.sheet.body()) A.sheet.close(true); if (A.gpSheet) A.gpSheet(); };
A.actions["mon-pdf"] = el => { if (A.sheet.body()) A.sheet.close(true); if (A.open.doctorPdf) A.open.doctorPdf(el.getAttribute("data-id") || ""); };

/** The design's follow-up verbs, for a list that holds items made by A.monitorItems. Answers true when it handled the verb. */
A.monitorDo = function (verb, arg) {
  if (verb === "checkin") A.open.checkin(arg || "");
  else if (verb === "monsnooze") A.actions["mon-snooze"]({ getAttribute: () => arg || "" });
  else if (verb === "gp") { if (A.gpSheet) A.gpSheet(); }
  else if (verb === "pdf") { if (A.open.doctorPdf) A.open.doctorPdf(arg || ""); }
  else return false;
  return true;
};
A.actions["mon-do"] = el => A.monitorDo(el.getAttribute("data-do"), el.getAttribute("data-arg") || "");

/** "Watch this closely": an entry for the menu of a symptom note. Null when the note cannot be watched (already watched, ended, or gone). */
A.monitorOffer = function (n) {
  if (!n || n.kind !== "symptom" || n.still === GONE_STILL) return null;
  if (n.monitor && n.monitor.status !== "stopped") return null;
  return { label: tr("Watch this closely", "Seuraa tarkasti"), run: () => A.actions["mon-start"]({ getAttribute: k => (k === "data-id" ? n.id : "") }) };
};

A.monitorLabel = label; /* the lower-case name of a watched symptom, for the screens that list them */
