# Content in the database, and the AI features built on it

All educational content lives in PostgreSQL. The backend serves it, the PWA loads it at start-up, and the AI assistant answers only from it. This page says how the database side works: what moves, the tables, the seed, the API, retrieval, and how to edit the content. The last section summarises the AI features built on it, and [chat and the AI assistant](chat.md) describes them in full.

## What moves and what stays

**Moves into the database**
- The PWA's content: the 16 cancer topics, articles with plain-language versions, symptom lists, self-check guides and hints, screening walkthroughs, regular scans and tests, national programmes, statistics, triage guidance, vaccine facts, the curated Q&A, starter questions, the source list, counties, and the UI string table (`D.COPY`, `D.I18N`).
- The backend's own content: the six-topic catalog behind `/api/cancers` and `/api/library` (cards, section titles, official provider links), and the passages chat answers quote, including the emergency wording and the bilingual citations. Every source they cite is a `ContentSource` row.

**Stays in code**
- The questionnaire definitions in `src/lib/intake`: they carry branching and validation rules, not just text.
- Detection in `src/lib/chat.ts`: the words that recognise an intent or a topic (including the three extra cancer types) and **emergency detection**. `planChat` is pure and synchronous and needs no database and no model. The safety notice that closes every reply is written in `chat.ts` too.
- Source ranking in `src/lib/chat-evidence.ts`: which hosts count as Finnish, European and international. It is an allow-list: a chat answer cites only sources on it.
- Inline interface strings written as `A.tr(en, fi, sv)` in the PWA and `t(en, fi)` in `chat.ts`, and the SVG illustrations.

## Seed and versions

