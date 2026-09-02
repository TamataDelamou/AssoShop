"use client";

import { useMemo, useState } from "react";
import { Product, Reseller } from "@/types/modules/market";
import { useCatalog } from "@/hooks/market/useCatalog";
import { ProductCard } from "./ProductCard";
import { ProductDetailDialog } from "./ProductDetailDialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MARKET_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { ChevronRight, Search, WifiOff, Database } from "lucide-react";

export function CatalogView({
  onAddToCart,
}: {
  onAddToCart: (
    product: Product,
    resellerName: string,
    quantity?: number,
  ) => void;
}) {
  const { catalog, loading, error, fromCache, online } = useCatalog();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const resellersById = useMemo(() => {
    const map = new Map<string, Reseller>();
    for (const r of catalog?.resellers ?? []) {
      map.set(r.id, r);
    }
    return map;
  }, [catalog]);

  const countries = useMemo(() => {
    const set = new Set((catalog?.products ?? []).map((p) => p.country));
    return Array.from(set).sort();
  }, [catalog]);

  const cities = useMemo(() => {
    const set = new Set(
      (catalog?.products ?? [])
        .filter((p) => !country || p.country === country)
        .map((p) => p.city),
    );
    return Array.from(set).sort();
  }, [catalog, country]);

  const filteredProducts = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.products.filter((p) => {
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (categoryId && p.category_id !== categoryId) return false;
      if (subcategoryId && p.subcategory_id !== subcategoryId) return false;
      if (country && p.country !== country) return false;
      if (city && p.city !== city) return false;
      return true;
    });
  }, [catalog, search, categoryId, subcategoryId, country, city]);

  const activeCategory = catalog?.categories.find(
    (c) => c.id === categoryId,
  );

  const selectCategory = (id: string | null) => {
    setCategoryId(id);
    setSubcategoryId(null);
  };

  const selectStyles =
    "h-8 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Filtres */}
      <aside className="space-y-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={MARKET_LABELS.SEARCH_PLACEHOLDER}
            className="pl-8"
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            {MARKET_LABELS.CATEGORIES_TITLE}
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => selectCategory(null)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition",
                !categoryId
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {MARKET_LABELS.ALL_CATEGORIES}
            </button>
            {(catalog?.categories ?? []).map((cat) => (
              <div key={cat.id}>
                <button
                  onClick={() => selectCategory(cat.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition",
                    categoryId === cat.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <span>{cat.name}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                {categoryId === cat.id && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                    {cat.subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSubcategoryId(sub.id)}
                        className={cn(
                          "block w-full rounded-lg px-2 py-1 text-left text-xs transition",
                          subcategoryId === sub.id
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                        )}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {MARKET_LABELS.COUNTRY_FILTER}
            </label>
            <select
              value={country ?? ""}
              onChange={(e) => {
                setCountry(e.target.value || null);
                setCity(null);
              }}
              className={selectStyles}
            >
              <option value="">{MARKET_LABELS.ALL_COUNTRIES}</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {MARKET_LABELS.CITY_FILTER}
            </label>
            <select
              value={city ?? ""}
              onChange={(e) => setCity(e.target.value || null)}
              className={selectStyles}
            >
              <option value="">{MARKET_LABELS.ALL_CITIES}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* Grille produits */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} {MARKET_LABELS.RESULTS_COUNT}
            {activeCategory ? ` — ${activeCategory.name}` : ""}
          </p>
          <div className="flex items-center gap-2">
            {!online && (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-400"
              >
                <WifiOff className="mr-1 h-3 w-3" />
                {MARKET_LABELS.OFFLINE_BADGE}
              </Badge>
            )}
            {fromCache && (
              <Badge
                variant="outline"
                className="border-white/10 bg-white/5"
              >
                <Database className="mr-1 h-3 w-3" />
                {MARKET_LABELS.CACHED_BADGE}
              </Badge>
            )}
          </div>
        </div>

        {loading && !catalog ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : error && !catalog ? (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-muted-foreground">
            {catalog ? MARKET_LABELS.NO_PRODUCTS : MARKET_LABELS.EMPTY_CATALOG}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                resellerName={
                  resellersById.get(product.reseller_id)?.company_name ?? "-"
                }
                onSelect={setSelectedProduct}
                onAddToCart={(p) =>
                  onAddToCart(
                    p,
                    resellersById.get(p.reseller_id)?.company_name ?? "-",
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <ProductDetailDialog
        product={selectedProduct}
        reseller={
          selectedProduct
            ? (resellersById.get(selectedProduct.reseller_id) ?? null)
            : null
        }
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
        onAddToCart={(p, qty) =>
          onAddToCart(p, resellersById.get(p.reseller_id)?.company_name ?? "-", qty)
        }
      />
    </div>
  );
}
