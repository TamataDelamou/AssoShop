"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  AuthMethod,
  AuthStatus,
  AuthStep,
  ChannelType,
} from "@/types/modules/auth";
import { AUTH_CONFIG, AUTH_MESSAGES, COMMON_LABELS } from "@/utils/constants";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const {
    method,
    step,
    identifier,
    otp,
    pin,
    status,
    error,
    channel,
    resendCountdown,
    setIdentifier,
    setOtp,
    setPin,
    setResendCountdown,
    toggleMethod,
    setChannelType,
    sendOtp,
    verifyOtp,
    createPin,
    verifyPin,
    clearError,
    // Page utilisateur : demander un code ou un lien crée le compte s'il
    // n'existe pas encore (inscription), quel que soit le canal.
  } = useAuth("/dashboard", { allowSignup: true });

  // Gestion du compte à rebours pour le renvoi
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown, setResendCountdown]);

  const isLoading = status === AuthStatus.LOADING;
  const isError = status === AuthStatus.ERROR;

  // Rendu des étapes
  const renderInputStep = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="identifier" className="text-foreground">
          {method === AuthMethod.PHONE
            ? "Numéro de téléphone"
            : "Adresse e-mail"}
        </Label>
        <Input
          id="identifier"
          type={method === AuthMethod.PHONE ? "tel" : "email"}
          placeholder={
            method === AuthMethod.PHONE
              ? AUTH_MESSAGES.PHONE_PLACEHOLDER
              : AUTH_MESSAGES.EMAIL_PLACEHOLDER
          }
          value={identifier}
          onChange={(e) => {
            clearError();
            setIdentifier(e.target.value);
          }}
          className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
          disabled={isLoading}
        />
      </div>

      {/* Choix du canal pour le téléphone */}
      {method === AuthMethod.PHONE && (
        <div className="space-y-2">
          <Label className="text-foreground">Canal de réception</Label>
          <Select
            value={channel}
            onValueChange={(val) => setChannelType(val as ChannelType)}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
              <SelectValue placeholder="Choisir le canal" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              <SelectItem value={ChannelType.SMS}>SMS</SelectItem>
              <SelectItem value={ChannelType.WHATSAPP}>WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {method === AuthMethod.EMAIL && (
        <div className="space-y-2">
          <Label className="text-foreground">Mode d&apos;envoi</Label>
          <Select
            value={channel}
            onValueChange={(val) => setChannelType(val as ChannelType)}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
              <SelectValue placeholder="Choisir le mode" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              <SelectItem value={ChannelType.EMAIL_OTP}>
                Code OTP par email
              </SelectItem>
              <SelectItem value={ChannelType.EMAIL_MAGIC_LINK}>
                Lien magique (Magic Link)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Button
        onClick={sendOtp}
        disabled={isLoading || !identifier}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isLoading ? COMMON_LABELS.LOADING : AUTH_MESSAGES.LOGIN_BUTTON}
      </Button>

      <button
        onClick={toggleMethod}
        className="text-sm text-primary hover:underline mt-2 bg-transparent border-none cursor-pointer"
        disabled={isLoading}
      >
        {method === AuthMethod.PHONE
          ? AUTH_MESSAGES.SWITCH_TO_EMAIL
          : AUTH_MESSAGES.SWITCH_TO_PHONE}
      </button>
    </>
  );

  const renderOtpStep = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="otp" className="text-foreground">
          Code de vérification
        </Label>
        <Input
          id="otp"
          type="text"
          placeholder={AUTH_MESSAGES.OTP_PLACEHOLDER}
          value={otp}
          onChange={(e) => {
            clearError();
            setOtp(e.target.value.slice(0, AUTH_CONFIG.OTP_LENGTH));
          }}
          className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Un code à {AUTH_CONFIG.OTP_LENGTH} chiffres vous a été envoyé.
        </p>
      </div>

      <Button
        onClick={verifyOtp}
        disabled={isLoading || otp.length !== AUTH_CONFIG.OTP_LENGTH}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isLoading ? COMMON_LABELS.LOADING : AUTH_MESSAGES.VERIFY_BUTTON}
      </Button>

      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => {
            // Revenir à l'étape précédente
            // Dans ce hook, on pourrait ajouter une fonction goBack()
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          {COMMON_LABELS.BACK}
        </button>
        <button
          onClick={sendOtp}
          disabled={isLoading || resendCountdown > 0}
          className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-none"
        >
          {resendCountdown > 0
            ? AUTH_MESSAGES.RESEND_COUNTDOWN.replace(
                "{seconds}",
                String(resendCountdown),
              )
            : AUTH_MESSAGES.RESEND_OTP}
        </button>
      </div>
    </>
  );

  const renderPinStep = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="pin" className="text-foreground">
          Créez votre code PIN
        </Label>
        <Input
          id="pin"
          type="password"
          placeholder={AUTH_MESSAGES.PIN_PLACEHOLDER}
          value={pin}
          onChange={(e) => {
            clearError();
            setPin(e.target.value.slice(0, AUTH_CONFIG.PIN_LENGTH));
          }}
          className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          PIN à {AUTH_CONFIG.PIN_LENGTH} chiffres pour sécuriser votre compte.
        </p>
      </div>

      <Button
        onClick={createPin}
        disabled={isLoading || pin.length !== AUTH_CONFIG.PIN_LENGTH}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isLoading ? COMMON_LABELS.LOADING : "Créer le PIN"}
      </Button>
    </>
  );

  const renderPinEntryStep = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="pin" className="text-foreground">
          Code PIN
        </Label>
        <Input
          id="pin"
          type="password"
          placeholder={AUTH_MESSAGES.PIN_PLACEHOLDER}
          value={pin}
          onChange={(e) => {
            clearError();
            setPin(e.target.value.slice(0, AUTH_CONFIG.PIN_LENGTH));
          }}
          className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Saisissez votre code PIN à {AUTH_CONFIG.PIN_LENGTH} chiffres.
        </p>
      </div>

      <Button
        onClick={verifyPin}
        disabled={isLoading || pin.length !== AUTH_CONFIG.PIN_LENGTH}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isLoading ? COMMON_LABELS.LOADING : AUTH_MESSAGES.PIN_UNLOCK_BUTTON}
      </Button>
    </>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-[0_0_30px_rgba(0,240,255,0.25)]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-light text-foreground">
            {AUTH_MESSAGES.TITLE}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {AUTH_MESSAGES.SUBTITLE}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isError && error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === AuthStep.INPUT_CREDENTIALS && renderInputStep()}
          {step === AuthStep.OTP_VERIFICATION && renderOtpStep()}
          {step === AuthStep.PIN_ENTRY && renderPinEntryStep()}
          {step === AuthStep.PIN_CREATION && renderPinStep()}
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 w-full max-w-md">
          <span className="h-px flex-1 bg-border/50" />
          <span className="text-xs text-muted-foreground">ou</span>
          <span className="h-px flex-1 bg-border/50" />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            router.push("/api/demo-login");
          }}
          className="w-full max-w-md border-border/50 text-foreground hover:bg-primary/10"
        >
          Entrer en mode démo (parcourir les écrans)
        </Button>
        <p className="text-xs text-muted-foreground">
          Pose une session locale sans backend Supabase, uniquement pour tester
          l&apos;application.
        </p>
      </div>
    </div>
  );
}
