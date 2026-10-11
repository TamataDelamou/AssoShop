"use client";

import { useState } from "react";
import {
  InvestmentDistribution,
  InvestmentProject,
  ReviewStatus,
} from "@/types/modules/admin";
import { InvestmentProjectStatus } from "@/types/modules/market";
import { adminService } from "@/services/admin/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  ADMIN_LABELS,
  INVESTMENT_PROJECT_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
} from "@/utils/constants";
import { Check, Landmark, TrendingUp, X } from "lucide-react";

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

export function InvestmentsView({
  projects,
  distributions,
  escrowTotal,
  online,
  onChanged,
}: {
  projects: InvestmentProject[];
  distributions: InvestmentDistribution[];
  escrowTotal: number;
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const review = async (id: string, status: ReviewStatus) => {
    setBusy(true);
    setError(null);
    try {
      await adminService.reviewInvestmentDistribution(id, status);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">{ADMIN_LABELS.ESCROW_TOTAL}</p>
            <p className="text-xs text-muted-foreground">
              {ADMIN_LABELS.ESCROW_TOTAL_HINT}
            </p>
          </div>
        </div>
        <p className="text-lg font-bold">{formatCurrency(escrowTotal, "GNF")}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{ADMIN_LABELS.PROFIT_DECLARATIONS}</p>
        {distributions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {ADMIN_LABELS.NO_PROFIT_DECLARATIONS}
          </p>
        )}
        {distributions.map((distribution) => (
          <div
            key={distribution.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{distribution.project_name}</p>
                <Badge
                  variant="outline"
                  className={statusVariant(distribution.status)}
                >
                  {REVIEW_STATUS_LABELS[distribution.status]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {distribution.status === ReviewStatus.APPROVED
                  ? `${formatCurrency(
                      distribution.distributed_amount ?? distribution.amount,
                      distribution.currency,
                    )} ${ADMIN_LABELS.PROFIT_DISTRIBUTED}`
                  : `${formatCurrency(distribution.amount, distribution.currency)} ${
                      ADMIN_LABELS.PROFIT_TO_DISTRIBUTE
                    }`}{" "}
                · {formatDate(distribution.declared_at)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {distribution.profit_sharing_rules}
              </p>
            </div>
            {distribution.status === ReviewStatus.PENDING && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-400 hover:text-emerald-400"
                  onClick={() => review(distribution.id, ReviewStatus.APPROVED)}
                  disabled={busy || !online}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  {ADMIN_LABELS.APPROVE}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/40 text-red-400 hover:text-red-400"
                  onClick={() => review(distribution.id, ReviewStatus.REJECTED)}
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
                  {INVESTMENT_PROJECT_STATUS_LABELS[
                    project.status as InvestmentProjectStatus
                  ] ?? project.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Porté par {project.promoter}
                {project.deadline &&
                  ` · ${ADMIN_LABELS.PROJECT_DEADLINE} : ${formatDate(
                    new Date(project.deadline),
                  )}`}
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
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {ADMIN_LABELS.ESCROW_BALANCE} :{" "}
                  <span className="font-bold text-foreground">
                    {formatCurrency(project.escrow_balance, project.currency)}
                  </span>
                </span>
                <span>
                  {project.investors_count} {ADMIN_LABELS.INVESTORS}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
