"use client";

import { useState } from "react";
import { CatalogView } from "./CatalogView";
import { CartDrawer } from "./CartDrawer";
import { CheckoutDialog } from "./CheckoutDialog";
import { OrderConfirmationDialog } from "./OrderConfirmationDialog";
import { OrdersView } from "./OrdersView";
import { ResellerSpace } from "../reseller/ResellerSpace";
import { ServicesView } from "../services/ServicesView";
import { InvestmentsView } from "../investments/InvestmentsView";
import { useCart } from "@/hooks/market/useCart";
import { useCheckout } from "@/hooks/market/useCheckout";
import { useWallet } from "@/hooks/market/useWallet";
import { CreateOrderPayload, Order } from "@/types/modules/market";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { ShoppingCart, Wallet } from "lucide-react";

const TABS = [
  { id: "catalog", label: MARKET_LABELS.TAB_CATALOG },
  { id: "orders", label: MARKET_LABELS.TAB_ORDERS },
  { id: "reseller", label: MARKET_LABELS.TAB_RESELLER },
  { id: "services", label: MARKET_LABELS.TAB_SERVICES },
  { id: "investments", label: MARKET_LABELS.TAB_INVESTMENTS },
];

export function MarketPage() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const cart = useCart();
  const wallet = useWallet();
  const checkout = useCheckout();

  const handleCheckoutSubmit = async (payload: CreateOrderPayload) => {
    const order = await checkout.checkout(payload);
    if (order) {
      cart.clearCart();
      setCheckoutOpen(false);
      setCartOpen(false);
      setLastOrder(order);
      wallet.refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {MARKET_LABELS.PAGE_TITLE}
          </h2>
          <p className="text-sm text-muted-foreground">
            {MARKET_LABELS.PAGE_SUBTITLE}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {wallet.wallet && (
            <Badge
              variant="outline"
              className="hidden border-white/10 bg-white/5 sm:flex"
            >
              <Wallet className="mr-1 h-3 w-3" />
              {formatCurrency(wallet.wallet.balance, wallet.wallet.currency)}
            </Badge>
          )}
          <Button
            variant="outline"
            className="relative border-white/10"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            {MARKET_LABELS.CART_TITLE}
            {cart.count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {cart.count}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/10 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "catalog" && (
        <CatalogView
          onAddToCart={(product, resellerName, quantity = 1) =>
            cart.addToCart(product, resellerName, quantity)
          }
        />
      )}
      {activeTab === "orders" && <OrdersView />}
      {activeTab === "reseller" && <ResellerSpace />}
      {activeTab === "services" && <ServicesView />}
      {activeTab === "investments" && <InvestmentsView />}

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cart.items}
        total={cart.total}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeFromCart}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={cart.items}
        total={cart.total}
        wallet={wallet.wallet}
        online={wallet.online}
        submitting={checkout.submitting}
        onSubmit={handleCheckoutSubmit}
      />

      <OrderConfirmationDialog
        order={lastOrder}
        onOpenChange={(open) => {
          if (!open) setLastOrder(null);
        }}
      />
    </div>
  );
}
