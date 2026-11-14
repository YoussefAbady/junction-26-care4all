# Frontend (care4all PWA)

The frontend is the "care4all" Claude Design artifact rebuilt as a progressive web app. It runs in its own container, `frontend`, and shows the whole design: onboarding, topics and articles, animated self-check guides, scans, results, the assistant, symptom notes, reminders and the profile. It is plain ES modules bundled by Vite. nginx serves the built files and forwards `/api/` to the backend container. The structure and conventions are in [`frontend/ARCHITECTURE.md`](../frontend/ARCHITECTURE.md).

## How it connects

```
browser  ->  frontend (nginx :8080)  ->  backend (Next.js :3000)  ->  db (PostgreSQL :5432)
                 static PWA files            /api/* handlers            accounts and records
```

- The browser only ever talks to the frontend origin. `/api/` is a same-origin proxy, so the HTTP-only `SameSite=Strict` session cookie works and there is no CORS.
- The backend accepts writes only when the `Origin` header is an address it expects. nginx passes the header through, so `APP_ORIGIN` is the address people open, `http://localhost:8080` by default. A localhost origin also stands for `127.0.0.1` and `[::1]` on the same port (they reach the same app), and `APP_ORIGIN` may list several origins separated by commas. A write from any other origin gets 403 with `{ "error": "origin", "expected": "<the address to open>" }`, and the app tells the person which address it was opened from and which to open instead. nginx logs the Origin of each request, so a 403 can be explained from `docker compose logs frontend`. `http://localhost:3000` is the backend's own leftover interface, whose forms are always refused.
- If the backend is down, nginx answers `/api/` with `503 {"error":"unavailable"}` and the app shows its "Can't reach care4all" screen with a Try again button. The app shell itself keeps working offline.
- The frontend has no database or model credentials. Gemini and Verda keys stay with the backend.

## What comes from where

| In the interface | Source |
| --- | --- |
| Sign-up, sign-in, profile, display preferences | `/api/account`, `/api/profile` |
| Next action and suggestions | `/api/chat/next-action` |
| Ask, Get to know you, Talk about symptoms | `/api/chat`: grounded answers, which an AI model can write from the reviewed passages (drawn under a "Written by AI" label with the sources it used), and the intake and symptom conversations, which the server leads without a model |
| AI review of the intake answers (optional) | `/api/assess`: after the person agrees on screen, the server reads the saved answers, removes everything that identifies them (name, username, exact date of birth, city, typed text) and has a model ask up to three more questions and write a short review of risk factors worth raising with a professional. See [`docs/ai-review.md`](ai-review.md) |
| Notes, self-check results, scan dates | `/api/observations` |
| Reminders and calendar files | `/api/reminders` |
| Source library search and official topic information | `/api/library`, `/api/cancers` |
| Problem reports, data export, account deletion | `/api/content-reports`, `/api/my-data` |
| Topics, articles, sources, symptom lists, self-check facts and step hints, scans and tests, national programmes, statistics, starter questions, counties, the interface string table | The database, through the public `GET /api/content`. The app loads it when it starts, and nothing of it is bundled |
| Illustrations, and interface text written in the code | Bundled with the app (`frontend/src/art`, `frontend/src/views`) |

The content is the same for everyone and holds no personal data. `GET /api/content` answers `{ version, retrieved, content }`, and the app fills its content object from `content` before it draws the first screen, in parallel with the account check. If the content cannot be loaded, the app shows "Can't reach care4all" and Try again loads it again. The shape is in [`docs/content-database.md`](content-database.md). The app checks that every part it reads is there and refuses anything else.

The design's own screening-age and county rules are not used. The app shows programme information and links to the official provider pages. Individual eligibility is decided by the invitation letter and the screening provider.

## PWA behaviour

- **Install.** The web manifest and icons make the app installable from Chrome, Edge, Android and iOS. The Profile screen shows install instructions where the browser has no install prompt.
- **Offline.** The service worker precaches the app shell, the static files and the fonts, so the app opens without a network. It also keeps the last `GET /api/content` response (stale while revalidate: the copy it has answers at once, and a fresh one is fetched for next time, so a content change shows from the visit after it is published). The start-up account check still needs the server, so with no connection the app opens to its "Can't reach care4all" screen whether or not the content is cached. Anything that needs the server, such as signing in, chat and saving notes, shows a message that it needs a connection.
- **The one cached API response.** `GET /api/content`, with any query, is stored in a cache of its own (`care4all-content-<version>`), which a new version of the app deletes when it activates, like the shell cache. It is public content with no personal data in it.
- **Never cached.** Every other `/api/` request, including a path that only starts like it (`/api/content-reports`), and every request that is not a GET goes to the network untouched. Account, profile, notes, reminders, chat, library, report and export responses are never written to a cache.
- **Updates.** A new version installs in the background and waits. The app tells the person and the Profile screen offers to restart onto it, so an update never interrupts a conversation.
- **Browser storage.** Only display preferences are stored in the browser: language, text size, plain language, motion, skin tone and whether the install banner was dismissed. Everything else is on the server or in memory. The unit tests and the browser journeys check this.
- **Logs.** nginx logs the path of each request without its query string, because library searches contain words people typed about their health. It never logs cookies or bodies.

## Develop

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev        # http://localhost:5173, /api proxied to http://localhost:3000
npm.cmd run lint
npm.cmd test           # API client, state, content loader and service worker tests
npm.cmd run build      # dist/ with the hashed service worker
npm.cmd run preview    # http://localhost:4173, to try install and offline behaviour
```

The dev proxy presents `APP_ORIGIN` (`http://localhost:8080` unless you set the `APP_ORIGIN` environment variable) the way nginx does. Start the backend first with `docker compose --env-file .env.docker up -d --wait db migrate backend`. The service worker is only registered in production builds.

The dev server answers `GET /api/content` itself, from `prisma/seed-data/design-content.json` as `{ version: "dev", retrieved, content }`, so the interface can be worked on before the backend serves the endpoint. That plugin (in `frontend/vite.config.js`) exists only in `npm run dev`: it is not in a build and not in `npm run preview`, where the proxy reaches the real endpoint. To use the backend's `/api/content` in development too, set `CONTENT_FROM` to `backend`:

```powershell
$env:CONTENT_FROM = 'backend'; npm.cmd run dev
```

## Browser journeys

```powershell
$env:FRONTEND_TEST_URL = 'http://localhost:8080'
npx.cmd playwright test tests/e2e/frontend.spec.ts
```

The journeys create fictional accounts and delete them afterwards.

## Updating the design

`frontend/design/care4all.artifact.html` is the Claude Design export the app was built from (artifact version `1794650590-980c`, retrieved 14 November 2026). To adopt a revised design, export the new HTML, compare it with this file using `git diff --no-index`, and apply the differences to the matching module. The modules mirror the design's script blocks one to one, which keeps those comparisons small.

The design's content (its `D` object) is no longer in the app. It was exported once to `prisma/seed-data/design-content.json`, which seeds the database, and the export script that wrote it (`frontend/scripts/export-content.mjs`) was removed along with the bundled content modules (`frontend/src/content`). Content corrections belong in the database, as described in [`docs/content-database.md`](content-database.md), and the app picks them up through `/api/content`.
