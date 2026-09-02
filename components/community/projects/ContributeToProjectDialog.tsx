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
import { useContributeToProject } from "@/hooks/community/useContributeToProject";
import { CommunityProject } from "@/types/modules/community";
import {
  COMMON_LABELS,
  PROJECT_LABELS,
  PROJECT_MESSAGES,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  project: CommunityProject | null;
  onSuccess?: () => void;
}

export function ContributeToProjectDialog({
  open,
  onOpenChange,
  organizationId,
  project,
  onSuccess,
}: Props) {
  const [contributorName, setContributorName] = useState("");
  const [amount, setAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const { contribute, loading, error } = useContributeToProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setInputError(null);

    if (!contributorName.trim()) {
      setInputError(PROJECT_MESSAGES.CONTRIBUTOR_REQUIRED);
      return;
    }
    const contributionAmount = Number(amount);
    if (
      !amount.trim() ||
      Number.isNaN(contributionAmount) ||
      contributionAmount <= 0
    ) {
      setInputError(PROJECT_MESSAGES.AMOUNT_REQUIRED);
      return;
    }

    try {
      const result = await contribute(organizationId, project.id, {
        contributor_name: contributorName.trim(),
        amount: contributionAmount,
        anonymous,
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
    <Dialog open={open && !!project} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{PROJECT_LABELS.CONTRIBUTE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        {project ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {project.name} · {PROJECT_LABELS.RAISED_LABEL}{" "}
              {formatCurrency(project.raised_amount)} /{" "}
              {formatCurrency(project.goal_amount)}
            </p>

            {queued ? (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    {PROJECT_LABELS.CONTRIBUTE_SYNC_PENDING}
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
                  <Label htmlFor="contributor">
                    {PROJECT_LABELS.CONTRIBUTOR_LABEL}
                  </Label>
                  <Input
                    id="contributor"
                    value={contributorName}
                    onChange={(e) => setContributorName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {PROJECT_LABELS.AMOUNT_LABEL}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="mt-0.5"
                  />
                  {PROJECT_LABELS.ANONYMOUS_LABEL}
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
                      : PROJECT_LABELS.CONTRIBUTE_BUTTON}
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
