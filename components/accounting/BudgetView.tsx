"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBudget } from "@/hooks/accounting/useBudget";
import {
  AccountingEntry,
  AccountingEntrySource,
  AccountingEntryStatus,
  AccountingEntryType,
} from "@/types/modules/accounting";
import { formatCurrency } from "@/utils/formatters";
import {
  ACCOUNTING_ENTRY_SOURCE_OPTIONS,
  ACCOUNTING_LABELS,
  COMMON_LABELS,
} from "@/utils/constants";

interface Props {
  organizationId: string;
  entries: AccountingEntry[];
}

interface ActualRow {
  income: number;
  expense: number;
}

function sourceLabel(source: AccountingEntrySource): string {
  return (
    ACCOUNTING_ENTRY_SOURCE_OPTIONS.find((o) => o.value === source)?.label ??
    source
  );
}

function Variance({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "text-green-500" : "text-red-500"}>
      {value >= 0 ? "+" : "−"}
      {formatCurrency(Math.abs(value))}
    </span>
  );
}

export function BudgetView({ organizationId, entries }: Props) {
  const { budget, loading, error, online } = useBudget(organizationId);

  const confirmed = useMemo(
    () =>
      entries.filter((e) => e.status === AccountingEntryStatus.CONFIRMED),
    [entries],
  );

  const actualBySource = useMemo(() => {
    const map = new Map<AccountingEntrySource, ActualRow>();
    for (const e of confirmed) {
      const row = map.get(e.source) ?? { income: 0, expense: 0 };
      if (e.entry_type === AccountingEntryType.INCOME) {
        row.income += e.amount;
      } else {
        row.expense += e.amount;
      }
      map.set(e.source, row);
    }
    return map;
  }, [confirmed]);

  const rows = useMemo(
    () =>
      budget.map((b) => {
        const actual = actualBySource.get(b.source) ?? {
          income: 0,
          expense: 0,
        };
        return {
          source: b.source,
          planned_income: b.planned_income,
          planned_expense: b.planned_expense,
          actual_income: actual.income,
          actual_expense: actual.expense,
        };
      }),
    [budget, actualBySource],
  );

  const renderTable = (kind: "income" | "expense") => {
    const title =
      kind === "income"
        ? ACCOUNTING_LABELS.BUDGET_INCOME_SECTION
        : ACCOUNTING_LABELS.BUDGET_EXPENSE_SECTION;
    const plannedKey =
      kind === "income" ? "planned_income" : "planned_expense";
    const actualKey =
      kind === "income" ? "actual_income" : "actual_expense";

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    {ACCOUNTING_LABELS.SOURCE_LABEL}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {ACCOUNTING_LABELS.BUDGET_PLANNED_LABEL}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {ACCOUNTING_LABELS.BUDGET_ACTUAL_LABEL}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {ACCOUNTING_LABELS.BUDGET_VARIANCE_LABEL}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const planned = row[plannedKey];
                  const actual = row[actualKey];
                  return (
                    <tr key={row.source} className="border-t border-border/50">
                      <td className="px-4 py-3 font-medium">
                        {sourceLabel(row.source)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatCurrency(planned)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatCurrency(actual)}
                      </td>
                      <td className="px-4 py-3">
                        <Variance value={actual - planned} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {!online ? (
        <Alert>
          <AlertDescription>{ACCOUNTING_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {ACCOUNTING_LABELS.BUDGET_LOAD_ERROR}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {renderTable("income")}
          {renderTable("expense")}
        </div>
      )}
    </div>
  );
}
