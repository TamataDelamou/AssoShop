"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AccountingEntry,
  AccountingEntrySource,
  AccountingEntryStatus,
  AccountingEntryType,
  TreasuryAccount,
} from "@/types/modules/accounting";
import { formatCurrency } from "@/utils/formatters";
import {
  ACCOUNTING_ENTRY_SOURCE_OPTIONS,
  ACCOUNTING_LABELS,
} from "@/utils/constants";
import { TreasuryAccountBadge } from "./TreasuryAccountBadge";

interface Props {
  accounts: TreasuryAccount[];
  entries: AccountingEntry[];
}

interface SourceTotal {
  source: AccountingEntrySource;
  amount: number;
}

function sourceLabel(source: AccountingEntrySource): string {
  return (
    ACCOUNTING_ENTRY_SOURCE_OPTIONS.find((o) => o.value === source)?.label ??
    source
  );
}

function sum(entries: AccountingEntry[]): number {
  return entries.reduce((total, e) => total + e.amount, 0);
}

function groupBySource(entries: AccountingEntry[]): SourceTotal[] {
  const map = new Map<AccountingEntrySource, number>();
  for (const e of entries) {
    map.set(e.source, (map.get(e.source) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([source, amount]) => ({ source, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function FinancialStatements({ accounts, entries }: Props) {
  const confirmed = useMemo(
    () =>
      entries.filter((e) => e.status === AccountingEntryStatus.CONFIRMED),
    [entries],
  );
  const incomes = useMemo(
    () =>
      confirmed.filter((e) => e.entry_type === AccountingEntryType.INCOME),
    [confirmed],
  );
  const expenses = useMemo(
    () =>
      confirmed.filter((e) => e.entry_type === AccountingEntryType.EXPENSE),
    [confirmed],
  );

  const totalIncome = useMemo(() => sum(incomes), [incomes]);
  const totalExpense = useMemo(() => sum(expenses), [expenses]);
  const result = totalIncome - totalExpense;
  const treasury = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts],
  );
  const reserves = treasury - result;

  const incomeBySource = useMemo(() => groupBySource(incomes), [incomes]);
  const expenseBySource = useMemo(() => groupBySource(expenses), [expenses]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{ACCOUNTING_LABELS.INCOME_STATEMENT_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {ACCOUNTING_LABELS.INCOME_LABEL}
            </p>
            <p className="text-lg font-bold text-green-500">
              {formatCurrency(totalIncome)}
            </p>
            <div className="mt-1 space-y-1">
              {incomeBySource.map((row) => (
                <div
                  key={row.source}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {sourceLabel(row.source)}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(row.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {ACCOUNTING_LABELS.EXPENSE_LABEL}
            </p>
            <p className="text-lg font-bold text-red-500">
              {formatCurrency(totalExpense)}
            </p>
            <div className="mt-1 space-y-1">
              {expenseBySource.map((row) => (
                <div
                  key={row.source}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {sourceLabel(row.source)}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(row.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <span className="text-sm font-medium">
              {ACCOUNTING_LABELS.NET_RESULT_LABEL}
            </span>
            <span
              className={`text-lg font-bold ${
                result >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(result)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACCOUNTING_LABELS.BALANCE_SHEET_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {ACCOUNTING_LABELS.ASSETS_LABEL}
            </p>
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {ACCOUNTING_LABELS.TREASURY_LABEL}
                </span>
                <span className="font-medium">
                  {formatCurrency(treasury)}
                </span>
              </div>
              {accounts.map((a) => (
                <div
                  key={a.type}
                  className="flex items-center justify-between pl-4 text-sm"
                >
                  <TreasuryAccountBadge type={a.type} />
                  <span>{formatCurrency(a.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm font-medium">
            <span>
              {ACCOUNTING_LABELS.TOTAL_LABEL} {ACCOUNTING_LABELS.ASSETS_LABEL}
            </span>
            <span>{formatCurrency(treasury)}</span>
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium text-muted-foreground">
              {ACCOUNTING_LABELS.LIABILITIES_LABEL}
            </p>
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {ACCOUNTING_LABELS.RESERVES_LABEL}
                </span>
                <span className="font-medium">
                  {formatCurrency(reserves)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {ACCOUNTING_LABELS.RESULT_LABEL}
                </span>
                <span
                  className={`font-medium ${
                    result >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatCurrency(result)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm font-medium">
            <span>
              {ACCOUNTING_LABELS.TOTAL_LABEL}{" "}
              {ACCOUNTING_LABELS.LIABILITIES_LABEL}
            </span>
            <span>{formatCurrency(treasury)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
