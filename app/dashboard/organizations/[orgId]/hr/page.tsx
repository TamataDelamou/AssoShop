"use client";

import { useParams } from "next/navigation";
import { HumanResourcesPage } from "@/components/community/hr/HumanResourcesPage";

export default function OrganizationHumanResourcesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <HumanResourcesPage organizationId={orgId} />;
}
