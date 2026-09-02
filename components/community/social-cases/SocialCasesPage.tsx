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
import { useSocialCases } from "@/hooks/community/useSocialCases";
import { SocialCase, SocialCaseStatus } from "@/types/modules/community";
import { SocialCaseStatusBadge } from "./SocialCaseStatusBadge";
import { DeclareSocialCaseDialog } from "./DeclareSocialCaseDialog";
import { ValidateSocialCaseDialog } from "./ValidateSocialCaseDialog";
import { ContributeSocialCaseDialog } from "./ContributeSocialCaseDialog";
import { SocialCaseDetailsDialog } from "./SocialCaseDetailsDialog";
import {
  COMMON_LABELS,
  SOCIAL_CASE_LABELS,
  SOCIAL_CASE_STATUS_OPTIONS,
  SOCIAL_CASE_TYPES,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  organizationId: string;
}

export function SocialCasesPage({ organizationId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [declareOpen, setDeclareOpen] = useState(false);
  const [validateTarget, setValidateTarget] = useState<SocialCase | null>(null);
  const [contributeTarget, setContributeTarget] = useState<SocialCase | null>(
    null,
  );
  const [detailsTarget, setDetailsTarget] = useState<SocialCase | null>(null);

  const { socialCases, loading, error, refetch } = useSocialCases(
    organizationId,
    search,
    statusFilter,
  );

  const summary = useMemo(() => {
    const active = socialCases.filter(
      (c) => c.status === SocialCaseStatus.APPROVED,
    ).length;
    const funded = socialCases.filter(
      (c) =>
        c.status === SocialCaseStatus.FUNDED ||
        c.status === SocialCaseStatus.DISBURSED,
    ).length;
    const collected = socialCases.reduce(
      (sum, c) => sum + c.collected_amount,
      0,
    );
    return { active, funded, collected };
  }, [socialCases]);

  const typeLabel = (c: SocialCase) =>
    SOCIAL_CASE_TYPES.find((t) => t.value === c.type)?.label ?? "-";

  const progress = (c: SocialCase) =>
    c.target_amount > 0
      ? Math.min(100, Math.round((c.collected_amount / c.target_amount) * 100))
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{SOCIAL_CASE_LABELS.PAGE_TITLE}</h1>
        <Button
          onClick={() => setDeclareOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {SOCIAL_CASE_LABELS.DECLARE_BUTTON}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {SOCIAL_CASE_LABELS.SUMMARY_ACTIVE}
            </p>
            <p className="text-2xl font-bold">{summary.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {SOCIAL_CASE_LABELS.SUMMARY_FUNDED}
            </p>
            <p className="text-2xl font-bold">{summary.funded}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {SOCIAL_CASE_LABELS.SUMMARY_COLLECTED}
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.collected)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={SOCIAL_CASE_LABELS.SEARCH_PLACEHOLDER}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue
              placeholder={SOCIAL_CASE_LABELS.STATUS_FILTER_PLACEHOLDER}
            />
          </SelectTrigger>
          <SelectContent>
            {SOCIAL_CASE_STATUS_OPTIONS.map((s) => (
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
        <p className="text-sm text-destructive">{SOCIAL_CASE_LABELS.LOAD_ERROR}</p>
      ) : !socialCases.length ? (
        <p className="text-sm text-muted-foreground">
          {SOCIAL_CASE_LABELS.NO_DATA}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {SOCIAL_CASE_LABELS.TITLE_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {SOCIAL_CASE_LABELS.BENEFICIARY_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {SOCIAL_CASE_LABELS.TYPE_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {SOCIAL_CASE_LABELS.PROGRESS_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {SOCIAL_CASE_LABELS.STATUS_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {SOCIAL_CASE_LABELS.ACTIONS_LABEL}
                </th>
              </tr>
            </thead>
            <tbody>
              {socialCases.map((c) => (
                <tr key={c.id} className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.beneficiary_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {typeLabel(c)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted/30">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${progress(c)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(c.collected_amount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <SocialCaseStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailsTarget(c)}
                      >
                        {SOCIAL_CASE_LABELS.DETAILS_BUTTON}
                      </Button>
                      {c.status === SocialCaseStatus.SUBMITTED ? (
                        <Button
                          size="sm"
                          onClick={() => setValidateTarget(c)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {SOCIAL_CASE_LABELS.VALIDATE_BUTTON}
                        </Button>
                      ) : null}
                      {c.status === SocialCaseStatus.APPROVED ? (
                        <Button
                          size="sm"
                          onClick={() => setContributeTarget(c)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {SOCIAL_CASE_LABELS.CONTRIBUTE_BUTTON}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeclareSocialCaseDialog
        open={declareOpen}
        onOpenChange={setDeclareOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />
      <ValidateSocialCaseDialog
        open={!!validateTarget}
        onOpenChange={(open) => {
          if (!open) setValidateTarget(null);
        }}
        organizationId={organizationId}
        socialCase={validateTarget}
        onSuccess={refetch}
      />
      <ContributeSocialCaseDialog
        open={!!contributeTarget}
        onOpenChange={(open) => {
          if (!open) setContributeTarget(null);
        }}
        organizationId={organizationId}
        socialCase={contributeTarget}
        onSuccess={refetch}
      />
      <SocialCaseDetailsDialog
        open={!!detailsTarget}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
        organizationId={organizationId}
        socialCase={detailsTarget}
        onSuccess={refetch}
      />
    </div>
  );
}
