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
import { CreateTaskPayload, Member } from "@/types/modules/community";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  creating: boolean;
  onCreate: (payload: CreateTaskPayload) => Promise<void>;
}

export function AssignTaskDialog({
  open,
  onOpenChange,
  members,
  creating,
  onCreate,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Le titre de la tâche est obligatoire.");
      return;
    }
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        assignee_id: assigneeId || undefined,
        due_date: dueDate || undefined,
      });
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setDueDate("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible de créer la tâche.");
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
            Attribuer une tâche
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Assignez une responsabilité et suivez son avancement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-foreground">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Préparer la réunion du bureau"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc" className="text-foreground">
              Description
            </Label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Détails de la tâche..."
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-assignee" className="text-foreground">
              Responsable
            </Label>
            <Select
              value={assigneeId}
              onValueChange={setAssigneeId}
              disabled={creating}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Non assigné" />
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
            <Label htmlFor="task-due" className="text-foreground">
              Échéance
            </Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
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
              {creating ? "Création..." : "Attribuer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
