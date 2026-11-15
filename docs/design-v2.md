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
- Evaluation is a pure function of the rules in `src/lib/monitor/assess.ts` that reproduces the design's `A.monitorAssess` (design lines 12297-12315, diff line 857): serious -> emergency; gone -> closes; worse, a level of at least 7 (9 or more is more urgent), a rise of 2 or more since the last log, or any new flag -> doctor; otherwise, still there after 21 days or the same after 7 days -> doctor; else watch. Thresholds come from `monitorRules`. Steps are days 3, 7, 14 and 21 from `monitorRules.steps`; after each check-in the next due time is the later of the next step and two days away, at 09:00.
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

## Appendix A. Contract details (written by the architect)

Sections 1 to 13 stand. This appendix pins what they leave open, so that the six packages that start together code to the same tables, shapes and names. Where it adds to a section it says so, and A.12 lists every place where it differs. If something here is wrong or missing, say so in your report; do not invent a different contract. A.14 lists what a second reading of the whole contract (the contract review) changed.

Line numbers below are lines of `frontend/design/care4all.artifact.html` (design v2) unless they say "diff". The v2 scripts: monitor 12233-12446, pdf 12448-12651, doctor 12653-12860, risk 12862-13361. The symptom engine of the v1 design, which the monitor triage rules come from: `CATS` 11716-11731, `MUST_SEE` 11842-11852, `outcome()` 11854-11893, `RED` 10164.

### A.1 The skeleton, and who may edit what

Delivered by the architect. Everything type-checks (`npx tsc --noEmit` clean), the existing tests behave as before, and `tests/content-db.test.ts` passes against PostgreSQL with both new migrations applied.

| What | Files |
| --- | --- |
| Schema, migrations | `prisma/schema.prisma`; `prisma/migrations/20261116000000_ai_interview_risk_monitoring` (the five operational models, `CareReminder.monitorId`); `prisma/migrations/20261116010000_risk_monitor_content` (six content tables, `ContentSource.tier` and `.guideline`, the widened `ContentString` scope check). Both only add. The client in `src/generated` is generated. |
| Content types | `src/lib/content/v2-types.ts` (vocabularies, read models, payload types, `riskPassageId`, `riskTipPassageId`), `src/lib/content/v2-schemas.ts` (zod for the jsonb columns), `prisma/seed-data/v2-types.ts` (what the three seed modules export) |
| Seed modules, empty skeletons | `prisma/seed-data/risk-content.ts` exports `riskSeed`, `interview-content.ts` exports `interviewSeed`, `monitor-content.ts` exports `monitorSeed`. `loadSeedInput()` includes them, so `SeedInput` has `risk`, `interview` and `monitor`. |
| Content layer | `types.ts` (`ContentStore.loadRisk/loadInterview/loadMonitor`, `PassageQuery.kinds`), `rows.ts` (row types, `ContentRows`, `toRows`), `store.ts` (`readRows`, `writeRows`, `deleteContent` know the new tables; the three new methods throw), `memory-store.ts` (the same three throw) |

**Real, and stub.** Real: the schema, the migrations, the types, and the plumbing that moves the new tables between a seed, `ContentRows` and PostgreSQL: `toRows` turns the three modules into rows (positions from array order, the meta rows of A.4, the strings of A.5, and the six monitor flags plus the serious row), `readRows`, `writeRows` and `deleteContent` handle them in foreign key order, and a round trip of sample rows through `seedContent`, `readRows` and `reindexContent` was proved on a scratch database. Stub: `loadRisk`, `loadInterview` and `loadMonitor` (they throw `not implemented: content package`), the derived `ContentSource.tier` and `.guideline` (always null and false until the content package derives them), risk passages (none are built), reference checks for the new rows (none), and the three new sections of `GET /api/content` (not served).

**Ownership, amending section 4.**
- `schema` is the architect, as the task amended it. It owns `prisma/schema.prisma`, the `20261116*` migrations and the client. From now on every package amends the schema with the protocol of A.11. The `content` package no longer edits the schema.
- `src/lib/content/types.ts`, `rows.ts`, `store.ts`, `memory-store.ts`, `seed-input.ts`, `v2-schemas.ts` and `prisma/seed-data/v2-types.ts` belong to `content` as before. `src/lib/content/v2-types.ts` too, with two exceptions: the `interview` package may edit the interview types (`FallbackTurn`, `InterviewDomain`, `InterviewContent`, `InterviewSection`, `DomainSeed`, `InterviewSeed`), and the `monitor` package the monitor types (everything under "Close monitoring", `MonitorFlag`, `MonitorContent`, `MonitorSection`, `MonitorFlagSeed`, `MonitorSeed`). They use `Edit`, only add (new optional fields, new keys), never rename or remove, and list each change in their report. Anyone else who needs a change lists it under needs-from-others.
- `content` may edit `src/lib/chat-evidence.ts` only to export its table of hosts and tiers, without changing it (A.8).
- `interview` may edit `src/lib/assess/facts.ts` and `src/lib/intake/report.ts` for the weight fact (A.10). The change must be additive: `tests/assess.test.ts`, which nobody owns, asserts `factsOf({})` is `{ answers: [] }` and checks `bmiBand`, and it must keep passing.

### A.2 Tables and columns

Every table is in `prisma/schema.prisma` with doc comments. Bilingual text is two columns, `…En` and `…Fi`; a list of text is two `text[]` columns of the same length (the database checks it); nested data that is always read whole is jsonb with `{ "en", "fi" }` leaves; a list of source ids is a `text[]` named `…SourceIds`, in display order, with no foreign key (the seed and `db:reindex` check every id). Every text of the new content tables has both languages (A.9).

**Operational tables.** Account data: each belongs to one account, is deleted with it, and is part of its data export. The database checks the value sets below. To add a value use A.11.

| Table | Columns (all `NOT NULL` unless marked `?`) | Pins |
| --- | --- | --- |
| `AiInterview` | `id` uuid pk, `username` unique, `language`, `status` default `active`, `startedAt`, `updatedAt`, `completedAt?` | `language` is `en` or `fi`. `status` is `active` or `complete`. |
| `AiTurn` | `id` uuid pk, `interviewId` (cascade), `position`, `domain`, `kind`, `title`, `help?`, `options?` json, `range?` json, `source`, `provider?`, `model?`, `answer?` json, `answerLabel?`, `askedAt`, `answeredAt?`. Unique `(interviewId, position)` | `position` is 1, 2, 3, ... in the order asked. The open question is the turn without `answeredAt`, at most one. `domain` is a `ContentAssessmentDomain` id. `kind` is `choice`, `multi` or `number`. `source` is `model` or `bank`; `provider` and `model` are null for the bank. `options` is `[{ "id": "o1", "label": "…", "exclusive": true }]` in the language of the interview. `range` is `{ "min", "max", "unit"?, "decimals"? }`. `answer` has exactly one key: `{ "value": "o2" }`, `{ "value": ["o1", "o3"] }`, `{ "value": 12 }`, `{ "marker": "unsure" }` or `{ "marker": "declined" }`. `answerLabel` is the answer in words in the interview's language: the option labels joined with ", ", the number with its unit, or the marker words `Not sure` / `Prefer not to say` (Finnish `En ole varma` / `En halua vastata`). The transcript a model is told is `domain`, `title` and `answerLabel`, in order, answered turns only. |
| `RiskAssessment` | `id` uuid pk, `username` unique, `status`, `language`, `inputHash`, `contentVersion`, `result?` json, `progress?` json, `failure?`, `provider?`, `model?`, `createdAt`, `updatedAt`, `completedAt?` | `status` is `running`, `complete` or `failed`. `result` is the `RiskResult` of section 6.1 (with the pins of A.10). `progress` is `{ "done", "total" }`. `failure` is a reason code. `stale` is computed on read from `inputHash` and `contentVersion`; it is not a column. |
| `SymptomMonitor` | `id` uuid pk, `username`, `observationId` unique (cascade), `status` default `active`, `startedAt`, `dueAt`, `level0?`, `trend0?`. Index `(username, status)` | `status` is `active`, `resolved` (it went away), `escalated` (see a doctor) or `stopped` (the person stopped it). `level0` is 0 to 10 when the symptom's strength was known at the start, else null. `trend0` is the note's course when the watch started (`same`, `worse`, `better`, `comes` or `unsure`), else null. |
| `MonitorCheckin` | `id` uuid pk, `monitorId` (cascade), `ts`, `trend`, `level?`, `flags text[]`, `serious` default false, `result`. Index `(monitorId, ts)` | `trend` is `gone`, `better`, `same` or `worse`. `level` is 0 to 10. `flags` are `ContentMonitorFlag` ids of kind `flag`. `result` is the level the rules gave: `gone`, `watch`, `doctor` or `emergency`. |
| `CareReminder` (gains) | `monitorId?` (cascade, indexed) | The one active reminder of a watch: `kind` is `recheck`, `monitorId` is set. Deleting the monitor, and so the observation or the account, deletes it. |

**Content tables.** Replaced as a whole by the seed, like the rest. Positions come from array order.

