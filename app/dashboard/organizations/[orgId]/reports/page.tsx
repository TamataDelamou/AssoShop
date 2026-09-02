"use client";

import { useParams } from "next/navigation";
import { ReportsPage } from "@/components/community/reports/ReportsPage";

export default function OrganizationReportsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <ReportsPage organizationId={orgId} />;
}
