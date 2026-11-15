// Finnish drafts for prisma/seed-data/risk-content.ts. Written for this product from the English of the design's risk script
// (they are not taken from a source) and not reviewed by a native speaker: the seed module says finnish: "unreviewed".
// The extraction tool (extract-risk-content.mjs) looks every text up here and stops when one is missing, so English is
// never copied into a Finnish slot. Numbers, ids, source names and organisations (Käypä hoito, Duodecim, STUK) stay as they are.
// Wording is information only (docs/design-v2.md section 13).

/** Full names of the cancer types, by ContentTopic id. */
export const typeNameFi = {
  lung: "Keuhkosyöpä", bowel: "Suolistosyöpä", breast: "Rintasyöpä", prostate: "Eturauhassyöpä", skin: "Ihosyöpä",
  cervical: "Kohdunkaulasyöpä", womb: "Kohdunrunkosyöpä", ovary: "Munasarjasyöpä", bladder: "Virtsarakkosyöpä", kidney: "Munuaissyöpä",
  liver: "Maksasyöpä", pancreas: "Haimasyöpä", stomach: "Mahasyöpä", mouththroat: "Suu- ja nielusyöpä", thyroid: "Kilpirauhassyöpä",
  testicular: "Kivessyöpä",
};

/** What the questions cannot cover, by type, in the order of RULES[type].not. */
export const notCoveredFi = {
  lung: ["Radon kotona (STUKin mukaan yksittäisen ihmisen omaa riskiä ei voi laskea)", "Kuinka monta vuotta tupakoit ja kuinka paljon", "Sukulaisen keuhkosyöpä"],
  bowel: ["Suolen polyypit", "Perinnölliset oireyhtymät, kuten Lynchin oireyhtymä ja FAP", "Kuinka paljon syöt kuitua"],
  breast: ["Perinnölliset geenimuutokset, kuten BRCA1 ja BRCA2", "Ikä ensimmäisten kuukautisten ja vaihdevuosien aikaan, lapset, imetys", "Hormonihoito ja ehkäisypilleri", "Tiivis rintakudos", "Aiempi rintakehän sädehoito"],
  cervical: ["HPV-infektio itsessään", "Heikentynyt immuunipuolustus", "Ikä ensimmäisen yhdynnän aikaan ja kumppanien määrä (yksityisiä asioita, joten niistä ei kysytä)", "Ehkäisypillerin käyttö", "Lasten määrä"],
  kidney: ["Sukulaisen munuaissyöpä", "Harvinaiset perinnölliset sairaudet", "Pitkäaikainen dialyysi tai munuaissairaus", "Munuaiskivet"],
  liver: ["Hepatiitti C:n ja D:n testaus", "Sukulaisen maksasyöpä"],
  pancreas: ["Haiman pitkäaikainen tulehdus", "Sukulaisen haimasyöpä tai BRCA2-geenimuutos"],
  prostate: ["BRCA2 ja muut geenimuutokset", "Afrikkalainen tai karibialainen tausta", "Torjunta-aineille altistuminen"],
  skin: ["Lapsuuden auringonpolttamat", "Aiempi ihosyöpä", "Epätavallisen näköiset luomet", "Elinsiirto"],
  womb: ["Hormonihoito ilman keltarauhashormonia", "Kuukautiset ja lapset", "Monirakkulainen munasarjaoireyhtymä (PCOS)", "Paksuuntunut kohdun limakalvo", "Tiedossa oleva Lynchin oireyhtymä"],
  ovary: ["Perinnölliset geenimuutokset", "Endometrioosi", "Hormonihoito", "Ikä ensimmäisten kuukautisten ja vaihdevuosien aikaan, lapset, ehkäisypilleri", "Hedelmättömyys"],
  bladder: ["Virtsarakon pitkäaikainen ärsytys", "Aiempi lantion alueen sädehoito", "Sukulaisen virtsarakkosyöpä"],
  stomach: ["Sukulaisen mahasyöpä", "Suolainen ruoka ja vähäinen kasvisten ja hedelmien syönti", "Pernisiöösi anemia"],
  mouththroat: ["HPV (suun takana olevan nielun osalta)", "Valkoiset tai punaiset läiskät suussa", "Ientaudit", "Purutupakka tai betelpähkinä"],
  thyroid: ["Sukulaisen kilpirauhassyöpä", "Struuma, Hashimoton tauti tai kilpirauhasen kyhmyt"],
  testicular: ["Aiempi kivessyöpä", "Hypospadia", "HIV"],
};

const famTip = "Kerro lääkärille sukuhistoriastasi. Hän voi kertoa, muuttaako se sitä, mikä sopii sinulle.";
const checkups = "Käy lääkärin sovituilla tarkastuksilla ja mainitse tämä vastaanotolla.";
const testisTip = "Tarkista kiveksesi kerran kuukaudessa ja mainitse tämä lääkärille.";
const fam = (what, early) => ({
  early: "Lähisukulaisellasi on ollut " + what + ", ja yksi sukulainen sai diagnoosin ennen 50 vuoden ikää",
  yes: "Lähisukulaisellasi on ollut " + what,
  no: "Tietääksesi lähisukulaisellasi ei ole " + early,
});

