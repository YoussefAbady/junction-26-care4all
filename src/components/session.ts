"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Progress } from "@/lib/intake";
import type { Language } from "@/lib/survey";

export type Account = { username: string; progress: Progress };
export type ErrorKey = "unavailable" | "invalid" | "taken" | "credentials" | "expired" | "conflict" | "limited" | "offline";
const known: readonly string[] = ["unavailable", "invalid", "taken", "credentials", "expired", "conflict", "limited"];

type Reply = { ok: true; account: Account | null } | { ok: false; error: ErrorKey };
async function call(method: string, body?: unknown): Promise<Reply> {
  try {
    const response = await fetch("/api/account", { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json();
    if (!response.ok) return { ok: false, error: known.includes(data.error) ? data.error : "unavailable" };
    return { ok: true, account: data.account };
  } catch { return { ok: false, error: "offline" }; }
}

/** Sign-in state. Nothing here is kept in browser storage: the server holds the session in an HTTP-only cookie. */
export function useAccount(onLanguage: (language: Language) => void) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const language = useRef(onLanguage);
  useEffect(() => { language.current = onLanguage; });

  useEffect(() => {
    let live = true;
    void call("GET").then(result => {
      if (!live) return;
      if (result.ok) { setAccount(result.account); if (result.account) language.current(result.account.progress.language); setLoaded(true); }
      else setError(result.error === "offline" ? "unavailable" : result.error);
    });
    return () => { live = false; };
  }, []);

  const auth = useCallback(async (mode: "register" | "login", username: string, password: string, lang: Language) => {
    setBusy(true); setError(null);
    const result = await call("POST", { action: mode, username, password, language: lang });
    setBusy(false);
    if (!result.ok) { setError(result.error); return false; }
    setAccount(result.account);
    return true;
  }, []);
  const logout = useCallback(async () => {
    setBusy(true);
    const result = await call("DELETE");
    setBusy(false);
    if (!result.ok) { setError(result.error); return false; }
    setAccount(null); setError(null);
    return true;
  }, []);
  const expire = useCallback(() => { setAccount(null); setError("expired"); }, []);
  return { account, loaded, error, setError, busy, auth, logout, expire };
}

export type SaveState = "saved" | "saving" | "error" | "conflict";

/**
 * Keeps progress on screen instantly and saves it in the background, one request at a time.
 * Each save carries the whole latest state, so a failed save is repaired by the next one and nothing is lost.
 */
export function useProgress(initial: Progress, onExpired: () => void) {
  const [progress, setProgress] = useState(initial);
  const [state, setState] = useState<SaveState>("saved");
  const latest = useRef(initial);
  const revision = useRef(initial.revision);
  const inflight = useRef<Promise<boolean> | null>(null);
  const dirty = useRef(false);
  const expired = useRef(onExpired);
  useEffect(() => { expired.current = onExpired; });

  const flush = useCallback((): Promise<boolean> => {
    if (inflight.current) { dirty.current = true; return inflight.current; }
    const run = async () => {
      setState("saving");
      do {
        dirty.current = false;
        const result = await call("POST", { action: "save", progress: { ...latest.current, revision: revision.current } });
        if (!result.ok) {
          if (result.error === "expired") expired.current();
          setState(result.error === "conflict" ? "conflict" : "error");
          return false;
        }
        revision.current = result.account!.progress.revision;
      } while (dirty.current);
      setState("saved");
      return true;
    };
    const pending = run().finally(() => { inflight.current = null; });
    inflight.current = pending;
    return pending;
  }, []);

  /** Shows the change at once and saves it. With `confirm`, shows it only after the server has accepted it. */
  const update = useCallback(async (patch: Partial<Omit<Progress, "v" | "revision" | "upgraded">>, options?: { confirm?: boolean }) => {
    const previous = latest.current;
    latest.current = { ...latest.current, ...patch };
    if (!options?.confirm) { setProgress(latest.current); return flush(); }
    const saved = await flush();
    if (saved) setProgress(latest.current); else latest.current = previous;
    return saved;
  }, [flush]);

  useEffect(() => {
    if (state === "saved") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  return { progress, update, state, retry: flush };
}
