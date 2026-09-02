"use client";

import { useState } from "react";
import { CatalogCategory } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_LABELS } from "@/utils/constants";
import { FolderPlus, FolderTree } from "lucide-react";

export function CatalogView({
  categories,
  online,
  onChanged,
}: {
  categories: CatalogCategory[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await adminService.addCategory(name.trim(), parent || null);
      setName("");
      setParent("");
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <p className="font-medium">{category.name}</p>
            </div>
            <Badge variant="outline" className="border-white/10 bg-white/5">
              {category.products_count} produits
            </Badge>
          </div>
        ))}
      </div>

      <Card className="max-w-xl">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <FolderPlus className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Ajouter une catégorie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de la catégorie"
            />
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="">Aucun parent</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            size="sm"
            onClick={add}
            disabled={busy || !online || !name.trim()}
          >
            <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
            {ADMIN_LABELS.SAVE}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
