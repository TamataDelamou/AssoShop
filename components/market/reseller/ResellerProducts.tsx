"use client";

import { useState } from "react";
import {
  Product,
  ProductStatus,
  ResellerProductPayload,
} from "@/types/modules/market";
import { useCatalog } from "@/hooks/market/useCatalog";
import { resellerService } from "@/services/market/reseller";
import { aiAssistant } from "@/lib/ai/assistant";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { Package, Pencil, Plus, Sparkles } from "lucide-react";

interface FormState {
  name: string;
  category_id: string;
  subcategory_id: string;
  wholesale_price: number;
  retail_price: number;
  min_order_quantity: number;
  stock: number;
  country: string;
  city: string;
  currency: string;
  description: string;
  keywords: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  category_id: "",
  subcategory_id: "",
  wholesale_price: 0,
  retail_price: 0,
  min_order_quantity: 1,
  stock: 0,
  country: "Guinée",
  city: "Conakry",
  currency: "GNF",
  description: "",
  keywords: "",
};

const selectStyles =
  "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}

function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const { catalog } = useCatalog();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillId, setPrefillId] = useState<string | null>(null);

  const activeProduct = product?.id ?? null;
  if (open && activeProduct !== prefillId) {
    setPrefillId(activeProduct);
    setForm(
      product
        ? {
            name: product.name,
            category_id: product.category_id,
            subcategory_id: product.subcategory_id ?? "",
            wholesale_price: product.wholesale_price,
            retail_price: product.retail_price,
            min_order_quantity: product.min_order_quantity,
            stock: product.stock,
            country: product.country,
            city: product.city,
            currency: product.currency,
            description: product.description,
            keywords: "",
          }
        : EMPTY_FORM,
    );
  }

  const categories = catalog?.categories ?? [];
  const activeCategory = categories.find((c) => c.id === form.category_id);

  const generateDescription = async () => {
    setGenerating(true);
    try {
      const result = await aiAssistant.draftProductDescription(
        form.name,
        form.keywords,
      );
      setForm((prev) => ({ ...prev, description: result.draft }));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: ResellerProductPayload = {
        name: form.name,
        category_id: form.category_id,
        subcategory_id: form.subcategory_id || null,
        description: form.description,
        wholesale_price: form.wholesale_price,
        retail_price: form.retail_price,
        min_order_quantity: form.min_order_quantity,
        stock: form.stock,
        country: form.country,
        city: form.city,
        currency: form.currency,
      };
      if (product) {
        await resellerService.updateProduct(product.id, payload);
      } else {
        await resellerService.createProduct(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const num = (
    value: number,
    set: (n: number) => void,
  ) => (
    <Input
      type="number"
      min={0}
      value={value}
      onChange={(e) => set(Number(e.target.value))}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? MARKET_LABELS.EDIT_PRODUCT : MARKET_LABELS.ADD_PRODUCT}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {MARKET_LABELS.RESELLER}
            </Label>
            <Input
              value={form.name}
              placeholder="Nom du produit"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.CATEGORY}
              </Label>
              <select
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value, subcategory_id: "" })
                }
                className={selectStyles}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.SUBCATEGORY}
              </Label>
              <select
                value={form.subcategory_id}
                onChange={(e) =>
                  setForm({ ...form, subcategory_id: e.target.value })
                }
                className={selectStyles}
              >
                <option value="">—</option>
                {(activeCategory?.subcategories ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.WHOLESALE_PRICE}
              </Label>
              {num(form.wholesale_price, (n) =>
                setForm({ ...form, wholesale_price: n }),
              )}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.RETAIL_PRICE}
              </Label>
              {num(form.retail_price, (n) =>
                setForm({ ...form, retail_price: n }),
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.MIN_ORDER}
              </Label>
              {num(form.min_order_quantity, (n) =>
                setForm({ ...form, min_order_quantity: n }),
              )}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.STOCK}
              </Label>
              {num(form.stock, (n) => setForm({ ...form, stock: n }))}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.CURRENCY}
              </Label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={selectStyles}
              >
                <option value="GNF">GNF</option>
                <option value="XOF">XOF</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.COUNTRY_FILTER}
              </Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.CITY_FILTER}
              </Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {MARKET_LABELS.AI_DESCRIPTION}
            </Label>
            <Input
              value={form.keywords}
              placeholder="Mots-clés : qualité, origine, usage…"
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full border-white/10"
              onClick={generateDescription}
              disabled={generating}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {MARKET_LABELS.GENERATE}
            </Button>
          </div>

          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {MARKET_LABELS.DESCRIPTION}
            </Label>
            <textarea
              value={form.description}
              rows={3}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={
              saving || !form.name.trim() || !form.category_id
            }
          >
            {MARKET_LABELS.SAVE}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ResellerProductsProps {
  products: Product[];
  onChanged: () => void;
}

export function ResellerProducts({
  products,
  onChanged,
}: ResellerProductsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products.length} produit(s)
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {MARKET_LABELS.ADD_PRODUCT}
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
          {MARKET_LABELS.EMPTY_CATALOG}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm leading-snug">
                  {product.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    product.status === ProductStatus.PUBLISHED
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 bg-white/5"
                  }
                >
                  <Package className="mr-1 h-3 w-3" />
                  {product.stock}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-lg font-bold">
                  {formatCurrency(product.retail_price, product.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {MARKET_LABELS.WHOLESALE_PRICE} :{" "}
                  {formatCurrency(product.wholesale_price, product.currency)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/10"
                  onClick={() => {
                    setEditing(product);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {MARKET_LABELS.EDIT_PRODUCT}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
