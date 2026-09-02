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
  BeneficiaryCategory,
  CommunityProject,
  CreateBeneficiaryPayload,
} from "@/types/modules/community";

const CATEGORIES: { value: BeneficiaryCategory; label: string }[] = [
  { value: BeneficiaryCategory.CONSTRUCTION, label: "Construction" },
  { value: BeneficiaryCategory.AGRICULTURE, label: "Agriculture" },
  { value: BeneficiaryCategory.LIVESTOCK, label: "Élevage" },
  { value: BeneficiaryCategory.HEALTH, label: "Santé" },
  { value: BeneficiaryCategory.EDUCATION, label: "Éducation" },
  { value: BeneficiaryCategory.COMMERCE, label: "Commerce" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: CommunityProject[];
  creating: boolean;
  onCreate: (payload: CreateBeneficiaryPayload) => Promise<void>;
}

export function RegisterBeneficiaryDialog({
  open,
  onOpenChange,
  projects,
  creating,
  onCreate,
}: Props) {
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<BeneficiaryCategory>(
    BeneficiaryCategory.CONSTRUCTION,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!projectId) {
      setError("Veuillez sélectionner un projet.");
      return;
    }
    if (!name.trim()) {
      setError("Le nom du bénéficiaire est obligatoire.");
      return;
    }
    try {
      await onCreate({
        project_id: projectId,
        name: name.trim(),
        category,
      });
      setProjectId("");
      setName("");
      setCategory(BeneficiaryCategory.CONSTRUCTION);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible d'enregistrer le bénéficiaire.");
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
            Enregistrer un bénéficiaire
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Rattachez un bénéficiaire à un projet en cours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="ben-project" className="text-foreground">
              Projet <span className="text-destructive">*</span>
            </Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={creating}>
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Sélectionner un projet" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ben-name" className="text-foreground">
              Bénéficiaire <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ben-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input/50 border-border/50 text-foreground"
              placeholder="Ex : Groupement des femmes de Bonfi"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ben-category" className="text-foreground">
              Catégorie
            </Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as BeneficiaryCategory)}
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
              {creating ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
