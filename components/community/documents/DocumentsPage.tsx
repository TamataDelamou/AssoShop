"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDocuments } from "@/hooks/community/useDocuments";
import { DocumentCategoryBadge } from "./DocumentCategoryBadge";
import { UploadDocumentDialog } from "./UploadDocumentDialog";
import { AssociationDocument } from "@/types/modules/community";
import {
  COMMON_LABELS,
  DOCUMENT_CATEGORY_OPTIONS,
  DOCUMENT_LABELS,
} from "@/utils/constants";
import { formatDate, formatFileSize } from "@/utils/formatters";

interface Props {
  organizationId: string;
}

function fileExtension(document: AssociationDocument): string {
  return document.file_name.split(".").pop()?.toUpperCase() ?? "-";
}

export function DocumentsPage({ organizationId }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const { documents, loading, error, online, refetch } = useDocuments(
    organizationId,
    search,
    categoryFilter,
  );

  const summary = useMemo(() => {
    const total = documents.length;
    const size = documents.reduce((sum, d) => sum + d.file_size, 0);
    const categories = new Set(documents.map((d) => d.category)).size;
    return { total, size, categories };
  }, [documents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{DOCUMENT_LABELS.PAGE_TITLE}</h1>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {DOCUMENT_LABELS.UPLOAD_BUTTON}
        </Button>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{DOCUMENT_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {DOCUMENT_LABELS.SUMMARY_TOTAL}
            </p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {DOCUMENT_LABELS.SUMMARY_SIZE}
            </p>
            <p className="text-2xl font-bold">
              {formatFileSize(summary.size)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {DOCUMENT_LABELS.SUMMARY_CATEGORIES}
            </p>
            <p className="text-2xl font-bold">{summary.categories}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={DOCUMENT_LABELS.SEARCH_PLACEHOLDER}
          className="sm:max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue
              placeholder={DOCUMENT_LABELS.CATEGORY_FILTER_PLACEHOLDER}
            />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {DOCUMENT_LABELS.LOAD_ERROR}
        </p>
      ) : !documents.length ? (
        <p className="text-sm text-muted-foreground">
          {DOCUMENT_LABELS.NO_DATA}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {DOCUMENT_LABELS.NAME_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {DOCUMENT_LABELS.CATEGORY_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {DOCUMENT_LABELS.TYPE_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {DOCUMENT_LABELS.SIZE_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {DOCUMENT_LABELS.UPLOADED_BY_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {DOCUMENT_LABELS.DATE_LABEL}
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-border/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.name}</p>
                    {d.description ? (
                      <p className="text-xs text-muted-foreground">
                        {d.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <DocumentCategoryBadge category={d.category} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fileExtension(d)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatFileSize(d.file_size)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.uploaded_by}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadDocumentDialog
        key={uploadOpen ? "open" : "closed"}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />
    </div>
  );
}
