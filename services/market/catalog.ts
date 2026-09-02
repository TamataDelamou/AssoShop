import { base44Client } from "@/lib/base44";
import { MarketCatalog } from "@/types/modules/market";

export const catalogService = {
  async getCatalog(): Promise<MarketCatalog> {
    const response = await base44Client.get<MarketCatalog>("/market/catalog");
    return response.data;
  },
};
