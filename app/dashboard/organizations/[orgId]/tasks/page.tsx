"use client";

import { useParams } from "next/navigation";
import { TasksPage } from "@/components/community/tasks/TasksPage";

export default function OrganizationTasksPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <TasksPage organizationId={orgId} />;
}
