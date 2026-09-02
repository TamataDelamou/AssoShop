"use client";

import { useState } from "react";
import {
  PaymentMethod,
  Wallet,
} from "@/types/modules/pay";
import { payService } from "@/services/pay/pay";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatters";
import {
  PAY_CONFIG,
  PAY_COUNTRIES,
  PAY_LABELS,
  PAY_MESSAGES,
  PAY_OPERATORS_BY_COUNTRY,
  WALLET_TYPE_LABELS,
} from "@/utils/constants";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Send,
  Smartphone,
  Wallet as WalletIcon,
} from "lucide-react";

const selectStyles =
  "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

interface WalletViewProps {
  wallets: Wallet[];
  methods: PaymentMethod[];
  online: boolean;
  onChanged: () => Promise<void>;
}

export function WalletView({
  wallets,
  methods,
  online,
  onChanged,
}: WalletViewProps) {
  const [activeId, setActiveId] = useState<string>(
    wallets[0]?.id ?? "",
  );
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);

  const active = wallets.find((w) => w.id === activeId) ?? wallets[0];

  const handleTopup = async (payload: {
    provider: string;
    phone: string;
    amount: number;
  }) => {
    if (!active) return;
    await payService.topup({ wallet_id: active.id, ...payload });
    await onChanged();
    setTopupOpen(false);
  };

  const handleWithdraw = async (payload: {
    provider: string;
    phone: string;
    amount: number;
  }) => {
    if (!active) return;
    await payService.withdraw({ wallet_id: active.id, ...payload });
    await onChanged();
    setWithdrawOpen(false);
  };

  const handleTransfer = async (payload: {
    to_member: string;
    amount: number;
  }) => {
    if (!active) return;
    await payService.transfer({ from_wallet_id: active.id, ...payload });
    await onChanged();
    setTransferOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Label className="mb-1 block text-xs text-muted-foreground">
          {PAY_LABELS.WALLET_SELECTOR}
        </Label>
        <select
          value={active?.id ?? ""}
          onChange={(e) => setActiveId(e.target.value)}
          className={selectStyles}
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label} · {WALLET_TYPE_LABELS[w.type]}
            </option>
          ))}
        </select>
      </div>

      {active && (
        <Card className="max-w-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{active.label}</span>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5"
                >
                  {WALLET_TYPE_LABELS[active.type]}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {active.currency}
              </span>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                {PAY_LABELS.BALANCE}
              </p>
              <p className="text-4xl font-bold">
                {formatCurrency(active.balance, active.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {PAY_LABELS.LAST_KNOWN_BALANCE} :{" "}
                {formatCurrency(active.last_known_balance, active.currency)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setTopupOpen(true)}
                disabled={!online}
              >
                <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                {PAY_LABELS.TOPUP}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10"
                onClick={() => setWithdrawOpen(true)}
                disabled={!online}
              >
                <ArrowUpFromLine className="mr-1.5 h-4 w-4" />
                {PAY_LABELS.WITHDRAW}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10"
                onClick={() => setTransferOpen(true)}
                disabled={!online}
              >
                <Send className="mr-1.5 h-4 w-4" />
                {PAY_LABELS.TRANSFER}
              </Button>
            </div>

            {!online && (
              <p className="text-xs text-amber-400">
                {PAY_LABELS.OFFLINE_BADGE} — les opérations nécessitent une
                connexion.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Moyens de paiement enregistrés (PAY-05) */}
      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">
            {PAY_LABELS.PAYMENT_METHODS}
          </CardTitle>
          <Button size="sm" variant="outline" className="border-white/10" onClick={() => setMethodOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {PAY_LABELS.ADD_METHOD}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {methods.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{m.provider}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.phone} · {m.country}
                  </p>
                </div>
              </div>
              {m.is_default && (
                <Badge
                  variant="outline"
                  className="border-primary/40 bg-primary/10 text-primary"
                >
                  {PAY_LABELS.DEFAULT}
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <MobileMoneyDialog
        open={topupOpen}
        onOpenChange={setTopupOpen}
        mode="topup"
        balance={active?.balance ?? 0}
        currency={active?.currency ?? "GNF"}
        onSubmit={handleTopup}
      />

      <MobileMoneyDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        mode="withdraw"
        balance={active?.balance ?? 0}
        currency={active?.currency ?? "GNF"}
        onSubmit={handleWithdraw}
      />

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onSubmit={handleTransfer}
      />

      <AddMethodDialog
        open={methodOpen}
        onOpenChange={setMethodOpen}
        onSubmit={async (payload) => {
          await payService.addMethod(payload);
          await onChanged();
          setMethodOpen(false);
        }}
      />
    </div>
  );
}

function MobileMoneyDialog({
  open,
  onOpenChange,
  mode,
  balance,
  currency,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "topup" | "withdraw";
  balance: number;
  currency: string;
  onSubmit: (payload: { provider: string; phone: string; amount: number }) => Promise<void>;
}) {
  const [country, setCountry] = useState(PAY_COUNTRIES[0]);
  const [provider, setProvider] = useState(
    PAY_OPERATORS_BY_COUNTRY[PAY_COUNTRIES[0]][0],
  );
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operators = PAY_OPERATORS_BY_COUNTRY[country] ?? [];
  const fee = Math.round(amount * PAY_CONFIG.SERVICE_FEE_RATE);
  const title = mode === "topup" ? PAY_LABELS.TOPUP : PAY_LABELS.WITHDRAW;

  const handleCountry = (value: string) => {
    setCountry(value);
    setProvider(PAY_OPERATORS_BY_COUNTRY[value]?.[0] ?? "");
  };

  const submit = async () => {
    setError(null);
    if (!amount || amount <= 0) {
      setError(PAY_MESSAGES.AMOUNT_REQUIRED);
      return;
    }
    if (!phone.trim()) {
      setError(PAY_MESSAGES.PHONE_REQUIRED);
      return;
    }
    if (mode === "withdraw" && amount + fee > balance) {
      setError(PAY_MESSAGES.INSUFFICIENT_BALANCE);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ provider, phone: phone.trim(), amount });
      setAmount(0);
      setPhone("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {PAY_LABELS.WALLET_SELECTOR} — {formatCurrency(balance, currency)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              Pays
            </Label>
            <select
              value={country}
              onChange={(e) => handleCountry(e.target.value)}
              className={selectStyles}
            >
              {PAY_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.PROVIDER}
            </Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className={selectStyles}
            >
              {operators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.PHONE}
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+224 620 00 00 00"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.AMOUNT}
            </Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          {/* RG-P03 : la commission est toujours affichée avant validation. */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <span className="text-muted-foreground">
              {PAY_LABELS.SERVICE_FEE} (0,5 %)
            </span>
            <span className="font-bold">{formatCurrency(fee, currency)}</span>
          </div>
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" onClick={submit} disabled={busy}>
            {title}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { to_member: string; amount: number }) => Promise<void>;
}) {
  const [toMember, setToMember] = useState("");
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!toMember.trim()) {
      setError(PAY_MESSAGES.MEMBER_REQUIRED);
      return;
    }
    if (!amount || amount <= 0) {
      setError(PAY_MESSAGES.AMOUNT_REQUIRED);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ to_member: toMember.trim(), amount });
      setToMember("");
      setAmount(0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{PAY_LABELS.TRANSFER}</DialogTitle>
          <DialogDescription>
            Envoi direct à un autre membre de la plateforme.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.RECIPIENT}
            </Label>
            <Input
              value={toMember}
              onChange={(e) => setToMember(e.target.value)}
              placeholder="Nom du membre"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.AMOUNT}
            </Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" onClick={submit} disabled={busy}>
            {PAY_LABELS.TRANSFER}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMethodDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { provider: string; phone: string }) => Promise<void>;
}) {
  const [country, setCountry] = useState(PAY_COUNTRIES[0]);
  const [provider, setProvider] = useState(
    PAY_OPERATORS_BY_COUNTRY[PAY_COUNTRIES[0]][0],
  );
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!phone.trim()) {
      setError(PAY_MESSAGES.PHONE_REQUIRED);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ provider, phone: phone.trim() });
      setPhone("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{PAY_LABELS.ADD_METHOD}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              Pays
            </Label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setProvider(
                  PAY_OPERATORS_BY_COUNTRY[e.target.value]?.[0] ?? "",
                );
              }}
              className={selectStyles}
            >
              {PAY_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.PROVIDER}
            </Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className={selectStyles}
            >
              {(PAY_OPERATORS_BY_COUNTRY[country] ?? []).map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {PAY_LABELS.PHONE}
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+224 620 00 00 00"
            />
          </div>
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" onClick={submit} disabled={busy}>
            {PAY_LABELS.ADD_METHOD}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
