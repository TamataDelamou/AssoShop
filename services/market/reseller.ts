import { base44Client } from "@/lib/base44";
import {
  CreateResellerApplicationPayload,
  Order,
  OrderStatus,
  Product,
  ResellerApplication,
  ResellerBundle,
  ResellerProductPayload,
  ResellerSettings,
} from "@/types/modules/market";
import { MARKET_MESSAGES } from "@/utils/constants";

export const resellerService = {
  async getBundle(): Promise<ResellerBundle> {
    const response = await base44Client.get("/market/reseller");
    return response.data;
  },

  async submitApplication(
    payload: CreateResellerApplicationPayload,
  ): Promise<ResellerApplication> {
    const response = await base44Client.post(
      "/market/reseller/application",
      payload,
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.APPLICATION_SUBMIT_ERROR);
    }
    return response.data;
  },

  // Démonstration uniquement (mocks). Sur le backend réel, la décision
  // appartient à un administrateur de la plateforme (RG-M01) : cette route
  // n'existe pas.
  async approveApplication(): Promise<ResellerApplication> {
    const response = await base44Client.post(
      "/market/reseller/application/approve",
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.APPLICATION_SUBMIT_ERROR);
    }
    return response.data;
  },

  async createProduct(payload: ResellerProductPayload): Promise<Product> {
    const response = await base44Client.post(
      "/market/reseller/products",
      payload,
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.PRODUCT_CREATE_ERROR);
    }
    return response.data;
  },

  async updateProduct(
    productId: string,
    payload: ResellerProductPayload,
  ): Promise<Product> {
    const response = await base44Client.post(
      `/market/reseller/products/${productId}`,
      payload,
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.PRODUCT_UPDATE_ERROR);
    }
    return response.data;
  },

  async scanParcel(orderId: string): Promise<Order> {
    const response = await base44Client.post(
      `/market/reseller/orders/${orderId}/scan`,
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.SCAN_ERROR);
    }
    return response.data;
  },

  // Expédiée puis arrivée : étapes déclarées par le revendeur.
  async advanceOrder(orderId: string, status: OrderStatus): Promise<Order> {
    const response = await base44Client.post(
      `/market/reseller/orders/${orderId}/advance`,
      { status },
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.ADVANCE_ERROR);
    }
    return response.data;
  },

  async deliverParcel(orderId: string, recipientName: string): Promise<Order> {
    const response = await base44Client.post(
      `/market/reseller/orders/${orderId}/deliver`,
      { recipient_name: recipientName },
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.DELIVER_ERROR);
    }
    return response.data;
  },

  async updateSettings(payload: ResellerSettings): Promise<ResellerSettings> {
    const response = await base44Client.post("/market/reseller/settings", payload);
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.SETTINGS_SAVE_ERROR);
    }
    return response.data;
  },
};
