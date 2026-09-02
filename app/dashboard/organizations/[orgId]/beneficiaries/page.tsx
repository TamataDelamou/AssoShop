"use client";

import { useParams } from "next/navigation";
import { BeneficiariesPage } from "@/components/community/beneficiaries/BeneficiariesPage";

export default function OrganizationBeneficiariesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <BeneficiariesPage organizationId={orgId} />;
}
