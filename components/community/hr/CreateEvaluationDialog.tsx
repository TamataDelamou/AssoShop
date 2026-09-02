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
  CreateStaffEvaluationPayload,
  StaffMember,
} from "@/types/modules/community";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  creating: boolean;
  onCreate: (payload: CreateStaffEvaluationPayload) => Promise<void>;
}

export function CreateEvaluationDialog({
  open,
  onOpenChange,
  staff,
  creating,
  onCreate,
}: Props) {
  const [staffId, setStaffId] = useState("");
  const [period, setPeriod] = useState("");
  const [rating, setRating] = useState("3");
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!staffId) {
      setError("Veuillez sélectionner un membre du personnel.");
      return;
    }
    if (!period.trim()) {
      setError("La période évaluée est obligatoire.");
      return;
    }
    try {
      await onCreate({
        staff_id: staffId,
        period: period.trim(),
        rating: Number(rating),
        comments: comments.trim(),
      });
      setStaffId("");
      setPeriod("");
      setRating("3");
      setComments("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible d'enregistrer l'évaluation.");
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
            Évaluation du personnel
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enregistrez une évaluation périodique.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="ev-staff" className="text-foreground">
              Membre <span className="text-destructive">*</span>
            </Label>
            <Select value={staffId} onValueChange={setStaffId} disabled={creating}>
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Sélectionner un membre" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ev-period" className="text-foreground">
                Période <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ev-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="Ex : 2026 S1"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-rating" className="text-foreground">
                Note globale
              </Label>
              <Select value={rating} onValueChange={setRating} disabled={creating}>
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / 5
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-comments" className="text-foreground">
              Commentaire
            </Label>
            <textarea
              id="ev-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Points forts, axes de progrès..."
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
