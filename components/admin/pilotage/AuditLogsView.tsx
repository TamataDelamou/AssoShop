"use client";

import { AuditLogEntry, AuditSeverity } from "@/types/modules/admin";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/utils/formatters";
import { AUDIT_SEVERITY_LABELS, ADMIN_LABELS } from "@/utils/constants";

function severityVariant(severity: AuditSeverity): string {
  switch (severity) {
    case AuditSeverity.CRITICAL:
      return "border-red-500/40 bg-red-500/10 text-red-400";
    case AuditSeverity.WARNING:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    default:
      return "border-white/10 bg-white/5 text-muted-foreground";
  }
}

export function AuditLogsView({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div>
            <p className="font-medium">{log.action}</p>
            <p className="text-xs text-muted-foreground">
              {log.actor} · {log.module} · {formatDateTime(log.created_at)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={severityVariant(log.severity)}
          >
            {AUDIT_SEVERITY_LABELS[log.severity]}
          </Badge>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {ADMIN_LABELS.TAB_AUDIT_LOGS} — traçabilité des actions sensibles.
      </p>
    </div>
  );
}
