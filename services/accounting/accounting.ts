import { base44Client } from "@/lib/base44";
import {
  AccountingBundle,
  AccountingEntry,
  BudgetLine,
  ConsolidationMovement,
  CreateAccountingEntryPayload,
  ReconciliationLine,
  ValidateAccountingEntryPayload,
} from "@/types/modules/accounting";

export const accountingService = {
  async getAccounting(organizationId: string): Promise<AccountingBundle> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/accounting`,
    );
    return response.data;
  },

  async createEntry(
    organizationId: string,
    payload: CreateAccountingEntryPayload,
  ): Promise<AccountingEntry> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/accounting/entries`,
      payload,
    );
    return response.data;
  },

  async validateEntry(
    organizationId: string,
    entryId: string,
    payload: ValidateAccountingEntryPayload,
  ): Promise<AccountingEntry> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/accounting/entries/${entryId}/validation`,
      payload,
    );
    return response.data;
  },

  async getConsolidation(
    organizationId: string,
  ): Promise<ConsolidationMovement[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/accounting/consolidation`,
    );
    return response.data;
  },

  async consolidate(
    organizationId: string,
    movementIds: string[],
  ): Promise<AccountingEntry[]> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/accounting/consolidation`,
      { movement_ids: movementIds },
    );
    return response.data;
  },

  async getReconciliation(
    organizationId: string,
  ): Promise<ReconciliationLine[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/accounting/reconciliation`,
    );
    return response.data;
  },

  async reconcileLine(
    organizationId: string,
    lineId: string,
    entryId: string,
  ): Promise<ReconciliationLine> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/accounting/reconciliation`,
      { line_id: lineId, entry_id: entryId },
    );
    return response.data;
  },

  async getBudget(organizationId: string): Promise<BudgetLine[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/accounting/budget`,
    );
    return response.data;
  },
};
