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
import { useRequestLoan } from "@/hooks/finance/useRequestLoan";
import { useAiLoan } from "@/hooks/finance/useAiLoan";
import {
  FinancialGroup,
  GroupLoan,
  GroupMemberRole,
} from "@/types/modules/finance";
import {
  AI_LABELS,
  COMMON_LABELS,
  LOAN_LABELS,
  LOAN_MESSAGES,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  groups: FinancialGroup[];
  onSuccess?: (result: GroupLoan | null) => void;
}

export function RequestLoanDialog({
  open,
  onOpenChange,
  organizationId,
  groups,
  onSuccess,
}: Props) {
  const [groupId, setGroupId] = useState(() => groups[0]?.id ?? "");
  const [memberId, setMemberId] = useState(
    () => groups[0]?.members?.[0]?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [suggested, setSuggested] = useState<number | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const { requestLoan, loading, error } = useRequestLoan();
  const { suggest, suggesting, error: aiError } = useAiLoan();

  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedMember = selectedGroup?.members?.find(
    (m) => m.id === memberId,
  );
  const sponsor = selectedGroup?.members?.find(
    (m) => m.role === GroupMemberRole.CREATOR,
  );

  const handleGroupChange = (gid: string) => {
    setGroupId(gid);
    const group = groups.find((g) => g.id === gid);
    setMemberId(group?.members?.[0]?.id ?? "");
    setSuggested(null);
  };

  const handleMemberChange = (mid: string) => {
    setMemberId(mid);
    setSuggested(null);
  };

  const handleSuggest = async () => {
    if (!selectedGroup) return;
    setInputError(null);
    try {
      const value = await suggest({
        totalSaved: selectedGroup.raised_amount,
        engagement: selectedMember?.engagement ?? "reliable",
        startDate: selectedGroup.start_date,
      });
      setSuggested(value);
      setAmount(String(value));
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedMember) return;
    setInputError(null);

    if (!groupId) {
      setInputError(LOAN_MESSAGES.GROUP_REQUIRED);
      return;
    }
    if (!memberId) {
      setInputError(LOAN_MESSAGES.MEMBER_REQUIRED);
      return;
    }
    const amountValue = Number(amount);
    if (!amount.trim() || Number.isNaN(amountValue) || amountValue <= 0) {
      setInputError(LOAN_MESSAGES.AMOUNT_REQUIRED);
      return;
    }

    try {
      const result = await requestLoan(
        organizationId,
        groupId,
        { member_id: memberId, amount: amountValue },
        {
          group_name: selectedGroup.name,
          member_name: selectedMember.name,
          sponsor_name: sponsor?.name ?? "Parrain",
          interest_rate: selectedGroup.interest_rate ?? 0,
        },
      );
      if (result === null) {
        setQueued(true);
        onSuccess?.(null);
      } else {
        onSuccess?.(result);
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
          <DialogTitle>{LOAN_LABELS.REQUEST_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {!groups.length ? (
          <p className="text-sm text-muted-foreground">
            {LOAN_LABELS.NO_ELIGIBLE_GROUPS}
          </p>
        ) : queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {LOAN_LABELS.REQUEST_SYNC_PENDING}
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
              <Label htmlFor="group">{LOAN_LABELS.GROUP_LABEL}</Label>
              <Select value={groupId} onValueChange={handleGroupChange}>
                <SelectTrigger id="group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member">{LOAN_LABELS.MEMBER_LABEL}</Label>
              <Select value={memberId} onValueChange={handleMemberChange}>
                <SelectTrigger id="member">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedGroup?.members?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="amount">{LOAN_LABELS.AMOUNT_LABEL}</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={LOAN_LABELS.AMOUNT_PLACEHOLDER}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSuggest}
                  disabled={suggesting || !selectedMember}
                >
                  {suggesting
                    ? AI_LABELS.GENERATING
                    : LOAN_LABELS.AI_SUGGEST_BUTTON}
                </Button>
              </div>
              {suggested !== null ? (
                <p className="text-xs text-muted-foreground">
                  {LOAN_LABELS.SUGGESTED_LABEL} :{" "}
                  {formatCurrency(suggested)} — {LOAN_LABELS.AI_SUGGEST_NOTE}
                </p>
              ) : null}
            </div>

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
                  : LOAN_LABELS.REQUEST_BUTTON}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
