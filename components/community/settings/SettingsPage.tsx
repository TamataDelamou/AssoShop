"use client";

import { useState } from "react";
import { Save, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useSettings } from "@/hooks/community/useSettings";
import {
  MembershipValidationMode,
  OrganizationSettings,
} from "@/types/modules/community";
import { MEMBER_ROLES } from "@/utils/constants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  organizationId: string;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted/50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="divide-y divide-border/50">{children}</CardContent>
    </Card>
  );
}

export function SettingsPage({ organizationId }: Props) {
  const { draft, setDraft, officeHolders, loading, saving, error, save } =
    useSettings(organizationId);
  const [justSaved, setJustSaved] = useState(false);

  const updateConfidentiality = (
    key: keyof OrganizationSettings["confidentiality"],
    value: boolean,
  ) => {
    setDraft((d) =>
      d
        ? { ...d, confidentiality: { ...d.confidentiality, [key]: value } }
        : d,
    );
  };

  const updateMembership = (
    key: keyof OrganizationSettings["membership"],
    value: MembershipValidationMode | boolean,
  ) => {
    setDraft((d) => (d ? { ...d, membership: { ...d.membership, [key]: value } } : d));
  };

  const handleSave = async () => {
    await save();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-muted/30" />
        <Skeleton className="h-56 w-full bg-muted/30" />
        <Skeleton className="h-40 w-full bg-muted/30" />
      </div>
    );
  }

  if (!draft) return null;

  const roleOrder = new Map(MEMBER_ROLES.map((r, i) => [r.value, i]));
  const sortedHolders = [...officeHolders].sort(
    (a, b) => (roleOrder.get(a.role) ?? 99) - (roleOrder.get(b.role) ?? 99),
  );
  const roleLabel = (role: string) =>
    MEMBER_ROLES.find((r) => r.value === role)?.label || role;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">Paramètres</h2>
          <p className="text-sm text-muted-foreground">
            Confidentialité, règles d&apos;adhésion et bureau.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </Button>
      </div>

      {justSaved && (
        <Alert className="border-primary/40 bg-primary/10">
          <AlertDescription className="text-foreground">
            Modifications enregistrées.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <SectionCard
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Confidentialité"
        description="Visibilité des données vis-à-vis des associations affiliées."
      >
        <Toggle
          checked={draft.confidentiality.members_visible_to_affiliates}
          onChange={(v) =>
            updateConfidentiality("members_visible_to_affiliates", v)
          }
          label="Liste des membres visible par les affiliées"
        />
        <Toggle
          checked={draft.confidentiality.financial_details_visible_to_affiliates}
          onChange={(v) =>
            updateConfidentiality("financial_details_visible_to_affiliates", v)
          }
          label="Partager les détails financiers"
          description="Sans cette option, seules les statistiques agrégées remontent."
        />
        <Toggle
          checked={draft.confidentiality.contributors_visible_in_social_cases}
          onChange={(v) =>
            updateConfidentiality("contributors_visible_in_social_cases", v)
          }
          label="Contributeurs visibles sur les cas sociaux"
        />
      </SectionCard>

      <SectionCard
        icon={<UserCheck className="h-4 w-4" />}
        title="Règles d'adhésion"
        description="Comment les nouveaux membres rejoignent l'association."
      >
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm text-foreground">Mode de validation</p>
            <p className="text-xs text-muted-foreground">
              Manuel : le bureau valide chaque demande.
            </p>
          </div>
          <Select
            value={draft.membership.validation_mode}
            onValueChange={(v) =>
              updateMembership("validation_mode", v as MembershipValidationMode)
            }
          >
            <SelectTrigger className="w-48 bg-input/50 border-border/50 text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              <SelectItem value={MembershipValidationMode.MANUAL}>
                Validation manuelle
              </SelectItem>
              <SelectItem value={MembershipValidationMode.AUTO}>
                Auto-inscription
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Toggle
          checked={draft.membership.sponsorship_required}
          onChange={(v) => updateMembership("sponsorship_required", v)}
          label="Parrainage requis"
          description="Un membre actif doit parrainer chaque nouveau membre."
        />
      </SectionCard>

      <SectionCard
        icon={<Users className="h-4 w-4" />}
        title="Bureau"
        description="Les rôles se modifient depuis la page Membres."
      >
        {sortedHolders.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            Aucun membre du bureau désigné.
          </p>
        ) : (
          sortedHolders.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 py-3"
            >
              <Avatar className="h-8 w-8 bg-primary/20 text-primary">
                <AvatarFallback>
                  {member.user?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  {member.user?.name || "Utilisateur"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.user?.email || member.user?.phone}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-border/50 text-muted-foreground"
              >
                {roleLabel(member.role)}
              </Badge>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}
