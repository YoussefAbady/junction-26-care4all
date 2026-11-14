import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";

test("chat gives sourced information and observations are saved only on explicit request", async ({ request, playwright, baseURL }) => {
  const headers = { Origin: baseURL! };
  const input = { message: "How is the FIT sample tested in a laboratory?", language: "en" };
  expect((await request.post("/api/chat", { headers, data: input })).status()).toBe(401);
  const register = (client: typeof request) => client.post("/api/account?view=identity", {
    headers, data: { action: "register", username: "chat_" + randomBytes(8).toString("hex"), password: randomBytes(16).toString("hex"), language: "en" },
  });
  expect((await register(request)).status()).toBe(201);
  const response = await request.post("/api/chat", { headers, data: input });
  expect(response.headers()["cache-control"]).toContain("no-store");
  const reply = await response.json();
  expect(reply.kind).toBe("education");
  // A model-written answer cites the passages it used and the reviewed answer cites its own, so which source comes first is not fixed.
  expect(reply.passages[0].sources[0].url).toMatch(/^https:\/\//);
  expect((await (await request.post("/api/chat", { headers, data: { ...input, mode: "observation" } })).json()).action.type).toBe("open_observation");
  expect((await (await request.get("/api/observations")).json()).observations).toEqual([]);

  const saved = await request.post("/api/observations", { headers, data: { kind: "symptom", label: "Fictional observation" } });
  expect(saved.status()).toBe(201);
  const { observation } = await saved.json();
  const other = await playwright.request.newContext({ baseURL });
  try {
    expect((await register(other)).status()).toBe(201);
    expect((await (await other.get("/api/observations")).json()).observations).toEqual([]);
    expect((await other.delete("/api/observations", { headers, data: { id: observation.id } })).status()).toBe(404);
    expect((await request.delete("/api/observations", { headers, data: { id: observation.id } })).status()).toBe(200);
    expect((await (await request.get("/api/observations")).json()).observations).toEqual([]);
  } finally { await other.dispose(); }
});
