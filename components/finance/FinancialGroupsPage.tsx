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
import { useFinancialGroups } from "@/hooks/finance/useFinancialGroups";
import { FinancialGroupTypeBadge } from "./FinancialGroupTypeBadge";
import { FinancialGroupStatusBadge } from "./FinancialGroupStatusBadge";
import { CreateFinancialGroupDialog } from "./CreateFinancialGroupDialog";
import { FinancialGroupDetailsDialog } from "./FinancialGroupDetailsDialog";
import { SponsorshipsDialog } from "./SponsorshipsDialog";
import { FinancialGroup } from "@/types/modules/finance";
import {
  COMMON_LABELS,
  FINANCE_LABELS,
  FINANCIAL_GROUP_TYPE_OPTIONS,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  organizationId: string;
}

export function FinancialGroupsPage({ organizationId }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [sponsorshipOpen, setSponsorshipOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<FinancialGroup | null>(
    null,
  );

  const { groups, loading, error, online, refetch } = useFinancialGroups(
    organizationId,
    search,
    typeFilter,
  );

  const summary = useMemo(() => {
    const total = groups.length;
    const raised = groups.reduce((sum, g) => sum + g.raised_amount, 0);
    const members = groups.reduce((sum, g) => sum + (g.members?.length ?? 0), 0);
    return { total, raised, members };
  }, [groups]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{FINANCE_LABELS.PAGE_TITLE}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSponsorshipOpen(true)}
          >
            {FINANCE_LABELS.SPONSORSHIP_BUTTON}
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {FINANCE_LABELS.CREATE_BUTTON}
          </Button>
        </div>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{FINANCE_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {FINANCE_LABELS.SUMMARY_TOTAL}
            </p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {FINANCE_LABELS.SUMMARY_RAISED}
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.raised)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {FINANCE_LABELS.SUMMARY_MEMBERS}
            </p>
            <p className="text-2xl font-bold">{summary.members}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={FINANCE_LABELS.SEARCH_PLACEHOLDER}
          className="sm:max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue placeholder={FINANCE_LABELS.TYPE_FILTER_PLACEHOLDER} />
          </SelectTrigger>
          <SelectContent>
            {FINANCIAL_GROUP_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
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
        <p className="text-sm text-destructive">
          {FINANCE_LABELS.LOAD_ERROR}
        </p>
      ) : !groups.length ? (
        <p className="text-sm text-muted-foreground">
          {FINANCE_LABELS.NO_DATA}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {FINANCE_LABELS.NAME_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {FINANCE_LABELS.TYPE_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {FINANCE_LABELS.STATUS_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {FINANCE_LABELS.MEMBERS_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {FINANCE_LABELS.RAISED_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {FINANCE_LABELS.PROGRESS_LABEL}
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g.id}
                  className="border-t border-border/50 cursor-pointer"
                  onClick={() => setDetailsTarget(g)}
                >
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3">
                    <FinancialGroupTypeBadge type={g.type} />
                  </td>
                  <td className="px-4 py-3">
                    <FinancialGroupStatusBadge status={g.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {g.members?.length ?? 0}/{g.max_members}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCurrency(g.raised_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsTarget(g);
                      }}
                    >
                      {FINANCE_LABELS.DETAILS_BUTTON}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateFinancialGroupDialog
        key={createOpen ? "open" : "closed"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />
      <FinancialGroupDetailsDialog
        key={detailsTarget?.id ?? "none"}
        open={!!detailsTarget}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
        organizationId={organizationId}
        group={detailsTarget}
        onChanged={refetch}
        onGroupChange={setDetailsTarget}
      />
      <SponsorshipsDialog
        open={sponsorshipOpen}
        onOpenChange={setSponsorshipOpen}
        organizationId={organizationId}
        onChanged={refetch}
      />
    </div>
  );
}