The seed has three inputs: `prisma/seed-data/design-content.json` (the one-off export of the PWA's content from the Claude Design artifact, version `1794650590-980c`, 22 keys under `content`; the export script was removed together with the PWA's bundled content modules, so corrections are made in the database or in this file), `prisma/seed-data/catalog.ts` and `prisma/seed-data/evidence.ts` (the backend's catalog and chat passages, moved out of `src/lib/cancer-catalog.ts` and `src/lib/chat-evidence.ts`). The JSON is checked against strict schemas (`src/lib/content/design.ts`), so a change to the export fails the seed instead of being dropped.

`ContentMeta.contentVersion` holds the first 16 hex characters of a SHA-256 over all three inputs and `seedFormat` (`src/lib/content/seed-input.ts`). Bump `seedFormat` when the code that turns the seed into rows or passages changes and the content should reload without a change to the seed files.

`prisma db seed` (`prisma/seed.ts`) upserts the demo fixtures and then runs `seedContent`:

1. It turns the seed into rows and refuses it if it breaks the table design or if a row names a source, article, topic, scan or journey that does not exist (`src/lib/content/rows.ts`, `check.ts`).
2. If the stored `contentVersion` equals the hash, it does nothing. Edits made in the database survive.
3. Otherwise it takes an advisory lock and, in **one transaction**, deletes every `Content*` table except `ContentReport`, writes the new rows and rebuilds `ContentPassage`. Readers see the old content until the commit. Any failure rolls everything back and leaves the old content in place. Two releases that start together are serialised: the second finds the work done.

`npm run db:release` is `prisma migrate deploy` followed by `prisma db seed`. The `migration` target of the `Dockerfile` runs it, so the compose `migrate` job migrates and seeds before the backend starts. A second run changes nothing.

## Tables

Conventions: `position` keeps the order the interface shows (for maps such as `SOURCES` or `ARTICLES` too). Lists of text and lists of source ids are `text[]` columns. Small lists of objects that are always read whole are `jsonb`. A `*SourceIds` column holds `ContentSource` ids, in display order. A `text[]` cannot carry a foreign key, so the seed and `npm run db:reindex` check every id instead. Children cascade-delete with their parent.

| Table | Holds | Rows |
| --- | --- | --- |
| `ContentMeta` | single values: `contentVersion`, `contentRevision`, `retrieved`, `designSource`, `year` (`YEAR`), `example` (`EXAMPLE`), `statsNote`, `statsSourceIds` (`STATS_NOTE`, `STATS_SRC`), `triageIntro`, `triageSourceIds` (`TRIAGE.watchIntro`, `TRIAGE.src`), `catalogVersion` | 11 |
| `ContentSource` | every source: organisation, name (and Finnish title where there is one), url, published label, retrieved date, use, language. `listed` marks the 274 of the PWA's `SOURCES`. The other 28 are cited only by the backend | 302 |
| `ContentString` | `COPY` (scope `copy`), `I18N` (scope `i18n`, a row per language), the catalog notice (scope `catalog`) | 131 |
| `ContentCounty` | `COUNTIES` | 22 |
| `ContentArticle`, `ContentArticleSection` | `ARTICLES`. Section paragraphs, plain version, list and steps are `text[]`. `stats`, `cols` and `link` are `jsonb` | 24, 157 |
| `ContentTopic` | `TOPICS`, with `TOPIC_ORDER` as `position` and `NATIONAL` as the `national` flag in topic order. The symptom block's own text sits in `symptoms*` columns | 16 |
| `ContentSymptom` | `TOPICS.<id>.symptoms.items` | 137 |
| `ContentGuide`, `ContentGuideStep` | `TOPICS.<id>.check` and its steps. `STEP_HINTS` are the `pose` and `move` columns of the steps. `videos` and `abcde` are `jsonb` | 3, 29 |
| `ContentKit` | `TOPICS.<id>.kit`, `video` as `jsonb` | 2 |
| `ContentJourney`, `ContentJourneyStep` | `JOURNEYS` | 3, 27 |
| `ContentCheck` | `CHECK_META` (`everyDays`: days between self-checks) | 3 |
| `ContentScan` | `SCANS` (`everyYears`: years between tests). The labels of the intake answers are `jsonb` | 7 |
| `ContentProgramme` | `NAT` | 3 |
| `ContentStat` | `STATS` | 16 |
| `ContentVaccine`, `ContentTriageRule`, `ContentFaq` | `VACC`, `TRIAGE.rules`, `FAQ` (a regular expression is stored as `pattern` and `patternFlags`) | 2, 5, 13 |
| `ContentSuggestion` | `SUGGESTIONS` (`position` runs over all rows, so it keeps the group order) | 22 |
| `ContentCatalogCard`, `ContentCatalogSection` | the backend catalog in English and Finnish: names, summaries, section titles, items, status, sources, provider links | 6, 30 |
| `ContentEvidence` | the passages chat answers quote, one row per language and, where the answer depends on it, per residence (`any`, `finland`, `abroad`), plus ranked candidates | 42 |
| `ContentPassage` | the retrieval index, derived from all of the above | 599 |

The counts are what the seed loads. `ContentReport` is an account's report about the content, not content: seeding never touches it, so do not select the content tables with `LIKE 'Content%'`.

`D.STEP_HINTS` comes back keyed in topic order, not in the order the export wrote it: it is only looked up by topic id. Every other map keeps its export order.

## API

- `GET /api/content` is public and returns `{ version, retrieved, content }`. `content` has the keys and values of the seed's `content`, so the PWA can use it as `D` unchanged. A regular expression travels as `{ "$regexp": source, "flags": flags }` (`FAQ[].re`): the interface does not read `FAQ`, and a client that does must revive it. `version` is the content version below, `retrieved` the day the content was read from its sources. The response sends `ETag: "<version>"`, answers a matching `If-None-Match` (a list, a weak validator or `*` too) with `304` and no body, and uses `Cache-Control: public, max-age=300, stale-while-revalidate=86400`. The 304 needs the version only, not the content. If the database cannot be read it answers `503 {"error":"unavailable"}` with `no-store`.
- `GET /api/cancers` and `GET /api/library` keep their documented responses byte for byte and now read from the database. `tests/fixtures/*.json` hold 61 responses captured from the code before the move, and the tests compare the text of each response with them. The only new answer is `503` when the content cannot be read.
- `GET /api/health` returns `{ status, version, content, ai }`. `content` is the content version. `ai` is `{ provider, model, configured }`: `provider` is `catalog`, `gemini` or `verda` (`CHAT_PROVIDER`), `model` the model's name or `null`, and `configured` is true only when that provider has everything it needs. The report never holds a key. If the content was never seeded the status is `unavailable` (503).

**Content version.** `version` is the hash, plus `.<revision>` once content was edited in place and reindexed (`ContentMeta.contentRevision`, 0 after a seed). It is what `/api/health` reports as `content`.

## Retrieval

`ContentPassage` holds one row per quotable passage in plain text, with its language, topic, heading and source ids. `search` is a generated `tsvector` (the Finnish dictionary for `fi` rows, the English one for the rest; heading weight A, text weight B) with a GIN index, both created by the migration, because Prisma cannot express them.

What is indexed, with the id of each passage (ids are stable):

| Kind | Id | Passages from |
| --- | --- | --- |
| `article` | `article:<article>`, `article:<article>:<section>` | each article's summary and sections |
| `topic`, `symptom` | `topic:<topic>:overview`, `:screening`, `:symptom:<n>`, `:see` | the topic text and symptom lists |
| `guide`, `kit` | `guide:<topic>`, `:step:<n>` (with the pose and movement), `:normal`, `:found`, `:differ`, `:abcde:<n>`, `kit:<topic>` | self-check guides and home kits |
| `journey`, `scan`, `programme` | `journey:<topic>:…`, `scan:<id>`, `programme:<topic>` | screening walkthroughs, tests, programmes |
| `stat`, `vaccine`, `triage`, `faq` | `stats:note`, `stat:<topic>`, `vaccine:<id>`, `triage:<n>`, `faq:<n>` | figures, vaccines, triage rules, curated Q&A |
| `catalog`, `evidence` | `catalog:<slug>:<section>:<language>`, `evidence:<id>:<language>[:<residence>[:<n>]]` | the backend catalog and the chat passages |

A passage that cites no source cannot be quoted and is left out: `triage:4` and the question "Does care4all diagnose?" (`faq:9`). The PWA's passages are English. The catalog and chat passages exist in English and Finnish, so a Finnish question searches those only. Topic ids are the PWA's (`bowel`, `ovary`, `pancreas`). The chat's names (`colorectal`, `ovarian`, `pancreatic`) are accepted and mapped (`src/lib/content/topic.ts`).

`retrievePassages({ question, language, topic?, limit })` is a method of the content store. It turns the question into its words (letters and digits only, up to 32), matches any of them in the language's dictionary (stop words drop out), and orders the matches: passages of the topic first, then all others. Within a group a passage whose whole heading is made of words of the question ("Breast · Screening", "What is cancer?") comes first, then the rest by `ts_rank_cd` divided by the logarithm of the passage's length (normalisation flag 1), so a short precise passage is not crowded out by long articles that mention the words more often. When a topic is given and the question matched something, the topic's anchors (`topic:<t>:overview`, `topic:<t>:screening`, `programme:<t>` and the topic's catalog sections) are placed after the best three, whether or not the question's words matched them. `limit` is 1 to 20. It returns `{ id, heading, text, topic, language, sources }`, each source with `id`, `name`, `organisation`, `url`, `published`, `retrieved`, `use` and `language`. Nothing about an account is ever part of retrieval.

