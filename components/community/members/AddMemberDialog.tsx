"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAddMember } from "@/hooks/community/useAddMember";
import { MEMBER_LABELS, MEMBER_ROLES, COMMON_LABELS } from "@/utils/constants";
import { MemberRole } from "@/types/modules/community";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<MemberRole>(MemberRole.MEMBER);
  const [inputError, setInputError] = useState<string | null>(null);
  const { addMember, loading, error } = useAddMember();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    if (!email && !phone) {
      setInputError("Veuillez fournir un email ou un numéro de téléphone.");
      return;
    }

    const payload = {
      organization_id: organizationId,
      role,
      ...(email && { email }),
      ...(phone && { phone }),
    };

    try {
      await addMember(payload);
      onSuccess?.();
      onOpenChange(false);
      // Réinitialiser le formulaire
      setEmail("");
      setPhone("");
      setRole(MemberRole.MEMBER);
    } catch {
      // L'erreur est déjà gérée dans le hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>{MEMBER_LABELS.ADD_MEMBER_TITLE}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {MEMBER_LABELS.ADD_MEMBER_DESCRIPTION}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {(error || inputError) && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error || inputError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={MEMBER_LABELS.EMAIL_PLACEHOLDER}
              className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">
              Téléphone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={MEMBER_LABELS.PHONE_PLACEHOLDER}
              className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-foreground">
              {MEMBER_LABELS.ROLE_LABEL}
            </Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as MemberRole)}
              disabled={loading}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue
                  placeholder={MEMBER_LABELS.ROLE_SELECT_PLACEHOLDER}
                />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {MEMBER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              {COMMON_LABELS.CANCEL}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? COMMON_LABELS.LOADING : MEMBER_LABELS.ADD_BUTTON}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
