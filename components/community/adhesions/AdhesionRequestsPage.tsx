"use client";

import { Check, Inbox, X } from "lucide-react";
import { useAdhesionRequests } from "@/hooks/community/useAdhesionRequests";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  organizationId: string;
}

export function AdhesionRequestsPage({ organizationId }: Props) {
  const { requests, loading, error, processingId, approve, reject } =
    useAdhesionRequests(organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            Demandes d&apos;adhésion
          </h2>
          <p className="text-sm text-muted-foreground">
            Candidatures en attente de validation par le bureau.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {requests.length} demande(s) en attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted/30" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p>Aucune demande d&apos;adhésion en attente.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/10">
                  <TableHead className="text-muted-foreground font-medium">
                    Candidat
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Reçu le
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    Décision
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="border-border/50 hover:bg-muted/10"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 bg-primary/20 text-primary">
                          <AvatarFallback>
                            {request.user?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-foreground">
                            {request.user?.name || "Utilisateur"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.user?.email || request.user?.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.joined_at
                        ? format(request.joined_at, "dd/MM/yyyy", {
                            locale: fr,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        onClick={() => approve(request.id)}
                        disabled={processingId !== null}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reject(request.id)}
                        disabled={processingId !== null}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Refuser
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
