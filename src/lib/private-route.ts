import "server-only";
import { currentAccount, privateJson, refuseOrigin, sameOrigin } from "./account-session";

type Owner = NonNullable<Awaited<ReturnType<typeof currentAccount>>>;
export function privateRoute(handler: (request: Request, owner: Owner, body: unknown) => Promise<Response>, mutation = false) {
  return async (request: Request) => {
    if (mutation && !sameOrigin(request)) return refuseOrigin(request);
    if (mutation && !request.headers.get("content-type")?.startsWith("application/json")) return privateJson({ error: "invalid" }, 415);
    try {
      const owner = await currentAccount();
      if (!owner) return privateJson({ error: "expired" }, 401);
      let body: unknown;
      if (mutation) {
        const raw = await request.text();
        if (raw.length > 8192) return privateJson({ error: "invalid" }, 413);
        body = JSON.parse(raw);
      }
      return await handler(request, owner, body);
    } catch (error) {
      return error instanceof SyntaxError ? privateJson({ error: "invalid" }, 400) : privateJson({ error: "unavailable" }, 503);
    }
  };
}
