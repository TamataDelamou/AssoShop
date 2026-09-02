"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Election } from "@/types/modules/community";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election: Election | null;
  busy: boolean;
  onVote: (candidateId: string) => Promise<void>;
}

export function VoteDialog({
  open,
  onOpenChange,
  election,
  busy,
  onVote,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedId) {
      setError("Veuillez sélectionner un candidat.");
      return;
    }
    try {
      await onVote(selectedId);
      setSelectedId(null);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible de voter.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSelectedId(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {election?.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choisissez un candidat. Le scrutin sera verrouillé à la clôture
            (RG-C06).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {election?.candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setSelectedId(candidate.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                  selectedId === candidate.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/50 bg-input/30 text-foreground hover:bg-muted/20",
                )}
              >
                <span className="text-sm">{candidate.member_name}</span>
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border",
                    selectedId === candidate.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground",
                  )}
                />
              </button>
            ))}
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
              {busy ? "Vote..." : "Voter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
