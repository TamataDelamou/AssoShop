"use client";

import { useState } from "react";
import { MobileOperator } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

export function OperatorsView({
  operators,
  online,
  onChanged,
}: {
  operators: MobileOperator[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (id: string) => {
    setBusyId(id);
    try {
      await adminService.toggleOperator(id);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {operators.map((operator) => (
        <div
          key={operator.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">{operator.name}</p>
              <p className="text-xs text-muted-foreground">{operator.country}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                operator.status === "active"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-400"
              }
            >
              {operator.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10"
              disabled={busyId === operator.id || !online}
              onClick={() => toggle(operator.id)}
            >
              {operator.status === "active" ? "Désactiver" : "Activer"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
