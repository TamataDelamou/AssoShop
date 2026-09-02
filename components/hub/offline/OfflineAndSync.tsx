"use client";

import { useState } from "react";
import { useNetworkStatus } from "@/lib/offline";
import { useSyncQueue } from "@/hooks/hub/useSyncQueue";
import { OfflineBanner } from "./OfflineBanner";
import { SyncQueueDialog } from "./SyncQueueDialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// Composant global monté dans le layout du dashboard :
// - HUB-35 : bandeau « mode hors connexion » + accès au cache.
// - HUB-36 : accès à la file de synchronisation (badge + dialogue).
export function OfflineAndSync() {
  const online = useNetworkStatus();
  const { queue } = useSyncQueue();
  const [open, setOpen] = useState(false);

  return (
    <>
      {!online && (
        <OfflineBanner
          pendingCount={queue.length}
          onOpenQueue={() => setOpen(true)}
        />
      )}

      {online && queue.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {queue.length} action(s) en attente
          </Button>
        </div>
      )}

      <SyncQueueDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