/** Factors, by LIB key: name, short (the design's SHORT, or the name in lower case), tip (null for age) and the sentence for each state. */
export const factorFi = {
  smoke: { name: "Tupakointi", short: "tupakointi", tip: "Terveyskeskus voi auttaa sinua lopettamaan suunnitelman ja lääkkeiden avulla. Hyöty kasvaa jokaisen savuttoman vuoden myötä.",
    you: { now: "Tupakoit tai käytät tupakkatuotteita", past: "Olet aiemmin tupakoinut tai käyttänyt tupakkatuotteita", never: "Et ole koskaan tupakoinut" } },
  alcohol: { name: "Alkoholi", short: "alkoholi", tip: "Syövän ehkäisyn kannalta eurooppalaisessa syöpäkoodissa todetaan, että alkoholin välttäminen on parasta ja vähempi on parempi.",
    you: { never: "Et käytä alkoholia", rare: "Käytät alkoholia muutaman kerran vuodessa", weekly: "Käytät alkoholia useimpina viikkoina", daily: "Käytät alkoholia useimpina päivinä" } },
  bmi: { name: "Kehon paino", short: "paino", tip: "Pienet askeleet ratkaisevat: enemmän liikuntaa sekä vähemmän runsasenergisiä ruokia ja sokeripitoisia juomia. Pyydä tukea terveyskeskuksesta.",
    you: { ok: "Painoindeksisi on alle 25", over: "Painoindeksisi on 25–29,9 (ylipaino)", ob: "Painoindeksisi on 30–39,9 (lihavuus)", ob2: "Painoindeksisi on 40 tai enemmän (vaikea lihavuus)" } },
  active: { name: "Liikunta", short: "vähäinen liikunta", tip: "Tavoitteena on 150–300 minuuttia reipasta liikuntaa viikossa. Lyhyt päivittäinen kävely on hyvä alku.",
    you: { high: "Olet aktiivinen useimpina päivinä", some: "Olet aktiivinen muutamana päivänä viikossa", low: "Liikut tuskin lainkaan" } },
  meat: { name: "Punainen ja prosessoitu liha", short: "punainen ja prosessoitu liha", tip: "Eurooppalaisessa syöpäkoodissa kehotetaan rajoittamaan punaista lihaa ja välttämään prosessoitua lihaa, kuten makkaraa ja kinkkua.",
    you: { yes: "Syöt punaista tai prosessoitua lihaa useimpina päivinä", no: "Et syö punaista tai prosessoitua lihaa useimpina päivinä" } },
  sunbed: { name: "Solarium", short: "solarium", tip: "Vältä solariumia. Voimakkaassa auringossa käytä varjoa, vaatteita ja aurinkovoidetta.",
    you: { yes: "Olet käyttänyt solariumia säännöllisesti", no: "Et ole käyttänyt solariumia säännöllisesti" } },
  outdoor: { name: "Aurinko työssä tai ulkona", short: "auringolle altistuminen", tip: "Suojaa ihosi vaatteilla ja aurinkovoiteella ja tarkista ihosi kerran kuukaudessa.",
    you: { yes: "Vietät paljon aikaa ulkona auringossa", no: "Et vietä paljon aikaa ulkona auringossa" } },
  work: { name: "Työperäiset altisteet", short: "työperäiset altisteet", tip: "Kerro työterveyshuollolle ja lääkärille aiemmista altisteista.",
    you: { yes: "Olet työskennellyt asbestin, pölyn, dieselpakokaasujen tai kemikaalien parissa", no: "Et ole työskennellyt asbestin, pölyn, dieselpakokaasujen tai kemikaalien parissa" } },
  passive: { name: "Toisten tupakansavu", short: "toisten tupakansavu", tip: "Pidä kotisi ja autosi savuttomana.",
    you: { yes: "Asut tai työskentelet ihmisten kanssa, jotka tupakoivat sisällä", no: "Et asu etkä työskentele ihmisten kanssa, jotka tupakoivat sisällä" } },
  diab: { name: "Diabetes", short: "diabetes", tip: checkups, you: { yes: "Sinulla on diabetes", no: "Sinulla ei ole diabetesta" } },
  bp: { name: "Korkea verenpaine", short: "korkea verenpaine", tip: checkups, you: { yes: "Sinulla on korkea verenpaine", no: "Sinulla ei ole korkeaa verenpainetta" } },
  ibd: { name: "Pitkäaikainen suolistotulehdus", short: "suolistotulehdus", tip: "Kysy lääkäriltä, kuinka usein sinun tulisi käydä suolen tähystyksessä.",
    you: { yes: "Sinulla on pitkäaikainen suolistotulehdus", no: "Sinulla ei ole pitkäaikaista suolistotulehdusta" } },
  liverd: { name: "Maksasairaus tai hepatiitti", short: "maksasairaus", tip: "Kysy lääkäriltä, millainen seuranta sopii maksallesi.",
    you: { yes: "Sinulla on pitkäaikainen maksasairaus tai hepatiitti B tai C", no: "Sinulla ei ole pitkäaikaista maksasairautta eikä hepatiitti B:tä tai C:tä" } },
  copd: { name: "Pitkäaikainen keuhkosairaus", short: "keuhkosairaus", tip: "Käy lääkärin sovituilla tarkastuksilla ja mainitse yskä, joka muuttuu.",
    you: { yes: "Sinulla on pitkäaikainen keuhkosairaus, kuten COPD", no: "Sinulla ei ole pitkäaikaista keuhkosairautta" } },
  stomachd: { name: "Pitkäaikaiset mahaongelmat", short: "mahaongelmat", tip: "Kysy lääkäriltä, pitäisikö sinut testata ja hoitaa H. pylori -infektion varalta.",
    you: { yes: "Sinulla on pitkäaikaisia mahaongelmia", no: "Sinulla ei ole pitkäaikaisia mahaongelmia" } },
  prior: { name: "Aiempi syöpä tai sädehoito", short: "aiempi syöpä tai sädehoito", tip: "Noudata saamaasi seurantaa ja mainitse tämä vastaanotolla.",
    you: { yes: "Olet sairastanut syövän tai saanut sädehoitoa niskan tai lantion alueelle", no: "Et ole sairastanut syöpää etkä saanut sädehoitoa niskan tai lantion alueelle" } },
  famBreast: { name: "Sukuhistoria", short: "sukuhistoria", tip: famTip, you: fam("rinta- tai munasarjasyöpä", "rinta- tai munasarjasyöpää") },
  famBowel: { name: "Sukuhistoria", short: "sukuhistoria", tip: famTip, you: fam("suolistosyöpä", "suolistosyöpää") },
  famProstate: { name: "Sukuhistoria", short: "sukuhistoria", tip: famTip, you: fam("eturauhassyöpä", "eturauhassyöpää") },
  famSkin: { name: "Sukuhistoria", short: "sukuhistoria", tip: famTip,
    you: { early: "Lähisukulaisellasi on ollut ihosyöpä, ja yksi sukulainen sai diagnoosin ennen 50 vuoden ikää", yes: "Lähisukulaisellasi on ollut melanooma tai muu ihosyöpä", no: "Tietääksesi lähisukulaisellasi ei ole ihosyöpää" } },
  sun: { name: "Ihotyyppi", short: "ihotyyppi", tip: "Tarkista ihosi kerran kuukaudessa ja suojaa se voimakkaalta auringolta.",
    you: { burns: "Palat helposti etkä juuri rusketu", tans: "Palat ja sitten rusketut", rare: "Palat harvoin" } },
  moles: { name: "Luomet", short: "luomet", tip: "Katso koko ihosi kerran kuukaudessa, jotta huomaat muutokset. Voin näyttää, miten.",
    you: { many: "Sinulla on yli 100 luomea", some: "Sinulla on 50–100 luomea", few: "Sinulla on alle 50 luomea" } },
  hbv: { name: "Hepatiitti B -rokote", short: "hepatiitti B -rokotteen puuttuminen", tip: "Kysy terveyskeskuksesta, onko hepatiitti B -rokote sinulle maksuton.",
    you: { yes: "Olet saanut hepatiitti B -rokotteen", no: "Et ole saanut hepatiitti B -rokotetta" } },
  hpv: { name: "HPV-rokote", short: "HPV-rokotteen puuttuminen", tip: "Kysy terveyskeskuksesta, tarjotaanko HPV-rokotetta sinulle.",
    you: { yes: "Olet saanut HPV-rokotteen", no: "Et ole saanut HPV-rokotetta" } },
  scrC: { name: "Kohdunkaulan seulonta", short: "myöhästynyt seulonta", tip: "Varaa näytteenotto, kun sinut kutsutaan, tai kysy terveyskeskuksesta.",
    you: { ok: "Olet käynyt kohdunkaulan seulonnassa viimeisten 5 vuoden aikana", overdue: "Et ole käynyt kohdunkaulan seulonnassa viimeisten 5 vuoden aikana" } },
  testisU: { name: "Laskeutumaton kives", short: "laskeutumaton kives", tip: testisTip,
    you: { yes: "Kiveksesi oli laskeutumaton lapsena", no: "Ei laskeutumatonta kivestä lapsena" } },
  testisR: { name: "Sukuhistoria", short: "sukuhistoria", tip: testisTip,
    you: { yes: "Isälläsi tai veljelläsi oli kivessyöpä", no: "Isälläsi tai veljelläsi ei ollut kivessyöpää" } },
  age: { name: "Ikä", short: "ikä", tip: null, you: { any: "Olet {age} vuoden ikäinen" } },
};