## The store in code

`src/lib/content/` holds the layer. `ContentStore` has `contentVersion()`, `loadContent()`, `loadCatalog()`, `loadEvidence()` and `retrievePassages()`.

- `store.ts`: the PostgreSQL store. It reads in one `REPEATABLE READ` transaction, assembles from rows (`assemble.ts`) and caches each of the PWA content, the catalog and the evidence in memory by content version for 30 seconds. After that it asks for the version only and rebuilds only when it changed. If the database cannot be reached it keeps serving the last copy it has. A failure in one kind (a broken table of PWA content, say) does not stop another (the chat evidence, say).
- `memory-store.ts`: the same interface built straight from the seed, with no database, for unit tests. It uses the same row mapping and assembly. Retrieval ranks by a plain word match.
- `catalog.ts`: `cancerCards(catalog, language, slug?)`, what `src/lib/cancer-catalog.ts` used to return.
- `src/lib/chat.ts`, `chat-director.ts`, `chat-evidence.ts` and `chat-journey.ts` read through the store: `answerChat(store, input, plan, ordered?, context?)` and `directChat(store, language, plan, next, config?)` take it, `nextAction` takes the evidence. An emergency answer needs the evidence only, not the catalog.
- `responses.ts`: the bodies of `/api/cancers`, `/api/library` and `/api/content`, with the store passed in.

## Editing content

The database is the source of truth. Edit rows in the tables above with SQL or Prisma Studio, then reindex:

```sql
UPDATE "ContentTopic" SET "lede" = 'New wording.' WHERE "id" = 'breast';
```

```powershell
npm.cmd run db:reindex
# In the stack: docker compose --env-file .env.docker run --rm migrate npm run db:reindex
```

`db:reindex` checks every id the rows name (it refuses and changes nothing if one points nowhere or a `jsonb` column is malformed), rebuilds `ContentPassage` from the tables as they are, and raises `contentRevision`, so the API serves a new version within 30 seconds and a browser holding the old copy gets the new one at its next revalidation (at most five minutes). Never edit `ContentPassage` by hand: reindexing rewrites it. A new row needs a `position`, and a source id must exist in `ContentSource`.

A release does not undo these edits as long as the seed input is the same, because `contentVersion` still holds the seed's hash.

**Re-seed.** Changing a seed file and running `npm run db:release` replaces all content with the seed. Edits made in the database are lost, so carry them into the seed files first. To reload the unchanged seed, for example to discard hand edits:

```sql
UPDATE "ContentMeta" SET "value" = '"reseed"' WHERE "key" = 'contentVersion';
```

then `npm run db:seed` (or the `migrate` job).

**Migrations.** `ContentPassage."search"` is a generated column that Prisma only sees as a column with a default. `prisma migrate dev` therefore proposes `ALTER COLUMN "search" DROP DEFAULT`. Do not apply that statement. `prisma migrate deploy` and `prisma generate` are not affected.

