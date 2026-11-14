import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { database } from "./database";

export const cookieName = "care4ll_login";
export const sessionSeconds = 7 * 24 * 60 * 60;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const privateJson = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === (process.env.APP_ORIGIN || new URL(request.url).origin)
    && request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function currentAccount() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const login = await database().screeningLogin.findFirst({
    where: { id: hashToken(token), expiresAt: { gt: new Date() } },
    select: { account: { select: { username: true, language: true } } },
  });
  return login?.account ?? null;
}
