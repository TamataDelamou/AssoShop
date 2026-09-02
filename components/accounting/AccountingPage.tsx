"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAccounting } from "@/hooks/accounting/useAccounting";
import {
  AccountingEntry,
  AccountingEntrySource,
  AccountingEntryStatus,
  AccountingEntryType,
  TreasuryAccount,
} from "@/types/modules/accounting";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  ACCOUNTING_ENTRY_SOURCE_OPTIONS,
  ACCOUNTING_ENTRY_TYPE_OPTIONS,
  ACCOUNTING_LABELS,
  COMMON_LABELS,
} from "@/utils/constants";
import { TreasuryAccountBadge } from "./TreasuryAccountBadge";
import { AccountingEntryStatusBadge } from "./AccountingEntryStatusBadge";
import { BankReconciliation } from "./BankReconciliation";
import { BudgetView } from "./BudgetView";
import { ConsolidationDialog } from "./ConsolidationDialog";
import { CreateEntryDialog } from "./CreateEntryDialog";
import { FinancialStatements } from "./FinancialStatements";
import { ValidateEntryDialog } from "./ValidateEntryDialog";

interface Props {
  organizationId: string;
}

function entryTypeLabel(type: AccountingEntryType): string {
  return (
    ACCOUNTING_ENTRY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
  );
}

function sourceLabel(source: AccountingEntrySource): string {
  return (
    ACCOUNTING_ENTRY_SOURCE_OPTIONS.find((o) => o.value === source)?.label ??
    source
  );
}

const EMPTY_ACCOUNTS: TreasuryAccount[] = [];
const EMPTY_ENTRIES: AccountingEntry[] = [];

