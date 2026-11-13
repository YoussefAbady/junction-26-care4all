# Progress

The local demonstration includes onboarding, a dashboard, symptom edits, FIT tracking, sample document review, a printable GP brief, follow-up and PWA installation support. The file-backed store enables local work when PostgreSQL is unavailable. Docker and PostgreSQL migrations require a running Docker Desktop Linux engine for integration verification. Verda requires account credentials and an enabled model for a live request.

A patient pilot requires production identity and access controls, clinical validation and ownership of pathway revisions, privacy and retention review, provider agreements, a medical-device assessment as applicable, real-world accessibility testing, and operational security and support. Replace FIT placeholders with identified kit instructions verified for the intended setting. Language preference is collected and localisation remains future work.


## Verification
The Windows production build, ESLint, TypeScript, Prisma schema validation, five domain tests, and eight Playwright desktop and mobile Chromium journeys passed. The browser checks used the file-backed store. Compose configuration validated, and startup could not connect to the Docker Desktop Linux engine. Live Verda was not exercised. Provider failure and output validation were tested with simulated responses.
