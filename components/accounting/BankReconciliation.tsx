"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReconciliation } from "@/hooks/accounting/useReconciliation";
import { useReconcileLine } from "@/hooks/accounting/useReconcileLine";
import {
  AccountingEntry,
  AccountingEntryStatus,
  ReconciliationLine,
} from "@/types/modules/accounting";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { ACCOUNTING_LABELS, COMMON_LABELS } from "@/utils/constants";
import { TreasuryAccountBadge } from "./TreasuryAccountBadge";

interface Props {
  organizationId: string;
  entries: AccountingEntry[];
}

export function BankReconciliation({ organizationId, entries }: Props) {
  const { lines, loading, error, online, refetch } =
    useReconciliation(organizationId);
  const {
    reconcileLine,
    loading: saving,
    error: saveError,
  } = useReconcileLine();
  const [selection, setSelection] = useState<Record<string, string>>({});

  const matchedIds = useMemo(
    () =>
      new Set(
        lines
          .filter((l) => l.matched_entry_id)
          .map((l) => l.matched_entry_id as string),
      ),
    [lines],
  );

  const candidatesFor = (line: ReconciliationLine): AccountingEntry[] =>
    entries.filter(
      (e) =>
        e.account_type === line.account_type &&
        e.status === AccountingEntryStatus.CONFIRMED &&
        e.amount === line.amount &&
        !matchedIds.has(e.id),
    );

  const matchedLabel = (entryId: string | null): string | null =>
    entryId
      ? entries.find((e) => e.id === entryId)?.label ?? null
      : null;

  const handleReconcile = async (line: ReconciliationLine) => {
    const entryId = selection[line.id];
    if (!entryId) return;
    try {
      await reconcileLine(organizationId, line.id, entryId);
      setSelection((prev) => {
        const next = { ...prev };
        delete next[line.id];
        return next;
      });
      await refetch();
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const reconciledCount = lines.filter((l) => l.matched_entry_id).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reconciledCount} / {lines.length} {ACCOUNTING_LABELS.RECONCILED_LABEL}
        </p>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{ACCOUNTING_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}
      {saveError ? (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {ACCOUNTING_LABELS.RECONCILIATION_LOAD_ERROR}
        </p>
      ) : !lines.length ? (
        <p className="text-sm text-muted-foreground">
          {ACCOUNTING_LABELS.RECONCILE_EMPTY}
        </p>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {ACCOUNTING_LABELS.DATE_LABEL}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ACCOUNTING_LABELS.LABEL_LABEL}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ACCOUNTING_LABELS.ACCOUNT_LABEL}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ACCOUNTING_LABELS.AMOUNT_LABEL}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ACCOUNTING_LABELS.STATUS_LABEL}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ACCOUNTING_LABELS.MATCH_LABEL}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ACCOUNTING_LABELS.ACTIONS_LABEL}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const matched = !!line.matched_entry_id;
                    const candidates = candidatesFor(line);
                    return (
                      <tr key={line.id} className="border-t border-border/50">
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(line.date)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {line.label}
                        </td>
                        <td className="px-4 py-3">
                          <TreasuryAccountBadge type={line.account_type} />
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatCurrency(line.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`border-none font-normal ${
                              matched
                                ? "bg-green-500/20 text-green-500"
                                : "bg-amber-500/20 text-amber-500"
                            }`}
                          >
                            {matched
                              ? ACCOUNTING_LABELS.RECONCILED_LABEL
                              : ACCOUNTING_LABELS.TO_RECONCILE_LABEL}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {matched ? matchedLabel(line.matched_entry_id) : (
                            candidates.length ? (
                              <Select
                                value={selection[line.id] ?? ""}
                                onValueChange={(value) =>
                                  setSelection((prev) => ({
                                    ...prev,
                                    [line.id]: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-56">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {candidates.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              ACCOUNTING_LABELS.RECONCILE_NO_CANDIDATE
                            )
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!matched ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={saving || !selection[line.id]}
                              onClick={() => handleReconcile(line)}
                            >
                              {ACCOUNTING_LABELS.RECONCILE_BUTTON}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
