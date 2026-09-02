"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSolidarity } from "@/hooks/finance/useSolidarity";
import { useFinancialGroups } from "@/hooks/finance/useFinancialGroups";
import { useDecideClaim } from "@/hooks/finance/useDecideClaim";
import { ClaimStatusBadge } from "./ClaimStatusBadge";
import { InsuranceStatusBadge } from "./InsuranceStatusBadge";
import { EnrollInsuranceDialog } from "./EnrollInsuranceDialog";
import { DeclareClaimDialog } from "./DeclareClaimDialog";
import {
  ClaimStatus,
  GroupMember,
} from "@/types/modules/finance";
import {
  COMMON_LABELS,
  INSURANCE_LABELS,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  organizationId: string;
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  })} %`;
}

export function SolidarityPage({ organizationId }: Props) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const { bundle, loading, error, online, refetch } =
    useSolidarity(organizationId);
  const { groups } = useFinancialGroups(organizationId);
  const {
    decideClaim,
    loading: deciding,
    error: decideError,
    pendingSync: decidePending,
  } = useDecideClaim();

  const members = useMemo(() => {
    const map = new Map<string, GroupMember>();
    for (const group of groups) {
      for (const m of group.members ?? []) {
        if (!map.has(m.id)) {
          map.set(m.id, m);
        }
      }
    }
    return Array.from(map.values());
  }, [groups]);

  const fund = bundle?.fund;
  const enrollments = bundle?.enrollments ?? [];
  const claims = bundle?.claims ?? [];

  const activeEnrollments = enrollments.filter(
    (e) => e.status === "active",
  ).length;
  const pendingClaims = claims.filter(
    (c) =>
      c.status === ClaimStatus.SUBMITTED ||
      c.status === ClaimStatus.UNDER_REVIEW,
  ).length;

  const handleDecide = async (claimId: string, approved: boolean) => {
    setDecidingId(claimId);
    try {
      await decideClaim(organizationId, claimId, approved);
      refetch();
    } catch {
      // L'erreur est déjà exposée par le hook.
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{INSURANCE_LABELS.PAGE_TITLE}</h1>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{INSURANCE_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-3">
          <CardContent className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {INSURANCE_LABELS.FUND_TITLE}
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(fund?.balance ?? 0)}
              </p>
            </div>
            {fund ? (
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <p className="text-muted-foreground">
                  {INSURANCE_LABELS.FUND_LEVY_RATE} :{" "}
                  {formatPercent(fund.levy_rate)}
                </p>
                <p className="text-muted-foreground">
                  {INSURANCE_LABELS.FUND_CAP} :{" "}
                  {formatCurrency(fund.cap_amount)}
                </p>
                <p className="text-muted-foreground">
                  {INSURANCE_LABELS.FUND_COLLECTED} :{" "}
                  {formatCurrency(fund.total_collected)}
                </p>
                <p className="text-muted-foreground">
                  {INSURANCE_LABELS.FUND_USED} :{" "}
                  {formatCurrency(fund.total_used)}
                </p>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {INSURANCE_LABELS.FUND_NOTE}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {INSURANCE_LABELS.SUMMARY_ENROLLED}
            </p>
            <p className="text-2xl font-bold">{activeEnrollments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {INSURANCE_LABELS.SUMMARY_CLAIMS}
            </p>
            <p className="text-2xl font-bold">{pendingClaims}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{INSURANCE_LABELS.LOAD_ERROR}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {INSURANCE_LABELS.ENROLLMENTS_TITLE}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEnrollOpen(true)}
              >
                {INSURANCE_LABELS.ENROLL_BUTTON}
              </Button>
            </div>
            {!enrollments.length ? (
              <p className="text-sm text-muted-foreground">
                {INSURANCE_LABELS.NO_DATA}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        {INSURANCE_LABELS.MEMBER_LABEL}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {INSURANCE_LABELS.STATUS_LABEL}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr key={e.id} className="border-t border-border/50">
                        <td className="px-4 py-3 font-medium">
                          {e.member_name}
                        </td>
                        <td className="px-4 py-3">
                          <InsuranceStatusBadge status={e.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {INSURANCE_LABELS.CLAIMS_TITLE}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClaimOpen(true)}
              >
                {INSURANCE_LABELS.DECLARE_CLAIM_BUTTON}
              </Button>
            </div>
            {decidePending ? (
              <Alert>
                <AlertDescription>
                  {INSURANCE_LABELS.ACTION_SYNC_PENDING}
                </AlertDescription>
              </Alert>
            ) : null}
            {decideError ? (
              <Alert variant="destructive">
                <AlertDescription>{decideError}</AlertDescription>
              </Alert>
            ) : null}
            {!claims.length ? (
              <p className="text-sm text-muted-foreground">
                {INSURANCE_LABELS.NO_DATA}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        {INSURANCE_LABELS.MEMBER_LABEL}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {INSURANCE_LABELS.DESCRIPTION_LABEL}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {INSURANCE_LABELS.AMOUNT_LABEL}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {INSURANCE_LABELS.STATUS_LABEL}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {INSURANCE_LABELS.ACTIONS_LABEL}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => {
                      const decidable =
                        c.status === ClaimStatus.SUBMITTED ||
                        c.status === ClaimStatus.UNDER_REVIEW;
                      return (
                        <tr key={c.id} className="border-t border-border/50">
                          <td className="px-4 py-3 font-medium">
                            {c.member_name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.description}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatCurrency(c.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <ClaimStatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-3">
                            {decidable ? (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={deciding || decidingId === c.id}
                                  onClick={() =>
                                    handleDecide(c.id, false)
                                  }
                                >
                                  {INSURANCE_LABELS.REJECT_BUTTON}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={deciding || decidingId === c.id}
                                  onClick={() => handleDecide(c.id, true)}
                                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                  {decidingId === c.id
                                    ? COMMON_LABELS.LOADING
                                    : INSURANCE_LABELS.APPROVE_BUTTON}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {INSURANCE_LABELS.INDEMNITY_LABEL} :{" "}
                                {formatCurrency(c.indemnity)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <EnrollInsuranceDialog
        key={enrollOpen ? "open" : "closed"}
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        organizationId={organizationId}
        members={members}
        onSuccess={refetch}
      />
      <DeclareClaimDialog
        key={claimOpen ? "open" : "closed"}
        open={claimOpen}
        onOpenChange={setClaimOpen}
        organizationId={organizationId}
        members={members}
        onSuccess={refetch}
      />
    </div>
  );
}
