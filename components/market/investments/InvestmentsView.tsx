"use client";

import { useState } from "react";
import {
  CreateInvestmentProjectPayload,
  InvestmentDistributionStatus,
  InvestmentProject,
  InvestmentProjectStatus,
} from "@/types/modules/market";
import { useInvestments } from "@/hooks/market/useInvestments";
import { investmentsService } from "@/services/market/investments";
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
  INVESTMENT_DISTRIBUTION_STATUS_LABELS,
  INVESTMENT_PROJECT_STATUS_LABELS,
  INVESTMENT_SECTOR_OPTIONS,
  MARKET_LABELS,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  Coins,
  Lock,
  PiggyBank,
  Plus,
  TrendingUp,
} from "lucide-react";

const EMPTY_FORM: CreateInvestmentProjectPayload = {
  name: "",
  description: "",
  sector: INVESTMENT_SECTOR_OPTIONS[0].value,
  target_amount: 0,
  currency: "GNF",
  profit_sharing_rules: "",
  deadline: "",
};

// Couleur du badge de statut : collecte, objectif atteint / financé, remboursé.
const STATUS_STYLES: Record<InvestmentProjectStatus, string> = {
  [InvestmentProjectStatus.OPEN]:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  [InvestmentProjectStatus.COMPLETED]:
    "border-sky-500/40 bg-sky-500/10 text-sky-400",
  [InvestmentProjectStatus.FUNDED]:
    "border-primary/40 bg-primary/10 text-primary",
  [InvestmentProjectStatus.REFUNDED]:
    "border-amber-500/40 bg-amber-500/10 text-amber-400",
  [InvestmentProjectStatus.CLOSED]:
    "border-white/10 bg-white/5 text-muted-foreground",
};

