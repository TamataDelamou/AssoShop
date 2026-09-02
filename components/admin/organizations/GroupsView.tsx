"use client";

import { SupervisedGroup } from "@/types/modules/admin";
import { Badge } from "@/components/ui/badge";
import { HandCoins, AlertTriangle } from "lucide-react";

export function GroupsView({ groups }: { groups: SupervisedGroup[] }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <HandCoins className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">{group.name}</p>
              <p className="text-xs text-muted-foreground">
                {group.type} · {group.country} · {group.members_count} membres
              </p>
            </div>
          </div>
          {group.anomaly ? (
            <Badge
              variant="outline"
              className="border-red-500/40 bg-red-500/10 text-red-400"
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              Anomalie détectée
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              Normal
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
