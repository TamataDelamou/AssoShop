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
import { Plus, X } from "lucide-react";
import {
  CreateSignatureRequestPayload,
  SignatureDocumentType,
} from "@/types/modules/community";

const TYPES: { value: SignatureDocumentType; label: string }[] = [
  { value: SignatureDocumentType.LOAN, label: "Prêt" },
  { value: SignatureDocumentType.EXPENSE, label: "Dépense" },
  { value: SignatureDocumentType.MINUTES, label: "Procès-verbal" },
  {
    value: SignatureDocumentType.EXCEPTIONAL_WITHDRAWAL,
    label: "Retrait exceptionnel",
  },
];

const ROLES = [
  "Président(e)",
  "Vice-président(e)",
  "Trésorier(e)",
  "Secrétaire général(e)",
  "Secrétaire adjoint(e)",
  "Commissaire aux comptes",
];

interface SignatoryRow {
  name: string;
  role: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onCreate: (payload: CreateSignatureRequestPayload) => Promise<void>;
}

export function CreateSignatureDialog({
  open,
  onOpenChange,
  creating,
  onCreate,
}: Props) {
  const [type, setType] = useState<SignatureDocumentType>(
    SignatureDocumentType.EXPENSE,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [signatories, setSignatories] = useState<SignatoryRow[]>([
    { name: "", role: ROLES[0] },
    { name: "", role: ROLES[2] },
  ]);
  const [error, setError] = useState<string | null>(null);

  const needsAmount = type !== SignatureDocumentType.MINUTES;

  const setSignatory = (
    index: number,
    field: keyof SignatoryRow,
    value: string,
  ) => {
    setSignatories((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    const validSignatories = signatories.filter((s) => s.name.trim());
    if (validSignatories.length < 1) {
      setError("Au moins un signataire est requis.");
      return;
    }
    try {
      await onCreate({
        type,
        title: title.trim(),
        description: description.trim(),
        amount: needsAmount ? Number(amount) || 0 : undefined,
        requested_by: requestedBy.trim(),
        signatories: validSignatories.map((s) => ({
          name: s.name.trim(),
          role: s.role,
        })),
      });
      setType(SignatureDocumentType.EXPENSE);
      setTitle("");
      setDescription("");
      setAmount("");
      setRequestedBy("");
      setSignatories([
        { name: "", role: ROLES[0] },
        { name: "", role: ROLES[2] },
      ]);
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
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Nouvelle demande de signature
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Soumettez une décision sensible pour validation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sig-type" className="text-foreground">
                Type de document
              </Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as SignatureDocumentType)}
                disabled={creating}
              >
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsAmount && (
              <div className="space-y-2">
                <Label htmlFor="sig-amount" className="text-foreground">
                  Montant (GNF)
                </Label>
                <Input
                  id="sig-amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-input/50 border-border/50 text-foreground"
                  placeholder="Ex : 1500000"
                  disabled={creating}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sig-title" className="text-foreground">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sig-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Achat de matériel"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sig-desc" className="text-foreground">
              Description
            </Label>
            <textarea
              id="sig-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Contexte et objet de la décision..."
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sig-by" className="text-foreground">
              Demandé par
            </Label>
            <Input
              id="sig-by"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Mamadou Bah"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              Signataires requis <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-2">
              {signatories.map((s, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={s.name}
                    onChange={(e) => setSignatory(index, "name", e.target.value)}
                    className="bg-input/50 border-border/50 text-foreground"
                    placeholder="Nom du signataire"
                    disabled={creating}
                  />
                  <Select
                    value={s.role}
                    onValueChange={(v) => setSignatory(index, "role", v)}
                    disabled={creating}
                  >
                    <SelectTrigger className="w-48 bg-input/50 border-border/50 text-foreground shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {signatories.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setSignatories((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      disabled={creating}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSignatories((prev) => [
                  ...prev,
                  { name: "", role: ROLES[0] },
                ])
              }
              disabled={creating}
              className="border-border/50 text-muted-foreground hover:text-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un signataire
            </Button>
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
              {creating ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
