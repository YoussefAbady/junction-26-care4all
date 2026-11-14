# Care4ll chat and Gemini setup

The signed-in chat offers education and professional-care navigation in English and Finnish. It uses the curated catalog, Finnish Cancer Society material, European sources including ESMO and IARC, and the U.S. National Cancer Institute. For competing relevant evidence, priority is Finland, Europe, then international. Each passage carries direct citations. The server detects a supported topic and relevant section keywords, then optionally asks Gemini to order the matching section IDs. The app displays only its own reviewed passages and source URLs. For personal medical questions it points to a healthcare professional. Unsupported questions get a clear fallback. The emergency notice is always returned and the chat is not monitored.

Gemini receives public topic and section IDs only. Chat messages are not stored or sent to Google. Saved symptom and observation entries are private to the account and stored in PostgreSQL after an explicit save request. They are never sent to Gemini. Use fictional data in this prototype.

## Connect your AI Studio project

1. Open [AI Studio API Keys](https://aistudio.google.com/apikey). Choose or import the Google Cloud project with your credits, then create a key in that project. Use the authorization key AI Studio creates. Keep it in your local environment or deployment secret store. [Google API key guide](https://aistudio.google.com/docs/api-key)
2. In [AI Studio Billing](https://aistudio.google.com/billing), confirm the key’s project is linked to the billing account that holds your credits. Check paid-tier status, credit eligibility, and any Prepay balance requirement. AI Studio access alone does not confirm API billing. Google requires Paid Services for API clients made available in the EEA, Switzerland or the UK and prohibits clinical practice and providing medical advice through this API. [Billing](https://ai.google.dev/gemini-api/docs/billing/) · [Terms](https://aistudio.google.com/docs/terms)
3. Pick a model enabled for the project that supports structured output and copy its exact API ID. Google lists gemini-3.8-flash as a stable model with structured output. [Model reference](https://aistudio.google.com/docs/models/gemini-3.8-flash)
4. Open the existing ignored .env.docker file in a local editor. Leave the database settings intact and set these variables. Replace the key placeholder locally.

```dotenv
CHAT_PROVIDER=gemini
GEMINI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=PASTE_YOUR_KEY_LOCALLY
```

5. Recreate the app with the updated environment. For host development use the ignored .env file and restart Next.js.

```powershell
Set-Location D:\projects\care4all
docker compose --env-file .env.docker up -d --build --wait
Invoke-RestMethod http://localhost:3000/api/health
```

6. Sign in to a fictional account and submit an educational request through the chat API. Use a question such as “What are the symptoms and risk factors of breast cancer?” A response with provider gemini confirms that Google returned a valid section order. Provider catalog means local mode, a non-educational reply, or a provider failure. If a request returns catalog with providerFallback true, verify the key’s project, billing, enabled model and API quota. The fallback does not expose upstream errors or credentials. Check AI Studio Dashboard → Usage after a live test.

While signed in on localhost, run this in that tab’s browser console. It uses the existing session cookie.

```js
await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "What are the symptoms and risk factors of breast cancer?",
    language: "en",
  }),
}).then(response => response.json());
```

## Personalised responses and sharing

On each request, the backend reads the signed-in account’s saved profile, active survey answers, and recent symptom and self-check observations. It uses the records locally to suggest what to raise with a professional, choose appropriate navigation, and resolve short follow-ups with an unambiguous saved topic. It does not derive a diagnosis, urgency score, eligibility decision, or treatment plan from records.

Render patientContext as separate user-reported information. It includes available demographics, up to eight prioritised survey items and four recent observations from the last 50 entries. Logged dates and observed dates are distinguished. Show questionsForProfessional as questions, not instructions. Display nextSteps with their own sources. The top-level sources list is deduplicated and ordered Finland, Europe, then international. The shareText field contains the educational copy and numbered source URLs, without patient context, chat input, or personalised questions. Use that field for copying or sharing.

This prototype supports saved survey and observation records. It has no uploaded clinical document store. Age and profile details support questions to ask a professional, without calculating screening eligibility. The evidence collection is finite, so unsupported questions return a sourced signpost or an explicit coverage gap.

## Frontend handoff

Use the existing same-origin HTTP-only login cookie. Responses are private and no-store.

- POST /api/chat accepts {message, language: "en" or "fi", topic?: "breast", "colorectal", "cervical", "skin", "prostate" or "testicular", mode?: "education" or "observation"}. For a short follow-up, pass the last selected topic. The bowel alias is accepted. Returns kind, message, topic, passages, action, safety, provider, and providerFallback. Each passage has id, items and sources, plus an optional catalog status. Render the source links and safety notice. Keep the chat transcript in memory for the prototype.
- When action.type is open_observation, show a reviewable input form. Populate it with the user’s original text if helpful. Chat never creates records.
- POST /api/observations accepts {kind: "symptom" or "observation", label, notes?, observedAt?}. Use an ISO timestamp with offset or null for observedAt. Returns {observation} after a successful save.
- GET /api/observations returns {observations, nextCursor}. Pass nextCursor as the before query parameter to fetch the next page.
- DELETE /api/observations accepts {id} in the JSON body. It removes an entry belonging to the signed-in account.

Requests with an expired session return 401. Mutation requests must come from APP_ORIGIN. See [account integration](backend-api.md).

For the interactive onboarding, symptom logging and persistent next action contracts, see [chat-first journeys](chat-journeys.md).
