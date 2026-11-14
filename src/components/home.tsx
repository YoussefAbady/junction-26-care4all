"use client";
import { useEffect, useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { SiteFooter, SiteHeader } from "./chrome";
import { errorText } from "./auth";
import { Journey } from "./journey";
import { Landing } from "./landing";
import { usePrefs } from "./prefs";
import { useAccount, useProgress, type Account } from "./session";

function Signed({ account, busy, logout, expire }: { account: Account; busy: boolean; logout: () => Promise<boolean>; expire: () => void }) {
  const { t } = usePrefs();
  const sync = useProgress(account.progress, expire);
  /** Signing out first makes sure the last answer has reached the server. */
  async function exit() { if (await sync.retry()) await logout(); }
  return (
    <>
      <SiteHeader>
        <span className="who">
          <span className="who__name" title={account.username}>{account.username}</span>
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={exit} aria-label={t("Sign out", "Kirjaudu ulos")}>
            <LogOut size={16} aria-hidden="true" /><span className="who__text">{t("Sign out", "Kirjaudu ulos")}</span>
          </button>
        </span>
      </SiteHeader>
      <main id="main" tabIndex={-1}><Journey sync={sync} onExit={exit} /></main>
      <SiteFooter />
    </>
  );
}

export function Home() {
  const { lang, t, suggest } = usePrefs();
  const { account, loaded, error, setError, busy, auth, logout, expire } = useAccount(suggest);
  const [mode, setMode] = useState<"register" | "login">("register");
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (account) return <Signed key={account.username} account={account} busy={busy} logout={logout} expire={expire} />;
  return (
    <>
      <SiteHeader nav />
      <main id="main" tabIndex={-1}>
        {!loaded && !error && <p className="wrap loading" role="status">{t("Loading…", "Ladataan…")}</p>}
        {!loaded && error && (
          <div className="wrap wrap--narrow">
            <div className="notice notice--emergency" role="alert">
              <RefreshCw size={20} aria-hidden="true" />
              <div>
                <p>{errorText(error, lang)}</p>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => location.reload()}>{t("Reload", "Lataa uudelleen")}</button>
              </div>
            </div>
          </div>
        )}
        {loaded && (
          <Landing
            mode={mode} setMode={next => { setMode(next); setError(null); }} busy={busy} error={error}
            onSubmit={(username, password) => { void auth(mode, username, password, lang); }}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
