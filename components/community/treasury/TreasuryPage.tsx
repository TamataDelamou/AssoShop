"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus } from "lucide-react";
import { useTreasury } from "@/hooks/community/useTreasury";
import { RecordTransactionDialog } from "./RecordTransactionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TransactionType } from "@/types/modules/community";
import { TreasuryAccountType } from "@/types/modules/accounting";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ACCOUNT_LABELS: Record<TreasuryAccountType, string> = {
  [TreasuryAccountType.CASH]: "Caisse",
  [TreasuryAccountType.BANK]: "Banque",
  [TreasuryAccountType.MOBILE_MONEY]: "Mobile Money",
};

function formatGnf(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)} GNF`;
}

interface Props {
  organizationId: string;
}

export function TreasuryPage({ organizationId }: Props) {
  const {
    transactions,
    loading,
    creating,
    error,
    balance,
    incomeTotal,
    expenseTotal,
    createTransaction,
  } = useTreasury(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 bg-muted/30" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full bg-muted/30" />
          ))}
        </div>
        <Skeleton className="h-64 w-full bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            Trésorerie de l&apos;association
          </h2>
          <p className="text-sm text-muted-foreground">
            Solde, entrées et sorties avec justificatifs.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <Plus className="mr-2 h-4 w-4" />
          Enregistrer une opération
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Landmark className="h-4 w-4" />
              Solde actuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold",
                balance >= 0 ? "text-emerald-500" : "text-destructive",
              )}
            >
              {formatGnf(balance)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
              Entrées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-500">
              {formatGnf(incomeTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              Sorties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">
              {formatGnf(expenseTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Derniers mouvements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun mouvement enregistré.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/10">
                  <TableHead className="text-muted-foreground font-medium">
                    Date
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Libellé
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Compte
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Justificatif
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    Montant
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="border-border/50 hover:bg-muted/10"
                  >
                    <TableCell className="text-muted-foreground">
                      {tx.date
                        ? format(tx.date, "dd/MM/yyyy", { locale: fr })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        {tx.type === TransactionType.INCOME ? (
                          <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-destructive" />
                        )}
                        {tx.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-border/50 text-muted-foreground"
                      >
                        {ACCOUNT_LABELS[tx.account]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tx.reference || "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        tx.type === TransactionType.INCOME
                          ? "text-emerald-500"
                          : "text-destructive",
                      )}
                    >
                      {tx.type === TransactionType.INCOME ? "+" : "−"}
                      {formatGnf(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecordTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creating={creating}
        onCreate={createTransaction}
      />
    </div>
  );
}
