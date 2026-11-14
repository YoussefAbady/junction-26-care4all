# Backend integration

Use same-origin requests to the Care4ll app. In development, proxy API calls through the app origin or serve the frontend there. Mutation requests must come from the configured APP_ORIGIN (one origin, or several separated by commas; a localhost origin also covers 127.0.0.1 and [::1] on the same port). Any other write answers 403 with `{ "error": "origin", "expected": "<the address to use>" }`. Browser requests carry the HTTP-only session cookie. Use fictional data.

| Method and path | Request and response |
| --- | --- |
| POST /api/account?view=identity | Send {action: "register" or "login", username, password, language: "en" or "fi"}. Returns {account: {username, language}} with 201 for registration or 200 for login. |
| GET /api/account?view=identity | Returns {account: {username, language}} or {account: null}. |
| DELETE /api/account | Signs out and returns {account: null}. |
| GET /api/survey | Returns {progress} for the signed-in account. A new account receives an empty draft and does not create a database row. |
| PUT /api/survey | Send {progress} with the latest revision. Returns {progress} with the incremented revision. |
| GET /api/cancers?lang=fi | Public catalog. Accepts en (default) and fi. Optional slug selects one card, such as colorectal. |
| GET /api/content | Public. The PWA's educational content: returns {version, retrieved, content}. content has the keys and values of prisma/seed-data/design-content.json (22 keys, such as TOPICS, ARTICLES, SOURCES and I18N), so the PWA can use it as its D object unchanged. A regular expression travels as {$regexp, flags}. Sends ETag: "<version>" and Cache-Control: public, max-age=300, stale-while-revalidate=86400. A matching If-None-Match gets 304 with no body. 503 {error: "unavailable"} when the content cannot be read. |
| GET /api/health | Returns {status: "ok", version, content, ai: {provider, model, configured}} with 200, or {status: "unavailable", version} with 503 when the database is down or no content was seeded. content is the content version, the same value as version in /api/content. provider is catalog, gemini or verda, model is the model's name or null, and configured says whether that provider has what it needs. No key is ever returned. |

## Survey integration

Progress v2 has v, answers, cursor, complete, confirmed, acks, language and revision. Keep answer and question IDs from the shared intake engine in src/lib/intake. Its conditional question and option definitions drive the existing client. The server validates answer types and requires all applicable required answers and confirmation to finish. Use the revision returned by each save for the next request. An expired session returns 401, invalid answers return 400, and concurrent edits return 409. After a conflict, fetch the saved revision before deciding how to reconcile the draft.

The default /api/account response and action: "save" remain available for the existing frontend during the handoff. New clients should use the identity view and the survey endpoint.

The database migration copies saved survey drafts and their revisions into ScreeningSurvey, keyed to the account. Earlier fixed-choice answers are imported where there is a compatible mapping. Age groups, prior test timing, and other answers without a compatible current question stay in the archived snapshot. The archive is available to database operators and stays out of the public API. Prior completed questionnaires using the older format resume as drafts so users can review new questions. Back up the database before deploying this migration. Rolling back to an image that expects the removed account columns requires a compatible database restore or a forward repair.

## Catalog integration

The response contains version, language, notice, and cancers. Each card has slug, name, summary, awareness, symptoms, selfExamination, homeKit and riskFactors. Sections contain items and sources. Source metadata includes title, URL, source language and retrieval date. Where present, status is awareness_only, programme_information or unavailable. Render the notice and the status when displaying content.

The catalog lives in PostgreSQL, seeded from `prisma/seed-data/catalog.ts` (see [content in the database](content-database.md)), and has no dependency on patient records or on a live upstream site. /api/cancers and /api/library answer exactly as they did when the catalog was in code, and return 503 {error: "unavailable"} if the content cannot be read. The first release covers breast, colorectal and cervical cancer, matching Finland’s national screening programmes. The FIT section describes the programme and laboratory handoff. Kit-specific instructions, ordering and result interpretation are outside the catalog. [Finnish Cancer Registry](https://cancerregistry.fi/screening/)

For grounded chat, observation logging, and Google AI Studio configuration, see [chat and Gemini setup](chat.md).

For the standalone design mapping, see [initial design backend services](design-backend.md).
