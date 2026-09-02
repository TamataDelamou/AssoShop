"use client";

import { useParams } from "next/navigation";
import { SanctionsPage } from "@/components/community/sanctions/SanctionsPage";

export default function OrganizationSanctionsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <SanctionsPage organizationId={orgId} />;
}
