"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FinancialGroupTypeBadge } from "./FinancialGroupTypeBadge";
import { FinancialGroupStatusBadge } from "./FinancialGroupStatusBadge";
import { EngagementBadge } from "./EngagementBadge";
import { DeclarePaymentDialog } from "./DeclarePaymentDialog";
import { TrustScoreDialog } from "./TrustScoreDialog";
import { GroupTransactionsDialog } from "./GroupTransactionsDialog";
import { GroupStatisticsDialog } from "./GroupStatisticsDialog";
import { GroupSettingsDialog } from "./GroupSettingsDialog";
import { CloseGroupDialog } from "./CloseGroupDialog";
import { useAiGroupRisk } from "@/hooks/finance/useAiGroupRisk";
import { useValidatePayment } from "@/hooks/finance/useValidatePayment";
import { AtRiskMember } from "@/lib/ai";
import {
  FinancialGroup,
  FinancialGroupStatus,
  FinancialGroupType,
  GroupMember,
  GroupMemberRole,
  GroupPaymentMethod,
  GroupPaymentStatus,
} from "@/types/modules/finance";
import {
  COMMON_LABELS,
  FINANCE_LABELS,
  GROUP_MEMBER_ROLE_OPTIONS,
  GROUP_PAYMENT_METHOD_OPTIONS,
  GROUP_PAYMENT_STATUS_OPTIONS,
  GROUP_PERIODICITY_OPTIONS,
  TRUST_SCORE_LABELS,
} from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Archive, BarChart3, History, Settings2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  group: FinancialGroup | null;
  onChanged?: () => void;
  onGroupChange?: (group: FinancialGroup) => void;
}

