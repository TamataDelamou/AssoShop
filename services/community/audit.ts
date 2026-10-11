// services/community/audit.ts
import { base44Client } from "@/lib/base44";
import { AuditEventsFilters, AuditEventsPage } from "@/types/modules/audit";

// Journal d'audit : lecture seule (aucune mutation).
export const auditService = {
  async getAuditEvents(
    organizationId: string,
    filters: AuditEventsFilters = {},
  ): Promise<AuditEventsPage> {
    const params: Record<string, string | number> = {};
    if (filters.event_type) params.event_type = filters.event_type;
    if (filters.since) params.since = filters.since;
    if (filters.before) params.before = filters.before;
    if (filters.limit) params.limit = filters.limit;

    const response = await base44Client.get(
      `/organizations/${organizationId}/audit-events`,
      { params },
    );
    return response.data;
  },
};
