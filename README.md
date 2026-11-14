# Care4ll by AstraZeneca

A cancer-care navigation prototype with a cancer library, sourced chat, guided health intake, symptom notes and reminders. Use a fictional username, a unique demo password and synthetic answers.

## Run on Windows with Docker Desktop

Start Docker Desktop with Linux containers, then use PowerShell:

```powershell
Set-Location D:\projects\care4all
# For a new installation only
Copy-Item .env.docker.example .env.docker
notepad.exe .env.docker
.\scripts\deploy-local.ps1
```

The script builds the images, starts the stack and checks every hop. The equivalent manual command is `docker compose --env-file .env.docker up -d --build --wait`. Set a local database password in `POSTGRES_PASSWORD` and the corresponding URL-encoded value in `DOCKER_DATABASE_URL`. Keep the existing password when reusing a database volume.

| Container | Role | Address |
| --- | --- | --- |
| `frontend` | The care4all PWA: a Vite build served by nginx, which also forwards `/api/` to the backend | http://localhost:8080 |
| `backend` | The Next.js backend API | http://localhost:3000, for health checks and direct API calls |
| `db` | PostgreSQL 17 with the `care4all-postgres` volume | localhost:5432 |
| `migrate` | Applies database migrations and loads the educational content once, then exits | none |

Open [the app](http://localhost:8080). Browsers only talk to the frontend container, so the HTTP-only session cookie works without CORS. `APP_ORIGIN` must be the address people open (`http://localhost:8080` by default) because the backend rejects writes from any other origin: sign-up, sign-in and every save fail with a 403 from another address, and the app then says which address to open. A localhost address also accepts `127.0.0.1` and `[::1]` on the same port, and `APP_ORIGIN` may list several origins separated by commas. To use another port, change `FRONTEND_PORT` and `APP_ORIGIN` together. `docker compose --env-file .env.docker down` removes the containers and keeps the database volume. See [frontend](docs/frontend.md) for the PWA, its development workflow and its privacy rules.

The assistant answers from the reviewed passages in the database. With `CHAT_PROVIDER=catalog` (the default) it shows those passages as they are and calls no model. Set `CHAT_PROVIDER=gemini` with `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env.docker`, or `verda` with `VERDA_BASE_URL`, `VERDA_API_KEY` and `VERDA_MODEL`, and an AI model writes each general answer from the passages found for the question. Anything that goes wrong falls back to the passages. The model is sent only the typed question, the language and public passages, never account or health records, and the interface says so. After deploying, `.\scripts\smoke-ai.ps1` checks the whole path against the running stack with a throwaway fictional account. See [chat and AI setup](docs/chat.md).

For host development, configure .env from .env.example with the matching localhost database URL, then run:

```powershell
docker compose --env-file .env.docker up -d --wait db
npm.cmd ci
npm.cmd run db:release
npm.cmd run db:generate
npm.cmd run dev
```

`db:release` applies the migrations and loads the educational content, which the backend serves from the database (see [content in the database](docs/content-database.md)). Run it again after pulling changes: it leaves the content alone unless the seed changed.

For frontend development without rebuilding the image, keep the backend running and use the Vite dev server, which proxies `/api` to it:

```powershell
Set-Location D:\projects\care4all\frontend
npm.cmd ci
npm.cmd run dev
```

## Checks

```powershell
# Backend
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
# Frontend (PWA)
Set-Location frontend
npm.cmd run lint
npm.cmd test
npm.cmd run build
Set-Location ..
# Browser journeys against the running stack
$env:PLAYWRIGHT_BROWSERS_PATH='0'
npx.cmd playwright install chromium
npm.cmd run test:e2e
# The assistant against the running stack (needs CHAT_PROVIDER set to gemini or verda)
.\scripts\smoke-ai.ps1
```

`npm.cmd test` needs no database. Set `CONTENT_TEST_DATABASE_URL` to a scratch database (never the one the app uses) to run the PostgreSQL content tests as well. Playwright uses the running local stack and creates fictional test accounts. Set `CARE_TEST_URL` or `FRONTEND_TEST_URL` to target a different backend or frontend instance. See [deployment](docs/deployment.md) for container hosting.
