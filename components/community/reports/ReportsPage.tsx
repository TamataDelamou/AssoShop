"use client";

import { BarChart3, CalendarDays, Users, Wallet } from "lucide-react";
import { useReports } from "@/hooks/community/useReports";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatAmount(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} GNF`;
}

function ratio(collected: number, expected: number): number {
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((collected / expected) * 100));
}

interface Props {
  organizationId: string;
}

function FinanceRow({
  label,
  collected,
  expected,
}: {
  label: string;
  collected: number;
  expected: number;
}) {
  const pct = ratio(collected, expected);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {formatAmount(collected)}{" "}
          <span className="text-muted-foreground/60">
            / {formatAmount(expected)}
          </span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReportsPage({ organizationId }: Props) {
  const { stats, loading, error } = useReports(organizationId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-muted/30" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 bg-muted/30" />
          ))}
        </div>
        <Skeleton className="h-64 w-full bg-muted/30" />
        <Skeleton className="h-40 w-full bg-muted/30" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!stats) return null;

  const maxEvolution = Math.max(
    1,
    ...stats.members.evolution.map((p) => p.count),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-foreground">
          Rapports &amp; statistiques
        </h2>
        <p className="text-sm text-muted-foreground">
          Vue consolidée de l&apos;activité de l&apos;association.
        </p>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">Membres actifs</span>
              <Users className="h-4 w-4" />
            </div>
            <p className="text-3xl font-light text-foreground">
              {stats.members.active}
            </p>
            <p className="text-xs text-muted-foreground">
              sur {stats.members.total} membres ({stats.members.pending} en
              attente)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">Taux de participation</span>
              <CalendarDays className="h-4 w-4" />
            </div>
            <p className="text-3xl font-light text-foreground">
              {stats.participation.rate}%
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.participation.present}/{stats.participation.totalAttendees}{" "}
              présents · {stats.participation.completedMeetings} réunion(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">Cotisations perçues</span>
              <Wallet className="h-4 w-4" />
            </div>
            <p className="text-2xl font-light text-foreground truncate">
              {formatAmount(stats.finance.contributions.collected)}
            </p>
            <p className="text-xs text-muted-foreground">
              sur {formatAmount(stats.finance.contributions.expected)} attendues
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">Activité</span>
              <BarChart3 className="h-4 w-4" />
            </div>
            <p className="text-3xl font-light text-foreground">
              {stats.events.upcoming}
            </p>
            <p className="text-xs text-muted-foreground">
              événements à venir · {stats.events.past} passés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Évolution des effectifs */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Évolution des effectifs (6 derniers mois)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.members.evolution.map((point) => (
            <div key={point.key} className="flex items-center gap-3">
              <span className="w-28 text-xs text-muted-foreground">
                {format(point.date, "MMM yyyy", { locale: fr })}
              </span>
              <div className="flex-1 h-6 rounded bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded bg-primary/70"
                  style={{
                    width: `${(point.count / maxEvolution) * 100}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-xs text-foreground">
                {point.count}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bilan financier */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Bilan financier
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Cotisations, projets et cas sociaux.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FinanceRow
            label="Cotisations"
            collected={stats.finance.contributions.collected}
            expected={stats.finance.contributions.expected}
          />
          <FinanceRow
            label="Projets"
            collected={stats.finance.projects.raised}
            expected={stats.finance.projects.goal}
          />
          <FinanceRow
            label="Cas sociaux"
            collected={stats.finance.socialCases.collected}
            expected={stats.finance.socialCases.target}
          />
        </CardContent>
      </Card>
    </div>
  );
}
