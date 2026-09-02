"use client";

import { useParams } from "next/navigation";
import { GovernancePage } from "@/components/community/governance/GovernancePage";

export default function OrganizationGovernancePage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <GovernancePage organizationId={orgId} />;
}
