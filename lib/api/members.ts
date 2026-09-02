import { Member, MemberRole, MemberStatus } from "@/types/modules/community";

export interface MemberRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  role: string;
  joined_at: string | null;
}

// Adapte une ligne SQL au contrat attendu par le front (identique aux mocks).
export function serializeMember(row: MemberRow): Member {
  const userId = row.user_id ?? row.id;
  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: userId,
    status: row.status as MemberStatus,
    role: row.role as MemberRole,
    joined_at: row.joined_at ? new Date(row.joined_at) : null,
    user: {
      id: userId,
      name: row.name,
      email: row.email ?? "",
      phone: row.phone ?? "",
    },
  };
}

export function deriveMemberName(email?: string | null): string {
  if (email) {
    const base = email.split("@")[0].split(/[._-]/)[0];
    return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  }
  return "Membre";
}
