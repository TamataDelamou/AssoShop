// services/community/mobility.ts
import { base44Client } from "@/lib/base44";
import {
  DecideTransferPayload,
  GenerateMobilityReportPayload,
  MobilityReport,
  TransferDecision,
} from "@/types/modules/community";

export interface MobilityBundle {
  reports: MobilityReport[];
  decisions: TransferDecision[];
}

export const mobilityService = {
  async getBundle(organizationId: string): Promise<MobilityBundle> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/mobility`,
    );
    return response.data;
  },

  async generateReport(
    organizationId: string,
    relocationId: string,
    payload: GenerateMobilityReportPayload,
  ): Promise<MobilityReport> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/relocations/${relocationId}/mobility-report`,
      payload,
    );
    return response.data;
  },

  async decide(
    organizationId: string,
    relocationId: string,
    payload: DecideTransferPayload,
  ): Promise<TransferDecision> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/relocations/${relocationId}/transfer-decision`,
      payload,
    );
    return response.data;
  },
};
