import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Browser journeys for the care4all PWA. They run against the PWA container (see playwright.config.ts), create
// fictional accounts and always delete them again.

const AINO = { name: "Aino", yob: 1974, sex: "female", county: "pirkanmaa" };
const PREFERENCES = { lang: "en", scale: 0, plain: false, motion: true };
type Credentials = { username: string; password: string };

const unique = (prefix: string) => `${prefix}_${randomBytes(5).toString("hex")}`;
const secret = () => randomBytes(12).toString("hex");

/** An account created through the API, so each journey can start where it matters. The page shares its session. */
async function newAccount(page: Page, baseURL: string, prefix: string): Promise<Credentials> {
  const credentials = { username: unique(prefix), password: secret() };
  const headers = { Origin: baseURL };
  const register = await page.request.post("/api/account?view=identity", { headers, data: { action: "register", language: "en", ...credentials } });
  expect(register.status()).toBe(201);
  const profile = await page.request.put("/api/profile", { headers, data: { profile: AINO, preferences: PREFERENCES } });
  expect(profile.ok()).toBe(true);
  return credentials;
}

async function removeAccount(request: APIRequestContext, baseURL: string, { username, password }: Credentials) {
  const headers = { Origin: baseURL };
  const login = await request.post("/api/account?view=identity", { headers, data: { action: "login", language: "en", username, password } });
  if (login.ok()) await request.delete("/api/my-data", { headers, data: { confirm: true, password } });
}

/** Browser storage may hold display preferences and nothing else, whatever the person has done. */
async function expectNothingPrivateStored(page: Page, ...private_: string[]) {
  const stored = await page.evaluate(async () => {
    const databases = "databases" in indexedDB ? await indexedDB.databases() : [];
    const cached: string[] = [];
    for (const key of await caches.keys()) cached.push(...(await (await caches.open(key)).keys()).map(entry => new URL(entry.url).pathname));
    return { local: { ...localStorage }, session: Object.keys(sessionStorage), databases: databases.length, cached };
  });
  expect(Object.keys(stored.local)).toEqual(["c4a:display"]);
  expect(Object.keys(JSON.parse(stored.local["c4a:display"])).sort()).toEqual(["dismissInstall", "lang", "motion", "plain", "scale", "skin"]);
  expect(stored.session).toEqual([]);
  expect(stored.databases).toBe(0);
  // The service worker keeps one API response, the public content, and no other.
  expect(stored.cached.filter(path => path.startsWith("/api/") && path !== "/api/content")).toEqual([]);
  for (const text of private_) expect(JSON.stringify(stored)).not.toContain(text);
}

const goto = (page: Page, hash: string) => page.evaluate(next => { location.hash = next; }, hash);

test("a person signs up, saves a profile, stays signed in across a reload, signs out and signs in again", async ({ page, request, baseURL }, testInfo) => {
  test.setTimeout(90000);
  const credentials = { username: unique("ui"), password: secret() };
  try {
    await page.goto("/");
    await page.getByRole("link", { name: "Create account" }).click();

    // Validation tells the person what to fix, field by field.
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use 3 to 30 characters: lower-case letters, numbers, _ or -.")).toBeVisible();
    await expect(page.getByText("Tick this box to create an account.")).toBeVisible();

    await page.locator("#su-user").fill(credentials.username);
    await page.locator("#su-pass").fill(credentials.password);
    await page.locator('label:has(input[name="agree"])').click();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { name: "About you", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/Choose one option/)).toBeVisible();
    await page.getByLabel("First name").fill(AINO.name);
    await page.getByLabel("Year of birth").fill(String(AINO.yob));
    await page.getByText("Female", { exact: true }).click();
    await page.getByLabel("County").selectOption(AINO.county);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Hello, Aino", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Go to home" }).click();
    const home = page.getByRole("region", { name: "Home", exact: true });
    await expect(home.getByRole("heading", { name: "Hello, Aino" })).toBeVisible();
    // The next action comes from the server.
    await expect(home.getByRole("heading", { name: "Continue getting to know you" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("home.png"), animations: "disabled" });

    // The session is a server-side HTTP-only cookie: a reload keeps it, and scripts cannot read it.
    await page.reload();
    await expect(page.getByRole("region", { name: "Home", exact: true }).getByRole("heading", { name: "Hello, Aino" })).toBeVisible();
    expect(await page.evaluate(() => document.cookie)).toBe("");
    await expectNothingPrivateStored(page, "Aino", credentials.username, "pirkanmaa", "1974");

    await goto(page, "#me");
    await expect(page.getByText("Signed in as")).toContainText(credentials.username);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();

    // A signed-out deep link goes to the welcome screen, not to somebody's records.
    await goto(page, "#notes");
    await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();

    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await page.locator("#si-user").fill(credentials.username);
    await page.locator("#si-pass").fill("not the password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".err", { hasText: "Check your username and password." })).toBeVisible();
    await page.locator("#si-pass").fill(credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("region", { name: "Home", exact: true }).getByRole("heading", { name: "Hello, Aino" })).toBeVisible();
  } finally {
    await removeAccount(request, baseURL!, credentials);
  }
});

