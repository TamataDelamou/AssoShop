"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useMembers } from "@/hooks/community/useMembers";
import { AddMemberDialog } from "./AddMemberDialog";
import { MemberDetailsDialog } from "./MemberDetailsDialog";
import { MemberStatusBadge } from "./MemberStatusBadge";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MEMBER_LABELS, MEMBER_ROLES } from "@/utils/constants";
import { Member } from "@/types/modules/community";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  organizationId: string;
  organizationName?: string;
}

export function MembersPage({ organizationId, organizationName }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { members, loading, refetch } = useMembers(organizationId, searchTerm);

  const openMemberDetails = (member: Member) => {
    setSelectedMember(member);
    setDetailsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {MEMBER_LABELS.PAGE_TITLE}
          </h2>
          {organizationName && (
            <p className="text-sm text-muted-foreground">{organizationName}</p>
          )}
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={MEMBER_LABELS.SEARCH_PLACEHOLDER}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 w-full"
            />
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            {MEMBER_LABELS.ADD_BUTTON}
          </Button>
        </div>
      </div>

      {/* Tableau */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Liste des membres
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted/30" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "Aucun résultat pour cette recherche"
                : MEMBER_LABELS.NO_DATA}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/10">
                  <TableHead className="text-muted-foreground font-medium">
                    Membre
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {MEMBER_LABELS.ROLE_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {MEMBER_LABELS.STATUS_LABEL}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    {MEMBER_LABELS.JOINED_AT}
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    {MEMBER_LABELS.ACTIONS_LABEL}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const roleLabel =
                    MEMBER_ROLES.find((r) => r.value === member.role)?.label ||
                    member.role;
                  return (
                    <TableRow
                      key={member.id}
                      className="border-border/50 hover:bg-muted/10"
                    >
                      <TableCell className="font-medium flex items-center gap-2">
                        <Avatar className="h-8 w-8 bg-primary/20 text-primary">
                          <AvatarFallback>
                            {member.user?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-foreground">
                            {member.user?.name || "Utilisateur"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user?.email || member.user?.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {roleLabel}
                      </TableCell>
                      <TableCell>
                        <MemberStatusBadge status={member.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.joined_at
                          ? format(member.joined_at, "dd/MM/yyyy", {
                              locale: fr,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMemberDetails(member)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {MEMBER_LABELS.VIEW_BUTTON}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogues */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />

      <MemberDetailsDialog
        key={selectedMember?.id ?? "no-member"}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        member={selectedMember}
        organizationId={organizationId}
        onSuccess={refetch}
      />
    </div>
  );
}
