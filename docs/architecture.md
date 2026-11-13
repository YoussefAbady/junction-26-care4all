# Architecture

A Next.js App Router shell loads session data from an uncached same-origin route handler. A random HTTP-only SameSite=Strict cookie represents a seven-day demo session. The server looks up a SHA-256 hash of the token, checks expiry and scopes every mutation to that session. It validates origin, request shape and record ownership. Revisions prevent stale writes from overwriting newer saves. Reset deletes the stored record and clears the cookie.

PostgreSQL holds the validated session snapshot in JSONB and a small synthetic fixture catalog. Prisma migrations own the schema. The optional local file store uses atomic replacement and per-session writes within one process. PostgreSQL removes expired sessions on new session creation. Local expired files can be removed by the operator when the app is stopped. Demo sessions are resumable on the same browser.

Questionnaire definitions control deterministic branching. Versioned pathways choose demo actions. The curated source catalog supplies screening background. Document fixtures supply fixed extracts, which a patient explicitly reviews before adding. A future private document service should produce reviewed extracts through a dedicated authorised ingestion pipeline.

The mock and Verda implement a common provider interface. Verda uses Chat Completions with a per-attempt timeout and at most two attempts. Zod validates the response and the server accepts only a complete permutation of supplied lines. Rendered text comes from patient reports, the deterministic pathway and curated source passages. AI responses are transient. Provider errors retain the original information. [Verda OpenAI compatibility](https://docs.verda.com/inference/openai-compatibility/)

The service worker caches six named public assets including a generic offline page. It routes root navigation to the network and uses the offline page on a network error. Session API calls, summaries and briefs bypass the cache. Failed saves leave the current draft in memory. A new worker waits for existing controlled tabs to close. Save input before closing tabs and bump the public cache version when changing a cached asset.
