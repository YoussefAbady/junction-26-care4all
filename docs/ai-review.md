# The AI risk-factor review

After the intake, a signed-in person can ask for a short review of the cancer **risk factors** they could raise with a healthcare professional. An AI model reads their saved intake answers, without anything that identifies them, may ask up to three more multiple-choice questions, and then writes the review from public, reviewed passages. It is optional, it needs the person's consent each time, and it is off whenever no model is configured. Whatever goes wrong, the person sees the deterministic output the app already had.

This is a different feature from the [chat](chat.md). The chat never sends intake answers to a model. This one does, with consent, and only the answers described below.

## What is sent to the model

- The language, `en` or `fi`.
- The person's **age in years**, whether they **live in Finland** (yes or no, never where), their **weight band** (under, healthy, over or obese) and their **pack-years**, which are arithmetic on answers.
- **Coded answers**: every answer to a question that is picked from a list or is a number: choices, multi-choices, numbers, years, scales, body regions, and forms and lists whose fields are all of those (for example the cancers in the family: relative, type, age). Each is sent as the question's short English name and the answer's English label. Answers of "not sure", "prefer not to say" and "skip" are left out, and so are answers to questions that are no longer part of the interview.
- The earlier extra questions of this flow and the answer the person chose ("Not sure" when they were not sure).
- For the review only: up to 12 public passages (id, topic, heading, text) that the server found with words for the kinds of risk factor the facts show, such as "smoking tobacco" and "family history". Each has an allow-listed https source, the same rule as the chat.

## What is never sent

- The name, the username, any id, the cookie and the address of the person.
- The **date of birth** (the age is sent instead), the **place of residence** and the county (only `inFinland`).
- **Every free-text answer**, whatever the question: the typed notes, the symptom notes, "something else" boxes, what was tried, the names of medicines, allergies and operations, the details of a genetic test or a pending result, and anything else the person typed. A list that has a typed field, such as medicines, allergies and operations, is not sent at all.
- The exact height and weight (the weight band is sent), and the mood questions, which are not risk factors.

This is enforced in `src/lib/assess/facts.ts` by an allow-list built from the intake registry by **kind of question** that **denies by default**. Only `choice`, `multi`, `number`, `year`, `scale` and `body` answers are sent, and a form or list only when every field is a choice, multi-choice, number or year. `text`, `date` and any kind added later are not sent until someone decides they may be. `tests/assess.test.ts` fills in a fictional person's every typed answer, date of birth and place with unique sentinel strings and proves that none of them is in what the model is sent, while the age and the coded answers are.

## What the model may and may not write

The review names risk factors a person could raise with a professional. It phrases them as "X is a known risk factor for Y" and "you could raise Z with a professional". It never:

- diagnoses, or says whether the person has or may have cancer or any other condition;
- gives a score, a probability, a percentage or a chance, or says "you are at risk" or that the person's risk is high, low, raised or reduced;
- recommends, discourages or doses any treatment or medicine;
- states a number about the person (it says "your age group", "your weight band", "your smoking history"), or any number, date, age, percentage or name that is not in a passage it cites.

The instructions say so, and the server does not rely on that. `src/lib/ai/guard.ts` (`validateAnswer`, with the review's rules from `src/lib/assess/guard.ts`) discards a review unless it is plain text of 20 to 1400 characters (a short list with `- ` lines is allowed) in the requested language, cites one to six of the passages it was given, has every number in a cited passage, and matches none of the claim patterns for diagnosis, reassurance, treatment advice and doses in English and Finnish, nor the personal-risk patterns for scores, probabilities, percentages, "your risk" and "you are at risk". The patterns are a backstop, not a complete list, and they refuse some harmless wording too, in which case the person sees the deterministic output.

An extra question is checked too: a plain-text question of 10 to 160 characters with 2 to 6 options of 1 to 60 characters, in the requested language, with no link and no markup, no request to type or describe anything, no request for a name, an address, a place, a phone number, an id number or an exact date, and no diagnosis or treatment wording. The ids of the options are the server's (`o1` to `o6`), never the model's.

## The endpoint

`POST /api/assess` is for a signed-in person, from the app's own origin, with a JSON body of at most 8 KB. The response is private and `no-store`. It is server-led and stateless: the saved intake answers are read on the server from the account, never from the request.

Request: `{ consent: true, language: "en" | "fi", step: "next" | "review", history: [...] }`.

- `consent` must be `true`. Without it the answer is 400 and nothing is read or sent.
- `history` holds the earlier extra questions, at most 3: `{ q, options: [{ id, label }], a }` with `q` and each `label` at most 200 characters, each `id` at most 40, 2 to 6 options, and `a` the id the person picked, or the literal `"unsure"` for "Not sure", which is not one of the options. It is untrusted data in the prompt. Anything else is 400.

Response, always HTTP 200 once the request is valid:

| `step` | `kind` | Body |
| --- | --- | --- |
| `next` | `question` | `question: { title, options: [{ id, label }] }`. The app adds "Not sure" itself. |
| `next` | `done` | Nothing more to ask, or `history` already holds 3 (no model is called then). |
| `review` | `review` | `generated: { text, citations, provider, model }`, `passages` (the cited passages in the chat's shape, in the order of `citations`, with allow-listed https sources and their `tier`), and `safety: { text, source }` as in the chat. `text` is plain text, one paragraph per line, and lines starting with `- ` are a list. |
| either | `unavailable` | `reason`, and the app shows the deterministic output with a retry. |

`unavailable` covers every failure and is never a 500: `model-off` (no provider chosen or configured), `no-intake` (no answer that may be sent), `rate-limited`, `no-passages`, `unavailable` (the provider failed or timed out), `not-answerable`, and the guard's `invalid-json`, `bad-question`, `ungrounded`, `unsafe-claim` and `bad-format`.

Each model call counts against the account's `AI_RATE_LIMIT` (the same allowance as the chat). A provider call has 12 seconds, and the whole request ends after 20. The Gemini and Verda setup is in [chat](chat.md).

## What care4all keeps

Nothing from this flow is stored. The questions the model asks, the history, the review and the facts are not written to the database, to logs or to browser storage. The backend logs one line per request with the step and a reason code, `assess step=next reason=question`, and one per provider call (`ai provider=gemini outcome=ok ms=2900`). What the provider keeps is governed by the provider's own terms, as for the chat.
