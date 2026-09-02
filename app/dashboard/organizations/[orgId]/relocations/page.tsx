"use client";

import { useParams } from "next/navigation";
import { RelocationPage } from "@/components/community/relocations/RelocationPage";

export default function OrganizationRelocationsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <RelocationPage organizationId={orgId} />;
}
