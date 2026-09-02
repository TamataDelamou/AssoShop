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
  Antenna,
  CreateAntennaPayload,
  StructureLevel,
} from "@/types/modules/community";

const LEVELS: { value: StructureLevel; label: string }[] = [
  { value: StructureLevel.REGIONAL, label: "Bureau régional" },
  { value: StructureLevel.PREFECTORAL, label: "Bureau préfectoral" },
  { value: StructureLevel.COMMUNAL, label: "Section communale" },
  { value: StructureLevel.NEIGHBORHOOD, label: "Cellule de quartier" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  antennas: Antenna[];
  creating: boolean;
  onCreate: (payload: CreateAntennaPayload) => Promise<void>;
}

export function CreateAntennaDialog({
  open,
  onOpenChange,
  antennas,
  creating,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<StructureLevel>(
    StructureLevel.REGIONAL,
  );
  const [city, setCity] = useState("");
  const [parentId, setParentId] = useState("");
  const [responsible, setResponsible] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Le nom de l'antenne est obligatoire.");
      return;
    }
    if (!city.trim()) {
      setError("La ville est obligatoire.");
      return;
    }
    try {
      await onCreate({
        name: name.trim(),
        level,
        city: city.trim(),
        parent_id:
          parentId && parentId !== "none" ? parentId : null,
        responsible: responsible.trim() || undefined,
        address: address.trim() || undefined,
      });
      setName("");
      setLevel(StructureLevel.REGIONAL);
      setCity("");
      setParentId("");
      setResponsible("");
      setAddress("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible de créer l'antenne.");
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
            Créer une antenne / section
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Rattachez une nouvelle structure à la structure mère.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="an-name" className="text-foreground">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="an-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Bureau régional de Boké"
              disabled={creating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="an-level" className="text-foreground">
                Niveau
              </Label>
              <Select
                value={level}
                onValueChange={(v) => setLevel(v as StructureLevel)}
                disabled={creating}
              >
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="an-city" className="text-foreground">
                Ville <span className="text-destructive">*</span>
              </Label>
              <Input
                id="an-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-input/50 border-border/50 text-foreground"
                placeholder="Ex : Boké"
                disabled={creating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="an-parent" className="text-foreground">
              Rattachement
            </Label>
            <Select value={parentId} onValueChange={setParentId} disabled={creating}>
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Siège national (direct)" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                <SelectItem value="none">Siège national (direct)</SelectItem>
                {antennas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="an-responsible" className="text-foreground">
              Responsable
            </Label>
            <Input
              id="an-responsible"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Aïcha Baldé"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="an-address" className="text-foreground">
              Adresse
            </Label>
            <Input
              id="an-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Quartier Sambaya"
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
              {creating ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
