"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EngagementBadge } from "@/components/finance/EngagementBadge";
import { UserCheck } from "lucide-react";
import {
  DecideTransferPayload,
  MobilityReport,
  TransferDecision,
  TransferDecisionStatus,
} from "@/types/modules/community";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report?: MobilityReport;
  decision?: TransferDecision;
  deciding: boolean;
  onDecide: (payload: DecideTransferPayload) => Promise<void>;
}

export function TransferDecisionDialog({
  open,
  onOpenChange,
  report,
  decision,
  deciding,
  onDecide,
}: Props) {
  const [status, setStatus] = useState<TransferDecisionStatus>(
    decision?.status ?? TransferDecisionStatus.ACCEPTED,
  );
  const [sponsorship, setSponsorship] = useState(decision?.sponsorship ?? "");
  const [note, setNote] = useState(decision?.decision_note ?? "");
  const [decidedBy, setDecidedBy] = useState(
    decision?.decided_by ?? "Bureau de l'association",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onDecide({
        status,
        sponsorship: sponsorship.trim() || undefined,
        decision_note: note.trim() || undefined,
        decided_by: decidedBy.trim() || "Bureau de l'association",
      });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible d'enregistrer la décision.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Décision d&apos;adhésion sur transfert
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Le bureau consulte le rapport de mobilité puis applique la
            procédure d&apos;adhésion.
          </DialogDescription>
        </DialogHeader>

        {report && (
          <div className="rounded-lg border border-border/50 p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {report.member_name || "Membre"}
              </p>
              <p className="text-xs text-muted-foreground">
                Score de confiance : {report.trust_score}/100
              </p>
            </div>
            <EngagementBadge engagement={report.engagement} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label className="text-foreground">Décision</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as TransferDecisionStatus)}
              disabled={deciding}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                <SelectItem value={TransferDecisionStatus.ACCEPTED}>
                  Accepter l&apos;adhésion
                </SelectItem>
                <SelectItem value={TransferDecisionStatus.REJECTED}>
                  Rejeter
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="td-sponsor" className="text-foreground">
              Parrain (optionnel)
            </Label>
            <Input
              id="td-sponsor"
              value={sponsorship}
              onChange={(e) => setSponsorship(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Nom du parrain"
              disabled={deciding}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="td-note" className="text-foreground">
              Justification (optionnel)
            </Label>
            <textarea
              id="td-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Motif de la décision"
              disabled={deciding}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="td-by" className="text-foreground">
              Décision prise par
            </Label>
            <Input
              id="td-by"
              value={decidedBy}
              onChange={(e) => setDecidedBy(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              disabled={deciding}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={deciding}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={deciding}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              {deciding ? "Enregistrement..." : "Confirmer la décision"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
