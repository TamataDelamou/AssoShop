"use client";

import { useCloseGroup } from "@/hooks/finance/useCloseGroup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/utils/formatters";
import { COMMON_LABELS, FINANCE_LABELS } from "@/utils/constants";
import { FinancialGroup } from "@/types/modules/finance";
import { Archive } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  group: FinancialGroup | null;
  onClosed?: (group: FinancialGroup) => void;
}

export function CloseGroupDialog({
  open,
  onOpenChange,
  organizationId,
  group,
  onClosed,
}: Props) {
  const { closing, error, close } = useCloseGroup(organizationId);
  const turnsReceived =
    group?.turns?.filter((t) => t.received).length ?? 0;

  const handleClose = async () => {
    if (!group) return;
    try {
      const result = await close(group.id);
      onClosed?.(result);
      onOpenChange(false);
    } catch {
      // L'erreur est exposée par le hook.
    }
  };

  return (
    <Dialog open={open && !!group} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {FINANCE_LABELS.CLOSE_TITLE}
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

        {group && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(group.raised_amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {FINANCE_LABELS.CLOSE_SUMMARY_RAISED}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-base font-semibold text-foreground">
                  {turnsReceived}/{group.turns?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {FINANCE_LABELS.CLOSE_SUMMARY_TURNS}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-base font-semibold text-foreground">
                  {group.members?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {FINANCE_LABELS.CLOSE_SUMMARY_MEMBERS}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {FINANCE_LABELS.CLOSE_NOTICE}
            </p>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
                disabled={closing}
              >
                {COMMON_LABELS.CANCEL}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleClose}
                disabled={closing}
              >
                <Archive className="mr-2 h-4 w-4" />
                {closing ? COMMON_LABELS.LOADING : FINANCE_LABELS.CLOSE_CONFIRM}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
