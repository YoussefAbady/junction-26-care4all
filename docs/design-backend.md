# Backend handoff for the initial HTML design

The supplied HTML is a standalone reference with simulated data, local storage and sample screening logic. Use the same-origin Care4ll API when wiring the frontend. Authentication, survey progress, chat and data storage belong to the signed-in account. Only non-sensitive display preferences may be stored locally.

| Design interaction | Backend |
| --- | --- |
| Sign-up, sign-in, sign-out | Existing account endpoints. Use the identity view for new clients. |
| About you and Edit profile | GET and PUT /api/profile. PUT accepts {profile, preferences}. Profile is null or {name, yob, sex, county}. Preferences are {lang, scale, plain, motion}. |
| Medical history questionnaire | Existing GET and PUT /api/survey. Survey stays separate from sign-up and the short profile. |
| Browse six cancer cards | GET /api/cancers?lang=en or fi. The design’s bowel ID is accepted as a lookup alias for colorectal. |
| Learn, sources and search | GET /api/library?lang=fi with optional topic, article, and q. Articles and source links are generated from the versioned catalog. Library requests in Swedish return English content with language metadata. |
| Symptoms and guided body awareness | Read the catalog sections. POST /api/observations accepts optional details with topic, symptoms, onset (today/week/weeks/month), persistence (yes/comes/no), or selfCheck (nothing_new/change_noticed). Existing note requests still work. |
| Notes list, copy and delete | GET and DELETE /api/observations. Build copyable text on the client from returned fields. |
| Assistant and suggested questions | POST /api/chat supports all six topics and the bowel alias. Client suggestions can come from the catalog topics and section titles. |
| Reminders | GET /api/reminders returns sorted reminders with a due flag. POST accepts {kind, topic?, dueAt}, where kind is letter, checkin or read, and dueAt is an ISO timestamp with offset. PATCH accepts {id, done}. DELETE accepts {id}. |
| Add to calendar | GET /api/reminders?calendar=UUID downloads a neutral, account-owned calendar event. |
| Report a content problem | POST /api/content-reports accepts {topic?, message}. Saves a private report. The prototype has no staff queue or external delivery. |
| Export and delete my data | GET /api/my-data downloads account data without password hashes or tokens. DELETE accepts {confirm: true, password}, revokes sessions and cascades through account-owned records. |

Send JSON for mutations with the existing same-origin session cookie. Private responses use no-store. Treat prototype data as fictional. The design's raw screening-age and county rules are not used for individual eligibility decisions. The library links to Fimlab's official FIT instructions and 2026 HPV study information. The user's invitation and screening provider remain the source for individual access. The API offers body-awareness material and note outcomes without test interpretation or diagnostic claims.

Reminder delivery is in-app and by calendar export. The design's test notification, install prompt, reader controls, copy action and guide navigation are client capabilities. Device notifications in the reference do not represent background push delivery. Swedish can be stored as a preference. The existing cancer catalog and chat content are English and Finnish.

[Account and survey API](backend-api.md) · [Chat and observations](chat.md)
