# Deploy to a container host with Aiven PostgreSQL

Build the backend runtime, the migration job and the PWA from the same revision, then test all three with Compose before using the images on a host. Pin approved image digests and record the deployed image and migration revision.

```powershell
docker build --target runtime -t care4all:release .
docker build --target migration -t care4all-migrate:release .
docker build -t care4all-frontend:release ./frontend
```

The PWA image is unprivileged nginx. It listens on 8080 and reads `BACKEND_URL` (default `http://backend:3000`) when it starts. Run it next to the backend on a private network and publish only the PWA.

1. Provision Aiven PostgreSQL with private connectivity or an IP allowlist. Obtain the project CA and mount it read-only for the migration job and app. Use the Aiven hostname in the connection string with sslmode=verify-full and sslrootcert pointing to the mounted CA. URL-encode credentials and the CA path as needed. Test connection and hostname validation from both images. [Aiven PostgreSQL connection guide](https://aiven.io/docs/products/postgresql/howto/list-code-samples)
2. Store DATABASE_URL in the host secret manager. Give the release job a migration role and the app a role with the required runtime privileges. Set APP_ORIGIN to the exact HTTPS origin, COOKIE_SECURE=true and AI_PROVIDER=mock by default. If enabling Verda, supply the endpoint, key and model through runtime configuration. Avoid build arguments for credentials.
3. Run the migration image once as a release job and gate rollout on success. Take a backup before schema changes and use backward-compatible migrations during rolling deployments.
4. Configure DNS, terminate HTTPS at the container host or trusted proxy, redirect HTTP to HTTPS and forward traffic to the PWA container on port 8080. The PWA's origin is the public origin, so it is the value of APP_ORIGIN. Do not publish the backend on the internet. Use /api/health through the PWA as a readiness check, confirm that a write with a foreign Origin header gets 403, and verify demo creation and deletion through the public origin before accepting traffic. If the proxy writes its own access log, leave query strings out of it, because library searches contain words people typed about their health.
5. Set backup retention and rehearse restoration to a separate database. To roll back, redeploy the previous image digest if compatible with the migrated schema. For incompatible changes, use an approved forward repair or restore plan and account for records written since the backup.
6. Before adding uploads, design private encrypted storage with access-controlled short-lived URLs, scanning, deletion and audit procedures, jurisdiction and residency controls, and restricted access to derived extracts.
