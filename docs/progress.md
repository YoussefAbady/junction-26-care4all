# Progress

Care4ll by AstraZeneca has a redesigned, accessible interface (mulberry and gold design system, text size control, WCAG AA contrast, keyboard and screen reader support, English and Finnish) and an adaptive, clinician-oriented intake replacing the earlier static multiple-choice survey. Account creation, sign-in, background saving, resume, review, a printable summary and safety alerts are in place.

Open work: clinical review of content and alert rules, native Finnish review, account deletion, production identity and recovery, privacy and regulatory review, approval for the prototype branding. The older care-app.tsx and forms.tsx workspace components are unused and unstyled; delete them when convenient.

Use fictional data only.

## PWA frontend

The care4all PWA in `frontend/` rebuilds the "care4all" Claude Design artifact (artifact version `1794650590-980c`, retrieved 14 November 2026) as a real application in its own container. It replaces the earlier approach, which patched the design's HTML with string replacements at build time and with a runtime adapter. The design's screens, copy, animations and illustrations are unchanged. Account, profile and display preferences, the next action, Ask, Get to know you, Talk about symptoms, notes, self-check results, scan dates, reminders, the source library, official topic information, problem reports, data export and account deletion all use the backend. The design's articles, topic pages, symptom lists, self-check guides and illustrations are static public content bundled with the app. See [frontend](frontend.md).

**Verified**
- Backend: ESLint, TypeScript and the 24 unit tests pass. The seven API specs pass through the PWA origin (nginx to backend to PostgreSQL).
- Frontend: ESLint is clean, the 26 unit tests pass (API client, state, service worker) and the production build succeeds.
- Container: the PWA image runs as an unprivileged user with a read-only filesystem and all capabilities dropped. Headers, caching, the `/api/` proxy, the origin check and query-free access logs were checked against the running stack.
- PWA behaviour in Chromium (Playwright): the app registers its own worker, nothing from `/api/` is cached, the shell opens offline, and browser storage holds display preferences only.
- Browser journeys in `tests/e2e/frontend.spec.ts`: on the last complete run six of nine passed (reminders and calendar file, self-check results, text size and Finnish, data export and account deletion, origin check, and the intake resume). The other three failed on wrong selectors in the test script: an ambiguous error message, the label of the optional last symptom question, and the library search box, which has the `searchbox` role. Those selectors were corrected afterwards, but the journeys were not run again before this was written. Run them before relying on them.
- The three build slices (account and shell, learning content, conversations) were each exercised in a browser at phone size in light and dark, in English, Finnish and Swedish.

**Open work**
- Finnish and Swedish text on the new screens was drafted without native review. Swedish is partial, and the design's own strings are English.
- The conversation API has gaps the UI works around: `review_intake` returns raw answer ids rather than labels, a symptom draft cannot be read back, there is no server-side Back for symptoms, free text in the intake is not checked for emergencies, and a clarify reply reuses the unsupported-question text.
- The backend knows six cancer topics. The other ten in the design have content, symptoms and guides but no chat, note or reminder topic.
- The backend still serves its original Next.js interface at http://localhost:3000. Its forms no longer work there because `APP_ORIGIN` is the PWA's address. Its journey, `tests/e2e/journey.spec.ts`, is skipped unless `LEGACY_UI_URL` is set. Retire both when convenient.
- Notifications on the device appear only while care4all is open. A dependable alert is the calendar file.
- The Claude browser pane cannot register service workers, so offline behaviour is tested with Playwright or in a normal browser.
