"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthStep, AuthStatus } from "@/types/modules/auth";
import { ADMIN_LABELS, AUTH_MESSAGES, COMMON_LABELS } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminLoginPage() {
  const {
    step,
    identifier,
    otp,
    pin,
    status,
    error,
    resendCountdown,
    setIdentifier,
    setOtp,
    setPin,
    setResendCountdown,
    sendOtp,
    verifyOtp,
    createPin,
    clearError,
    // Back-office : aucune inscription ici, le compte doit déjà exister.
  } = useAuth("/admin", { allowSignup: false });

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-[0_0_30px_rgba(0,240,255,0.25)]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-light text-foreground">
            {ADMIN_LABELS.LOGIN_TITLE}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {ADMIN_LABELS.LOGIN_SUBTITLE}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isError && error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === AuthStep.INPUT_CREDENTIALS && (
            <>
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-foreground">
                  Adresse e-mail administrateur
                </Label>
                <Input
                  id="identifier"
                  type="email"
                  placeholder={AUTH_MESSAGES.EMAIL_PLACEHOLDER}
                  value={identifier}
                  onChange={(e) => {
                    clearError();
                    setIdentifier(e.target.value);
                  }}
                  className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={sendOtp}
                disabled={isLoading || !identifier}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? COMMON_LABELS.LOADING : AUTH_MESSAGES.LOGIN_BUTTON}
              </Button>
            </>
          )}

          {step === AuthStep.OTP_VERIFICATION && (
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
                    setOtp(e.target.value.slice(0, 6));
                  }}
                  className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={verifyOtp}
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? COMMON_LABELS.LOADING : AUTH_MESSAGES.VERIFY_BUTTON}
              </Button>
            </>
          )}

          {step === AuthStep.PIN_CREATION && (
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
                    setPin(e.target.value.slice(0, 4));
                  }}
                  className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={createPin}
                disabled={isLoading || pin.length !== 4}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? COMMON_LABELS.LOADING : "Créer le PIN"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
