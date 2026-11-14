"use client";
import { RefreshCw } from "lucide-react";
import { Intake } from "./intake";
import { usePrefs } from "./prefs";
import { Summary } from "./review";
import type { useProgress } from "./session";

type Sync = ReturnType<typeof useProgress>;

/** The signed-in experience: the questionnaire until it is finished, then the summary. */
export function Journey({ sync, onExit }: { sync: Sync; onExit: () => void }) {
  const { lang, t } = usePrefs();
  const { progress, update, state, retry } = sync;
  return (
    <div className="wrap wrap--journey">
      {state === "conflict" && (
        <div className="notice notice--urgent" role="alert">
          <RefreshCw size={20} aria-hidden="true" />
          <div>
            <p><strong>{t("Your answers changed in another tab.", "Vastauksesi muuttuivat toisessa välilehdessä.")}</strong></p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => location.reload()}>{t("Reload the saved version", "Lataa tallennettu versio")}</button>
          </div>
        </div>
      )}
      {state === "error" && !progress.complete && (
        <div className="notice notice--soon" role="status">
          <RefreshCw size={20} aria-hidden="true" />
          <div>
            <p>{t("We could not save your last answer. Your answers are safe on this screen, and we will keep trying.", "Viimeisintä vastausta ei voitu tallentaa. Vastauksesi ovat tallessa tällä näytöllä, ja yritämme uudelleen.")}</p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => void retry()}>{t("Try again now", "Yritä nyt uudelleen")}</button>
          </div>
        </div>
      )}
      {progress.complete
        ? <Summary answers={progress.answers} lang={lang} onEdit={() => void update({ complete: false, confirmed: false, cursor: "review" })} />
        : <Intake progress={progress} update={update} saveState={state} onExit={onExit} />}
    </div>
  );
}
