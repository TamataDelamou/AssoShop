"use client";

import { useParams } from "next/navigation";
import { ProjectsPage } from "@/components/community/projects/ProjectsPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationProjectsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <ProjectsPage organizationId={orgId} />;
}
