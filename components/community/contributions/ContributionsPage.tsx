"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useContributions } from "@/hooks/community/useContributions";
import { useMembers } from "@/hooks/community/useMembers";
import {
  Contribution,
  ContributionMethod,
  ContributionStatus,
} from "@/types/modules/community";
import { ContributionStatusBadge } from "./ContributionStatusBadge";
import { PayContributionDialog } from "./PayContributionDialog";
import { ValidateCashPaymentDialog } from "./ValidateCashPaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CONTRIBUTION_LABELS,
  CONTRIBUTION_METHOD_OPTIONS,
  CONTRIBUTION_STATUS_OPTIONS,
} from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/formatters";

interface Props {
  organizationId: string;
  organizationName?: string;
}

export function ContributionsPage({ organizationId, organizationName }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Contribution | null>(null);
  const [validateTarget, setValidateTarget] = useState<Contribution | null>(
    null,
  );

  const { contributions, loading, error, refetch } = useContributions(
    organizationId,
    searchTerm,
    statusFilter,
  );
  const { members } = useMembers(organizationId);

  const summary = useMemo(() => {
    const due = contributions
      .filter(
        (c) =>
          c.status === ContributionStatus.DUE ||
          c.status === ContributionStatus.OVERDUE,
      )
      .reduce((sum, c) => sum + c.amount, 0);
    const pending = contributions
      .filter((c) => c.status === ContributionStatus.PENDING)
      .reduce((sum, c) => sum + c.amount, 0);
    const collected = contributions
      .filter((c) => c.status === ContributionStatus.PAID)
      .reduce((sum, c) => sum + c.amount, 0);
    return { due, pending, collected };
  }, [contributions]);

  const methodLabel = (method: ContributionMethod | null): string => {
    return (
      CONTRIBUTION_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? "-"
    );
  };

  const openPayDialog = (contribution?: Contribution) => {
    setPayTarget(contribution ?? null);
    setPayDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {CONTRIBUTION_LABELS.PAGE_TITLE}
          </h2>
          {organizationName ? (
            <p className="text-sm text-muted-foreground">{organizationName}</p>
          ) : null}
        </div>
        <Button
          onClick={() => openPayDialog()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          {CONTRIBUTION_LABELS.PAY_BUTTON}
        </Button>
      </div>

      {/* Synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {CONTRIBUTION_LABELS.SUMMARY_DUE}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-yellow-500">
            {formatCurrency(summary.due)}
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {CONTRIBUTION_LABELS.SUMMARY_PENDING}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-orange-500">
            {formatCurrency(summary.pending)}
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {CONTRIBUTION_LABELS.SUMMARY_COLLECTED}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-green-500">
            {formatCurrency(summary.collected)}
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={CONTRIBUTION_LABELS.SEARCH_PLACEHOLDER}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-64 bg-card/50 border-border/50">
            <SelectValue
              placeholder={CONTRIBUTION_LABELS.STATUS_FILTER_PLACEHOLDER}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {CONTRIBUTION_LABELS.STATUS_FILTER_PLACEHOLDER}
            </SelectItem>
            {CONTRIBUTION_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{CONTRIBUTION_LABELS.LOAD_ERROR}</AlertDescription>
        </Alert>
      ) : null}

      {/* Tableau */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted/30" />
              ))}
            </div>
          ) : contributions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {CONTRIBUTION_LABELS.NO_DATA}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/10">
                  <TableHead className="text-muted-foreground font-medium">
                    {CONTRIBUTION_LABELS.MEMBER_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {CONTRIBUTION_LABELS.AMOUNT_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {CONTRIBUTION_LABELS.PERIOD_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {CONTRIBUTION_LABELS.METHOD_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {CONTRIBUTION_LABELS.STATUS_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {CONTRIBUTION_LABELS.PAYER_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    {CONTRIBUTION_LABELS.ACTIONS_LABEL}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-border/50 hover:bg-muted/10"
                  >
                    <TableCell className="font-medium">
                      {c.member?.name ?? "-"}
                      {c.member?.phone ? (
                        <div className="text-xs text-muted-foreground">
                          {c.member.phone}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(c.amount)}
                    </TableCell>
                    <TableCell>
                      {c.period_label}
                      {c.due_date ? (
                        <div className="text-xs text-muted-foreground">
                          {formatDate(c.due_date)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {methodLabel(c.method)}
                    </TableCell>
                    <TableCell>
                      <ContributionStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.paid_by?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {c.status === ContributionStatus.DUE ||
                      c.status === ContributionStatus.OVERDUE ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPayDialog(c)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {CONTRIBUTION_LABELS.PAY_SHORT}
                        </Button>
                      ) : null}
                      {c.status === ContributionStatus.PENDING ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setValidateTarget(c)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {CONTRIBUTION_LABELS.VALIDATE_BUTTON}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PayContributionDialog
        key={`pay-${payTarget?.id ?? "new"}-${payDialogOpen}`}
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        organizationId={organizationId}
        members={members}
        contribution={payTarget}
        onSuccess={refetch}
      />

      <ValidateCashPaymentDialog
        key={`validate-${validateTarget?.id ?? "none"}`}
        open={!!validateTarget}
        onOpenChange={(open) => {
          if (!open) setValidateTarget(null);
        }}
        organizationId={organizationId}
        contribution={validateTarget}
        onSuccess={refetch}
      />
    </div>
  );
}
