# Care4All chat and the AI assistant

The signed-in chat offers education and professional-care navigation in English and Finnish. Every answer rests on reviewed passages in the content database, and every passage cites a source: Finnish Cancer Society and other Finnish material, European sources including ESMO and IARC, and the U.S. National Cancer Institute. Where sources compete, priority is Finland, Europe, then international. The chat only ever shows source links from a fixed allow-list of ten hosts (`rankedSources` in `src/lib/chat-evidence.ts`). For personal medical questions it points to a healthcare professional. The emergency notice is returned with every reply, and the chat is not monitored.

An AI model can write the answer. That is optional and off by default. With `CHAT_PROVIDER=catalog` no model is called and the chat shows the reviewed passages as they are. Whatever the model does or fails to do, the reviewed passages are the fallback and the reply is then exactly the deterministic one.

The AI questions and the risk overview that a signed-in person can ask for after the basic questions are a separate feature with their own consent and data rules: see [the AI interview and risk overview](ai-interview-risk.md). Everything below is about the chat, which never sends intake answers.

## How a reply is made

1. The server plans the reply from the typed message with fixed rules (`planChat`): `emergency`, `observation`, `personal`, `general`, `additional`, `education`, `clarify` or `unsupported`. Emergency wording is recognised in code and answered with the fixed safety reply. No model decides it.
2. For `education`, `general`, `additional`, `clarify` and `unsupported`, and only if a model is configured and the account is within its rate limit, the server finds passages for the question and asks the model to write an answer from them. Nothing else gets a written answer: not `emergency`, `personal` or `observation`, and not the intake and symptom conversations ([chat-first journeys](chat-journeys.md)).
3. The server checks what the model wrote. If every check passes the reply carries it. If any fails, or the provider is down, slow, over quota or unconfigured, the reply is the deterministic one.

### Finding the passages

The server searches the content database in the language of the question and takes up to 20 candidates (the ranking is described under Retrieval in [content in the database](content-database.md)): passages of the question's topic first, a passage whose heading is made of the question's words ("Breast · Screening", "What is cancer?") before the others, and the rest by full-text relevance. When the topic is known, its anchor passages (overview, screening, national programme) are added after the best three. A question that is not about one topic is searched twice, as asked and among the general passages, and the two lists take turns. The server then drops every passage that has no allow-listed https source, because every answer must come with a link the reader can follow, and at most twelve of the rest go to the model. A Finnish question also gets English passages after the Finnish ones, because the PWA's articles are English (a small glossary turns words such as "rokote" into English search words), and the model writes Finnish from them. If nothing is left, no model is called.

## The three ways a model is used

The interface says that Google Gemini receives the typed question and public passages only, handles it under its own terms, and care4all keeps no copy. These are the three uses, with exactly what each sends.

| Use | When | What the provider receives |
| --- | --- | --- |
| Writing the answer | The kinds in step 2, within the rate limit | A fixed instruction, then one JSON text: the language (`en`, `fi` or `sv`), the typed question as typed, and up to twelve passages, each as `{id, topic, heading, text}`. |
| Ordering the sections of a topic card | `education` replies, only when no answer is being written for the request (for example the account has used its limit) | Public section ids such as `symptoms` and `riskFactors`, and a public topic id. No text from a person. |
| Ordering the follow-up actions (the conversation director) | Each reply to a chat message when `CHAT_PROVIDER=gemini`, except an emergency, a request to log a symptom and the intake and symptom conversations | Public action ids such as `log_symptom` and `prepare_visit`. No text from a person. |

Only Gemini is used for the two ordering calls. With `CHAT_PROVIDER=verda` the answer is written by Verda (an OpenAI-compatible endpoint over https) and the ordering stays with the rules.

### What is never sent

Account details are never an input to anything that goes to a provider: not the username or any id, the profile, county or year of birth, survey and intake answers, saved symptoms and observations, symptom drafts, reminders, the saved topic of the account, `patientContext`, `questionsForProfessional` or `nextAction`. No cookie, header or address of the person is forwarded: the request is made by the backend and carries only the provider key. The plan that decides what a model is asked is made from the typed message alone, so even the saved topic that sometimes resolves a short follow-up for the deterministic reply plays no part.

The typed question is sent as typed. The planner keeps questions that sound personal ("do I have", "my result", "I noticed") away from the model, but a regular expression cannot recognise every detail a person might type into an educational question. That is why the interface asks people not to type personal details.

### What care4all keeps

