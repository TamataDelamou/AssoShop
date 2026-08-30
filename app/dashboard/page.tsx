"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, DollarSign, HeartHandshake } from "lucide-react";

const STATS = [
  { label: "Associations", value: "24", icon: Building2, change: "+3" },
  { label: "Membres actifs", value: "1,284", icon: Users, change: "+12%" },
  {
    label: "Cotisations perçues",
    value: "2,450,000 GNF",
    icon: DollarSign,
    change: "+8%",
  },
  {
    label: "Cas sociaux",
    value: "7",
    icon: HeartHandshake,
    change: "2 en cours",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-foreground">Vue d&apos;ensemble</h2>
        <span className="text-sm text-muted-foreground">
          Dernière mise à jour : aujourd&apos;hui
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="bg-card/50 backdrop-blur-sm border-border/50"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-primary">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ici viendront les graphiques ou tableaux récents */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-light">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Aucune activité récente à afficher pour le moment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
