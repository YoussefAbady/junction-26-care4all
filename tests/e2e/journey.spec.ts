import { expect, test, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

// This journey drives the backend's own Next.js interface at "/", which the PWA replaced as the entry point.
// Run it against a backend whose APP_ORIGIN is its own address:  $env:LEGACY_UI_URL='http://localhost:3000'
test.skip(!process.env.LEGACY_UI_URL, "Targets the backend's built-in interface. Set LEGACY_UI_URL to run it.");
test.use({ baseURL: process.env.LEGACY_UI_URL });

/** Fills in whatever the current question asks for, with the simplest valid answer. */
async function answerCurrent(page: Page) {
  const form = page.locator("form.qcard");
  for (const box of await form.locator("input.input:not(.input--number):not([type=checkbox]), textarea.input").all()) {
    if (!(await box.inputValue())) await box.fill("x");
  }
  for (const select of await form.locator("select.input").all()) if (!(await select.inputValue())) await select.selectOption({ index: 1 });
  for (const box of await form.locator(".numberbox").all()) {
    const field = box.locator("input");
    if (await field.inputValue()) continue;
    const increase = box.getByRole("button", { name: /Increase|Lisää/ });
    if (await increase.count()) await increase.click();
    else await field.fill("2020");
  }
  for (const group of await form.getByRole("radiogroup").all()) {
    if ((await group.getByRole("radio", { checked: true }).count()) === 0) await group.getByRole("radio").first().check();
  }
  for (const group of await form.locator("[role=group]:has(input[type=checkbox]):not(.bodymap)").all()) {
    if ((await group.getByRole("checkbox", { checked: true }).count()) === 0) await group.getByRole("checkbox").first().check();
  }
  if (await form.locator(".bodymap__spot").count()) await form.locator(".bodymap__spot").first().click();
}

test("signs up, meets a safety alert, saves and resumes in Finnish, then finishes with a summary", async ({ page }) => {
  test.setTimeout(120000);
  const username = "survey_" + randomBytes(5).toString("hex");
  const password = randomBytes(16).toString("hex");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("care team");
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Create profile and begin" }).click();

  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByRole("textbox", { name: /what should we call you/i }).fill("Aino");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "About you", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // An adult-only questionnaire, and real dates only.
  await page.getByLabel("Day").fill("15");
  await page.getByLabel("Month").selectOption("6");
  await page.getByLabel("Year").fill("2015");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("adults");
  await page.getByLabel("Year").fill("1992");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("answer");
  await page.getByRole("radio", { name: "Female" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Prefer not to say" }).click(); // gender
  await expect(page.getByRole("heading", { level: 1 })).toContainText("pregnant");
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Height", { exact: true }).fill("168");
  await page.getByLabel("Weight", { exact: true }).fill("64");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /steady/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Elsewhere in Finland" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: /A symptom or something that worries me/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: "Breathing or chest pain" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: "Chest pain or pressure right now" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Please get help right now" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 112" })).toHaveAttribute("href", "tel:112");
  await page.getByRole("button", { name: "I am safe, continue" }).click();
  await expect(page.getByRole("heading", { name: "Is it worse when you lie flat?" })).toBeVisible();

  await page.getByRole("button", { name: "Save and exit" }).click();
  await expect(page.getByRole("heading", { name: "Create your free profile" })).toBeVisible();
  await page.getByRole("button", { name: "Suomi" }).click();
  await page.getByRole("button", { name: "Onko sinulla jo profiili? Kirjaudu sisään" }).click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Kirjaudu sisään", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fi");
  await expect(page.getByRole("heading", { name: "Pahenevatko oireet makuuasennossa?" })).toBeVisible();

  for (let guard = 0; guard < 120; guard++) {
    if (await page.getByRole("heading", { name: "Tarkistetaan vastauksesi" }).isVisible()) break;
    if (await page.locator("section.chapter").isVisible()) { await page.getByRole("button", { name: "Jatka" }).click(); continue; }
    if (await page.getByRole("alertdialog").isVisible()) { await page.getByRole("alertdialog").getByRole("button").last().click(); continue; }
    await answerCurrent(page);
    await page.getByRole("button", { name: "Jatka" }).click();
    await page.waitForTimeout(40);
  }
  await expect(page.getByRole("heading", { name: "Tarkistetaan vastauksesi" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Valmis, näytä yhteenveto/ })).toBeDisabled();
  await page.getByRole("checkbox", { name: /^Olen tarkistanut vastaukseni/ }).check();
  await page.getByRole("button", { name: /Valmis, näytä yhteenveto/ }).click();
  await expect(page.getByRole("heading", { name: "Valmista, Aino!" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Valmista, Aino!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kannattaa ottaa puheeksi hoitajan tai lääkärin kanssa" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const response = await page.request.get("/api/account");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/Aino|1992|chest/i);
});

test("the landing page is readable and navigable at every text size", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Extra large text size" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text", "xl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "How your data is handled" }).first().click();
  await expect(page.getByRole("heading", { name: "How your data is handled" })).toBeVisible();
});
