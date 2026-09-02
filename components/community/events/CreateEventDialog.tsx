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
import { CreateEventPayload, EventType } from "@/types/modules/community";

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: EventType.MEETING, label: "Réunion" },
  { value: EventType.GENERAL_ASSEMBLY, label: "Assemblée générale" },
  { value: EventType.ACTIVITY, label: "Activité" },
  { value: EventType.TRAINING, label: "Formation" },
  { value: EventType.OUTING, label: "Sortie" },
  { value: EventType.OTHER, label: "Autre" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onCreate: (payload: CreateEventPayload) => Promise<unknown>;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  creating,
  onCreate,
}: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>(EventType.MEETING);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !startAt) {
      setError("Le titre et la date de début sont requis.");
      return;
    }

    try {
      await onCreate({
        title: title.trim(),
        type,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : undefined,
        location: location.trim(),
        description: description.trim() || undefined,
      });
      setTitle("");
      setType(EventType.MEETING);
      setStartAt("");
      setEndAt("");
      setLocation("");
      setDescription("");
      onOpenChange(false);
    } catch {
      setError("Impossible de créer l'événement.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Créer un événement
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ajoutez une date à l&apos;agenda de l&apos;association.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-foreground">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
              placeholder="Ex : Assemblée générale"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-type" className="text-foreground">
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as EventType)}
              disabled={creating}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-start" className="text-foreground">
                Début <span className="text-destructive">*</span>
              </Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end" className="text-foreground">
                Fin
              </Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                disabled={creating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location" className="text-foreground">
              Lieu
            </Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
              placeholder="Ex : Siège de l'association"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description" className="text-foreground">
              Description
            </Label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Détails, ordre du jour..."
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
              {creating ? "Création..." : "Créer l'événement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
