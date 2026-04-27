declare const __SW_BUILD_ID__: string;

export function registerServiceWorkerOnIdle() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    }).catch(() => {
      // Ignore local cleanup failures.
    });
    return;
  }

  const register = () => {
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(__SW_BUILD_ID__)}`).catch(() => {
      // Ignore SW registration failures.
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(register, { timeout: 4000 });
    return;
  }

  (window as Window).setTimeout(register, 2500);
}
