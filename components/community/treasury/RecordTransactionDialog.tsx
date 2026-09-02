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
  CreateTransactionPayload,
  TransactionType,
} from "@/types/modules/community";
import { TreasuryAccountType } from "@/types/modules/accounting";

const ACCOUNTS: { value: TreasuryAccountType; label: string }[] = [
  { value: TreasuryAccountType.CASH, label: "Caisse" },
  { value: TreasuryAccountType.BANK, label: "Banque" },
  { value: TreasuryAccountType.MOBILE_MONEY, label: "Mobile Money" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onCreate: (payload: CreateTransactionPayload) => Promise<void>;
}

export function RecordTransactionDialog({
  open,
  onOpenChange,
  creating,
  onCreate,
}: Props) {
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState<TreasuryAccountType>(
    TreasuryAccountType.CASH,
  );
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!label.trim()) {
      setError("Le libellé de l'opération est obligatoire.");
      return;
    }
    if (!Number(amount) || Number(amount) <= 0) {
      setError("Le montant doit être supérieur à zéro.");
      return;
    }
    try {
      await onCreate({
        type,
        label: label.trim(),
        amount: Number(amount),
        account,
        date: date || undefined,
        reference: reference.trim() || undefined,
      });
      setType(TransactionType.INCOME);
      setLabel("");
      setAmount("");
      setAccount(TreasuryAccountType.CASH);
      setDate("");
      setReference("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible d'enregistrer l'opération.");
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
            Enregistrer une opération
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Entrée ou sortie de trésorerie avec justificatif.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="tx-type" className="text-foreground">
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as TransactionType)}
              disabled={creating}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                <SelectItem value={TransactionType.INCOME}>Entrée</SelectItem>
                <SelectItem value={TransactionType.EXPENSE}>Sortie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-label" className="text-foreground">
              Libellé <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tx-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Cotisations du mois"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-amount" className="text-foreground">
              Montant (GNF) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tx-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : 150000"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-account" className="text-foreground">
              Compte
            </Label>
            <Select
              value={account}
              onValueChange={(v) => setAccount(v as TreasuryAccountType)}
              disabled={creating}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {ACCOUNTS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-date" className="text-foreground">
              Date
            </Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-ref" className="text-foreground">
              Justificatif (référence)
            </Label>
            <Input
              id="tx-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Reçu MM-2026-0412"
              disabled={creating}
            />
          </div>

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
              {creating ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
