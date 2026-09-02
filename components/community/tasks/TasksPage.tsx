"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useTasks } from "@/hooks/community/useTasks";
import { AssignTaskDialog } from "./AssignTaskDialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CommunityTask,
  TaskStatus,
} from "@/types/modules/community";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABEL: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "À faire",
  [TaskStatus.IN_PROGRESS]: "En cours",
  [TaskStatus.DONE]: "Terminée",
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "border-border/50 text-muted-foreground",
  [TaskStatus.IN_PROGRESS]: "border-primary/50 text-primary",
  [TaskStatus.DONE]: "border-emerald-500/50 text-emerald-500",
};

interface Props {
  organizationId: string;
}

export function TasksPage({ organizationId }: Props) {
  const { tasks, members, loading, creating, busyTaskId, error, createTask, updateTask } =
    useTasks(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 bg-muted/30" />
        <Skeleton className="h-40 w-full bg-muted/30" />
        <Skeleton className="h-40 w-full bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            Tâches &amp; responsabilités
          </h2>
          <p className="text-sm text-muted-foreground">
            Attribution des tâches et suivi de leur avancement.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Attribuer une tâche
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune tâche enregistrée.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              busy={busyTaskId === task.id}
              onProgress={(progress) => updateTask(task.id, { progress })}
              onReassign={(assigneeId) =>
                updateTask(task.id, {
                  assignee_id: assigneeId === "none" ? null : assigneeId,
                })
              }
            />
          ))}
        </div>
      )}

      <AssignTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={members}
        creating={creating}
        onCreate={createTask}
      />
    </div>
  );
}

function TaskCard({
  task,
  members,
  busy,
  onProgress,
  onReassign,
}: {
  task: CommunityTask;
  members: { id: string; name?: string }[];
  busy: boolean;
  onProgress: (progress: number) => void;
  onReassign: (assigneeId: string) => void;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base font-medium text-foreground">
            {task.title}
          </CardTitle>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {task.description}
            </p>
          )}
        </div>
        <Badge variant="outline" className={STATUS_BADGE[task.status]}>
          {STATUS_LABEL[task.status]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Responsable :</span>
            <Select
              value={task.assignee_id ?? "none"}
              onValueChange={onReassign}
              disabled={busy}
            >
              <SelectTrigger className="h-8 w-48 bg-input/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                <SelectItem value="none">Non assigné</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-muted-foreground">
            Échéance :{" "}
            <span className="text-foreground">
              {task.due_date
                ? format(task.due_date, "dd/MM/yyyy", { locale: fr })
                : "-"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={task.progress}
            onChange={(e) => onProgress(Number(e.target.value))}
            disabled={busy}
            className="flex-1 accent-primary"
            aria-label={`Avancement de ${task.title}`}
          />
          <span
            className={cn(
              "w-12 text-right text-sm font-medium",
              task.status === TaskStatus.DONE
                ? "text-emerald-500"
                : "text-foreground",
            )}
          >
            {task.progress}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
