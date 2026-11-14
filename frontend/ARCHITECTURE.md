# care4all PWA architecture

The care4all PWA is the "care4all" Claude Design artifact rebuilt as a real application. It is plain ES modules bundled by Vite, served by nginx in its own container, and it talks to the backend container only through same-origin `/api/` calls. `design/care4all.artifact.html` is the design it was built from, kept as a reference for comparison.

## Layout

```
frontend/
  index.html            app shell markup, manifest and icon links
  vite.config.js        build, dev proxy, and the plugin that emits sw.js with a hashed precache list
  nginx/                nginx config template and security headers
  public/               manifest.webmanifest and icons (copied as-is, precached)
  design/               the source design, reference only, never shipped
  src/
    main.js             entry point. Import order matters (see below)
    app.js              the registry A that modules attach to
    state/              S (shared state), svc (services), text helpers. The only place backend data is normalised
    api/                fetch client and one function per backend endpoint
    core.js             helpers, icons, reminder time maths
    content/            static public content: topics, articles, sources, research. No personal data
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
| `ready` | `svc.boot()` has finished |

`svc.boot()`, `register/login/logout/deleteAccount`, `saveProfile`, `savePrefs`, `addReminder/setReminderDone/removeReminder`, `addObservation/removeObservation`, `loadNext` are in `src/state/store.js`. Failures reject with `ApiError` (`error.code`: `credentials`, `taken`, `invalid`, `expired`, `limited`, `conflict`, `offline`, `unavailable`, `not_found`). `A.fail(error)` shows one as a toast and `A.errorText(error)` returns the sentence. `A.tr(en, fi, sv)` picks text for the current language.

Design topic ids are `breast cervical bowel skin prostate testicular` plus ten more. The backend knows only six and calls bowel `colorectal`: use `A.apiTopic(id)` (undefined when the backend has no such topic) and `A.designTopic(id)`.

## Backend facts that shape the UI

- Writes are accepted only when the `Origin` header equals the backend's `APP_ORIGIN`, which is the PWA's own origin. nginx and the Vite dev proxy pass it through. Never call the backend from another origin.
- Passwords are at least 10 characters. Usernames are 3 to 30 characters of `a-z 0-9 _ -`.
- An expired session returns 401 `expired`: send the person to sign in again.
- Observations accept `details` with `topic`, `symptoms[]` (max 12, 150 characters each), `onset`, `course`, `impact`, `persistence`, `scanId`, `selfCheck`. Nothing else.
- `/api/chat` returns grounded answers with sources, or one step of the intake or symptom conversation (`docs/chat.md`, `docs/chat-journeys.md`). Only English and Finnish are produced. Swedish falls back to English.
- The catalog (`/api/cancers`, `/api/library`) is educational content. Show its notice and source links.

## Privacy rules (from the project's AGENTS.md)

- **No health data in browser storage.** Only display preferences are stored locally, by `state/store.js`. Do not use `localStorage`, `sessionStorage`, IndexedDB or the Cache API for anything else. Profile, notes, reminders, answers, chat text and self-check results live on the server or in memory.
- **No health data in URLs or logs.** Routes may name a topic. Free text the person typed is never put in a route. Do not `console.log` personal data.
- **The service worker never caches `/api/`.** It caches only the public shell and static files.
- The product is a fictional demo. Say so where people enter information, and never imply a diagnosis.

## Build, run, test

```powershell
npm.cmd ci          # once
npm.cmd run dev     # http://localhost:5173, /api proxied to http://localhost:3000
npm.cmd run lint
npm.cmd run build   # dist/, including sw.js
```

The full stack is `docker compose --env-file .env.docker up -d --build --wait` from the repository root. The PWA is at http://localhost:8080. nginx logs omit query strings because library searches contain words people typed about their health.
