# AI interview, AI risk overview and close monitoring

This replaces the earlier one-off AI review (`/api/assess`, removed). The full build contract is [`design-v2.md`](design-v2.md) (sections 1 to 13 and Appendix A). This page is the short version for people running the app.

## The flow

1. **Basics** (`#you`, plain questions, no AI): date of birth, sex, body, weight change, residence.
2. **AI interview** (`#interview`, `/api/interview`): after the person agrees on screen, a model writes one question at a time. Each question is based on the basics and on every earlier question and answer. Answers are choices or numbers, never typed text, and every question allows "Not sure" and "Prefer not to say". The interview ends when the database's coverage list (tobacco, alcohol, activity, diet, family history, conditions, sun, work, screening, vaccines, testicular history, warning signs) is covered and at least 10 questions were asked, or at 28.
3. **AI risk overview** (`#risk`, `/api/risk`): after a second consent, a background job rates every cancer type that applies to the person (high, raised, average, or "needs answers"), then an overall level that is never lower than the highest type, then a second model pass checks the result against the guidance. Every rating comes with a reason, the findings behind it (each citing a passage by source), what can help, and what the questions did not cover. The overview reads Finnish guidance first (Käypä hoito, Duodecim, the Cancer Society, STUK), then European, then UK and WHO material, all from the database.
4. **Close monitoring** (`/api/monitors`): a symptom note can be watched with check-ins on day 3, 7, 14 and 21. The server decides from rules stored in the database. No model is involved and an escalation is never lowered.
5. **PDF for my doctor**: made on the device from what the account holds; nothing is sent when it is made.

## What a model is sent, and what it is never sent

Sent: age in years, sex, weight group, the coded basic answers, whether the person lives in Finland, and the interview questions with the answers in words. Never sent: name, username, any id, exact date of birth, city or county, height or weight, or anything typed. Facts pass through one deny-by-default place, `src/lib/assess/facts.ts`. Each call that sends anything carries `consent: true`, asked on screen first.

## What is stored

On the account in PostgreSQL: `AiInterview` and `AiTurn` (the transcript), `RiskAssessment` (the result and the hash of what it was made from, so a changed interview or a new content version marks it stale), `SymptomMonitor` and `MonitorCheckin`. All of it is part of the data export and is deleted with the account. Nothing is written to logs except reason codes (`interview step=answer reason=question`, `risk step=lung reason=ok`), and nothing is kept in browser storage or the service worker cache.

## How a model is kept honest

- A model's question is refused unless it follows the rules (one question, 2 to 7 options of at most 60 characters, ends with a question mark, no request to type, no personal detail, no treatment or medicine wording, no text that steers a model). A refused question is replaced by the database's bank question for that area, so the interview always moves on.
- A model never decides a tier alone. "High" needs a cited statement with a very large effect, "raised" needs cited up-findings of the right strength, and every cited passage must be one that was supplied. Numbers in a reason must come from a cited passage or from the person's own answers, and a figure of risk is never said about the person. A type that fails twice is shown as "not assessed", never guessed.
- The overall level is computed under the same rules. The job has a 120 second deadline, and a job that stops (for example a restart) is shown as interrupted after three minutes.
- With no model configured, the interview and the overview are unavailable. There are no fixed fallback ratings.

## Settings

`INTERVIEW_RATE_LIMIT` (questions per account per 10 minutes, default 60) and `RISK_RATE_LIMIT` (overviews per account per hour, default 3). The model comes from the same environment as the chat (`GEMINI_API_KEY`, `GEMINI_MODEL`).

## Caveats

- The statements the model reasons from were taken from the design export (retrieved 14 Nov 2026). They were not re-read from the cited pages one by one.
- All Finnish text written for this feature is a machine draft and is marked unreviewed.
- The provider's terms restrict use for medical advice. Wording is information only, and every screen says it is not a diagnosis or a prediction.