const smokeBladder = "Tupakointi suurentaa virtsarakkosyövän riskin 4–10-kertaiseksi.";
const lowerAfterStopping = "Riski pienenee tupakoinnin lopettamisen jälkeen, mutta pysyy suurempana kuin niillä, jotka eivät ole koskaan tupakoineet.";
const heavyDrink = "Alkoholi suurentaa suolistosyövän riskiä, ja riski kasvaa määrän mukana. Eurooppalaisessa syöpäkoodissa kehotetaan välttämään alkoholia.";
const overweightBowel = "Ylimääräinen paino suurentaa suolistosyövän riskiä. Eurooppalaisen syöpäkoodin mukaan vähintään 13 syöpää johtuu liiallisesta kehon rasvasta.";
const famBreastText = "Lähisukulaisen rinta- tai munasarjasyöpä voi viitata BRCA2-geenimuutokseen, joka suurentaa eturauhassyövän riskiä. Käypä hoito -suosituksessa ehdotetaan PSA-testausta 40 vuoden iästä alkaen BRCA2-geenimuutoksen kantajille.";
const prostateOne = "Suomessa yksi lähisukulainen, jolla on eturauhassyöpä, tarkoittaa noin 2,5-kertaista riskiä ja kaksi sukulaista noin 5-kertaista riskiä.";
const smokeKidney = "Tupakointi on Suomessa tärkein yksittäinen munuaissyövän riskitekijä.";
const weightKidney = "Ylipaino ja lihavuus ovat tunnettuja munuaissyövän riskitekijöitä.";
const smokePancreas = "Tupakointi on yksi tärkeimmistä haimasyövän riskitekijöistä, joihin voit itse vaikuttaa.";
const weightPancreas = "Ylipaino tai lihavuus suurentaa haimasyövän riskiä.";
const smokeStomach = "Tupakointi on mahasyövän riskitekijä.";
const smokeMouth = "Tupakoivilla suusyövän riski on noin 6-kertainen. Riski pienenee nopeasti tupakoinnin lopettamisen jälkeen.";
const alcoholMouth = "Runsas alkoholinkäyttö tuo myös noin 6-kertaisen riskin, ja tupakointi yhdessä runsaan alkoholinkäytön kanssa suurentaa sen 15–30-kertaiseksi.";
const weightLiver = "Rasvamaksa, joka liittyy ylipainoon ja diabetekseen, voi johtaa maksasyöpään.";
const weightProstate = "Ylipaino ja metabolinen oireyhtymä voivat liittyä eturauhassyöpään, selvimmin aggressiiviseen tyyppiin.";
const famSkin = "Vanhemman tai sisaruksen melanooma kaksinkertaistaa oman melanoomariskisi.";
const famWomb = "Suolisto-, munasarja- tai kohdunrunkosyöpä suvussa voi viitata Lynchin oireyhtymään, joka suurentaa kohdunrunkosyövän riskiä.";
const famOvary = "Lähisukulaisen munasarja- tai rintasyöpä voi viitata perinnölliseen geenimuutokseen, kuten BRCA1, BRCA2 tai Lynchin oireyhtymä. Suomalaisessa ohjeistuksessa suositellaan perinnöllisen riskin selvittämistä, jos kahdella tai useammalla sukulaisella oli munasarjasyöpä tai kolmella tai useammalla rinta- tai munasarjasyöpä. En tiedä, mikä näistä koskee sinua, joten kerro asiasta lääkärillesi.";

