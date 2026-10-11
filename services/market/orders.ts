import { base44Client } from "@/lib/base44";
import {
  CreateGroupOrderPayload,
  CreateOrderPayload,
  GroupOrder,
  Order,
  Wallet,
} from "@/types/modules/market";
import { MARKET_MESSAGES } from "@/utils/constants";

export const ordersService = {
  async getOrders(): Promise<Order[]> {
    const response = await base44Client.get("/market/orders");
    return response.data;
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const response = await base44Client.post("/market/orders", payload);
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.ORDER_CREATE_ERROR);
    }
    return response.data;
  },

  async payOrder(orderId: string): Promise<Order> {
    const response = await base44Client.post(`/market/orders/${orderId}/pay`);
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.PAYMENT_ERROR);
    }
    return response.data;
  },

  async cancelOrder(orderId: string): Promise<Order> {
    const response = await base44Client.post(`/market/orders/${orderId}/cancel`);
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.CANCEL_ERROR);
    }
    return response.data;
  },

  async getGroupOrders(): Promise<GroupOrder[]> {
    const response = await base44Client.get("/market/orders/group");
    return response.data;
  },

  async createGroupOrder(
    payload: CreateGroupOrderPayload,
  ): Promise<GroupOrder> {
    const response = await base44Client.post("/market/orders/group", payload);
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.ORDER_CREATE_ERROR);
    }
    return response.data;
  },

  async joinGroupOrder(groupOrderId: string): Promise<GroupOrder> {
    const response = await base44Client.post(
      `/market/orders/group/${groupOrderId}/join`,
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.ORDER_CREATE_ERROR);
    }
    return response.data;
  },

  async getWallet(): Promise<Wallet> {
    const response = await base44Client.get("/market/wallet");
    return response.data;
  },
};
