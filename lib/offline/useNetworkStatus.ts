"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

// Rendu serveur et hydratation : toujours « en ligne ». Node expose un objet
// `navigator` sans `onLine`, qu'il ne faut donc pas lire côté serveur ; l'état
// réel du navigateur est appliqué juste après l'hydratation.
function getServerSnapshot(): boolean {
  return true;
}

// Détecte l'état de connexion réseau (navigator.onLine + événements).
export function useNetworkStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
