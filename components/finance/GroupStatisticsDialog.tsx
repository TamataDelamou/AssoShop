"use client";

import { useGroupStatistics } from "@/hooks/finance/useGroupStatistics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { FINANCE_LABELS } from "@/utils/constants";
import { FinancialGroup } from "@/types/modules/finance";
import { CalendarClock, Coins, Repeat, Users } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  group: FinancialGroup | null;
}

export function GroupStatisticsDialog({
  open,
  onOpenChange,
  organizationId,
  group,
}: Props) {
  const { statistics, loading, error } = useGroupStatistics(
    organizationId,
    group?.id ?? null,
  );

  return (
    <Dialog open={open && !!group} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {FINANCE_LABELS.STATS_TITLE}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {group?.name}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {loading || !statistics ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full bg-muted/30" />
            <Skeleton className="h-20 w-full bg-muted/30" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                icon={Coins}
                label={FINANCE_LABELS.RAISED_LABEL}
                value={formatCurrency(statistics.total_raised)}
              />
              <StatTile
                icon={Users}
                label={FINANCE_LABELS.MEMBERS_LABEL}
                value={statistics.members_count}
              />
              <StatTile
                icon={Repeat}
                label={`${FINANCE_LABELS.STATS_CONFIRMED} / ${FINANCE_LABELS.STATS_PENDING}`}
                value={`${statistics.confirmed_count} / ${statistics.pending_count}`}
              />
              <StatTile
                icon={CalendarClock}
                label={FINANCE_LABELS.STATS_TURNS}
                value={`${statistics.turns_received}/${statistics.turns_total}`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {FINANCE_LABELS.STATS_REGULARITY}
                </span>
                <span className="font-medium text-foreground">
                  {statistics.regularity_rate}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${statistics.regularity_rate}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {FINANCE_LABELS.STATS_LAST_PAYMENT} :{" "}
              {statistics.last_payment_at
                ? formatDate(statistics.last_payment_at)
                : "—"}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
      <p className="text-base font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