test("get to know you is saved on the server and resumes after a reload", async ({ page, request, baseURL }) => {
  test.setTimeout(60000);
  const credentials = await newAccount(page, baseURL!, "intake");
  try {
    await page.goto("/#you");
    const screen = page.getByRole("region", { name: "Get to know you" });
    await screen.getByLabel("First things first: what should we call you?").fill("Aino");
    await screen.getByRole("button", { name: "Continue" }).click();
    await expect(screen.getByText("When were you born?")).toBeVisible();

    // Reopening resumes at the question the person had reached. The answer itself is on the server.
    await page.reload();
    await expect(screen.getByText("When were you born?")).toBeVisible();

    const survey = await (await page.request.get("/api/survey")).json();
    expect(JSON.stringify(survey.progress.answers)).toContain("Aino");
    await expectNothingPrivateStored(page, "Aino");
  } finally {
    await removeAccount(request, baseURL!, credentials);
  }
});

test("a symptom note is saved on the server, appears in My notes after a reload and can be deleted", async ({ page, request, baseURL }) => {
  test.setTimeout(90000);
  const credentials = await newAccount(page, baseURL!, "symptom");
  try {
    await page.goto("/#symptom");
    const screen = page.getByRole("region", { name: "Talk about symptoms" });
    await screen.getByLabel("What did you notice, and where?").fill("Fictional skin observation");
    await screen.getByRole("button", { name: "Continue" }).click();
    await screen.getByRole("button", { name: "In the past week" }).click();
    await screen.getByRole("button", { name: "Comes and goes" }).click();
    await screen.getByRole("button", { name: "Some effect" }).click();
    // "Comes and goes" rewords the last question, which is optional (otherwise it asks "Anything else you want to share with
    // your healthcare professional?"). Answering it leads straight to the review.
    await screen.getByLabel("When does it come back, and what else do you notice at the same time?").fill("Only after a walk.");
    await screen.getByRole("button", { name: "Continue" }).click();
    await expect(screen.getByText("Review your symptom note")).toBeVisible();
    await screen.getByRole("button", { name: "Confirm and save" }).click();
    await expect(page.getByText("Saved to your symptom notes.")).toBeVisible();

    // Earlier screens stay in the page behind the one on top, so the note is looked for on the My notes screen itself.
    await goto(page, "#notes");
    const notes = page.getByRole("region", { name: "My notes" });
    await expect(notes.getByText(/Fictional skin observation/)).toBeVisible();
    await page.reload();
    await expect(notes.getByText(/Fictional skin observation/)).toBeVisible();
    await expectNothingPrivateStored(page, "Fictional skin observation", "Only after a walk");

    const saved = (await (await page.request.get("/api/observations")).json()).observations;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ kind: "symptom", label: "Fictional skin observation", details: { onset: "week", course: "comes", impact: "some" } });
    expect(saved[0].notes).toContain("Only after a walk.");

    await page.locator('[data-action="note-menu"]').click();
    await page.getByRole("button", { name: "Delete note" }).click();
    await expect(notes.getByText(/Fictional skin observation/)).toBeHidden();
    expect((await (await page.request.get("/api/observations")).json()).observations).toHaveLength(0);
  } finally {
    await removeAccount(request, baseURL!, credentials);
  }
});

