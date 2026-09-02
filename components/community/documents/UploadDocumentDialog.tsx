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
import { useUploadDocument } from "@/hooks/community/useUploadDocument";
import { useAiDocument } from "@/hooks/community/useAiDocument";
import { DocumentCategory } from "@/types/modules/community";
import {
  AI_LABELS,
  COMMON_LABELS,
  DOCUMENT_CATEGORY_OPTIONS,
  DOCUMENT_LABELS,
  DOCUMENT_MESSAGES,
} from "@/utils/constants";
import { formatFileSize } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

interface SelectedFile {
  name: string;
  type: string;
  size: number;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>(
    DocumentCategory.OTHER,
  );
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [aiDraft, setAiDraft] = useState(false);
  const { upload, loading, error } = useUploadDocument();
  const { generateDescription, generating, error: aiError } = useAiDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      });
    } else {
      setSelectedFile(null);
    }
  };

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
      setInputError(DOCUMENT_MESSAGES.NAME_REQUIRED);
      return;
    }
    if (!selectedFile) {
      setInputError(DOCUMENT_MESSAGES.FILE_REQUIRED);
      return;
    }

    try {
      const result = await upload(organizationId, {
        name: name.trim(),
        description: description.trim(),
        category,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
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
          <DialogTitle>{DOCUMENT_LABELS.UPLOAD_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {DOCUMENT_LABELS.SYNC_PENDING_NOTICE}
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
              <Label htmlFor="name">{DOCUMENT_LABELS.NAME_LABEL}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={DOCUMENT_LABELS.NAME_PLACEHOLDER}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {DOCUMENT_LABELS.DESCRIPTION_LABEL}
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={DOCUMENT_LABELS.DESCRIPTION_PLACEHOLDER}
                rows={3}
                className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{DOCUMENT_LABELS.CATEGORY_LABEL}</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value as DocumentCategory)
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">{DOCUMENT_LABELS.FILE_LABEL}</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                {selectedFile
                  ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}`
                  : DOCUMENT_LABELS.NO_FILE_SELECTED}
              </p>
            </div>

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
                    : DOCUMENT_LABELS.UPLOAD_BUTTON}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
