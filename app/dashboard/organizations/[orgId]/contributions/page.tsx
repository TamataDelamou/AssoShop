"use client";

import { useParams } from "next/navigation";
import { ContributionsPage } from "@/components/community/contributions/ContributionsPage";

export default function OrganizationContributionsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <ContributionsPage organizationId={orgId} />;
}
