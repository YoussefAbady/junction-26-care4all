import { randomUUID } from "node:crypto";
import { z } from "zod";
import { privateJson } from "@/lib/account-session";
import { database } from "@/lib/database";
import { cancerTopic } from "@/lib/design-contract";
import { privateRoute } from "@/lib/private-route";

const input = z.object({ topic: cancerTopic.nullable().default(null), message: z.string().trim().min(1).max(600) }).strict();
export const POST = privateRoute(async (_request, owner, body) => {
  const parsed = input.safeParse(body);
  if (!parsed.success) return privateJson({ error: "invalid" }, 400);
  const report = await database().contentReport.create({
    data: { ...parsed.data, username: owner.username, id: randomUUID() },
    select: { id: true, createdAt: true },
  });
  return privateJson({ report }, 201);
}, true);
