/*
 * Application state and the services that keep it in step with the backend.
 *
 * S is the one shared state object (also A.S). Everything personal in it comes from the signed-in account's
 * server records. The only things this browser stores are display preferences: they describe the screen,
 * not the person. Health information is never written to localStorage, sessionStorage or IndexedDB.
 *
 * Views read S and call svc.* to change it. Every svc function updates S and rejects with an ApiError.
 */
import { A } from "../app.js";
import { api } from "../api/index.js";
import { ApiError } from "../api/client.js";

/* ---------- topics ---------- */
// The backend knows six cancer topics and spells bowel as "colorectal". The design has sixteen topics.
const API_TOPICS = ["breast", "cervical", "colorectal", "skin", "prostate", "testicular"];
/** Topic id the backend accepts, or undefined when the design topic has no backend counterpart. */
export const apiTopic = id => id === "bowel" ? "colorectal" : API_TOPICS.includes(id) ? id : undefined;
/** Topic id the design uses. */
export const designTopic = id => id === "colorectal" ? "bowel" : id || "";

/* ---------- display preferences, the only thing stored in this browser ---------- */
const DISPLAY_KEY = "c4a:display";
let displayMemory = null;
function readDisplay() {
  if (displayMemory) return displayMemory;
  try {
    const saved = JSON.parse(localStorage.getItem(DISPLAY_KEY) || "null");
    if (saved && typeof saved === "object") return saved;
  } catch { /* storage blocked or unreadable */ }
  return {};
}
const display = readDisplay();

/* ---------- state ---------- */
export const S = {
  ready: false,                 // true once boot() has finished
  account: null,                // { username, language } when signed in
  profile: null,                // { name, yob, sex, county }, or null before the person has filled it in
  prefs: {                      // lang, scale, plain and motion are saved on the account. skin stays on this device.
    lang: ["en", "fi", "sv"].includes(display.lang) ? display.lang : "en",
    scale: [0, 1, 2].includes(display.scale) ? display.scale : 0,
    plain: display.plain === true,
    motion: display.motion !== false,
    skin: [1, 2, 3].includes(display.skin) ? display.skin : 1,
  },
  dismissInstall: display.dismissInstall === true,
  reminders: [],                // { id, kind, topic, due (ms), dueAt (ISO), status: "active" | "done", created, channels, notified }
  notes: [],                    // symptom notes, newest first
  checklog: [],                 // self-check results, newest first
  checks: {},                   // topic -> latest self-check result
  scans: {},                    // scan id -> { ts, id } for scans the person says they had
  next: null,                   // { nextAction, priority, suggestedTopics } from /api/chat/next-action
  // In memory only. These reset on reload and are never persisted or sent anywhere.
  read: {}, seen: {}, fu: {}, answers: {}, consent: null, sym: { draft: null },
};

/** Saves the display preferences in this browser. */
export function persistDisplay() {
  displayMemory = { ...S.prefs, dismissInstall: S.dismissInstall };
  try { localStorage.setItem(DISPLAY_KEY, JSON.stringify(displayMemory)); } catch { /* storage blocked */ }
}

const BOOT_RETRY_MS = 700;
const accountLanguage = () => S.prefs.lang === "fi" ? "fi" : "en";
const prefsPayload = () => ({ lang: S.prefs.lang, scale: S.prefs.scale, plain: S.prefs.plain, motion: S.prefs.motion });
const cleanProfile = profile => profile ? { name: profile.name, yob: profile.yob, sex: profile.sex, county: profile.county } : null;
const notified = new Set();   // reminders already announced in this page session

/* ---------- reading from the backend ---------- */
const ONSET = { today: "Today", week: "In the past week", weeks: "1 to 4 weeks ago", month: "More than a month ago", unsure: "Not sure" };
const COURSE = { gone: "No, it has gone", comes: "Comes and goes", worse: "Getting worse", better: "Getting better", same: "About the same", unsure: "Not sure" };

async function loadReminders() {
  const { reminders } = await api.reminders.list();
  S.reminders = reminders.map(item => ({
    id: item.id, kind: item.kind, topic: designTopic(item.topic), dueAt: item.dueAt,
    due: Date.parse(item.dueAt), created: Date.parse(item.createdAt),
    status: item.done ? "done" : "active", channels: [], notified: notified.has(item.id),
  }));
}

