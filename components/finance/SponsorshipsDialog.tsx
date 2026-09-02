"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSponsorship } from "@/hooks/finance/useSponsorship";
import { useFinancialGroups } from "@/hooks/finance/useFinancialGroups";
import { SponsorshipStatusBadge } from "./SponsorshipStatusBadge";
import {
  FinancialGroup,
  FinancialGroupStatus,
  SponsorshipRequestStatus,
} from "@/types/modules/finance";
import { COMMON_LABELS, FINANCE_LABELS } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { Check, UserPlus, X } from "lucide-react";

type Tab = "requests" | "new" | "groups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onChanged?: () => void;
}

export function SponsorshipsDialog({
  open,
  onOpenChange,
  organizationId,
  onChanged,
}: Props) {
  const { bundle, loading, busy, error, create, respond, confirm } =
    useSponsorship(organizationId);
  const { groups } = useFinancialGroups(organizationId);

  const [tab, setTab] = useState<Tab>("requests");
  const [groupId, setGroupId] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [invitee, setInvitee] = useState("");
  const [phone, setPhone] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const eligibleGroups = groups.filter(
    (g) => g.status !== FinancialGroupStatus.CLOSED,
  );
  const selectedGroup = eligibleGroups.find((g) => g.id === groupId);
  const sponsors = selectedGroup?.members ?? [];

  const handleGroupChange = (value: string) => {
    setGroupId(value);
    setSponsorId("");
  };

  const handleJoinGroup = (group: FinancialGroup) => {
    setGroupId(group.id);
    setSponsorId("");
    setInvitee("");
    setPhone("");
    setInputError(null);
    setTab("new");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !sponsorId || !invitee.trim()) {
      setInputError("Veuillez renseigner le groupe, le parrain et la personne invitée.");
      return;
    }
    setInputError(null);
    try {
      await create({
        group_id: groupId,
        sponsor_id: sponsorId,
        invitee_name: invitee.trim(),
        invitee_phone: phone.trim() || null,
      });
      setInvitee("");
      setPhone("");
      setTab("requests");
      onChanged?.();
    } catch {
      // L'erreur est exposée par le hook.
    }
  };

  const handleRespond = async (
    requestId: string,
    decision: "accept" | "decline",
  ) => {
    try {
      await respond(requestId, decision);
    } catch {
      // L'erreur est exposée par le hook.
    }
  };

  const handleConfirm = async (requestId: string) => {
    try {
      await confirm(requestId);
      onChanged?.();
    } catch {
      // L'erreur est exposée par le hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {FINANCE_LABELS.SPONSORSHIP_TITLE}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Un nouveau membre doit être parrainé puis confirmer lui-même son
            adhésion.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 border-b border-border/50 pb-2">
          {(
            [
              ["requests", FINANCE_LABELS.SPONSORSHIP_TAB_REQUESTS],
              ["new", FINANCE_LABELS.SPONSORSHIP_TAB_NEW],
              ["groups", FINANCE_LABELS.SPONSORSHIP_TAB_GROUPS],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTab(id)}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                tab === id && "bg-primary/15 text-primary hover:text-primary",
              )}
            >
              {label}
            </Button>
          ))}
        </div>

        {tab === "requests" && (
          <div className="space-y-2">
            {loading && !bundle ? (
              <p className="text-sm text-muted-foreground">
                {COMMON_LABELS.LOADING}
              </p>
            ) : !bundle?.requests.length ? (
              <p className="text-sm text-muted-foreground">
                {FINANCE_LABELS.SPONSORSHIP_EMPTY}
              </p>
            ) : (
              <ul className="space-y-2">
                {bundle?.requests.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border/50 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">
                        {r.invitee_name}
                      </p>
                      <SponsorshipStatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {FINANCE_LABELS.SPONSORSHIP_SPONSOR} : {r.sponsor_name} ·
                      {" "}
                      {FINANCE_LABELS.SPONSORSHIP_GROUP} : {r.group_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.invitee_phone ? `${r.invitee_phone} · ` : ""}
                      {r.created_at ? formatDate(r.created_at) : ""}
                    </p>
                    {r.status === SponsorshipRequestStatus.PENDING && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleRespond(r.id, "accept")}
                          disabled={busy}
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          {FINANCE_LABELS.SPONSORSHIP_ACCEPT}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespond(r.id, "decline")}
                          disabled={busy}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="mr-1 h-3 w-3" />
                          {FINANCE_LABELS.SPONSORSHIP_DECLINE}
                        </Button>
                      </div>
                    )}
                    {r.status ===
                      SponsorshipRequestStatus.SPONSOR_ACCEPTED && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleConfirm(r.id)}
                          disabled={busy}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          {FINANCE_LABELS.SPONSORSHIP_CONFIRM}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "new" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {inputError && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertDescription>{inputError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-foreground">
                {FINANCE_LABELS.SPONSORSHIP_GROUP}
              </Label>
              <Select value={groupId} onValueChange={handleGroupChange}>
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue placeholder={FINANCE_LABELS.SPONSORSHIP_GROUP} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {eligibleGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({formatCurrency(g.amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">
                {FINANCE_LABELS.SPONSORSHIP_SPONSOR}
              </Label>
              <Select
                value={sponsorId}
                onValueChange={setSponsorId}
                disabled={!selectedGroup}
              >
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue placeholder={FINANCE_LABELS.SPONSORSHIP_SPONSOR} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {sponsors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Suggestions : membres actifs du groupe.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invitee" className="text-foreground">
                {FINANCE_LABELS.SPONSORSHIP_INVITEE}
              </Label>
              <Input
                id="invitee"
                value={invitee}
                onChange={(e) => setInvitee(e.target.value)}
                placeholder="Nom de la personne"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">
                {FINANCE_LABELS.SPONSORSHIP_PHONE}
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={FINANCE_LABELS.SPONSORSHIP_PHONE_PLACEHOLDER}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={busy}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="mr-1 h-4 w-4" />
                {busy ? COMMON_LABELS.LOADING : FINANCE_LABELS.SPONSORSHIP_SEND}
              </Button>
            </div>
          </form>
        )}

        {tab === "groups" && (
          <div className="space-y-2">
            {!bundle?.open_groups.length ? (
              <p className="text-sm text-muted-foreground">
                {FINANCE_LABELS.SPONSORSHIP_OPEN_GROUPS_EMPTY}
              </p>
            ) : (
              <ul className="space-y-2">
                {bundle?.open_groups.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(g.amount)} · {g.members?.length ?? 0}{" "}
                        membre(s)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleJoinGroup(g)}
                    >
                      {FINANCE_LABELS.SPONSORSHIP_JOIN}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
