import { base44Client } from "@/lib/base44";
import {
  AddPaymentMethodPayload,
  PayBundle,
  PaymentMethod,
  PaymentSettings,
  ReconciliationEntry,
  TopupPayload,
  Transaction,
  TransferPayload,
  WithdrawPayload,
} from "@/types/modules/pay";
import { PAY_MESSAGES } from "@/utils/constants";

export const payService = {
  async getBundle(): Promise<PayBundle> {
    const response = await base44Client.get("/pay/bundle");
    return response.data;
  },

  async topup(payload: TopupPayload): Promise<Transaction> {
    const response = await base44Client.post("/pay/topup", payload);
    if (!response.data) {
      throw new Error(PAY_MESSAGES.TOPUP_ERROR);
    }
    return response.data;
  },

  async withdraw(payload: WithdrawPayload): Promise<Transaction> {
    const response = await base44Client.post("/pay/withdraw", payload);
    if (!response.data) {
      throw new Error(PAY_MESSAGES.WITHDRAW_ERROR);
    }
    return response.data;
  },

  async transfer(payload: TransferPayload): Promise<Transaction> {
    const response = await base44Client.post("/pay/transfer", payload);
    if (!response.data) {
      throw new Error(PAY_MESSAGES.TRANSFER_ERROR);
    }
    return response.data;
  },

  async addMethod(payload: AddPaymentMethodPayload): Promise<PaymentMethod> {
    const response = await base44Client.post("/pay/methods", payload);
    if (!response.data) {
      throw new Error(PAY_MESSAGES.METHOD_ADD_ERROR);
    }
    return response.data;
  },

  async matchEntry(entryId: string): Promise<ReconciliationEntry> {
    const response = await base44Client.post(
      `/pay/reconciliation/${entryId}/match`,
    );
    if (!response.data) {
      throw new Error(PAY_MESSAGES.MATCH_ERROR);
    }
    return response.data;
  },

  async updateSettings(payload: PaymentSettings): Promise<PaymentSettings> {
    const response = await base44Client.post("/pay/settings", payload);
    if (!response.data) {
      throw new Error(PAY_MESSAGES.SETTINGS_SAVE_ERROR);
    }
    return response.data;
  },
};