// Premier jour accepté pour la date limite : demain (AAAA-MM-JJ).
function minDeadline(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

const selectStyles =
  "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

const textareaStyles =
  "min-h-20 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

export function InvestmentsView() {
  const { projects, loading, error, refetch } = useInvestments();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateInvestmentProjectPayload>(EMPTY_FORM);
  const [investTarget, setInvestTarget] = useState<InvestmentProject | null>(
    null,
  );
  const [amount, setAmount] = useState(0);
  const [profitTarget, setProfitTarget] = useState<InvestmentProject | null>(
    null,
  );
  const [profitAmount, setProfitAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const createProject = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await investmentsService.createProject(form);
      await refetch();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const invest = async () => {
    if (!investTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      await investmentsService.invest(investTarget.id, { amount });
      await refetch();
      setInvestTarget(null);
      setAmount(0);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const declareProfit = async () => {
    if (!profitTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      await investmentsService.declareProfit(profitTarget.id, {
        amount: profitAmount,
      });
      await refetch();
      setProfitTarget(null);
      setProfitAmount(0);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {MARKET_LABELS.INVESTMENTS_TITLE}
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {MARKET_LABELS.CREATE_PROJECT}
        </Button>
      </div>

      {loading && !projects ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : error && !projects ? (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : (projects?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
          {MARKET_LABELS.NO_PROJECTS}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects?.map((project) => {
            const progress = Math.min(
              100,
              Math.round((project.raised_amount / project.target_amount) * 100),
            );
            const sectorLabel = INVESTMENT_SECTOR_OPTIONS.find(
              (o) => o.value === project.sector,
            )?.label;
            return (
              <Card key={project.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm leading-snug">
                    {project.name}
                  </CardTitle>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {project.is_owner && (
                      <Badge
                        variant="outline"
                        className="border-white/10 bg-white/5 text-muted-foreground"
                      >
                        {MARKET_LABELS.MY_PROJECT}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(STATUS_STYLES[project.status])}
                    >
                      {INVESTMENT_PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="line-clamp-2 text-muted-foreground">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {sectorLabel}
                    </span>
                    {project.deadline && (
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {MARKET_LABELS.INVESTMENT_DEADLINE} :{" "}
                        {formatDate(project.deadline)}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{MARKET_LABELS.RAISED_AMOUNT}</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(
                          project.raised_amount,
                          project.currency,
                        )}{" "}
                        / {formatCurrency(project.target_amount, project.currency)}
                      </span>
                    </div>
                    <div className="h-2 rounded bg-white/10">
                      <div
                        className="h-2 rounded bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {MARKET_LABELS.PROFIT_SHARING_RULES}
                      </span>
                      {project.rules_locked && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-amber-400"
                        >
                          <Lock className="mr-1 h-3 w-3" />
                          {MARKET_LABELS.RULES_LOCKED}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs">{project.profit_sharing_rules}</p>
                    {project.commission_rate !== null && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {MARKET_LABELS.COMMISSION_NOTICE} :{" "}
                        {project.commission_rate} %
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <span className="text-xs text-muted-foreground">
                      {MARKET_LABELS.INVESTOR_SHARES}
                    </span>
                    {project.shares.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {MARKET_LABELS.NO_INVESTORS}
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-xs">
                        {project.shares.map((share, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <span
                              className={cn(
                                share.is_me && "font-bold text-foreground",
                              )}
                            >
                              {share.is_me
                                ? MARKET_LABELS.INVESTOR_ME
                                : `${MARKET_LABELS.INVESTOR} ${index + 1}`}
                            </span>
                            <span>
                              {formatCurrency(share.amount, project.currency)} ·{" "}
                              {share.percent} %
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {project.distributions.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <span className="text-xs text-muted-foreground">
                        {MARKET_LABELS.DISTRIBUTIONS}
                      </span>
                      <ul className="mt-1 space-y-1 text-xs">
                        {project.distributions.map((distribution) => (
                          <li
                            key={distribution.id}
                            className="flex flex-wrap items-center justify-between gap-x-2"
                          >
                            <span>
                              {formatDate(distribution.declared_at)} ·{" "}
                              {formatCurrency(
                                distribution.distributed_amount ??
                                  distribution.amount,
                                project.currency,
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              {
                                INVESTMENT_DISTRIBUTION_STATUS_LABELS[
                                  distribution.status
                                ]
                              }
                              {distribution.status ===
                                InvestmentDistributionStatus.APPROVED &&
                                distribution.my_share > 0 &&
                                ` · ${MARKET_LABELS.MY_SHARE} : ${formatCurrency(
                                  distribution.my_share,
                                  project.currency,
                                )}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-xs text-muted-foreground">
                      {MARKET_LABELS.MY_CONTRIBUTION} :{" "}
                      <span className="font-bold text-foreground">
                        {formatCurrency(
                          project.my_contribution,
                          project.currency,
                        )}
                      </span>
                    </span>
                    {project.status === InvestmentProjectStatus.OPEN && (
                      <Button size="sm" onClick={() => setInvestTarget(project)}>
                        <PiggyBank className="mr-1.5 h-3.5 w-3.5" />
                        {MARKET_LABELS.INVEST}
                      </Button>
                    )}
                    {project.is_owner &&
                      project.status === InvestmentProjectStatus.FUNDED && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10"
                          onClick={() => setProfitTarget(project)}
                        >
                          <Coins className="mr-1.5 h-3.5 w-3.5" />
                          {MARKET_LABELS.DECLARE_PROFIT}
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Création de projet */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{MARKET_LABELS.CREATE_PROJECT}</DialogTitle>
            <DialogDescription>
              {MARKET_LABELS.INVESTMENTS_TITLE}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.PROJECT_NAME}
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  {MARKET_LABELS.SECTOR}
                </Label>
                <select
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  className={selectStyles}
                >
                  {INVESTMENT_SECTOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  {MARKET_LABELS.TARGET_AMOUNT}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.target_amount}
                  onChange={(e) =>
                    setForm({ ...form, target_amount: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.INVESTMENT_DEADLINE}
              </Label>
              <Input
                type="date"
                min={minDeadline()}
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {MARKET_LABELS.INVEST_ALL_OR_NOTHING}
              </p>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.PROFIT_SHARING_RULES}
              </Label>
              <textarea
                value={form.profit_sharing_rules}
                onChange={(e) =>
                  setForm({ ...form, profit_sharing_rules: e.target.value })
                }
                className={textareaStyles}
              />
            </div>
            {actionError && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={createProject}
              disabled={
                busy ||
                !form.name.trim() ||
                form.target_amount <= 0 ||
                !form.deadline ||
                !form.profit_sharing_rules.trim()
              }
            >
              {MARKET_LABELS.CREATE_PROJECT}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Investissement */}
      <Dialog
        open={!!investTarget}
        onOpenChange={(o) => !o && setInvestTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{MARKET_LABELS.INVEST}</DialogTitle>
            {investTarget && (
              <DialogDescription>{investTarget.name}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.AMOUNT}
              </Label>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {MARKET_LABELS.INVEST_DEBIT_NOTICE}{" "}
              {MARKET_LABELS.INVEST_ALL_OR_NOTHING}
            </p>
            {actionError && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={invest}
              disabled={busy || amount <= 0}
            >
              {MARKET_LABELS.INVEST}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Déclaration d'un bénéfice (porteur d'un projet financé) */}
      <Dialog
        open={!!profitTarget}
        onOpenChange={(o) => !o && setProfitTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{MARKET_LABELS.DECLARE_PROFIT}</DialogTitle>
            {profitTarget && (
              <DialogDescription>{profitTarget.name}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.PROFIT_AMOUNT}
              </Label>
              <Input
                type="number"
                min={0}
                value={profitAmount}
                onChange={(e) => setProfitAmount(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {MARKET_LABELS.DECLARE_PROFIT_HINT}
            </p>
            {profitTarget && (
              <p className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs">
                {profitTarget.profit_sharing_rules}
              </p>
            )}
            {actionError && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={declareProfit}
              disabled={busy || profitAmount <= 0}
            >
              {MARKET_LABELS.DECLARE_PROFIT}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
