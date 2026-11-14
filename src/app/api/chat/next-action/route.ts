import { privateRoute } from "@/lib/private-route";
import { privateJson } from "@/lib/account-session";
import { actionFor } from "@/lib/chat-journey-store";
import { directChat } from "@/lib/chat-director";
import { contentStore } from "@/lib/content";

export const GET = privateRoute(async (request, owner) => {
  const lang = new URL(request.url).searchParams.get("lang") ?? owner.language;
  if (lang !== "en" && lang !== "fi") return privateJson({ error: "invalid" }, 400);
  const nextAction = await actionFor(owner, lang);
  return privateJson({ nextAction, ...await directChat(contentStore(), lang, { kind: "home" }, nextAction) });
});
