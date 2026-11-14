# Frontend (care4all PWA)

The frontend is the "care4all" Claude Design artifact rebuilt as a progressive web app. It runs in its own container, `frontend`, and shows the whole design: onboarding, topics and articles, animated self-check guides, scans, results, the assistant, symptom notes, reminders and the profile. It is plain ES modules bundled by Vite. nginx serves the built files and forwards `/api/` to the backend container. The structure and conventions are in [`frontend/ARCHITECTURE.md`](../frontend/ARCHITECTURE.md).

## How it connects

```
browser  ->  frontend (nginx :8080)  ->  backend (Next.js :3000)  ->  db (PostgreSQL :5432)
                 static PWA files            /api/* handlers            accounts and records
```

- The browser only ever talks to the frontend origin. `/api/` is a same-origin proxy, so the HTTP-only `SameSite=Strict` session cookie works and there is no CORS.
- The backend accepts writes only when the `Origin` header equals `APP_ORIGIN`. nginx passes the header through, so `APP_ORIGIN` is the address people open, `http://localhost:8080` by default. A write from any other origin gets 403.
- If the backend is down, nginx answers `/api/` with `503 {"error":"unavailable"}` and the app shows a friendly message. The app shell itself keeps working offline.
- The frontend has no database or model credentials. Gemini and Verda keys stay with the backend.

## What comes from where

| In the interface | Source |
| --- | --- |
| Sign-up, sign-in, profile, display preferences | `/api/account`, `/api/profile` |
| Next action and suggestions | `/api/chat/next-action` |
| Ask, Get to know you, Talk about symptoms | `/api/chat` (grounded answers and the intake and symptom conversations) |
| Notes, self-check results, scan dates | `/api/observations` |
| Reminders and calendar files | `/api/reminders` |
| Source library search and official topic information | `/api/library`, `/api/cancers` |
| Problem reports, data export, account deletion | `/api/content-reports`, `/api/my-data` |
| Articles, topics, symptoms lists, self-check guides, illustrations | Static public content bundled with the app (`frontend/src/content`, `frontend/src/art`) |

The design's own screening-age and county rules are not used. The app shows programme information and links to the official provider pages. Individual eligibility is decided by the invitation letter and the screening provider.

## PWA behaviour

- **Install.** The web manifest and icons make the app installable from Chrome, Edge, Android and iOS. The Profile screen shows install instructions where the browser has no install prompt.
- **Offline.** The service worker precaches the app shell, the static content and the fonts, so the app opens without a network. Anything that needs the server, such as signing in, chat and saving notes, shows a message that it needs a connection.
- **Never cached.** The service worker does not touch `/api/`. Account, profile, notes, reminders, chat and library responses are never written to a cache.
- **Updates.** A new version installs in the background and waits. The app tells the person and the Profile screen offers to restart onto it, so an update never interrupts a conversation.
- **Browser storage.** Only display preferences are stored in the browser: language, text size, plain language, motion, skin tone and whether the install banner was dismissed. Everything else is on the server or in memory. The unit tests and the browser journeys check this.
- **Logs.** nginx logs the path of each request without its query string, because library searches contain words people typed about their health. It never logs cookies or bodies.

## Develop

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev        # http://localhost:5173, /api proxied to http://localhost:3000
npm.cmd run lint
npm.cmd test           # API client and state tests
npm.cmd run build      # dist/ with the hashed service worker
npm.cmd run preview    # http://localhost:4173, to try install and offline behaviour
```

The dev proxy presents `APP_ORIGIN` (`http://localhost:8080` unless you set the `APP_ORIGIN` environment variable) the way nginx does. Start the backend first with `docker compose --env-file .env.docker up -d --wait db migrate backend`. The service worker is only registered in production builds.

## Browser journeys

```powershell
$env:FRONTEND_TEST_URL = 'http://localhost:8080'
npx.cmd playwright test tests/e2e/frontend.spec.ts
```

The journeys create fictional accounts and delete them afterwards.

## Updating the design

`frontend/design/care4all.artifact.html` is the Claude Design export the app was built from (artifact version `1794650590-980c`, retrieved 14 November 2026). To adopt a revised design, export the new HTML, compare it with this file using `git diff --no-index`, and apply the differences to the matching module. The modules mirror the design's script blocks one to one, which keeps those comparisons small. Content corrections belong in `frontend/src/content`.
