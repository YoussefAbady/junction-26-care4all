// A small, fictional stand-in for what GET /api/content serves: every key the interface reads, with just enough in each
// for the loader and the state tests. The real content lives in the database (see docs/content-database.md).

/** The `content` part of the payload. */
export const fixture = {
  YEAR: 2026,
  COUNTIES: [["helsinki", "Helsinki"], ["pirkanmaa", "Pirkanmaa"]],
  EXAMPLE: { name: "Aino", yob: 1974, sex: "female", county: "pirkanmaa" },
  COPY: { help: "Emergency: call 112.", disclaimer: "care4all gives information. It does not diagnose.", outOfScope: "Our sources do not cover this." },
  I18N: { en: { home: "Home", fight: "Fight", profile: "Profile" }, fi: { home: "Koti" }, sv: {} },
  TOPICS: {
    bowel: { id: "bowel", name: "Bowel", national: true, screenName: "Bowel screening", articles: ["about-bowel"], check: null },
    skin: { id: "skin", name: "Skin", national: false, articles: [], check: { title: "Check your skin", steps: [] } },
  },
  TOPIC_ORDER: ["bowel", "skin"],
  NATIONAL: ["bowel"],
  ARTICLES: { "about-bowel": { id: "about-bowel", topic: "bowel", title: "About the bowel", sections: [] } },
  SOURCES: { example: { name: "Example: a fictional source", org: "Example", date: "2026", url: "https://example.org/source", use: "Only for tests." } },
  JOURNEYS: { bowel: { steps: [] } },
  CHECK_META: { skin: { name: "Skin check", min: 10, every: 180, when: "6m" } },
  SCANS: [{ id: "fit", name: "Bowel test", topic: "bowel", kind: "invited" }],
  NAT: { bowel: { kind: "Home kit and lab", test: "A stool test", ages: "Fictional ages", freq: "Every 2 years", scan: "fit", pick: "The kit comes with your letter" } },
  STEP_HINTS: { skin: [{ pose: "Standing at a mirror.", move: "Look at your skin." }] },
  SUGGESTIONS: { topics: { bowel: ["What happens after a bowel test?"] }, general: ["What is screening?"] },
  STATS: { bowel: { site: "Colon and rectum", risk: 3.4, both: 4349 } },
  STATS_SRC: ["example"],
  STATS_NOTE: "Fictional numbers for tests.",
  // Small fictional sections, only so the loader's checks pass. The real ones come from the database.
  RISK: {
    ORDER: ["skin"], TIERS: { high: { en: "High" }, raised: { en: "Raised" }, average: { en: "Average" }, unknown: { en: "Need answers" } },
    TYPES: { skin: { sex: "any", name: { en: "Skin cancer" }, notCovered: { en: [] } } }, FACTORS: { sun: { name: { en: "Sun" }, short: { en: "sun" }, tip: { en: "Fictional." } } },
    GUIDELINES: [], RUBRIC: { tiers: {}, overall: { en: "Fictional." }, comparison: { en: "Fictional." }, sources: [] }, IN_FINLAND: { text: { en: "Fictional." }, sources: [] }, COPY: { lede: { en: "Fictional." } },
  },
  MONITOR: {
    STEPS: [3, 7], TRENDS: [{ id: "better", label: { en: "Better" } }], FLAGS: [{ id: "other", label: { en: "Something else" } }], TREND_WORD: { better: { en: "better" } },
    DOCTOR_TREND_WORD: { better: { en: "better" } }, FLAG_WORD: { other: { en: "something else" } }, SERIOUS: { en: "Something serious right now" },
    OUT: { watch: { en: "Keep watching closely" } }, SEX: { none: { en: "Not specified" } }, URGENCY: { weeks: { en: "In a week or two" } }, COPY: {},
  },
  INTERVIEW: { MIN: 10, MAX: 28, COPY: {} },
};

/** A whole GET /api/content body. Pass `content` to replace parts of the fixture. */
export const payload = (content = {}, extra = {}) => ({ version: "test-1", retrieved: "2026-11-14", content: { ...fixture, ...content }, ...extra });
