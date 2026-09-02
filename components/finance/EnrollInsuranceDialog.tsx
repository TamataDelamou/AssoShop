"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useEnrollInsurance } from "@/hooks/finance/useEnrollInsurance";
import { GroupMember } from "@/types/modules/finance";
import {
  COMMON_LABELS,
  INSURANCE_LABELS,
  INSURANCE_MESSAGES,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  members: GroupMember[];
  onSuccess?: () => void;
}

export function EnrollInsuranceDialog({
  open,
  onOpenChange,
  organizationId,
  members,
  onSuccess,
}: Props) {
  const [memberId, setMemberId] = useState(() => members[0]?.id ?? "");
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const { enrollInsurance, loading, error } = useEnrollInsurance();

  const selectedMember = members.find((m) => m.id === memberId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setInputError(INSURANCE_MESSAGES.MEMBER_REQUIRED);
      return;
    }
    setInputError(null);
    try {
      const result = await enrollInsurance(organizationId, {
        member_id: selectedMember.id,
        member_name: selectedMember.name,
      });
      if (result === null) {
        setQueued(true);
        onSuccess?.();
      } else {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{INSURANCE_LABELS.ENROLL_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {!members.length ? (
          <p className="text-sm text-muted-foreground">
            {INSURANCE_LABELS.NO_MEMBERS}
          </p>
        ) : queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {INSURANCE_LABELS.SYNC_PENDING_ENROLL}
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {COMMON_LABELS.CLOSE}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member">{INSURANCE_LABELS.MEMBER_LABEL}</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger id="member">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                disabled={loading || !memberId}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading
                  ? COMMON_LABELS.LOADING
                  : INSURANCE_LABELS.ENROLL_BUTTON}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
