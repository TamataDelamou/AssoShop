"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ORGANIZATION_LABELS,
  ORGANIZATION_TYPES,
} from "@/utils/constants";

export function OrganizationsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { organizations, loading, refetch } = useOrganizations(searchTerm);

  const handleViewMembers = (orgId: string) => {
    router.push(`/dashboard/organizations/${orgId}/members`);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec recherche et bouton (inchangé) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-light text-foreground">
          {ORGANIZATION_LABELS.PAGE_TITLE}
        </h2>
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={ORGANIZATION_LABELS.SEARCH_PLACEHOLDER}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 w-full"
            />
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            {ORGANIZATION_LABELS.CREATE_BUTTON}
          </Button>
        </div>
      </div>

      {/* Tableau des organisations */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Liste des organisations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted/30" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "Aucun résultat pour cette recherche"
                : ORGANIZATION_LABELS.NO_DATA}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/10">
                  <TableHead className="text-muted-foreground font-medium">
                    {ORGANIZATION_LABELS.NAME_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {ORGANIZATION_LABELS.TYPE_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {ORGANIZATION_LABELS.CITY_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Statut
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    {ORGANIZATION_LABELS.MEMBERS_COUNT}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    {ORGANIZATION_LABELS.ACTIONS_LABEL}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow
                    key={org.id}
                    className="border-border/50 hover:bg-muted/10"
                  >
                    <TableCell className="font-medium flex items-center gap-2">
                      <Avatar className="h-8 w-8 bg-gradient-to-br from-primary/30 to-secondary/30 text-primary">
                        <AvatarFallback>
                          {org.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {org.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ORGANIZATION_TYPES.find((t) => t.value === org.type)
                        ?.label || org.type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {org.city || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          org.status === "active" ? "default" : "secondary"
                        }
                        className={
                          org.status === "active"
                            ? "bg-primary/20 text-primary hover:bg-primary/30"
                            : "bg-muted/30 text-muted-foreground"
                        }
                      >
                        {org.status === "active"
                          ? ORGANIZATION_LABELS.STATUS_ACTIVE
                          : ORGANIZATION_LABELS.STATUS_PENDING}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {org.memberCount || 0}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMembers(org.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {ORGANIZATION_LABELS.VIEW_BUTTON}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {ORGANIZATION_LABELS.EDIT_BUTTON}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogue de création */}
      <CreateOrganizationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
