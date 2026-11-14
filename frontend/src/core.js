import { A as C4A } from "./app.js";

/* care4all core: helpers, screening rules, reminder time maths, icons. State and the backend live in src/state and src/api. */
(function () {
  'use strict';
  var D = C4A.D;
  var A = C4A;

  A.IN_FRAME = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();

  /* ---------- helpers ---------- */
  A.$ = function (s, el) { return (el || document).querySelector(s); };
  A.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  A.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  A.uid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); };
  A.reduceMotion = function () {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true; } catch (e) { /* ignore */ }
    return A.S && A.S.prefs.motion === false;
  };
  A.wait = function (ms) { return new Promise(function (r) { setTimeout(r, A.reduceMotion() ? 0 : ms); }); };

  /* ---------- state ----------
     S and the services that keep it in step with the backend live in src/state (A.S, A.svc, A.api).
     Only display preferences (language, text size, plain language, motion, skin tone, install banner) are kept in
     this browser. Nothing about health is stored here. */
  /* Other files add handlers here: actions (data-action), forms (data-form submit), changes and inputs (events inside a data-form). */
  A.actions = {}; A.forms = {}; A.changes = {}; A.inputs = {};
  /* Saves the display preferences in this browser. Anything else must go through A.svc, so other keys store nothing. */
  var warned = {};
  A.save = function (k) {
    if (k === 'prefs' || k === 'dismissInstall') { A.persistDisplay(); return; }
    if (import.meta.env.DEV && !warned[k] && typeof console !== 'undefined') { warned[k] = 1; console.warn('A.save("' + k + '") stores nothing. Change it through A.svc.'); }
  };
  A.t = function (key) {
    var all = D.I18N;
    if (!all) return key;   // the content has not loaded: the "No connection" screen still passes through chrome(), which labels the tab bar
    return (all[A.S.prefs.lang] || all.en)[key] || all.en[key] || key;
  };
  A.LANG_NAMES = { en: 'English', fi: 'Suomi', sv: 'Svenska' };
  /* True when care4all runs as an installed app rather than in a browser tab. */
  A.isStandalone = function () {
    try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; }
  };
  /* Names of the three text sizes, in the current language. The index is S.prefs.scale. */
  A.sizeNames = function () {
    return [A.tr('Normal', 'Normaali', 'Normal'), A.tr('Large', 'Suuri', 'Stor'), A.tr('Larger', 'Suurempi', 'Större')];
  };
  /* Display name of a topic, including "general" for notes that belong to no topic. */
  A.topicLabel = function (id) {
    return id === 'general' ? A.tr('General', 'Yleistä', 'Allmänt') : (D.TOPICS[id] ? D.TOPICS[id].name : id || '');
  };
  /* Modules that keep personal data in memory add a function here. It runs when the person signs out, deletes the account or is signed out. */
  A.resetters = [];

  /* ---------- profile and screening rules ---------- */
  A.age = function (p) { p = p || A.S.profile; return p ? D.YEAR - p.yob : 0; };
  /* The backend accepts the design's counties and three more answers. */
  A.countyOptions = function () {
    return D.COUNTIES.concat([
      ['aland', 'Åland (Ahvenanmaa)'],
      ['other', A.tr('Somewhere else', 'Jokin muu paikka', 'Någon annanstans')],
      ['unknown', A.tr('Not sure', 'En ole varma', 'Vet inte')]
    ]);
  };
  A.countyLabel = function (id) {
    var list = A.countyOptions();
    for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i][1];
    return '';
  };
  A.countyShort = function (id) { return A.countyLabel(id).replace(/\s*\(.*\)$/, ''); };
  /* Nothing is hidden. The profile only decides which topics come first. */
  A.isSuggested = function (topicId) {
    var sex = A.S.profile && A.S.profile.sex;
    if (topicId === 'breast' || topicId === 'cervical' || topicId === 'ovary' || topicId === 'womb') return sex === 'female';
    if (topicId === 'prostate' || topicId === 'testicular') return sex === 'male';
    return true;
  };
  A.topics = function () {
    var a = D.TOPIC_ORDER.filter(A.isSuggested), b = D.TOPIC_ORDER.filter(function (id) { return !A.isSuggested(id); });
    return a.concat(b);
  };
  /* Name of a topic as a programme: 'Bowel screening'. Cancer types that are not screened keep their plain name. */
  A.sname = function (id) { var T = D.TOPICS[id]; return T ? (T.screenName || T.name) : ''; };
  /* The services a topic offers, in a fixed order. Used for the icons on topic cards. */
  A.services = function (id) {
    var T = D.TOPICS[id], out = [];
    if (T.national && D.JOURNEYS && D.JOURNEYS[id]) out.push({ key: 'journey', seg: 'how', icon: 'route', label: 'How it works' });
    out.push({ key: 'learn', seg: 'learn', icon: 'book', label: 'Awareness' });
    if (T.symptoms && T.symptoms.items && T.symptoms.items.length) out.push({ key: 'symptoms', seg: 'symptoms', icon: 'eye', label: 'Watch for' });
    if (T.check) out.push({ key: 'check', seg: 'check', icon: 'hand', label: 'Self-check' });
    if (A.scansFor && A.scansFor(id).length) out.push({ key: 'scans', seg: 'scans', icon: 'scan', label: 'Scans' });
    return out;
  };
  A.isRead = function (id) { return !!A.S.read[id]; };
  A.markRead = function (id, on) {
    if (on === false) delete A.S.read[id]; else A.S.read[id] = Date.now();
  };
  A.allArticles = function () { return Object.keys(D.ARTICLES).map(function (id) { return D.ARTICLES[id]; }); };

  /* ---------- reminders ----------
     The keys are the reminder kinds the backend accepts. The text follows the language, so these are read through
     getters: A.REM_KINDS[kind].label and A.WHEN always return the current language. */
  Object.defineProperty(A, 'REM_KINDS', {
    enumerable: true,
    get: function () {
      var tr = A.tr;
      return {
        letter: { label: tr('Look out for my next screening letter', 'Odota seuraavaa seulontakutsuani', 'Håll utkik efter mitt nästa screeningbrev') },
        checkin: { label: tr('A monthly check-in', 'Kuukausittainen tarkistus', 'En månatlig avstämning'), sub: tr('A quiet nudge to notice changes. Optional.', 'Hiljainen muistutus huomata muutokset. Vapaaehtoinen.', 'En stilla påminnelse att lägga märke till förändringar. Frivillig.') },
        selfcheck: { label: tr('Do a self-check', 'Tee itsetarkistus', 'Gör en självundersökning'), sub: tr('A short nudge with the steps ready', 'Lyhyt muistutus ja vaiheet valmiina', 'En kort påminnelse med stegen redo') },
        gp: { label: tr('Book a health centre visit', 'Varaa aika terveyskeskukseen', 'Boka tid på hälsocentralen'), sub: tr('For something you want checked', 'Asiaan, jonka haluat tarkistuttaa', 'För något du vill få undersökt') },
        recheck: { label: tr('Re-check something I noticed', 'Tarkista huomaamani asia uudelleen', 'Kontrollera något jag märkt igen'), sub: tr('See if it has changed or gone', 'Katso, onko se muuttunut tai kadonnut', 'Se om det har förändrats eller gått över') },
        read: { label: tr('One new article each month', 'Yksi uusi artikkeli kuukaudessa', 'En ny artikel varje månad'), sub: tr('Short reading, chosen for your profile', 'Lyhyttä luettavaa profiilisi mukaan', 'Kort läsning, vald för din profil') }
      };
    }
  });
  Object.defineProperty(A, 'WHEN', {
    enumerable: true,
    get: function () {
      var tr = A.tr;
      return [
        ['1m', tr('In 1 minute (demo)', 'Minuutin kuluttua (demo)', 'Om 1 minut (demo)')], ['1w', tr('In 1 week', 'Viikon kuluttua', 'Om 1 vecka')],
        ['2w', tr('In 2 weeks', '2 viikon kuluttua', 'Om 2 veckor')], ['4w', tr('In 4 weeks', '4 viikon kuluttua', 'Om 4 veckor')],
        ['3m', tr('In 3 months', '3 kuukauden kuluttua', 'Om 3 månader')], ['6m', tr('In 6 months', '6 kuukauden kuluttua', 'Om 6 månader')],
        ['1y', tr('In 1 year', 'Vuoden kuluttua', 'Om 1 år')], ['2y', tr('In 2 years', '2 vuoden kuluttua', 'Om 2 år')],
        ['date', tr('Pick a date', 'Valitse päivämäärä', 'Välj ett datum')]
      ];
    }
  });
  A.calcDue = function (when, dateStr) {
    var d = new Date();
    if (when === '1m') return Date.now() + 60000;
    if (when === 'date') {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
      if (!m) return NaN;
      return new Date(+m[1], +m[2] - 1, +m[3], 9, 0, 0).getTime();
    }
    if (when === '1w' || when === '2w' || when === '4w') { d.setDate(d.getDate() + { '1w': 7, '2w': 14, '4w': 28 }[when]); return d.getTime(); }
    var months = { '3m': 3, '6m': 6, '1y': 12, '2y': 24 }[when] || 0;
    d.setMonth(d.getMonth() + months);
    return d.getTime();
  };
  A.locale = function () { return { en: 'en-GB', fi: 'fi-FI', sv: 'sv-SE' }[A.S.prefs.lang] || 'en-GB'; };
  A.fmtDate = function (ts) {
    try { return new Intl.DateTimeFormat(A.locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ts)); }
    catch (e) { return new Date(ts).toDateString(); }
  };
  A.fmtDue = function (ts) {
    var tr = A.tr, diff = ts - Date.now();
    if (diff <= 0) return tr('Due now', 'Erääntyy nyt', 'Förfaller nu');
    var m = Math.round(diff / 60000);
    if (m < 60) return tr('In ' + m + ' min', m + ' min kuluttua', 'Om ' + m + ' min');
    var h = Math.round(m / 60);
    if (h < 24) return tr('In ' + h + ' h', h + ' h kuluttua', 'Om ' + h + ' h');
    var d = Math.round(h / 24);
    if (d < 60) return tr('In ' + d + ' days', d + ' pv kuluttua', 'Om ' + d + ' dagar');
    return tr('On ' + A.fmtDate(ts), A.fmtDate(ts), 'Den ' + A.fmtDate(ts));
  };
  /* Active reminders that are due. S.reminders comes from the account (A.svc.loadReminders). */
  A.dueReminders = function () {
    return A.S.reminders.filter(function (r) { return r.status === 'active' && r.due <= Date.now(); });
  };

  /* ---------- icons ---------- */
  var ICONS = {
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-5h4v5"/>',
    topics: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5"/>',
    sources: '<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    cross: '<path d="M6 6l12 12M18 6 6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.4"/>',
    'chev-r': '<path d="m9.5 5 7 7-7 7"/>',
    'chev-l': '<path d="m14.5 5-7 7 7 7"/>',
    'chev-d': '<path d="m5 9.5 7 7 7-7"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    sparkle: '<path d="M11 3.5l1.9 5.3 5.3 1.9-5.3 1.9L11 17.9l-1.9-5.3-5.3-1.9 5.3-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    shield: '<path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.5 7 9 4.2-1.5 7-4.8 7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    book: '<path d="M12 6.5C10.5 5 8 4.5 4.5 4.5v13c3.5 0 6 .5 7.5 2 1.5-1.5 4-2 7.5-2v-13C16 4.5 13.5 5 12 6.5z"/><path d="M12 6.5v13"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    ext: '<path d="M8 16 16.5 7.5M9.5 7.5h7v7"/>',
    more: '<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.4 3.5 8.5s-1 6-3.5 8.5C9.5 18 8.5 15.1 8.5 12S9.5 6 12 3.5z"/>',
    textsize: '<path d="M3.5 18.5 8 6l4.5 12.5M5.2 14h5.6M14.5 18.5l3-8 3 8M15.5 16h4"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.2a2 2 0 0 0-2-2H6.2a2 2 0 0 0-2 2v7.3a2 2 0 0 0 2 2h2.3"/>',
    speaker: '<path d="M4 9.5v5h3.5L12.5 19V5L7.5 9.5z"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    download: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 19.5h14"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.200 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.800"/>',
    chat: '<path d="M5 5h14v10H11.500L7 19v-4H5z"/><path d="M9 8.500h6M9 11.500h4"/>',
    checklist: '<path d="M8.500 4.500h7v3h-7z"/><path d="M6 6v14.500h12V6"/><path d="m9 14 2 2 4-4.500"/>',
    heart: '<path d="M12 19.500C5 15 3.500 11 3.500 8.500a4.200 4.200 0 0 1 8.500-1 4.200 4.200 0 0 1 8.500 1c0 2.500-1.500 6.500-8.500 11z"/>',
    pause: '<path d="M8.500 5.500v13M15.500 5.500v13"/>',
    play: '<path d="M8 5.500v13l11-6.500z"/>',
    edit: '<path d="M5 19l1-4L16.500 4.500a2 2 0 0 1 3 3L9 18z"/>',
    doctor: '<path d="M7 4v6a5 5 0 0 0 10 0V4"/><path d="M12 15v2a3 3 0 0 0 6 0v-1"/><circle cx="18" cy="14" r="1.600"/>',
    eyeoff: '<path d="M3 3l18 18M9.500 5.800A9.500 9.500 0 0 1 12 5.500c6 0 9.500 6.500 9.500 6.500a15 15 0 0 1-3 3.700M6.500 7.700A15 15 0 0 0 2.500 12S6 18.500 12 18.500a9 9 0 0 0 3-.5"/>',
    phone: '<rect x="7" y="3.5" width="10" height="17" rx="2.5"/><path d="M11 17.5h2"/>',
    send: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
    pencil: '<path d="M5 19l1-4L16.5 4.5a2 2 0 0 1 3 3L9 18z"/>',
    note: '<path d="M6 4h12v16H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    flag: '<path d="M6 20.5V4M6 5h11l-2 4 2 4H6"/>',
    'arrow-r': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    hand: '<path d="M8 13V6a1.3 1.3 0 0 1 2.6 0v5M10.6 11V4.6a1.3 1.3 0 0 1 2.6 0V11M13.2 11V5.6a1.3 1.3 0 0 1 2.6 0V12M15.8 11.5V9a1.3 1.3 0 0 1 2.6 0v5.5c0 3.8-2.500 6-6 6-2.300 0-3.800-1-5-3L4.800 13.800a1.300 1.300 0 0 1 2.200-1.300L8 14"/>',
    kit: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    bolt: '<path d="M13 3 5.500 13.500H11L10 21l8-11h-5.500z"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7.500 12h9"/>',
    mic: '<rect x="9" y="3.500" width="6" height="10" rx="3"/><path d="M6 11.500a6 6 0 0 0 12 0M12 17.500V21"/>',
    clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
    repeat: '<path d="M4.500 11V9a3 3 0 0 1 3-3H19M16 3l3 3-3 3M19.500 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/>',
    ribbon: '<path d="M12 14.500C9 11 7.500 8.500 7.500 6.500a4.500 4.500 0 0 1 9 0c0 2-1.500 4.500-4.500 8z"/><path d="M12 14.500 8.500 20.500M12 14.500l3.500 6"/>',
    'o-general': '<path d="M12 6.500C10.500 5 8 4.500 4.500 4.500v13c3.500 0 6 .5 7.500 2 1.500-1.500 4-2 7.500-2v-13C16 4.500 13.500 5 12 6.500z"/><path d="M12 6.500v13"/>',
    'o-breast': '<path d="M3.500 8.500C7 7 9.500 7 12 8.500c2.500-1.500 5-1.500 8.500 0"/><path d="M4 8.500v3c0 3.500 1.800 6 4 6s4-2.500 4-6M12 11.500c0 3.500 1.800 6 4 6s4-2.500 4-6v-3"/><circle cx="8" cy="14.500" r=".9" fill="currentColor"/><circle cx="16" cy="14.500" r=".9" fill="currentColor"/>',
    'o-cervical': '<path d="M12 3.500c-3 0-5 2-5 5 0 3 2 4.500 2.500 7h5c.5-2.500 2.500-4 2.500-7 0-3-2-5-5-5z"/><circle cx="12" cy="18.200" r="2.300" fill="currentColor" fill-opacity=".25"/><circle cx="12" cy="18.200" r=".7" fill="currentColor"/>',
    'o-bowel': '<path d="M6 20V9.500C6 7 7.500 5.500 10 5.500h4c2.500 0 4 1.500 4 4v5.500c0 2.200-1.200 3.500-3 3.500s-2.500-1.200-2.500-2.800"/><path d="M9.500 11.500c1.500 0 1.500 2 3 2s1.500-2 3-2M9.500 14.500c1.500 0 1.500 2 3 2" opacity=".75"/><path d="M4 13h4M16 10h4" opacity=".0"/>',
    'o-skin': '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="9.500" cy="10" r="1.500" fill="currentColor"/><circle cx="14.500" cy="13.500" r="2.400" fill="currentColor"/><circle cx="10" cy="15.800" r=".9" fill="currentColor"/>',
    'o-prostate': '<path d="M12 7c4 0 6.500 2.200 6.500 5.200 0 3-2.600 5.300-6.500 5.300s-6.500-2.300-6.500-5.300C5.500 9.200 8 7 12 7z"/><path d="M12 3v4M12 17.500V21"/><circle cx="12" cy="12.200" r="1.800"/>',
    'o-testicular': '<ellipse cx="8.500" cy="14.500" rx="4" ry="5"/><ellipse cx="15.500" cy="14.500" rx="4" ry="5"/><path d="M8 9.500C8 6 10 4 12 4s4 2 4 5.500"/>',
    'o-lung': '<path d="M12 3.500v7M12 10.500c-1.500 1.500-2.500 2-3.500 2M12 10.500c1.500 1.500 2.500 2 3.500 2"/><path d="M9.500 8.500C6 8.500 4 13 4 17c0 2.500 1.200 3.500 3 3.500 2.200 0 3-1.300 3-3v-8c0-.7-.3-1-.5-1z"/><path d="M14.500 8.500c3.500 0 5.500 4.500 5.500 8.500 0 2.500-1.200 3.500-3 3.500-2.200 0-3-1.300-3-3v-8c0-.7.300-1 .5-1z"/>',
    'o-stomach': '<path d="M8 3v4c0 1.500-1 2.200-2.200 3.500C4.500 12 4 13.500 4 15c0 3.500 3 6 7 6 4.500 0 8-3 8-7 0-2.500-1.500-4-4-4.500-2-.4-3-1.500-3-3.500V3"/><path d="M8 7h4"/>',
    'o-thyroid': '<path d="M12 9c-1-2.800-3.200-4.500-5.200-3.800C4.500 6 4 9 4.500 12c.5 3 2.300 5 4.500 5 1.600 0 3-1 3-3.500"/><path d="M12 9c1-2.800 3.200-4.500 5.200-3.800 2.300.8 2.800 3.800 2.300 6.800-.5 3-2.300 5-4.500 5-1.600 0-3-1-3-3.500"/><path d="M12 9v5"/>',
    'o-mouththroat': '<path d="M3.500 12c2-2.500 4.500-4 8.500-4s6.500 1.500 8.500 4c-2 3.500-4.500 5-8.500 5s-6.500-1.500-8.500-5z"/><path d="M3.500 12h17"/>',
    'o-pancreas': '<path d="M3.500 14c2.500-3 6-4 9.500-3.500 2.500.4 4.200-.5 5.500-2 1.200-1.400 2.500-.5 2.500 1 0 3-2.500 5.500-6 6.500-4 1.200-9 1.200-11.500-.5z"/><path d="M5.500 13.500c4-1 8-1 12.500-4"/>',
    'o-liver': '<path d="M3.500 11c0-2 1.500-3.500 4-3.500H17c2.500 0 3.500 2 3.500 4 0 4-3.500 7-9 7-3.500 0-5.500-1.500-6.500-3.500-.7-1.200-1.500-2.200-1.500-4z"/><path d="M12 8c0 3 1 5 4 6"/>',
    'o-kidney': '<path d="M15 4c-3.500 0-7 2.500-7 7 0 1.200.4 2 1.200 3-.8 1-1.200 1.800-1.200 2.800C8 19 10 21 13 21c4 0 7-3.500 7-8.500C20 7.500 18.500 4 15 4z"/><path d="M10 12.500c1.500 0 2.500-.5 3-1.500"/>',
    'o-bladder': '<path d="M12 8.500c-3 0-5 2.500-5 5.500 0 3 2 5.500 5 5.500s5-2.500 5-5.500c0-3-2-5.500-5-5.500z"/><path d="M9.500 9.500 8 4M14.500 9.500 16 4M12 19.500v2"/>',
    'o-ovary': '<ellipse cx="14.500" cy="14.500" rx="5" ry="3.800" transform="rotate(-25 14.500 14.500)"/><circle cx="14" cy="14" r="1.200"/><path d="M4 5.500c3.500 0 6 1.500 7.500 4"/><path d="M4 5.500c0 3 1.200 5 3 6.500"/>',
    'o-womb': '<path d="M12 7c-2.500 0-4 1.800-4 4 0 2.200 1.200 3.200 1.200 5.500 0 1 .8 1.700 1.700 1.700h2.200c.9 0 1.700-.7 1.700-1.700 0-2.300 1.200-3.300 1.200-5.500 0-2.200-1.500-4-4-4z"/><path d="M8 9c-2-.5-3.500-2-3.500-3.500M16 9c2-.5 3.500-2 3.500-3.500"/><circle cx="4.500" cy="5" r="1.300"/><circle cx="19.500" cy="5" r="1.300"/>',
    'g-breast': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/>',
    'g-cervical': '<path d="M12 3.5c3 4 6 7 6 10.2a6 6 0 0 1-12 0c0-3.2 3-6.2 6-10.2z"/>',
    'g-bowel': '<path d="M4 8.5c3.5-4 4.5 4 8 0s4.5 4 8 0M4 15.5c3.5-4 4.5 4 8 0s4.5 4 8 0"/>',
    'g-skin': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>',
    'g-prostate': '<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/><path d="M12 5.5v13"/>',
    'g-testicular': '<circle cx="8" cy="12" r="4.8"/><circle cx="16" cy="12" r="4.8"/>',
    'g-general': '<path d="M5 6.5h14M5 12h14M5 17.5h9"/>'
  };
  A.organ = function (id, size) { return A.icon(ICONS['o-' + id] ? 'o-' + id : 'o-general', size); };
  A.icon = function (n, size) {
    size = size || 24;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[n] || '') + '</svg>';
  };

  /* ---------- starter questions ----------
     The answers themselves come from the backend (A.api.chat). These are only the suggestions offered under the box. */
  A.suggestions = function (topic) {
    var by = D.SUGGESTIONS.topics;
    if (!by[topic] && D.TOPICS[topic]) { var n = D.TOPICS[topic].name.toLowerCase(); return ['What are the signs of ' + n + ' cancer?', 'What raises the risk of ' + n + ' cancer?', 'How is ' + n + ' cancer diagnosed?']; }
    return by[topic] || D.SUGGESTIONS.general;
  };
})();
