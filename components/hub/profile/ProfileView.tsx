"use client";

import { useState } from "react";
import { HubBundle } from "@/types/modules/hub";
import { EngagementLevel } from "@/types/modules/finance";
import { hubService } from "@/services/hub/hub";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  ENGAGEMENT_LEVEL_LABELS,
  HUB_LABELS,
} from "@/utils/constants";
import { Gift, Save, ShieldCheck, User } from "lucide-react";

function engagementVariant(level: EngagementLevel): string {
  switch (level) {
    case EngagementLevel.AT_RISK:
      return "border-red-500/40 bg-red-500/10 text-red-400";
    case EngagementLevel.IRREGULAR:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    case EngagementLevel.RELIABLE:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case EngagementLevel.EXEMPLARY:
      return "border-sky-500/40 bg-sky-500/10 text-sky-400";
  }
}

export function ProfileView({
  bundle,
  online,
  onChanged,
}: {
  bundle: HubBundle;
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const { profile, referrals } = bundle;
  const [city, setCity] = useState(profile.city);
  const [language, setLanguage] = useState(profile.language);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await hubService.updateProfile({ city, language });
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-light">{HUB_LABELS.PROFILE_TITLE}</h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* HUB-10 : profil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{profile.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Téléphone</span>
              <span>{profile.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">E-mail</span>
              <span>{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {HUB_LABELS.MEMBER_SINCE}
              </span>
              <span>{formatDate(profile.joined_at)}</span>
            </div>
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Ville
                </Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Langue
                </Label>
                <Input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <Button size="sm" onClick={save} disabled={busy || !online}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {HUB_LABELS.SAVE}
            </Button>
          </CardContent>
        </Card>

        {/* HUB-22 : score de confiance communautaire */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              {HUB_LABELS.TRUST_SCORE}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-4xl font-bold">{profile.trust_score}</p>
              <Badge
                variant="outline"
                className={engagementVariant(profile.engagement)}
              >
                {ENGAGEMENT_LEVEL_LABELS[profile.engagement]}
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${profile.trust_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Calculé à partir de la régularité des cotisations, des
              remboursements, de la participation et de l&apos;ancienneté.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* HUB-44 : programme de parrainage */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Gift className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">
            {HUB_LABELS.REFERRAL_TITLE}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun filleul pour le moment.
            </p>
          ) : (
            referrals.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{r.referred_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.joined_at)} · {r.status}
                  </p>
                </div>
                <Badge variant="outline" className="border-white/10 bg-white/5">
                  {formatCurrency(r.reward, "GNF")}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
