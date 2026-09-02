"use client";

import { useState } from "react";
import { ModerationItem, ReviewStatus } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/utils/formatters";
import { ADMIN_LABELS, REVIEW_STATUS_LABELS } from "@/utils/constants";
import { Check, X } from "lucide-react";

function statusVariant(status: ReviewStatus): string {
  switch (status) {
    case ReviewStatus.APPROVED:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case ReviewStatus.REJECTED:
      return "border-red-500/40 bg-red-500/10 text-red-400";
    default:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
  }
}

export function ModerationView({
  items,
  online,
  onChanged,
}: {
  items: ModerationItem[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const review = async (id: string, status: ReviewStatus) => {
    setBusy(true);
    setError(null);
    try {
      await adminService.reviewModeration(id, status);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-medium">{item.title}</p>
              <Badge
                variant="outline"
                className={statusVariant(item.status)}
              >
                {REVIEW_STATUS_LABELS[item.status]}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {item.type} · signalé le {formatDateTime(item.reported_at)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.author} — motif : {item.reason}
          </p>
          {item.status === ReviewStatus.PENDING && (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/40 text-emerald-400 hover:text-emerald-400"
                onClick={() => review(item.id, ReviewStatus.APPROVED)}
                disabled={busy || !online}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {ADMIN_LABELS.APPROVE}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/40 text-red-400 hover:text-red-400"
                onClick={() => review(item.id, ReviewStatus.REJECTED)}
                disabled={busy || !online}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                {ADMIN_LABELS.REJECT}
              </Button>
            </div>
          )}
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
