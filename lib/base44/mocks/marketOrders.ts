import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateGroupOrderPayload,
  CreateOrderPayload,
  GroupOrder,
  GroupOrderStatus,
  OrderItem,
  OrderStatus,
  Wallet,
} from "@/types/modules/market";
import {
  marketOrders,
  marketProducts,
  marketResellers,
  type OrderDTO,
} from "./marketData";

const ORDERS_URL = /^\/market\/orders$/;
const PAY_URL = /^\/market\/orders\/([^/]+)\/pay$/;
const GROUP_ORDERS_URL = /^\/market\/orders\/group$/;
const JOIN_GROUP_URL = /^\/market\/orders\/group\/([^/]+)\/join$/;
const WALLET_URL = /^\/market\/wallet$/;

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

const groupOrders: GroupOrder[] = [
  {
    id: "grp-1",
    product_id: "prod-2",
    product_name: "Engrais NPK 15-15-15 (sac 50 kg)",
    reseller_name: "AgriPlus Guinée",
    min_participants: 10,
    participants: 7,
    deadline: isoDaysFromNow(15),
    unit_price: 300000,
    currency: "GNF",
    status: GroupOrderStatus.OPEN,
    joined: false,
  },
  {
    id: "grp-2",
    product_id: "prod-13",
    product_name: "Ciment 50 kg",
    reseller_name: "BTP Matériaux",
    min_participants: 50,
    participants: 50,
    deadline: isoDaysFromNow(20),
    unit_price: 90000,
    currency: "GNF",
    status: GroupOrderStatus.CONFIRMED,
    joined: true,
  },
  {
    id: "grp-3",
    product_id: "prod-10",
    product_name: "Riz parfumé (sac 25 kg)",
    reseller_name: "Saveurs du Terroir",
    min_participants: 20,
    participants: 12,
    deadline: isoDaysFromNow(-10),
    unit_price: 260000,
    currency: "XOF",
    status: GroupOrderStatus.CLOSED,
    joined: false,
  },
];

const wallet: Wallet = {
  balance: 5000000,
  currency: "GNF",
};

// RG-M02 : une commande groupée n'est facturée qu'une fois le nombre minimal
// de participants atteint ou la date limite dépassée.
function refreshGroupStatus(group: GroupOrder): void {
  if (group.status !== GroupOrderStatus.OPEN) return;
  const deadlinePassed = new Date(group.deadline).getTime() < Date.now();
  if (group.participants >= group.min_participants || deadlinePassed) {
    group.status = GroupOrderStatus.CONFIRMED;
  }
}

function getGroupOrders(): GroupOrder[] {
  for (const group of groupOrders) {
    refreshGroupStatus(group);
  }
  return clone(groupOrders);
}

function createOrder(config: InternalAxiosRequestConfig): OrderDTO | null {
  const payload = (config.data ?? {}) as CreateOrderPayload;
  if (!payload.items?.length) return null;

  const items: OrderItem[] = payload.items
    .map((line) => {
      const product = marketProducts.find((p) => p.id === line.product_id);
      return {
        product_id: line.product_id,
        product_name: product?.name ?? "Produit",
        quantity: line.quantity,
        unit_price: product?.retail_price ?? 0,
        currency: product?.currency ?? "GNF",
      };
    })
    .filter((item) => item.unit_price > 0);

  if (items.length === 0) return null;

  const firstProduct = marketProducts.find(
    (p) => p.id === payload.items[0].product_id,
  );
  const reseller = firstProduct
    ? marketResellers.find((r) => r.id === firstProduct.reseller_id)
    : undefined;

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const now = new Date().toISOString();

  const record: OrderDTO = {
    id: `ord-${Date.now()}`,
    items,
    total,
    currency: items[0].currency,
    delivery_method: payload.delivery_method,
    delivery_date: payload.delivery_date ?? null,
    delivery_city: payload.delivery_city,
    reseller_id: firstProduct?.reseller_id ?? "res-1",
    reseller_name: reseller?.company_name ?? "Revendeur",
    status: OrderStatus.PENDING_PAYMENT,
    paid: false,
    created_at: now,
    updated_at: now,
  };

  marketOrders.unshift(record);
  return clone(record);
}

function payOrder(config: InternalAxiosRequestConfig): OrderDTO | null {
  const match = config.url?.match(PAY_URL);
  if (!match) return null;

  const order = marketOrders.find((o) => o.id === match[1]);
  if (!order || order.paid) return null;
  if (wallet.balance < order.total) return null;

  wallet.balance -= order.total;
  order.paid = true;
  order.status = OrderStatus.CONFIRMED;
  order.updated_at = new Date().toISOString();
  return clone(order);
}

function createGroupOrder(
  config: InternalAxiosRequestConfig,
): GroupOrder | null {
  const payload = (config.data ?? {}) as CreateGroupOrderPayload;
  const product = marketProducts.find((p) => p.id === payload.product_id);
  if (!product) return null;

  const reseller = marketResellers.find((r) => r.id === product.reseller_id);
  const record: GroupOrder = {
    id: `grp-${Date.now()}`,
    product_id: product.id,
    product_name: product.name,
    reseller_name: reseller?.company_name ?? "-",
    min_participants: payload.min_participants,
    participants: 1,
    deadline: payload.deadline,
    unit_price: payload.unit_price,
    currency: payload.currency,
    status: GroupOrderStatus.OPEN,
    joined: true,
  };

  groupOrders.unshift(record);
  return clone(record);
}

function joinGroupOrder(config: InternalAxiosRequestConfig): GroupOrder | null {
  const match = config.url?.match(JOIN_GROUP_URL);
  if (!match) return null;

  const group = groupOrders.find((g) => g.id === match[1]);
  if (!group) return null;
  if (group.status !== GroupOrderStatus.OPEN) return clone(group);

  group.participants += 1;
  group.joined = true;
  refreshGroupStatus(group);
  return clone(group);
}

export function marketOrdersMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && ORDERS_URL.test(url)) {
    return async () => toResponse(clone(marketOrders));
  }
  if (method === "post" && ORDERS_URL.test(url)) {
    return async (cfg) => toResponse(createOrder(cfg));
  }
  if (method === "post" && PAY_URL.test(url)) {
    return async (cfg) => toResponse(payOrder(cfg));
  }
  if (method === "get" && GROUP_ORDERS_URL.test(url)) {
    return async () => toResponse(getGroupOrders());
  }
  if (method === "post" && GROUP_ORDERS_URL.test(url)) {
    return async (cfg) => toResponse(createGroupOrder(cfg));
  }
  if (method === "post" && JOIN_GROUP_URL.test(url)) {
    return async (cfg) => toResponse(joinGroupOrder(cfg));
  }
  if (method === "get" && WALLET_URL.test(url)) {
    return async () => toResponse(clone(wallet));
  }

  return null;
}
