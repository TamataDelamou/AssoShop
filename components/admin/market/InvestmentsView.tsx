"use client";

import { InvestmentProject } from "@/types/modules/admin";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { TrendingUp } from "lucide-react";

export function InvestmentsView({
  projects,
}: {
  projects: InvestmentProject[];
}) {
  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const progress = Math.min(
          100,
          Math.round((project.raised_amount / project.target_amount) * 100),
        );
        return (
          <div
            key={project.id}
            className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="font-medium">{project.name}</p>
              </div>
              <Badge variant="outline" className="border-white/10 bg-white/5">
                {project.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Porté par {project.promoter}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatCurrency(project.raised_amount, project.currency)} /{" "}
                {formatCurrency(project.target_amount, project.currency)}
              </span>
              <span>{progress}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