/** The statements, by "type factor state" (the keys of the facts the extraction tool makes). */
export const factFi = {
  "lung smoke now": "Suomalaisten lähteiden mukaan tupakoitsijan keuhkosyöpäriski on 15–30-kertainen verrattuna henkilöön, joka ei ole koskaan tupakoinut, ja 80–90 keuhkosyövästä sadasta johtuu tupakasta.",
  "lung smoke past": lowerAfterStopping + " Britannian tietojen mukaan riski on noin 43 % pienempi 7 savuttoman vuoden jälkeen ja 72 % pienempi 12 vuoden jälkeen. En tiedä, kuinka paljon tupakoit tai milloin lopetit.",
  "lung smoke never": "Noin 15 keuhkosyöpäpotilaasta sadasta Suomessa ei ole koskaan tupakoinut. Tupakoimattomuus pienentää riskiä paljon, mutta ei poista sitä.",
  "lung passive yes": "Muiden tupakansavun hengittäminen suurentaa riskiä noin 24 % ihmisillä, jotka eivät itse tupakoi.",
  "lung work yes": "Asbesti, piidioksidi, dieselpakokaasut ja jotkin metallit suurentavat riskiä. Asbesti yhdessä tupakoinnin kanssa voi suurentaa sitä jopa 50-kertaiseksi.",
  "lung copd yes": "Pitkäaikainen keuhkosairaus, kuten COPD, liittyy suurempaan riskiin. Tupakointi selittää osan tästä yhteydestä.",
  "lung age any": "Suurin osa keuhkosyövistä todetaan Suomessa yli 70-vuotiailla, ja vain noin joka kymmenes alle 60-vuotiaana.",

  "bowel famBowel early": "Lähisukulaisen suolistosyöpä, erityisesti jos se todettiin ennen 45 vuoden ikää, voi tarkoittaa suurentunutta riskiä. Kerroit, että sukulainen sai diagnoosin ennen 50 vuoden ikää, mutta en tiedä, kuka heistä. Noin 5 suolistosyövästä sadasta johtuu perinnöllisestä oireyhtymästä, kuten Lynchin oireyhtymästä, joten kerro asiasta lääkärillesi.",
  "bowel famBowel yes": "Lähisukulaisen suolistosyöpä suurentaa riskiäsi. Britannian tietojen mukaan riski yli kaksinkertaistuu, jos sairastunut on vanhempi, veli, sisko tai lapsi.",
  "bowel ibd yes": "Pitkäaikainen suolistotulehdus suurentaa riskiä (Britannian tiedot: noin 70 % suurempi). Noin 5 sadasta ihmisestä, joilla se on ollut 20 vuotta tai pidempään, sairastuu suolistosyöpään. Suomessa suositellaan säännöllisiä tähystystutkimuksia lääkärin päättämällä tavalla.",
  "bowel smoke now": "Tupakoivilla suolistosyövän riski on noin 17–21 % suurempi kuin niillä, jotka eivät ole koskaan tupakoineet (Britannian tiedot).",
  "bowel alcohol daily": heavyDrink,
  "bowel alcohol weekly": heavyDrink,
  "bowel bmi ob2": overweightBowel,
  "bowel bmi ob": overweightBowel,
  "bowel bmi over": overweightBowel,
  "bowel active low": "Aktiivisuus pienentää paksusuolisyövän riskiä. Liian vähäinen liikunta vaikuttaa noin joka kymmenenteen paksusuolisyöpään Euroopassa.",
  "bowel meat yes": "Prosessoitu liha on luokiteltu syöpää aiheuttavaksi ja punainen liha todennäköisesti syöpää aiheuttavaksi. Eurooppalaisessa syöpäkoodissa kehotetaan rajoittamaan punaista lihaa ja välttämään prosessoitua lihaa.",
  "bowel diab yes": "Tyypin 2 diabetes liittyy 22–30 % suurempaan suolistosyövän riskiin (Britannian tiedot).",
  "bowel age any": "Suurin osa suolistosyöpäpotilaista Suomessa on yli 60-vuotiaita, ja keski-ikä diagnoosihetkellä on 71 vuotta.",

  "breast famBreast early": "Lähisukulaisen rinta- tai munasarjasyöpä suurentaa riskiäsi. Suomalaisessa ohjeistuksessa suositellaan perinnöllisen riskin selvittämistä, jos kahdella lähisukulaisella oli rintasyöpä ennen 50 vuoden ikää, yhdellä ennen 40 vuoden ikää tai kolmella tai useammalla rinta- tai munasarjasyöpä. En tiedä, mikä näistä koskee sinua, joten kerro asiasta lääkärillesi.",
  "breast famBreast yes": "Lähisukulaisen rinta- tai munasarjasyöpä suurentaa riskiäsi. Noin 10 rintasyövästä sadasta Suomessa on perinnöllisiä.",
  "breast alcohol daily": "Alkoholi suurentaa rintasyövän riskiä suoraan määrän mukaan, ja Käypä hoito -suosituksen mukaan turvallista määrää ei ole.",
  "breast alcohol weekly": "Alkoholi suurentaa rintasyövän riskiä suoraan määrän mukaan, ja Käypä hoito -suosituksen mukaan turvallista määrää ei ole.",
  "breast bmi ob2": "Liikapaino suurentaa rintasyövän riskiä, enimmäkseen vaihdevuosien jälkeen. Eurooppalainen syöpäkoodi luettelee rintasyövän liiallisesta kehon rasvasta johtuvien syöpien joukossa.",
  "breast bmi ob": "Liikapaino suurentaa rintasyövän riskiä, enimmäkseen vaihdevuosien jälkeen. Eurooppalainen syöpäkoodi luettelee rintasyövän liiallisesta kehon rasvasta johtuvien syöpien joukossa.",
  "breast bmi over": "Liikapaino suurentaa rintasyövän riskiä, enimmäkseen vaihdevuosien jälkeen. Eurooppalainen syöpäkoodi luettelee rintasyövän liiallisesta kehon rasvasta johtuvien syöpien joukossa.",
  "breast active low": "Liian vähäinen liikunta vaikuttaa noin 9 rintasyöpään sadasta Euroopassa.",
  "breast smoke now": "Tupakointi suurentaa rintasyövän riskiä hieman.",

  "cervical smoke now": "Tupakointi suurentaa kohdunkaulasyövän riskiä.",
  "cervical hpv yes": "Rokote suojaa niiltä HPV-tyypeiltä, jotka aiheuttavat suurimman osan kohdunkaulasyövistä. Käyt silti seulonnassa, kun sinut kutsutaan.",
  "cervical hpv no": "Pitkään jatkunut korkean riskin HPV-tyypin infektio on tärkein syy. Rokote suojaa siltä. Terveyskeskus voi kertoa, tarjotaanko se sinulle.",
  "cervical scrC overdue": "Seulonta löytää kohdunkaulan muutokset ennen kuin niistä tulee syöpää, minkä vuoksi se on vähentänyt kohdunkaulasyöpää Suomessa niin paljon.",

  "kidney smoke now": smokeKidney,
  "kidney smoke past": smokeKidney,
  "kidney bmi ob2": weightKidney,
  "kidney bmi ob": weightKidney,
  "kidney bmi over": weightKidney,
  "kidney bp yes": "Korkea verenpaine on tunnettu munuaissyövän riskitekijä.",
  "kidney active low": "Aktiivisuus pienentää munuaissyövän riskiä.",
  "kidney work yes": "Jotkin kemikaalit työssä suurentavat riskiä, mutta tämä on harvinaista.",

  "liver liverd yes": "Yli 90 maksasyöpäpotilaasta sadasta Suomessa on vaurioitunut maksa kirroosin tai muun pitkäaikaisen maksasairauden vuoksi. Krooniset B- ja C-hepatiitit ovat myös merkittäviä syitä maailmanlaajuisesti.",
  "liver alcohol daily": "Alkoholin aiheuttama maksavaurio on yleisin maksasyövän syy Suomessa.",
  "liver alcohol weekly": "Alkoholin aiheuttama maksavaurio on yleisin maksasyövän syy Suomessa.",
  "liver bmi ob2": weightLiver,
  "liver bmi ob": weightLiver,
  "liver bmi over": weightLiver,
  "liver diab yes": "Diabetes liittyy rasvamaksatautiin ja maksasyöpään.",
  "liver smoke now": "Tupakointi on luettu maksasyövän riskitekijäksi.",
  "liver hbv yes": "Hepatiitti B -rokote ehkäisee infektion, joka voi johtaa maksasyöpään.",
  "liver hbv no": "Pitkäaikainen hepatiitti B voi johtaa maksasyöpään, ja rokote ehkäisee infektion. Terveyskeskus voi kertoa, onko rokote sinulle maksuton.",
  "liver work yes": "Jotkin kemikaalit työssä, kuten vinyylikloridi ja arseeni, liittyvät maksasyöpään.",
  "liver age any": "Kaksi kolmesta maksasyöpäpotilaasta Suomessa on miehiä, ja syöpä todetaan useimmiten noin 70 vuoden iässä.",

  "pancreas smoke now": smokePancreas,
  "pancreas smoke past": smokePancreas,
  "pancreas bmi ob2": weightPancreas,
  "pancreas bmi ob": weightPancreas,
  "pancreas bmi over": weightPancreas,
  "pancreas diab yes": "Pitkäaikainen diabetes liittyy haimasyöpään, ja syöpä voi joskus aiheuttaa diabeteksen.",
  "pancreas meat yes": "Runsas punaisen tai prosessoidun lihan syöminen liittyy haimasyöpään, mutta näyttö on heikompaa.",
  "pancreas alcohol daily": "Runsas alkoholinkäyttö monen vuoden ajan liittyy haimasyöpään, mutta näyttö on heikompaa.",
  "pancreas age any": "Haimasyöpä todetaan useimmiten noin 70 vuoden iässä.",

  "prostate famProstate early": prostateOne + " Kaksi alle 55-vuotiasta lähisukulaista on voimakas merkki perinnöllisestä riskistä. Kerroit, että sukulainen sai diagnoosin ennen 50 vuoden ikää, mutta en tiedä, kuinka moni sukulainen sairastui, joten kerro asiasta lääkärillesi.",
  "prostate famProstate yes": prostateOne + " En tiedä, kuinka moni sukulainen sairastui.",
  "prostate famBreast early": famBreastText,
  "prostate famBreast yes": famBreastText,
  "prostate bmi ob2": weightProstate,
  "prostate bmi ob": weightProstate,
  "prostate smoke now": "Tupakointi suurentaa eturauhassyöpään kuoleman todennäköisyyttä.",
  "prostate age any": "Suomalaisen ohjeistuksen mukaan PSA-testiä voidaan harkita 50 vuoden iästä alkaen tai 45 vuoden iästä, jos lähisukulaisella on eturauhassyöpä. Noin 6 miestä sadasta saa diagnoosin 80 vuoden ikään mennessä.",

  "skin moles many": "Jos luomia on 120 tai enemmän, melanoomariski on noin 20-kertainen verrattuna henkilöön, jolla on alle 50 luomea. Kerroit, että sinulla on yli 100 luomea.",
  "skin moles some": "Keskimääräistä useammat luomet suurentavat melanoomariskiä. Ihon katsominen kerran kuukaudessa auttaa huomaamaan muutokset.",
  "skin sun burns": "Vaalea iho, joka palaa helposti, yhdessä vaaleiden tai punaisten hiusten ja pisamien kanssa kaksinkertaistaa melanoomariskin.",
  "skin sunbed yes": "Solariumin ja auringon UV-valo on tärkein ihosyövän aiheuttaja. Runsas solariumin käyttö suurentaa riskiä, eikä solariumia suositella alle 18-vuotiaille tai suuremmassa riskissä oleville.",
  "skin outdoor yes": "Auringossa vietetyt vuodet kasvattavat elinikäistä UV-annostasi ja suurentavat ihosyövän riskiä, huulisyöpä mukaan lukien.",
  "skin famSkin early": famSkin,
  "skin famSkin yes": famSkin,

  "womb bmi ob2": "Kun painoindeksi on 40 tai enemmän, kohdunrunkosyövän riski on noin 20-kertainen normaalipainoiseen verrattuna (Käypä hoito).",
  "womb bmi ob": "Kun painoindeksi on 30 tai enemmän, kohdunrunkosyövän riski on noin 5-kertainen normaalipainoiseen verrattuna (Käypä hoito).",
  "womb bmi over": "Liikapaino on suurin kohdunrunkosyövän riskitekijä, johon voit itse vaikuttaa.",
  "womb diab yes": "Diabetes on tunnettu kohdunrunkosyövän riskitekijä.",
  "womb active low": "Aktiivisuus pienentää kohdunrunkosyövän riskiä.",
  "womb famBowel early": famWomb,
  "womb famBowel yes": famWomb,
  "womb prior yes": "Lantion alueen sädehoito ja rintasyövän jälkeinen pitkäaikainen tamoksifeenihoito ovat tunnettuja riskitekijöitä.",

  "ovary famBreast early": famOvary,
  "ovary famBreast yes": famOvary,
  "ovary bmi ob2": "Ylipaino suurentaa munasarjasyövän riskiä hieman.",
  "ovary bmi ob": "Ylipaino suurentaa munasarjasyövän riskiä hieman.",
  "ovary bmi over": "Ylipaino suurentaa munasarjasyövän riskiä hieman.",
  "ovary diab yes": "Diabetes on tunnettu munasarjasyövän riskitekijä.",
  "ovary prior yes": "Aiempi rinta- tai suolistosyöpä tai sädehoito on tunnettu riskitekijä.",
  "ovary smoke now": "Tupakointi suurentaa joidenkin munasarjasyöpätyyppien riskiä.",

  "bladder smoke now": smokeBladder,
  "bladder smoke past": lowerAfterStopping + " " + smokeBladder,
  "bladder work yes": "Työ joidenkin kemikaalien (kumi, maali, öljyteollisuus) parissa suurentaa riskiä, mutta sen merkitys Suomessa on nykyään pieni.",
  "bladder bmi ob2": "Ylipaino on tunnettu virtsarakkosyövän riskitekijä.",
  "bladder bmi ob": "Ylipaino on tunnettu virtsarakkosyövän riskitekijä.",
  "bladder diab yes": "Diabetes on tunnettu virtsarakkosyövän riskitekijä.",
  "bladder age any": "Noin 3 virtsarakkosyöpäpotilaasta 4:stä Suomessa on miehiä, ja syöpä todetaan useimmiten 75–79-vuotiaana.",

  "stomach smoke now": smokeStomach,
  "stomach smoke past": smokeStomach,
  "stomach stomachd yes": "Pitkäaikainen H. pylori -infektio, krooninen mahakatarri, mahalaukun polyypit ja osittain poistettu mahalaukku ovat riskitekijöitä. Eurooppalaisessa syöpäkoodissa suositellaan H. pylori -infektion testaamista ja hoitoa.",
  "stomach active low": "Aktiivisuus pienentää mahasyövän riskiä.",

  "mouththroat smoke now": smokeMouth,
  "mouththroat smoke past": smokeMouth,
  "mouththroat alcohol daily": alcoholMouth,
  "mouththroat alcohol weekly": alcoholMouth,
  "mouththroat outdoor yes": "Aurinko huulilla ulkotyössä suurentaa huulisyövän riskiä.",

  "thyroid prior yes": "Niskan alueen sädehoito, erityisesti lapsena, suurentaa kilpirauhassyövän riskiä, samoin jotkin aiemmat syövät.",
  "thyroid bmi ob2": "Ylipaino tai lihavuus liittyy suurempaan kilpirauhassyövän riskiin.",
  "thyroid bmi ob": "Ylipaino tai lihavuus liittyy suurempaan kilpirauhassyövän riskiin.",
  "thyroid bmi over": "Ylipaino tai lihavuus liittyy suurempaan kilpirauhassyövän riskiin.",

  "testicular testisU yes": "Kiveksen laskeutumattomuus on tunnetuin kivessyövän riskitekijä.",
  "testicular testisR yes": "Kivessyöpä esiintyy joissakin suvuissa. 1–3 potilaalla sadasta on isä tai veli, jolla on ollut se.",
  "testicular age any": "Se on yleisin syöpä 20–40-vuotiailla miehillä, mutta se on kokonaisuudessa harvinainen. Elintapoihin liittyviä riskitekijöitä ei tunneta.",
};

