"use client";

import { useState } from "react";
import { useNetworkStatus, OfflineOperation } from "@/lib/offline";
import { useSyncQueue } from "@/hooks/hub/useSyncQueue";
import { buildReplayHandlers } from "./replayHandlers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime } from "@/utils/formatters";
import {
  CheckCircle2,
  Inbox,
  RefreshCw,
  Trash2,
  WifiOff,
  XCircle,
} from "lucide-react";

const MODULE_LABELS: Record<string, string> = {
  accounting: "Comptabilité",
  finance: "Groupes financiers",
  loans: "Prêts",
  solidarity: "Solidarité",
  projects: "Projets",
  meetings: "Réunions",
  announcements: "Annonces",
  documents: "Documents",
};

const ACTION_LABELS: Record<string, string> = {
  consolidate: "Consolidation",
  create_entry: "Nouvelle écriture",
  reconcile_line: "Rapprochement",
  validate_entry: "Validation d'écriture",
  contribute: "Contribution",
  create: "Création",
  plan: "Planification",
  publish: "Publication",
  upload: "Envoi de document",
  create_group: "Création de groupe",
  declare_payment: "Versement",
  validate_payment: "Validation de versement",
  confirm_sponsor: "Confirmation parrain",
  decide_loan: "Décision de prêt",
  repay_installment: "Remboursement d'échéance",
  request_loan: "Demande de prêt",
  decide_claim: "Décision de sinistre",
  declare_claim: "Déclaration de sinistre",
  enroll_insurance: "Adhésion assurance",
};

function moduleLabel(module: string): string {
  return MODULE_LABELS[module] ?? module;
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function payloadSummary(op: OfflineOperation): string {
  const raw = JSON.stringify(op.payload);
  return raw.length > 90 ? `${raw.slice(0, 90)}…` : raw;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncQueueDialog({ open, onOpenChange }: Props) {
  const online = useNetworkStatus();
  const { queue, processing, results, process, clear } = useSyncQueue();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleSync = async () => {
    await process(buildReplayHandlers());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            File de synchronisation
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Actions réalisées hors connexion, en attente de synchronisation.
          </DialogDescription>
        </DialogHeader>

        {!online && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-300">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Vous êtes hors connexion — la synchronisation reprendra à la
              reconnexion.
            </AlertDescription>
          </Alert>
        )}

        {queue.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">Aucune action en attente.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {queue.map((op) => (
              <li
                key={op.id}
                className="rounded-lg border border-border/50 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className="border-none bg-primary/20 font-normal text-primary">
                      {moduleLabel(op.module)}
                    </Badge>
                    <span className="text-foreground truncate">
                      {actionLabel(op.action)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDateTime(new Date(op.createdAt))}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground break-all">
                  {payloadSummary(op)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {results && (
          <ul className="space-y-1">
            {results.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 text-xs"
              >
                {r.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-foreground">
                  {moduleLabel(r.module)} · {actionLabel(r.action)}
                </span>
                {!r.ok && r.error && (
                  <span className="text-muted-foreground truncate">
                    — {r.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {queue.length > 0 && (
          <div className="flex justify-end gap-2 pt-2">
            {confirmClear ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    clear();
                    setConfirmClear(false);
                  }}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Confirmer la suppression
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Vider la file
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSync}
                  disabled={processing || !online}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <RefreshCw
                    className={`mr-1 h-3 w-3 ${processing ? "animate-spin" : ""}`}
                  />
                  {processing ? "Synchronisation…" : "Synchroniser maintenant"}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
