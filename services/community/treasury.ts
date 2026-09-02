// services/community/treasury.ts
import { base44Client } from "@/lib/base44";
import {
  CreateTransactionPayload,
  TreasuryTransaction,
} from "@/types/modules/community";

export const treasuryService = {
  async getTransactions(
    organizationId: string,
  ): Promise<TreasuryTransaction[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/treasury`,
    );
    return response.data;
  },

  async createTransaction(
    organizationId: string,
    payload: CreateTransactionPayload,
  ): Promise<TreasuryTransaction> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/treasury`,
      payload,
    );
    return response.data;
  },
};
