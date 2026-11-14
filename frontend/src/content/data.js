/* care4all mock data.
   Every fact below comes from a source listed in SOURCES (fetched Nov 2026).
   Anything not yet verified is marked PENDING and shown as a placeholder in the UI. */
export const D = (function () {
  'use strict';

  var YEAR = 2026;

  var COUNTIES = [
    ['etela-karjala', 'Etelä-Karjala (South Karelia)'],
    ['etela-pohjanmaa', 'Etelä-Pohjanmaa (South Ostrobothnia)'],
    ['etela-savo', 'Etelä-Savo (South Savo)'],
    ['helsinki', 'Helsinki'],
    ['ita-uusimaa', 'Itä-Uusimaa (East Uusimaa)'],
    ['kainuu', 'Kainuu'],
    ['kanta-hame', 'Kanta-Häme'],
    ['keski-pohjanmaa', 'Keski-Pohjanmaa (Central Ostrobothnia)'],
    ['keski-suomi', 'Keski-Suomi (Central Finland)'],
    ['keski-uusimaa', 'Keski-Uusimaa (Central Uusimaa)'],
    ['kymenlaakso', 'Kymenlaakso'],
    ['lappi', 'Lappi (Lapland)'],
    ['lansi-uusimaa', 'Länsi-Uusimaa (West Uusimaa)'],
    ['pirkanmaa', 'Pirkanmaa'],
    ['pohjanmaa', 'Pohjanmaa (Ostrobothnia)'],
    ['pohjois-karjala', 'Pohjois-Karjala (North Karelia)'],
    ['pohjois-pohjanmaa', 'Pohjois-Pohjanmaa (North Ostrobothnia)'],
    ['pohjois-savo', 'Pohjois-Savo (North Savo)'],
    ['paijat-hame', 'Päijät-Häme'],
    ['satakunta', 'Satakunta'],
    ['vantaa-kerava', 'Vantaa and Kerava'],
    ['varsinais-suomi', 'Varsinais-Suomi (Southwest Finland)']
  ];

  /* The design also held the counties and ages Fimlab listed for the 2026 bowel programme and the HPV self-sampling
     study, to decide in the browser whether someone qualifies. The app no longer does that: the invitation letter
     decides. The programme facts are still in the articles below, with their sources. */

  var SOURCES = {
    'suomifi': { name: 'Suomi.fi: Cancer screening', org: 'Suomi.fi', date: '2026', url: 'https://www.suomi.fi/citizen/health-and-medical-care/staying-healthy/guide/screenings/cancer-screening', use: 'Who is invited, what happens, benefits.' },
    'stm': { name: 'Ministry of Social Affairs and Health: Screening', org: 'Ministry of Social Affairs and Health', date: '', url: 'https://stm.fi/en/screening', use: 'Programme rules and intervals.' },
    'registry-breast': { name: 'Finnish Cancer Registry: Breast cancer screening', org: 'Finnish Cancer Registry', date: 'Jan 2024', url: 'https://cancerregistry.fi/screening/breast-cancer-screening/', use: 'Participation, benefits and downsides of mammography.' },
    'cs-breasts': { name: 'Cancer Society of Finland: Examine your breasts', org: 'Cancer Society of Finland', date: 'Mar 2024', url: 'https://www.freefromcancer.fi/check-your-body/examine-your-breasts/', use: 'Changes in the breast that need checking.' },
    'cs-moles': { name: 'Cancer Society of Finland: Examine your moles', org: 'Cancer Society of Finland', date: '2017', url: 'https://www.freefromcancer.fi/check-your-body/examine-your-moles/', use: 'Skin checks, risk factors, sun.' },
    'cs-testicles': { name: 'Cancer Society of Finland: Examine your testicles', org: 'Cancer Society of Finland', date: '2017', url: 'https://www.freefromcancer.fi/check-your-body/examine-your-testicles/', use: 'How to check, symptoms.' },
    'cs-colorectal': { name: 'Cancer Society of Finland: Colorectal cancer screening', org: 'Cancer Society of Finland', date: 'Apr 2022', url: 'https://www.freefromcancer.fi/check-your-body/colorectal-cancer-screening/', use: 'Steps, results, colonoscopy.' },
    'cs-cervical': { name: 'Cancer Society of Finland: Cervical cancer screening', org: 'Cancer Society of Finland', date: 'Sep 2025', url: 'https://www.freefromcancer.fi/check-your-body/cervical-cancer-screening/', use: 'Appointment, results, follow-up.' },
    'cs-hpv': { name: 'Cancer Society of Finland: Get the HPV vaccination', org: 'Cancer Society of Finland', date: '2017', url: 'https://www.freefromcancer.fi/check-your-body/get-hpv-vaccination/', use: 'What the HPV vaccine does.' },
    'fimlab-crc': { name: 'Fimlab: Colorectal cancer screening', org: 'Fimlab', date: 'Apr 2026', url: 'https://fimlab.fi/en/colorectal-cancer-screening/', use: 'Who is invited in 2026, how the home test works, results.' },
    'fimlab-hpv': { name: 'Fimlab: HPV self-sampling study 2026', org: 'Fimlab', date: 'Feb 2026', url: 'https://fimlab.fi/en/ajankohtaista/cervical-cancer-screening-testing-of-self-sampling-method-continues-in-2026/', use: 'Home sampling for cervical screening, by county.' },
    'cruk': { name: 'Cancer Research UK: Can you check yourself for cancer?', org: 'Cancer Research UK', date: 'Jun 2025', url: 'https://www.cancerresearchuk.org/about-cancer/spot-cancer-early/can-you-check-yourself-for-cancer', use: 'Evidence on self-checks.' },
    'ecac5': { name: 'European Code Against Cancer, 5th edition', org: 'IARC and WHO', date: 'Feb 2026', url: 'https://cancer-code-europe.iarc.who.int/', use: 'Prevention advice for Europe.' }
  };

  /* ---------- Articles ---------- */
  var ARTICLES = {
    'what-screening-is': {
      id: 'what-screening-is', topic: 'general', minutes: 3,
      title: 'What screening is, and what it is not',
      inShort: 'Screening looks for cancer, or the stage before cancer, in people with no symptoms. In Finland it is free and voluntary, and you are invited by letter.',
      sections: [
        { id: 'does', h: 'What screening does',
          p: ['Screening can reveal a precancerous condition that can be treated before it becomes cancer. It can also find cancer early, when treatment is usually lighter and the outlook is better.',
            'The tests are free of charge and voluntary. Wellbeing services counties organise them.'],
          plain: ['Screening finds changes early. The tests are free. You choose whether to take part.'],
          src: ['suomifi'] },
        { id: 'which', h: 'Which cancers Finland screens for',
          p: ['The national programme covers breast, cervical and colorectal cancer.',
            'Systematic screening for prostate, lung and skin cancer does not currently meet the criteria for screening. Counties may still organise extra screening of their own.'],
          plain: ['Finland screens for breast, cervical and bowel cancer. There is no national screening for prostate, lung or skin cancer.'],
          src: ['suomifi', 'stm'] },
        { id: 'evidence', h: 'What the evidence says',
          stats: [
            { n: 80, suffix: '%', label: 'lower cervical cancer incidence, with screening' },
            { n: 50, prefix: 'About ', label: 'breast cancer deaths prevented in Finland each year' },
            { text: '10–40%', label: 'lower bowel cancer deaths, by current estimates' }
          ],
          p: [], plain: [], src: ['suomifi'] },
        { id: 'choice', h: 'Your choice',
          p: ['Taking part is voluntary. Counties must give residents enough information about the aims, organisation and effectiveness of screening, and about its possible risks.',
            'Screening has downsides too. For example, some people are called for extra tests that turn out not to be needed. The breast screening article shows both sides.'],
          plain: ['It is your choice. Screening has benefits and downsides. We show both.'],
          src: ['stm', 'registry-breast'] }
      ],
      related: ['breast-screening', 'bowel-home-test']
    },

    'breast-screening': {
      id: 'breast-screening', topic: 'breast', minutes: 3,
      title: 'Breast screening: what to expect',
      inShort: 'If you are 50 to 69, you get a letter about every 2 years inviting you for a mammogram. It is free. You choose whether to go.',
      sections: [
        { id: 'who', h: 'Who is invited',
          p: ['Every woman aged 50 to 69 is invited by personal letter, about every 2 years. The letter gives a time and a place. You can change the time if it does not suit you.',
            'If you do not want to take part, tell the screening unit. The letter explains how.'],
          plain: ['Women aged 50 to 69 get a letter about every 2 years. You can change the time. You can also say no.'],
          src: ['suomifi', 'stm'] },
        { id: 'what', h: 'What happens at the appointment',
          p: ['A mammogram is an X-ray of your breasts. Each breast is pressed between two plates, one at a time. You usually get the result by letter within a few weeks.',
            'If the images show a change, you are invited for more tests. Most people who are called back do not have cancer.'],
          plain: ['A mammogram is an X-ray. You get the result by letter in a few weeks. If the X-ray shows a change, you are called back. Most people called back do not have cancer.'],
          src: ['suomifi', 'registry-breast'] },
        { id: 'numbers', h: 'What the numbers say',
          stats: [
            { n: 80, prefix: '', suffix: '%+', label: 'of invited women take part' },
            { n: 3, prefix: 'Under ', suffix: '%', label: 'of those who take part are called back for more tests' },
            { text: 'About 1 in 5', label: 'of those called back have breast cancer' }
          ],
          p: [], plain: [], src: ['registry-breast'] },
        { id: 'benefits', h: 'Benefits and downsides',
          lead: 'Screening helps some people and is not free of harm. You should see both before you decide.',
          cols: [
            { label: 'Benefit', text: 'In Finland, deaths from breast cancer were 22% lower among women invited to screening between 1992 and 2003. Among women who actually went, they were 28% lower. A later study found the same.' },
            { label: 'Downside', text: 'About 1 in 5 women who go regularly are called for extra tests at least once that were not needed. Screening can also find small tumours that would never have caused symptoms. Studies suggest these are at most 1 in 10 of the tumours found.' }
          ],
          p: [], plain: [], src: ['registry-breast'] },
        { id: 'change', h: 'If you notice a change',
          p: ['Do not wait for your next screening. Contact your health centre, occupational health clinic or a private clinic.'],
          plain: ['Do not wait for the next screening. Contact your health centre.'],
          link: { topic: 'breast', anchor: 'symptoms', label: 'See the changes to look for' },
          src: ['cs-breasts'] }
      ],
      related: ['what-screening-is']
    },

    'cervical-screening': {
      id: 'cervical-screening', topic: 'cervical', minutes: 4,
      title: 'Cervical screening and the HPV test',
      inShort: 'Women aged 30 to 65 are invited about every 5 years. A nurse takes a sample, and a laboratory tests it for cell changes or for HPV.',
      sections: [
        { id: 'who', h: 'Who is invited',
          p: ['Women aged 30 to 65 are invited every 5 years. In some counties, women aged 25 are invited too. The invitation arrives at your home, and you can change the appointment time.'],
          plain: ['Women aged 30 to 65 get a letter every 5 years. You can change the time.'],
          src: ['suomifi', 'cs-cervical'] },
        { id: 'what', h: 'What happens at the appointment',
          p: ['A nurse takes a sample from the cervix. It may pinch a little, and there may be some spotting afterwards.',
            'Before the appointment you fill in a short form. It asks when your last period started, what contraception or hormone therapy you use, and when you last had a Pap test.',
            'The sample is tested for cell changes (the Pap test) or for the human papillomavirus, HPV.'],
          plain: ['A nurse takes a sample. It may pinch a little. A laboratory tests it.'],
          src: ['cs-cervical'] },
        { id: 'results', h: 'What the results mean',
          p: ['A normal result means your next invitation comes after 5 years.',
            'If the result is unclear, shows mild cell changes, or the HPV test is positive, you get another invitation after 1 to 2 years.',
            'If stronger changes are found, you are invited for a colposcopy. Even then, the reason is almost always mild changes that are not cancer or a cancer precursor.'],
          plain: ['Normal: next letter in 5 years. Unclear or mild changes: another test in 1 to 2 years. Stronger changes: a closer look called a colposcopy. This is almost always not cancer.'],
          src: ['cs-cervical', 'suomifi'] },
        { id: 'why', h: 'Why it matters',
          stats: [{ n: 80, suffix: '%', label: 'lower cervical cancer incidence in Finland, with screening' }],
          p: ['Most cervical cancers are found in women who have not taken part in screening.'],
          plain: ['Most cervical cancers are found in women who did not take part.'],
          src: ['suomifi'] },
        { id: 'vaccine', h: 'The HPV vaccine',
          p: ['HPV causes cervical cancer and some other cancers. The vaccine can prevent infection with the HPV types that most often cause cancer. It protects best when given before sexual activity begins.',
            'The Cancer Society page this is based on dates from 2017. Check THL for current vaccination programme rules.'],
          plain: ['The HPV vaccine prevents infection with the virus types that most often cause cancer. It works best before sexual activity begins.'],
          src: ['cs-hpv'] },
        { id: 'home', h: 'Home sampling (a 2026 study)',
          p: ['In 2026, people who are invited to screening in Central Finland, Kanta-Häme, Ostrobothnia, Pirkanmaa or Päijät-Häme can choose to take the sample at home, as part of a study. The kit is free.',
            'You cannot order a kit without a screening invitation. If the HPV test is positive, you are referred for a sample at a clinic.'],
          plain: ['In 5 counties you can take the sample at home, as part of a study. You need an invitation first.'],
          link: { topic: 'cervical', anchor: 'kit', label: 'Check if this applies to you' },
          src: ['fimlab-hpv'] }
      ],
      related: ['what-screening-is']
    },

    'bowel-home-test': {
      id: 'bowel-home-test', topic: 'bowel', minutes: 4,
      title: 'The bowel test you take at home',
      inShort: 'Every 2 years you get a letter with a test kit. You take a sample at home, post it, and get the result in about a month.',
      sections: [
        { id: 'who', h: 'Who is invited in 2026',
          p: ['In 2026, people turning 60, 62, 64, 66, 68, 70 and 72 are invited. You get a personal letter every 2 years.',
            'Screening is being widened. By 2031 everyone aged 56 to 74 will be invited. It runs county by county.'],
          plain: ['In 2026 people turning 60, 62, 64, 66, 68, 70 or 72 are invited. By 2031 it will be everyone aged 56 to 74.'],
          src: ['fimlab-crc', 'suomifi'] },
        { id: 'steps', h: 'How the test works',
          steps: [
            'The kit and instructions arrive with your invitation.',
            'Fill in the preliminary information form that comes with the invitation.',
            'Read the instructions and watch the sampling video.',
            'Take the sample at home and put it in the return envelope.',
            'Post the envelope within 24 hours. Postage is prepaid.',
            'The laboratory looks for blood you cannot see.'
          ],
          p: [], plain: [], src: ['fimlab-crc', 'cs-colorectal'] },
        { id: 'results', h: 'The result',
          p: ['You get the result within about a month of posting your sample, usually as an electronic message. Since 9 March 2026 it is also visible in MyKanta.',
            'A normal result means no blood was found. Your next invitation comes in 2 years.',
            'A positive result means blood was found. This is not necessarily cancer, but the cause must be found. You contact the screening nurse, and the next step is usually a colonoscopy.'],
          plain: ['You get the result in about a month. Normal: no blood found. Positive: blood found. That is not always cancer, but you need a check.'],
          stats: [{ n: 4, prefix: 'About ', suffix: ' in 100', label: 'people have a positive result' }],
          src: ['fimlab-crc', 'cs-colorectal'] },
        { id: 'why', h: 'Why it matters',
          p: ['Bowel cancer is the third most common cancer in Finland. More than 3,500 people are diagnosed each year, and about 1,300 die from it.',
            'Early on, it often causes no symptoms or only vague ones. Screening can also find changes that can be removed before they become cancer. Current knowledge suggests it can prevent about one in six bowel cancer deaths.'],
          plain: ['Bowel cancer is common in Finland. Early on it often has no symptoms. Screening can prevent about one in six deaths.'],
          src: ['fimlab-crc'] }
      ],
      related: ['what-screening-is']
    },

    'know-your-moles': {
      id: 'know-your-moles', topic: 'skin', minutes: 2,
      title: 'Know your moles',
      inShort: 'Learn what your moles normally look like. See a doctor if one changes or a new, different one appears.',
      sections: [
        { id: 'watch', h: 'What to watch for',
          p: ['Finnish adults have about 50 harmless moles on average. Watch moles that grow fast, change in appearance, become ulcerated or bleed. Also get a mole checked if it is reddening or shrinking.',
            'Melanoma does not look like a normal mole. Its size, shape, colour and edges differ.'],
          plain: ['Watch for a mole that grows fast, changes, bleeds, reddens or shrinks. See a doctor.'],
          src: ['cs-moles'] },
        { id: 'how', h: 'How to check',
          p: ['Check your skin regularly. Use a mirror for areas you cannot see. If a mole has changed, or you find a new one that looks somewhat different, see your doctor.'],
          plain: ['Look at your skin. Use a mirror for your back. See a doctor about changes.'],
          src: ['cs-moles'] },
        { id: 'risk', h: 'Who is at higher risk',
          list: ['More than 100 moles', 'Sunburn, especially in childhood but also later', 'Skin that burns easily, freckles, ginger or fine blond hair', 'A family history of melanoma', 'Having had melanoma before', 'Atypical moles'],
          p: ['Checking matters most if you have a sensitive skin type or other signs of higher melanoma risk.'],
          plain: ['If you burn easily, have many moles or a family history, check more carefully.'],
          src: ['cs-moles'] },
        { id: 'sun', h: 'Sun and skin cancer',
          stats: [{ n: 95, prefix: 'Up to ', suffix: '%', label: 'of skin cancers are due to solar UV radiation' }],
          p: ['Your behaviour in the sun can lower your risk significantly. Melanoma that can be removed by surgery has a good outlook.'],
          plain: ['Protect your skin from the sun. Melanoma found early has a good outlook.'],
          src: ['cs-moles'] }
      ],
      related: ['what-screening-is']
    },

    'testicular-awareness': {
      id: 'testicular-awareness', topic: 'testicular', minutes: 2,
      title: 'Testicular cancer: know your body',
      inShort: 'Testicular cancer is rare, and treatment results are very good. Know what is normal for you, and see a doctor about any change.',
      sections: [
        { id: 'why', h: 'Why it is worth knowing',
          p: ['Testicular cancer is the most common cancer in men under 35, but it is rare. It is very rare over 45. Treatment results are extremely good, and cancer found early can be cured.'],
          plain: ['It is rare. It is most common under 35. Found early, it can be cured.'],
          src: ['cs-testicles'] },
        { id: 'how', h: 'How to check',
          steps: ['Examine both testicles, one after the other, with each hand.', 'Hold a testicle between your thumb and other fingers and rotate it.', 'Feel for lumps or changes on the surface of each testicle.'],
          p: ['A normal testicle has an even surface and moves freely. You can clearly feel the epididymis behind it.'],
          plain: [],
          src: ['cs-testicles'] },
        { id: 'signs', h: 'What to look out for',
          list: ['A lump in the testicle', 'One testicle getting bigger', 'A change in how firm a testicle feels', 'Pain'],
          p: ['A tumour is usually a hard or rubbery lump inside the testicle. If you suspect something, see your doctor.'],
          plain: ['A lump, a change in size or firmness, or pain. See your doctor.'],
          src: ['cs-testicles'] }
      ],
      related: ['what-screening-is']
    },

  };

  /* ---------- Topics ---------- */
  var TOPICS = {
    breast: {
      id: 'breast', name: 'Breast', kicker: 'Screening', national: true, pref: 'breast',
      blurb: 'Ages 50–69. Changes to look for.',
      lede: 'About 5,000 women in Finland are diagnosed each year. More than half are in the screening age group, 50–69.',
      leadSrc: ['registry-breast'],
      programme: 'Mammogram about every 2 years, ages 50–69',
      articles: ['breast-screening', 'what-screening-is'],
      symptoms: {
        title: 'Changes to get checked',
        items: ['A lump in the breast or armpit', 'A change in the shape of the breast', 'Dimpling of the skin', 'A rash or broken skin on the areola', 'A nipple that turns inwards, or discharge from the nipple', 'Redness or swelling of the breast'],
        note: 'Many breast changes are not cancer. Cysts and other harmless changes are common. Get any change checked, even right after a screening.',
        contact: 'Contact your health centre, occupational health clinic or a private clinic. Breast cancer is most common in women. It can also affect men and non-binary people.',
        src: ['cs-breasts']
      },
      check: {
        title: 'Looking and feeling for changes',
        text: ['The most effective way to find breast cancer early is screening. Between screenings, it helps to know how your breasts normally look and feel, so a change stands out.',
          'You do not need a strict routine. Cancer Research UK finds no good evidence that routine self-checks save lives, and says they can lead to extra tests.'],
        src: ['cs-breasts', 'cruk'],
        steps: [
          { h: 'Choose a way that feels comfortable', t: 'There is no set time or set method. Your breasts can feel different at different times of the month, so learn what is normal for you.' },
          { h: 'Look and feel', t: 'Cover the whole area: from the collarbone, across the breast, and into the armpit. Notice shape, skin, nipples and any lumps.' },
          { h: 'Know when to act', t: 'A lump, a change in shape, dimpling, a rash or broken skin on the areola, a turned-in nipple or discharge, or redness or swelling. Contact your health centre about any of these.' }
        ]
      },
      kit: null
    },
    cervical: {
      id: 'cervical', name: 'Cervical', kicker: 'Screening', national: true, pref: 'cervical',
      blurb: 'Ages 30–65. Home sampling tested in some counties.',
      lede: 'Cervical cancer has precursors that screening can find and treat before cancer develops.',
      leadSrc: ['cs-cervical'],
      programme: 'Cell or HPV test every 5 years, ages 30–65',
      articles: ['cervical-screening', 'what-screening-is'],
      symptoms: { pending: 'Symptom guidance goes here after clinical review. It is not written yet.' },
      check: null,
      kit: {
        title: 'Home sampling (2026 study)',
        text: 'In some counties you can take the cervical screening sample at home, as part of a study run by Fimlab. You need a screening invitation first.',
        src: ['fimlab-hpv'],
        kind: 'hpv'
      }
    },
    bowel: {
      id: 'bowel', name: 'Bowel', kicker: 'Screening', national: true, pref: null,
      blurb: 'A test you take at home and post.',
      lede: 'Bowel cancer is the third most common cancer in Finland. The screening test is a kit you use at home.',
      leadSrc: ['fimlab-crc'],
      programme: 'Home test every 2 years. Invited at 60, 62 … 72 now. All ages 56–74 by 2031.',
      articles: ['bowel-home-test', 'what-screening-is'],
      symptoms: { intro: 'In its early stages, bowel cancer often causes no symptoms at all, or only vague ones.', pending: 'A full symptom list goes here after clinical review. It is not written yet.', src: ['fimlab-crc'] },
      check: null,
      kit: {
        title: 'The national home test',
        text: 'The bowel screening test is already a home kit. It arrives with your invitation letter. You do not order it.',
        src: ['fimlab-crc'],
        kind: 'crc'
      }
    },
    skin: {
      id: 'skin', name: 'Skin', kicker: 'Self-check', national: false, pref: null,
      blurb: 'Know your moles. Sun and UV.',
      lede: 'Knowing your moles is the best habit. Check your skin regularly and notice what is normal for you.',
      leadSrc: ['cs-moles', 'suomifi'],
      programme: 'No national screening',
      articles: ['know-your-moles', 'what-screening-is'],
      symptoms: {
        title: 'Changes to get checked',
        items: ['A mole that is growing fast', 'A mole that changes in appearance', 'A mole that is ulcerated or bleeding', 'A mole that is reddening or shrinking', 'A new mole that looks somewhat different from the others'],
        note: 'If a mole has changed or a new, different one appears, see your doctor.',
        contact: 'A doctor diagnoses skin cancer by examining a tissue sample.',
        src: ['cs-moles']
      },
      check: {
        title: 'Checking your skin',
        text: ['Regular checking is the best way to learn about the moles on your skin. Use a mirror for areas you cannot see.'],
        src: ['cs-moles'],
        steps: [
          { h: 'Use good light and a mirror', t: 'Check your whole body. Use a mirror for your back, scalp and other areas you cannot see.' },
          { h: 'Know the ABCDE rule', t: 'Asymmetry, Border, Colour, Diameter, Evolving. The Cancer Society describes ABCDE as a simple memory rule for judging a mole.' },
          { h: 'Look for these changes', t: 'A mole that grows fast, changes in appearance, is ulcerated or bleeding, is reddening or shrinking, or a new mole that looks different.' },
          { h: 'Act on a change', t: 'If a mole has changed or a new, different one appears, see your doctor.' }
        ]
      },
      kit: null
    },
    prostate: {
      id: 'prostate', name: 'Prostate', kicker: 'No programme', national: false, pref: 'prostate',
      blurb: 'The signs to know, and when to talk to your health centre.',
      lede: 'Know the signs, and talk to your health centre if something changes.',
      leadSrc: ['suomifi'],
      programme: 'No national screening',
      articles: ['what-screening-is'],
      symptoms: { pending: 'Symptom guidance goes here after clinical review. It is not written yet.' },
      check: null, kit: null
    },
    testicular: {
      id: 'testicular', name: 'Testicular', kicker: 'Self-check', national: false, pref: 'testicular',
      blurb: 'Most common cancer in men under 35. Rare, and very treatable.',
      lede: 'Testicular cancer is rare. Treatment results are extremely good.',
      leadSrc: ['cs-testicles'],
      programme: 'No national screening',
      articles: ['testicular-awareness', 'what-screening-is'],
      symptoms: {
        title: 'What to look out for',
        items: ['A lump in the testicle', 'One testicle getting bigger', 'A change in how firm a testicle feels', 'Pain'],
        note: 'If you suspect testicular cancer, see your doctor.',
        contact: 'The doctor will feel your testicles, starting with the normal one.',
        src: ['cs-testicles']
      },
      check: {
        title: 'Feeling for changes',
        text: ['Cancer Society of Finland: feel both testicles regularly. Cancer Research UK: no need for a set routine. Either way, know what is normal for you.'],
        src: ['cs-testicles', 'cruk'],
        steps: [
          { h: 'Check one at a time', t: 'Examine both testicles, alternately, with each hand.' },
          { h: 'Hold and rotate', t: 'Hold a testicle between your thumb and other fingers and rotate it.' },
          { h: 'Feel the surface', t: 'Look for lumps or changes on the surface of each testicle. A normal one has an even surface and moves freely.' },
          { h: 'Act on a change', t: 'A lump, a change in size or firmness, or pain. See your doctor.' }
        ]
      },
      kit: null
    }
  };

  var TOPIC_ORDER = ['breast', 'cervical', 'bowel', 'skin', 'prostate', 'testicular'];

  /* ---------- Assistant: general Q&A (each answer cites its sources) ---------- */
  var FAQ = [
    { t: 'breast', k: ['mammogram', 'letter', 'invitation', 'invited', 'interval', 'often'], q: 'When do I get a mammogram letter?', a: 'Every woman aged 50 to 69 is invited by personal letter, about every 2 years. The letter gives a time and a place.', s: ['suomifi', 'stm'] },
    { t: 'breast', k: ['change', 'symptom', 'sign', 'lump', 'check', 'notice'], q: 'Which breast changes need checking?', a: 'Contact your health centre about any of these: a lump in the breast or armpit, a change in the shape of the breast, dimpling of the skin, a rash or broken skin on the areola, a nipple that turns inwards or discharge from the nipple, or redness or swelling of the breast.', s: ['cs-breasts'] },
    { t: 'cervical', k: ['home', 'self', 'sample', 'sampling', 'kit', 'order'], q: 'Can I take the sample at home?', a: 'In some counties you can take the cervical screening sample at home, as part of a study run by Fimlab in 2026. You need a screening invitation first.', s: ['fimlab-hpv'] },
    { t: 'bowel', k: ['invited', 'age', 'old', 'eligible', 'who', 'kit'], q: 'Who is invited in 2026?', a: 'In 2026 people aged 60, 62, 64, 66, 68, 70 and 72 are invited, in the counties on Fimlab’s 2026 list. All ages 56 to 74 will be invited by 2031.', s: ['fimlab-crc'] },
    { k: ['free', 'cost', 'price', 'pay', 'charge', 'fee'], q: 'Is screening free?', a: 'Yes. The screening tests organised by wellbeing services counties are free of charge and voluntary.', s: ['suomifi', 'stm'] },
    { k: ['voluntary', 'mandatory', 'compulsory', 'refuse', 'decline', 'skip', 'obliged'], q: 'Do I have to take part?', a: 'No. Taking part is voluntary. If you do not intend to take part, tell the screening unit using the instructions in your invitation.', s: ['suomifi'] },
    { k: ['change', 'reschedule', 'move', 'postpone', 'appointment'], q: 'Can I change my appointment?', a: 'If you cannot make the appointment, you can change it. If you do not intend to take part, tell the screening unit using the instructions in your invitation.', s: ['suomifi'] },
    { k: ['invitation', 'letter', 'invite', 'invited', 'receive'], q: 'How will I be invited?', a: 'You are invited to all screening tests that concern you by letter. The invitation to breast and cervical screening states the time and place. The bowel cancer test kit arrives with the invitation.', s: ['suomifi', 'fimlab-crc'] },
    { t: 'testicular', k: ['look', 'symptom', 'sign', 'lump', 'notice', 'watch'], q: 'What should I look out for?', a: 'Look out for a lump in the testicle, one testicle getting bigger, a change in how firm a testicle feels, or pain. If you suspect testicular cancer, see your doctor.', s: ['cs-testicles'] },
    { re: /\b(do i have|could i have|might i have|have i got|is (this|it|that) cancer|diagnose me|am i (sick|ill))\b/i, k: ['diagnose', 'diagnosis', 'doctor', 'replace'], q: 'Does care4all diagnose?', a: 'No. care4all gives information and does not diagnose. If you notice a change, contact your health centre.', s: [] }
  ];

  var COPY = {
    outOfScope: 'Our sources do not cover this. Ask your screening unit or health centre.',
    disclaimer: 'care4all gives information. It does not diagnose.',
    help: 'Urgent but not life-threatening: call 116 117. Emergency: call 112.'
  };

  /* ---------- UI strings (FI and SV are first drafts. Have native speakers review them.) ---------- */
  var I18N = {
    en: {
      home: 'Home', fight: 'Fight', topics: 'Topics', reminders: 'Reminders', profile: 'Profile', sources: 'Sources',
      hello: 'Hello', yourScreening: 'Your screening', whereYouStand: 'Where you stand',
      threeScreenings: 'Three national screenings', topicsForYou: 'Topics for you', cancerTypes: 'Cancer types',
      reading: 'This week’s reading', awareness: 'Awareness', ask: 'Ask care4all', askQ: 'Your question', askBtn: 'Ask',
      setReminder: 'Set a reminder', saveReminder: 'Save reminder', cancel: 'Cancel', back: 'Back', cont: 'Continue',
      listen: 'Listen', stopListen: 'Stop', textSize: 'Text size', plain: 'Plain language', inShort: 'In short',
      learn: 'Learn', symptoms: 'Symptoms to watch', knowNormal: 'Know your normal', kit: 'Home test kit',
      install: 'Install', language: 'Language', enOnly: 'Article text is in English only in this prototype.'
    },
    fi: {
      home: 'Koti', fight: 'Taistele', topics: 'Aiheet', reminders: 'Muistutukset', profile: 'Profiili', sources: 'Lähteet',
      hello: 'Hei', yourScreening: 'Seulontasi', whereYouStand: 'Tilanteesi',
      threeScreenings: 'Kolme kansallista seulontaa', topicsForYou: 'Sinulle sopivat aiheet', cancerTypes: 'Syöpätyypit',
      reading: 'Tämän viikon luettavaa', awareness: 'Tietoa', ask: 'Kysy care4allilta', askQ: 'Kysymyksesi', askBtn: 'Kysy',
      setReminder: 'Aseta muistutus', saveReminder: 'Tallenna muistutus', cancel: 'Peruuta', back: 'Takaisin', cont: 'Jatka',
      listen: 'Kuuntele', stopListen: 'Pysäytä', textSize: 'Tekstin koko', plain: 'Selkokieli', inShort: 'Lyhyesti',
      learn: 'Opi', symptoms: 'Oireet, joihin kannattaa reagoida', knowNormal: 'Tunne oma normaalisi', kit: 'Kotitestipaketti',
      install: 'Asenna', language: 'Kieli', enOnly: 'Artikkelien teksti on tässä prototyypissä vain englanniksi.'
    },
    sv: {
      home: 'Hem', fight: 'Kämpa', topics: 'Ämnen', reminders: 'Påminnelser', profile: 'Profil', sources: 'Källor',
      hello: 'Hej', yourScreening: 'Din screening', whereYouStand: 'Din situation',
      threeScreenings: 'Tre nationella screeningar', topicsForYou: 'Ämnen för dig', cancerTypes: 'Cancertyper',
      reading: 'Veckans läsning', awareness: 'Kunskap', ask: 'Fråga care4all', askQ: 'Din fråga', askBtn: 'Fråga',
      setReminder: 'Ställ in en påminnelse', saveReminder: 'Spara påminnelse', cancel: 'Avbryt', back: 'Tillbaka', cont: 'Fortsätt',
      listen: 'Lyssna', stopListen: 'Stopp', textSize: 'Textstorlek', plain: 'Lättläst', inShort: 'Kort sagt',
      learn: 'Lär dig', symptoms: 'Symtom att vara uppmärksam på', knowNormal: 'Lär känna din kropp', kit: 'Hemtestsats',
      install: 'Installera', language: 'Språk', enOnly: 'Artikeltexten är bara på engelska i den här prototypen.'
    }
  };

  /* Example profile used by the "Try with an example" button. */
  var EXAMPLE = { name: 'Aino', yob: 1974, sex: 'female', county: 'pirkanmaa' };

  return {
    YEAR: YEAR, COUNTIES: COUNTIES,
    SOURCES: SOURCES, ARTICLES: ARTICLES, TOPICS: TOPICS, TOPIC_ORDER: TOPIC_ORDER,
    FAQ: FAQ, COPY: COPY, I18N: I18N, EXAMPLE: EXAMPLE
  };
})();
