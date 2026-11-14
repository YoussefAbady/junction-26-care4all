// Which addresses may send the backend a write. A write carries the browser's Origin header, and the backend accepts it only
// from the address people open the PWA at, so a page on another site cannot act as a signed-in person (the session cookie is
// also SameSite=Strict). Pure functions with no framework imports, so they can be tested directly.

/** The three names of this machine. They reach the same listener, so the same scheme and port under another one is not another site. */
const loopback = ["localhost", "127.0.0.1", "[::1]"];

/**
 * The origins a write may come from. `configured` is APP_ORIGIN: one origin, or several separated by commas. A loopback origin
 * (localhost, 127.0.0.1 or [::1]) also stands for the other two names on the same scheme and port, because a person who types
 * 127.0.0.1:8080 where localhost:8080 was set up is on the same app, not on another site. Any other origin stands for itself
 * only. Without APP_ORIGIN the request's own origin is the one.
 */
export function allowedOrigins(configured: string | undefined, requestUrl?: string): string[] {
  const listed = (configured ?? "").split(",").map(value => value.trim().replace(/\/+$/, "")).filter(Boolean);
  if (!listed.length && requestUrl) listed.push(new URL(requestUrl).origin);
  const origins = new Set<string>();
  for (const value of listed) {
    origins.add(value);
    try {
      const url = new URL(value);
      if (loopback.includes(url.hostname)) for (const host of loopback) origins.add(url.protocol + "//" + host + (url.port ? ":" + url.port : ""));
    } catch { /* not an address: it stays as written and matches nothing a browser sends */ }
  }
  return [...origins];
}

/** True when the request names an allowed origin and the browser does not say it is a cross-site request. */
export function originAccepted(headers: Pick<Headers, "get">, configured: string | undefined, requestUrl: string) {
  const origin = headers.get("origin");
  return origin !== null && allowedOrigins(configured, requestUrl).includes(origin) && headers.get("sec-fetch-site") !== "cross-site";
}
