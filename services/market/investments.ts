import { base44Client } from "@/lib/base44";
import {
  CreateInvestmentProjectPayload,
  DeclareProfitPayload,
  InvestmentProject,
  InvestPayload,
} from "@/types/modules/market";
import { MARKET_MESSAGES } from "@/utils/constants";

export const investmentsService = {
  async getProjects(): Promise<InvestmentProject[]> {
    const response = await base44Client.get("/market/investments");
    return response.data;
  },

  async createProject(
    payload: CreateInvestmentProjectPayload,
  ): Promise<InvestmentProject> {
    const response = await base44Client.post("/market/investments", payload);
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.PROJECT_CREATE_ERROR);
    }
    return response.data;
  },

  async invest(
    projectId: string,
    payload: InvestPayload,
  ): Promise<InvestmentProject> {
    const response = await base44Client.post(
      `/market/investments/${projectId}/invest`,
      payload,
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.INVEST_ERROR);
    }
    return response.data;
  },

  // Porteur d'un projet financé : la répartition n'a lieu qu'après
  // validation par un administrateur de la plateforme.
  async declareProfit(
    projectId: string,
    payload: DeclareProfitPayload,
  ): Promise<{ id: string }> {
    const response = await base44Client.post(
      `/market/investments/${projectId}/profit`,
      payload,
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.DECLARE_PROFIT_ERROR);
    }
    return response.data;
  },
};
