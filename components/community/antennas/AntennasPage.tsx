"use client";

import { useMemo, useState } from "react";
import { Building2, MapPin, Network, Plus, Users } from "lucide-react";
import { useAntennas } from "@/hooks/community/useAntennas";
import { CreateAntennaDialog } from "./CreateAntennaDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Antenna, StructureLevel } from "@/types/modules/community";
import { cn } from "@/lib/utils";

const LEVEL_LABELS: Record<StructureLevel, string> = {
  [StructureLevel.HEADQUARTER]: "Siège national",
  [StructureLevel.REGIONAL]: "Bureau régional",
  [StructureLevel.PREFECTORAL]: "Bureau préfectoral",
  [StructureLevel.COMMUNAL]: "Section communale",
  [StructureLevel.NEIGHBORHOOD]: "Cellule de quartier",
};

const LEVEL_BADGE: Record<StructureLevel, string> = {
  [StructureLevel.HEADQUARTER]: "border-primary/50 text-primary",
  [StructureLevel.REGIONAL]: "border-sky-500/50 text-sky-500",
  [StructureLevel.PREFECTORAL]: "border-violet-500/50 text-violet-500",
  [StructureLevel.COMMUNAL]: "border-emerald-500/50 text-emerald-500",
  [StructureLevel.NEIGHBORHOOD]: "border-amber-500/50 text-amber-500",
};

interface Node {
  antenna: Antenna;
  children: Node[];
}

function buildTree(antennas: Antenna[]): Node[] {
  const ids = new Set(antennas.map((a) => a.id));
  const byParent = new Map<string, Antenna[]>();
  const roots: Antenna[] = [];

  for (const antenna of antennas) {
    if (antenna.parent_id && ids.has(antenna.parent_id)) {
      const list = byParent.get(antenna.parent_id) ?? [];
      list.push(antenna);
      byParent.set(antenna.parent_id, list);
    } else {
      roots.push(antenna);
    }
  }

  const build = (parentId: string): Node[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((antenna) => ({
        antenna,
        children: build(antenna.id),
      }));

  return roots
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((antenna) => ({
      antenna,
      children: build(antenna.id),
    }));
}

interface Props {
  organizationId: string;
}

export function AntennasPage({ organizationId }: Props) {
  const { antennas, organization, loading, creating, error, createAntenna } =
    useAntennas(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const tree = useMemo(() => buildTree(antennas), [antennas]);
  const antennaMembers = antennas.reduce((sum, a) => sum + a.member_count, 0);
  const totalMembers = (organization?.memberCount ?? 0) + antennaMembers;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80 bg-muted/30" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full bg-muted/30" />
          ))}
        </div>
        <Skeleton className="h-64 w-full bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            Antennes et sections
          </h2>
          <p className="text-sm text-muted-foreground">
            Structures rattachées avec remontée des statistiques.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <Plus className="mr-2 h-4 w-4" />
          Créer une antenne
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Membres au siège
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {organization?.memberCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Network className="h-4 w-4" />
              Membres en antennes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {antennaMembers}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Total couvert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-500">
              {totalMembers}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Arborescence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            <TreeNode
              label={organization?.name ?? "Structure mère"}
              level={StructureLevel.HEADQUARTER}
              city={organization?.city}
              responsible={undefined}
              members={organization?.memberCount ?? 0}
              depth={0}
              isRoot
            />
            {tree.map((node) => (
              <TreeNodeRecursive key={node.antenna.id} node={node} depth={0} />
            ))}
            {tree.length === 0 && (
              <li className="text-sm text-muted-foreground py-2">
                Aucune antenne rattachée.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <CreateAntennaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        antennas={antennas}
        creating={creating}
        onCreate={createAntenna}
      />
    </div>
  );
}

function TreeNodeRecursive({ node, depth }: { node: Node; depth: number }) {
  return (
    <>
      <TreeNode
        label={node.antenna.name}
        level={node.antenna.level}
        city={node.antenna.city}
        responsible={node.antenna.responsible}
        members={node.antenna.member_count}
        depth={depth + 1}
      />
      {node.children.map((child) => (
        <TreeNodeRecursive key={child.antenna.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function TreeNode({
  label,
  level,
  city,
  responsible,
  members,
  depth,
  isRoot = false,
}: {
  label: string;
  level: StructureLevel;
  city?: string;
  responsible?: string;
  members: number;
  depth: number;
  isRoot?: boolean;
}) {
  return (
    <li
      className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover:bg-muted/10"
      style={{ marginLeft: `${depth * 24}px` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Badge
          variant="outline"
          className={cn("shrink-0", LEVEL_BADGE[level])}
        >
          {LEVEL_LABELS[level]}
        </Badge>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{label}</p>
          {(city || responsible) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              {city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {city}
                </span>
              )}
              {responsible && <span>· {responsible}</span>}
            </p>
          )}
        </div>
      </div>
      <span
        className={cn(
          "text-sm font-medium shrink-0",
          isRoot ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {members} membre{members > 1 ? "s" : ""}
      </span>
    </li>
  );
}
