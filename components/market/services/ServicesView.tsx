"use client";

import { useMemo, useState } from "react";
import {
  CommunityService,
  CreateCommunityServicePayload,
} from "@/types/modules/market";
import { useCommunityServices } from "@/hooks/market/useCommunityServices";
import { communityServicesService } from "@/services/market/services";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  MARKET_LABELS,
  SERVICE_TYPE_OPTIONS,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import { MapPin, Plus, Search, Star, Wrench } from "lucide-react";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(rating)
              ? "fill-primary text-primary"
              : "text-white/20",
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

const EMPTY_FORM: CreateCommunityServicePayload = {
  provider_name: "",
  service_type: SERVICE_TYPE_OPTIONS[0].value,
  title: "",
  description: "",
  price: 0,
  currency: "GNF",
  country: "Guinée",
  city: "Conakry",
};

const selectStyles =
  "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

const textareaStyles =
  "min-h-20 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

export function ServicesView() {
  const { services, loading, error, refetch } = useCommunityServices();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<CommunityService | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [form, setForm] = useState<CreateCommunityServicePayload>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!services) return [];
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q) && !s.provider_name.toLowerCase().includes(q)) {
        return false;
      }
      if (typeFilter && s.service_type !== typeFilter) return false;
      return true;
    });
  }, [services, search, typeFilter]);

  const publish = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await communityServicesService.createService(form);
      await refetch();
      setPublishOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={MARKET_LABELS.SEARCH_PROVIDER_PLACEHOLDER}
              className="pl-8"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={cn(selectStyles, "w-44")}
          >
            <option value="">{MARKET_LABELS.ALL_CATEGORIES}</option>
            {SERVICE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setPublishOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {MARKET_LABELS.PUBLISH_SERVICE}
        </Button>
      </div>

      {loading && !services ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : error && !services ? (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
          {MARKET_LABELS.NO_SERVICES}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((service) => (
            <Card
              key={service.id}
              className="cursor-pointer transition hover:border-primary/40"
              onClick={() => setSelected(service)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm leading-snug">
                  {service.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wrench className="h-3.5 w-3.5" />
                  {
                    SERVICE_TYPE_OPTIONS.find(
                      (o) => o.value === service.service_type,
                    )?.label
                  }
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {service.provider_name}
                  </span>
                  {service.provider_member && (
                    <Badge
                      variant="outline"
                      className="border-primary/40 bg-primary/10 text-primary"
                    >
                      {MARKET_LABELS.PROVIDER_MEMBER}
                    </Badge>
                  )}
                </div>
                <Stars rating={service.rating} />
                <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {service.city}, {service.country}
                  </span>
                  <span className="font-bold">
                    {formatCurrency(service.price, service.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Fiche prestataire */}
      <ServiceDetailDialog
        service={selected}
        onClose={() => setSelected(null)}
        onChanged={refetch}
      />

      {/* Publication d'une offre */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{MARKET_LABELS.PUBLISH_SERVICE}</DialogTitle>
            <DialogDescription>
              {MARKET_LABELS.SERVICES_TITLE}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.PROVIDER_NAME}
              </Label>
              <Input
                value={form.provider_name}
                onChange={(e) =>
                  setForm({ ...form, provider_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.SERVICE_TYPE}
              </Label>
              <select
                value={form.service_type}
                onChange={(e) =>
                  setForm({ ...form, service_type: e.target.value })
                }
                className={selectStyles}
              >
                {SERVICE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.TITLE}
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.DESCRIPTION}
              </Label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={textareaStyles}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  {MARKET_LABELS.PRICE}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) })
                  }
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
            {actionError && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={publish}
              disabled={busy || !form.title.trim() || !form.provider_name.trim()}
            >
              {MARKET_LABELS.PUBLISH_SERVICE}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServiceDetailDialog({
  service,
  onClose,
  onChanged,
}: {
  service: CommunityService | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [solicited, setSolicited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReview = async () => {
    if (!service) return;
    setBusy(true);
    setError(null);
    try {
      await communityServicesService.addReview(service.id, {
        author_name: author,
        rating,
        comment,
        solicited,
      });
      await onChanged();
      setAuthor("");
      setComment("");
      setSolicited(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {service && (
          <>
            <DialogHeader>
              <DialogTitle>{service.title}</DialogTitle>
              <DialogDescription>
                {service.provider_name} · {service.city}, {service.country}
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm text-foreground">{service.description}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <Stars rating={service.rating} />
              <span className="font-bold">
                {formatCurrency(service.price, service.currency)}
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                {MARKET_LABELS.REVIEWS} ({service.reviews_count})
              </h4>
              {service.reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {MARKET_LABELS.NO_REVIEWS}
                </p>
              ) : (
                service.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {review.author_name}
                      </span>
                      <Stars rating={review.rating} />
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {review.comment}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(review.created_at))}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <h4 className="text-sm font-medium">
                {MARKET_LABELS.ADD_REVIEW}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Votre nom"
                />
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className={selectStyles}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={textareaStyles}
                placeholder="Votre commentaire"
              />
              {/* RG-M04 : seule une personne ayant sollicité le service peut l'évaluer. */}
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={solicited}
                  onChange={(e) => setSolicited(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-black/40 accent-primary"
                />
                {MARKET_LABELS.SOLICITED_LABEL}
              </label>
              {error && (
                <Alert variant="destructive" className="border-destructive/50">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                className="w-full"
                onClick={submitReview}
                disabled={busy || !author.trim() || !comment.trim() || !solicited}
              >
                {MARKET_LABELS.ADD_REVIEW}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
