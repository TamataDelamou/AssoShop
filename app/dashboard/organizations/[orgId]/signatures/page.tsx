"use client";

import { useParams } from "next/navigation";
import { SignaturePage } from "@/components/community/signatures/SignaturePage";

export default function OrganizationSignaturePage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <SignaturePage organizationId={orgId} />;
}
