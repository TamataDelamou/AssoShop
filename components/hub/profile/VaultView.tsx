"use client";

import { useState } from "react";
import { VaultDocument } from "@/types/modules/hub";
import { hubService } from "@/services/hub/hub";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatFileSize } from "@/utils/formatters";
import { HUB_LABELS } from "@/utils/constants";
import { FileText, Lock, Upload } from "lucide-react";

export function VaultView({
  vault,
  online,
  onChanged,
}: {
  vault: VaultDocument[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Identité");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await hubService.uploadVaultDocument(name.trim(), category);
      setName("");
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
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-light">{HUB_LABELS.VAULT_TITLE}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{HUB_LABELS.VAULT_NOTE}</p>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-sm">{HUB_LABELS.UPLOAD}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                Nom du document
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex : Attestation de résidence.pdf"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                Catégorie
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {["Identité", "Diplôme", "Contrat", "Autre"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            size="sm"
            onClick={upload}
            disabled={busy || !online || !name.trim()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {HUB_LABELS.UPLOAD}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {vault.map((doc) => (
          <Card key={doc.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                {doc.name}
              </CardTitle>
              {doc.encrypted && (
                <Badge variant="outline" className="border-white/10 bg-white/5">
                  <Lock className="mr-1 h-3 w-3" />
                  Chiffré
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {doc.category} · {formatFileSize(doc.size)}
              </span>
              <span>{formatDate(doc.uploaded_at)}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
