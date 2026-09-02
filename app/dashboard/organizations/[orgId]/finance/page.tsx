"use client";

import { useParams } from "next/navigation";
import { FinancialGroupsPage } from "@/components/finance/FinancialGroupsPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationFinancePage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <FinancialGroupsPage organizationId={orgId} />;
}
