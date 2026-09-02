"use client";

import { getCachedKeys } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, WifiOff } from "lucide-react";

interface Props {
  pendingCount: number;
  onOpenQueue: () => void;
}

export function OfflineBanner({ pendingCount, onOpenQueue }: Props) {
  const cachedCount = getCachedKeys().length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-300 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="font-medium text-amber-200">Mode hors connexion</span>
        <span className="text-amber-300/70">
          — {cachedCount} contenu(s) en cache accessible(s)
        </span>
      </div>
      <div className="flex items-center gap-3">
        {pendingCount > 0 && (
          <span className="flex items-center gap-1 text-amber-300/80">
            <Database className="h-3 w-3" />
            {pendingCount} action(s) en attente
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenQueue}
          className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10 hover:text-amber-100"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          File de synchronisation
        </Button>
      </div>
    </div>
  );
}
