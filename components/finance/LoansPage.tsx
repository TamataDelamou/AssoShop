"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLoans } from "@/hooks/finance/useLoans";
import { useFinancialGroups } from "@/hooks/finance/useFinancialGroups";
import { LoanStatusBadge } from "./LoanStatusBadge";
import { RequestLoanDialog } from "./RequestLoanDialog";
import { LoanDetailsDialog } from "./LoanDetailsDialog";
import {
  FinancialGroupType,
  GroupLoan,
  LoanStatus,
} from "@/types/modules/finance";
import {
  COMMON_LABELS,
  LOAN_LABELS,
  LOAN_STATUS_OPTIONS,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  organizationId: string;
}

export function LoansPage({ organizationId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<GroupLoan | null>(null);

  const { loans, loading, error, online, refetch } = useLoans(
    organizationId,
    search,
    statusFilter,
  );
  const { groups } = useFinancialGroups(organizationId);

  const eligibleGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          g.type === FinancialGroupType.SAVINGS && g.interest_rate !== null,
      ),
    [groups],
  );

  const summary = useMemo(() => {
    const requested = loans.filter(
      (l) =>
        l.status === LoanStatus.REQUESTED ||
        l.status === LoanStatus.SPONSOR_CONFIRMED,
    ).length;
    const active = loans.filter(
      (l) => l.status === LoanStatus.APPROVED,
    ).length;
    const repaid = loans.filter((l) => l.status === LoanStatus.REPAID).length;
    return { requested, active, repaid };
  }, [loans]);

  const handleRequested = (result: GroupLoan | null) => {
    refetch();
    if (result) {
      setDetailsTarget(result);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{LOAN_LABELS.PAGE_TITLE}</h1>
        <Button
          onClick={() => setRequestOpen(true)}
          disabled={!eligibleGroups.length}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {LOAN_LABELS.REQUEST_BUTTON}
        </Button>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{LOAN_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {LOAN_LABELS.SUMMARY_REQUESTED}
            </p>
            <p className="text-2xl font-bold">{summary.requested}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {LOAN_LABELS.SUMMARY_ACTIVE}
            </p>
            <p className="text-2xl font-bold">{summary.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {LOAN_LABELS.SUMMARY_REPAID}
            </p>
            <p className="text-2xl font-bold">{summary.repaid}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={LOAN_LABELS.SEARCH_PLACEHOLDER}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue placeholder={LOAN_LABELS.STATUS_FILTER_PLACEHOLDER} />
          </SelectTrigger>
          <SelectContent>
            {LOAN_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{LOAN_LABELS.LOAD_ERROR}</p>
      ) : !loans.length ? (
        <p className="text-sm text-muted-foreground">{LOAN_LABELS.NO_DATA}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {LOAN_LABELS.MEMBER_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {LOAN_LABELS.GROUP_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {LOAN_LABELS.AMOUNT_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {LOAN_LABELS.SUGGESTED_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {LOAN_LABELS.STATUS_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {LOAN_LABELS.ACTIONS_LABEL}
                </th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium">{l.member_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.group_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCurrency(l.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCurrency(l.suggested_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <LoanStatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailsTarget(l)}
                    >
                      {LOAN_LABELS.DETAILS_BUTTON}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RequestLoanDialog
        key={requestOpen ? "open" : "closed"}
        open={requestOpen}
        onOpenChange={setRequestOpen}
        organizationId={organizationId}
        groups={eligibleGroups}
        onSuccess={handleRequested}
      />
      <LoanDetailsDialog
        key={detailsTarget?.id ?? "none"}
        open={!!detailsTarget}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
        organizationId={organizationId}
        loan={detailsTarget}
        onChanged={refetch}
        onLoanChange={setDetailsTarget}
      />
    </div>
  );
}
