# Chat-first journeys

The same-origin POST /api/chat endpoint accepts the existing education message or an interactive action. Every successful chat turn returns nextAction. A signed-in dashboard can fetch it directly using GET /api/chat/next-action?lang=en. It is computed from current saved data on each read.

## Getting to know you

Send {action: "start_intake", language} to start or resume. The plain messages "Get to know me", "Start survey", and "Continue intake" also start the journey. Render intake_question using input, title, help, options or fields, progress, and markers. Submit {action: "answer_intake", language, questionId, revision, value}. The revision and question ID come from the last response. Marker buttons send a value such as {$: "unsure"}.

Each valid answer saves immediately to the existing account survey and opens the next applicable question. At review_intake, show the saved answers and submit {action: "finish_intake", language, revision, confirmed: true} after explicit confirmation. The existing survey API remains available for edits. A stale answer returns 409. Reload the current chat question with start_intake.

## Symptom conversations

Send {action: "start_symptom", language, topic?}, or start with "Log a symptom". The backend resumes the account's active draft. Render each symptom_question and submit {action: "answer_symptom", language, id, step, value}. Onset and change determine later questions. For example, a recurring symptom prompts the user to describe when it returns. Optional notes accept an empty string. The questions collect what the user noticed for their own record and a professional conversation.

At review_symptom, show the draft before sending {action: "save_symptom", language, id}. The server converts the draft into a single observation in one transaction. Retrying a successful save returns the same observation ID. Cancel with {action: "cancel_symptom", language, id}. A chat symptom draft is included in account export and removed by account deletion.

## Next action

The response includes a stable action ID, explanation, sources and a policy version. While intake is incomplete, complete_intake directs the user back into chat. Once confirmed, a current saved concern or relevant self-reported history can surface contact_professional. A saved self-check can surface review_body_awareness. Otherwise review_screening links to official information and the user's screening provider. These are support and navigation actions. No individual scan, screening interval, eligibility, diagnosis or treatment is inferred. Explicit emergency wording receives the separate emergency response and should be shown before the persistent next-action card.

The server controls question branching and saves. The intake and symptom conversations never call a model: their answers save without a provider call, and private context and drafts are never part of any request to a provider. A model can write the answer to a general education question from public passages, and a provider can order public ids. [Chat and the AI assistant](chat.md) says which three uses exist and exactly what each sends. The frontend should render these payloads as chat cards and use the backend-confirmed state when showing saved progress.

## Conversation direction

Render interaction as the active question when present. Use priority for the persistent action card and conversationFocus for the assistant's suggested continuation. suggestedTopics contains up to three alternatives with localized labels. A request with action or message can be posted to /api/chat. A request with open is a client navigation instruction. Emergency responses take precedence over every card.

When CHAT_PROVIDER is gemini, Gemini orders an allowlist of public follow-up IDs for each reply to a chat message, except an emergency, a request to log a symptom and the interactive journeys. Only ids are sent, never text from a person. directorProvider and directorFallback describe that operation independently of the provider that wrote the answer. When a model did write the answer, the follow-up questions it proposed come right after conversationFocus in suggestedTopics, ahead of the director's other suggestions, and suggestedTopics then holds up to six. Account details stay on the server. The pinned priority comes from the versioned navigation rules. Interactive answers save without a provider call.
