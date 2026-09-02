"use client";

import { useState } from "react";
import { CommissionRule } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_LABELS } from "@/utils/constants";
import { Percent, Plus } from "lucide-react";

export function CommissionsView({
  commissions,
  online,
  onChanged,
}: {
  commissions: CommissionRule[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [service, setService] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!service.trim() || !rate) return;
    setBusy(true);
    setError(null);
    try {
      await adminService.upsertCommission({
        service: service.trim(),
        rate: Number(rate),
      });
      setService("");
      setRate("");
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {commissions.map((commission) => (
          <div
            key={commission.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              <p className="font-medium">{commission.service}</p>
            </div>
            <Badge variant="outline" className="border-white/10 bg-white/5">
              {commission.rate}%
            </Badge>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="min-w-52 flex-1">
          <span className="mb-1 block text-xs text-muted-foreground">
            Service
          </span>
          <Input
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="ex : Commission revendeur"
          />
        </div>
        <div className="w-28">
          <span className="mb-1 block text-xs text-muted-foreground">
            Taux (%)
          </span>
          <Input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0.7"
          />
        </div>
        <Button onClick={save} disabled={busy || !online || !service.trim() || !rate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {ADMIN_LABELS.SAVE}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
