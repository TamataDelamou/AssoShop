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
import {
  ApplySanctionPayload,
  Member,
  SanctionType,
} from "@/types/modules/community";

const SANCTION_TYPES: { value: SanctionType; label: string }[] = [
  { value: SanctionType.WARNING, label: "Avertissement" },
  { value: SanctionType.SUSPENSION, label: "Suspension" },
  { value: SanctionType.EXCLUSION, label: "Exclusion" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[]; // membres actifs éligibles
  applying: boolean;
  onApply: (payload: ApplySanctionPayload) => Promise<void>;
}

export function ApplySanctionDialog({
  open,
  onOpenChange,
  members,
  applying,
  onApply,
}: Props) {
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<SanctionType>(SanctionType.WARNING);
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSuspension = type === SanctionType.SUSPENSION;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!memberId) {
      setError("Veuillez sélectionner un membre.");
      return;
    }
    if (!reason.trim()) {
      setError("Le motif est obligatoire (RG-C07).");
      return;
    }
    if (isSuspension && !Number(durationDays)) {
      setError("Indiquez la durée de la suspension en jours.");
      return;
    }

    try {
      await onApply({
        member_id: memberId,
        type,
        reason: reason.trim(),
        duration_days: isSuspension ? Number(durationDays) : undefined,
      });
      setMemberId("");
      setType(SanctionType.WARNING);
      setReason("");
      setDurationDays("");
      onOpenChange(false);
    } catch {
      setError("Impossible d'appliquer la sanction.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Appliquer une sanction
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            La sanction ne sera visible que par le bureau et le membre concerné
            (RG-C07).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="sanction-member" className="text-foreground">
              Membre <span className="text-destructive">*</span>
            </Label>
            <Select
              value={memberId}
              onValueChange={setMemberId}
              disabled={applying}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Sélectionner un membre" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.user?.name || "Utilisateur"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sanction-type" className="text-foreground">
              Type de sanction
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as SanctionType)}
              disabled={applying}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {SANCTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isSuspension && (
            <div className="space-y-2">
              <Label htmlFor="sanction-duration" className="text-foreground">
                Durée (jours) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sanction-duration"
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="Ex : 30"
                disabled={applying}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sanction-reason" className="text-foreground">
              Motif <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="sanction-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Décrivez le motif de la sanction..."
              disabled={applying}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={applying}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={applying}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {applying ? "Application..." : "Appliquer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
