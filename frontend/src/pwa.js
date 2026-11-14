/*
 * Service worker registration and the update flow. Only production builds register a worker: the dev server
 * has no sw.js. A new worker waits in the background, so an update never interrupts a conversation or a
 * half-written note. The person chooses when to restart onto it.
 */
import { A } from "./app.js";

export function registerServiceWorker() {
  if (!import.meta.env.PROD || A.IN_FRAME || !("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !A.restartingForUpdate) return;
    reloading = true;
    location.reload();
  });

  /**
   * Called when an updated worker has installed. The first install is not an update. Profile offers the restart,
   * so that screen is drawn again if it is the one open. Any other top screen stays as it is, because drawing a form
   * again would wipe what someone is typing.
   */
  function updateReady(worker) {
    if (!navigator.serviceWorker.controller) return;
    A.updateWorker = worker;
    A.toast(A.tr("A new version of care4all is ready. Open Profile to restart.", "care4all-päivitys on valmis. Avaa Profiili ja käynnistä uudelleen.", "En ny version av care4all är redo. Öppna Profil för att starta om."), 7000);
    const open = A.current && A.current();
    if (A.refresh) A.refresh(!(open && open.name === "me"));
  }

  navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(registration => {
    A.swRegistration = registration;
    if (registration.waiting) updateReady(registration.waiting);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (worker) worker.addEventListener("statechange", () => { if (worker.state === "installed") updateReady(worker); });
    });
    // Look for a new version when the app comes back to the foreground.
    document.addEventListener("visibilitychange", () => { if (!document.hidden) registration.update().catch(() => {}); });
    return navigator.serviceWorker.ready;
  }).then(() => { A.offlineReady = true; }).catch(() => { /* offline mode is unavailable, the app still works online */ });
}

/** Restarts onto the waiting version. */
A.applyUpdate = function () {
  if (!A.updateWorker) return;
  A.restartingForUpdate = true;
  A.updateWorker.postMessage("skip-waiting");
};
