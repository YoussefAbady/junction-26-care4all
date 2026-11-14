import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";

test("chat intake resumes and symptom follow-up saves one reviewed observation", async ({ request, baseURL, playwright }) => {
  const headers = { Origin: baseURL! };
  const other = await playwright.request.newContext({ baseURL });
  const password = randomBytes(16).toString("hex");
  async function register(client: typeof request) {
    return client.post("/api/account?view=identity", { headers, data: {
      action: "register", username: "journey_" + randomBytes(8).toString("hex"), password, language: "en",
    } });
  }
  const chat = (data: object, client = request) => client.post("/api/chat", { headers, data: { language: "en", ...data } });
  const get = async (data: object) => {
    const response = await chat(data);
    expect(response.status()).toBe(200);
    return response.json();
  };
  try {
    expect((await register(request)).status()).toBe(201);
    expect((await register(other)).status()).toBe(201);
    const pending = await (await request.get("/api/chat/next-action")).json();
    expect(pending.nextAction.id).toBe("complete_intake");
    const first = await get({ message: "Get to know me" });
    expect(first.interaction).toMatchObject({ type: "intake_question", id: "name" });
    const answer = { action: "answer_intake", revision: first.interaction.revision, questionId: "name", value: "Fictional Aino" };
    expect((await get(answer)).interaction.id).toBe("dob");
    expect((await chat(answer)).status()).toBe(409);
    expect((await get({ action: "start_intake" })).interaction.id).toBe("dob");

    let result = await get({ message: "Log a symptom" });
    const id = result.interaction.id;
    expect(result.interaction.step).toBe("label");
    expect((await chat({ action: "answer_symptom", id, step: "label", value: "Private draft" }, other)).status()).toBe(404);
    expect((await chat({ action: "save_symptom", id })).status()).toBe(400);
    const emergency = await get({ action: "answer_symptom", id, step: "label", value: "I cannot breathe" });
    expect(emergency.kind).toBe("emergency");
    expect(emergency.action.phone).toBe("112");
    for (const [step, value] of [["label", "Fictional skin change"], ["onset", "week"], ["course", "comes"], ["impact", "some"], ["notes", "After a walk"]]) {
      expect(result.interaction.step).toBe(step);
      result = await get({ action: "answer_symptom", id, step, value });
    }
    expect(result.interaction.type).toBe("review_symptom");
    expect((await (await request.get("/api/observations")).json()).observations).toEqual([]);
    expect((await get({ action: "save_symptom", id })).interaction.type).toBe("symptom_saved");
    await get({ action: "save_symptom", id });
    const { observations } = await (await request.get("/api/observations")).json();
    expect(observations).toHaveLength(1);
    expect(observations[0].details).toMatchObject({ onset: "week", course: "comes", impact: "some" });
    expect((await get({ message: "What is FIT?" })).nextAction.id).toBe("complete_intake");
  } finally {
    for (const client of [request, other]) await client.delete("/api/my-data", { headers, data: { confirm: true, password } });
    await other.dispose();
  }
});
