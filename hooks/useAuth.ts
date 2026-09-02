"use client";

import { useState, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  AuthMethod,
  AuthStep,
  AuthStatus,
  ChannelType,
} from "@/types/modules/auth";
import { AUTH_CONFIG, ERROR_MESSAGES } from "@/utils/constants";

export function useAuth(redirectTo = "/dashboard") {
  const [method, setMethod] = useState<AuthMethod>(AuthMethod.EMAIL);
  const [step, setStep] = useState<AuthStep>(AuthStep.INPUT_CREDENTIALS);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<AuthStatus>(AuthStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelType>(ChannelType.EMAIL_OTP);
  const [resendCountdown, setResendCountdown] = useState(0);
  const router = useRouter();

  // Réinitialiser les erreurs
  const clearError = useCallback(() => setError(null), []);

  // Changer de méthode (téléphone ↔ email)
  const toggleMethod = useCallback(() => {
    clearError();
    setMethod(
      method === AuthMethod.PHONE ? AuthMethod.EMAIL : AuthMethod.PHONE,
    );
    setIdentifier("");
    setStep(AuthStep.INPUT_CREDENTIALS);
  }, [method, clearError]);

  // Changer de canal (SMS, WhatsApp, Magic Link)
  const setChannelType = useCallback(
    (newChannel: ChannelType) => {
      setChannel(newChannel);
      clearError();
    },
    [clearError],
  );

  // Envoyer le code OTP
  const sendOtp = useCallback(async () => {
    if (!identifier) {
      setError(ERROR_MESSAGES.INVALID_PHONE);
      return;
    }

    setStatus(AuthStatus.LOADING);
    clearError();

    try {
      if (method === AuthMethod.PHONE) {
        if (channel === ChannelType.SMS) {
          const { error } = await supabaseClient.auth.signInWithOtp({
            phone: identifier,
            options: { channel: "sms" },
          });
          if (error) throw error;
        } else if (channel === ChannelType.WHATSAPP) {
          const { error } = await supabaseClient.auth.signInWithOtp({
            phone: identifier,
            options: { channel: "whatsapp" },
          });
          if (error) throw error;
        } else {
          throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
        }
      } else {
        // Email
        if (channel === ChannelType.EMAIL_OTP) {
          // OTP par email
          const { error } = await supabaseClient.auth.signInWithOtp({
            email: identifier,
            options: { shouldCreateUser: false },
          });
          if (error) throw error;
        } else if (channel === ChannelType.EMAIL_MAGIC_LINK) {
          // Magic Link
          const { error } = await supabaseClient.auth.signInWithOtp({
            email: identifier,
            options: {
              emailRedirectTo: window.location.origin + redirectTo,
            },
          });
          if (error) throw error;
        } else {
          throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
        }
      }

      setStep(AuthStep.OTP_VERIFICATION);
      setResendCountdown(AUTH_CONFIG.RESEND_COOLDOWN_SECONDS);
      // Lancer un compte à rebours (à gérer dans le composant)
      setStatus(AuthStatus.SUCCESS);
    } catch (err: unknown) {
      setStatus(AuthStatus.ERROR);
      setError(getErrorMessage(err, ERROR_MESSAGES.UNKNOWN_ERROR));
    }
  }, [identifier, method, channel, clearError, redirectTo]);

  // Vérifier le code OTP
  const verifyOtp = useCallback(async () => {
    if (!otp || otp.length !== AUTH_CONFIG.OTP_LENGTH) {
      setError(ERROR_MESSAGES.INVALID_OTP);
      return;
    }

    setStatus(AuthStatus.LOADING);
    clearError();

    try {
      type VerifyOtpParams =
        | { phone: string; token: string; type: "sms" }
        | { email: string; token: string; type: "email" };

      let verifyOptions: VerifyOtpParams;
      if (method === AuthMethod.PHONE) {
        verifyOptions = { phone: identifier, token: otp, type: "sms" };
      } else {
        verifyOptions = { email: identifier, token: otp, type: "email" };
      }

      const { error } = await supabaseClient.auth.verifyOtp(verifyOptions);
      if (error) throw error;

      // Vérifie si l'utilisateur possède déjà un PIN (table user_profiles).
      const checkResponse = await fetch("/api/auth/check-pin");
      if (!checkResponse.ok) {
        throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
      }
      const { hasPin } = (await checkResponse.json()) as { hasPin: boolean };

      if (hasPin) {
        setPin("");
        setStep(AuthStep.PIN_ENTRY);
        return;
      }

      setStep(AuthStep.PIN_CREATION);
      setStatus(AuthStatus.SUCCESS);
    } catch (err: unknown) {
      setStatus(AuthStatus.ERROR);
      setError(getErrorMessage(err, ERROR_MESSAGES.OTP_INCORRECT));
    }
  }, [otp, identifier, method, clearError]);

  // Créer le PIN
  const createPin = useCallback(async () => {
    if (!pin || pin.length !== AUTH_CONFIG.PIN_LENGTH) {
      setError(ERROR_MESSAGES.INVALID_PIN);
      return;
    }

    setStatus(AuthStatus.LOADING);
    clearError();

    try {
      const response = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
      }

      router.push(redirectTo);
    } catch (err: unknown) {
      setStatus(AuthStatus.ERROR);
      setError(getErrorMessage(err, ERROR_MESSAGES.UNKNOWN_ERROR));
    }
  }, [pin, clearError, router, redirectTo]);

  // Vérifier le PIN (connexion suivante)
  const verifyPin = useCallback(async () => {
    if (!pin || pin.length !== AUTH_CONFIG.PIN_LENGTH) {
      setError(ERROR_MESSAGES.INVALID_PIN);
      return;
    }

    setStatus(AuthStatus.LOADING);
    clearError();

    try {
      const response = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (data?.error === "INCORRECT_PIN") {
          throw new Error(ERROR_MESSAGES.PIN_INCORRECT);
        }
        throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
      }

      router.push(redirectTo);
    } catch (err: unknown) {
      setStatus(AuthStatus.ERROR);
      setError(getErrorMessage(err, ERROR_MESSAGES.PIN_INCORRECT));
    }
  }, [pin, clearError, router, redirectTo]);

  return {
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
  };
}
