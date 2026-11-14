/*
 * Same-origin client for the care4all backend. Requests carry the HTTP-only session cookie and are never
 * cached by the browser or the service worker. Nothing here writes to browser storage.
 */

/** A failed backend call. `code` is the backend's error string, or "offline" when the server was unreachable. */
export class ApiError extends Error {
  /** @param {string} code @param {number} [status] */
  constructor(code, status = 0) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function codeFor(status, data) {
  if (data && typeof data.error === "string") return data.error;
  if (status === 401) return "expired";
  if (status === 409) return "conflict";
  if (status === 429) return "limited";
  return status >= 500 ? "unavailable" : "invalid";
}

/**
 * @param {string} path  Path below /api/, for example "profile" or "library?lang=en".
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} [options]
 * @returns {Promise<any>}  The parsed JSON body.
 */
export async function request(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch("/api/" + path, {
      method, signal, cache: "no-store", credentials: "same-origin",
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error && error.name === "AbortError") throw error;
    throw new ApiError("offline");
  }
  let data = null;
  try { data = await response.json(); } catch { /* an empty or non-JSON body */ }
  if (!response.ok) throw new ApiError(codeFor(response.status, data), response.status);
  return data;
}

/** Saves a private file such as the data export or a calendar entry. The session cookie authorises it. */
export async function download(path, fallbackName) {
  let response;
  try {
    response = await fetch("/api/" + path, { cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new ApiError("offline");
  }
  if (!response.ok) {
    let data = null;
    try { data = await response.json(); } catch { /* not JSON */ }
    throw new ApiError(codeFor(response.status, data), response.status);
  }
  const named = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = named ? named[1] : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
