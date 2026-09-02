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
import { useCreateFinancialGroup } from "@/hooks/finance/useCreateFinancialGroup";
import {
  FinancialGroupType,
  GroupPeriodicity,
} from "@/types/modules/finance";
import {
  COMMON_LABELS,
  FINANCE_LABELS,
  FINANCE_MESSAGES,
  FINANCIAL_GROUP_TYPE_OPTIONS,
  GROUP_PERIODICITY_OPTIONS,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function CreateFinancialGroupDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FinancialGroupType>(
    FinancialGroupType.TONTINE,
  );
  const [amount, setAmount] = useState("");
  const [periodicity, setPeriodicity] = useState<GroupPeriodicity>(
    GroupPeriodicity.WEEKLY,
  );
  const [maxMembers, setMaxMembers] = useState("");
  const [goal, setGoal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [turnOrder, setTurnOrder] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const { createGroup, loading, error } = useCreateFinancialGroup();

  const selectedType = FINANCIAL_GROUP_TYPE_OPTIONS.find(
    (t) => t.value === type,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    if (!name.trim()) {
      setInputError(FINANCE_MESSAGES.NAME_REQUIRED);
      return;
    }
    const amountValue = Number(amount);
    if (!amount.trim() || Number.isNaN(amountValue) || amountValue <= 0) {
      setInputError(FINANCE_MESSAGES.AMOUNT_REQUIRED);
      return;
    }
    const maxValue = Number(maxMembers);
    if (
      !maxMembers.trim() ||
      Number.isNaN(maxValue) ||
      maxValue <= 0
    ) {
      setInputError(FINANCE_MESSAGES.MAX_MEMBERS_REQUIRED);
      return;
    }

    let goalValue: number | null = null;
    let interestValue: number | null = null;

    if (type === FinancialGroupType.SAVINGS_GOAL) {
      goalValue = Number(goal);
      if (!goal.trim() || Number.isNaN(goalValue) || goalValue <= 0) {
        setInputError(FINANCE_MESSAGES.GOAL_REQUIRED);
        return;
      }
    }
    if (type === FinancialGroupType.SAVINGS) {
      interestValue = Number(interestRate);
      if (
        !interestRate.trim() ||
        Number.isNaN(interestValue) ||
        interestValue < 0
      ) {
        setInputError(FINANCE_MESSAGES.INTEREST_RATE_REQUIRED);
        return;
      }
    }

    try {
      const turnNames = turnOrder
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

      const result = await createGroup(organizationId, {
        name: name.trim(),
        type,
        amount: amountValue,
        periodicity,
        max_members: maxValue,
        goal_amount: goalValue,
        interest_rate: interestValue,
        start_date: startDate || null,
        turn_member_names: turnNames,
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
          <DialogTitle>{FINANCE_LABELS.CREATE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {FINANCE_LABELS.SYNC_PENDING_NOTICE}
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
              <Label htmlFor="name">{FINANCE_LABELS.NAME_LABEL}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={FINANCE_LABELS.NAME_PLACEHOLDER}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{FINANCE_LABELS.TYPE_LABEL}</Label>
              <Select
                value={type}
                onValueChange={(value) =>
                  setType(value as FinancialGroupType)
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_GROUP_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType ? (
                <p className="text-xs text-muted-foreground">
                  {selectedType.description}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">{FINANCE_LABELS.AMOUNT_LABEL}</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={FINANCE_LABELS.AMOUNT_PLACEHOLDER}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodicity">
                  {FINANCE_LABELS.PERIODICITY_LABEL}
                </Label>
                <Select
                  value={periodicity}
                  onValueChange={(value) =>
                    setPeriodicity(value as GroupPeriodicity)
                  }
                >
                  <SelectTrigger id="periodicity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_PERIODICITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMembers">
                {FINANCE_LABELS.MAX_MEMBERS_LABEL}
              </Label>
              <Input
                id="maxMembers"
                type="number"
                min={1}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                placeholder={FINANCE_LABELS.MAX_MEMBERS_PLACEHOLDER}
              />
            </div>

            {type === FinancialGroupType.TONTINE ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    {FINANCE_LABELS.START_DATE_LABEL}
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turnOrder">
                    {FINANCE_LABELS.TURN_ORDER_LABEL}
                  </Label>
                  <textarea
                    id="turnOrder"
                    rows={4}
                    value={turnOrder}
                    onChange={(e) => setTurnOrder(e.target.value)}
                    placeholder={FINANCE_LABELS.TURN_ORDER_PLACEHOLDER}
                    className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            ) : null}

            {type === FinancialGroupType.SAVINGS_GOAL ? (
              <div className="space-y-2">
                <Label htmlFor="goal">{FINANCE_LABELS.GOAL_LABEL}</Label>
                <Input
                  id="goal"
                  type="number"
                  min={0}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={FINANCE_LABELS.GOAL_PLACEHOLDER}
                />
              </div>
            ) : null}

            {type === FinancialGroupType.SAVINGS ? (
              <div className="space-y-2">
                <Label htmlFor="interest">
                  {FINANCE_LABELS.INTEREST_RATE_LABEL}
                </Label>
                <Input
                  id="interest"
                  type="number"
                  min={0}
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder={FINANCE_LABELS.INTEREST_RATE_PLACEHOLDER}
                />
              </div>
            ) : null}

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
                  : FINANCE_LABELS.CREATE_BUTTON}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
