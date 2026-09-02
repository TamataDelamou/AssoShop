"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDisburseSocialCase } from "@/hooks/community/useDisburseSocialCase";
import {
  SocialCase,
  SocialCaseStatus,
} from "@/types/modules/community";
import { SocialCaseStatusBadge } from "./SocialCaseStatusBadge";
import {
  COMMON_LABELS,
  SOCIAL_CASE_LABELS,
  SOCIAL_CASE_TYPES,
} from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  socialCase: SocialCase | null;
  onSuccess?: () => void;
}

export function SocialCaseDetailsDialog({
  open,
  onOpenChange,
  organizationId,
  socialCase,
  onSuccess,
}: Props) {
  const { disburse, loading, error } = useDisburseSocialCase();

  const percent =
    socialCase && socialCase.target_amount > 0
      ? Math.min(
          100,
          Math.round(
            (socialCase.collected_amount / socialCase.target_amount) * 100,
          ),
        )
      : 0;

  const typeLabel =
    SOCIAL_CASE_TYPES.find((t) => t.value === socialCase?.type)?.label ?? "-";

  const handleDisburse = async () => {
    if (!socialCase) return;
    try {
      await disburse(organizationId, socialCase.id);
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open && !!socialCase} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{SOCIAL_CASE_LABELS.DETAILS_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        {socialCase ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground">
                  {socialCase.title}
                </h3>
                <p className="text-sm text-muted-foreground">{typeLabel}</p>
              </div>
              <SocialCaseStatusBadge status={socialCase.status} />
            </div>

            <p className="text-sm text-muted-foreground">
              {socialCase.description}
            </p>

            <div className="rounded-lg border border-border/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {SOCIAL_CASE_LABELS.BENEFICIARY_LABEL}
                </span>
                <span className="font-medium">
                  {socialCase.beneficiary_name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {SOCIAL_CASE_LABELS.CREATED_AT_LABEL}
                </span>
                <span className="font-medium">
                  {formatDate(socialCase.created_at)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {SOCIAL_CASE_LABELS.PROGRESS_LABEL}
                </span>
                <span className="font-medium">
                  {formatCurrency(socialCase.collected_amount)} /{" "}
                  {formatCurrency(socialCase.target_amount)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/30">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {socialCase.committee_note ? (
              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {SOCIAL_CASE_LABELS.COMMITTEE_NOTE_LABEL}
                </p>
                <p className="text-sm text-foreground">
                  {socialCase.committee_note}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {SOCIAL_CASE_LABELS.CONTRIBUTORS_LABEL}
              </p>
              {!socialCase.contributors_visible ? (
                <p className="text-sm text-muted-foreground">
                  {SOCIAL_CASE_LABELS.CONTRIBUTORS_HIDDEN}
                </p>
              ) : !socialCase.contributors?.length ? (
                <p className="text-sm text-muted-foreground">
                  {SOCIAL_CASE_LABELS.NO_CONTRIBUTORS}
                </p>
              ) : (
                <ul className="space-y-1">
                  {socialCase.contributors.map((c) => (
                    <li
                      key={c.id}
                      className="flex justify-between text-sm text-muted-foreground"
                    >
                      <span>{c.name}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(c.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {socialCase.status === SocialCaseStatus.FUNDED ? (
              <Alert>
                <AlertDescription>
                  {SOCIAL_CASE_LABELS.FUNDED_NOTE}
                </AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {COMMON_LABELS.CLOSE}
              </Button>
              {socialCase.status === SocialCaseStatus.FUNDED ? (
                <Button
                  type="button"
                  onClick={handleDisburse}
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading
                    ? COMMON_LABELS.LOADING
                    : SOCIAL_CASE_LABELS.DISBURSE_BUTTON}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
