import { base44Client } from "@/lib/base44";
import {
  CreateFinancialGroupPayload,
  DeclarePaymentPayload,
  FinancialGroup,
  GroupSettings,
  GroupStatistics,
  GroupTransaction,
  UpdateGroupSettingsPayload,
} from "@/types/modules/finance";

interface GetFinancialGroupsParams {
  search?: string;
  type?: string;
}

export const financialGroupsService = {
  async getFinancialGroups(
    organizationId: string,
    params: GetFinancialGroupsParams = {},
  ): Promise<FinancialGroup[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/financial-groups`,
      { params },
    );
    return response.data;
  },

  async createFinancialGroup(
    organizationId: string,
    payload: CreateFinancialGroupPayload,
  ): Promise<FinancialGroup> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/financial-groups`,
      payload,
    );
    return response.data;
  },

  async declarePayment(
    organizationId: string,
    groupId: string,
    payload: DeclarePaymentPayload,
  ): Promise<FinancialGroup> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/financial-groups/${groupId}/payments`,
      payload,
    );
    return response.data;
  },

  async validatePayment(
    organizationId: string,
    groupId: string,
    paymentId: string,
  ): Promise<FinancialGroup> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/financial-groups/${groupId}/payments/${paymentId}/validate`,
    );
    return response.data;
  },

  async getGroupTransactions(
    organizationId: string,
    groupId: string,
  ): Promise<GroupTransaction[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/financial-groups/${groupId}/transactions`,
    );
    return response.data;
  },

  async getGroupStatistics(
    organizationId: string,
    groupId: string,
  ): Promise<GroupStatistics> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/financial-groups/${groupId}/statistics`,
    );
    return response.data;
  },

  async getGroupSettings(
    organizationId: string,
    groupId: string,
  ): Promise<GroupSettings> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/financial-groups/${groupId}/settings`,
    );
    return response.data;
  },

  async updateGroupSettings(
    organizationId: string,
    groupId: string,
    payload: UpdateGroupSettingsPayload,
  ): Promise<GroupSettings> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/financial-groups/${groupId}/settings`,
      payload,
    );
    return response.data;
  },

  async closeGroup(
    organizationId: string,
    groupId: string,
  ): Promise<FinancialGroup> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/financial-groups/${groupId}/close`,
    );
    return response.data;
  },
};
