"use client";

import { useState } from "react";
import { HubProfile } from "@/types/modules/hub";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HUB_LABELS } from "@/utils/constants";
import { Check, CreditCard, Share2 } from "lucide-react";

function FakeQR({ value, size = 168 }: { value: string; size?: number }) {
  const n = 21;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const next = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return (hash >>> 0) / 4294967296;
  };
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  const cell = size / n;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const filled = isFinder(r, c) || next() > 0.5;
      if (filled) {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c * cell}
            y={r * cell}
            width={cell}
            height={cell}
            fill="#111827"
          />,
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg bg-white p-1"
      role="img"
      aria-label="QR Code de membre"
    >
      {cells}
    </svg>
  );
}

export function DigitalCardView({ profile }: { profile: HubProfile }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(
        `https://assoshop.app/carte/${profile.id}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="max-w-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <CreditCard className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm">{HUB_LABELS.DIGITAL_CARD}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <FakeQR value={`assoshop:member:${profile.id}`} />
        <div className="text-center">
          <p className="font-medium">{profile.name}</p>
          <p className="text-xs text-muted-foreground">
            Membre · {profile.id.toUpperCase()}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={share}>
          {copied ? (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          {copied ? "Lien copié" : HUB_LABELS.SHARE}
        </Button>
      </CardContent>
    </Card>
  );
}
