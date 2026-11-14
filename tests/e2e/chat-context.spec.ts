import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { freshProgress } from "../../src/lib/intake/progress";

test("chat uses private account context and returns a safe copy with citations", async ({ request, baseURL, playwright }) => {
  const headers = { Origin: baseURL! };
  const other = await playwright.request.newContext({ baseURL });
  const password = randomBytes(16).toString("hex");
  const register = (client: typeof request) => client.post("/api/account?view=identity", {
    headers, data: { action: "register", username: "context_" + randomBytes(8).toString("hex"), password, language: "en" },
  });
  try {
    expect((await register(request)).status()).toBe(201);
    expect((await register(other)).status()).toBe(201);
    const draft = { ...freshProgress("en"), answers: { dob: "1974-01-02", sex: "male", residence: "abroad", cancer_personal: "yes" } };
    expect((await request.put("/api/survey", { headers, data: { progress: draft } })).status()).toBe(200);
    expect((await request.put("/api/profile", { headers, data: {
      profile: { name: "Fictional name", yob: 1974, sex: "male", county: "other" },
      preferences: { lang: "en", scale: 0, plain: false, motion: true },
    } })).status()).toBe(200);
    expect((await request.post("/api/observations", { headers, data: {
      kind: "observation", label: "Fictional private change", notes: "Private notes", details: { topic: "skin", selfCheck: "change_noticed" },
    } })).status()).toBe(201);
    const question = { headers, data: { message: "What should I ask at my appointment?", language: "en" } };
    const response = await request.post("/api/chat", question);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const reply = await response.json();
    expect(reply.patientContext.demographics.birthYear).toBe(1974);
    expect(reply.patientContext.survey).toEqual(expect.arrayContaining([expect.objectContaining({ chapter: "health" })]));
    expect(reply.patientContext.observations[0]).toMatchObject({ label: "Fictional private change", selfCheck: "change_noticed" });
    expect(reply.questionsForProfessional.length).toBeGreaterThan(1);
    expect(reply.nextSteps[0].items[0]).toContain("local healthcare");
    expect(reply.shareText).toMatch(/\[\d+\].+https:\/\//);
    expect(reply.shareText).not.toMatch(/Fictional|Private notes|1974/);

    const isolated = await (await other.post("/api/chat", question)).json();
    expect(isolated.patientContext.observations).toEqual([]);
    expect(isolated.patientContext.demographics.birthYear).toBeNull();
    const followUp = await (await request.post("/api/chat", { headers, data: { message: "And possible symptoms?", language: "en" } })).json();
    expect(followUp.topic).toBe("skin");
    expect(followUp.passages[0].sources[0].tier).toBe("finland");
  } finally {
    for (const client of [request, other]) await client.delete("/api/my-data", { headers, data: { confirm: true, password } });
    await other.dispose();
  }
});
