"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateOrganization } from "@/hooks/useCreateOrganization";
import { getErrorMessage } from "@/lib/utils";
import {
  ORGANIZATION_LABELS,
  ORGANIZATION_TYPES,
  COMMON_LABELS,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    type: "association",
    city: "",
    object: "",
  });
  const [error, setError] = useState<string | null>(null);
  const { create, loading } = useCreateOrganization();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Le nom est requis");
      return;
    }

    try {
      await create(form);
      onSuccess?.(); // Rafraîchir la liste
      onOpenChange(false);
      // Réinitialiser le formulaire
      setForm({ name: "", type: "association", city: "", object: "" });
    } catch (err: unknown) {
      setError(getErrorMessage(err, ORGANIZATION_LABELS.CREATE_ERROR));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light">
            {ORGANIZATION_LABELS.CREATE_DIALOG_TITLE}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              {ORGANIZATION_LABELS.NAME_LABEL}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
              placeholder="Ex: Association des Éleveurs de Guinée"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-foreground">
              {ORGANIZATION_LABELS.TYPE_LABEL}
            </Label>
            <Select
              value={form.type}
              onValueChange={(val) => setForm({ ...form, type: val })}
              disabled={loading}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue
                  placeholder={ORGANIZATION_LABELS.TYPE_PLACEHOLDER}
                />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {ORGANIZATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className="text-foreground">
              {ORGANIZATION_LABELS.CITY_LABEL}
            </Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
              placeholder="Ex: Conakry"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="object" className="text-foreground">
              {ORGANIZATION_LABELS.OBJECT_LABEL}
            </Label>
            <Input
              id="object"
              value={form.object}
              onChange={(e) => setForm({ ...form, object: e.target.value })}
              className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
              placeholder="Ex: Promotion de l'élevage et de l'agriculture"
              disabled={loading}
            />
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
              {loading
                ? COMMON_LABELS.LOADING
                : ORGANIZATION_LABELS.CREATE_BUTTON}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
