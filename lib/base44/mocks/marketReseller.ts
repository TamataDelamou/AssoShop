import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateResellerApplicationPayload,
  OrderStatus,
  PickupRecord,
  ProductStatus,
  ResellerApplication,
  ResellerApplicationStatus,
  ResellerProductPayload,
  ResellerSettings,
  Review,
  SalesStats,
} from "@/types/modules/market";
import {
  marketOrders,
  marketProducts,
  marketResellers,
  type OrderDTO,
  type ProductDTO,
} from "./marketData";

type ApplicationDTO = Omit<
  ResellerApplication,
  "submitted_at" | "reviewed_at"
> & {
  submitted_at: string;
  reviewed_at: string | null;
};

type PickupDTO = Omit<PickupRecord, "scanned_at" | "delivered_at"> & {
  scanned_at: string;
  delivered_at: string | null;
};

type ReviewDTO = Omit<Review, "created_at"> & {
  created_at: string;
};

const RESELLER_ID = "res-1";

const RESELLER_URL = /^\/market\/reseller$/;
const APPLICATION_URL = /^\/market\/reseller\/application$/;
const APPROVE_URL = /^\/market\/reseller\/application\/approve$/;
const PRODUCTS_URL = /^\/market\/reseller\/products$/;
const PRODUCT_ITEM_URL = /^\/market\/reseller\/products\/([^/]+)$/;
const SCAN_URL = /^\/market\/reseller\/orders\/([^/]+)\/scan$/;
const DELIVER_URL = /^\/market\/reseller\/orders\/([^/]+)\/deliver$/;
const SETTINGS_URL = /^\/market\/reseller\/settings$/;

let application: ApplicationDTO | null = null;

const pickups: PickupDTO[] = [
  {
    id: "pkp-1",
    order_id: "ord-2",
    tracking_code: "QR-ORD-2-AGRI",
    status: "scanned",
    scanned_at: "2026-08-30T09:00:00.000Z",
    delivered_at: null,
    recipient_name: null,
  },
  {
    id: "pkp-2",
    order_id: "ord-0",
    tracking_code: "QR-ORD-0-AGRI",
    status: "delivered",
    scanned_at: "2026-08-20T10:00:00.000Z",
    delivered_at: "2026-08-22T15:00:00.000Z",
    recipient_name: "Mamadou Sow",
  },
];

const reviews: ReviewDTO[] = [
  {
    id: "rev-1",
    reseller_id: RESELLER_ID,
    author_name: "Aminata Bah",
    rating: 5,
    comment: "Produits de qualité, livraison rapide.",
    created_at: "2026-07-12T00:00:00.000Z",
  },
  {
    id: "rev-2",
    reseller_id: RESELLER_ID,
    author_name: "Ibrahima Camara",
    rating: 4,
    comment: "Bon rapport qualité-prix.",
    created_at: "2026-08-02T00:00:00.000Z",
  },
  {
    id: "rev-3",
    reseller_id: RESELLER_ID,
    author_name: "Fatou Diallo",
    rating: 5,
    comment: "Revendeur sérieux, je recommande.",
    created_at: "2026-08-18T00:00:00.000Z",
  },
];

const settings: ResellerSettings = {
  delivery_zones: ["Conakry", "Kindia", "Coyah"],
  delivery_slots: ["08h-12h", "14h-18h"],
  payment_details: "Orange Money +224 620 00 00 00",
};

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

function getProducts(): ProductDTO[] {
  return clone(
    marketProducts.filter((p) => p.reseller_id === RESELLER_ID),
  );
}

function getOrders(): OrderDTO[] {
  return clone(
    marketOrders.filter((o) => o.reseller_id === RESELLER_ID),
  );
}

function computeStats(): SalesStats {
  const resellerOrders = marketOrders.filter(
    (o) => o.reseller_id === RESELLER_ID && o.paid,
  );
  const revenue = resellerOrders.reduce((sum, o) => sum + o.total, 0);
  const reseller = marketResellers.find((r) => r.id === RESELLER_ID);
  return {
    total_revenue: revenue,
    currency: "GNF",
    orders_count: resellerOrders.length,
    average_rating: reseller?.rating ?? 0,
    monthly: [
      { month: "2026-06", revenue: 1500000 },
      { month: "2026-07", revenue: 2200000 },
      { month: "2026-08", revenue: 2750000 },
    ],
  };
}

function getBundle() {
  return {
    application: application ? clone(application) : null,
    products: getProducts(),
    orders: getOrders(),
    pickups: clone(pickups),
    reviews: clone(reviews),
    stats: computeStats(),
    settings: clone(settings),
  };
}

function submitApplication(
  config: InternalAxiosRequestConfig,
): ApplicationDTO {
  const payload = (config.data ?? {}) as CreateResellerApplicationPayload;
  const now = new Date().toISOString();
  application = {
    id: `app-${Date.now()}`,
    company_name: payload.company_name,
    contact_name: payload.contact_name,
    id_document: payload.id_document,
    sector: payload.sector,
    country: payload.country,
    city: payload.city,
    status: ResellerApplicationStatus.PENDING,
    submitted_at: now,
    reviewed_at: null,
    review_notes: null,
  };
  return clone(application);
}