export function AccountingPage({ organizationId }: Props) {
  const [view, setView] = useState<
    "journal" | "ledger" | "statements" | "reconciliation" | "budget"
  >("journal");
  const [createOpen, setCreateOpen] = useState(false);
  const [consolidateOpen, setConsolidateOpen] = useState(false);
  const [validateTarget, setValidateTarget] =
    useState<AccountingEntry | null>(null);

  const { bundle, loading, error, online, refetch } =
    useAccounting(organizationId);

  const accounts = bundle?.accounts ?? EMPTY_ACCOUNTS;
  const entries = bundle?.entries ?? EMPTY_ENTRIES;

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts],
  );
  const pendingEntries = useMemo(
    () =>
      entries.filter((e) => e.status === AccountingEntryStatus.PENDING),
    [entries],
  );
  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0),
      ),
    [entries],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ACCOUNTING_LABELS.PAGE_TITLE}</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConsolidateOpen(true)}
          >
            {ACCOUNTING_LABELS.CONSOLIDATE_BUTTON}
          </Button>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {ACCOUNTING_LABELS.NEW_ENTRY_BUTTON}
          </Button>
        </div>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{ACCOUNTING_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {ACCOUNTING_LABELS.SUMMARY_BALANCE}
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {ACCOUNTING_LABELS.SUMMARY_PENDING}
            </p>
            <p className="text-2xl font-bold">{pendingEntries.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {ACCOUNTING_LABELS.LOAD_ERROR}
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {ACCOUNTING_LABELS.ACCOUNTS_TITLE}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {accounts.map((a) => (
                <Card key={a.type}>
                  <CardContent className="space-y-2 pt-4">
                    <TreasuryAccountBadge type={a.type} />
                    <p className="text-xl font-bold">
                      {formatCurrency(a.balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNTING_LABELS.ACCOUNT_PENDING_IN} :{" "}
                      {formatCurrency(a.pending_in)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNTING_LABELS.ACCOUNT_PENDING_OUT} :{" "}
                      {formatCurrency(a.pending_out)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {ACCOUNTING_LABELS.PENDING_SECTION_TITLE}
            </p>
            {!pendingEntries.length ? (
              <p className="text-sm text-muted-foreground">
                {ACCOUNTING_LABELS.NO_PENDING}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/50">
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
                        {ACCOUNTING_LABELS.ACTIONS_LABEL}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEntries.map((e) => (
                      <tr key={e.id} className="border-t border-border/50">
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(e.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium">{e.label}</td>
                        <td className="px-4 py-3">
                          <TreasuryAccountBadge type={e.account_type} />
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setValidateTarget(e)}
                          >
                            {ACCOUNTING_LABELS.VALIDATE_BUTTON}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={view === "journal" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("journal")}
              >
                {ACCOUNTING_LABELS.JOURNAL_TITLE}
              </Button>
              <Button
                type="button"
                variant={view === "ledger" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("ledger")}
              >
                {ACCOUNTING_LABELS.LEDGER_TITLE}
              </Button>
              <Button
                type="button"
                variant={view === "statements" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("statements")}
              >
                {ACCOUNTING_LABELS.STATEMENTS_TITLE}
              </Button>
              <Button
                type="button"
                variant={view === "reconciliation" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("reconciliation")}
              >
                {ACCOUNTING_LABELS.RECONCILIATION_TITLE}
              </Button>
              <Button
                type="button"
                variant={view === "budget" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("budget")}
              >
                {ACCOUNTING_LABELS.BUDGET_TITLE}
              </Button>
            </div>

            {view === "journal" ? (
              !sortedEntries.length ? (
                <p className="text-sm text-muted-foreground">
                  {ACCOUNTING_LABELS.NO_DATA}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border/50">
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
                          {ACCOUNTING_LABELS.TYPE_LABEL}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {ACCOUNTING_LABELS.PAYER_LABEL} →{" "}
                          {ACCOUNTING_LABELS.BENEFICIARY_LABEL}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {ACCOUNTING_LABELS.AMOUNT_LABEL}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {ACCOUNTING_LABELS.STATUS_LABEL}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((e) => {
                        const isIncome =
                          e.entry_type === AccountingEntryType.INCOME;
                        return (
                          <tr key={e.id} className="border-t border-border/50">
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDate(e.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{e.label}</p>
                              {e.source !== AccountingEntrySource.MANUAL ? (
                                <p className="text-xs text-muted-foreground">
                                  {sourceLabel(e.source)}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <TreasuryAccountBadge type={e.account_type} />
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {entryTypeLabel(e.entry_type)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {e.payer_name} → {e.beneficiary_name}
                            </td>
                            <td
                              className={`px-4 py-3 font-medium ${
                                isIncome ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {isIncome ? "+" : "−"}
                              {formatCurrency(e.amount)}
                            </td>
                            <td className="px-4 py-3">
                              <AccountingEntryStatusBadge status={e.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : view === "ledger" ? (
              <div className="space-y-4">
                {accounts.map((a) => {
                  const confirmed = sortedEntries
                    .filter(
                      (e) =>
                        e.account_type === a.type &&
                        e.status === AccountingEntryStatus.CONFIRMED,
                    )
                    .sort(
                      (x, y) =>
                        (x.created_at?.getTime() ?? 0) -
                        (y.created_at?.getTime() ?? 0),
                    );
                  let running = 0;
                  return (
                    <Card key={a.type}>
                      <CardContent className="space-y-2 pt-4">
                        <div className="flex items-center justify-between">
                          <TreasuryAccountBadge type={a.type} />
                          <span className="text-sm font-medium">
                            {ACCOUNTING_LABELS.ACCOUNT_BALANCE} :{" "}
                            {formatCurrency(a.balance)}
                          </span>
                        </div>
                        {!confirmed.length ? (
                          <p className="text-sm text-muted-foreground">
                            {ACCOUNTING_LABELS.NO_DATA}
                          </p>
                        ) : (
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
                                    {ACCOUNTING_LABELS.AMOUNT_LABEL}
                                  </th>
                                  <th className="px-4 py-3 font-medium">
                                    {ACCOUNTING_LABELS.ACCOUNT_BALANCE}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {confirmed.map((e) => {
                                  const isIncome =
                                    e.entry_type ===
                                    AccountingEntryType.INCOME;
                                  running += isIncome ? e.amount : -e.amount;
                                  return (
                                    <tr
                                      key={e.id}
                                      className="border-t border-border/50"
                                    >
                                      <td className="px-4 py-3 text-muted-foreground">
                                        {formatDate(e.created_at)}
                                      </td>
                                      <td className="px-4 py-3 font-medium">
                                        {e.label}
                                      </td>
                                      <td
                                        className={`px-4 py-3 font-medium ${
                                          isIncome
                                            ? "text-green-500"
                                            : "text-red-500"
                                        }`}
                                      >
                                        {isIncome ? "+" : "−"}
                                        {formatCurrency(e.amount)}
                                      </td>
                                      <td className="px-4 py-3 text-muted-foreground">
                                        {formatCurrency(running)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : view === "statements" ? (
              <FinancialStatements accounts={accounts} entries={entries} />
            ) : view === "reconciliation" ? (
              <BankReconciliation
                organizationId={organizationId}
                entries={entries}
              />
            ) : (
              <BudgetView organizationId={organizationId} entries={entries} />
            )}
          </section>
        </>
      )}

      <ConsolidationDialog
        key={consolidateOpen ? "open" : "closed"}
        open={consolidateOpen}
        onOpenChange={setConsolidateOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />
      <CreateEntryDialog
        key={createOpen ? "open" : "closed"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />
      <ValidateEntryDialog
        open={!!validateTarget}
        onOpenChange={(open) => {
          if (!open) setValidateTarget(null);
        }}
        organizationId={organizationId}
        entry={validateTarget}
        onSuccess={refetch}
      />
    </div>
  );
}
