import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as copy from "../../src/privacy-copy.js";

/**
 * The privacy wording has to stay true for this product (docs/design-v2.md sections 2 and 3). The design prototype has no
 * server, so its lines "No account", "your identity never leaves this app", "the assistant runs inside the app" and
 * "worked out on this device" are false here. These tests read the shared wording and the two files that write privacy
 * text of their own, and fail if a false line comes back or if a statement about the AI loses a part of what it must say.
 */

/** Every text in a value: an array of strings is one text ([English, Finnish, Swedish?]). */
function texts(value, found = []) {
  if (Array.isArray(value)) {
    if (value.length && value.every(item => typeof item === "string")) found.push(value);
    else value.forEach(item => texts(item, found));
  } else if (value && typeof value === "object") Object.values(value).forEach(item => texts(item, found));
  return found;
}
const all = texts(copy);
const source = name => readFileSync(new URL("../../src/" + name, import.meta.url), "utf8");

// False for this product. Each one is a line from design v2 (or a close variant of it).
const FALSE_ENGLISH = [
  /never leaves? this app/i,
  /\bno account\b/i,
  /runs? inside the app/i,
  /worked out on this device/i,
  /stays? on this device/i,
  /nothing is uploaded and nothing is tracked/i,
  /nothing about your risk is sent anywhere/i,
  /in this prototype (everything stays|nothing is sent)/i,
  /your words are not sent to a server/i,
];
const FALSE_FINNISH = [/\bei tiliä\b/i, /ei (koskaan )?poistu (tästä )?sovelluksesta/i, /pysyvät? (vain )?tällä laitteella/i, /ei lähetetä palvelimelle/i];

test("there is wording to check, and every text has an English and a Finnish version", () => {
  assert.ok(all.length >= 30, "found " + all.length + " texts");
  for (const text of all) {
    assert.ok(text.length === 2 || text.length === 3, "a text is [English, Finnish] or [English, Finnish, Swedish]: " + text[0].slice(0, 40));
    for (const part of text) assert.ok(part.trim().length > 5, "empty text next to: " + text[0].slice(0, 40));
    assert.notEqual(text[0], text[1], "the Finnish is a copy of the English: " + text[0].slice(0, 40));
  }
});

test("no line from design v2 that is false for this product is in the shared wording", () => {
  for (const text of all) {
    for (const pattern of FALSE_ENGLISH) assert.doesNotMatch(text[0], pattern, "English: " + text[0].slice(0, 60));
    for (const pattern of FALSE_FINNISH) assert.doesNotMatch(text[1], pattern, "Finnish: " + text[1].slice(0, 60));
  }
});

test("the files that write privacy text themselves do not bring the false lines back", () => {
  // "stays on this device" is true of the display choices (the skin tone) and appears in a comment in ui.js, so a scan of the
  // code leaves that phrase to the check of the shared wording above.
  // privacy-copy.js is not scanned: its header quotes the false lines on purpose, and its texts are checked above.
  const scan = [...FALSE_ENGLISH.filter(pattern => !/stays\?/.test(pattern.source) && !/prototype/.test(pattern.source)), ...FALSE_FINNISH];
  for (const file of ["views/account.js", "ui.js"]) {
    const code = source(file);
    for (const pattern of scan) assert.doesNotMatch(code, pattern, file + " matches " + pattern);
  }
});

test("the shell and the account views keep nothing in browser storage", () => {
  // Only src/state/store.js writes display preferences. The records are on the server.
  for (const file of ["views/account.js", "ui.js", "privacy-copy.js"]) {
    assert.doesNotMatch(source(file), /\b(localStorage|sessionStorage|indexedDB)\b|\bcaches\./, file);
  }
});

test("what the AI is sent is stated in full", () => {
  const [en, fi] = copy.SENT;
  for (const part of ["answers", "age in years", "Finland", "weight band"]) assert.ok(en.includes(part), "English misses " + part);
  for (const part of ["vastauksesi", "ikäsi vuosina", "Suomessa", "painoluokan"]) assert.ok(fi.includes(part), "Finnish misses " + part);
});

test("what the AI never receives names everything section 3 of the contract names", () => {
  const [en, fi] = copy.NEVER;
  for (const part of ["name", "username", "ID", "date of birth", "city or county", "typed"]) assert.ok(en.includes(part), "English misses " + part);
  for (const part of ["nimeä", "käyttäjätunnus", "tunniste", "syntymäaik", "kaupunki", "maakunta", "kirjoittamaasi"]) assert.ok(fi.includes(part), "Finnish misses " + part);
});

test("every long statement about the AI carries the full lists, and says that it asks first", () => {
  const long = [
    copy.CONSENT,
    copy.PRIVACY_IDENTITY[0].detail,
    copy.PRIVACY_HANDLED.find(item => item.icon === "sparkle").detail,
    copy.NOTICE.find(([heading]) => /AI questions/.test(heading[0]))[1],
  ];
  for (const text of long) {
    assert.ok(text[0].includes(copy.NEVER[0]), "English leaves out the list of what is never received: " + text[0].slice(0, 50));
    assert.ok(text[1].includes(copy.NEVER[1]), "Finnish leaves out the list of what is never received: " + text[1].slice(0, 50));
  }
  const asksFirst = [copy.AI_CHOICE.detail, copy.PRIVACY_HANDLED.find(item => item.icon === "sparkle").detail, copy.NOTICE.find(([heading]) => /AI questions/.test(heading[0]))[1]];
  for (const text of asksFirst) {
    assert.match(text[0], /\bask(s|ed)? you\b|\bare asked\b/i, "English does not say the person is asked first");
    assert.match(text[1], /kysy|kysytään|lupaa/i, "Finnish does not say the person is asked first");
  }
});

test("the consent text names the model, what stays in the account, and that the result is not a diagnosis", () => {
  const [en, fi] = copy.CONSENT;
  assert.ok(en.includes(copy.SENT[0]) && en.includes(copy.NEVER[0]));
  assert.ok(fi.includes(copy.SENT[1]) && fi.includes(copy.NEVER[1]));
  assert.match(en, /Google Gemini/);
  assert.match(fi, /Google Gemini/);
  assert.match(en, /in your account/);
  assert.match(fi, /tililläsi/);
  assert.match(en, /not a diagnosis and not a prediction/);
  assert.match(fi, /eivät diagnoosi eivätkä ennuste/);
});

test("every text that names Google Gemini does so in both languages, and says where the records are kept", () => {
  for (const text of all) assert.equal(/Gemini/.test(text[0]), /Gemini/.test(text[1]), "Gemini is named in one language only: " + text[0].slice(0, 50));
  assert.match(copy.WELCOME_PRIVATE.detail[0], /server/);
  assert.match(copy.PRIVACY_HANDLED[0].detail[0], /server/);
  assert.match(copy.NOTICE_INTRO[0], /server/);
  assert.match(copy.NOTICE_INTRO[1], /palvelimella/);
});

test("the profile row and the footer line say what is sent to the AI, not that nothing leaves", () => {
  assert.match(copy.ME_ROW.bold[0], /never goes to the AI/);
  assert.match(copy.FOOTER_LINE[0], /AI never gets your name/);
  assert.match(copy.FOOTER_LINE[1], /tekoäly/);
});
