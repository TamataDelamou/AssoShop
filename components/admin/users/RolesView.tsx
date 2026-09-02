"use client";

import { InternalRole } from "@/types/modules/admin";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export function RolesView({ roles }: { roles: InternalRole[] }) {
  return (
    <div className="space-y-3">
      {roles.map((role) => (
        <div
          key={role.id}
          className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="font-medium">{role.name}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {role.assigned_agents} agent(s)
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {role.permissions.map((permission) => (
              <Badge
                key={permission}
                variant="outline"
                className="border-white/10 bg-white/5"
              >
                {permission}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
