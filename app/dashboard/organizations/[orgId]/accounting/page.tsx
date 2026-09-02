"use client";

import { useParams } from "next/navigation";
import { AccountingPage } from "@/components/accounting/AccountingPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationAccountingPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <AccountingPage organizationId={orgId} />;
}
