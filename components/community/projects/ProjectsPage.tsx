"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProjects } from "@/hooks/community/useProjects";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";
import { ContributeToProjectDialog } from "./ContributeToProjectDialog";
import {
  CommunityProject,
  ProjectStatus,
} from "@/types/modules/community";
import {
  COMMON_LABELS,
  PROJECT_LABELS,
  PROJECT_STATUS_OPTIONS,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  organizationId: string;
}

function progressPercent(project: CommunityProject): number {
  if (project.goal_amount <= 0) return 0;
  return Math.min(
    100,
    Math.round((project.raised_amount / project.goal_amount) * 100),
  );
}

export function ProjectsPage({ organizationId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<CommunityProject | null>(
    null,
  );
  const [contributeTarget, setContributeTarget] =
    useState<CommunityProject | null>(null);

  const { projects, loading, error, online, refetch } = useProjects(
    organizationId,
    search,
    statusFilter,
  );

  const summary = useMemo(() => {
    const inProgress = projects.filter(
      (p) => p.status === ProjectStatus.IN_PROGRESS,
    ).length;
    const completed = projects.filter(
      (p) => p.status === ProjectStatus.COMPLETED,
    ).length;
    const raised = projects.reduce((sum, p) => sum + p.raised_amount, 0);
    return { inProgress, completed, raised };
  }, [projects]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{PROJECT_LABELS.PAGE_TITLE}</h1>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {PROJECT_LABELS.CREATE_BUTTON}
        </Button>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{PROJECT_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {PROJECT_LABELS.SUMMARY_IN_PROGRESS}
            </p>
            <p className="text-2xl font-bold">{summary.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {PROJECT_LABELS.SUMMARY_COMPLETED}
            </p>
            <p className="text-2xl font-bold">{summary.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {PROJECT_LABELS.SUMMARY_RAISED}
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.raised)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={PROJECT_LABELS.SEARCH_PLACEHOLDER}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue
              placeholder={PROJECT_LABELS.STATUS_FILTER_PLACEHOLDER}
            />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {PROJECT_LABELS.LOAD_ERROR}
        </p>
      ) : !projects.length ? (
        <p className="text-sm text-muted-foreground">
          {PROJECT_LABELS.NO_DATA}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {PROJECT_LABELS.NAME_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {PROJECT_LABELS.GOAL_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {PROJECT_LABELS.RAISED_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {PROJECT_LABELS.PROGRESS_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {PROJECT_LABELS.STATUS_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {PROJECT_LABELS.ACTIONS_LABEL}
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    {p.relayed_from ? (
                      <p className="text-xs text-muted-foreground">
                        {PROJECT_LABELS.RELAYED_FROM_PREFIX} · {p.relayed_from}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCurrency(p.goal_amount)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCurrency(p.raised_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted/30">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${progressPercent(p)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {progressPercent(p)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailsTarget(p)}
                      >
                        {PROJECT_LABELS.DETAILS_BUTTON}
                      </Button>
                      {p.status === ProjectStatus.IN_PROGRESS ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setContributeTarget(p)}
                        >
                          {PROJECT_LABELS.CONTRIBUTE_BUTTON}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateProjectDialog
        key={createOpen ? "open" : "closed"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />
      <ProjectDetailsDialog
        key={detailsTarget?.id ?? "none"}
        open={!!detailsTarget}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
        project={detailsTarget}
      />
      <ContributeToProjectDialog
        key={contributeTarget?.id ?? "none"}
        open={!!contributeTarget}
        onOpenChange={(open) => {
          if (!open) setContributeTarget(null);
        }}
        organizationId={organizationId}
        project={contributeTarget}
        onSuccess={refetch}
      />
    </div>
  );
}
