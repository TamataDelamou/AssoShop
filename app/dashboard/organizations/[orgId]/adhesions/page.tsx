"use client";

import { useParams } from "next/navigation";
import { AdhesionRequestsPage } from "@/components/community/adhesions/AdhesionRequestsPage";

export default function OrganizationAdhesionsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <AdhesionRequestsPage organizationId={orgId} />;
}
