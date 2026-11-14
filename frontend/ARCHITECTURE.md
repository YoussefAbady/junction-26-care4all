# care4all PWA architecture

The care4all PWA is the "care4all" Claude Design artifact rebuilt as a real application. It is plain ES modules bundled by Vite, served by nginx in its own container, and it talks to the backend container only through same-origin `/api/` calls. `design/care4all.artifact.html` is the design it was built from, kept as a reference for comparison.

## Layout

```
frontend/
  index.html            app shell markup, manifest and icon links
  vite.config.js        build, dev proxy, the dev-only /api/content stub, and the plugin that emits sw.js with a hashed precache list
  nginx/                nginx config template and security headers
  public/               manifest.webmanifest and icons (copied as-is, precached)
  design/               the source design, reference only, never shipped
  src/
    main.js             entry point. Import order matters (see below)
    app.js              the registry A that modules attach to, and A.D, the content, which starts empty
    state/              S (shared state), svc (services), the content loader, text helpers. The only place backend data is normalised
    api/                fetch client and one function per backend endpoint
    core.js             helpers, icons, reminder time maths
    art/                animated SVG illustrations and self-check guides
    coach.js sessions.js  conversation modules
    views/              one module per area of the interface
    ui.js               the shell: navigation stack, tab bar, sheets, actions, events
    pwa.js sw.js        service worker registration, update flow, and the worker itself
    styles/             app.css is the design's stylesheet. account/content/chat.css hold additions
```

## The registry

The modules mirror the design's, so a revised design can be compared function by function. They attach to the shared object `A` (`src/app.js`):

- `A.views[name](arg)` returns a screen: `{ title, large?, pre?, trailing?, html, after?, hero?, navAt?, progress?, onShow? }`. The shell wraps it in a native-style screen with a navigation bar.
- `A.actions[name](el)` handles clicks on `data-action="name"`. `A.forms[name](form, event)` handles `data-form` submits. `A.changes[name]` and `A.inputs[name]` handle change and input events inside a form.
- A later assignment to `A.views[name]` replaces an earlier one. `ui.js` is imported last and merges `A.actions` into its table, so a module can override a built-in action.
- Routes are URL fragments: `#home`, `#t-breast`, `#a-breast-screening`, `#chk-skin`. `A.go(name)`, `A.back()`, `A.refresh()` navigate and redraw.
- Views are strings of HTML. **Every dynamic value goes through `A.esc()`**, including anything that came from the backend.

## Content

The educational content is public and lives in the database. Topics, articles with their plain-language versions, sources, statistics, scans and tests, national programmes, journeys, self-check facts and step hints, starter questions, counties and the interface string table (`D.I18N`, `D.COPY`) are all served by `GET /api/content` as `{ version, retrieved, content }`. Nothing of it is bundled with the app. The contract is `docs/content-database.md`.

- **`A.D` starts empty.** `state/content.js` fetches the payload and fills `A.D` in place with `Object.assign`, so every module's `var D = A.D` sees it. It first checks the payload: every key the interface reads must be there with the right kind of value (`TOPICS`, `ARTICLES`, `SOURCES`, `TOPIC_ORDER`, `I18N`, `COPY` and the rest), and a payload that is not that is rejected. `FAQ`, `VACC` and `TRIAGE` come in the payload too, for the backend's answers, but nothing here reads them. `A.contentVersion` holds the version.
- **Start-up loads the content and checks the account at the same time.** `svc.boot()` finishes when both are done, so the first screen is never drawn without content. Each request has one automatic retry. When the content cannot be loaded, `S.bootError` is set and the "No connection" screen shows. Its Try again button runs `boot()` again, which loads both again. Whatever goes wrong with the content is reported as `unavailable`, `offline` or `limited`, never as an account problem.
- **Read content when it is used, never when a module loads.** `D.TOPICS[id]` inside a function is fine. `var NAT = D.NAT` at the top of a module is not, because `D` is empty until start-up has loaded it. Do not change `D` either: it is the server's copy. The interface's own text, written as `A.tr(en, fi, sv)`, stays in code.
- **Development.** `npm run dev` answers `GET /api/content` from `prisma/seed-data/design-content.json` (a dev-only plugin in `vite.config.js`, version `dev`, never part of a build), so the interface can be built before the backend serves the endpoint. Set `CONTENT_FROM=backend` to switch the plugin off and use the backend's endpoint through the `/api` proxy.
- **Tests** give the loader and the state a small fictional content fixture (`tests/unit/content-fixture.js`) and serve it from a fake `/api/content`.

## State and services

`A.S` is the one state object, `A.svc` changes it, `A.api` is the raw endpoint layer. Read S in views. Change data only through `A.svc`, which calls the backend and then refreshes S.

| S field | Meaning |
| --- | --- |
| `account` | `{ username, language }` when signed in, else null |
| `profile` | `{ name, yob, sex, county }` or null |
| `prefs` | `{ lang, scale, plain, motion, skin }`. `skin` stays on this device. The rest are saved on the account |
| `reminders` | `{ id, kind, topic, due (ms), dueAt (ISO), status: "active"\|"done", created, channels, notified }` |
| `notes`, `checklog`, `checks`, `scans` | symptom notes, self-check results, latest result per topic, scan dates. All derived from observations |
| `next` | `{ nextAction, priority, suggestedTopics }` from `/api/chat/next-action` |
| `ready` | `svc.boot()` has finished: the content is loaded and the account checked, or `S.bootError` (an error code) says what failed |

