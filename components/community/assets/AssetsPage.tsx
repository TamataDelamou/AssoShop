"use client";

import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { useAssets } from "@/hooks/community/useAssets";
import { AddAssetDialog } from "./AddAssetDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetCategory, AssetStatus } from "@/types/modules/community";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  [AssetCategory.VEHICLE]: "Véhicule",
  [AssetCategory.COMPUTER]: "Ordinateur",
  [AssetCategory.PRINTER]: "Imprimante",
  [AssetCategory.BUILDING]: "Bâtiment",
  [AssetCategory.LAND]: "Terrain",
  [AssetCategory.FURNITURE]: "Mobilier",
  [AssetCategory.AGRICULTURAL]: "Matériel agricole",
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  [AssetStatus.AVAILABLE]: "Disponible",
  [AssetStatus.IN_USE]: "En utilisation",
  [AssetStatus.MAINTENANCE]: "En maintenance",
  [AssetStatus.OUT_OF_SERVICE]: "Hors service",
};

const STATUS_BADGE: Record<AssetStatus, string> = {
  [AssetStatus.AVAILABLE]: "border-emerald-500/50 text-emerald-500",
  [AssetStatus.IN_USE]: "border-primary/50 text-primary",
  [AssetStatus.MAINTENANCE]: "border-amber-500/50 text-amber-500",
  [AssetStatus.OUT_OF_SERVICE]: "border-destructive/50 text-destructive",
};

function formatGnf(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)} GNF`;
}

interface Props {
  organizationId: string;
}

export function AssetsPage({ organizationId }: Props) {
  const {
    assets,
    loading,
    creating,
    busyId,
    error,
    totalValue,
    createAsset,
    updateStatus,
  } = useAssets(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 bg-muted/30" />
        <Skeleton className="h-24 w-full bg-muted/30" />
        <Skeleton className="h-64 w-full bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            Gestion des actifs
          </h2>
          <p className="text-sm text-muted-foreground">
            Véhicules, matériel, bâtiments et terrains de l&apos;association.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un actif
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Package className="h-4 w-4" />
            Valeur totale du patrimoine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-foreground">
            {formatGnf(totalValue)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Inventaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun actif enregistré.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/10">
                  <TableHead className="text-muted-foreground font-medium">
                    Désignation
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Catégorie
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    Qté
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    Valeur
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Affectation
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Statut
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="border-border/50 hover:bg-muted/10"
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {asset.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {asset.acquisition_date
                          ? `Acquis le ${format(asset.acquisition_date, "dd/MM/yyyy", { locale: fr })}`
                          : ""}
                        {asset.location ? ` · ${asset.location}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-border/50 text-muted-foreground"
                      >
                        {CATEGORY_LABELS[asset.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {asset.quantity}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatGnf(asset.acquisition_value * asset.quantity)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.assigned_to || "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={asset.status}
                        onValueChange={(v) =>
                          updateStatus(asset.id, v as AssetStatus)
                        }
                        disabled={busyId !== null}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-8 w-44 border bg-transparent",
                            STATUS_BADGE[asset.status],
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border/50">
                          {Object.values(AssetStatus).map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddAssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creating={creating}
        onCreate={createAsset}
      />
    </div>
  );
}
