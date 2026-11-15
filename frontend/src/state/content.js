/*
 * The educational content: topics, articles, sources, statistics and interface text. It is public and the same for
 * everyone, it lives in the database, and nothing of it is bundled with the app. Start-up fetches GET /api/content and
 * fills the shared object A.D in place, so every module that kept `var D = A.D` sees it, before the first screen is
 * drawn. The service worker keeps this one response, so the app can be read offline after the first visit (src/sw.js).
 */
import { A } from "../app.js";
import { api } from "../api/index.js";
import { ApiError } from "../api/client.js";

/**
 * What the interface reads from A.D, and the kind of value each part must be. The payload also carries FAQ, VACC and
 * TRIAGE for the backend's answers: nothing in the interface reads those, so they are not required here.
 */
const REQUIRED = {
  YEAR: "number", COUNTIES: "array", EXAMPLE: "object", COPY: "object", I18N: "object",
  TOPICS: "object", TOPIC_ORDER: "array", NATIONAL: "array", ARTICLES: "object", SOURCES: "object", JOURNEYS: "object",
  CHECK_META: "object", SCANS: "array", NAT: "object", STEP_HINTS: "object", SUGGESTIONS: "object",
  STATS: "object", STATS_SRC: "array", STATS_NOTE: "string",
  RISK: "object", MONITOR: "object", INTERVIEW: "object",
};

/** What each part of the three AI-era sections must contain (docs/design-v2.md, A.6). Their texts and names are read when a screen is drawn. */
const RISK_PARTS = { ORDER: "array", TIERS: "object", TYPES: "object", FACTORS: "object", RUBRIC: "object", IN_FINLAND: "object", COPY: "object", GUIDELINES: "array" };
const MONITOR_PARTS = { STEPS: "array", TRENDS: "array", FLAGS: "array", TREND_WORD: "object", DOCTOR_TREND_WORD: "object", FLAG_WORD: "object", SERIOUS: "object", OUT: "object", SEX: "object", URGENCY: "object", COPY: "object" };
const INTERVIEW_PARTS = { MIN: "number", MAX: "number" };

const kind = value => Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
const isObject = value => kind(value) === "object";

/**
 * Checks a GET /api/content payload, enough to reject anything that is not the content, such as an error page, an
 * empty object or a truncated copy. Returns { version, retrieved, content }. Throws an ApiError("unavailable"): a server that sends
 * something else is not serving the app right now. The error's `reason` says what was wrong, and carries no content.
 */
export function checkContent(payload) {
  const fail = reason => { throw Object.assign(new ApiError("unavailable"), { reason }); };
  if (!isObject(payload) || typeof payload.version !== "string" || !payload.version) fail("the payload has no version");
  const { content } = payload;
  if (!isObject(content)) fail("the payload has no content");
  for (const [key, expected] of Object.entries(REQUIRED)) {
    if (kind(content[key]) !== expected) fail(key + " should be " + expected + " but is " + kind(content[key]));
  }
  // The shell reads these without a guard: a name it cannot find would break a screen, not just leave a gap.
  if (!content.TOPIC_ORDER.length || !content.TOPIC_ORDER.every(id => isObject(content.TOPICS[id]))) fail("TOPIC_ORDER names a topic that does not exist");
  if (!isObject(content.I18N.en)) fail("I18N has no English strings");
  if (typeof content.COPY.help !== "string" || typeof content.COPY.disclaimer !== "string") fail("COPY has no help or disclaimer text");
  for (const [section, parts] of [["RISK", RISK_PARTS], ["MONITOR", MONITOR_PARTS], ["INTERVIEW", INTERVIEW_PARTS]]) {
    for (const [key, expected] of Object.entries(parts)) {
      if (kind(content[section][key]) !== expected) fail(section + "." + key + " should be " + expected + " but is " + kind(content[section][key]));
    }
  }
  if (!isObject(content.SUGGESTIONS.topics) || !Array.isArray(content.SUGGESTIONS.general)) fail("SUGGESTIONS is incomplete");
  return { version: payload.version, retrieved: typeof payload.retrieved === "string" ? payload.retrieved : "", content };
}

/**
 * Fetches the content and fills A.D in place. Rejects with an ApiError: "offline", "limited" or "unavailable". Nothing can
 * be drawn without the content, so every other failure, a 404 from a backend that does not have the endpoint yet or a 401
 * from a proxy, is "unavailable" too. Codes such as "expired" and "invalid" describe an account or a form, and "expired"
 * would even be read at start-up as a session that simply ended.
 */
export async function loadContent() {
  let payload;
  try {
    payload = await api.content.get();
  } catch (error) {
    throw error instanceof ApiError && ["offline", "unavailable", "limited"].includes(error.code) ? error : new ApiError("unavailable", error && error.status);
  }
  const { version, retrieved, content } = checkContent(payload);
  Object.assign(A.D, content);
  A.contentVersion = version;
  A.contentRetrieved = retrieved;   // the date the sources were read: the risk screens show it beside each source link
}