function roleLabel(role: GroupMemberRole): string {
  return GROUP_MEMBER_ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

function methodLabel(method: GroupPaymentMethod): string {
  return (
    GROUP_PAYMENT_METHOD_OPTIONS.find((m) => m.value === method)?.label ??
    method
  );
}

export function FinancialGroupDetailsDialog({
  open,
  onOpenChange,
  organizationId,
  group,
  onChanged,
  onGroupChange,
}: Props) {
  const [flagged, setFlagged] = useState<AtRiskMember[] | null>(null);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [scoreTarget, setScoreTarget] = useState<GroupMember | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const { analyze, analyzing, error: aiError } = useAiGroupRisk();
  const {
    validatePayment,
    loading: validating,
    error: validateError,
    pendingSync: validatePending,
  } = useValidatePayment();

  const handleAnalyze = async () => {
    if (!group) return;
    try {
      const result = await analyze(group.members);
      setFlagged(result);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const handleValidate = async (paymentId: string) => {
    if (!group) return;
    setValidatingId(paymentId);
    try {
      const result = await validatePayment(organizationId, group.id, paymentId);
      if (result) {
        onGroupChange?.(result);
      }
      onChanged?.();
    } catch {
      // L'erreur est déjà exposée par le hook.
    } finally {
      setValidatingId(null);
    }
  };

  const handleDeclared = (result: FinancialGroup | null) => {
    if (result) {
      onGroupChange?.(result);
    }
    onChanged?.();
  };

  const periodicityLabel = group
    ? GROUP_PERIODICITY_OPTIONS.find((p) => p.value === group.periodicity)
        ?.label
    : "";

  const percent =
    group && group.goal_amount
      ? Math.min(
          100,
          Math.round((group.raised_amount / group.goal_amount) * 100),
        )
      : 0;

  return (
    <>
      <Dialog open={open && !!group} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{FINANCE_LABELS.PAGE_TITLE}</DialogTitle>
          </DialogHeader>
          {group ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-foreground">{group.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {FINANCE_LABELS.AMOUNT_LABEL} : {formatCurrency(group.amount)}{" "}
                    · {periodicityLabel}
                  </p>
                </div>
                <div className="flex gap-2">
                  <FinancialGroupTypeBadge type={group.type} />
                  <FinancialGroupStatusBadge status={group.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {FINANCE_LABELS.MEMBERS_LABEL}
                  </p>
                  <p className="font-medium">
                    {group.members?.length ?? 0}/{group.max_members}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {FINANCE_LABELS.RAISED_LABEL}
                  </p>
                  <p className="font-medium">
                    {formatCurrency(group.raised_amount)}
                  </p>
                </div>
              </div>

              {group.type === FinancialGroupType.SAVINGS_GOAL &&
              group.goal_amount ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(group.raised_amount)}{" "}
                      {FINANCE_LABELS.RAISED_LABEL}
                    </span>
                    <span className="text-muted-foreground">
                      {FINANCE_LABELS.GOAL_LABEL}{" "}
                      {formatCurrency(group.goal_amount)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{percent}%</p>
                </div>
              ) : null}

              {group.type === FinancialGroupType.SAVINGS &&
              group.interest_rate !== null ? (
                <p className="text-sm text-muted-foreground">
                  {FINANCE_LABELS.INTEREST_RATE_LABEL} : {group.interest_rate}%
                </p>
              ) : null}

              {group.type === FinancialGroupType.TONTINE ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {FINANCE_LABELS.TURNS_TITLE}
                  </p>
                  {!group.turns?.length ? (
                    <p className="text-sm text-muted-foreground">
                      {FINANCE_LABELS.TURNS_EMPTY}
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {group.turns.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-4 text-right text-muted-foreground">
                              {t.position}.
                            </span>
                            <span className="text-foreground">
                              {t.member_name}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(t.expected_date)}
                            </span>
                            <Badge
                              className={
                                t.received
                                  ? "border-none bg-green-500/20 font-normal text-green-500"
                                  : "border-none bg-amber-500/20 font-normal text-amber-500"
                              }
                            >
                              {t.received
                                ? FINANCE_LABELS.TURN_RECEIVED
                                : FINANCE_LABELS.TURN_PENDING}
                            </Badge>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {FINANCE_LABELS.MEMBERS_LABEL}
                </p>
                {!group.members?.length ? (
                  <p className="text-sm text-muted-foreground">
                    {FINANCE_LABELS.NO_MEMBERS}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {group.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div>
                          <p className="text-foreground">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {roleLabel(m.role)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <EngagementBadge engagement={m.engagement} />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setScoreTarget(m)}
                          >
                            {TRUST_SCORE_LABELS.SCORE_BUTTON}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {FINANCE_LABELS.AI_RISK_TITLE}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing
                      ? COMMON_LABELS.LOADING
                      : FINANCE_LABELS.AI_RISK_BUTTON}
                  </Button>
                </div>
                {aiError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{aiError}</AlertDescription>
                  </Alert>
                ) : null}
                {flagged ? (
                  flagged.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {FINANCE_LABELS.AI_RISK_NONE}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {flagged.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {f.name}
                          </span>
                          <span className="text-muted-foreground">
                            {f.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
                {flagged ? (
                  <p className="text-xs text-muted-foreground">
                    {FINANCE_LABELS.AI_RISK_NOTICE}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {FINANCE_LABELS.PAYMENTS_LABEL}
                  </p>
                  {group.status !== FinancialGroupStatus.CLOSED ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeclareOpen(true)}
                    >
                      {FINANCE_LABELS.DECLARE_PAYMENT_BUTTON}
                    </Button>
                  ) : null}
                </div>
                {validatePending ? (
                  <Alert>
                    <AlertDescription>
                      {FINANCE_LABELS.SYNC_PENDING_VALIDATION}
                    </AlertDescription>
                  </Alert>
                ) : null}
                {validateError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{validateError}</AlertDescription>
                  </Alert>
                ) : null}
                {!group.payments?.length ? (
                  <p className="text-sm text-muted-foreground">
                    {FINANCE_LABELS.NO_PAYMENTS}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {group.payments.map((p) => {
                      const statusOption = GROUP_PAYMENT_STATUS_OPTIONS.find(
                        (s) => s.value === p.status,
                      );
                      return (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div>
                            <p className="text-foreground">{p.member_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {methodLabel(p.method)}
                              {p.paid_for_member_name
                                ? ` · ${FINANCE_LABELS.PAYMENT_FOR} ${p.paid_for_member_name}`
                                : ""}
                              {p.paid_at
                                ? ` · ${formatDate(p.paid_at)}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">
                              {formatCurrency(p.amount)}
                            </span>
                            {statusOption ? (
                              <Badge
                                className={`${statusOption.color} border-none font-normal`}
                              >
                                {statusOption.label}
                              </Badge>
                            ) : null}
                            {p.status === GroupPaymentStatus.PENDING ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={validating || validatingId === p.id}
                                onClick={() => handleValidate(p.id)}
                              >
                                {validatingId === p.id
                                  ? COMMON_LABELS.LOADING
                                  : FINANCE_LABELS.VALIDATE_BUTTON}
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryOpen(true)}
                  >
                    <History className="mr-1 h-4 w-4" />
                    {FINANCE_LABELS.HISTORY_BUTTON}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStatsOpen(true)}
                  >
                    <BarChart3 className="mr-1 h-4 w-4" />
                    {FINANCE_LABELS.STATS_BUTTON}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings2 className="mr-1 h-4 w-4" />
                    {FINANCE_LABELS.SETTINGS_BUTTON}
                  </Button>
                  {group.status !== FinancialGroupStatus.CLOSED ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setCloseOpen(true)}
                    >
                      <Archive className="mr-1 h-4 w-4" />
                      {FINANCE_LABELS.CLOSE_BUTTON}
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {COMMON_LABELS.CLOSE}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeclarePaymentDialog
        key={group?.id ?? "none"}
        open={declareOpen}
        onOpenChange={setDeclareOpen}
        organizationId={organizationId}
        group={group}
        onSuccess={handleDeclared}
      />

      <TrustScoreDialog
        open={!!scoreTarget}
        onOpenChange={(open) => {
          if (!open) setScoreTarget(null);
        }}
        member={scoreTarget}
      />

      <GroupTransactionsDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        organizationId={organizationId}
        group={group}
      />

      <GroupStatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        organizationId={organizationId}
        group={group}
      />

      <GroupSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        organizationId={organizationId}
        group={group}
      />

      <CloseGroupDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        organizationId={organizationId}
        group={group}
        onClosed={(result) => {
          onGroupChange?.(result);
          onChanged?.();
        }}
      />
    </>
  );
}
