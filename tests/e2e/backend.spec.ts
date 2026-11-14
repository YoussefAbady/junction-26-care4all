import { randomBytes } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { freshProgress } from "../../src/lib/intake/progress";

test("catalog is available before sign-in in both languages", async ({ request }) => {
  for (const [lang, name] of [["en", "Breast cancer"], ["fi", "Rintasyöpä"]]) {
    const response = await request.get("/api/cancers?lang=" + lang);
    expect(response.status()).toBe(200);
    const { cancers, language } = await response.json();
    expect(language).toBe(lang);
    expect(cancers.map((cancer: { slug: string }) => cancer.slug)).toEqual(["breast", "colorectal", "cervical", "skin", "prostate", "testicular"]);
    expect(cancers[0].name).toBe(name);
    expect(cancers[0].homeKit.status).toBe("unavailable");
    expect(cancers[1].homeKit.status).toBe("programme_information");
    for (const cancer of cancers) {
      for (const key of ["awareness", "symptoms", "selfExamination", "homeKit", "riskFactors"]) {
        expect(cancer[key].items.length).toBeGreaterThan(0);
        expect(cancer[key].sources[0].url).toMatch(/^https:\/\//);
      }
    }
  }
  expect((await request.get("/api/cancers?lang=sv")).status()).toBe(400);
  expect((await request.get("/api/cancers?slug=unknown")).status()).toBe(404);
});

test("identity, survey ownership, concurrent saves and resume", async ({ request, playwright, baseURL }) => {
  const headers = { Origin: baseURL! };
  const other = await playwright.request.newContext({ baseURL });
  async function register(client: APIRequestContext, credentials: object) {
    const response = await client.post("/api/account?view=identity", { headers, data: { action: "register", ...credentials } });
    expect(response.status()).toBe(201);
    return (await response.json()).account;
  }
  const credentials = () => ({ username: "api_" + randomBytes(8).toString("hex"), password: randomBytes(20).toString("hex"), language: "fi" });
  const first = credentials();
  try {
    expect((await request.get("/api/survey")).status()).toBe(401);
    expect((await request.put("/api/survey", { headers, data: { progress: freshProgress("fi") } })).status()).toBe(401);
    expect(await register(request, first)).toEqual({ username: first.username, language: "fi" });
    await register(other, credentials());
    const get = await request.get("/api/survey");
    expect(get.headers()["cache-control"]).toContain("no-store");
    const { progress } = await get.json();
    expect(progress.answers).toEqual({});
    expect((await request.put("/api/survey", { headers, data: { progress: { ...progress, answers: { invented: true } } } })).status()).toBe(400);
    const save = { headers, data: { progress: { ...progress, answers: { name: "Fictional Aino" } } } };
    const results = await Promise.all([request.put("/api/survey", save), request.put("/api/survey", save)]);
    expect(results.map(result => result.status()).sort()).toEqual([200, 409]);
    expect((await (await other.get("/api/survey")).json()).progress.answers).toEqual({});
    expect((await request.delete("/api/account", { headers })).status()).toBe(200);
    expect((await request.get("/api/survey")).status()).toBe(401);
    const login = await request.post("/api/account?view=identity", { headers, data: { action: "login", ...first } });
    expect(login.status()).toBe(200);
    expect((await login.json()).account).toEqual({ username: first.username, language: "fi" });
    expect((await (await request.get("/api/survey")).json()).progress.answers).toEqual({ name: "Fictional Aino" });
    expect((await (await request.get("/api/account")).json()).account.progress.answers).toEqual({ name: "Fictional Aino" });
  } finally {
    await other.dispose();
  }
});
