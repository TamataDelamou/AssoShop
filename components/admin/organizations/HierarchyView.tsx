"use client";

import { OrgHierarchyNode } from "@/types/modules/admin";
import { Badge } from "@/components/ui/badge";
import { Network } from "lucide-react";

function NodeRow({
  node,
  depth,
  nodes,
}: {
  node: OrgHierarchyNode;
  depth: number;
  nodes: OrgHierarchyNode[];
}) {
  const children = nodes.filter((n) => n.parent_id === node.id);
  return (
    <div>
      <div
        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">{node.name}</p>
            <p className="text-xs text-muted-foreground">
              {node.type} · {node.country}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-white/10 bg-white/5">
          {node.children_count} entités
        </Badge>
      </div>
      {children.map((child) => (
        <NodeRow key={child.id} node={child} depth={depth + 1} nodes={nodes} />
      ))}
    </div>
  );
}

export function HierarchyView({ nodes }: { nodes: OrgHierarchyNode[] }) {
  const roots = nodes.filter((n) => n.parent_id === null);
  return (
    <div className="space-y-2">
      {roots.map((root) => (
        <NodeRow key={root.id} node={root} depth={0} nodes={nodes} />
      ))}
    </div>
  );
}