`svc.boot()`, `register/login/logout/deleteAccount`, `saveProfile`, `savePrefs`, `addReminder/setReminderDone/removeReminder`, `addObservation/removeObservation`, `loadNext` are in `src/state/store.js`. `svc.loadContent()` is the content loader from `src/state/content.js`, which `boot()` runs. Failures reject with `ApiError` (`error.code`: `credentials`, `taken`, `invalid`, `expired`, `limited`, `conflict`, `offline`, `unavailable`, `not_found`). `A.fail(error)` shows one as a toast and `A.errorText(error)` returns the sentence. `A.tr(en, fi, sv)` picks text for the current language.

Design topic ids are `breast cervical bowel skin prostate testicular` plus ten more. The backend knows only six and calls bowel `colorectal`: use `A.apiTopic(id)` (undefined when the backend has no such topic) and `A.designTopic(id)`.

## Backend facts that shape the UI

- Writes are accepted only when the `Origin` header is one the backend expects: its `APP_ORIGIN`, which is the PWA's own origin (a localhost origin also covers `127.0.0.1` and `[::1]` on the same port, and the variable may list several origins). nginx and the Vite dev proxy pass the header through. Never call the backend from another origin. A refused write is a 403 `{ error: "origin", expected }`: `ApiError.code` is `"origin"`, `ApiError.expected` is the address to open, and `errorText` names both addresses instead of the generic "check the information" message.
- Passwords are at least 10 characters. Usernames are 3 to 30 characters of `a-z 0-9 _ -`.
- An expired session returns 401 `expired`: send the person to sign in again.
- Observations accept `details` with `topic`, `symptoms[]` (max 12, 150 characters each), `onset`, `course`, `impact`, `persistence`, `scanId`, `selfCheck`. Nothing else.
- `/api/chat` returns grounded answers with sources, or one step of the intake or symptom conversation (`docs/chat.md`, `docs/chat-journeys.md`). Only English and Finnish are produced. Swedish falls back to English.
- `/api/assess` (`views/assess.js`, opened from the end of Get to know you) is the optional AI review of the saved intake answers: `POST { consent: true, language, step: "next" | "review", history }` returns the next multiple-choice question, `{ kind: "done" }`, a written `review` or `{ kind: "unavailable" }`. The screen asks the person first, sends only the AI's own questions with the option picked, and keeps the transcript in memory. The server reads the saved answers and strips everything that identifies the person, so keep the consent text, the privacy notice and `docs/ai-review.md` true together.
- A general answer can carry `generated: { text, citations, provider, model }`: text an AI model wrote from the passages the server found. `views/ask.js` draws it under a "Written by AI" label, with the source links in view and the passages it used behind "What this answer is based on". Without `generated` the passages are drawn as they are. The model is sent only the typed question and public passages, and the Ask intro (`intro()` in `views/ask.js`), the privacy notice (`INFO.privacy` in `ui.js`) and the privacy cards (`V.privacy` in `views/account.js`) say so in plain words and name Google Gemini. Keep them true: if `CHAT_PROVIDER` is switched to another provider, or what is sent changes, change those three places in the same commit.
- The catalog (`/api/cancers`, `/api/library`) is educational content. Show its notice and source links.

## Privacy rules (from the project's AGENTS.md)

- **No health data in browser storage.** Only display preferences are stored locally, by `state/store.js`. Do not use `localStorage`, `sessionStorage` or IndexedDB for anything else, and use the Cache API only as the service worker does. Profile, notes, reminders, answers, chat text and self-check results live on the server or in memory.
- **No health data in URLs or logs.** Routes may name a topic. Free text the person typed is never put in a route. Do not `console.log` personal data.
- **The service worker caches exactly one API response: `GET /api/content`.** That is the public content, the same for everyone, with no personal data in it, kept with stale while revalidate in a cache of its own (`care4all-content-<version>`, deleted when a new version activates). Every other `/api/` request, a path that only starts like it such as `/api/content-reports`, and every request that is not a GET goes straight to the network, untouched. The rest of what it caches is the public shell and static files. `src/sw.js` is the whole policy and `tests/unit/sw.test.js` proves it.
- The product is a fictional demo. Say so where people enter information, and never imply a diagnosis.

## Build, run, test

```powershell
npm.cmd ci          # once
npm.cmd run dev     # http://localhost:5173, /api proxied to http://localhost:3000, /api/content from the seed file
npm.cmd run lint
npm.cmd test        # API client, state, content loader and service worker tests
npm.cmd run build   # dist/, including sw.js
```

To use the backend's own `/api/content` while developing, start the dev server with `$env:CONTENT_FROM = 'backend'` set.

The full stack is `docker compose --env-file .env.docker up -d --build --wait` from the repository root. The PWA is at http://localhost:8080. nginx logs omit query strings because library searches contain words people typed about their health.
