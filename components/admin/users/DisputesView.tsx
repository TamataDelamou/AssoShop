"use client";

import { useState } from "react";
import { Dispute, DisputeStatus } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/formatters";
import { DISPUTE_STATUS_LABELS } from "@/utils/constants";

function statusVariant(status: DisputeStatus): string {
  switch (status) {
    case DisputeStatus.RESOLVED:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case DisputeStatus.IN_PROGRESS:
      return "border-sky-500/40 bg-sky-500/10 text-sky-400";
    default:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
  }
}

export function DisputesView({
  disputes,
  online,
  onChanged,
}: {
  disputes: Dispute[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = async (id: string, status: DisputeStatus) => {
    setBusy(true);
    setError(null);
    try {
      await adminService.setDisputeStatus(id, status);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {disputes.map((dispute) => (
        <div
          key={dispute.id}
          className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{dispute.type}</p>
            <Badge
              variant="outline"
              className={statusVariant(dispute.status)}
            >
              {DISPUTE_STATUS_LABELS[dispute.status]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {dispute.claimant} contre {dispute.respondent} · ouvert le{" "}
            {formatDate(dispute.opened_at)}
          </p>
          <p className="mt-1">{dispute.description}</p>
          <div className="mt-2 flex gap-2">
            {dispute.status === DisputeStatus.OPEN && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/10"
                onClick={() => setStatus(dispute.id, DisputeStatus.IN_PROGRESS)}
                disabled={busy || !online}
              >
                Traiter
              </Button>
            )}
            {dispute.status !== DisputeStatus.RESOLVED && (
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/40 text-emerald-400 hover:text-emerald-400"
                onClick={() => setStatus(dispute.id, DisputeStatus.RESOLVED)}
                disabled={busy || !online}
              >
                Résoudre
              </Button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