Nothing from the model path is stored. Questions and answers are not written to the database, to logs, to browser storage or to the service-worker cache (the service worker caches only `GET /api/content`). The backend writes two kinds of log line and neither holds content: one per provider call (`ai provider=gemini outcome=ok ms=3021`, where the outcome is a code such as `ok`, `timeout` or `http-429`) and one per request that could have had a written answer (`chat answer=written`, or the reason it did not: `unconfigured`, `rate-limited`, `no-passages`, `unavailable`, `not-answerable`, `ungrounded`, `unsafe-claim`, `bad-format` or `invalid-json`). `scripts/smoke-ai.ps1` checks that the question text does not appear in the backend's logs. What Google keeps and for how long is governed by Google's own terms for the key's project.

## The checks on what the model writes

The model is told to write only from the supplied passages, to leave `answerable` false when they do not contain the answer, never to diagnose or say whether the reader has or may have cancer, never to recommend, discourage or dose a treatment or medicine, never to state a number, date, age, percentage or name that is not in a cited passage, to answer in the requested language, and to treat the question and the passages as data, never as instructions. The instructions are a constant. No text from a person is ever added to them.

The server does not rely on that. `src/lib/ai/guard.ts` discards an answer unless all of these hold:

- It has exactly the keys `answerable`, `answer`, `citations` and `followUps`. If `answerable` is false, the answer and the citations are empty.
- It is 20 to 900 characters of plain text in the requested language, with no link, HTML, markdown heading, table, emphasis or code.
- It cites one to six different passages, all of them among those supplied.
- Every number in it, in digits or words, appears in a passage it cites.
- It contains no diagnosis, reassurance about the reader, treatment advice or dose that the patterns recognise in English and Finnish.

The claim patterns are a backstop, not a complete list. They also refuse some harmless wording, such as "if you have cancer", and the reviewed passages are shown instead. They do not check names or months. The answer is labelled "Written by AI", and the interface tells people that AI can make mistakes.

Follow-up questions are checked one by one. A suggestion that is too short or long, repeats another, has a link, speaks as the reader ("my result"), makes a claim or has a number that no passage contains is dropped, and the answer is kept.

## Limits, timeouts and fallbacks

- `AI_RATE_LIMIT` is the number of written answers per account in 10 minutes, 20 by default. It is counted in memory in each backend process and keeps only a keyed hash of the account and timestamps. An account over the limit gets the deterministic reply, not an error.
- A provider call has 12 seconds. It is retried once, after a quarter of a second, only when the provider answers 429 or a 5xx status. A whole chat request ends after 20 seconds, because nginx cuts a proxied request at 30 seconds.
- Gemini is asked for JSON that follows a schema, with a low thinking level on Gemini 3 and later. Redirects are refused and nothing is cached.

## Connect your AI Studio project