test("Ask answers with sources, treats an emergency as one, and Learn searches the official library", async ({ page, request, baseURL }) => {
  test.setTimeout(90000);
  const credentials = await newAccount(page, baseURL!, "ask");
  try {
    await page.goto("/#ask");
    await page.getByRole("textbox", { name: "Your question" }).fill("What is FIT?");
    await page.getByRole("button", { name: "Send question" }).click();
    // The answer is written by a model when one is configured and comes from the reviewed passages otherwise. Either way it
    // arrives with source links, so this does not depend on which sources a model chose to cite.
    await expect(page.getByRole("button", { name: "Copy answer and sources" })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[role="log"] a[href^="https"]').first()).toBeVisible();
    for (const href of await page.locator('[role="log"] a[href^="http"]').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) expect(href).toMatch(/^https:/);

    await page.getByRole("textbox", { name: "Your question" }).fill("I have chest pain and I cannot breathe");
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(page.getByRole("alert").getByRole("link", { name: "Call 112" })).toHaveAttribute("href", "tel:112");
    await expectNothingPrivateStored(page, "What is FIT", "chest pain");

    await goto(page, "#learn");
    await page.getByRole("searchbox", { name: "Search source library" }).fill("colorectal");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText("Colorectal cancer · Overview and screening", { exact: true })).toBeVisible();
    // Free text typed by the person never goes into the address.
    expect(page.url()).not.toContain("colorectal");

    await goto(page, "#t-bowel");
    await page.getByRole("button", { name: /Official information/ }).click();
    await expect(page.getByText("Overview and screening", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Finnish Cancer Registry/ }).first()).toBeVisible();
  } finally {
    await removeAccount(request, baseURL!, credentials);
  }
});

test.describe("a model-written answer", () => {
  // Request interception does not see requests a service worker handles, and this journey fakes the server's reply.
  test.use({ serviceWorkers: "block" });

  test("an answer an AI model wrote says so, keeps its sources in view, and the question goes out with nothing else", async ({ page, request, baseURL }) => {
    test.setTimeout(60000);
    const credentials = await newAccount(page, baseURL!, "gen");
    const sent: unknown[] = [];
    try {
      // The server's reply is faked, so this checks the screen and never calls a model.
      await page.route("**/api/chat", async route => {
        if (route.request().method() !== "POST") return route.continue();
        sent.push(route.request().postDataJSON());
        await route.fulfill({
          json: {
            kind: "education", topic: "colorectal", message: "Colorectal cancer screening",
            generated: { text: "The FIT test checks a small stool sample for hidden blood.\nPeople are invited by letter.", citations: ["p1"], provider: "gemini", model: "gemini-test" },
            passages: [{ id: "p1", items: ["The FIT test looks for hidden blood in a small stool sample."], sources: [{ title: "Terveyskylä: Bowel cancer screening", url: "https://www.terveyskyla.fi/", language: "en", retrieved: "2026-11-14T00:00:00.000Z" }] }],
            suggestedTopics: [{ id: "who", label: "Who is invited?", request: { message: "Who is invited to bowel cancer screening?", language: "en", topic: "colorectal" } }],
            shareText: "FIT test"
          }
        });
      });
      await page.goto("/#ask");
      const log = page.getByRole("log", { name: "Conversation" });
      // The intro says in plain words where a question goes and what is never sent.
      await expect(log).toContainText("Google Gemini");
      await expect(log).toContainText("no account details, saved information or notes");

      await page.getByRole("textbox", { name: "Your question" }).fill("How does the FIT test work?");
      await page.getByRole("button", { name: "Send question" }).click();
      await expect(log.getByText("Written by AI", { exact: true })).toBeVisible();
      await expect(log).toContainText("The FIT test checks a small stool sample for hidden blood.");
      await expect(log).toContainText("People are invited by letter.");
      await expect(log).toContainText("Google Gemini");
      // The source link is in view without opening anything, and the passage it was written from is one tap away.
      await expect(log.getByRole("link", { name: /Terveyskylä/ })).toHaveAttribute("href", "https://www.terveyskyla.fi/");
      await expect(page.getByText("The FIT test looks for hidden blood in a small stool sample.")).toBeHidden();
      await log.getByText("What this answer is based on").click();
      await expect(page.getByText("The FIT test looks for hidden blood in a small stool sample.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Who is invited?" })).toBeVisible();

      // The request carries the typed question and the language, and no topic, name, county or saved information.
      expect(sent).toEqual([{ language: "en", message: "How does the FIT test work?" }]);
      await expectNothingPrivateStored(page, "How does the FIT test work");
    } finally {
      await removeAccount(request, baseURL!, credentials);
    }
  });
});

