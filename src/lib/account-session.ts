import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { database } from "./database";
import { allowedOrigins, originAccepted } from "./origin";

export const cookieName = "care4ll_login";
export const sessionSeconds = 7 * 24 * 60 * 60;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const privateJson = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });

export const sameOrigin = (request: Request) => originAccepted(request.headers, process.env.APP_ORIGIN, request.url);

/**
 * The 403 for a write from an address the backend does not accept. It names the address that is accepted, which is the
 * public address of the app and no secret, so the PWA can tell the person where to open it instead.
 */
export const refuseOrigin = (request: Request) =>
  privateJson({ error: "origin", expected: allowedOrigins(process.env.APP_ORIGIN, request.url)[0] ?? null }, 403);

export async function currentAccount() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const login = await database().screeningLogin.findFirst({
    where: { id: hashToken(token), expiresAt: { gt: new Date() } },
    select: { account: { select: { username: true, language: true } } },
  });
  return login?.account ?? null;
}
