"use client";

import { useState } from "react";
import {
  ReconciliationEntry,
  ReconciliationStatus,
} from "@/types/modules/pay";
import { payService } from "@/services/pay/pay";
import { aiAssistant, ReconciliationFlag } from "@/lib/ai/assistant";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  PAY_LABELS,
  RECONCILIATION_STATUS_LABELS,
} from "@/utils/constants";
import { CheckCircle2, Sparkles } from "lucide-react";

function statusVariant(status: ReconciliationStatus): string {
  switch (status) {
    case ReconciliationStatus.MATCHED:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case ReconciliationStatus.FLAGGED:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    default:
      return "border-white/10 bg-white/5 text-muted-foreground";
  }
}

export function ReconciliationView({
  reconciliation,
  online,
  onChanged,
}: {
  reconciliation: ReconciliationEntry[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [aiFlags, setAiFlags] = useState<ReconciliationFlag[] | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAiCheck = async () => {
    setAiRunning(true);
    setError(null);
    try {
      const analysis = await aiAssistant.flagReconciliationDiscrepancies(
        reconciliation.map((e) => ({
          id: e.id,
          amount: e.amount,
          operator_reference: e.operator_reference,
          status: e.status,
        })),
      );
      setAiFlags(analysis.flags);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAiRunning(false);
    }
  };

  const match = async (entry: ReconciliationEntry) => {
    setBusy(true);
    setError(null);
    try {
      await payService.matchEntry(entry.id);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-light">
          {PAY_LABELS.RECONCILIATION_TITLE}
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="border-white/10"
          onClick={runAiCheck}
          disabled={aiRunning || !online}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {PAY_LABELS.AI_CHECK}
        </Button>
      </div>

      {/* RG-H03 : l'IA informe, elle n'agit jamais sur les fonds. */}
      {aiFlags && (
        <Alert className="border-primary/30 bg-primary/10">
          <Sparkles className="h-4 w-4" />
          <AlertDescription className="space-y-1">
            {aiFlags.length === 0
              ? "Aucun écart inhabituel détecté par l'assistant IA."
              : aiFlags.map((flag) => (
                  <p key={flag.entry_id}>
                    {flag.entry_id} — {flag.note}
                  </p>
                ))}
          </AlertDescription>
        </Alert>
      )}

      {reconciliation.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
          {PAY_LABELS.NO_RECONCILIATION}
        </p>
      ) : (
        <div className="space-y-3">
          {reconciliation.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-mono">
                  {entry.reference}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={statusVariant(entry.status)}
                >
                  {RECONCILIATION_STATUS_LABELS[entry.status]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {entry.operator}
                  </span>
                  <span className="font-bold">
                    {formatCurrency(entry.amount, entry.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {PAY_LABELS.OPERATOR_REFERENCE} :{" "}
                    {entry.operator_reference || "—"}
                  </span>
                  <span>{formatDate(entry.created_at)}</span>
                </div>
                {entry.ai_note && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-400">
                    {entry.ai_note}
                  </p>
                )}
                {entry.status !== ReconciliationStatus.MATCHED && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => match(entry)}
                    disabled={busy || !online}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {PAY_LABELS.MATCH}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