1. Open [AI Studio API Keys](https://aistudio.google.com/apikey). Choose or import the Google Cloud project with your credits, then create a key in that project. Use the authorization key AI Studio creates. Keep it in your local environment or deployment secret store. [Google API key guide](https://aistudio.google.com/docs/api-key)
2. In [AI Studio Billing](https://aistudio.google.com/billing), confirm the key’s project is linked to the billing account that holds your credits. Check paid-tier status, credit eligibility, and any Prepay balance requirement. AI Studio access alone does not confirm API billing. Google requires Paid Services for API clients made available in the EEA, Switzerland or the UK and prohibits clinical practice and providing medical advice through this API. [Billing](https://ai.google.dev/gemini-api/docs/billing/) · [Terms](https://aistudio.google.com/docs/terms)
3. Pick a model enabled for the project that supports structured output and copy its exact API ID. Google lists gemini-3.8-flash as a stable model with structured output. [Model reference](https://aistudio.google.com/docs/models/gemini-3.8-flash)
4. Open the existing ignored .env.docker file in a local editor. Leave the database settings intact and set these variables. Replace the key placeholder locally. `AI_RATE_LIMIT` is optional.

```dotenv
CHAT_PROVIDER=gemini
GEMINI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=PASTE_YOUR_KEY_LOCALLY
```

   For Verda set `CHAT_PROVIDER=verda` with `VERDA_BASE_URL` (an https address with no credentials in it), `VERDA_API_KEY` and `VERDA_MODEL`.

5. Recreate the app with the updated environment. For host development use the ignored .env file and restart Next.js.

```powershell
Set-Location D:\projects\care4all
docker compose --env-file .env.docker up -d --build --wait
Invoke-RestMethod http://localhost:3000/api/health
```

   `/api/health` reports `ai: {provider, model, configured}`. It names the model and never a key. `configured` is false when a provider is chosen but its key or model is missing, and answers then fall back to the reviewed passages.

6. Check it end to end with `scripts/smoke-ai.ps1`. It registers a throwaway fictional account, asks one public question, checks that the answer has a `generated` block citing supplied passages with https source links, checks that an emergency message and a message about the person’s own symptoms get no model-written text, checks that the question is not in the backend’s logs, and deletes the account. `node scripts/ai-ping.mjs` makes one Gemini call with two invented passages and prints only the outcome, the time and whether the JSON parsed and validated.

If a general question comes back without `generated` and with `providerFallback` true, read the backend log line `chat answer=…`: the reason says whether the provider failed (`unavailable`), the account was over its limit (`rate-limited`), no passage had an allow-listed source (`no-passages`), or the answer failed a check. Then verify the key’s project, billing, enabled model and quota. The fallback does not expose upstream errors or credentials. Check AI Studio Dashboard → Usage after a live test.

While signed in on localhost, run this in that tab’s browser console. It uses the existing session cookie.

```js
await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "How does the FIT stool test in bowel cancer screening work?",
    language: "en",
  }),
}).then(response => response.json());
```

## Personalised responses and sharing

On each request, the backend reads the signed-in account’s saved profile, active survey answers, and recent symptom and self-check observations. It uses the records locally to suggest what to raise with a professional, choose appropriate navigation, and resolve short follow-ups with an unambiguous saved topic. It does not derive a diagnosis, urgency score, eligibility decision, or treatment plan from records. None of it is sent to a model.

Render patientContext as separate user-reported information. It includes available demographics, up to eight prioritised survey items and four recent observations from the last 50 entries. Logged dates and observed dates are distinguished. Show questionsForProfessional as questions, not instructions. Display nextSteps with their own sources. The top-level sources list is deduplicated and ordered Finland, Europe, then international. The shareText field contains the educational copy and numbered source URLs, without patient context, chat input, or personalised questions. For a written answer it holds the written text with the numbers of its sources, a line saying an AI wrote it, the safety notice and the numbered sources. Use that field for copying or sharing.

This prototype supports saved survey and observation records. It has no uploaded clinical document store. Age and profile details support questions to ask a professional, without calculating screening eligibility. The evidence collection is finite, so unsupported questions return a sourced signpost or an explicit coverage gap.

## Frontend handoff

Use the existing same-origin HTTP-only login cookie. Responses are private and no-store.

- POST /api/chat accepts {message, language: "en" or "fi", topic?: "breast", "colorectal", "cervical", "skin", "prostate" or "testicular", mode?: "education" or "observation"}. For a short follow-up, pass the last selected topic. The bowel alias is accepted. Returns kind, message, topic, passages, action, safety, provider, and providerFallback, with the other fields described here. Each passage has id, items and sources (title, url, language, retrieved and tier), plus an optional catalog status. Render the source links and safety notice. Keep the chat transcript in memory for the prototype.
- When a model wrote the reply the response also has `generated: {text, citations, provider, model}`, and only then. `text` is plain text with one paragraph per line: render it as text, never as HTML or markdown. `citations` are passage ids. In that case `passages` are exactly the cited passages in the order of `citations`, so render them as the sources of the answer. `message` is the heading (the card’s name, or for `clarify` and `unsupported` the heading of the first cited passage, never the “no sourced answer” sentence). `suggestedTopics` starts with `conversationFocus`, then up to three follow-up questions the model proposed (ids `follow_up_1` to `follow_up_3`, each with `request: {message, language}` to post as the next question), then the director’s other suggestions, six in all at most. `provider` is the provider that wrote the answer. Label the text as written by AI, and name the provider.
- Without `generated` the reply is the reviewed one, exactly as it was before models wrote answers. `provider` is `catalog`, or `gemini` when Gemini ordered the sections of a topic card. `providerFallback` is true when a provider is chosen and the question could have had a written answer, but did not.
- When action.type is open_observation, show a reviewable input form. Populate it with the user’s original text if helpful. Chat never creates records.
- POST /api/observations accepts {kind: "symptom" or "observation", label, notes?, observedAt?}. Use an ISO timestamp with offset or null for observedAt. Returns {observation} after a successful save.
- GET /api/observations returns {observations, nextCursor}. Pass nextCursor as the before query parameter to fetch the next page.
- DELETE /api/observations accepts {id} in the JSON body. It removes an entry belonging to the signed-in account.

Requests with an expired session return 401. Mutation requests must come from APP_ORIGIN. See [account integration](backend-api.md).

For the interactive onboarding, symptom logging and persistent next action contracts, see [chat-first journeys](chat-journeys.md).