| Table | Columns | Pins |
| --- | --- | --- |
| `ContentRiskType` | `id` pk (a `ContentTopic` id), `position`, `sex`, `nameEn`, `nameFi`, `notCoveredEn text[]`, `notCoveredFi text[]` | `sex` is `any`, `female` or `male`; whether a type applies to a person is decided as A.10 says (the bodies rule of the intake), not by the profile. `name` is the full name: English is the topic's `name` plus ` cancer` (`Lung cancer`, `Mouth and throat cancer`), except `ovary` (`Ovarian cancer`) and `pancreas` (`Pancreatic cancer`), which the plain rule would misspell; Finnish is a drafted full name (`Keuhkosyöpä`). `notCovered` is `RULES[type].not`; the server copies it into every assessment, in the assessment's language. |
| `ContentRiskFactor` | `key` pk, `position`, `nameEn`, `nameFi`, `shortEn`, `shortFi`, `tipEn?`, `tipFi?`, `tipSourceIds text[]`, `states` json | One per key of `LIB`: 28 (27 factors and `age`). `short` is the design's `SHORT[key]`, or the lower-cased name when there is none (`age`). `tip` is `LIB[key].tip`, null for `age`, null in both languages together. `tipSourceIds` is empty except `alcohol` (`ecac5-alcohol`) and `meat` (`ecac5-diet`), whose tips name the European Code. `states` is `[{ "id": "now", "you": { "en": "You smoke or use tobacco", "fi": "…" } }]`: every state the factor can be in, in the order of A.3, each with the sentence that says it about the person. |
| `ContentRiskFact` | `riskType` (cascade), `factor` (cascade), `state`, `position`, `effect`, `textEn`, `textFi`, `sourceIds text[]`. Pk `(riskType, factor, state)`, unique `(riskType, position)` | 116 rows (A.3). `position` runs inside the cancer type, in the order of the rows of `RULES[type]`. `effect` is `small`, `moderate`, `large`, `very-large`, `protective` or `info`. |
| `ContentGuideline` | `riskType` pk (cascade), `sourceIds text[]` | One per cancer type: the sources its statements cite, Finnish first (A.3). |
| `ContentAssessmentDomain` | `id` pk, `position`, `nameEn`, `nameFi`, `essential`, `appliesTo`, `minAge?`, `maxAge?`, `ask`, `fallback` json | `appliesTo` is `any`, `female` or `male`, decided as A.10 says; `minAge` and `maxAge` are in years. `ask` is English, for the model. `fallback` is `{ "en": FallbackTurn, "fi": FallbackTurn }` (`v2-types.ts`): the same `kind` and the same number of options in both languages; option ids are assigned by the server when the turn is made. The twelve ids are `tobacco`, `alcohol`, `activity`, `diet`, `family`, `conditions`, `sun`, `work`, `screening`, `vaccines`, `male-genital`, `symptoms`. `male-genital` is `male`. Suggested: `screening` is `any` from `minAge` 30 (the first national programme is cervical screening at 30), with an `ask` that tells the model to ask only about the programmes that match the person's age and sex. Essential flags are those of section 9. |
| `ContentMonitorFlag` | `id` pk, `position`, `kind`, `labelEn`, `labelFi`, `wordEn?`, `wordFi?` | Seven rows: the six flags (`kind` `flag`: `blood`, `lump`, `swallow`, `weight`, `night`, `other`, with `word`) and one `serious` row (`kind` `serious`, no `word`) that holds the wording of the serious-now checkbox. The database refuses a second `serious` row. |
| `ContentSource` (gains) | `tier?`, `guideline` default false | `tier` is `finland`, `europe` or `international`, by the host of the page (A.8), null for any other host. `guideline` is true for the sources that a fact, a guideline, a tip, the rubric or `riskInFinland` names (57, A.3). |
| `ContentString` (widened) | scope check now allows `risk`, `monitor`, `interview` as well | A.5. |

### A.3 The seed modules: who owns which rows and strings

`prisma/seed-data/v2-types.ts` has the exact types. Positions come from array order. Strings are `{ scope, key, text: { en, fi } }` (A.5). Every module has `finnish: "unreviewed" | "reviewed"` (A.9).

| Module (owner) | Rows it owns | ContentMeta keys | String scope |
| --- | --- | --- | --- |
| `risk-content.ts` (content) | `sources` (the design's `SRC`, 18 new `ContentSource` rows, listed in the PWA's source list), `ContentRiskType`, `ContentRiskFactor`, `ContentRiskFact`, `ContentGuideline` | `riskRubric`, `riskInFinland` | `risk` |
| `interview-content.ts` (interview) | `ContentAssessmentDomain` | `interviewLimits` | `interview` |
| `monitor-content.ts` (monitor) | `ContentMonitorFlag` (six flags and `serious`) | `monitorRules` | `monitor` |

`toRows` also writes `finnishReview` (A.4) from the three `finnish` fields. A module never writes rows, keys or scopes that belong to another.