/** Observations are one table on the server. The design shows them as notes, self-check results and scan dates. */
async function loadObservations() {
  const all = [];
  let cursor;
  do {
    const page = await api.observations.list(cursor);
    all.push(...page.observations);
    cursor = page.nextCursor;
  } while (cursor);
  const notes = [], checklog = [], checks = {}, scans = {};
  for (const item of all) {   // newest first
    const details = item.details || {};
    const ts = Date.parse(item.observedAt || item.createdAt);
    const topic = designTopic(details.topic);
    if (details.scanId) {
      if (!scans[details.scanId]) scans[details.scanId] = { ts, id: item.id };
    } else if (details.selfCheck && topic) {
      const result = {
        id: item.id, check: topic, ts, result: details.selfCheck === "nothing_new" ? "clear" : "change",
        findings: details.symptoms || [], other: item.notes, side: "", keys: [], outcome: "recorded", urgency: "",
      };
      checklog.push(result);
      if (!checks[topic]) checks[topic] = { ...result, logId: item.id };
    } else {
      notes.push({
        id: item.id, ts, kind: item.kind, topic: topic && A.D.TOPICS[topic] ? topic : "general",
        symptoms: details.symptoms && details.symptoms.length ? details.symptoms : [item.label],
        when: ONSET[details.onset] || "", still: COURSE[details.course] || "", note: item.notes,
      });
    }
  }
  Object.assign(S, { notes, checklog, checks, scans });
}

async function loadNext() {
  try {
    S.next = await api.chat.nextAction(accountLanguage());
  } catch (error) {
    S.next = null;
    throw error;
  }
}

async function hydrate() {
  const { profile, preferences } = await api.profile.get();
  S.profile = profile && Object.keys(profile).length ? profile : null;
  Object.assign(S.prefs, preferences);
  persistDisplay();
  await Promise.all([loadReminders(), loadObservations(), loadNext().catch(() => {})]);
}

function reset() {
  Object.assign(S, {
    account: null, profile: null, reminders: [], notes: [], checklog: [], checks: {}, scans: {}, next: null,
    read: {}, seen: {}, fu: {}, answers: {}, consent: null, sym: { draft: null },
  });
  notified.clear();
}

/* ---------- services ---------- */
export const svc = {
  /**
   * Finds out whether there is a signed-in account and loads its records. Never rejects.
   * A dropped connection or a restarting backend is retried once before the app says it has no connection.
   */
  async boot() {
    S.bootError = null;
    for (let attempt = 0; ; attempt++) {
      try {
        const { account } = await api.account.get();
        S.account = account;
        if (account) await hydrate();
        break;
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "unavailable";
        if (attempt === 0 && (code === "unavailable" || code === "offline")) {
          await new Promise(resolve => setTimeout(resolve, BOOT_RETRY_MS));
          continue;
        }
        if (!(error instanceof ApiError) || code === "expired") reset();
        S.bootError = code;
        break;
      }
    }
    S.ready = true;
  },
  hydrate,

  async register(username, password) {
    const { account } = await api.account.register(username, password, accountLanguage());
    S.account = account;
    await svc.savePrefs();           // the language and display choices made before signing up
    await hydrate();
  },
  async login(username, password) {
    const { account } = await api.account.login(username, password, accountLanguage());
    S.account = account;
    await hydrate();
  },
  async logout() {
    await api.account.logout();
    reset();
  },
  async deleteAccount(password) {
    await api.myData.remove(password);
    reset();
  },
  reset,

  /** Saves the profile. Pass null to clear it. */
  async saveProfile(profile) {
    await api.profile.put(cleanProfile(profile), prefsPayload());
    S.profile = cleanProfile(profile);
    await loadNext().catch(() => {});
  },
  /** Saves S.prefs on this device and, when signed in, on the account. */
  async savePrefs() {
    persistDisplay();
    if (S.account) await api.profile.put(cleanProfile(S.profile), prefsPayload());
  },

  loadReminders,
  /** @param {{ kind: string, topic?: string, due: number }} reminder due is a time in milliseconds. */
  async addReminder({ kind, topic, due }) {
    const { reminder } = await api.reminders.add({ kind, topic: apiTopic(topic) ?? null, dueAt: new Date(due).toISOString() });
    await loadReminders();
    return reminder;
  },
  async setReminderDone(id, done) { await api.reminders.setDone(id, done); await loadReminders(); },
  async removeReminder(id) { await api.reminders.remove(id); await loadReminders(); },
  /** Remember that a due reminder was announced, so reloading the list does not announce it again. */
  markNotified(id) { notified.add(id); const item = S.reminders.find(r => r.id === id); if (item) item.notified = true; },

  loadObservations,
  /** @param {{ kind: "symptom" | "observation", label: string, notes?: string, observedAt?: string | null, details?: object }} draft */
  async addObservation(draft) {
    const { observation } = await api.observations.add(draft);
    await Promise.all([loadObservations(), loadNext().catch(() => {})]);
    return observation;
  },
  async removeObservation(id) {
    await api.observations.remove(id);
    await Promise.all([loadObservations(), loadNext().catch(() => {})]);
  },

  loadNext,
};
