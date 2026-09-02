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
import {
  AssetCategory,
  CreateAssetPayload,
} from "@/types/modules/community";

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: AssetCategory.VEHICLE, label: "Véhicule" },
  { value: AssetCategory.COMPUTER, label: "Ordinateur" },
  { value: AssetCategory.PRINTER, label: "Imprimante" },
  { value: AssetCategory.BUILDING, label: "Bâtiment" },
  { value: AssetCategory.LAND, label: "Terrain" },
  { value: AssetCategory.FURNITURE, label: "Mobilier" },
  { value: AssetCategory.AGRICULTURAL, label: "Matériel agricole" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onCreate: (payload: CreateAssetPayload) => Promise<void>;
}

export function AddAssetDialog({
  open,
  onOpenChange,
  creating,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>(
    AssetCategory.FURNITURE,
  );
  const [quantity, setQuantity] = useState("1");
  const [value, setValue] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Le nom de l'actif est obligatoire.");
      return;
    }
    if (!Number(value) || Number(value) < 0) {
      setError("La valeur d'acquisition doit être un nombre positif.");
      return;
    }
    try {
      await onCreate({
        name: name.trim(),
        category,
        quantity: Math.max(1, Number(quantity) || 1),
        acquisition_value: Number(value),
        acquisition_date: date || undefined,
        location: location.trim() || undefined,
        assigned_to: assignedTo.trim() || undefined,
      });
      setName("");
      setCategory(AssetCategory.FURNITURE);
      setQuantity("1");
      setValue("");
      setDate("");
      setLocation("");
      setAssignedTo("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible d'ajouter l'actif.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setError(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Ajouter un actif
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enregistrez un bien dans le patrimoine de l&apos;association.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="asset-name" className="text-foreground">
              Désignation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Ordinateur portable Dell"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-category" className="text-foreground">
              Catégorie
            </Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as AssetCategory)}
              disabled={creating}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-qty" className="text-foreground">
                Quantité
              </Label>
              <Input
                id="asset-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-value" className="text-foreground">
                Valeur (GNF) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="asset-value"
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="Ex : 1500000"
                disabled={creating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-date" className="text-foreground">
              Date d&apos;acquisition
            </Label>
            <Input
              id="asset-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-location" className="text-foreground">
              Localisation
            </Label>
            <Input
              id="asset-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Siège, bureau"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-assigned" className="text-foreground">
              Affecté à
            </Label>
            <Input
              id="asset-assigned"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Mamadou Bah"
              disabled={creating}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {creating ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
