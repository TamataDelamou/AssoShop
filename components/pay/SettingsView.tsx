"use client";

import { useState } from "react";
import { PaymentSettings } from "@/types/modules/pay";
import { payService } from "@/services/pay/pay";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PAY_COUNTRIES,
  PAY_LABELS,
  PAY_MESSAGES,
  PAY_OPERATORS_BY_COUNTRY,
} from "@/utils/constants";
import { Save, Settings } from "lucide-react";

const selectStyles =
  "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

interface SettingsViewProps {
  settings: PaymentSettings;
  online: boolean;
  onChanged: () => Promise<void>;
}

export function SettingsView({
  settings,
  online,
  onChanged,
}: SettingsViewProps) {
  const [country, setCountry] = useState(PAY_COUNTRIES[0]);
  const [provider, setProvider] = useState(settings.default_provider);
  const [maxAmount, setMaxAmount] = useState(settings.max_transaction_amount);
  const [alertsEnabled, setAlertsEnabled] = useState(settings.alerts_enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCountry = (value: string) => {
    setCountry(value);
    setProvider(PAY_OPERATORS_BY_COUNTRY[value]?.[0] ?? "");
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await payService.updateSettings({
        default_provider: provider,
        max_transaction_amount: maxAmount,
        alerts_enabled: alertsEnabled,
      });
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
        <Settings className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-light">{PAY_LABELS.SETTINGS_TITLE}</h3>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm">
            {PAY_LABELS.SETTINGS_TITLE}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              Pays
            </Label>
            <select
              value={country}
              onChange={(e) => handleCountry(e.target.value)}
              className={selectStyles}
            >
              {PAY_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.DEFAULT_PROVIDER}
            </Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className={selectStyles}
            >
              {(PAY_OPERATORS_BY_COUNTRY[country] ?? []).map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.MAX_TRANSACTION_AMOUNT}
            </Label>
            <Input
              type="number"
              min={0}
              value={maxAmount}
              onChange={(e) => setMaxAmount(Number(e.target.value))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alertsEnabled}
              onChange={(e) => setAlertsEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {PAY_LABELS.ALERTS_ENABLED}
          </label>

          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={submit} disabled={busy || !online}>
            <Save className="mr-1.5 h-4 w-4" />
            {PAY_LABELS.SAVE}
          </Button>

          {!online && (
            <p className="text-xs text-amber-400">
              {PAY_LABELS.OFFLINE_BADGE} —{" "}
              {PAY_MESSAGES.SETTINGS_SAVE_ERROR}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
