"use client";

import { SupervisedAssociation } from "@/types/modules/admin";
import { Badge } from "@/components/ui/badge";
import { Building2, Flag } from "lucide-react";

export function AssociationsView({
  associations,
}: {
  associations: SupervisedAssociation[];
}) {
  return (
    <div className="space-y-3">
      {associations.map((org) => (
        <div
          key={org.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">{org.name}</p>
              <p className="text-xs text-muted-foreground">
                {org.type} · {org.country} · {org.members_count} membres
              </p>
            </div>
          </div>
          {org.reports > 0 ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              <Flag className="mr-1 h-3 w-3" />
              {org.reports} signalement(s)
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              Aucun signalement
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
