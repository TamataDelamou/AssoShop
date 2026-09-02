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
import { useCreateProject } from "@/hooks/community/useCreateProject";
import { useAiProject } from "@/hooks/community/useAiProject";
import {
  AI_LABELS,
  COMMON_LABELS,
  PROJECT_LABELS,
  PROJECT_MESSAGES,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [relayedToAffiliates, setRelayedToAffiliates] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [aiDraft, setAiDraft] = useState(false);
  const { createProject, loading, error } = useCreateProject();
  const { generateDescription, generating, error: aiError } = useAiProject();

  const handleAssist = async () => {
    setInputError(null);
    try {
      const draft = await generateDescription(name);
      setDescription(draft);
      setAiDraft(true);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    if (!name.trim()) {
      setInputError(PROJECT_MESSAGES.NAME_REQUIRED);
      return;
    }
    const goalAmount = Number(goal);
    if (!goal.trim() || Number.isNaN(goalAmount) || goalAmount <= 0) {
      setInputError(PROJECT_MESSAGES.GOAL_REQUIRED);
      return;
    }

    try {
      const result = await createProject(organizationId, {
        name: name.trim(),
        description: description.trim(),
        goal_amount: goalAmount,
        relayed_to_affiliates: relayedToAffiliates,
      });
      if (result === null) {
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
          <DialogTitle>{PROJECT_LABELS.CREATE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {PROJECT_LABELS.SYNC_PENDING_NOTICE}
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
              <Label htmlFor="name">{PROJECT_LABELS.NAME_LABEL}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={PROJECT_LABELS.NAME_PLACEHOLDER}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {PROJECT_LABELS.DESCRIPTION_LABEL}
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={PROJECT_LABELS.DESCRIPTION_PLACEHOLDER}
                rows={4}
                className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">{PROJECT_LABELS.GOAL_LABEL}</Label>
              <Input
                id="goal"
                type="number"
                min={0}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder={PROJECT_LABELS.GOAL_PLACEHOLDER}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={relayedToAffiliates}
                onChange={(e) => setRelayedToAffiliates(e.target.checked)}
                className="mt-0.5"
              />
              {PROJECT_LABELS.RELAY_CHECKBOX}
            </label>

            {aiDraft ? (
              <Alert>
                <AlertDescription>{AI_LABELS.DRAFT_NOTICE}</AlertDescription>
              </Alert>
            ) : null}
            {inputError ? (
              <Alert variant="destructive">
                <AlertDescription>{inputError}</AlertDescription>
              </Alert>
            ) : null}
            {aiError ? (
              <Alert variant="destructive">
                <AlertDescription>{aiError}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAssist}
                disabled={generating}
              >
                {generating
                  ? AI_LABELS.GENERATING
                  : AI_LABELS.ASSIST_BUTTON}
              </Button>
              <div className="flex gap-2">
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
                    : PROJECT_LABELS.CREATE_BUTTON}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
