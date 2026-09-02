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
  CreateRelocationPayload,
  Member,
} from "@/types/modules/community";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  creating: boolean;
  onCreate: (payload: CreateRelocationPayload) => Promise<void>;
}

export function CreateRelocationDialog({
  open,
  onOpenChange,
  members,
  creating,
  onCreate,
}: Props) {
  const [memberId, setMemberId] = useState("");
  const [oldAddress, setOldAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!memberId) {
      setError("Veuillez sélectionner un membre.");
      return;
    }
    if (!oldAddress.trim() || !newAddress.trim() || !newCity.trim()) {
      setError("Ancienne adresse, nouvelle adresse et ville sont obligatoires.");
      return;
    }
    try {
      await onCreate({
        member_id: memberId,
        old_address: oldAddress.trim(),
        new_address: newAddress.trim(),
        new_city: newCity.trim(),
        reason: reason.trim() || undefined,
      });
      setMemberId("");
      setOldAddress("");
      setNewAddress("");
      setNewCity("");
      setReason("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible de créer la déclaration.");
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
            Déclaration de déménagement
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Signalez le changement d&apos;adresse d&apos;un membre pour mise à
            jour du dossier.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="rel-member" className="text-foreground">
              Membre <span className="text-destructive">*</span>
            </Label>
            <Select
              value={memberId}
              onValueChange={setMemberId}
              disabled={creating}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Sélectionner un membre" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {members.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Aucun membre disponible
                  </div>
                ) : (
                  members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.user?.name || m.id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rel-old" className="text-foreground">
              Ancienne adresse <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rel-old"
              value={oldAddress}
              onChange={(e) => setOldAddress(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Quartier Kipé, Conakry"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rel-new" className="text-foreground">
              Nouvelle adresse <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rel-new"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Quartier Matoto, Conakry"
              disabled={creating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rel-city" className="text-foreground">
                Nouvelle ville <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rel-city"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="Ex : Conakry"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rel-reason" className="text-foreground">
                Motif (optionnel)
              </Label>
              <Input
                id="rel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="Ex : mutation"
                disabled={creating}
              />
            </div>
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
              {creating ? "Création..." : "Déclarer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
