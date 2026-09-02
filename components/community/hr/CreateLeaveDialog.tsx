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
  CreateLeavePayload,
  StaffMember,
} from "@/types/modules/community";

const REASONS = [
  "Congé annuel",
  "Maladie",
  "Congé maternité",
  "Congé de circonstance",
  "Mission",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  creating: boolean;
  onCreate: (payload: CreateLeavePayload) => Promise<void>;
}

export function CreateLeaveDialog({
  open,
  onOpenChange,
  staff,
  creating,
  onCreate,
}: Props) {
  const [staffId, setStaffId] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!staffId) {
      setError("Veuillez sélectionner un membre du personnel.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Les dates de début et de fin sont obligatoires.");
      return;
    }
    try {
      await onCreate({
        staff_id: staffId,
        reason,
        start_date: startDate,
        end_date: endDate,
      });
      setStaffId("");
      setReason(REASONS[0]);
      setStartDate("");
      setEndDate("");
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
            Demande de congé
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enregistrez une demande de congé ou d&apos;absence.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="leave-staff" className="text-foreground">
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

          <div className="space-y-2">
            <Label htmlFor="leave-reason" className="text-foreground">
              Motif
            </Label>
            <Select value={reason} onValueChange={setReason} disabled={creating}>
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leave-start" className="text-foreground">
                Début <span className="text-destructive">*</span>
              </Label>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-end" className="text-foreground">
                Fin <span className="text-destructive">*</span>
              </Label>
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
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
              {creating ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
