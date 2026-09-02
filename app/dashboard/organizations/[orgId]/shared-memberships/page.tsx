"use client";

import { useParams } from "next/navigation";
import { SharedMembershipPage } from "@/components/community/shared-memberships/SharedMembershipPage";

export default function OrganizationSharedMembershipPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <SharedMembershipPage organizationId={orgId} />;
}
