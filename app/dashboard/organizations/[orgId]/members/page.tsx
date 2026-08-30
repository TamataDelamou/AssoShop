"use client";

import { useParams } from "next/navigation";
import { MembersPage } from "@/components/community/members/MembersPage";

export default function OrganizationMembersPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  // Pour l'instant, on n'a pas le nom de l'organisation, on peut le passer en prop ou le récupérer depuis un contexte
  // On peut aussi utiliser un hook useOrganization pour le charger
  return <MembersPage organizationId={orgId} />;
}
