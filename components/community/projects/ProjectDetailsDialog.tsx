"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { CommunityProject } from "@/types/modules/community";
import {
  COMMON_LABELS,
  PROJECT_LABELS,
} from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: CommunityProject | null;
}

export function ProjectDetailsDialog({ open, onOpenChange, project }: Props) {
  const percent =
    project && project.goal_amount > 0
      ? Math.min(
          100,
          Math.round((project.raised_amount / project.goal_amount) * 100),
        )
      : 0;

  return (
    <Dialog open={open && !!project} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{PROJECT_LABELS.PAGE_TITLE}</DialogTitle>
        </DialogHeader>
        {project ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground">{project.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(project.created_at)}
                </p>
              </div>
              <ProjectStatusBadge status={project.status} />
            </div>

            <p className="whitespace-pre-wrap text-sm text-foreground">
              {project.description}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatCurrency(project.raised_amount)}{" "}
                  {PROJECT_LABELS.RAISED_LABEL}
                </span>
                <span className="text-muted-foreground">
                  {PROJECT_LABELS.GOAL_LABEL}{" "}
                  {formatCurrency(project.goal_amount)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{percent}%</p>
            </div>

            {project.relayed_from ? (
              <Badge
                variant="outline"
                className="border-border/50 text-muted-foreground font-normal"
              >
                {PROJECT_LABELS.RELAYED_FROM_PREFIX} · {project.relayed_from}
              </Badge>
            ) : null}
            {project.relayed_to_affiliates ? (
              <Badge className="bg-purple-500/20 text-purple-500 border-none font-normal">
                {PROJECT_LABELS.RELAYED_TO_AFFILIATES}
              </Badge>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {PROJECT_LABELS.CONTRIBUTIONS_LABEL}
              </p>
              {!project.contributions?.length ? (
                <p className="text-sm text-muted-foreground">
                  {PROJECT_LABELS.NO_CONTRIBUTIONS}
                </p>
              ) : (
                <ul className="space-y-2">
                  {project.contributions.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-foreground">
                        {c.contributor_name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(c.amount)} ·{" "}
                        {formatDate(c.contributed_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {COMMON_LABELS.CLOSE}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
