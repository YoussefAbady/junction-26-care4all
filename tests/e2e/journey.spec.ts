import { expect, test, type Page } from "@playwright/test";

async function start(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start demo journey" }).click();
  await page.getByRole("button", { name: new RegExp(name) }).click();
}
async function nav(page: Page, desktop: string, mobile = desktop) {
  const bottom = page.getByRole("navigation", { name: "Mobile care workspace" });
  if (await bottom.isVisible()) await bottom.getByRole("button", { name: mobile, exact: true }).click();
  else await page.getByRole("navigation", { name: "Care workspace", exact: true }).getByRole("button", { name: desktop, exact: true }).click();
}
async function pick(page: Page, answer: string) {
  await page.getByRole("radio", { name: answer, exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test("adaptive profile saves, resumes, and reviews answers", async ({ page }) => {
  await start(page, "Aino");
  await pick(page, "Symptoms");
  await expect(page.getByText("Question 2 of 6")).toBeVisible();
  await page.getByRole("radio", { name: "I don’t know" }).check();
  await page.getByRole("button", { name: "Save and exit" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Set up care profile" }).click();
  await expect(page.getByRole("radio", { name: "I don’t know" })).toBeChecked();
  for (const answer of ["I don’t know", "No", "Symptoms present", "Elsewhere in Finland", "English"]) await pick(page, answer);
  await expect(page.getByText("Review your answers")).toBeVisible();
  await page.getByRole("button", { name: "Finish profile" }).click();
  await expect(page.getByRole("heading", { name: "Prepare for a GP conversation" })).toBeVisible();
});

test("symptoms, session ownership, GP brief and demo reset", async ({ page, browser, baseURL }) => {
  await start(page, "Mika");
  await nav(page, "Symptoms");
  await page.getByRole("button", { name: "Log a symptom" }).click();
  await page.getByLabel("Symptom", { exact: true }).fill("Fictional discomfort");
  await page.getByLabel("Onset date").fill("2026-10-03");
  await page.getByLabel("Duration").fill("Two days");
  await page.getByRole("button", { name: "Save symptom" }).click();
  await page.getByRole("button", { name: "Edit Fictional discomfort" }).click();
  await page.getByLabel("Notes").fill("After lunch");
  await page.getByRole("button", { name: "Save symptom" }).click();
  await expect(page.getByText("After lunch")).toBeVisible();

  const owner = (await (await page.request.get("/api/demo")).json()).state;
  const isolated = await browser.newContext({ baseURL });
  try {
    expect((await (await isolated.request.get("/api/demo")).json()).state).toBeNull();
    const headers = { Origin: baseURL! };
    const response = await isolated.request.post("/api/demo", { headers, data: { profile: "aino" } });
    expect(response.status()).toBe(201);
    const edit = await isolated.request.post("/api/demo", { headers, data: { revision: 0, change: { kind: "symptom", id: owner.symptoms[0].id, value: owner.symptoms[0] } } });
    expect(edit.status()).toBe(422);
  } finally { await isolated.close(); }

  await nav(page, "GP brief");
  await page.getByLabel("Sample record").selectOption("letter");
  await page.getByRole("button", { name: "Add reviewed extract" }).click();
  await expect(page.getByText("Fictional screening service: FIT sample received on 6 October 2026.").last()).toBeVisible();
  await expect(page.getByText(/Fictional discomfort · Present · Onset 2026-10-03 · Duration Two days/)).toBeVisible();
  await page.getByRole("button", { name: "Generate AI summary" }).click();
  await expect(page.getByText(/Demo AI · Patient-reported/)).toBeVisible();
  await page.getByLabel("Questions", { exact: true }).fill("Who should I call about the letter?");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeEnabled();
  await page.getByRole("banner").getByRole("button", { name: "Care profile", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Delete demo data" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Care4All." })).toBeVisible();
  expect((await (await page.request.get("/api/demo")).json()).state).toBeNull();
});

test("offline save retains input and only public assets are cached", async ({ page, context }) => {
  await start(page, "Mika");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome, Mika." })).toBeVisible();
  const cached = await page.evaluate(async () => {
    const cache = await caches.open("care4all-public-v1");
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  });
  expect(cached.sort()).toEqual(["/care-192.png", "/care-512.png", "/care-apple.png", "/care-hero.webp", "/care-maskable.png", "/offline.html"]);
  await nav(page, "Symptoms");
  await page.getByRole("button", { name: "Log a symptom" }).click();
  await page.getByLabel("Symptom", { exact: true }).fill("Offline draft");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save symptom" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("weren’t saved");
  await expect(page.getByLabel("Symptom", { exact: true })).toHaveValue("Offline draft");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Save symptom" }).click();
  await expect(page.getByText("Offline draft", { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Care4All is offline" })).toBeVisible();
});

test("layout stays within the viewport and kit and follow-up flows save", async ({ page }, testInfo) => {
  await start(page, "Leena");
  await expect(page.getByRole("heading", { name: "Welcome, Leena." })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await nav(page, "Home sampling", "Sampling");
  await page.getByLabel("Kit stage").selectOption("Invalid sample");
  await page.getByRole("button", { name: "Save kit progress" }).click();
  await expect(page.getByText("Saved stage · Invalid sample")).toBeVisible();
  await nav(page, "GP brief");
  await page.getByLabel("Sample record").selectOption("care");
  await page.getByRole("button", { name: "Add reviewed extract" }).click();
  await expect(page.getByText("Saved to your demo session.")).toBeVisible();
  await nav(page, "Follow-up");
  await expect(page.getByText("Unlocked by the reviewed fictional clinician note.")).toBeVisible();
  await page.getByLabel("Follow-up stage").selectOption("Could not get an appointment");
  await page.getByRole("button", { name: "Save follow-up" }).click();
  await expect(page.getByText("Saved stage · Could not get an appointment")).toBeVisible();
});