**How `risk-content.ts` is made.** One one-off script (kept in the repository as `prisma/seed-data/extract-risk-content.mjs`, which is in the content package's tree; run by hand, not part of the build) evaluates the object literals of the design's risk script in `node:vm` (the text from `/* ---------- sources added for this feature` to `function join(list)`, with stubs for `A`, `D`, `S`, `esc` and `ic`) and writes the file. It never retypes. The rules:

1. `types`: for each id of `ORDER` (design line 13121): `sex` is `RULES[id].sex` or `any`; `name.en` is `TOPICS[id].name + " cancer"` from `design-content.json`, except `ovary` (`Ovarian cancer`) and `pancreas` (`Pancreatic cancer`), which the script sets in a two-entry table; `name.fi` is drafted (A.9); `notCovered.en` is `RULES[id].not` verbatim, `notCovered.fi` drafted, same length.
2. `factors`: for each key of `LIB` in order (28): `name` is `LIB[key].name`; `short` is `SHORT[key]` or, when there is none (`age`), `LIB[key].name.toLowerCase()`; `tip` is `LIB[key].tip` or null; `tipSourceIds` as in A.2; `states` are the states of the table below, in that order, each with `you` from `LIB[key].you({ age: "{age}" }, state)`. Two factors are written by the script, because the design computes their sentence from a number: for `bmi`, `ok` is `Your BMI is under 25`, `over` is `Your BMI is 25 to 29.9 (overweight)`, `ob` is `Your BMI is 30 to 39.9 (obesity)`, `ob2` is `Your BMI is 40 or more (severe obesity)`; for `age` the sentence is the design's own, with `{age}`, which the risk package fills with the age in years.
3. `facts`: for each type in `ORDER`, for each row of `RULES[type].rows` in order, for each state in `Object.keys(row.w)` in order, with `w = row.w[state]`: the text is `row.t[state]`, or `row.t.any` when there is none, but only for the `age` row and for states with `w !== 0`; for a state with `w === 0` only an explicit `row.t[state]` counts (the design shows a general statement only for states that raise, lower or inform). A state with no text gives no fact. `sourceIds` is `row.s` verbatim. `effect` comes from the weight: the `age` row `info`; `w < 0` `protective`; `w === 0` `info`; `0 < w < 2` `small` (0.5, 1, 1.5); `2 <= w < 3` `moderate` (2); `3 <= w < 4` `large` (3, 3.5); `w >= 4` `very-large` (4, 5).
4. `guidelines`: for each type in `ORDER`, the distinct source ids of its facts in order of first citation, then stably ordered by source tier (finland, europe, international, none).
5. `sources`: the design's `SRC` verbatim (`name`, `org`, `date`, `url`, `use`). `toRows` gives them `listed: true`, positions after the design's 274, and `retrieved` equal to the design's export date.
6. `rubric`, `inFinland` and `strings` are written in the script from A.4 and A.5, because the design has them as prose inside functions (`howHtml`, `overallHtml`, `gate`, `V.risk`), not as constants. Where a design sentence is not true of this product (it says the work is done on the device), A.5 gives the amended English.

Numbers a test can check: 16 types, 28 factors, 116 facts (lung 7, bowel 13, breast 9, prostate 8, skin 7, cervical 4, womb 8, ovary 8, bladder 7, kidney 8, liver 12, pancreas 9, stomach 4, mouththroat 5, thyroid 4, testicular 3), by effect `very-large` 6, `large` 9, `moderate` 20, `small` 71, `protective` 2, `info` 8, 18 new sources (292 listed in all), 16 guidelines, 57 distinct source ids cited by statements, guidelines, rubric and `riskInFinland`. Every one of them resolves to a `ContentSource` (none is missing from the design's 274 plus the 18). The statements that can support a High tag, because their effect is `very-large` or `large`, are the following. Very large: `lung smoke now`, `bladder smoke now`, `mouththroat smoke now`, `skin moles many`, `womb bmi ob2`, `liver liverd yes`. Large: `bowel famBowel early`, `breast famBreast early`, `prostate famProstate early` and `yes`, `ovary famBreast early`, `womb bmi ob`, `stomach stomachd yes`, `testicular testisU yes`, `testicular testisR yes`.

States of each factor, in order (the `states` of `ContentRiskFactor`):

| Factor keys | States |
| --- | --- |
| `smoke` | `now`, `past`, `never` |
| `alcohol` | `never`, `rare`, `weekly`, `daily` |
| `bmi` | `ok`, `over`, `ob`, `ob2` |
| `active` | `high`, `some`, `low` |
| `meat`, `sunbed`, `outdoor`, `work`, `passive`, `diab`, `bp`, `ibd`, `liverd`, `copd`, `stomachd`, `prior`, `hbv`, `hpv`, `testisU`, `testisR` | `yes`, `no` |
| `famBreast`, `famBowel`, `famProstate`, `famSkin` | `early`, `yes`, `no` |
| `sun` | `burns`, `tans`, `rare` |
| `moles` | `many`, `some`, `few` |
| `scrC` | `ok`, `overdue` |
| `age` | `any` |

The order of the factors is that of `LIB`: `smoke`, `alcohol`, `bmi`, `active`, `meat`, `sunbed`, `outdoor`, `work`, `passive`, `diab`, `bp`, `ibd`, `liverd`, `copd`, `stomachd`, `prior`, `famBreast`, `famBowel`, `famProstate`, `famSkin`, `sun`, `moles`, `hbv`, `hpv`, `scrC`, `testisU`, `testisR`, `age`.

The three survey questions that v2 adds (`testis`, `history`, `exposure`, diff lines 357-380) are not ported as questions. The interview domains `male-genital`, `conditions` and `work` carry their intent, and the interview package may reuse their wording in `ask` and in the fallback options.

### A.4 The ContentMeta keys

All values are JSON. A `Bilingual` is `{ "en": "…", "fi": "…" }`. A source id is a `ContentSource` id.

**`interviewLimits`** (interview): `{ "min": 10, "max": 28 }`. Served as `INTERVIEW.MIN` and `INTERVIEW.MAX`.

**`riskRubric`** (content): the meaning of the tiers as the model is told and as the PWA explains them. The four tier texts are section 6.1's, verbatim; `overall` and `comparison` follow its wording.

```json
{
  "tiers": {
    "average": { "en": "Nothing named by guidance raises it beyond what is typical for the age and sex, or only small factors that together stay typical.", "fi": "…" },
    "raised":  { "en": "At least one moderate factor (about 1.5 to 2.5 times the risk) or several small ones together.", "fi": "…" },
    "high":    { "en": "At least one very large factor (about 4 times the risk or more, for example smoking for lung cancer or a damaged liver for liver cancer) or several large ones that add up. Small factors on their own never make High.", "fi": "…" },
    "unknown": { "en": "Too little is known to say.", "fi": "…" }
  },
  "overall": { "en": "The overall level is the model's own summary across the types, because no guideline combines cancers into one score. It must be at least as high as the highest type tier, and it names the types and factors that drive it.", "fi": "…" },
  "comparison": { "en": "A tier compares the person with other people of the same age and sex in Finland. It is information, not a diagnosis and not a prediction.", "fi": "…" },
  "sourceIds": ["ecac5", "kh-alcohol", "tk-lung", "syopa-risk"]
}
```

**`riskInFinland`** (content): `{ "text": Bilingual, "sourceIds": ["syopa-risk", "ecac5"] }`. English: `About 34 in 100 cancers in men and 24 in 100 in women are linked to smoking, alcohol and overweight (Cancer Registry study, reported by the Cancer Society). These are the factors you can change.`

**`monitorRules`** (monitor): the rules of close monitoring. The check-in rules are the design's `A.monitorAssess` (design 12297-12315) and `A.monitorSave` (12317); the numbers are its constants. The type is `MonitorRules` in `v2-types.ts`.

```json
{
  "steps": [3, 7, 14, 21],
  "reminderHour": 9,
  "timeZone": "Europe/Helsinki",
  "minGapDays": 2,
  "snoozeDays": 1,
  "thresholds": { "strong": 7, "veryStrong": 9, "rise": 2 },
  "stillThereDays": 21,
  "noBetterDays": 7,
  "urgency": {
    "ladder": ["weeks", "days", "today"],
    "watch": "weeks",
    "serious": "today",
    "raise": { "worse": "days", "strong": "days", "veryStrong": "today", "rise": "days", "newFlags": "days" }
  },
  "trends": [
    { "id": "gone",   "label": { "en": "It has gone" },    "word": { "en": "gone" },           "doctorWord": { "en": "it has gone" } },
    { "id": "better", "label": { "en": "Better" },         "word": { "en": "better" },         "doctorWord": { "en": "better" } },
    { "id": "same",   "label": { "en": "About the same" }, "word": { "en": "about the same" }, "doctorWord": { "en": "about the same" } },
    { "id": "worse",  "label": { "en": "Worse" },          "word": { "en": "worse" },          "doctorWord": { "en": "worse" } }
  ],
  "why": {
    "serious":     { "en": "You said something serious is happening right now." },
    "worse":       { "en": "It is getting worse." },
    "strong":      { "en": "It is strong ({level} out of 10)." },
    "rise":        { "en": "It has gone up from {from} to {to} out of 10." },
    "newFlags":    { "en": "You noticed something new: {flags}." },
    "stillThere":  { "en": "It is still there after 3 weeks." },
    "noBetter":    { "en": "It has not got better after a week." },
    "watchBetter": { "en": "It is getting better and nothing new has come up." },
    "watchSame":   { "en": "It is about the same and it is still early." }
  },
  "triage": {
    "watch": { "onset": ["today", "week"], "course": ["better"], "impact": ["none"] },
    "categories": [{ "id": "lump", "words": { "en": ["lump", "swell"], "fi": ["…"] }, "why": { "en": "A new lump or swelling is worth having looked at." }, "urgency": "weeks" }],
    "reasons": [{ "key": "course:worse", "why": { "en": "It is getting worse." }, "urgency": "days" }],
    "why": { "watch:1": { "en": "…" }, "watch:2": { "en": "…" }, "cautious": { "en": "…" } }
  }
}
```

Every `Bilingual` above has a Finnish text (the example leaves it out for length). The placeholders are `{level}`, `{from}`, `{to}` and `{flags}`. `3 weeks` and `a week` in `why` belong to `stillThereDays` 21 and `noBetterDays` 7: change a number and its sentence together. `timeZone` makes "local" mean the same on every server: update times are `reminderHour`:00 in that zone (A.10).

`triage` is for `save_symptom` (section 7). It ports the design's `outcome()` to what the backend saves (`label`, `onset`, `course`, `impact`, `notes`; there is no 0 to 10 strength). `watch`: the outcome is watch only when the saved onset, course and impact are each in the lists, no category matches, and there is nothing else to say. `categories`: the design's nine `MUST_SEE` entries (`lump`, `bleed`, `breast`, `testicle`, `skin`, `swallow`, `bowel`, `urinary`, `weight`; texts at 11842-11852) with the words of the matching `CATS` patterns (11717-11727) and the words of `RED` (10164) as lower-case word stems, English and Finnish, matched as substrings of the label and notes. `reasons` and `why` hold the design's other sentences of `outcome()`; the keys named in the type are the ones to use, and the monitor package may add more. The monitor package fills `triage`; the rest of `monitorRules` is exactly as above.

**`finnishReview`** (written by `toRows`): `{ "risk": "unreviewed", "interview": "unreviewed", "monitor": "unreviewed" }`, from the `finnish` field of each seed module.

### A.5 Screen copy: `ContentString`

Scopes `risk`, `monitor` and `interview` hold one row per language (`en`, `fi`), like `I18N`. A seed string is `{ scope, key, text: { en, fi } }`; `toRows` writes the two rows. The content package assembles the payload from them with these key rules:

- Scope `risk`: keys `tier.high`, `tier.raised`, `tier.average`, `tier.unknown` become `RISK.TIERS`, in that order. Every other key becomes `RISK.COPY[key]`.
- Scope `monitor`: keys `out.emergency`, `out.doctor`, `out.watch` become `MONITOR.OUT`; `sex.female`, `sex.male`, `sex.none` become `MONITOR.SEX`; `urgency.weeks`, `urgency.days`, `urgency.today` become `MONITOR.URGENCY`. Every other key becomes `MONITOR.COPY[key]`.
- Scope `interview`: every key becomes `INTERVIEW.COPY[key]`. Only `consent` is pinned (below). The interview package adds another string only for text that must stay true with the backend (for example what is kept). Button and layout wording stays in the PWA.

**What is stored and what stays in code.** Section 2's rule stands: button and layout wording stays in the PWA as `A.tr(en, fi)`. A text is stored when it states how the feature works or what a result means and so has to stay true with the backend: the method, the privacy statement, the explanation of a result, and the lists a screen iterates over. Headings, captions, labels, aria text, toasts, and every sentence built around a value stay in code. The design's sentences that say the work is done on the device ("Worked out on this device", "stay on this device") are untrue here and are replaced below.

Tier labels (scope `risk`): `tier.high` `High`, `tier.raised` `Raised`, `tier.average` `Average`, `tier.unknown` `Need answers`.

Risk copy (scope `risk`, English as pinned; Finnish drafted by the content package):

| Key | Where it is shown | English |
| --- | --- | --- |
| `lede` | under the title of `#risk` | Based on what you told me and Finnish and European guidance. Tap any tag to see the reasons. |
| `note` | the note box of `#risk` (the design says "Worked out on this device") | Worked out from your answers by an AI model, using Finnish and European guidance. It is not a diagnosis and not a prediction. It cannot see your genes or your test results. |
| `compare` | under the reason of every tag | You are compared with other people of your age and sex, so age alone does not change your tag. |
| `gate_title` | the card shown while the interview is not complete | Finish the questions first |
| `gate_body` | the same card | Your risk overview is worked out from your answers, so I need them first. You can answer "Not sure" or "Prefer not to say" to any question and still see your overview. |
| `legend` | under the list of the most common cancers, before the three badges and their `TIERS` words | The small badge on each icon is your risk tag: |
| `skipped` | when `RiskResult.skipped` is not empty (A.10 says when a type is left out) | I left out cancers that depend on sex or on which organs you have (breast, cervical, ovary and womb, prostate and testicular), because your basic answers do not say. You can change them at any time. |
| `how_title` | title of "How this is worked out" | How this is worked out |
| `how_sub` | its subtitle | Finnish and European guidance |
| `how_1` | the points, in order; read `how_1`, `how_2`, ... until a key is missing | For each cancer type I look at the factors that Finnish guidance names first (Käypä hoito, Duodecim, the Cancer Society of Finland, the Finnish Cancer Registry, STUK), then European guidance (the European Code Against Cancer), then UK and WHO material where there is no Finnish or European figure. |
| `how_2` | also the consent text before a run started from `#risk` (a re-run), because it says what is sent | An AI model (Google Gemini) reads your answers and the guidance and writes each tag and its reasons, and a second pass checks them against the guidance. It is sent your age, sex, weight group and answers, and whether you live in Finland. It is never sent your name, exact date of birth, place of residence or any ID. |
| `how_3` | | A tag compares you with other people of your age and sex in Finland. Raised means at least one moderate factor (about 1.5 to 2.5 times the risk) or several small ones together. High is for a very strong factor, about four times the risk or more, such as smoking for lung cancer or a damaged liver for liver cancer, or for several strong factors that add up. Small factors on their own never make a tag High. |
| `how_4` | | Factors I cannot ask about, such as genes, are listed under each tag, and your doctor can look at them. |
| `how_5` | | No guideline combines cancer types into one score. The overall tag is care4all's own summary of the types: it is never lower than the highest tag of a type, and it names what drives it. |
| `how_6` | | A tag is not a diagnosis and not a prediction. Most people with a Raised or High tag never get these cancers, and some people with an Average tag do. Screening and knowing your body matter for everyone. |

Interview copy (scope `interview`). The interview screens are the interview package's data and the PWA's wording, but the consent text states what is sent and kept, so it has to stay true with the backend, and the frontend that shows it (`fe-risk`) and the package that writes it (`interview`) need the same key. One key is pinned; the interview package adds others only as the key rules above say.

| Key | Where it is shown | English |
| --- | --- | --- |
| `consent` | the consent bubble before the first AI question, above the buttons that give consent | To ask each next question, an AI model (Google Gemini) reads your basic answers and the questions and answers so far. It is sent your age, sex, weight group, your answers, and whether you live in Finland. It is never sent your name, exact date of birth, place of residence or any ID. The questions and your answers are saved on your account and are deleted with it. You can answer “Not sure” or “Prefer not to say” to any question. |

Monitor copy (scope `monitor`). The first three groups are the design's constants (`OUT` of the doctor script, `SEX`, and the urgency lines that `result()` and the symptom finish both write out as `W` and `WHEN_TXT`); the last group is the running text of the check-in result, the Next Action card and the symptom finish. Placeholders in braces are filled by the PWA.

| Key | English |
| --- | --- |
| `out.emergency` | Go to emergency (call 112) |
| `out.doctor` | See a doctor about this |
| `out.watch` | Keep watching closely |
| `sex.female`, `sex.male`, `sex.intersex`, `sex.none` | Female, Male, Intersex, Not specified |
| `urgency.today` | Contact your health centre today. In the evening or at weekends, call 116 117. |
| `urgency.days` | Within the next few days |
| `urgency.weeks` | Book an appointment in the next week or two |
| `gone_title` | Good. I have closed the watch. |
| `gone_body` | Your note is kept as “gone”. If it comes back, or something else worries you, tell me again. |
| `emergency_title` | Get help now |
| `emergency_when` | Call 112 or go to emergency. |
| `doctor_title` | Time to see a doctor |
| `doctor_body` | Your updates are in your note, so you can show how it changed. |
| `watch_title` | Keep watching closely |
| `watch_body` | I have set a reminder. If it gets worse or something new comes up before then, log an update straight away. |
| `suggestion` | This is a suggestion, not a diagnosis. |
| `privacy` | Your updates are saved on your account. Nothing is sent to a doctor or to an AI model. |
| `reminders` | I will remind you on each of these days to log how it is. |
| `due_why` | You have been keeping an eye on this since {start} (day {day}). Tell me how it is now, so we can see whether it is changing and whether you need a doctor. It takes a minute. |
| `wait_why` | Next update: {next}. If it gets worse, or something new comes up, log an update now and do not wait. This is a suggestion, not a diagnosis. |
| `watching` | I will watch it with you. Next update: {next}. I will remind you. |
| `keep_eye` | Keep an eye on it. If it gets worse, tell me again. |

Where each monitor string is shown (the design's own places): `out.*` is the label of an outcome (the doctor PDF's "care4all suggested" row, the title of the symptom finish card); `sex.*` is the doctor PDF's "sex registered at birth" row; `urgency.*` is the line under "Time to see a doctor", for the `urgency` word of a check-in result or of a symptom outcome; `gone_*`, `emergency_*`, `doctor_*` and `watch_*` are the title and text of the check-in result for `result.level` `gone`, `emergency`, `doctor` and `watch`; `suggestion` is the first sentence of the disclaimer under a result, followed by the existing `COPY.help`; `privacy` is the note under "Save update" in the check-in sheet; `reminders` is the note under the list of check-in days in the symptom finish of a watch; `due_why` and `wait_why` are the "why" of the Close monitoring Next Action card when an update is due and when it is not yet; `watching` is the symptom finish line of a `watch` outcome whose watch has started and `keep_eye` the line when no watch has started. The reasons of a result (`result.why[]`) are the server's strings (`monitorRules.why`), not copy keys.

### A.6 `GET /api/content` additions

Every existing key and the golden fixtures for the old ones stay byte-identical, except that `SOURCES` gains the 18 sources of A.3 after the design's own. The body is `{ version, retrieved, content }` as before, with `content` extended by `RISK`, `MONITOR` and `INTERVIEW`. The types are `RiskSection`, `MonitorSection` and `InterviewSection` in `src/lib/content/v2-types.ts`; the ETag and the 304 behaviour do not change (the version hashes the three seed modules too). The three sections are public and hold no personal data. A leaf marked `Bilingual` is `{ "en", "fi" }`; the PWA picks one with the language of the screen (`sv` falls back to `en`). Key order is part of the contract where it says so.

`RISK` (design constants `ORDER`, `TIERS`, `SHORT`, `LIB`, `RULES`, `SRC`; examples abridged):

```json
"RISK": {
  "ORDER": ["lung", "bowel", "breast", "prostate", "skin", "cervical", "womb", "ovary", "bladder", "kidney", "liver", "pancreas", "stomach", "mouththroat", "thyroid", "testicular"],
  "TIERS": { "high": { "en": "High", "fi": "Korkea" }, "raised": { "en": "Raised", "fi": "Kohonnut" }, "average": { "en": "Average", "fi": "Keskimääräinen" }, "unknown": { "en": "Need answers", "fi": "Tarvitsee vastauksia" } },
  "TYPES": { "lung": { "sex": "any", "name": { "en": "Lung cancer", "fi": "Keuhkosyöpä" }, "notCovered": { "en": ["Lung cancer in a relative"], "fi": ["Keuhkosyöpä sukulaisella"] } } },
  "FACTORS": { "smoke": { "name": { "en": "Smoking", "fi": "Tupakointi" }, "short": { "en": "smoking", "fi": "tupakointi" }, "tip": { "en": "Your health centre can help you stop, with a plan and medicines. The benefit grows with every smoke-free year.", "fi": "…" } } },
  "GUIDELINES": [{ "type": "lung", "sources": ["tk-lung", "cs-lung", "cruk-lung-stats"] }],
  "RUBRIC": { "tiers": { "average": { "en": "…", "fi": "…" }, "raised": { "en": "…", "fi": "…" }, "high": { "en": "…", "fi": "…" }, "unknown": { "en": "…", "fi": "…" } }, "overall": { "en": "…", "fi": "…" }, "comparison": { "en": "…", "fi": "…" }, "sources": ["ecac5", "kh-alcohol", "tk-lung", "syopa-risk"] },
  "IN_FINLAND": { "text": { "en": "About 34 in 100 cancers in men and 24 in 100 in women are linked to smoking, alcohol and overweight (…).", "fi": "…" }, "sources": ["syopa-risk", "ecac5"] },
  "COPY": { "lede": { "en": "Based on what you told me and Finnish and European guidance. Tap any tag to see the reasons.", "fi": "…" } }
}
```

`TIERS` key order is the rank order, high first; there is no `RANK`. `TYPES` and `FACTORS` are in `ORDER` and `LIB` order. `TYPES[id].name` is the full name (`Lung cancer`): use it wherever a risk screen names a type, in both languages; `D.TOPICS[id].name` stays the name for the rest of the app. In a `RiskResult`, `overall.drivers[].factor` is a `FACTORS` key and `overall.drivers[].cancers` are `TYPES` ids, so the PWA writes their names itself in the language of the screen. `GUIDELINES[].sources`, `RUBRIC.sources`, `IN_FINLAND.sources` and the `sources` of a finding are ids into `SOURCES`. `FACTORS[key].tip` is the design's tip text, kept verbatim as grounding, and the PWA never draws it: the `smoke` tip mentions medicines and section 13 forbids medicine advice, so what a screen shows as "what can help" is `items[].tips` of the result, which the risk guard has checked (A.10).

`MONITOR` (design constants `STEPS`, `TRENDS`, `TREND_WORD`, `FLAGS`, `SERIOUS` of the monitor script; `OUT`, `TREND_WORD`, `FLAG_WORD`, `SEX` of the doctor script; the urgency lines):

```json
"MONITOR": {
  "STEPS": [3, 7, 14, 21],
  "TRENDS": [{ "id": "gone", "label": { "en": "It has gone", "fi": "…" } }, { "id": "better", "label": { "en": "Better", "fi": "…" } }, { "id": "same", "label": { "en": "About the same", "fi": "…" } }, { "id": "worse", "label": { "en": "Worse", "fi": "…" } }],
  "TREND_WORD": { "gone": { "en": "gone", "fi": "…" }, "better": { "en": "better", "fi": "…" }, "same": { "en": "about the same", "fi": "…" }, "worse": { "en": "worse", "fi": "…" } },
  "DOCTOR_TREND_WORD": { "gone": { "en": "it has gone", "fi": "…" }, "better": { "en": "better", "fi": "…" }, "same": { "en": "about the same", "fi": "…" }, "worse": { "en": "worse", "fi": "…" } },
  "FLAGS": [{ "id": "blood", "label": { "en": "Blood where there was none before", "fi": "…" } }, { "id": "lump", "label": { "en": "A new lump or swelling", "fi": "…" } }, "…four more: swallow, weight, night, other"],
  "FLAG_WORD": { "blood": { "en": "blood", "fi": "…" }, "lump": { "en": "a new lump or swelling", "fi": "…" } },
  "SERIOUS": { "en": "Something serious right now: chest pain, heavy bleeding, or I cannot breathe", "fi": "…" },
  "OUT": { "emergency": { "en": "Go to emergency (call 112)", "fi": "…" }, "doctor": { "en": "See a doctor about this", "fi": "…" }, "watch": { "en": "Keep watching closely", "fi": "…" } },
  "SEX": { "female": { "en": "Female", "fi": "Nainen" }, "male": { "en": "Male", "fi": "Mies" }, "intersex": { "en": "Intersex", "fi": "Intersukupuolinen" }, "none": { "en": "Not specified", "fi": "Ei määritelty" } },
  "URGENCY": { "weeks": { "en": "Book an appointment in the next week or two", "fi": "…" }, "days": { "en": "Within the next few days", "fi": "…" }, "today": { "en": "Contact your health centre today. In the evening or at weekends, call 116 117.", "fi": "…" } },
  "COPY": { "gone_title": { "en": "Good. I have closed the watch.", "fi": "…" } }
}
```

The example is abridged: `FLAGS` has six entries, `FLAG_WORD` six keys and `COPY` every key of A.5. `TRENDS` and `FLAGS` are in the order of the radio list and the checkbox list; `FLAG_WORD` has the same keys as `FLAGS`. The rules themselves (`monitorRules`) are not served: the server evaluates, and returns `why` strings (A.10). `GET /api/monitors` returns `config: { steps, trends, flags, serious }` with the shapes of `MONITOR.STEPS`, `MONITOR.TRENDS`, `MONITOR.FLAGS` and `MONITOR.SERIOUS`, from the same rows.

`INTERVIEW`:

```json
"INTERVIEW": { "MIN": 10, "MAX": 28, "COPY": {} }
```

What `state/content.js` checks (the `integrate` package): `RISK` is an object with `ORDER` an array, `TIERS`, `TYPES`, `FACTORS`, `RUBRIC`, `IN_FINLAND` and `COPY` objects and `GUIDELINES` an array; `MONITOR` an object with `STEPS`, `TRENDS` and `FLAGS` arrays and `TREND_WORD`, `DOCTOR_TREND_WORD`, `FLAG_WORD`, `SERIOUS`, `OUT`, `SEX`, `URGENCY` and `COPY` objects; `INTERVIEW` an object with numeric `MIN` and `MAX`. A payload without them still loads: the feature that needs a missing section is off, the app is not. The loader also keeps the payload's `retrieved` as `A.contentRetrieved` (`D.SOURCES` entries carry the design's `date` only, no retrieval date, and AGENTS.md asks for one beside every source): the risk screens show it as "retrieved 14 Nov 2026" next to each source link they draw.

### A.7 Every content constant of the v2 scripts, and where it goes

The rule: a data constant that is content (names, lists, texts, thresholds) becomes a key under `D.RISK` or `D.MONITOR`, with `{ en, fi }` leaves; functions, layout and button wording stay in the PWA as `A.tr(en, fi)`. The key has the constant's own name wherever the shape did not change (`ORDER`, `TIERS`, `STEPS`, `TRENDS`, `TREND_WORD`, `FLAGS`, `FLAG_WORD`, `SERIOUS`, `OUT`, `SEX`); the three tables whose shape did change keep the names section 9 gave them (`LIB` is `FACTORS`, `RULES` is `TYPES` plus the server-only statements, `SRC` joins `SOURCES`), and `W` is `URGENCY`. The doctor script's `TREND_WORD` differs from the monitor script's for `gone`, so it is `DOCTOR_TREND_WORD`. Two shapes still change a little when a script is ported, so do not copy the loops: a `TRENDS` entry is `{ id, label }` (the design has the pair `[id, label]`), and a `FLAGS` entry is `{ id, label }` (the design has `{ v, label }`), so `id` is what the design's `v` was. This is the complete list, from reading the four v2 scripts and the symptom engine they hook into. "Server only" means it is stored, the backend uses it, and it is not in the payload.

**Risk script** (diff lines 1422-1920).

| Constant | Stored in | Served as |
| --- | --- | --- |
| `KH`, `TK`, `KS`, `EC` (organisation names) | the `org` of the `SRC` entries | part of `SOURCES` |
| `SRC` (18 sources) | `ContentSource` (`risk.sources`, listed, with `tier` and `guideline`) | `SOURCES` |
| `LIB` (28 factors: `name`, `tip`, `you`; `get` and `applies` are functions) | `ContentRiskFactor` | `RISK.FACTORS[key]` (`name`, `short`, `tip`); the states and their sentences are server only |
| `BMI_WORD` | the four `bmi` state sentences (A.3) | server only |
| `RULES` (16 types: `sex`, `rows`, `not`) | `ContentRiskType` (`sex`, `notCovered`), `ContentRiskFact` (statements, sources, effect from the weight), `ContentGuideline` | `RISK.TYPES`, `RISK.GUIDELINES`; the facts are server only |
| `ORDER` | `ContentRiskType.position` | `RISK.ORDER` |
| `TIERS` | `ContentString` scope `risk`, keys `tier.*` | `RISK.TIERS` |
| `RANK` | not stored: it is the key order of `TIERS` | |
| `SHORT` | `ContentRiskFactor.short` | `RISK.FACTORS[key].short` |
| `FAMTXT` | not stored: it repeats the tip of `famBreast`, `famBowel`, `famProstate` and `famSkin` | |
| `GLYPH` (badge paths) | stays in the PWA (layout) | |
| `join`, `cap1`, `uniqList`, `row`, `yn`, `evalRow`, `assess`, `overall`, `applies`, `inputs`, `memo` and the other functions | not shipped: the model rates, the server checks | |
| the 'In Finland' paragraph and its two sources | `riskInFinland` | `RISK.IN_FINLAND` |
| the "How this is worked out" points, the chips list `['ecac5', 'kh-alcohol', 'tk-lung', 'syopa-risk']` | `ContentString` `how_*`, `riskRubric.sourceIds` | `RISK.COPY`, `RISK.RUBRIC.sources` |
| the lede, the note, the compare sentence, the gate text, the legend, the skipped-sexes text | `ContentString` scope `risk` | `RISK.COPY` |
| the tier meanings (the design's header comment and `howHtml`) | `riskRubric` | `RISK.RUBRIC` |
| everything else printed by `V.risk`, `itemHtml`, `bodyHtml`, `userTag`, `strip`, `card` (captions, button labels, aria text, counts) | stays in the PWA | |

**Monitor script** (diff lines 793-1004).

| Constant | Stored in | Served as |
| --- | --- | --- |
| `DAY` | code | |
| `STEPS` | `monitorRules.steps` | `MONITOR.STEPS` |
| `TRENDS` | `monitorRules.trends[].label` | `MONITOR.TRENDS` |
| `TREND_WORD` | `monitorRules.trends[].word` | `MONITOR.TREND_WORD` |
| `FLAGS` | `ContentMonitorFlag` rows of kind `flag`, `label` | `MONITOR.FLAGS` |
| `SERIOUS` | the `ContentMonitorFlag` row `serious`, `label` | `MONITOR.SERIOUS` |
| `nineAm` (hour 9), the two-day gap, the one-day snooze | `monitorRules.reminderHour`, `timeZone`, `minGapDays`, `snoozeDays` | server only |
| the thresholds 7 and 9, the rise of 2, 21 days still there, 7 days no better | `monitorRules.thresholds`, `stillThereDays`, `noBetterDays` | server only |
| `['weeks', 'days', 'today']` and what raises it | `monitorRules.urgency` | server only |
| the sentences of `A.monitorAssess` | `monitorRules.why` | returned by the API as `result.why[]` |
| `W` inside `result()` (the urgency lines) | `ContentString` `urgency.*` | `MONITOR.URGENCY` |
| the texts of `result()`, `monitorItems` and the symptom finish | `ContentString` (A.5) | `MONITOR.COPY` |
| labels, legends, buttons, toasts, `context()`, `form()` wording, step list text | stays in the PWA | |

**PDF script** (diff lines 1008-1209): `W`, `H`, `M`, `TOP`, `BOTTOM` (page geometry), `WR`, `WB` (Helvetica widths), `CP1252`, `INK`, `GRAY`, `LIGHT`, `ACCENT`, `SOFT`, `LINE`, `WHITE` (colours) are the writer's own and stay in code.

**Doctor script** (diff lines 1213-1418).

| Constant | Stored in | Served as |
| --- | --- | --- |
| `DAY` | code | |
| `OUT` | `ContentString` `out.*` | `MONITOR.OUT` |
| `TREND_WORD` (doctor) | `monitorRules.trends[].doctorWord` | `MONITOR.DOCTOR_TREND_WORD` |
| `FLAG_WORD` | `ContentMonitorFlag.word` | `MONITOR.FLAG_WORD` |
| `SEX` | `ContentString` `sex.*` | `MONITOR.SEX` |
| the document's titles, row labels, the closing disclaimer, the footer | stays in the PWA (`A.tr`) | |

**From the symptom engine** (v1 code the monitor hooks into, not in the v2 scripts): `RED`, the `CATS` patterns, `MUST_SEE` and `URGENCY` feed `monitorRules.triage`; `WHEN_TXT` is the same text as `W` above, so one `urgency.*` set serves both; `OUT_LABEL` of the notes list is v1 layout and stays in code.

### A.8 The content store

`ContentStore` has three new methods, all cached by content version for 30 seconds like the others, and a failure in one kind does not stop another:

```ts
loadRisk(): Promise<RiskContent>;
loadInterview(): Promise<InterviewContent>;
loadMonitor(): Promise<MonitorContent>;
```

The types are in `src/lib/content/v2-types.ts`. `RiskContent` is what the risk job needs: `version` (the content version a `RiskResult` records), `retrieved`, `order`, `tierLabels`, `rubric`, `inFinland`, `types`, `factors` (with `states`), `facts` (each with its `passageId`), `guidelines` and `sources` (every listed source whose `tier` is not null, 223 of the 292 today, in position order, with `tier` and `guideline`; `guideline` is true for the 57 that a fact, a guideline, a tip, the rubric or `inFinland` names; `name.fi` is the source's Finnish title, or its English name when it has none, which is the case for every source of the design). `InterviewContent` is `limits`, `domains` (with `ask` and both fallback questions) and `copy`. `MonitorContent` is `rules`, `flags` and `serious`. Until the content package replaces them, the stubs throw `not implemented: content package`: a package that needs content in a test builds the read model by hand, or wraps a store, `{ ...store, loadInterview: async () => fixture }`, as the existing tests do with `retrievePassages`.

**Retrieval.** `PassageQuery.kinds` limits a query to some kinds of passage (`PassageKind`). Without it a query returns what it always did: every kind except `risk` and `risk-tip`, so chat answers and the retrieval gold set do not change. The risk job asks for them, for example `kinds: ["risk", "guide", "article", "topic", "programme"]`, and it filters and orders what comes back itself: a passage is `citable` (section 6.3) when at least one of its sources is in `RiskContent.sources` (looked up by `PassageSource.id`; every source there has a tier), and passages are ordered by the best tier among those sources: finland, europe, international. The job asks only for kinds built from the design's own content, so every source such a passage cites is a listed one that the PWA can show (`evidence` and `catalog` passages cite unlisted sources and are never asked for). A finding's `sources` are the ids from `RiskContent.sources` among the sources of the passages it cites, best tier first. This is not the `citable()` of `src/lib/chat-model.ts`, which uses the chat's own allow-list and stays as it is.

**Passages built from the risk tables** (kind `risk` and `risk-tip`, indexed in both languages):

| Passage | id | topic | heading | text | sources |
| --- | --- | --- | --- | --- | --- |
| a statement, English | `risk:<type>:<factor>:<state>` | the cancer type | `<type name> · <factor name> · <state sentence>` | the statement | the fact's `sourceIds` |
| a statement, Finnish | the same id plus `:fi` | the same | the same, Finnish | the Finnish statement | the same |
| a tip | `risk-tip:<factor>` and `risk-tip:<factor>:fi` | `general` | `<factor name> · What can help` | the tip | the factor's `tipSourceIds`; with none, no passage is built (only `alcohol` and `meat` have any) |

`riskPassageId` and `riskTipPassageId` in `v2-types.ts` build these ids; everyone uses them. The model cites passage ids; the server maps a cited id to its fact, and from the fact to the `ContentSource` ids that `findings[].sources` carries.

**Source tiers.** `ContentSource.tier` comes from the host of the page, with the host table of `src/lib/chat-evidence.ts` plus one host that table lacks (the chat's own table must not change: adding a host there changes which passages chat may quote, and with it the chat answers and the retrieval gold set):

| Tier | Hosts |
| --- | --- |
| `finland` | `cancerregistry.fi`, `syoparekisteri.fi`, `www.terveyskirjasto.fi`, `allaboutcancer.fi`, `kaikkisyovasta.fi`, `www.suomi.fi`, `www.kaypahoito.fi`, `www.syopajarjestot.fi`, `www.stuk.fi`, `thl.fi`, `www.freefromcancer.fi` (the Cancer Society's English site: it is the host of `cs-hpv`, `cs-cervical` and `cs-moles`, and chat's table does not have it) |
| `europe` | `cancer-code-europe.iarc.who.int`, `www.esmo.org`, `digital-strategy.ec.europa.eu` |
| `international` | `www.cancer.gov`, `www.cancerresearchuk.org`, `www.nhs.uk`, `www.who.int` |
| none | every other host: `tier` is null |

`guideline` is true when the id is named by a fact, a guideline, a tip, `riskRubric.sourceIds` or `riskInFinland.sourceIds`. The content layer keeps its own table in `src/lib/content`: the hosts above, which `content` may take from `chat-evidence.ts` by exporting its table unchanged and adding `www.freefromcancer.fi` in the copy.

**Checks the content package adds** (to `referenceProblems` or a sibling, run by the seed and by `db:reindex`): every `ContentRiskType.id` is a `ContentTopic` id; every fact names a type and a factor that exist, and a state that is one of the factor's states; every source id of a fact, a guideline, a tip, the rubric and `riskInFinland` is a `ContentSource` id; every type has a guideline whose ids are cited by that type's facts; the domain ids are unique and each fallback has the same `kind` and the same number of options in both languages; there is exactly one `serious` flag row once the monitor seed has any flag (the empty skeleton has none); a text that has English and an empty Finnish is refused (a text with both empty is an unwritten skeleton and is tolerated until `integrate` turns the check on for everything). Also checked, and each tolerant of the empty skeleton: every fallback turn keeps to the limits of a model turn in both languages (title 10 to 160 characters; 2 to 7 options of 1 to 60 characters for `choice` and `multi`, none named like an answer marker; a `number` range with `min` below `max` inside 0 to 10000); for every body (female, male, neither, A.10) and for an age under and over 30, the domains that apply number at least `interviewLimits.min`, so an interview that runs from the bank alone can finish; the rules of `monitorRules` hold what the evaluation relies on (`steps` positive and increasing, `urgency.ladder` is `weeks`, `days`, `today`, `thresholds.strong` is at most `thresholds.veryStrong`, every key of `why` and every trend id of A.4 is there); the strings of a module have every key A.5 pins for it (the four `tier.*` and the copy keys of the risk module, `consent` of the interview module, the `out.*`, `sex.*`, `urgency.*` and copy keys of the monitor module), once that module has any string; and `loadRisk`, `loadInterview` and `loadMonitor` parse the meta values they read (`riskRubric`, `riskInFinland`, `interviewLimits`, `monitorRules`) with zod schemas written next to the others in `v2-schemas.ts`, so a hand edit that breaks one fails on the way in.

**Tests that change on purpose** when `/api/content` gains its sections (the content package owns them): the assertions that compare `body.content` or `loadContent().content` with the seed's `content` or its keys, in `tests/content.test.ts`, `tests/content-checks.ts` and `tests/content-db.test.ts` (the keys are now the 22 of the design plus `RISK`, `MONITOR`, `INTERVIEW`, and `SOURCES` has 18 more entries), and the count of listed sources. The 61 golden route responses, the catalog and the 47 chat replies must not change.

### A.9 Finnish, and retrieval dates

**Finnish.** Every text of the new content tables, and every `Bilingual` of the three modules, has an English and a Finnish text. The package that owns a module drafts the Finnish from the English: numbers, ids, source names and named organisations (`Käypä hoito`, `Duodecim`, `STUK`) are kept as they are, and the wording follows section 13. The draft is by hand or with a model, and is never English copied into the Finnish slot to fill a gap. The module says `finnish: "unreviewed"` until a native speaker has reviewed it, and `toRows` records that in `ContentMeta.finnishReview`. Each package says in its report which texts are drafts. The PWA's drafted-by-machine notice (`FI and SV text drafted by machine`) stays true. Swedish has no content and falls back to English.

**Retrieval dates.** Every `ContentSource` row of design v2 has `retrieved` equal to `ContentMeta.retrieved`, the day the design was exported (2026-11-14), not the day a person read the page: the 18 new sources and the 116 risk statements come from the design, which cites a page for each, and were not read again from the pages. `docs/content-database.md` (content package) says so, in the section that already says it for the other sources, and the PWA shows the retrieved date beside every source it shows. The fallback questions of the interview, the Finnish texts and the `triage` words are written for this product and not taken from a source; they are marked as such in the seed modules' header comments. AGENTS.md applies: unverified sampling steps are placeholders, and AI output stays grounded in the supplied facts.

### A.10 Pins that cross packages

**Interview to risk.** The risk job reads the account's `AiTurn` rows with `answeredAt` set, ordered by `position`, and tells the model `domain`, `title` and `answerLabel`; never an id, never `options`. The facts are `factsOf` of the basics, plus the interview. The weight: the risk statements tell `ob` (BMI 30 to 39.9) from `ob2` (40 or more), womb cancer about 5 against about 20 times, but `Derived["bmiBand"]` is `under`, `healthy`, `over` or `obese` and cannot say 40 or more. The `interview` package adds, in `src/lib/intake/report.ts` and `src/lib/assess/facts.ts`, an additive fact (for example `severeObesity: true` when BMI is 40 or more) without changing `bmiBand`, so existing expectations hold; until then the risk package tells the model that `obese` is `ob` and the statement for `ob2` cannot be matched. Only the band, never the height or the weight, is sent.

**Who a cancer type or a domain applies to.** `ContentRiskType.sex` and `ContentAssessmentDomain.appliesTo` are decided from the saved basics, with the bodies rule the intake already has (`femaleBody` and `maleBody` in `src/lib/intake/access.ts`): a female body is a sex answer `female`, or an `organs` answer naming breasts, uterus, cervix or ovaries; a male body is a sex answer `male`, or an `organs` answer naming prostate or testes. `any` always applies, `female` applies when `femaleBody(answers)`, `male` when `maleBody(answers)`, and a person can have both. `minAge` and `maxAge` use `ageOf(answers)`, the age in years from the date of birth. A cancer type that does not apply goes to `RiskResult.skipped`, and that is when the `skipped` copy of A.5 is shown. The profile's `sex` (`CareProfile`) is not used by the interview or the risk job: the model is told the basics through `factsOf`, so the engine, the job and the model read the same source and cannot disagree.

**The interview response.** `coverage[].name` is `InterviewDomain.name` in the interview's `language`, and `Interview.min` and `max` are `INTERVIEW.MIN` and `MAX` (`interviewLimits`).

**The risk result** (`RiskResult`, section 6.1), with these pins:
- `items[].cancer` is a `ContentRiskType` id and only types that apply to the person (the bodies rule above) are listed; `skipped` holds the ones left out. `items` are sorted by tier rank (the key order of `RISK.TIERS`, high first), then by position in `RISK.ORDER`; there is no score to break a tie.
- `overall.line` is the headline sentence: it names the overall level and what drives it, and is shown on the Home card and as the bold first line of the opened overall card. `overall.basis` is one or two sentences on how the level follows from the tags of the types, shown below it in small text. The counts line ("2 High · 1 Raised") is not stored: the PWA counts the tiers of `items`.
- `overall.drivers[].factor` is a `ContentRiskFactor` key and `overall.drivers[].cancers` are `ContentRiskType` ids, so the PWA names them in the language of the screen. The guard checks every key.
- `items[].findings[].sources` and `guidelines` are `ContentSource` ids; `items[].notCovered` is `ContentRiskType.notCovered` in the assessment's language, copied by the server.
- `contentVersion` is `RiskContent.version`. Every text the model writes is in `language`; every label and sentence of the screen comes from `D.RISK` or the PWA.
- The risk guard must let a quoted statement of a cited passage through, and must refuse medicine or treatment wording in what the model writes. The design's `smoke` tip says "with a plan and medicines": the seed keeps it verbatim because it is the design's, so the risk package treats tips as grounding for the model, not as text to show, and checks the `tips` the model writes.

**Close monitoring: the exact evaluation.** The server evaluates; the model has no part. Input: `{ trend, level, flags, serious }` and the monitor's `startedAt`, `level0`, check-ins, and `now`. `last` is the newest check-in, or `{ level: level0 }` when there is none (its `level` may be null). `days` is `(now - startedAt)` in days. Let `rules` be `monitorRules`. Here "check-ins" are those logged at or after `startedAt`: a watch that was stopped and begun again keeps its older check-ins as history only (see "the API", below).
1. `serious`: result `emergency`, `why` is `[rules.why.serious]`, urgency `rules.urgency.serious`.
2. `trend` is `gone`: result `gone`, no `why`, urgency `""`.
3. Otherwise collect reasons, and let `urgency` start at `rules.urgency.ladder[0]`. Each reason raises it to the named word if that is higher on the ladder. `trend` is `worse`: `why.worse`, raise to `urgency.raise.worse`. `level` is not null and at least `thresholds.strong`: `why.strong` with `{level}`, raise to `urgency.raise.veryStrong` when `level >= thresholds.veryStrong`, else to `urgency.raise.strong`. `level` and `last.level` are both not null and `level - last.level >= thresholds.rise`: `why.rise` with `{from}` `last.level` and `{to}` `level`, raise to `urgency.raise.rise`. `flags` is not empty: `why.newFlags` with `{flags}` the labels of the flags with their first letter in lower case, joined with `; `, raise to `urgency.raise.newFlags`.
4. With no reason so far: `days >= stillThereDays` gives `why.stillThere`; otherwise `trend` `same` and `days >= noBetterDays` gives `why.noBetter`. These do not raise the urgency.
5. With any reason: result `doctor`, urgency as raised. Otherwise result `watch`, `why` is `[rules.why.watchBetter]` when `trend` is `better` and `[rules.why.watchSame]` otherwise, urgency `rules.urgency.watch`.

After the evaluation, in one transaction: store the check-in (`result` is the level above). `gone`: the monitor becomes `resolved`, and the observation's `details.course` becomes `gone` (the design sets `still` to "No, it has gone"), which is what makes the existing next-action logic stop treating it as an open symptom. `doctor` or `emergency`: the monitor becomes `escalated`. `watch`: the next `dueAt` is the later of `at(startedAt + steps[min(k, steps.length - 1)] days)` and `at(now + minGapDays days)`, where `k` is the number of check-ins including this one. `at(instant)` is the local calendar date of the instant in `timeZone`, at `reminderHour`:00. `start` sets `dueAt` to `at(startedAt + steps[0] days)`; `snooze` sets it to `at(now + snoozeDays days)`. Reminders: one `recheck` reminder with `monitorId` per active monitor at `dueAt`, the observation's topic as its `topic` (null for none), replaced on every change and removed when the monitor leaves `active`; deleting the observation deletes the monitor and its reminder through the foreign keys. Setting an observation's course to `gone` by any route resolves its active monitor. The `why` strings are written in `language` when the body carries `en` or `fi`, else in the account's language (`ScreeningAccount.language`: `fi` is Finnish, anything else English). `GET /api/reminders` gives each reminder `monitor`: the observation id, or null. `GET /api/observations` gives each observation `monitor`: the item of `GET /api/monitors` (`{ id, observationId, status, startedAt, dueAt, level0, trend0, checkins }`), or null.

**Close monitoring: the API.** Section 7 names the actions; this pins what they answer. Like the reminders route, `/api/monitors` is built with `privateRoute` (`src/lib/private-route.ts`): no-store, the account from the session, and on `POST` the origin, a JSON body and its size checked. Every action of `POST /api/monitors` answers 200 with `{ monitor }`, the item of `GET /api/monitors`, and `checkin` answers `{ monitor, result: { level, why, urgency } }`. Failures use the app's codes: 400 `invalid` for a body that does not parse (an unknown action or trend, a level that is not a whole number from 0 to 10 or null, a flag that is not the id of a flag row of kind `flag`, `serious` that is not a boolean, a `language` that is not `en` or `fi`), 401 `expired`, 404 `not_found` when the observation is not the account's own symptom note, and 409 `ended` when the request needs an active watch (`checkin`, `snooze`, `stop`) or when `start` is refused (the note's watch is `resolved` or `escalated`, or the note's `details.course` is `gone`). `start` on a note whose watch is `active` returns it unchanged. `start` on a note whose watch was `stopped` begins it again on the same row: status `active`, `startedAt` now, `dueAt` as for a new watch, `level0` null (a symptom note has no strength today) and `trend0` from the note's course; its earlier check-ins stay as history. `GET /api/monitors` lists every watch of the account whatever its status, newest `startedAt` first, each with its `checkins` oldest first, and `config` as A.6 says; the `monitor` of an observation is the same item.

**Close monitoring: the symptom outcome.** `save_symptom` answers through the existing reply, so the outcome sits in the interaction: `interaction: { type: "symptom_saved", id, outcome: { level, urgency, why } }`. Both replies of `save_symptom` carry it: the first save, and a repeated save of a draft that was already saved (which finds the note and computes the outcome again). `level` is `emergency`, `doctor` or `watch`; `urgency` is always `weeks`, `days` or `today` (an emergency is `today`, a watch is `monitorRules.urgency.watch`); `why` is a list of strings in the `language` of the request, from `monitorRules.triage`. A `watch` outcome has started the watch, and the PWA reads it from the observations it reloads after saving, with one exception: a note saved with course `gone` has nothing to watch. The symptom chat does not ask its impact, so for `triage.watch` such a note counts as getting better with no impact; it can therefore be judged `watch`, but no watch is started for it (`start` refuses it, above) and the PWA shows `keep_eye` instead of `watching`. `save_symptom` never fails because a watch could not be started.

**The PWA's view of a watch, and the doctor PDF.** The design's scripts read `n.monitor` on a note, and `state/store.js` already turns observations into design-shaped notes, so it also turns the `monitor` of an observation into the design's shape: `{ id, status, start, due, level0, trend0, log }`, with `start` and `due` in milliseconds (`Date.parse` of `startedAt` and `dueAt`) and `log` the check-ins as `{ ts (milliseconds), trend, level, flags, result }`, oldest first; a note without a watch has no `monitor`. `S.monitors` stays the list as the API returns it. A reminder of a watch has `monitor`, the observation id, which is the note's `id`. `monitor.js`, `doctor.js` and their tests use these shapes. The doctor PDF reads the interview transcript itself: when its sheet opens it calls `A.api.interview.get()` and takes the answered turns that have a value, markers left out, as rows `[turn.title, turn.answer.label]`, so it does not depend on the interview screen's state. It has no basics rows beyond age, sex and region from the profile, because the survey API returns answer ids, not words (A.12). Its "care4all suggested" row shows `MONITOR.OUT` for the result of the note's last check-in when that result is `emergency`, `doctor` or `watch`, and is left out otherwise: an observation does not store the outcome it was saved with.

### A.11 Protocols

**Scratch databases.** A package works in `care4all_<package>` in the running PostgreSQL, through the helper, which never prints the password. The name takes lower-case letters, digits and `_` only (a hyphenated package name becomes `fe_risk`). `bash scripts/dev/with-scratch-db.sh <package> -- <command...>` creates the database if missing and runs the command with `DATABASE_URL` and `CONTENT_TEST_DATABASE_URL` set. Apply the migrations with `bash scripts/dev/with-scratch-db.sh <package> -- npx.cmd prisma migrate deploy`, seed with `… -- npx.cmd prisma db seed`, run the database tests with `… -- npx.cmd tsx --test tests/content-db.test.ts` (each run makes and drops its own schema inside the scratch database). `bash scripts/dev/with-scratch-db.sh <package> --drop` drops it: do that when you finish. Never use the `care4all` database, never run `docker compose`. The one-off proof of the migrations lives only in the architect's scratch space; to repeat it, apply the first seven migrations to an empty scratch database, insert a few rows, apply the two new ones, and compare.

**Schema amendments.** The schema is shared, so changing it is serialised. A package that truly lacks a column:
1. Take the lock: `mkdir scripts/dev/.prisma-lock`. It fails while someone holds it. Then wait and retry: in PowerShell `while (-not (New-Item -ItemType Directory scripts\dev\.prisma-lock -ErrorAction SilentlyContinue)) { Start-Sleep -Seconds 5 }`, or in Bash a loop that retries `mkdir` (the Bash tool blocks a foreground `sleep`, so run the loop in the background).
2. Edit `prisma/schema.prisma` and add an additive migration `prisma/migrations/20261116<NN>0000_<what>/migration.sql` with `NN` of your package (interview `02`, risk `03`, monitor `04`, content `05`, integrate `06`). Additive means new tables, new nullable columns or columns with a default, new indexes and constraints that existing rows satisfy; never drop, rename or rewrite. `npx.cmd prisma migrate diff --from-schema <the schema before> --to-schema prisma/schema.prisma --script` writes the SQL; add CHECK constraints for values the code switches on, as the existing migrations do.
3. Prove it on your scratch database: `migrate deploy` from empty, and the content database tests.
4. Run `npx.cmd prisma generate`. Nobody else runs it.
5. Release the lock at once: `rmdir scripts/dev/.prisma-lock`. Never leave it.
6. Announce it in your report: the column or table, why, and the migration name.

A new status, kind or any other value that a CHECK constraint of the two migrations guards is an amendment too: the constraint has to be widened in a migration of its own.

### A.12 Differences from sections 1 to 13, and what to watch

Differences:
1. Section 9 spells the meta key `riskInfinland`; this appendix and the task use `riskInFinland`, which matches `IN_FINLAND`.
2. Section 9 gives `RISK.TYPES[id]` as `{ sex, notCovered }`; it also has `name`. `MONITOR` gains `TREND_WORD`, `DOCTOR_TREND_WORD`, `FLAG_WORD`, `OUT`, `SEX` and `URGENCY`, and `INTERVIEW` gains `COPY`: the same-name rule for the doctor script's constants needs them.
3. `Tier` of section 6.1 is `RiskTier` in code, because `Tier` is already the source tier in `src/lib/chat-evidence.ts`. The source tier is `SourceTier`.
4. Columns that section 9 does not list: `ContentRiskType.nameEn/nameFi`, `ContentRiskFactor.states` and `.tipSourceIds`, `ContentMonitorFlag.kind`. `ContentSource.tier` and `.guideline` are in section 9's prose. The operational tables also have CHECK constraints on their value sets.
5. Section 7's request body has no language. The server writes `why` in the account's language unless the body says otherwise (A.10).
6. "Local hour 9" needs a zone on a server: `monitorRules.timeZone`, `Europe/Helsinki`.
7. `PassageQuery.kinds` is new, and its default excludes `risk` and `risk-tip`.
8. A passage is built for a tip only when the tip has sources, which is only `alcohol` and `meat` in the design.
9. The design decides which cancers apply from the profile's sex. Here it is the saved basics, by the intake's bodies rule (A.10), because the model is told the basics and the profile can disagree with them. The `skipped` copy changed with it (A.5).
10. `MONITOR.SEX` has a fourth key, `intersex`, because the profile can say it (A.5).
11. Two type names are not the plain rule: `Ovarian cancer` and `Pancreatic cancer` (A.2).
12. Section 8's background from the basics is limited to age, sex and region from the profile, plus the interview transcript: the survey API returns answer ids, not words, and a labelled summary would be a new endpoint (A.10).
13. One interview string, `consent`, is pinned (A.5), although section 9 pins none.

What to watch:
- The tree already had one failing test before this work, unrelated to it and unchanged by it: the in-memory retrieval gold test in `tests/content.test.ts` ("the passages a good answer needs are found for typical questions", recall at 8 is 0.833 against 0.85). Do not chase it; report it as it is.
- The `smoke` tip says "with a plan and medicines", and section 13 forbids medicine advice. See A.10.
- The statement "Most people with a Raised or High tag never get these cancers" in `how_6` is the design's own; it is population wording about the tags, not a number about a person. Keep it verbatim unless a reviewer changes it.
- Facts that decide a High tag (`large` and `very-large`, A.3) are the statements the risk guard checks a High tag against.
- The Vite dev stub (`frontend/vite.config.js`) serves only `design-content.json`, which has none of `RISK`, `MONITOR`, `INTERVIEW`. The frontend packages test with fixtures built from the examples of A.6, and `integrate` extends the stub.
- A symptom note has no strength (0 to 10) in this product: the symptom chat asks for onset, course and impact only. So `SymptomMonitor.level0` is null and the "rise of 2" rule can first act on the second check-in. Adding a strength question would change `src/lib/chat-journey.ts`, which is outside v2's packages.
- While a watch is active, the chat's next action (`actionFor` in `src/lib/chat-journey-store.ts`) still counts the note as an open symptom and suggests discussing it with a professional, as it does today; the design's own Next Action list holds a watched note back. Whether the chat should do the same is a product decision that is not made here.
- A reseed for any reason changes `ContentVersion.version`, and `RiskAssessment.stale` compares it, so every saved assessment turns stale after a content change, even one that does not touch the risk tables. That is what section 6.2 says; a version that hashes only the risk tables would be a change to A.8.

### A.13 Where each package looks

| Package | Needs |
| --- | --- |
| `content` | A.1 to A.9 and A.12: the extraction script, `toRows` refinements, assembly of the three read models and the three payload sections, risk passages, `ContentSource.tier` and `guideline`, the checks, the changed tests, `docs/content-database.md` |
| `interview` | A.2 (`AiInterview`, `AiTurn`), A.3 (`interview-content.ts`), A.4 (`interviewLimits`), A.5 (the `consent` string), A.8 (`InterviewContent`, the bank checks), A.10 (who a domain applies to, the transcript, the weight fact, the interview response), A.11 |
| `risk` | A.2 (`RiskAssessment`), A.3 (the statements and their effect classes), A.4 (`riskRubric`), A.8 (`RiskContent`, retrieval, source tiers), A.10 (who a type applies to, the result pins) |
| `monitor` | A.2 (`SymptomMonitor`, `MonitorCheckin`, `CareReminder.monitorId`), A.4 (`monitorRules`), A.5 (monitor copy and where it is shown), A.7, A.10 (the evaluation, the API, the symptom outcome) |
| `fe-risk` | A.5 (risk copy, the interview `consent`), A.6 (`RISK`, `INTERVIEW`, `A.contentRetrieved`), A.7, A.10 (who a type applies to, the interview response, the result pins) |
| `fe-monitor` | A.5 (monitor copy and where it is shown), A.6 (`MONITOR`), A.7, A.10 (`GET /api/monitors`, `GET /api/observations` and `GET /api/reminders` shapes, the API, the PWA's view of a watch, the doctor PDF) |
| `integrate` | A.6 (what `state/content.js` checks and keeps, the dev stub), A.10 (the PWA's view of a watch, which `state/store.js` builds), A.12 |

### A.14 What the contract review changed

A second reading of sections 1 to 13 and this appendix, against the design, the schema, the migrations, the skeleton and the code the packages build on, found the contract exact where it counts: the 116 statements and their effect classes, the 57 cited source ids and the 18 new sources (re-derived from the design with a second script), the tier table against `src/lib/chat-evidence.ts`, the monitor evaluation against `A.monitorAssess`, and the migrations, which apply to an empty database with no drift from the schema. It found gaps where two packages would have decided the same thing differently. Each is fixed above:

1. Who a cancer type or an interview domain applies to is pinned: the intake's bodies rule on the saved basics, not the profile (A.10). The `skipped` copy changed with it (A.5).
2. `RiskContent.sources` is every listed source with a tier, not only the 57 the tables name, so the sources of retrieved articles can be cited; `name.fi` falls back to the English name (A.8, `v2-types.ts`).
3. The interview's consent text is a pinned key, `consent`, so `fe-risk` and `interview` use the same one; the consent for a risk re-run is `how_2` (A.5).
4. The monitor API's answers, its error codes, what `start` does on a stopped watch, where `save_symptom` carries the outcome and what it does for a note whose course is `gone` are pinned (A.10).
5. `MONITOR.SEX` has `intersex` (A.5, A.6, `v2-types.ts`).
6. The triage word lists are independent per language, not translations item by item (`v2-types.ts`).
7. The PWA keeps the payload's `retrieved` as `A.contentRetrieved` (A.6); the PWA's view of a watch and the doctor PDF's sources are pinned (A.10).
8. The PWA never draws the served `FACTORS[key].tip`, because the `smoke` tip mentions medicines (A.6).
9. Two English type names (A.2, A.3), the places where each monitor string is shown (A.5), more checks for the content package (A.8), and the reference to `A.monitorAssess` in section 7.
10. A.13 has a row for `integrate`, and the other rows name the new pins.
