"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConsolidationMovements } from "@/hooks/accounting/useConsolidationMovements";
import { useConsolidate } from "@/hooks/accounting/useConsolidate";
import {
  AccountingEntryType,
  ConsolidationMovement,
} from "@/types/modules/accounting";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  ACCOUNTING_ENTRY_SOURCE_OPTIONS,
  ACCOUNTING_LABELS,
  COMMON_LABELS,
} from "@/utils/constants";
import { TreasuryAccountBadge } from "./TreasuryAccountBadge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

function sourceLabel(source: ConsolidationMovement["source"]): string {
  return (
    ACCOUNTING_ENTRY_SOURCE_OPTIONS.find((o) => o.value === source)?.label ??
    source
  );
}

export function ConsolidationDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const { movements, loading, error, online } =
    useConsolidationMovements(organizationId);
  const {
    consolidate,
    loading: saving,
    error: saveError,
  } = useConsolidate();
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [queued, setQueued] = useState(false);

  const pendingMovements = useMemo(
    () => movements.filter((m) => !m.consolidated),
    [movements],
  );
  const selectedIds = useMemo(
    () =>
      pendingMovements
        .filter((m) => !excluded.has(m.id))
        .map((m) => m.id),
    [pendingMovements, excluded],
  );
  const allSelected =
    pendingMovements.length > 0 &&
    selectedIds.length === pendingMovements.length;

  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setExcluded(
      allSelected ? new Set(pendingMovements.map((m) => m.id)) : new Set(),
    );
  };

  const handleGenerate = async () => {
    if (!selectedIds.length) return;
    try {
      const result = await consolidate(organizationId, selectedIds);
      if (result === null) {
        setQueued(true);
        onSuccess?.();
      } else {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ACCOUNTING_LABELS.CONSOLIDATE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {ACCOUNTING_LABELS.CONSOLIDATE_SYNC_PENDING}
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {COMMON_LABELS.CLOSE}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!online ? (
              <Alert>
                <AlertDescription>
                  {ACCOUNTING_LABELS.OFFLINE_NOTICE}
                </AlertDescription>
              </Alert>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {ACCOUNTING_LABELS.CONSOLIDATE_NOTE}
            </p>

            {loading ? (
              <p className="text-sm text-muted-foreground">
                {COMMON_LABELS.LOADING}
              </p>
            ) : error ? (
              <p className="text-sm text-destructive">
                {ACCOUNTING_LABELS.CONSOLIDATE_ERROR}
              </p>
            ) : !pendingMovements.length ? (
              <p className="text-sm text-muted-foreground">
                {ACCOUNTING_LABELS.CONSOLIDATE_EMPTY}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} / {pendingMovements.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAll}
                  >
                    {allSelected
                      ? ACCOUNTING_LABELS.SELECT_NONE
                      : ACCOUNTING_LABELS.SELECT_ALL}
                  </Button>
                </div>
                <div className="max-h-80 overflow-y-auto rounded-lg border border-border/50">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/30 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          {ACCOUNTING_LABELS.DATE_LABEL}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {ACCOUNTING_LABELS.LABEL_LABEL}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {ACCOUNTING_LABELS.SOURCE_LABEL}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {ACCOUNTING_LABELS.ACCOUNT_LABEL}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {ACCOUNTING_LABELS.AMOUNT_LABEL}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingMovements.map((m) => {
                        const isIncome =
                          m.entry_type === AccountingEntryType.INCOME;
                        const checked = !excluded.has(m.id);
                        return (
                          <tr key={m.id} className="border-t border-border/50">
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatDate(m.date)}
                            </td>
                            <td className="px-3 py-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(m.id)}
                                  className="accent-primary"
                                />
                                <span className="font-medium">{m.label}</span>
                              </label>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {sourceLabel(m.source)}
                            </td>
                            <td className="px-3 py-2">
                              <TreasuryAccountBadge type={m.account_type} />
                            </td>
                            <td
                              className={`px-3 py-2 font-medium ${
                                isIncome ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {isIncome ? "+" : "−"}
                              {formatCurrency(m.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {saveError ? (
              <Alert variant="destructive">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {COMMON_LABELS.CANCEL}
              </Button>
              <Button
                type="button"
                disabled={saving || !selectedIds.length}
                onClick={handleGenerate}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving
                  ? COMMON_LABELS.LOADING
                  : ACCOUNTING_LABELS.CONSOLIDATE_GENERATE_BUTTON}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
