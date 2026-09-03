"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAutoSync } from "@/lib/offline";
import { registerAllReplayHandlers } from "@/lib/offline/replayHandlers";

// Monte le socle hors-ligne au niveau racine :
// - enregistre les gestionnaires de rejeu de toutes les mutations différées ;
// - rejoue automatiquement la file à la reconnexion.
export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerAllReplayHandlers();
  }, []);

  useAutoSync();

  return <>{children}</>;
}
