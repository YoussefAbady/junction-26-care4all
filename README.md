# Care4All

Care4All is a fictional cancer-care navigation PWA by Tech4Good. Use synthetic data only. The demo pathways are unvalidated and patient submissions have no clinical monitoring.

## Windows PowerShell

Use Node.js 24, Git, and npm. The database workflows also require Docker Desktop running the Linux engine and Docker Compose. Open [http://localhost:3000](http://localhost:3000) and choose Aino for onboarding, Mika for screening, or Leena for follow-up.

### Run without Docker

The file-backed store supports one local application process. Session files live in the ignored .care4all-data directory by default.

```powershell
Set-Location D:\projects\care4all
npm.cmd ci
Copy-Item .env.example .env
Add-Content .env 'DEMO_STORE=file'
npm.cmd run db:generate
npm.cmd run dev
```

### PostgreSQL in Docker and Next.js on the host

Use a fresh local setup or edit your existing env files in place. Remove DEMO_STORE=file from .env when switching to PostgreSQL. Set a local password in .env.docker and set the corresponding URL-encoded password in both connection URLs. Match POSTGRES_PORT to the port in the host URL.

```powershell
Set-Location D:\projects\care4all
npm.cmd ci
Copy-Item .env.example .env
Copy-Item .env.docker.example .env.docker
notepad.exe .env
notepad.exe .env.docker
docker compose --env-file .env.docker up -d --wait db
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:generate
npm.cmd run dev
```

### Full Docker Compose

Set the password and URL in .env.docker as above. The Docker URL uses hostname db and port 5432. Compose waits for PostgreSQL and runs release migrations before starting the app.

```powershell
Set-Location D:\projects\care4all
Copy-Item .env.docker.example .env.docker
notepad.exe .env.docker
docker compose --env-file .env.docker up -d --build --wait
Invoke-RestMethod http://localhost:3000/api/health
docker compose --env-file .env.docker ps -a
docker compose --env-file .env.docker stop
```

The final command stops containers and preserves the database volume. For another app port, change APP_PORT and APP_ORIGIN together. Use localhost in the browser for the default origin.

## Checks and scripts

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
$env:PLAYWRIGHT_BROWSERS_PATH='0'
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

- dev serves the local Next.js development app.
- build generates Prisma Client and builds the production app. Set CARE_STANDALONE=true for a standalone bundle. The Docker build sets it automatically.
- start serves the regular production build. For an HTTP-only local check, set COOKIE_SECURE=false. Service worker registration runs in production builds.
- lint runs ESLint. typecheck generates Prisma and Next.js types and runs TypeScript.
- test runs the deterministic domain and provider tests. test:e2e starts the production build on port 3199 and uses isolated file-backed demo sessions on desktop and mobile.
- db:generate generates Prisma Client. db:migrate applies committed migrations. db:seed upserts the synthetic fixture catalog without changing saved sessions.

## Enable Verda

In the Verda console enable a model, create an inference API key, and copy the exact enabled model ID. Set AI_PROVIDER=verda, VERDA_BASE_URL=https://inference.verda.com/v1, VERDA_API_KEY, and VERDA_MODEL in your ignored .env or .env.docker and restart the app. Keep the key in your local configuration or runtime secret store. The default mock runs without a key. Live requests send selected fictional facts to Verda when you explicitly ask for an explanation or summary. [Verda configuration](https://docs.verda.com/inference/quickstart/)

[Product](docs/product.md) · [Architecture](docs/architecture.md) · [Progress](docs/progress.md) · [Deployment](docs/deployment.md)
