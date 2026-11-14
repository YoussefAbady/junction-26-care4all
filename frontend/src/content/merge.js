import { A as C4A } from "../app.js";

/* care4all data merge: joins the compiled research (cancers.js) onto the hand-written topics in data.js.
   Existing topics keep their hand-written lede and screening notes. Symptoms, self-check steps, normal-feel
   notes and videos come from the research. New cancer types are created here. */
(function (D) {
  'use strict';
  var R = D.RESEARCH, T = D.TOPICS;
  var ORDER = ['breast', 'cervical', 'bowel', 'skin', 'prostate', 'testicular', 'lung', 'stomach', 'thyroid', 'mouththroat', 'pancreas', 'liver', 'kidney', 'bladder', 'ovary', 'womb'];

  function union() {
    var out = [];
    Array.prototype.slice.call(arguments).forEach(function (a) { (a || []).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); }); });
    return out;
  }

  ORDER.forEach(function (id) {
    var r = R.TOPICS[id], t = T[id];
    if (!t) {
      t = T[id] = { id: id, name: r.name, kicker: r.kicker, national: false, pref: null, blurb: r.blurb, lede: r.lede, leadSrc: r.leadSrc,
        programme: 'No national screening', articles: [], check: null, kit: null };
    }
    t.organ = r.organ;
    t.kicker = r.kicker;
    t.blurb = r.blurb;
    t.aboutId = r.aboutId;
    t.screeningText = r.screeningText;
    t.screeningSrc = r.screeningSrc;
    t.articles = union([r.aboutId], t.articles.filter(function (a) { return a !== 'what-screening-is'; }), t.national ? ['what-screening-is'] : ['what-is-cancer']);
    var old = t.symptoms || {};
    var items = r.symptoms.items;
    t.symptoms = {
      title: 'Watch for', items: items, see: r.symptoms.see, seeSrc: r.symptoms.seeSrc,
      note: old.note || '', contact: old.contact || '',
      src: union(r.symptoms.seeSrc, items.map(function (i) { return i.src; }))
    };
    var c = R.CHECK[id];
    if (c) {
      var oc = t.check || {};
      t.check = { title: c.title, text: oc.text || [], steps: c.steps, normal: c.normal, normalSrc: c.normalSrc, found: c.found,
        videos: c.videos, differ: c.differ, differSrc: c.differSrc, abcde: c.abcde || null, src: union(c.src, oc.src) };
    }
  });
  if (T.bowel.kit) T.bowel.kit.video = (R.VIDEOS.bowel || [])[0] || null;
  if (T.testicular) T.testicular.blurb = 'Most common in young men. Rare, and very treatable.';

  D.TOPIC_ORDER = ORDER;
  D.NATIONAL = ['breast', 'cervical', 'bowel'];

  /* Curated answers added for the new material. Each cites its sources. */
  D.FAQ.push(
    { re: /\b(lower|reduce|cut|prevent|avoid)\b.*\b(risk|cancer)\b|\bprevent(ion)?\b/i, k: ['prevent', 'prevention', 'lower', 'reduce'], q: 'How can I lower my cancer risk?',
      a: 'The European Code Against Cancer, 5th edition, lists 14 recommendations for you: do not use tobacco, keep smoke away from you, avoid excess weight, be active, eat a healthy diet, avoid alcohol, breastfeed, protect yourself from the sun, know the cancer risks at work, check for radon at home, cut your exposure to air pollution, get vaccinated and tested for cancer-causing infections, be careful with hormone therapy for menopause, and join organised cancer screening.',
      s: ['ecac5-web'] },
    { re: /\bwhat (is|are) cancer\b|\bhow does cancer (start|spread|begin)\b/i, k: ['metastasis', 'tumour', 'malignant', 'benign'], q: 'What is cancer?',
      a: 'Cancer happens when cells in your body keep growing without proper control. A group of abnormal cells can form a tumour. Cancer is not one disease. There are more than 200 types, and their causes and behaviour differ a lot.',
      s: ['cs-whatiscancer-en', 'nhs-cancer-overview'] },
    { re: /\bwhat does (the )?stage mean\b|\bcancer stage/i, k: ['stage', 'staging', 'tnm'], q: 'What does cancer stage mean?',
      a: 'The stage of a cancer tells how far it has grown and spread. Doctors often use the TNM system, which looks at the size of the main tumour, spread to nearby lymph nodes and spread to other parts of the body. The result is a stage from 0 to IV.',
      s: ['cs-staging-en'] }
  );

  /* Programme names: the three national programmes are called "X screening" everywhere. */
  D.NATIONAL.forEach(function (id) { if (T[id]) T[id].screenName = T[id].name + ' screening'; });

  /* UI strings added for the new tabs. FI and SV are first drafts. */
  var add = {
    en: { screening: 'Screening', cancers: 'Cancers', tabAsk: 'Ask', nationalScreening: 'National screening', checkYourself: 'Check yourself', watchFor: 'Watch for', selfCheck: 'Self-check', homeKit: 'Home kit' },
    fi: { screening: 'Seulonta', cancers: 'Syövät', tabAsk: 'Kysy', nationalScreening: 'Kansallinen seulonta', checkYourself: 'Tarkista itse', watchFor: 'Oireet', selfCheck: 'Omatarkkailu', homeKit: 'Kotitesti' },
    sv: { screening: 'Screening', cancers: 'Cancerformer', tabAsk: 'Fråga', nationalScreening: 'Nationell screening', checkYourself: 'Undersök dig själv', watchFor: 'Symtom', selfCheck: 'Självundersökning', homeKit: 'Hemtest' }
  };
  Object.keys(add).forEach(function (l) { Object.keys(add[l]).forEach(function (k) { D.I18N[l][k] = add[l][k]; }); });
})(C4A.D);
