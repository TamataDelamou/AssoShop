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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePublishAnnouncement } from "@/hooks/community/usePublishAnnouncement";
import { useAiAnnouncement } from "@/hooks/community/useAiAnnouncement";
import { AnnouncementAudience } from "@/types/modules/community";
import {
  AI_LABELS,
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  ANNOUNCEMENT_LABELS,
  ANNOUNCEMENT_MESSAGES,
  COMMON_LABELS,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function PublishAnnouncementDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>(
    AnnouncementAudience.MEMBERS,
  );
  const [pinned, setPinned] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [aiDraft, setAiDraft] = useState(false);
  const { publish, loading, error } = usePublishAnnouncement();
  const { generate, generating, error: aiError } = useAiAnnouncement();

  const handleAssist = async () => {
    setInputError(null);
    try {
      const draft = await generate(content);
      setContent(draft);
      setAiDraft(true);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    if (!title.trim()) {
      setInputError(ANNOUNCEMENT_MESSAGES.TITLE_REQUIRED);
      return;
    }
    if (!content.trim()) {
      setInputError(ANNOUNCEMENT_MESSAGES.CONTENT_REQUIRED);
      return;
    }

    try {
      const result = await publish(organizationId, {
        title: title.trim(),
        content: content.trim(),
        audience,
        pinned,
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
          <DialogTitle>{ANNOUNCEMENT_LABELS.PUBLISH_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {ANNOUNCEMENT_LABELS.SYNC_PENDING_NOTICE}
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
              <Label htmlFor="title">{ANNOUNCEMENT_LABELS.TITLE_LABEL}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={ANNOUNCEMENT_LABELS.TITLE_PLACEHOLDER}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                {ANNOUNCEMENT_LABELS.CONTENT_LABEL}
              </Label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={ANNOUNCEMENT_LABELS.CONTENT_PLACEHOLDER}
                rows={6}
                className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">
                {ANNOUNCEMENT_LABELS.AUDIENCE_LABEL}
              </Label>
              <Select
                value={audience}
                onValueChange={(value) =>
                  setAudience(value as AnnouncementAudience)
                }
              >
                <SelectTrigger id="audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {audience === AnnouncementAudience.AFFILIATES ? (
                <p className="text-xs text-muted-foreground">
                  {ANNOUNCEMENT_LABELS.AFFILIATES_NOTE}
                </p>
              ) : null}
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="mt-0.5"
              />
              {ANNOUNCEMENT_LABELS.PINNED_LABEL}
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
                    : ANNOUNCEMENT_LABELS.PUBLISH_BUTTON}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
