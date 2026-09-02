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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CommunityProject,
  CreateEvaluationPayload,
} from "@/types/modules/community";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: CommunityProject[];
  creating: boolean;
  onCreate: (payload: CreateEvaluationPayload) => Promise<void>;
}

export function CreateEvaluationDialog({
  open,
  onOpenChange,
  projects,
  creating,
  onCreate,
}: Props) {
  const [projectId, setProjectId] = useState("");
  const [objectives, setObjectives] = useState("");
  const [results, setResults] = useState("");
  const [impact, setImpact] = useState("");
  const [rating, setRating] = useState("3");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!projectId) {
      setError("Veuillez sélectionner un projet.");
      return;
    }
    if (!objectives.trim() || !results.trim()) {
      setError("Objectifs et résultats sont obligatoires.");
      return;
    }
    try {
      await onCreate({
        project_id: projectId,
        objectives: objectives.trim(),
        results: results.trim(),
        impact: impact.trim(),
        rating: Number(rating),
      });
      setProjectId("");
      setObjectives("");
      setResults("");
      setImpact("");
      setRating("3");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Impossible d'enregistrer l'évaluation.");
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
            Bilan d&apos;évaluation
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Évaluez l&apos;avancement et l&apos;impact d&apos;un projet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="ev-project" className="text-foreground">
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
            <Label htmlFor="ev-objectives" className="text-foreground">
              Objectifs <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="ev-objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Objectifs du projet..."
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-results" className="text-foreground">
              Résultats atteints <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="ev-results"
              value={results}
              onChange={(e) => setResults(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Résultats constatés..."
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-impact" className="text-foreground">
              Impact &amp; leçons
            </Label>
            <textarea
              id="ev-impact"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Impact observé sur les bénéficiaires..."
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-rating" className="text-foreground">
              Note globale
            </Label>
            <Select value={rating} onValueChange={setRating} disabled={creating}>
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / 5
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
