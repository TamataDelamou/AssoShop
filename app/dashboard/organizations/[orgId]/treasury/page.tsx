"use client";

import { useParams } from "next/navigation";
import { TreasuryPage } from "@/components/community/treasury/TreasuryPage";

export default function OrganizationTreasuryPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <TreasuryPage organizationId={orgId} />;
}
