"use client";

import { useState } from "react";
import { SubscriptionPlan } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatters";
import { ADMIN_LABELS } from "@/utils/constants";
import { Save } from "lucide-react";

export function SubscriptionsView({
  plans,
  online,
  onChanged,
}: {
  plans: SubscriptionPlan[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setPrice(String(plan.monthly_price));
    setError(null);
  };

  const save = async (id: string) => {
    if (!price) return;
    setBusy(true);
    setError(null);
    try {
      await adminService.updatePlan(id, Number(price));
      setEditingId(null);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div>
            <p className="font-medium">{plan.tier}</p>
            <p className="text-xs text-muted-foreground">
              {plan.member_limit === -1
                ? "Membres illimités"
                : `Jusqu'à ${plan.member_limit} membres`}
            </p>
          </div>
          {editingId === plan.id ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-32"
              />
              <Button
                size="sm"
                onClick={() => save(plan.id)}
                disabled={busy || !online || !price}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {ADMIN_LABELS.SAVE}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-white/10 bg-white/5">
                {formatCurrency(plan.monthly_price, plan.currency)} / mois
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10"
                onClick={() => startEdit(plan)}
              >
                Modifier
              </Button>
            </div>
          )}
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