function approveApplication(): ApplicationDTO | null {
  if (!application) return null;
  application.status = ResellerApplicationStatus.APPROVED;
  application.reviewed_at = new Date().toISOString();
  return clone(application);
}

function createProduct(config: InternalAxiosRequestConfig): ProductDTO | null {
  const payload = (config.data ?? {}) as ResellerProductPayload;
  if (!payload.name) return null;
  const now = new Date().toISOString();
  const record: ProductDTO = {
    id: `prod-${Date.now()}`,
    reseller_id: RESELLER_ID,
    category_id: payload.category_id,
    subcategory_id: payload.subcategory_id,
    name: payload.name,
    description: payload.description,
    photos: [],
    wholesale_price: payload.wholesale_price,
    retail_price: payload.retail_price,
    min_order_quantity: payload.min_order_quantity,
    stock: payload.stock,
    country: payload.country,
    city: payload.city,
    currency: payload.currency,
    status: ProductStatus.PUBLISHED,
    created_at: now,
    updated_at: now,
  };
  marketProducts.unshift(record);
  return clone(record);
}

function updateProduct(config: InternalAxiosRequestConfig): ProductDTO | null {
  const match = config.url?.match(PRODUCT_ITEM_URL);
  if (!match) return null;
  const product = marketProducts.find((p) => p.id === match[1]);
  if (!product) return null;

  const payload = (config.data ?? {}) as ResellerProductPayload;
  product.category_id = payload.category_id;
  product.subcategory_id = payload.subcategory_id;
  product.name = payload.name;
  product.description = payload.description;
  product.wholesale_price = payload.wholesale_price;
  product.retail_price = payload.retail_price;
  product.min_order_quantity = payload.min_order_quantity;
  product.stock = payload.stock;
  product.country = payload.country;
  product.city = payload.city;
  product.currency = payload.currency;
  product.updated_at = new Date().toISOString();
  return clone(product);
}

// RG-M03 : un colis n'est marqué « prêt à être récupéré » qu'après scan du
// QR code à la réception par l'agent logistique.
function scanParcel(config: InternalAxiosRequestConfig): OrderDTO | null {
  const match = config.url?.match(SCAN_URL);
  if (!match) return null;
  const order = marketOrders.find((o) => o.id === match[1]);
  if (!order || order.status !== OrderStatus.ARRIVED) return null;

  order.status = OrderStatus.READY_FOR_PICKUP;
  order.updated_at = new Date().toISOString();

  const existing = pickups.find((p) => p.order_id === order.id);
  const scannedAt = new Date().toISOString();
  if (existing) {
    existing.status = "scanned";
    existing.scanned_at = scannedAt;
    existing.delivered_at = null;
    existing.recipient_name = null;
  } else {
    pickups.unshift({
      id: `pkp-${Date.now()}`,
      order_id: order.id,
      tracking_code: `QR-${order.id}-AGRI`,
      status: "scanned",
      scanned_at: scannedAt,
      delivered_at: null,
      recipient_name: null,
    });
  }
  return clone(order);
}

function deliverParcel(config: InternalAxiosRequestConfig): OrderDTO | null {
  const match = config.url?.match(DELIVER_URL);
  if (!match) return null;
  const order = marketOrders.find((o) => o.id === match[1]);
  if (!order || order.status !== OrderStatus.READY_FOR_PICKUP) return null;

  const payload = (config.data ?? {}) as { recipient_name?: string };
  order.status = OrderStatus.DELIVERED;
  order.updated_at = new Date().toISOString();

  const record = pickups.find((p) => p.order_id === order.id);
  if (record) {
    record.status = "delivered";
    record.delivered_at = new Date().toISOString();
    record.recipient_name = payload.recipient_name ?? "Client";
  }
  return clone(order);
}

function updateSettings(config: InternalAxiosRequestConfig): ResellerSettings {
  const payload = (config.data ?? {}) as ResellerSettings;
  settings.delivery_zones = payload.delivery_zones ?? settings.delivery_zones;
  settings.delivery_slots = payload.delivery_slots ?? settings.delivery_slots;
  settings.payment_details =
    payload.payment_details ?? settings.payment_details;
  return clone(settings);
}

export function marketResellerMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && RESELLER_URL.test(url)) {
    return async () => toResponse(getBundle());
  }
  if (method === "post" && APPLICATION_URL.test(url)) {
    return async (cfg) => toResponse(submitApplication(cfg));
  }
  if (method === "post" && APPROVE_URL.test(url)) {
    return async () => toResponse(approveApplication());
  }
  if (method === "post" && PRODUCTS_URL.test(url)) {
    return async (cfg) => toResponse(createProduct(cfg));
  }
  if (method === "post" && PRODUCT_ITEM_URL.test(url)) {
    return async (cfg) => toResponse(updateProduct(cfg));
  }
  if (method === "post" && SCAN_URL.test(url)) {
    return async (cfg) => toResponse(scanParcel(cfg));
  }
  if (method === "post" && DELIVER_URL.test(url)) {
    return async (cfg) => toResponse(deliverParcel(cfg));
  }
  if (method === "post" && SETTINGS_URL.test(url)) {
    return async (cfg) => toResponse(updateSettings(cfg));
  }

  return null;
}