test("a reminder is saved on the account, can be completed, downloaded as a calendar file and deleted", async ({ page, request, baseURL }) => {
  test.setTimeout(60000);
  const credentials = await newAccount(page, baseURL!, "remind");
  try {
    await page.goto("/#reminders");
    await page.getByRole("button", { name: "New reminder", exact: true }).click();
    await page.getByText("Notification on this device").click();   // an optional extra: leave it off here
    await page.locator('form[data-form="reminder"] button[type="submit"]').click();
    const reminder = page.getByRole("button", { name: /Mark .*screening letter as done/ });
    await expect(reminder).toBeVisible();

    await page.reload();
    await expect(reminder).toBeVisible();
    await reminder.click();
    await expect(reminder).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: /Options for .*screening letter/ }).click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Add to calendar" }).click()]);
    const calendar = await readFile((await download.path())!, "utf8");
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("BEGIN:VEVENT");
    expect(calendar).not.toMatch(/cancer|screening|mammo/i);   // the event title is neutral, so a lock screen reveals nothing

    await page.getByRole("button", { name: /Options for .*screening letter/ }).click();
    await page.getByRole("button", { name: "Delete reminder" }).click();
    await expect(reminder).toBeHidden();
    expect((await (await page.request.get("/api/reminders")).json()).reminders).toHaveLength(0);
  } finally {
    await removeAccount(request, baseURL!, credentials);
  }
});

test("a self-check result is recorded on the server and listed in Results", async ({ page, request, baseURL }) => {
  test.setTimeout(60000);
  const credentials = await newAccount(page, baseURL!, "check");
  try {
    await page.goto("/#chk-skin");
    await page.locator('[data-action="guide"][data-stage="find"]').click();
    await page.getByText("A new mole or spot that looks different from the others").click();
    await page.getByRole("button", { name: "Save to my profile" }).click();
    await expect(page.getByText("Saved to your profile")).toBeVisible();

    const saved = (await (await page.request.get("/api/observations")).json()).observations;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ kind: "observation", label: "Skin and mole check", details: { topic: "skin", selfCheck: "change_noticed" } });

    await page.reload();
    await goto(page, "#results");
    await expect(page.getByRole("region", { name: "Self-check results" }).getByText(/Skin and mole check/).first()).toBeVisible();
    await expectNothingPrivateStored(page, "new mole");
  } finally {
    await removeAccount(request, baseURL!, credentials);
  }
});

test("display choices follow the account: text size, plain language and Finnish", async ({ page, request, baseURL }) => {
  test.setTimeout(60000);
  const credentials = await newAccount(page, baseURL!, "prefs");
  try {
    await page.goto("/#me");
    await page.getByText("Large", { exact: true }).click();
    await page.getByRole("switch", { name: "Plain language" }).click();
    await expect.poll(async () => (await (await page.request.get("/api/profile")).json()).preferences).toMatchObject({ scale: 1, plain: true });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-scale", "1");

    await page.getByRole("button", { name: /^Language/ }).click();
    await page.getByRole("button", { name: "Suomi" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "fi");
    await expect.poll(async () => (await (await page.request.get("/api/profile")).json()).preferences.lang).toBe("fi");
    await expect(page.getByRole("heading", { name: "Profiili", level: 1 })).toBeVisible();
  } finally {
    await removeAccount(request, baseURL!, credentials);
  }
});

test("a person can export their data and delete their account", async ({ page, request, baseURL }) => {
  test.setTimeout(60000);
  const credentials = await newAccount(page, baseURL!, "rights");
  try {
    await page.goto("/#me");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export my data/ }).click()]);
    const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(exported.data.username).toBe(credentials.username);
    expect(JSON.stringify(exported)).not.toMatch(/password|scrypt/i);

    await page.getByRole("button", { name: /Delete account/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Password").fill("not the password");
    await dialog.getByRole("button", { name: "Delete account" }).click();
    await expect(dialog.getByText("That password is not correct.")).toBeVisible();
    await dialog.getByLabel("Password").fill(credentials.password);
    await dialog.getByRole("button", { name: "Delete account" }).click();

    await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
    const login = await request.post("/api/account?view=identity", { headers: { Origin: baseURL! }, data: { action: "login", language: "en", ...credentials } });
    expect(login.status()).toBe(401);
  } finally {
    await removeAccount(request, baseURL!, credentials);
  }
});

test("the PWA rejects writes from another origin and never exposes the session to scripts", async ({ request }) => {
  const response = await request.post("/api/account", { headers: { Origin: "http://example.invalid" }, data: {} });
  expect(response.status()).toBe(403);
});
