"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HUB_LABELS } from "@/utils/constants";
import {
  Eye,
  KeyRound,
  LifeBuoy,
  Lock,
  MessageCircle,
  Save,
  Settings,
} from "lucide-react";

const selectStyles =
  "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

const FAQ_ITEMS = [
  {
    q: "Comment rejoindre une association ?",
    a: "Recherchez l'association, puis envoyez une demande d'adhésion. Un gestionnaire valide votre demande.",
  },
  {
    q: "Comment fonctionne la tontine ?",
    a: "Chaque membre verse une cotisation périodique. Les tours sont attribués selon les règles définies par le groupe.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Les documents du coffre-fort sont chiffrés. Vous contrôlez les autorisations d'accès à vos données.",
  },
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
    </label>
  );
}

export function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [simplified, setSimplified] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [shareData, setShareData] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-light">{HUB_LABELS.GENERAL_TITLE}</h3>
        </div>
        <Button size="sm" onClick={save}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saved ? "Enregistré" : HUB_LABELS.SAVE}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* HUB-26 : sécurité */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Lock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              {HUB_LABELS.SECURITY_TITLE}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              <span className="text-muted-foreground">Code PIN</span>
              <span className="font-mono">••••</span>
            </div>
            <Button size="sm" variant="outline" className="w-full">
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Modifier le PIN
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-white/10"
            >
              Déconnecter les autres appareils
            </Button>
          </CardContent>
        </Card>

        {/* HUB-27 : paramètres généraux */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{HUB_LABELS.GENERAL_TITLE}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">
                Langue
              </span>
              <select className={selectStyles} defaultValue="Français">
                <option>Français</option>
                <option>English</option>
                <option>العربية</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">
                Fuseau horaire
              </span>
              <select className={selectStyles} defaultValue="Africa/Conakry">
                <option>Africa/Conakry</option>
                <option>Africa/Dakar</option>
                <option>Africa/Abidjan</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* HUB-40 : accessibilité */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Eye className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              {HUB_LABELS.ACCESSIBILITY_TITLE}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Toggle
              label="Mode simplifié"
              checked={simplified}
              onChange={setSimplified}
            />
            <Toggle
              label="Texte agrandi"
              checked={largeText}
              onChange={setLargeText}
            />
            <Toggle
              label="Contraste élevé"
              checked={highContrast}
              onChange={setHighContrast}
            />
          </CardContent>
        </Card>

        {/* HUB-28 : confidentialité */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Lock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              {HUB_LABELS.PRIVACY_TITLE}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Toggle
              label="Partager mes données anonymisées"
              checked={shareData}
              onChange={setShareData}
            />
            <Toggle
              label="Profil visible publiquement"
              checked={publicProfile}
              onChange={setPublicProfile}
            />
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <Button size="sm" variant="outline" className="border-white/10">
                Exporter mes données
              </Button>
              <Button size="sm" variant="destructive">
                Supprimer mon compte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HUB-30 : FAQ */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <LifeBuoy className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">{HUB_LABELS.FAQ_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
            >
              <summary className="cursor-pointer font-medium">
                {item.q}
              </summary>
              <p className="mt-2 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </CardContent>
      </Card>

      {/* HUB-31 : conseiller */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <MessageCircle className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">{HUB_LABELS.ADVISOR_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Un conseiller AssoShop peut vous accompagner dans vos démarches.
          </p>
          <Button size="sm">Contacter un conseiller</Button>
        </CardContent>
      </Card>
    </div>
  );
}
