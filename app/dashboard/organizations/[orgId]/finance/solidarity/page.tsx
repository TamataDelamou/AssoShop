"use client";

import { useParams } from "next/navigation";
import { SolidarityPage } from "@/components/finance/SolidarityPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationSolidarityPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <SolidarityPage organizationId={orgId} />;
}
