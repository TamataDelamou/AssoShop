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
  Affiliation,
  CreateSharedMembershipPayload,
} from "@/types/modules/community";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliations: Affiliation[];
  creating: boolean;
  onCreate: (payload: CreateSharedMembershipPayload) => Promise<void>;
}

export function CreateSharedMembershipDialog({
  open,
  onOpenChange,
  affiliations,
  creating,
  onCreate,
}: Props) {
  const [memberName, setMemberName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [affiliationId, setAffiliationId] = useState("");
  const [feeExempt, setFeeExempt] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!memberName.trim()) {
      setError("Le nom du membre est obligatoire.");
      return;
    }
    if (!affiliationId) {
      setError("Veuillez sélectionner l'association d'origine.");
      return;
    }
    try {
      await onCreate({
        member_name: memberName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source_affiliation_id: affiliationId,
        fee_exempt: feeExempt,
      });
      setMemberName("");
      setEmail("");
      setPhone("");
      setAffiliationId("");
      setFeeExempt(true);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible de créer la demande.");
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
            Adhésion partagée
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adhésion d&apos;un membre d&apos;une association affiliée, sans
            payer la cotisation en double.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="sm-name" className="text-foreground">
              Nom du membre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sm-name"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Amadou Touré"
              disabled={creating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sm-email" className="text-foreground">
                Email
              </Label>
              <Input
                id="sm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="exemple@mail.com"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sm-phone" className="text-foreground">
                Téléphone
              </Label>
              <Input
                id="sm-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="+224 ..."
                disabled={creating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sm-source" className="text-foreground">
              Association d&apos;origine{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={affiliationId}
              onValueChange={setAffiliationId}
              disabled={creating}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Sélectionner une association affiliée" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {affiliations.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Aucune association affiliée
                  </div>
                ) : (
                  affiliations.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.affiliate_name || "Association affiliée"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => setFeeExempt((v) => !v)}
            disabled={creating}
            className={cn(
              "flex items-center justify-between w-full rounded-lg border px-3 py-2 text-left transition-colors",
              feeExempt
                ? "border-primary/50 bg-primary/10"
                : "border-border/50 bg-transparent",
            )}
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                Exemption de cotisation
              </p>
              <p className="text-xs text-muted-foreground">
                Le membre ne repaye pas la cotisation déjà versée ailleurs.
              </p>
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                feeExempt ? "text-primary" : "text-muted-foreground",
              )}
            >
              {feeExempt ? "Activée" : "Désactivée"}
            </span>
          </button>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {creating ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
