"use client";

import { DocumentCategory } from "@/types/modules/community";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  category: DocumentCategory;
}

export function DocumentCategoryBadge({ category }: Props) {
  const option = DOCUMENT_CATEGORY_OPTIONS.find((c) => c.value === category);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}
