import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildOtpRequest, isSignupRefused } from "@/lib/auth-otp";
import { AuthMethod, ChannelType } from "@/types/modules/auth";

function read(path: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../${path}`, import.meta.url)),
    "utf8",
  ).replace(/\r\n/g, "\n");
}

const REDIRECT = "https://app.exemple.org/dashboard";

// Tous les canaux proposés à l'écran, avec leur méthode.
const CHANNELS: { method: AuthMethod; channel: ChannelType; identifier: string }[] = [
  { method: AuthMethod.EMAIL, channel: ChannelType.EMAIL_OTP, identifier: "a@exemple.org" },
  { method: AuthMethod.EMAIL, channel: ChannelType.EMAIL_MAGIC_LINK, identifier: "a@exemple.org" },
  { method: AuthMethod.PHONE, channel: ChannelType.SMS, identifier: "+224600000000" },
  { method: AuthMethod.PHONE, channel: ChannelType.WHATSAPP, identifier: "+224600000000" },
];

function request(entry: (typeof CHANNELS)[number], allowSignup: boolean) {
  return buildOtpRequest({ ...entry, allowSignup, redirectUrl: REDIRECT });
}

describe("Demande de code de connexion : inscription", () => {
  it("couvre chaque canal de l'écran", () => {
    expect(CHANNELS.map((c) => c.channel).sort()).toEqual(Object.values(ChannelType).sort());
  });

  it("permet l'inscription par code e-mail sur la page utilisateur", () => {
    expect(request(CHANNELS[0], true)).toEqual({
      email: "a@exemple.org",
      options: { shouldCreateUser: true },
    });
  });

  it("permet l'inscription sur la page utilisateur par tous les canaux", () => {
    for (const entry of CHANNELS) {
      expect(request(entry, true)?.options.shouldCreateUser).toBe(true);
    }
    expect(request(CHANNELS[2], true)).toEqual({
      phone: "+224600000000",
      options: { channel: "sms", shouldCreateUser: true },
    });
    expect(request(CHANNELS[3], true)).toEqual({
      phone: "+224600000000",
      options: { channel: "whatsapp", shouldCreateUser: true },
    });
  });

  it("interdit toute création de compte depuis le back-office, par tous les canaux", () => {
    for (const entry of CHANNELS) {
      expect(request(entry, false)?.options.shouldCreateUser).toBe(false);
    }
  });

  it("envoie toujours shouldCreateUser explicitement (Supabase crée le compte par défaut)", () => {
    for (const entry of CHANNELS) {
      for (const allowSignup of [true, false]) {
        const options = request(entry, allowSignup)?.options ?? {};
        expect(Object.keys(options)).toContain("shouldCreateUser");
      }
    }
  });

  it("ne joint l'adresse de retour qu'au lien magique", () => {
    expect(request(CHANNELS[1], true)).toEqual({
      email: "a@exemple.org",
      options: { shouldCreateUser: true, emailRedirectTo: REDIRECT },
    });
    expect(request(CHANNELS[0], true)?.options).not.toHaveProperty("emailRedirectTo");
  });

  it("refuse un canal qui ne correspond pas à la méthode", () => {
    expect(
      buildOtpRequest({ method: AuthMethod.PHONE, channel: ChannelType.EMAIL_OTP, identifier: "+224", allowSignup: true, redirectUrl: REDIRECT }),
    ).toBeNull();
    expect(
      buildOtpRequest({ method: AuthMethod.EMAIL, channel: ChannelType.SMS, identifier: "a@exemple.org", allowSignup: true, redirectUrl: REDIRECT }),
    ).toBeNull();
  });

  it("reconnaît le refus d'inscription de Supabase", () => {
    expect(isSignupRefused({ message: "Signups not allowed for otp" })).toBe(true);
    expect(isSignupRefused(new Error("Signups not allowed for otp"))).toBe(true);
    expect(isSignupRefused({ code: "otp_disabled", message: "…" })).toBe(true);
    expect(isSignupRefused({ message: "Email rate limit exceeded" })).toBe(false);
    expect(isSignupRefused(null)).toBe(false);
  });
});

describe("Pages de connexion", () => {
  const hook = read("hooks/useAuth.ts");

  it("ouvre l'inscription sur la page utilisateur seulement", () => {
    expect(read("app/auth/login/page.tsx")).toContain('useAuth("/dashboard", { allowSignup: true })');
    expect(read("app/admin/login/page.tsx")).toContain('useAuth("/admin", { allowSignup: false })');
  });

  it("interdit l'inscription par défaut", () => {
    expect(hook).toContain("{ allowSignup = false }: UseAuthOptions = {}");
  });

  it("passe toute demande de code par buildOtpRequest", () => {
    expect(hook).toContain("const request = buildOtpRequest({");
    // Un seul appel à Supabase, sans option écrite à la main.
    expect(hook.match(/signInWithOtp\(/g)).toHaveLength(1);
    expect(hook).toContain("supabaseClient.auth.signInWithOtp(request)");
    expect(hook).not.toContain("shouldCreateUser");
  });

  it("donne un message clair au back-office quand le compte n'existe pas", () => {
    expect(hook).toContain("if (!allowSignup && isSignupRefused(error)) {");
    expect(hook).toContain("ERROR_MESSAGES.ACCOUNT_REQUIRED");
  });
});
