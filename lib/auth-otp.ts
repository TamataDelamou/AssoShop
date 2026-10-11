import { AuthMethod, ChannelType } from "@/types/modules/auth";

// Demande de code ou de lien de connexion (Supabase signInWithOtp).
//
// Un seul endroit décide si la demande peut CRÉER un compte : `allowSignup`.
// - Page utilisateur (/auth/login) : vrai, quel que soit le canal — code par
//   e-mail, lien magique, SMS ou WhatsApp. C'est ainsi que l'on s'inscrit.
// - Page du back-office (/admin/login) : faux, quel que soit le canal — un
//   administrateur doit déjà avoir un compte.
// Supabase crée le compte par défaut quand shouldCreateUser est omis : la
// valeur est donc toujours envoyée explicitement.

export type OtpRequest =
  | { phone: string; options: { channel: "sms" | "whatsapp"; shouldCreateUser: boolean } }
  | { email: string; options: { shouldCreateUser: boolean; emailRedirectTo?: string } };

export interface OtpRequestInput {
  method: AuthMethod;
  channel: ChannelType;
  identifier: string;
  allowSignup: boolean;
  // Adresse de retour du lien magique (origine du site + page de destination).
  redirectUrl: string;
}

// Renvoie null si le canal ne correspond pas à la méthode choisie.
export function buildOtpRequest(input: OtpRequestInput): OtpRequest | null {
  const { method, channel, identifier, redirectUrl } = input;
  const shouldCreateUser = input.allowSignup === true;

  if (method === AuthMethod.PHONE) {
    if (channel === ChannelType.SMS) {
      return { phone: identifier, options: { channel: "sms", shouldCreateUser } };
    }
    if (channel === ChannelType.WHATSAPP) {
      return { phone: identifier, options: { channel: "whatsapp", shouldCreateUser } };
    }
    return null;
  }

  if (channel === ChannelType.EMAIL_OTP) {
    return { email: identifier, options: { shouldCreateUser } };
  }
  if (channel === ChannelType.EMAIL_MAGIC_LINK) {
    return { email: identifier, options: { shouldCreateUser, emailRedirectTo: redirectUrl } };
  }
  return null;
}

// Supabase refuse une demande pour un compte inexistant quand
// shouldCreateUser est faux (« Signups not allowed for otp »).
export function isSignupRefused(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === "otp_disabled" ||
    code === "signup_disabled" ||
    (typeof message === "string" && /signups? not allowed/i.test(message))
  );
}
