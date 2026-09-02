"use client";

import { InsurancePartnership } from "@/types/modules/admin";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/formatters";
import { Shield } from "lucide-react";

export function InsuranceView({
  partnerships,
}: {
  partnerships: InsurancePartnership[];
}) {
  return (
    <div className="space-y-3">
      {partnerships.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">{p.insurer}</p>
              <p className="text-xs text-muted-foreground">
                {p.country} · actif depuis {formatDate(p.active_since)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/10 bg-white/5">
              Commission {p.commission_rate}%
            </Badge>
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            >
              {p.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
