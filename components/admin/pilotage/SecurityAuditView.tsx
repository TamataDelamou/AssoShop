"use client";

import { SecurityAuditEntry } from "@/types/modules/admin";
import { formatDateTime } from "@/utils/formatters";
import { ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

export function SecurityAuditView({
  entries,
}: {
  entries: SecurityAuditEntry[];
}) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const success = entry.result.startsWith("Succès");
        return (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          >
            <div className="flex items-center gap-3">
              {success ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              ) : (
                <ShieldX className="h-5 w-5 text-red-400" />
              )}
              <div>
                <p className="font-medium">{entry.action}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.actor} · {entry.ip} · {formatDateTime(entry.created_at)}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "text-xs",
                success ? "text-emerald-400" : "text-red-400",
              )}
            >
              {entry.result}
            </span>
          </div>
        );
      })}
    </div>
  );
}