## Tests

`npm test` runs the unit tests with the in-memory store, so they need no database. They check that the assembler returns the seed's `content` exactly, that every reference holds, the content version, `/api/content` (ETag, 304, 503), retrieval, and that `/api/cancers`, `/api/library` and chat replies equal what the code produced before the move. Those expectations are the JSON files in `tests/fixtures`, captured from the code as it stood before the content moved: 61 route responses, every catalog card in both languages, and 47 chat plans and replies. They are the contract for behaviour that must not change, so change them on purpose when the wording changes, never to make a test pass.

`tests/retrieval-gold.ts` is a gold set of 27 typical questions (21 English, 6 Finnish), each with the passages a good answer needs, run through the chat's own candidate pipeline (search, allow-list, merge). `tests/content-db.test.ts` checks recall against it on PostgreSQL, with thresholds just below what the ranking reaches: 82% of the needed passages in the top 8 and 88% in the top 12 when it was written, up from 44% and 53% with plain relevance ranking. Run it with a scratch database: `$env:CONTENT_TEST_DATABASE_URL = "<scratch database url>"; npx.cmd tsx --test tests/content-db.test.ts`. When the ranking or the content changes, run it and read the numbers before changing a threshold.

`tests/content-db.test.ts` runs the same checks against PostgreSQL, and the seed, rollback, concurrency, reindex and cache behaviour besides. Set `CONTENT_TEST_DATABASE_URL` to a scratch database, never the one the app uses. Each run makes its own schema in it, applies every migration there and drops the schema afterwards. Without the variable the file is skipped.

## Notes on the source data

Noticed while moving it. None was changed, because the content is as the export wrote it.

- The PWA's source list records no language for a page. The seed derives it from the address: Finnish hosts, and the path on hosts that publish both languages (`src/lib/content/rows.ts`, `pageLanguage`). Check the result in `ContentSource.language`.
- `euromelanoma` links to the Slovak page (`/sk-sk/`) of the campaign, and is cited for English content. Its language is stored as `sk`.
- 58 spellings of `org` for 274 sources ("NHS", "NHS (UK)", "NHS (England)"; six forms of the Cancer Society of Finland), so the PWA's source list shows one publisher as several groups.
- 21 addresses are held by more than one source row, for example `cs-breasts` and `fcs-breast`, `cs-testicular` and `fcs-kives`, `nhs-testicular-check` and `nhs-testicle-check`, and the 6 press-release entries that share one `sttinfo.fi` page. 13 sources are cited nowhere: `ecac5`, `esmo-lung`, `esmo-headneck`, `eau-bladder-mibc`, `cc-bse`, `nhs-testicular-symptoms`, `fcs-kives`, `nhs-nonmelanoma`, `melanomauk`, `chft-skin`, `fcs-symptoms`, `ecac5-about`, `hus-breast`.
- 7 of the backend's own sources (`catalog-fcr-breast-screening`, `catalog-fcr-cervical-screening`, `catalog-fimlab-bowel`, `chat-fcr-screening`, `chat-iarc-ecac`, `chat-cs-lung`, `chat-cs-ovarian`) have the address of a source in the PWA's list, under a different title.
- Every source's retrieved date is the day of the export (14 November 2026), not the day its page was read. 13 have no published label.
- The Finnish content is the backend's alone: the PWA's articles, guides, Q&A and statistics exist in English only, so retrieval for a Finnish question finds the catalog and chat passages and nothing else.

## PWA loading

The PWA fetches `/api/content` at start-up, in parallel with the account check, and fills the shared `A.D` object in place before the first screen is drawn. The service worker caches exactly `GET /api/content` (stale while revalidate) so reading works offline after the first visit. It caches nothing else under `/api/`. The content is public and holds no personal data.

## AI features

Built, and described in full in [chat and the AI assistant](chat.md). The model writes only from passages retrieved here (`retrievePassages`, then the chat's allow-list of ten source hosts), and these hold:

- Emergency wording is detected in code and answered without calling a model. So are personal questions, requests to log a symptom and the intake and symptom conversations.
- The model receives the question text, the language and up to twelve retrieved public passages. It never receives account details, profile, answers, notes or reminders.
- Every generated answer carries the passage ids it used. An answer that cites an unknown id, cites nothing, contains a URL, or states a number that no cited passage contains is discarded and the reviewed passages are returned instead.
- The same fallback applies when the provider is down, slow or unconfigured. `CHAT_PROVIDER=catalog` switches the model off entirely.
- Prompts and answers are never logged or stored.
- The interface says plainly that the answer was written by an AI from the listed sources, that the question was sent to the provider, and that nothing else was.
