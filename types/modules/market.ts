// Types du module AssoShop Market (Marketplace B2B, services, investissement).

export enum ProductStatus {
  PUBLISHED = "published",
  PENDING_REVIEW = "pending_review",
  DRAFT = "draft",
  REJECTED = "rejected",
  ARCHIVED = "archived",
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  subcategories: ProductCategory[];
}

export interface Reseller {
  id: string;
  company_name: string;
  country: string;
  city: string;
  sector: string;
  rating: number;
  logo_url: string | null;
  validated_at: Date | null;
}

export interface Product {
  id: string;
  reseller_id: string;
  category_id: string;
  subcategory_id: string | null;
  name: string;
  description: string;
  photos: string[];
  wholesale_price: number;
  retail_price: number;
  min_order_quantity: number;
  stock: number;
  country: string;
  city: string;
  currency: string;
  status: ProductStatus;
  created_at: Date;
  updated_at: Date;
}

export interface MarketCatalog {
  categories: ProductCategory[];
  products: Product[];
  resellers: Reseller[];
}

// ---- Commandes et livraison (MKT-05 → MKT-13) ----

export enum OrderStatus {
  PENDING_PAYMENT = "pending_payment",
  CONFIRMED = "confirmed",
  SHIPPED = "shipped",
  ARRIVED = "arrived",
  READY_FOR_PICKUP = "ready_for_pickup",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum DeliveryMethod {
  PICKUP = "pickup",
  SCHEDULED = "scheduled",
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  currency: string;
  delivery_method: DeliveryMethod;
  delivery_date: string | null;
  delivery_city: string;
  reseller_id: string;
  reseller_name: string;
  status: OrderStatus;
  paid: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderPayload {
  items: { product_id: string; quantity: number }[];
  delivery_method: DeliveryMethod;
  delivery_date?: string | null;
  delivery_city: string;
}

export enum GroupOrderStatus {
  OPEN = "open",
  CONFIRMED = "confirmed",
  CLOSED = "closed",
}

export interface GroupOrder {
  id: string;
  product_id: string;
  product_name: string;
  reseller_name: string;
  min_participants: number;
  participants: number;
  deadline: string;
  unit_price: number;
  currency: string;
  status: GroupOrderStatus;
  joined: boolean;
}

export interface CreateGroupOrderPayload {
  product_id: string;
  min_participants: number;
  deadline: string;
  unit_price: number;
  currency: string;
}

export interface Wallet {
  balance: number;
  currency: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
  reseller_name: string;
}

// ---- Espace revendeur (MKT-14 → MKT-27) ----

export enum ResellerApplicationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ResellerApplication {
  id: string;
  company_name: string;
  contact_name: string;
  id_document: string;
  sector: string;
  country: string;
  city: string;
  status: ResellerApplicationStatus;
  submitted_at: Date;
  reviewed_at: Date | null;
  review_notes: string | null;
}

export interface CreateResellerApplicationPayload {
  company_name: string;
  contact_name: string;
  id_document: string;
  sector: string;
  country: string;
  city: string;
}

export interface ResellerProductPayload {
  category_id: string;
  subcategory_id: string | null;
  name: string;
  description: string;
  wholesale_price: number;
  retail_price: number;
  min_order_quantity: number;
  stock: number;
  country: string;
  city: string;
  currency: string;
}

export interface Review {
  id: string;
  reseller_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: Date;
}

export interface SalesStats {
  total_revenue: number;
  currency: string;
  orders_count: number;
  average_rating: number;
  monthly: { month: string; revenue: number }[];
}

export interface ResellerSettings {
  delivery_zones: string[];
  delivery_slots: string[];
  payment_details: string;
}

export interface PickupRecord {
  id: string;
  order_id: string;
  tracking_code: string;
  status: "scanned" | "delivered";
  scanned_at: Date;
  delivered_at: Date | null;
  recipient_name: string | null;
}

export interface ResellerBundle {
  application: ResellerApplication | null;
  products: Product[];
  orders: Order[];
  pickups: PickupRecord[];
  reviews: Review[];
  stats: SalesStats;
  settings: ResellerSettings;
}

// ---- Services communautaires (MKT-28 → MKT-31) ----

export interface ServiceReview {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  // RG-M04 : seule une personne ayant sollicité le service peut l'évaluer.
  solicited: boolean;
  created_at: Date;
}

export interface CommunityService {
  id: string;
  provider_name: string;
  provider_member: boolean;
  service_type: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  country: string;
  city: string;
  rating: number;
  reviews_count: number;
  reviews: ServiceReview[];
  created_at: Date;
}

export interface CreateCommunityServicePayload {
  provider_name: string;
  service_type: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  country: string;
  city: string;
}

export interface CreateServiceReviewPayload {
  author_name: string;
  rating: number;
  comment: string;
  solicited: boolean;
}

// ---- Investissement communautaire (MKT-32 → MKT-35) ----

export enum InvestmentProjectStatus {
  OPEN = "open",
  CLOSED = "closed",
  COMPLETED = "completed",
}

export interface InvestmentProject {
  id: string;
  name: string;
  description: string;
  sector: string;
  target_amount: number;
  raised_amount: number;
  currency: string;
  // RG-M05 : règles de répartition publiées avant la 1re contribution,
  // immuables ensuite.
  profit_sharing_rules: string;
  rules_locked: boolean;
  status: InvestmentProjectStatus;
  my_contribution: number;
  created_at: Date;
}

export interface CreateInvestmentProjectPayload {
  name: string;
  description: string;
  sector: string;
  target_amount: number;
  currency: string;
  profit_sharing_rules: string;
}

export interface InvestPayload {
  amount: number;
}
