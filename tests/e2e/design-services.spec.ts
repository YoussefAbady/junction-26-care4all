import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";

test("design library supports topic aliases, sourced articles and search", async ({ request }) => {
  const result = await request.get("/api/library?lang=fi&topic=bowel&q=FIT");
  expect(result.status()).toBe(200);
  const library = await result.json();
  expect(library.articles.map((article: { id: string }) => article.id)).toContain("colorectal-homeKit");
  expect(library.sources.some((source: { url: string }) => source.url.includes("cancerregistry.fi"))).toBe(true);
  expect((await (await request.get("/api/library?lang=sv")).json()).language).toBe("en");
  expect((await request.get("/api/library?article=unknown")).status()).toBe(404);
});

test("profile, reminders, structured observations, reports and data rights are account scoped", async ({ request, playwright, baseURL }) => {
  const headers = { Origin: baseURL! };
  const other = await playwright.request.newContext({ baseURL });
  const password = randomBytes(16).toString("hex");
  const register = (client: typeof request) => client.post("/api/account?view=identity", {
    headers, data: { action: "register", username: "design_" + randomBytes(8).toString("hex"), password, language: "en" },
  });
  expect((await request.get("/api/profile")).status()).toBe(401);
  expect((await register(request)).status()).toBe(201);
  try {
    expect((await register(other)).status()).toBe(201);
    const preferences = { lang: "sv", scale: 1, plain: true, motion: false };
    expect((await request.put("/api/profile", { headers, data: { profile: null, preferences } })).status()).toBe(200);
    expect(await (await request.get("/api/profile")).json()).toEqual({ profile: null, preferences });
    const profile = { name: "Fictional Aino", yob: 1974, county: "pirkanmaa", sex: "none" };
    expect((await request.put("/api/profile", { headers, data: { profile, preferences } })).status()).toBe(200);
    expect((await (await other.get("/api/profile")).json()).profile).toBeNull();

    const dueAt = new Date(Date.now() + 3600_000).toISOString();
    const saved = await request.post("/api/reminders", { headers, data: { kind: "letter", topic: "bowel", dueAt } });
    expect(saved.status()).toBe(201);
    const { reminder } = await saved.json();
    expect(reminder.topic).toBe("colorectal");
    expect((await other.get("/api/reminders?calendar=" + reminder.id)).status()).toBe(404);
    const calendar = await request.get("/api/reminders?calendar=" + reminder.id);
    expect(await calendar.text()).toContain("SUMMARY:A note from Care4ll");
    expect(await calendar.text()).not.toContain("colorectal");
    expect((await other.patch("/api/reminders", { headers, data: { id: reminder.id, done: true } })).status()).toBe(404);
    expect((await request.patch("/api/reminders", { headers, data: { id: reminder.id, done: true } })).status()).toBe(200);

    const note = await request.post("/api/observations", { headers, data: {
      kind: "symptom", label: "Fictional note", details: { topic: "skin", symptoms: ["A change"], onset: "week", persistence: "comes" },
    } });
    expect(note.status()).toBe(201);
    expect((await request.post("/api/content-reports", { headers, data: { topic: "skin", message: "Fictional correction" } })).status()).toBe(201);
    const exported = await request.get("/api/my-data");
    expect(exported.headers()["cache-control"]).toContain("no-store");
    const { data } = await exported.json();
    expect(data.profile.profile).toEqual(profile);
    expect(data.observations[0].details.onset).toBe("week");
    expect(data.reminders[0].done).toBe(true);
    expect(data.reports[0].message).toBe("Fictional correction");
    expect(data.password).toBeUndefined();
    expect((await request.delete("/api/my-data", { headers, data: { confirm: true, password: "not-the-password" } })).status()).toBe(403);
    expect((await request.delete("/api/my-data", { headers, data: { confirm: true, password } })).status()).toBe(200);
    expect((await request.get("/api/my-data")).status()).toBe(401);
  } finally {
    await other.delete("/api/my-data", { headers, data: { confirm: true, password } });
    await other.dispose();
  }
});
