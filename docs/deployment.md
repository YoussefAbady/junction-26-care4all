# Deploy to a container host with Aiven PostgreSQL

Build the runtime and migration targets from the same revision, then test both with Compose before using the images on a host. Pin approved image digests and record the deployed image and migration revision.

```powershell
docker build --target runtime -t care4all:release .
docker build --target migration -t care4all-migrate:release .
```

1. Provision Aiven PostgreSQL with private connectivity or an IP allowlist. Obtain the project CA and mount it read-only for the migration job and app. Use the Aiven hostname in the connection string with sslmode=verify-full and sslrootcert pointing to the mounted CA. URL-encode credentials and the CA path as needed. Test connection and hostname validation from both images. [Aiven PostgreSQL connection guide](https://aiven.io/docs/products/postgresql/howto/list-code-samples)
2. Store DATABASE_URL in the host secret manager. Give the release job a migration role and the app a role with the required runtime privileges. Set APP_ORIGIN to the exact HTTPS origin, COOKIE_SECURE=true and AI_PROVIDER=mock by default. If enabling Verda, supply the endpoint, key and model through runtime configuration. Avoid build arguments for credentials.
3. Run the migration image once as a release job and gate rollout on success. Take a backup before schema changes and use backward-compatible migrations during rolling deployments.
4. Configure DNS, terminate HTTPS at the container host or trusted proxy, redirect HTTP to HTTPS and forward traffic to port 3000. Use /api/health as a readiness check and verify demo creation and deletion through the public origin before accepting traffic.
5. Set backup retention and rehearse restoration to a separate database. To roll back, redeploy the previous image digest if compatible with the migrated schema. For incompatible changes, use an approved forward repair or restore plan and account for records written since the backup.
6. Before adding uploads, design private encrypted storage with access-controlled short-lived URLs, scanning, deletion and audit procedures, jurisdiction and residency controls, and restricted access to derived extracts.
