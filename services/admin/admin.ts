import { base44Client } from "@/lib/base44";
import {
  AdminBundle,
  CatalogCategory,
  CommissionRule,
  CountryConfig,
  Dispute,
  DisputeStatus,
  KycApplication,
  MobileOperator,
  ModerationItem,
  ApiIntegration,
  PlatformConfig,
  PlatformUser,
  ResellerApplication,
  ReviewStatus,
  SubscriptionPlan,
} from "@/types/modules/admin";

export const adminService = {
  async getBundle(): Promise<AdminBundle> {
    const response = await base44Client.get("/admin/bundle");
    return response.data;
  },

  async reviewReseller(
    id: string,
    status: ReviewStatus,
  ): Promise<ResellerApplication[]> {
    const response = await base44Client.post(`/admin/resellers/${id}/review`, {
      status,
    });
    return response.data;
  },

  async reviewModeration(
    id: string,
    status: ReviewStatus,
  ): Promise<ModerationItem[]> {
    const response = await base44Client.post(
      `/admin/moderation/${id}/review`,
      { status },
    );
    return response.data;
  },

  async suspendUser(id: string): Promise<PlatformUser[]> {
    const response = await base44Client.post(`/admin/users/${id}/suspend`);
    return response.data;
  },

  async reviewKyc(id: string, status: ReviewStatus): Promise<KycApplication[]> {
    const response = await base44Client.post(`/admin/kyc/${id}/review`, {
      status,
    });
    return response.data;
  },

  async setDisputeStatus(id: string, status: DisputeStatus): Promise<Dispute[]> {
    const response = await base44Client.post(`/admin/disputes/${id}/status`, {
      status,
    });
    return response.data;
  },

  async upsertCommission(payload: {
    service: string;
    rate: number;
  }): Promise<CommissionRule[]> {
    const response = await base44Client.post("/admin/commissions", payload);
    return response.data;
  },

  async updatePlan(id: string, monthly_price: number): Promise<SubscriptionPlan[]> {
    const response = await base44Client.post(`/admin/plans/${id}`, {
      monthly_price,
    });
    return response.data;
  },

  async updateConfig(payload: Partial<PlatformConfig>): Promise<PlatformConfig> {
    const response = await base44Client.post("/admin/config", payload);
    return response.data;
  },

  async toggleCountry(id: string): Promise<CountryConfig[]> {
    const response = await base44Client.post(`/admin/countries/${id}/toggle`);
    return response.data;
  },

  async toggleOperator(id: string): Promise<MobileOperator[]> {
    const response = await base44Client.post(`/admin/operators/${id}/toggle`);
    return response.data;
  },

  async toggleIntegration(id: string): Promise<ApiIntegration[]> {
    const response = await base44Client.post(
      `/admin/integrations/${id}/toggle`,
    );
    return response.data;
  },

  async addCategory(name: string, parent: string | null): Promise<CatalogCategory[]> {
    const response = await base44Client.post("/admin/categories", {
      name,
      parent,
    });
    return response.data;
  },
};
