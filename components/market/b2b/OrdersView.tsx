"use client";

import { useState } from "react";
import {
  CreateGroupOrderPayload,
  GroupOrder,
  GroupOrderStatus,
  Order,
  OrderStatus,
} from "@/types/modules/market";
import { useCatalog } from "@/hooks/market/useCatalog";
import { useGroupOrders } from "@/hooks/market/useGroupOrders";
import { useOrders } from "@/hooks/market/useOrders";
import { ordersService } from "@/services/market/orders";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/formatters";
import {
  GROUP_ORDER_STATUS_LABELS,
  MARKET_LABELS,
  ORDER_STATUS_LABELS,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Package, Users } from "lucide-react";

const STATUS_STEPS: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
  OrderStatus.ARRIVED,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DELIVERED,
];

function statusIndex(status: OrderStatus): number {
  return STATUS_STEPS.indexOf(status);
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variant =
    status === OrderStatus.DELIVERED
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : status === OrderStatus.CANCELLED
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : status === OrderStatus.PENDING_PAYMENT
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-primary/40 bg-primary/10 text-primary";
  return (
    <Badge variant="outline" className={variant}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

function OrderTimeline({ current }: { current: number }) {
  return (
    <div>
      <div className="relative">
        <div className="absolute left-0 right-0 top-1 h-0.5 rounded bg-white/10" />
        <div
          className="absolute left-0 top-1 h-0.5 rounded bg-primary transition-all"
          style={{ width: `${(current / (STATUS_STEPS.length - 1)) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {STATUS_STEPS.map((step, i) => (
            <div
              key={step}
              className={cn(
                "h-2.5 w-2.5 rounded-full border border-background",
                i <= current ? "bg-primary" : "bg-white/20",
              )}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between">
        {STATUS_STEPS.map((step, i) => (
          <span
            key={step}
            className={cn(
              "w-1/5 text-center text-[10px] leading-tight",
              i <= current ? "text-primary" : "text-muted-foreground",
            )}
          >
            {ORDER_STATUS_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const idx = statusIndex(order.status);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">
          {MARKET_LABELS.ORDER_NUMBER} {order.id}
        </CardTitle>
        <OrderStatusBadge status={order.status} />
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          {order.items.map((item) => (
            <li
              key={item.product_id}
              className="flex items-center justify-between"
            >
              <span className="text-muted-foreground">
                {item.quantity} × {item.product_name}
              </span>
              <span>
                {formatCurrency(item.unit_price * item.quantity, item.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {order.delivery_city}
            {order.delivery_date ? ` · ${order.delivery_date}` : ""}
          </span>
          <span className="font-bold">
            {formatCurrency(order.total, order.currency)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(order.created_at)}
        </p>
        {idx >= 0 && <OrderTimeline current={idx} />}
      </CardContent>
    </Card>
  );
}

function GroupOrderStatusBadge({ status }: { status: GroupOrderStatus }) {
  const variant =
    status === GroupOrderStatus.OPEN
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : status === GroupOrderStatus.CONFIRMED
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-white/10 bg-white/5 text-muted-foreground";
  return (
    <Badge variant="outline" className={variant}>
      {GROUP_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function OrdersView() {
  const { orders, loading, error } = useOrders();
  const {
    groupOrders,
    loading: groupLoading,
    refetch: refetchGroups,
  } = useGroupOrders();
  const { catalog } = useCatalog();

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Formulaire de création d'une commande groupée.
  const [productId, setProductId] = useState("");
  const [minParticipants, setMinParticipants] = useState(10);
  const [deadline, setDeadline] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);

  const selectedProduct = catalog?.products.find((p) => p.id === productId);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const product = catalog?.products.find((p) => p.id === id);
    if (product) {
      setUnitPrice(product.retail_price);
    }
  };

  const joinGroup = async (group: GroupOrder) => {
    setSubmitting(true);
    setActionError(null);
    try {
      await ordersService.joinGroupOrder(group.id);
      await refetchGroups();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const createGroup = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const payload: CreateGroupOrderPayload = {
        product_id: productId,
        min_participants: minParticipants,
        deadline,
        unit_price: unitPrice,
        currency: selectedProduct?.currency ?? "GNF",
      };
      await ordersService.createGroupOrder(payload);
      await refetchGroups();
      setCreateOpen(false);
      setProductId("");
      setDeadline("");
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectStyles =
    "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <div className="space-y-8">
      {/* Mes commandes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-light">{MARKET_LABELS.MY_ORDERS}</h3>
        </div>

        {loading && !orders ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : error && !orders ? (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : (orders?.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
            {MARKET_LABELS.CART_EMPTY}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders?.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      {/* Commandes groupées */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-light">{MARKET_LABELS.GROUP_ORDERS}</h3>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {MARKET_LABELS.CREATE_GROUP_ORDER}
          </Button>
        </div>

        {groupLoading && !groupOrders ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {groupOrders?.map((group) => (
              <Card key={group.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm leading-snug">
                    {group.product_name}
                  </CardTitle>
                  <GroupOrderStatusBadge status={group.status} />
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {group.reseller_name}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {group.participants}/{group.min_participants}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(new Date(group.deadline))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-xs text-muted-foreground">
                      {MARKET_LABELS.GROUP_PRICE}
                    </span>
                    <span className="font-bold">
                      {formatCurrency(group.unit_price, group.currency)}
                    </span>
                  </div>
                  {group.status === GroupOrderStatus.OPEN && !group.joined && (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={submitting}
                      onClick={() => joinGroup(group)}
                    >
                      {MARKET_LABELS.JOIN}
                    </Button>
                  )}
                  {group.joined && (
                    <Badge
                      variant="outline"
                      className="border-primary/40 bg-primary/10 text-primary"
                    >
                      {MARKET_LABELS.JOINED}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {actionError && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}
      </section>

      {/* Création commande groupée */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{MARKET_LABELS.CREATE_GROUP_ORDER}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.RESELLER}
              </Label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className={selectStyles}
              >
                <option value="">—</option>
                {(catalog?.products ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  {MARKET_LABELS.MIN_PARTICIPANTS}
                </Label>
                <Input
                  type="number"
                  min={2}
                  value={minParticipants}
                  onChange={(e) =>
                    setMinParticipants(Math.max(2, Number(e.target.value)))
                  }
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  {MARKET_LABELS.DEADLINE}
                </Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.GROUP_PRICE}
              </Label>
              <Input
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
              />
            </div>
            {actionError && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              disabled={submitting || !productId || !deadline}
              onClick={createGroup}
            >
              {MARKET_LABELS.CREATE_GROUP_ORDER}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
