"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { useCreateSocialCase } from "@/hooks/community/useCreateSocialCase";
import { SocialCaseType } from "@/types/modules/community";
import {
  COMMON_LABELS,
  SOCIAL_CASE_CONFIG,
  SOCIAL_CASE_LABELS,
  SOCIAL_CASE_MESSAGES,
  SOCIAL_CASE_TYPES,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function DeclareSocialCaseDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SocialCaseType>(SocialCaseType.ILLNESS);
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [targetAmount, setTargetAmount] = useState(
    String(SOCIAL_CASE_CONFIG.DEFAULT_TARGET),
  );
  const [contributorsVisible, setContributorsVisible] = useState(true);
  const [inputError, setInputError] = useState<string | null>(null);
  const { createSocialCase, loading, error } = useCreateSocialCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const parsedAmount = Number(targetAmount);
    if (!title.trim()) {
      setInputError(SOCIAL_CASE_MESSAGES.TITLE_REQUIRED);
      return;
    }
    if (!beneficiaryName.trim()) {
      setInputError(SOCIAL_CASE_MESSAGES.BENEFICIARY_REQUIRED);
      return;
    }
    if (
      !targetAmount ||
      Number.isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setInputError(SOCIAL_CASE_MESSAGES.AMOUNT_REQUIRED);
      return;
    }

    try {
      await createSocialCase(organizationId, {
        title: title.trim(),
        description: description.trim(),
        type,
        beneficiary_name: beneficiaryName.trim(),
        target_amount: parsedAmount,
        contributors_visible: contributorsVisible,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{SOCIAL_CASE_LABELS.DECLARE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{SOCIAL_CASE_LABELS.TITLE_LABEL}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={SOCIAL_CASE_LABELS.TITLE_PLACEHOLDER}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {SOCIAL_CASE_LABELS.DESCRIPTION_LABEL}
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={SOCIAL_CASE_LABELS.DESCRIPTION_PLACEHOLDER}
              rows={3}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{SOCIAL_CASE_LABELS.TYPE_LABEL}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as SocialCaseType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_CASE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiary">
              {SOCIAL_CASE_LABELS.BENEFICIARY_LABEL}
            </Label>
            <Input
              id="beneficiary"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              placeholder={SOCIAL_CASE_LABELS.BENEFICIARY_PLACEHOLDER}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">{SOCIAL_CASE_LABELS.TARGET_LABEL}</Label>
            <Input
              id="target"
              type="number"
              min={1}
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={contributorsVisible}
              onChange={(e) => setContributorsVisible(e.target.checked)}
              className="mt-0.5"
            />
            {SOCIAL_CASE_LABELS.VISIBILITY_LABEL}
          </label>
          <p className="text-xs text-muted-foreground">
            {SOCIAL_CASE_LABELS.VISIBILITY_HELP}
          </p>

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
                : SOCIAL_CASE_LABELS.DECLARE_BUTTON}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