/** The rubric, the statistic and the screen copy of the risk module (docs/design-v2.md Appendix A.4 and A.5). */
export const rubricFi = {
  tiers: {
    average: "Mikään ohjeistuksessa mainittu tekijä ei suurenna riskiä ikä- ja sukupuoliryhmälle tyypillisestä tai vain pienet tekijät yhdessä pysyvät tyypillisellä tasolla.",
    raised: "Vähintään yksi kohtalainen tekijä (noin 1,5–2,5-kertainen riski) tai useita pieniä tekijöitä yhdessä.",
    high: "Vähintään yksi erittäin suuri tekijä (noin nelinkertainen riski tai enemmän, esimerkiksi tupakointi keuhkosyövässä tai vaurioitunut maksa maksasyövässä) tai useita suuria tekijöitä, jotka summautuvat. Pienet tekijät eivät yksin koskaan tee tasosta korkeaa.",
    unknown: "Tietoa on liian vähän arvion tekemiseen.",
  },
  overall: "Kokonaistaso on mallin oma yhteenveto eri syöpätyypeistä, koska mikään ohjeistus ei yhdistä syöpiä yhdeksi pisteluvuksi. Sen on oltava vähintään yhtä korkea kuin korkein syöpätyypin taso, ja se nimeää tyypit ja tekijät, jotka sen ratkaisevat.",
  comparison: "Taso vertaa sinua muihin saman ikäisiin ja samaa sukupuolta oleviin ihmisiin Suomessa. Se on tietoa, ei diagnoosi eikä ennuste.",
};
export const inFinlandFi = "Noin 34 miesten ja 24 naisten syövästä sadasta liittyy tupakointiin, alkoholiin ja ylipainoon (Syöpärekisterin tutkimus, jonka Syöpäjärjestöt on raportoinut). Nämä ovat tekijöitä, joihin voit itse vaikuttaa.";
export const tiersFi = { high: "Korkea", raised: "Kohonnut", average: "Keskimääräinen", unknown: "Tarvitsee vastauksia" };
export const copyFi = {
  lede: "Perustuu siihen, mitä kerroit minulle, sekä suomalaiseen ja eurooppalaiseen ohjeistukseen. Napauta mitä tahansa tunnistetta nähdäksesi perustelut.",
  note: "Laskettu vastauksistasi tekoälymallilla suomalaisen ja eurooppalaisen ohjeistuksen pohjalta. Se ei ole diagnoosi eikä ennuste. Se ei näe geenejäsi eikä tutkimustulosi.",
  compare: "Sinua verrataan saman ikäisiin ja samaa sukupuolta oleviin ihmisiin, joten ikä yksin ei muuta tunnistettasi.",
  gate_title: "Vastaa ensin kysymyksiin",
  gate_body: "Riskiyleiskatsauksesi lasketaan vastauksistasi, joten tarvitsen ne ensin. Voit vastata mihin tahansa kysymykseen ”En ole varma” tai ”En halua vastata” ja silti nähdä yleiskatsauksesi.",
  legend: "Jokaisen kuvakkeen pieni merkki on riskitunnisteesi:",
  skipped: "Jätin pois syövät, jotka riippuvat sukupuolesta tai siitä, mitä elimiä sinulla on (rinta, kohdunkaula, munasarja ja kohtu, eturauhanen ja kives), koska perustiedot eivät kerro sitä. Voit muuttaa niitä milloin tahansa.",
  how_title: "Näin tämä lasketaan",
  how_sub: "Suomalainen ja eurooppalainen ohjeistus",
  how_1: "Jokaisen syöpätyypin kohdalla katson ensin tekijät, jotka suomalainen ohjeistus nimeää (Käypä hoito, Duodecim, Syöpäjärjestöt, Syöpärekisteri, STUK), sitten eurooppalaisen ohjeistuksen (eurooppalainen syöpäkoodi) ja lopuksi brittiläisen ja WHO:n aineiston silloin, kun suomalaista tai eurooppalaista lukua ei ole.",
  how_2: "Tekoälymalli (Google Gemini) lukee vastauksesi ja ohjeistuksen ja kirjoittaa jokaisen tunnisteen ja sen perustelut, ja toinen läpikäynti tarkistaa ne ohjeistusta vasten. Sille lähetetään ikäsi, sukupuolesi, painoryhmäsi ja vastauksesi sekä tieto siitä, asutko Suomessa. Sille ei koskaan lähetetä nimeäsi, tarkkaa syntymäaikaasi, asuinpaikkaasi eikä mitään tunnistetta.",
  how_3: "Tunniste vertaa sinua saman ikäisiin ja samaa sukupuolta oleviin ihmisiin Suomessa. Kohonnut tarkoittaa vähintään yhtä kohtalaista tekijää (noin 1,5–2,5-kertainen riski) tai useita pieniä tekijöitä yhdessä. Korkea on erittäin voimakkaalle tekijälle, noin nelinkertaiselle riskille tai suuremmalle, kuten tupakointi keuhkosyövässä tai vaurioitunut maksa maksasyövässä, tai useille voimakkaille tekijöille, jotka summautuvat. Pienet tekijät eivät yksin koskaan tee tunnisteesta korkeaa.",
  how_4: "Tekijät, joista en voi kysyä, kuten geenit, on lueteltu kunkin tunnisteen alla, ja lääkärisi voi tarkastella niitä.",
  how_5: "Mikään ohjeistus ei yhdistä syöpätyyppejä yhdeksi pisteluvuksi. Kokonaistunniste on care4allin oma yhteenveto tyypeistä: se ei ole koskaan matalampi kuin minkään tyypin korkein tunniste, ja se nimeää, mikä sen ratkaisee.",
  how_6: "Tunniste ei ole diagnoosi eikä ennuste. Useimmat ihmiset, joilla on Kohonnut- tai Korkea-tunniste, eivät koskaan sairastu näihin syöpiin, ja jotkut ihmiset, joilla on Keskimääräinen-tunniste, sairastuvat. Seulonta ja oman kehon tunteminen ovat tärkeitä kaikille.",
};
