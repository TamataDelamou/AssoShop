"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/ui/qr-code";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  organizationId,
}: Props) {
  const [copied, setCopied] = useState(false);
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${organizationId}`
      : `/join/${organizationId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Le presse-papiers peut être indisponible (permissions).
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Inviter des membres
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Partagez ce lien : toute personne qui l&apos;ouvre peut soumettre
            une demande d&apos;adhésion, que le bureau validera ensuite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <Label htmlFor="join-link" className="text-foreground">
            Lien d&apos;invitation
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="join-link"
                readOnly
                value={joinUrl}
                className="pl-9 bg-input/50 border-border/50 text-foreground pr-2"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="border-border/50 text-foreground"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {copied && (
            <p className="text-xs text-primary">Lien copié dans le presse-papiers.</p>
          )}

          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="rounded-lg bg-white p-3">
              <QrCode value={joinUrl} size={168} />
            </div>
            <p className="text-xs text-muted-foreground">
              Scannez ce QR Code pour ouvrir le lien d&apos;inscription.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
