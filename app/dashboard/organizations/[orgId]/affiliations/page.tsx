"use client";

import { useParams } from "next/navigation";
import { AffiliationsPage } from "@/components/community/affiliations/AffiliationsPage";

export default function OrganizationAffiliationsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <AffiliationsPage organizationId={orgId} />;
}
