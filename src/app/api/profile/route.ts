import { z } from "zod";
import { privateJson } from "@/lib/account-session";
import { database } from "@/lib/database";
import { preferences, profileFields } from "@/lib/design-contract";
import { privateRoute } from "@/lib/private-route";

const input = z.object({ profile: profileFields.nullable(), preferences }).strict();

export const GET = privateRoute(async (_request, owner) => {
  const saved = await database().careProfile.findUnique({
    where: { username: owner.username }, select: { profile: true, preferences: true },
  });
  return privateJson({ profile: profileFields.safeParse(saved?.profile).data ?? null, preferences: saved?.preferences ?? { lang: owner.language, scale: 0, plain: false, motion: true } });
});

export const PUT = privateRoute(async (_request, owner, body) => {
  const parsed = input.safeParse(body);
  if (!parsed.success) return privateJson({ error: "invalid" }, 400);
  // A JSON object represents unset demographics while preferences can still be saved.
  const data = { profile: parsed.data.profile ?? {}, preferences: parsed.data.preferences };
  await database().careProfile.upsert({ where: { username: owner.username }, create: { username: owner.username, ...data }, update: data });
  return privateJson(parsed.data);
}, true);
