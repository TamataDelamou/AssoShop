"use client";

import { useState } from "react";
import { ResellerSettings as Settings } from "@/types/modules/market";
import { resellerService } from "@/services/market/reseller";
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
import { MARKET_LABELS } from "@/utils/constants";
import { MapPin, Save } from "lucide-react";

interface ResellerSettingsProps {
  settings: Settings;
  onSaved: () => void;
}

export function ResellerSettings({
  settings,
  onSaved,
}: ResellerSettingsProps) {
  const [zones, setZones] = useState(settings.delivery_zones.join(", "));
  const [slots, setSlots] = useState(settings.delivery_slots.join(", "));
  const [payment, setPayment] = useState(settings.payment_details);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await resellerService.updateSettings({
        delivery_zones: zones
          .split(",")
          .map((z) => z.trim())
          .filter(Boolean),
        delivery_slots: slots
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        payment_details: payment,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-primary" />
          {MARKET_LABELS.SETTINGS}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">
            {MARKET_LABELS.DELIVERY_ZONES}
          </Label>
          <Input
            value={zones}
            onChange={(e) => setZones(e.target.value)}
            placeholder="Conakry, Kindia, Coyah"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">
            {MARKET_LABELS.DELIVERY_SLOTS}
          </Label>
          <Input
            value={slots}
            onChange={(e) => setSlots(e.target.value)}
            placeholder="08h-12h, 14h-18h"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">
            {MARKET_LABELS.PAYMENT_DETAILS}
          </Label>
          <Input
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          />
        </div>

        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {MARKET_LABELS.SAVE}
        </Button>
      </CardContent>
    </Card>
  );
}
