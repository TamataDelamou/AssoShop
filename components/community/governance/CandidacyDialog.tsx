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
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Election, Member } from "@/types/modules/community";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election: Election | null;
  members: Member[]; // membres éligibles (actifs, non déjà candidats)
  busy: boolean;
  onDeclare: (memberId: string) => Promise<void>;
}

export function CandidacyDialog({
  open,
  onOpenChange,
  election,
  members,
  busy,
  onDeclare,
}: Props) {
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!memberId) {
      setError("Veuillez sélectionner un membre.");
      return;
    }
    try {
      await onDeclare(memberId);
      setMemberId("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible de déclarer la candidature.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setMemberId("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Déclarer une candidature
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {election?.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="candidate-member" className="text-sm text-foreground">
              Membre candidat
            </label>
            <Select value={memberId} onValueChange={setMemberId} disabled={busy}>
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Sélectionner un membre" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {members.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    Aucun membre éligible.
                  </p>
                ) : (
                  members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.user?.name || "Utilisateur"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={busy}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {busy ? "Enregistrement..." : "Déclarer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
