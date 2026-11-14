# Design v2: scope, contracts and ownership

This is the working contract for building design v2. Every work package codes to it, so read the section for your package and the sections it points to. If something here is wrong or missing, say so in your report; do not invent a different contract.

## 1. What v2 is, and where it came from

`frontend/design/care4all.artifact.html` is design v2 (14,454 lines). `frontend/design/changes-v2.diff` is the unified diff from the v1 design (the one the PWA was built from) to v2. Read the diff first: it is the complete, exact list of what changed. Line numbers inside it refer to the v1 file on the left and the v2 file on the right.

What v2 adds, in the diff's own terms:

| Feature | In the design | Diff lines (approx.) |
| --- | --- | --- |
| Phone chrome and polish: safe-area variables, framed device with a status bar, home bar, entrance animation, press states, dim-under, haptics | CSS `Polish` block, `.statusbar`, `.homebar`, `enterFx`, `A.haptic`, `tickClock` | 5-123, 126-190, 313-318, 1839-1942 |
| Profile card with three stats, privacy row, stat card | `.me-card`, `.priv-row`, `.stat-card`, `V.me` | 136-157, 540-564 |
| Privacy and welcome copy ("your identity never leaves this app") | `V.welcome`, `V.privacy`, intros | 531-538, 606-628 |
| Close monitoring of a symptom that is not sent to a doctor | script `care4all monitor`, `.mon-*`, `A.monitor*`, notes UI | 192-206, 356-374, 395-436, 579-589, 652-694, 699-912 |
| PDF for my doctor (a PDF writer, a summary sheet, share or copy) | scripts `care4all pdf` and `care4all doctor` | 914-1325 |
| Risk overview: a tag per cancer type, an overall tag, a reason for each, badges, a strip on each cancer page, a tag under the name on Home | script `care4all risk`, `.rtag`, `.rk-*` | 220-309, 376-382, 440-443, 460-473, 484-509, 1327-1826 |
| Three more questions (testicles, health conditions, habits and work) | `testis`, `history`, `exposure` in the survey | 329-352 |

## 2. What is different in our product, and what the user decided

The v2 prototype is local-only, rule-based and has no server. Ours has accounts, a PostgreSQL database, a backend and an AI model. Where they differ, ours wins:

- **Copy must stay true.** Do not use v2's lines "No account", "your identity never leaves this app", "the assistant runs inside the app", "worked out on this device". Say what is true: the account is on the server, the answers are stored on it, the model (Google Gemini) receives the answers described in section 3, nothing identifying leaves.
- **All v2 features must be dynamic and AI-based, not statically added to the UI** (user's words). The risk overview, the interview and the reasons are produced by the model from the person's answers and from guideline passages in the database. The rule table in the v2 risk script (`RULES`, `LIB`, weights) must not ship in the UI. Its curated statements and sources become database content (section 9) that the model is given as grounding.
- **All data comes from the database.** No cancer-type list, factor text, source list, tier label, flag list, check-in step or guideline list is hard-coded in `frontend/src`. The PWA gets them from `GET /api/content` and the new endpoints. Button and layout wording stays in code, as today (`A.tr(en, fi)`).
- **The get-to-know-you flow changes** (user's words): basic demographic questions are static, then the AI asks one question at a time, each based on all earlier questions and answers, and keeps the whole context. When it is done the AI rates the person's risk for each cancer type from Finnish guidelines and medical risk assessment, gives a level for each type, then an overall level from all of them, and justifies each.
- **Close monitoring and other rule-based safety logic stay deterministic**, with their rules in the database. The model may write an explanation but may never lower an escalation (section 7).

## 3. Data policy (the user approved this on 2026-11-14)

Gemini may receive everything about a person's health except PII. Never send: name, username, any id, exact date of birth (send age in years), city or county (send only `inFinland` true or false), and any text the person typed. The interview has no free-text answers, so there is none to send. `src/lib/assess/facts.ts` is the allow-list and stays the single place that decides what may be sent: deny by default, by question type. Questions the model wrote and answers the person gave in this interview (choices, multi-choices, numbers, "not sure", "prefer not to say") may be sent, as text labels.

- Every request that sends answers to a model carries `consent: true` (the PWA asks on screen first). Without it: 400, nothing read or sent.
- Nothing is logged but a step and a reason code, for example `interview step=answer reason=question`. Never a question, an answer, a prompt, a passage or an id of a person.
- What care4all stores: the interview (questions and answers) and the risk assessment are stored on the account in PostgreSQL, like every other answer. They are deleted with the account and are part of the data export.
- Tests must prove it: build a person whose every PII field is a unique sentinel string and assert none appears in what a model is sent (system text, user text, schema).

## 4. Work packages, owners, files

Edit only the files you own. Use `Edit` for small changes to a shared file; never overwrite a file you do not own. If you need a change in a file you do not own, put it in your report under "Needs from others".

| Package | Owns |
| --- | --- |
| `schema` | `prisma/schema.prisma`, `prisma/migrations/20261116*`, the generated client (`src/generated`, gitignored) |
| `content` | `prisma/seed-data/**`, `prisma/seed.ts`, `prisma/reindex.ts`, `src/lib/content/**`, `src/app/api/content/**`, `tests/content*.ts`, `tests/fixtures/**` (only if a golden must change on purpose), `docs/content-database.md` |
| `interview` | `src/lib/interview/**`, `src/app/api/interview/**`, `src/lib/intake/**` (the plan split, section 5.1), `src/lib/chat-journey.ts`, `src/lib/chat-journey-store.ts` (next action only), `tests/interview*.ts`, `tests/intake.test.ts`, `docs/ai-interview.md` |
| `risk` | `src/lib/risk/**`, `src/app/api/risk/**`, `tests/risk*.ts`, `docs/ai-risk.md` |
| `monitor` | `src/lib/monitor/**`, `src/app/api/monitors/**`, the observations and reminders routes (minimal extensions), the `save_symptom` branch of `src/lib/chat-journey-store.ts`, `tests/monitor*.ts`, `docs/monitoring.md` |
| `fe-shell` | `frontend/index.html`, `frontend/src/styles/app.css` (all v2 CSS, including `.rk-*` and `.mon-*` which the other packages use), `frontend/src/ui.js`, `frontend/src/views/account.js` |
| `fe-risk` | `frontend/src/views/risk.js`, `frontend/src/views/interview.js`, `frontend/src/styles/risk.css`, `frontend/tests/unit/risk*.js` |
| `fe-monitor` | `frontend/src/monitor.js`, `frontend/src/pdf.js`, `frontend/src/doctor.js`, `frontend/src/styles/monitor.css`, `frontend/tests/unit/{pdf,doctor,monitor}*.js` |
| `integrate` | every cross-file hook (`frontend/src/views/screens.js`, `scans.js`, `coach.js`, `sessions.js`, `state/*`, `main.js`, `api/index.js` only if a contract changed), `src/app/api/my-data/route.ts`, removing the superseded `/api/assess` and `frontend/src/views/assess.js`, `package.json` test script, `README.md`, `docs/*` not owned above, `scripts/*.ps1`, `tests/e2e/design-v2.spec.ts` |

Rules for everyone:
- Do not run `docker compose`, `docker build` or touch the running stack or the `care4all` database. For database work create your own scratch database in the running Postgres (`docker exec -i care4all-db-1 psql -U care4all -d postgres`, create `care4all_<yourpackage>`), run the migration and seed against it, and drop it when done. Read the database URL pattern from `.env.docker` without printing it (the file has a BOM and CRLF; never print its lines).
- Only the `schema` package runs `prisma generate`. Everyone else type-checks with `npx tsc --noEmit` (never `npm run typecheck`, which regenerates the client under the others) and lints with `npx eslint <your paths>`.
- Backend dev servers for live checks use your own port (interview 3101, risk 3102, monitor 3103, content 3104) and a scratch database. Stop them afterwards.
- Never print or log a key or a password. Fictional data only. No health data in logs, URLs, browser storage or service-worker caches.
- Windows: use `npm.cmd` and `npx.cmd` in PowerShell, or the Bash tool for POSIX commands.

## 5. The AI interview

### 5.1 Basics, then AI

The static part is the intake's `you` chapter (name, date of birth, sex, gender, pregnancy where it applies, height and weight, weight change, place of residence). Residence is the list of Finnish cities already built. The other chapters (`now`, `health`, `family`, `life`, `screen`) are replaced by the AI interview in the live flow.

The `interview` package splits the intake plan: the live `flow()` uses only module `you`; the full plan stays in the registry so that every saved answer stays valid (saved progress must keep loading, never reset an account), and the old tests keep working through an explicit plan argument. `parseProgress`/`readProgress` keep their behaviour for old data. Basics are complete when every question of the live flow is answered or marked ("not sure", "prefer not to say").

### 5.2 Tables

`AiInterview` (one per account, unique `username`) and `AiTurn` (see section 10 for the exact columns). `restart` deletes the interview and its risk assessment's currency (the assessment becomes stale, not deleted).

### 5.3 Endpoint `/api/interview`

Signed-in, same-origin (`sameOrigin` / `refuseOrigin`), JSON body at most 4 KB, `privateJson` (no-store). Limits: `allowIn("interview", username)` per model call; one overall `AbortSignal.timeout(20_000)`; each model call 12 s.

`GET /api/interview` returns `{ enabled, basics: { complete }, interview: Interview | null }`. `enabled` is true when a model is configured.

```ts
type Interview = {
  id: string; status: "active" | "complete"; language: "en" | "fi";
  startedAt: string; completedAt: string | null;
  answered: number; min: number; max: number;        // min and max come from the database (section 9)
  turns: Turn[];                                      // answered turns, in order
  current: Turn | null;                               // the open question, null when complete
  coverage: { id: string; name: string; essential: boolean; covered: boolean }[];
};
type Turn = {
  position: number; kind: "choice" | "multi" | "number";
  title: string; help?: string;
  options?: { id: string; label: string; exclusive?: boolean }[];      // choice and multi; ids are the server's: o1, o2, ...
  number?: { min: number; max: number; unit?: string; decimals?: number };
  markers: ("unsure" | "declined")[];                                  // always both for now
  answer?: { value?: string | string[] | number; marker?: "unsure" | "declined"; label: string };
  source: "model" | "bank";                                            // bank = the database fallback question
};
```

`POST /api/interview` body: `{ consent: true, language: "en" | "fi", action: "start" | "answer" | "undo" | "restart", position?: number, value?: string | string[] | number, marker?: "unsure" | "declined" }`.

- `consent` must be `true`, else 400 `{ error: "consent" }`.
- `start`: basics must be complete, else 409 `{ error: "basics" }`. If an interview exists it is returned (resume); otherwise one is created and the first question is made.
- `answer`: `position` must be the open question's position (else 409 `{ error: "conflict" }`); `value` is validated against the turn (a choice id from the options, a subset of ids with the `exclusive` rule, a number in range) or a `marker`. Then the next question is made, or the interview completes.
- `undo`: removes the last answered turn's answer and any open turn after it, and asks again from there (so the context is always consistent).
- `restart`: deletes the interview and starts again.
- Response `200 { interview, outcome: "question" | "complete" }`. A model failure never fails the request: the next question comes from the database bank (`source: "bank"`) so the interview always progresses. Without a configured model the whole interview runs from the bank.

### 5.4 How the next question is made

The server builds the context and calls the model once per question:
- Facts: `factsOf(basicsAnswers)` from `src/lib/assess/facts.ts` (age, sex, inFinland, weight band and the coded basics) plus every earlier turn as `{ domain, question, answer label }` in order (answers "not sure" and "prefer not to say" are included as such).
- Coverage: the assessment domains from the database (section 9) with covered and uncovered marked, filtered to those that apply to the person's age and sex.
- Rules in the system text (constant): one question only; kinds `choice`, `multi` or `number`; 2 to 7 options for choice and multi, written by the model, no "not sure" option (the server adds markers); ask only what helps assess cancer risk factors; build on the last answers (a smoker is asked how much and for how long, a person with a relative with cancer is asked which cancer and how old the relative was); never repeat a topic that is answered; `domain` must be one of the uncovered domains; no diagnosis, no treatment, no judging; no request for a name, place, contact detail or exact date; plain words; the language of `language`. Reply is one JSON object `{ done: boolean, domain, kind, title, help?, options?, number? }`. `done: true` is allowed only when every essential domain that applies is covered and `answered >= min`; the server rejects an early `done` and asks again once with a hint, then uses the bank.
- Guard (`src/lib/interview/guard.ts`, reusing the claim checks in `src/lib/ai/guard.ts`): title 10 to 160 characters and plain text, no link or markup, no diagnosis or treatment wording, no request for PII, options 2 to 7 of 1 to 60 characters with no duplicates and none named "not sure" or "prefer not to say", number ranges sane (min < max, within 0 to 10000), `domain` valid and uncovered, right language. Option ids are assigned by the server (`o1`...).
- At `max` turns the interview completes whatever the coverage says.
- The first question after basics and each `undo` use the same path.

### 5.5 Next action and the PWA flow

`/api/chat/next-action` (`actionFor` / `nextAction` in `src/lib/chat-journey.ts`) learns the new states: basics incomplete -> `complete_intake` (as today); basics complete and no interview or an active one -> `continue_interview`; interview complete and no current risk assessment -> `run_risk`; assessment complete -> `see_risk`; otherwise as today. Ids and titles follow the existing shape and are written in the database-backed evidence the same way the others are.

The PWA: `#you` is the basics chat. Its completion bubble offers "Continue with the AI questions" which opens `#interview`, an engine like the intake chat for the open `Turn` (choice chips, multi-choice pills with a Continue button, a number field), the "Not sure" and "Prefer not to say" links, Back (undo), a progress bar from `answered` and `max`, and the consent bubble first. Finishing starts the risk assessment and opens `#risk`.

## 6. The AI risk assessment

### 6.1 What it produces

After the interview completes, the model rates the person's risk for each cancer type that applies and then overall, and justifies each rating from Finnish guidance first, then European, then UK and WHO material where Finnish and European sources give no figure (this is the order in the design). It compares the person with other people of the same age and sex in Finland. It is information, not a diagnosis and not a prediction.

```ts
type Tier = "average" | "raised" | "high" | "unknown";
type RiskResult = {
  version: 1; generatedAt: string; language: "en" | "fi"; contentVersion: string;
  overall: { tier: Tier; line: string; basis: string; drivers: { factor: string; cancers: string[] }[] };
  items: {
    cancer: string;                 // a ContentTopic id: lung, bowel, breast, prostate, skin, cervical, womb, ovary, bladder, kidney, liver, pancreas, stomach, mouththroat, thyroid, testicular
    tier: Tier;
    limited: boolean;               // too few of the factors that matter were answered, so "average so far"
    why: string;                    // one or two sentences that justify the tier
    brief: string;                  // a few words under the name: "smoking, family history" or "Typical for your age and sex"
    findings: { direction: "up" | "down" | "none" | "info"; title: string; text: string; sources: string[] }[];   // sources are ContentSource ids
    tips: string[];                 // what can help, grounded in the passages
    notCovered: string[];           // copied by the server from the database, never written by the model
  }[];
  skipped: string[];                // cancer types left out because they depend on a sex the profile does not say
  guidelines: string[];             // ContentSource ids of every guideline cited
  audited: boolean;
};
```

Tier meaning (stored in the database as the rubric, section 9, and given to the model): **Average**: nothing named by guidance raises it beyond what is typical for the age and sex, or only small factors that together stay typical. **Raised**: at least one moderate factor (about 1.5 to 2.5 times the risk) or several small ones together. **High**: at least one very large factor (about 4 times the risk or more, for example smoking for lung cancer or a damaged liver for liver cancer) or several large ones that add up. Small factors on their own never make High. **Unknown**: too little is known to say. The overall level is the model's own summary across the types (no guideline combines cancers into one score) and must be at least as high as the highest type tier; it names the types and factors that drive it.

### 6.2 Endpoint `/api/risk`

Signed-in, same-origin, `privateJson`. `GET /api/risk` returns `{ enabled, ready, assessment }` where `ready` means the interview is complete and `assessment` is:

```ts
type Assessment = {
  id: string; status: "running" | "complete" | "failed"; language: "en" | "fi";
  stale: boolean;                                    // the answers or the content changed after it was made
  createdAt: string; completedAt: string | null;
  progress: { done: number; total: number } | null;
  failure: string | null;                            // a reason code
  result: RiskResult | null;
};
```
`POST /api/risk` with `{ consent: true, language, action: "run" }` starts the job and returns at once with the new `assessment` (status `running`). 409 `{ error: "interview" }` if the interview is not complete; 429 `{ error: "limited" }` when `allowIn("risk", username)` refuses; if one is already running, return it. The PWA reads `GET /api/risk` every 2 seconds until the status is `complete` or `failed`. A job that has not changed for 3 minutes is marked `failed` with reason `interrupted` when read (server restart).

### 6.3 The job

Run in the Node process after the response (Next.js `after()` or a detached promise; the container is long-lived). Steps, with progress written to the row after each:
1. Read the account's basics and the whole interview transcript; build facts (`factsOf` plus turns). Compute `inputHash` (facts + transcript + content version + language).
2. For each cancer type that applies to the sex (from `ContentRiskType`): retrieve guideline passages from the content store: that type's risk facts and tips first (`ContentRiskFact`, `ContentRiskFactor`), then its guideline and article passages by full-text search on the person's strongest factors, filtered with `citable` and ordered Finland, Europe, international. Up to 14 passages per type.
3. One model call per type (concurrency 4, 15 s each, one retry on 429 or 5xx): facts, transcript, rubric, passages in; `{ tier, limited, why, brief, findings[], tips[] }` out. Findings cite passage ids; the server maps them to `ContentSource` ids, orders by tier of source, and attaches `notCovered`.
4. One model call for the overall level from the per-type results.
5. One audit call: a second pass over the finished result with the rubric and passages that answers `{ ok, issues[] }`; if issues name types, those types are redone once with the issue text added; the result is `audited: true` when the second pass is clean. If the audit itself fails the result is kept with `audited: false`.
6. Save `result`, `completedAt`, status `complete`. A type that still fails becomes tier `unknown` with a plain `why`. If every type fails the status is `failed` with the reason code.

### 6.4 Guard for risk output (`src/lib/risk/guard.ts`)

Schema strict (zod); tier is an enum; `findings` 0 to 8 per type, each `title` 3 to 80 and `text` 10 to 400 plain characters; every finding with direction `up` or `down` cites at least one supplied passage; `tier` `raised` or `high` needs at least one `up` finding; `high` needs a finding whose cited passage states a large effect (the passage's `effect` class is `large` or `very-large`); no link, markup or HTML; right language; no diagnosis or treatment wording (reuse `src/lib/ai/guard.ts` claim checks, and add the phrases "you will get", "you are going to get", "you have cancer"); no number about the person's own risk (no percentages or "x times" about the person), while a number that is written in a cited passage may be quoted; overall tier at least the highest item tier; every cited source id was supplied. Wording such as "raises your risk" and "lowers your risk" is allowed here (it is the feature), so this guard does not use the chat's "your risk" refusal.

### 6.5 Limits, privacy, failure

`allowIn("risk", username)` once per run (3 an hour by default), job deadline 120 s. Facts follow section 3. Model off or not configured: `GET` says `enabled: false` and `POST` returns 200 `{ assessment: null, error: "unavailable" }`; there is no static fallback ratings. Logs: `risk step=<type|overall|audit|job> reason=<code>`.

## 7. Close monitoring

Rules and parameters live in the database (section 9: `ContentMeta.monitorRules`, `ContentMonitorFlag`), not in code or UI. The server evaluates; the model has no part in the decision (it may write an extra plain explanation only if a later change adds it, and then it can never lower a level).

- Tables `SymptomMonitor`, `MonitorCheckin` (section 10); `CareReminder.monitorId` links the one active reminder of a watch.
- `POST /api/monitors { action: "start", observationId }` starts a watch on the account's own symptom observation (404 otherwise); `{ action: "checkin", observationId, trend: "gone"|"better"|"same"|"worse", level: number | null, flags: string[], serious: boolean }` evaluates, stores and returns `{ monitor, result: { level: "gone"|"watch"|"doctor"|"emergency", why: string[], urgency: ""|"weeks"|"days"|"today" } }`; `{ action: "stop" | "snooze", observationId }`. `GET /api/monitors` returns `{ monitors, config }` with each monitor `{ id, observationId, status, startedAt, dueAt, level0, trend0, checkins: [{ ts, trend, level, flags, result }] }` and `config` `{ steps, trends, flags, serious }` from the database.
- Evaluation is a pure function of the rules in `src/lib/monitor/assess.ts` that reproduces the design's `A.monitorAssess` (diff lines 763-781): serious -> emergency; gone -> closes; worse, a level of at least 7 (9 or more is more urgent), a rise of 2 or more since the last log, or any new flag -> doctor; otherwise, still there after 21 days or the same after 7 days -> doctor; else watch. Thresholds come from `monitorRules`. Steps are days 3, 7, 14 and 21 from `monitorRules.steps`; after each check-in the next due time is the later of the next step and two days away, at 09:00.
- Reminder sync: one active reminder (`kind: "recheck"`, `monitorId`) per active monitor at `dueAt`, replaced on every change, removed when the monitor ends or the observation is deleted. `GET /api/reminders` and `GET /api/observations` include `monitor` (the observation id, or the monitor summary).
- Symptom outcome: `save_symptom` returns `outcome: { level: "emergency" | "doctor" | "watch", urgency, why[] }` computed by `src/lib/monitor/triage.ts` from database rules (the existing emergency detection first; a mild, recent, improving symptom with no warning word is `watch`; otherwise `doctor`, with the design's urgency wording). A `watch` outcome starts a monitor. The PWA also offers "Watch this closely" on any symptom note.

## 8. PDF for my doctor

Client-side only, as in the design: the PWA builds the PDF in the browser from data it already holds (symptom notes with their monitor updates, self-check findings, optional background from the basics and the interview transcript, age, sex, region; the first name only if the person ticks it) and the person saves, shares or copies it. Nothing is sent to the server. Port the v2 `care4all pdf` and `care4all doctor` scripts, replacing `A.survey.answered()` with the interview transcript and the basics from the API. Text such as "made on this device" is true here, but never say the data is not stored on a server.

## 9. Content in the database

Seed it from the v2 design programmatically (a one-off extraction script that evaluates the object literals `SRC`, `RULES`, `LIB`, `ORDER`, `TIERS` and the monitor and doctor constants from the v2 HTML, and writes `prisma/seed-data/risk-content.ts`; do not retype). Then it is database content like the rest: seeded idempotently, versioned by `contentVersion`, served by `GET /api/content`, indexed in `ContentPassage`.

New content tables (the `content` package decides exact columns and keeps `ContentReport` untouched):
- `ContentRiskType`: one per cancer type (`id` = the `ContentTopic` id, `position`, `sex` `any|female|male`, `notCovered text[]` from `RULES[type].not`).
- `ContentRiskFactor`: one per factor in `LIB` (`key`, `name`, `short`, `tip`).
- `ContentRiskFact`: one per (cancer type, factor, state) in `RULES` that has a statement: `riskType`, `factor`, `state`, `effect` (`small|moderate|large|very-large|protective|info`, from the weight: 0.5 and 1 small, 2 moderate, 3 large, 4 and above very-large, negative protective, the `age` row info), `text` (`t[state]` or `t.any`), `sourceIds text[]`, `position`. `buildPassages` turns each into a passage `risk:<type>:<factor>:<state>` (kind `risk`, topic = the type) and each factor tip into `risk-tip:<factor>`.
- Guidelines: the v2 `SRC` entries are added to `ContentSource` (with `tier` `finland|europe|international` by host, and a flag `guideline`); every id used by `RULES` must resolve to a source (a test fails otherwise). Also store a `ContentGuideline` list linking each cancer type to its guideline sources in priority order (Finnish first). `retrieved` is the design export date; say so in `docs/content-database.md` (these statements come from the design and were not independently re-verified).
- `ContentAssessmentDomain`: the coverage list for the interview: `id`, `position`, `name` (en, fi), `essential`, `appliesTo` (`any|female|male`, optional `minAge` and `maxAge`), `ask` (what to find out, in English, given to the model) and `fallback` (a complete fallback `Turn` definition in en and fi: kind, title, options). Seed these domains: `tobacco` (essential), `alcohol` (essential), `activity` (essential), `diet` (essential), `family` (essential), `conditions` (essential), `sun` (essential), `work` (optional), `screening` (essential, by age and sex), `vaccines` (optional), `male-genital` (male, essential), `symptoms` (essential: any warning sign now). Draft the Finnish fallback texts and mark them unreviewed.
- `ContentMeta` keys: `interviewLimits` (`{ min: 10, max: 28 }`), `riskRubric` (the tier meanings above, en and fi), `monitorRules` (steps, thresholds, urgency words), `riskInfinland` (the "34 in 100 cancers in men and 24 in 100 in women..." statistic with its source ids).
- `ContentMonitorFlag`: the six check-in flags and the "serious now" wording (en, fi) from the design.
- `ContentString` gets scopes `risk` and `monitor` (extend the check constraint) for the screen copy that is content: tier labels, the "How this is worked out" points, the legend, the gate text, the monitor texts. Per language rows, like `I18N`.

`GET /api/content` additions (keep every existing key and the golden fixtures byte-identical for the old ones): `RISK: { ORDER, TIERS, TYPES: { [id]: { sex, notCovered } }, FACTORS, GUIDELINES: [{ type, sources: [id] }], RUBRIC, IN_FINLAND, COPY }`, `MONITOR: { STEPS, TRENDS, FLAGS, SERIOUS, COPY }`, `INTERVIEW: { MIN, MAX }`, and the new sources inside `SOURCES`. Strings are `{ en, fi }` objects. The ETag and the 304 behaviour stay.

## 10. Prisma models

Exact new operational models (the `schema` package writes them, with a migration that only adds tables and a nullable column, and keeps the model names; the `content` package adds the content tables in the same migration set after `schema` is done):

```prisma
model AiInterview {
  id          String    @id @default(uuid())
  username    String    @unique
  account     ScreeningAccount @relation(fields: [username], references: [username], onDelete: Cascade)
  language    String
  status      String    @default("active")
  startedAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?
  turns       AiTurn[]
}
model AiTurn {
  id          String    @id @default(uuid())
  interviewId String
  interview   AiInterview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  position    Int
  domain      String
  kind        String
  title       String
  help        String?
  options     Json?
  range       Json?
  source      String
  provider    String?
  model       String?
  answer      Json?
  answerLabel String?
  askedAt     DateTime  @default(now())
  answeredAt  DateTime?
  @@unique([interviewId, position])
}
model RiskAssessment {
  id             String    @id @default(uuid())
  username       String    @unique
  account        ScreeningAccount @relation(fields: [username], references: [username], onDelete: Cascade)
  status         String
  language       String
  inputHash      String
  contentVersion String
  result         Json?
  progress       Json?
  failure        String?
  provider       String?
  model          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  completedAt    DateTime?
}
model SymptomMonitor {
  id            String    @id @default(uuid())
  username      String
  account       ScreeningAccount @relation(fields: [username], references: [username], onDelete: Cascade)
  observationId String    @unique
  observation   HealthObservation @relation(fields: [observationId], references: [id], onDelete: Cascade)
  status        String    @default("active")
  startedAt     DateTime  @default(now())
  dueAt         DateTime
  level0        Int?
  trend0        String?
  checkins      MonitorCheckin[]
  reminders     CareReminder[]
  @@index([username, status])
}
model MonitorCheckin {
  id        String   @id @default(uuid())
  monitorId String
  monitor   SymptomMonitor @relation(fields: [monitorId], references: [id], onDelete: Cascade)
  ts        DateTime @default(now())
  trend     String
  level     Int?
  flags     String[]
  serious   Boolean  @default(false)
  result    String
  @@index([monitorId, ts])
}
// CareReminder gains: monitorId String? with a relation to SymptomMonitor (onDelete: Cascade)
```
Check the real model and field names of the existing `ScreeningAccount`, `HealthObservation` and `CareReminder` in `prisma/schema.prisma` first and adapt (for example the observation id type). The migration must be additive and must not touch existing data.

## 11. Frontend

Style source of truth is the design's CSS and markup; the PWA mirrors the design's script blocks one-to-one in modules (see `frontend/ARCHITECTURE.md`). All v2 CSS goes into `frontend/src/styles/app.css` (`fe-shell`). Names that the packages share:

- `A.risk` (from `views/risk.js`): `ready()`, `enabled()`, `assessment()`, `result()`, `load()` (reads `/api/risk`), `run()`, `tier(id)`, `tag(tier, label)`, `dot(id)`, `sr(id)`, `strip(id)`, `card()`, `userTag()`, `legend()`; `V.risk` is the `#risk` screen. State lives in `S.risk = { loaded, enabled, ready, assessment }`. Badges and the strip render synchronously from `S.risk`, so `load()` runs at start-up after sign-in and after the interview completes. Tiers, labels, legend, "How this is worked out" and every reason come from `A.D.RISK` and from the assessment result; nothing is typed into the module. While `status` is `running` the screen shows progress ("Reading your answers", "Checking Finnish guidance for lung cancer", ...) from `progress` and polls every 2 seconds.
- `V.interview` and `A.interview` (from `views/interview.js`): route `#interview`.
- `A.monitor*`, `A.open.checkin`, `A.MONITOR_STEPS`, `A.remLabel(r)`, `A.monitorLines(n)` (from `monitor.js`, same names as the design, backed by `/api/monitors`; `S.monitors` is the list); `A.pdf`, `A.doctorPdf`, `A.open.doctorPdf`, `A.doctorText` (from `pdf.js` and `doctor.js`).
- The interview and the risk screens never write browser storage. Nothing about them is cached by the service worker (it caches `GET /api/content` only).
- Finnish: every new visible string is `A.tr(en, fi)`; draft the Finnish and mark it unreviewed in the report. Swedish falls back to English.
- Accessibility as in the rest of the app: roles, labels, focus, 44 px targets, reduced motion, light and dark.

`integrate` wires: the badges, the strip, the Home tag, the card at the end of the interview, the `sv-risk` next-step item (served by the next action), the notes and symptom-engine monitor hooks, the profile card cells, `S.risk` and `S.monitors` loading in `svc.boot()`, content validation of the new keys in `state/content.js`, the routes in `ui.js` (`interview`, `risk`), and removes `assess`.

## 12. Tests, docs and the definition of done

- Backend unit tests with fake models (no network) for every endpoint, guard and the PII test; database tests (`CONTENT_TEST_DATABASE_URL`, scratch database) for the new tables, the seed and retrieval; keep the 114 existing backend tests and 49 frontend tests green except where behaviour changed on purpose (say which).
- Frontend unit tests for the pure parts (the PDF writer, the text formatters, the risk and monitor view rendering from fixtures) and a Playwright spec `tests/e2e/design-v2.spec.ts` (written by `integrate`) with the model endpoints faked through `page.route`, so it never calls a model.
- A live check per AI package with real Gemini on a scratch database and a realistic fictional person (the key and model are in `.env.docker`; read only those two values, in memory).
- Docs: the package docs named in section 4 say what is sent, what is stored, the endpoints and the limits. `README.md` and `docs/deployment.md` (`integrate`) mention the new env variables `INTERVIEW_RATE_LIMIT` and `RISK_RATE_LIMIT`.
- Report: files changed, tests run with counts, one redacted real example, anything that surprised you, and "Needs from others".

## 13. Safety rails (apply to every package)

No diagnosis, no probability or score about a person, no treatment or medicine advice, no "you will get cancer", no reassurance that a symptom is harmless. A tier compares a person with others of the same age and sex and is not a prediction. A warning symptom is a different question from a risk tag and is always pointed to the symptom conversation and, if urgent, to 112. Google's Gemini API terms prohibit clinical and medical-advice use, so wording stays information-only; say so in the docs and in the final report.
