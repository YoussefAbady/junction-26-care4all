/*
 * One function per backend endpoint, in the shapes docs/backend-api.md and docs/design-backend.md describe.
 * The backend accepts "bowel" as an alias for "colorectal", and only six cancer topics are known to it.
 * Anything stateful goes through state/store.js, which keeps the UI state in step with these calls.
 */
import { request, download } from "./client.js";

const query = params => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  const text = search.toString();
  return text ? "?" + text : "";
};

export const api = {
  health: () => request("health"),

  content: {
    /**
     * The public educational content, the same for everyone: topics, articles, sources, statistics and interface text.
     * Loaded once at start-up by state/content.js. It is the only API response the service worker keeps.
     * @returns {Promise<{ version: string, retrieved: string, content: object }>}
     */
    get: () => request("content"),
  },

  account: {
    /** @returns {Promise<{ account: { username: string, language: string } | null }>} */
    get: () => request("account?view=identity"),
    register: (username, password, language) => request("account?view=identity", { method: "POST", body: { action: "register", username, password, language } }),
    login: (username, password, language) => request("account?view=identity", { method: "POST", body: { action: "login", username, password, language } }),
    logout: () => request("account", { method: "DELETE" }),
  },

  profile: {
    /** @returns {Promise<{ profile: { name: string, yob: number, sex: string, county: string } | null, preferences: { lang: string, scale: number, plain: boolean, motion: boolean } }>} */
    get: () => request("profile"),
    put: (profile, preferences) => request("profile", { method: "PUT", body: { profile, preferences } }),
  },

  /** Medical-history questionnaire progress. The conversation flow in api.chat drives it day to day. */
  survey: {
    get: () => request("survey"),
    put: progress => request("survey", { method: "PUT", body: { progress } }),
  },

  /** Public, versioned catalog of the six cancer cards. lang is "en" or "fi". */
  cancers: (lang, slug) => request("cancers" + query({ lang, slug })),
  /** Sourced articles from the same catalog, with search. lang is "en", "fi" or "sv" (sv returns English). */
  library: ({ lang, q, topic, article } = {}) => request("library" + query({ lang, q, topic, article })),

  observations: {
    /** One page, newest first. Pass the previous page's nextCursor as `before`. */
    list: before => request("observations" + query({ before })),
    /** @param {{ kind: "symptom" | "observation", label: string, notes?: string, observedAt?: string | null, details?: object }} draft */
    add: draft => request("observations", { method: "POST", body: draft }),
    remove: id => request("observations", { method: "DELETE", body: { id } }),
  },

  reminders: {
    list: () => request("reminders"),
    /** @param {{ kind: "letter" | "checkin" | "read" | "selfcheck" | "gp" | "recheck", topic?: string | null, dueAt: string }} reminder dueAt is an ISO time with offset. */
    add: reminder => request("reminders", { method: "POST", body: reminder }),
    setDone: (id, done) => request("reminders", { method: "PATCH", body: { id, done } }),
    remove: id => request("reminders", { method: "DELETE", body: { id } }),
    /** Saves the account-owned, neutrally titled .ics file for one reminder. */
    saveCalendar: id => download("reminders" + query({ calendar: id }), "care4all-reminder.ics"),
  },

  contentReports: {
    add: (message, topic) => request("content-reports", { method: "POST", body: { message, ...(topic ? { topic } : {}) } }),
  },

  myData: {
    /** Saves everything the account holds, without password hashes or session tokens. */
    saveExport: () => download("my-data", "care4all-my-data.json"),
    /** Deletes the account and everything it owns. Needs the account password. */
    remove: password => request("my-data", { method: "DELETE", body: { confirm: true, password } }),
  },

  /** An AI review of the saved intake answers. The server removes everything that identifies the person before the model sees them (docs/ai-review.md). */
  assess: {
    /** @param {{ language: "en" | "fi", step: "next" | "review", history: { q: string, options: { id: string, label: string }[], a: string }[] }} body The person has already agreed on screen. */
    send: body => request("assess", { method: "POST", body: { consent: true, ...body } }),
  },

  chat: {
    /** Grounded answer, or one step of the intake or symptom conversation. See docs/chat.md and docs/chat-journeys.md. */
    send: body => request("chat", { method: "POST", body }),
    nextAction: lang => request("chat/next-action" + query({ lang })),
  },
};
