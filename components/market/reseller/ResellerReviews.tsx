"use client";

import { Review } from "@/types/modules/market";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { Star } from "lucide-react";

export function ResellerReviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
        {MARKET_LABELS.NO_REVIEWS}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{review.author_name}</CardTitle>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={
                    i < review.rating
                      ? "h-3.5 w-3.5 fill-primary text-primary"
                      : "h-3.5 w-3.5 text-white/20"
                  }
                />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-foreground">{review.comment}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(new Date(review.created_at))}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
