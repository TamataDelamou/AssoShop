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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkAffiliationPayload, Organization } from "@/types/modules/community";
import { cn } from "@/lib/utils";

function ToggleRow({
  label,
  hint,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex items-center justify-between w-full rounded-lg border px-3 py-2 text-left transition-colors",
        checked
          ? "border-primary/50 bg-primary/10"
          : "border-border/50 bg-transparent",
      )}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          checked ? "text-primary" : "text-muted-foreground",
        )}
      >
        {checked ? "Activé" : "Désactivé"}
      </span>
    </button>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Organization[];
  linking: boolean;
  onLink: (payload: LinkAffiliationPayload) => Promise<void>;
}

export function LinkAffiliationDialog({
  open,
  onOpenChange,
  organizations,
  linking,
  onLink,
}: Props) {
  const [affiliateId, setAffiliateId] = useState("");
  const [shareMembers, setShareMembers] = useState(false);
  const [shareFinances, setShareFinances] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!affiliateId) {
      setError("Veuillez sélectionner une association.");
      return;
    }
    try {
      await onLink({
        affiliate_id: affiliateId,
        share_members: shareMembers,
        share_finances: shareFinances,
      });
      setAffiliateId("");
      setShareMembers(false);
      setShareFinances(false);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible de lier l'association.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setError(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Lier une association
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Affiliez une association sœur et définissez les partages.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="aff-org" className="text-foreground">
              Association <span className="text-destructive">*</span>
            </Label>
            <Select value={affiliateId} onValueChange={setAffiliateId} disabled={linking}>
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Sélectionner une association" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {organizations.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Aucune association disponible
                  </div>
                ) : (
                  organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} — {o.city ?? "—"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <ToggleRow
              label="Partage des membres"
              hint="La liste des membres est visible par l'association affiliée."
              checked={shareMembers}
              onToggle={() => setShareMembers((v) => !v)}
              disabled={linking}
            />
            <ToggleRow
              label="Partage des détails financiers"
              hint="Les détails financiers sont visibles par l'association affiliée."
              checked={shareFinances}
              onToggle={() => setShareFinances((v) => !v)}
              disabled={linking}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={linking}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={linking}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {linking ? "Liaison..." : "Lier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
