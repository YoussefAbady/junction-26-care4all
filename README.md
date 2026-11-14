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
| `migrate` | Applies database migrations once, then exits | none |

Open [the app](http://localhost:8080). Browsers only talk to the frontend container, so the HTTP-only session cookie works without CORS. `APP_ORIGIN` must be exactly the address people open (`http://localhost:8080` by default) because the backend rejects writes from any other origin. To use another port, change `FRONTEND_PORT` and `APP_ORIGIN` together. `docker compose --env-file .env.docker down` removes the containers and keeps the database volume. See [frontend](docs/frontend.md) for the PWA, its development workflow and its privacy rules.

For host development, configure .env from .env.example with the matching localhost database URL, then run:

```powershell
docker compose --env-file .env.docker up -d --wait db
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run db:generate
npm.cmd run dev
```

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
```

Playwright uses the running local stack and creates fictional test accounts. Set `CARE_TEST_URL` or `FRONTEND_TEST_URL` to target a different backend or frontend instance. See [deployment](docs/deployment.md) for container hosting.
