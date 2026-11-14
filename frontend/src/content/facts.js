import { A as C4A } from "../app.js";

/* care4all facts: extra sources, how common each cancer is in Finland, vaccine facts, and the rules for
   "see a doctor" versus "keep watching". Loaded after merge.js. Numbers are copied from the sources named. */
(function (D) {
  'use strict';

  /* ---------- extra sources ---------- */
  var X = {
    'globocan-fi': { name: 'GLOBOCAN 2024: Finland fact sheet', org: 'IARC, Global Cancer Observatory', date: '2026',
      url: 'https://gco.iarc.who.int/media/globocan/factsheets/populations/246-finland-fact-sheet.pdf', use: 'New cancer cases in Finland by type and sex, and the risk of cancer before age 75 (estimates for 2024)' },
    'nordcan-prostate-fi': { name: 'NORDCAN: Prostate cancer in Finland (factsheet)', org: 'Association of the Nordic Cancer Registries, IARC', date: '2022',
      url: 'https://gco.iarc.fr/media/nordcan/factsheets/92/en/countries/246/prostate-240-finland-246.pdf', use: 'Prostate cancer risk before age 75 in Finland, 9.7% (2016 to 2020)' },
    'who-hepb': { name: 'Hepatitis B (fact sheet)', org: 'World Health Organization', date: '2026',
      url: 'https://www.who.int/news-room/fact-sheets/detail/hepatitis-b', use: 'Hepatitis B can lead to cirrhosis and liver cancer, and the vaccine prevents infection' },
    'hel-risk-vacc': { name: 'Free vaccinations for risk groups', org: 'City of Helsinki', date: '',
      url: 'https://www.hel.fi/en/health-and-social-services/health-care/health-stations/vaccinations/free-vaccinations-for-risk-groups', use: 'Hepatitis B vaccine is free for defined risk groups in Finland' },
    'suomifi-adult-vacc': { name: 'Vaccinations in adulthood', org: 'Suomi.fi', date: '',
      url: 'https://www.suomi.fi/citizen/health-and-medical-care/staying-healthy/guide/vaccinations/vaccinations-in-adulthood', use: 'Adults outside a risk group can get vaccines at their own expense' },
    'nice-ng12': { name: 'Suspected cancer: recognition and referral (NG12)', org: 'NICE (UK)', date: '',
      url: 'https://www.nice.org.uk/guidance/ng12', use: 'Which symptoms, for example blood, a new lump or a lasting change in bowel habit, should prompt a doctor to assess for cancer' },
    'nhs-diarrhoea': { name: 'Diarrhoea and vomiting', org: 'NHS (UK)', date: '',
      url: 'https://www.nhs.uk/symptoms/diarrhoea-and-vomiting/', use: 'Diarrhoea usually stops within 5 to 7 days. Get help if it lasts more than 7 days or comes with blood' },
    'nhs-cough': { name: 'Cough', org: 'NHS (UK)', date: '',
      url: 'https://www.nhs.uk/symptoms/cough/', use: 'A cough usually clears within 3 to 4 weeks. See a doctor if it lasts more than 3 weeks, or comes with weight loss, chest pain or blood' }
  };
  /* self-check guides: Finnish sources first, then European, then worldwide */
  var G = {
    'ilmansyopaa-breast': { name: 'Syöpäjärjestöt: Tarkkaile rintojasi', org: 'Cancer Society of Finland', date: '',
      url: 'https://www.ilmansyopaa.fi/tarkkaile-kehoasi/rintojen-tarkkailu/', use: 'All women should examine and feel their breasts regularly, at any age. What to look for' },
    'syopa-blog-breast': { name: 'Syöpäjärjestöt: Tutkinko rinnat vai en?', org: 'Cancer Society of Finland', date: 'Sep 2025',
      url: 'https://www.syopajarjestot.fi/blogi/tutkinko-rinnat-vai-en/', use: 'Self-checking is still suggested to everyone, but the focus has moved from a fixed schedule to knowing your own breasts' },
    'hus-breast': { name: 'HUS: Jokaisen kannattaa opetella tuntemaan omat rintansa', org: 'HUS', date: 'Nov 2025',
      url: 'https://www.hus.fi/husari/jokaisen-kannattaa-opetella-tuntemaan-omat-rintansa', use: 'The best time to check is after your period, when the breasts are softest' },
    'ilmansyopaa-testicles': { name: 'Syöpäjärjestöt: Tarkkaile kiveksiäsi', org: 'Cancer Society of Finland', date: '',
      url: 'https://www.ilmansyopaa.fi/tarkkaile-kehoasi/tarkkaile-kiveksiasi/', use: 'All men should feel both testicles regularly. How to hold and roll each one between thumb and fingers' },
    'terveyskirjasto-testis': { name: 'Terveyskirjasto: Kiveksen kipu ja turpoaminen', org: 'Terveyskirjasto (Duodecim)', date: 'Feb 2026',
      url: 'https://www.terveyskirjasto.fi/dlk00276', use: 'Feel your testicles every now and then. Sudden severe pain on one side needs care at once' },
    'ilmansyopaa-moles': { name: 'Syöpäjärjestöt: Tarkkaile luomiasi', org: 'Cancer Society of Finland', date: '',
      url: 'https://www.ilmansyopaa.fi/tarkkaile-kehoasi/tarkkaile-luomiasi/', use: 'Regular checking is the best way to get to know your moles. The VARO rule' },
    'terveyskirjasto-bcc': { name: 'Terveyskirjasto: Tyvisolusyöpä (basaliooma)', org: 'Terveyskirjasto (Duodecim)', date: 'May 2024',
      url: 'https://www.terveyskirjasto.fi/dlk00680', use: 'Check your skin at home a couple of times a year' },
    'euromelanoma-how': { name: 'Euromelanoma: How and where to look', org: 'Euromelanoma', date: '',
      url: 'https://www.euromelanoma.eu/en-intl/check-for-skin-cancer/how-and-where-to-look', use: 'The eight-step order for checking your skin, with a full-length mirror and a hand mirror' },
    'aad-skin-exam': { name: 'AAD: How to perform a skin self-exam', org: 'American Academy of Dermatology', date: '',
      url: 'https://www.aad.org/public/diseases/skin-cancer/check-skin', use: 'Mirror positions, and the places people forget: nails, palms, soles and between the toes' },
    'orchid-check': { name: 'Orchid: Testicular cancer awareness', org: 'Orchid (UK)', date: '',
      url: 'https://www.yourprivates.org.uk/wp-content/uploads/2015/01/01_Orchid_Awareness.pdf', use: 'Roll each testicle between thumb and finger after a warm bath or shower. Do not squeeze' },
    'tcs-ballchecker': { name: 'Testicular Cancer Society: Ball Checker', org: 'Testicular Cancer Society', date: '',
      url: 'https://testicularcancersociety.org/pages/ball-checker', use: 'Three illustrated steps for a testicular self-check' }
  };
  Object.keys(G).forEach(function (k) { X[k] = G[k]; });
  Object.keys(X).forEach(function (k) { D.SOURCES[k] = X[k]; });

  /* ---------- how common each cancer is in Finland (GLOBOCAN 2024, Finland) ----------
     risk: the percentage who are diagnosed before age 75, as the fact sheet gives it.
     sex:  'f' or 'm' when the cancer is, in practice, found in one sex, and the risk is for that sex.
     both: cases in 2024, both sexes. m / f: cases for men and women, only where the fact sheet gives them.
     share: percent of all cancers in that sex, only for that sex's five most common. */
  D.STATS = {
    breast:     { site: 'Breast', risk: 9.6, sex: 'f', both: 5204, f: 5204, share: { f: 30.5 } },
    prostate:   { site: 'Prostate', risk: 9.5, sex: 'm', both: 5564, m: 5564, share: { m: 28.9 }, src: ['globocan-fi', 'nordcan-prostate-fi'] },
    bowel:      { site: 'Colon and rectum', risk: 3.4, both: 4349, m: 2364, f: 1985, share: { m: 12.3, f: 11.6 } },
    lung:       { site: 'Lung', risk: 2.2, both: 2913, m: 1701, f: 1212, share: { m: 8.8, f: 7.1 } },
    skin:       { site: 'Melanoma of the skin', risk: 1.8, both: 2029, m: 1106, f: 923, share: { m: 5.8, f: 5.4 } },
    bladder:    { site: 'Bladder', risk: 0.88, both: 1353, m: 1066, share: { m: 5.5 } },
    womb:       { site: 'Womb (body of the uterus)', risk: 1.5, sex: 'f', both: 910, f: 910, share: { f: 5.3 } },
    pancreas:   { site: 'Pancreas', risk: 0.99, both: 1437 },
    kidney:     { site: 'Kidney', risk: 0.90, both: 980 },
    stomach:    { site: 'Stomach', risk: 0.51, both: 642 },
    liver:      { site: 'Liver', risk: 0.48, both: 636 },
    thyroid:    { site: 'Thyroid', risk: 0.69, both: 611 },
    mouththroat: { site: 'Lip and oral cavity', risk: 0.41, both: 454 },
    ovary:      { site: 'Ovary', risk: 0.73, sex: 'f', both: 411, f: 411 },
    testicular: { site: 'Testis', risk: 0.45, sex: 'm', both: 163, m: 163 },
    cervical:   { site: 'Cervix', risk: 0.38, sex: 'f', both: 155, f: 155 }
  };
  D.STATS_SRC = ['globocan-fi'];
  D.STATS_NOTE = 'These are model estimates for 2024 from national cancer registry data. "1 in 10" means about 10 out of every 100 people in that group are diagnosed before they turn 75, if they live that long. It is an average. Your own chance depends on your age, family history, lifestyle and more, and it does not mean you will or will not get cancer.';

  /* ---------- vaccines linked to cancer ---------- */
  D.VACC = {
    hpv: { name: 'HPV vaccine', protects: 'HPV causes cervical cancer and some other cancers.', src: ['cs-hpv'] },
    hbv: { name: 'Hepatitis B vaccine', protects: 'Long-term hepatitis B can lead to cirrhosis and liver cancer. The vaccine prevents the infection.',
      finland: 'In Finland the hepatitis B vaccine is free for defined risk groups. Anyone else can get it at their own expense, for example at a health centre or a private clinic.', src: ['who-hepb', 'hel-risk-vacc', 'suomifi-adult-vacc'] }
  };

  /* ---------- see a doctor, or keep watching ----------
     The default is: see a doctor. Keeping watch is the exception, and only for the cases below. */
  D.TRIAGE = {
    watchIntro: 'I only suggest keeping watch when all of these are true: it is a cough, an ache or pain, or a general feeling; it started in the past week; it is mild and getting better; and nothing on my warning list came up. For everything else I suggest telling a doctor, even if it is getting better.',
    rules: [
      { h: 'Blood, a new lump, or a change in an organ', t: 'Blood in poo, pee, phlegm or from the vagina, a new lump, and changes in a breast, testicle, mole, bowel or bladder habit, swallowing or weight are the signs cancer guidelines ask doctors to take seriously. The cause is usually harmless, but a doctor should decide. I do not suggest waiting on these.', src: ['nice-ng12'] },
      { h: 'Bowel changes, including diarrhoea', t: 'The NHS says most diarrhoea stops within 5 to 7 days and needs a doctor if it lasts more than 7 days or comes with blood. Cancer guidelines add that a lasting change in bowel habit is a referral sign. This app is about spotting cancer early, so I am more careful than a general stomach-bug page: I suggest mentioning even a short spell that is already getting better. A short call or message to a nurse is enough.', src: ['nhs-diarrhoea', 'nice-ng12'] },
      { h: 'A cough or a hoarse voice', t: 'A cough that lasts 3 weeks or more, or comes with blood, breathlessness, chest pain or weight loss, should be checked. A fresh cough that is easing can be watched for a short while.', src: ['nhs-cough', 'nhs-lung-symptoms'] },
      { h: 'Pain and general feelings', t: 'Pain that is strong, wakes you at night, lasts more than a week, or is getting worse is worth a doctor. A mild ache that started recently and is easing can be watched.', src: ['cruk-lung-symptoms'] },
      { h: 'Getting worse, or strong', t: 'Anything that is getting worse, or is 7 out of 10 or stronger, is worth contacting a doctor about soon.', src: [] }
    ],
    src: ['nice-ng12', 'nhs-diarrhoea', 'nhs-cough']
  };
})(C4A.D);
