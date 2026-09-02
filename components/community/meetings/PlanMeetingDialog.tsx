"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePlanMeeting } from "@/hooks/community/usePlanMeeting";
import {
  COMMON_LABELS,
  MEETING_LABELS,
  MEETING_MESSAGES,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function PlanMeetingDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const { planMeeting, loading, error } = usePlanMeeting();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    if (!title.trim()) {
      setInputError(MEETING_MESSAGES.TITLE_REQUIRED);
      return;
    }
    if (!date) {
      setInputError(MEETING_MESSAGES.DATE_REQUIRED);
      return;
    }
    if (!location.trim()) {
      setInputError(MEETING_MESSAGES.LOCATION_REQUIRED);
      return;
    }

    try {
      const result = await planMeeting(organizationId, {
        title: title.trim(),
        date,
        location: location.trim(),
        agenda: agenda.trim(),
        reminder_enabled: reminderEnabled,
      });
      if (result === null) {
        // Hors-ligne : mise en file d'attente, affichée comme succès différé.
        setQueued(true);
      } else {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const handleClose = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{MEETING_LABELS.PLAN_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {MEETING_LABELS.SYNC_PENDING_NOTICE}
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleClose}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {COMMON_LABELS.CLOSE}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{MEETING_LABELS.TITLE_LABEL}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={MEETING_LABELS.TITLE_PLACEHOLDER}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{MEETING_LABELS.DATE_LABEL}</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{MEETING_LABELS.LOCATION_LABEL}</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={MEETING_LABELS.LOCATION_PLACEHOLDER}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda">{MEETING_LABELS.AGENDA_LABEL}</Label>
              <textarea
                id="agenda"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder={MEETING_LABELS.AGENDA_PLACEHOLDER}
                rows={4}
                className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="mt-0.5"
              />
              {MEETING_LABELS.REMINDER_LABEL}
            </label>

            {inputError ? (
              <Alert variant="destructive">
                <AlertDescription>{inputError}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {COMMON_LABELS.CANCEL}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading
                  ? COMMON_LABELS.LOADING
                  : MEETING_LABELS.PLAN_BUTTON}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
