"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell service worker so the PWA loads offline.
 * Renders nothing; runs once on mount in the browser.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal; the app still works online.
    });
  }, []);

  return null;
}
