"use client";

import { useParams } from "next/navigation";
import { LoansPage } from "@/components/finance/LoansPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationLoansPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <LoansPage organizationId={orgId} />;
}
