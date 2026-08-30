// ============================================
// ENUMS POUR L'AUTHENTIFICATION
// ============================================
export enum AuthMethod {
  PHONE = "phone",
  EMAIL = "email",
}

export enum AuthStep {
  IDLE = "idle",
  INPUT_CREDENTIALS = "input_credentials",
  OTP_VERIFICATION = "otp_verification",
  PIN_CREATION = "pin_creation", // Premier connexion / réinitialisation
  DASHBOARD = "dashboard",
}

export enum AuthStatus {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export enum ChannelType {
  SMS = "sms",
  WHATSAPP = "whatsapp",
  EMAIL_MAGIC_LINK = "email_magic_link",
  EMAIL_OTP = "email_otp",
}

// ============================================
// INTERFACES
// ============================================
export interface AuthState {
  method: AuthMethod;
  step: AuthStep;
  status: AuthStatus;
  identifier: string; // téléphone ou email
  otp: string;
  pin: string;
  error: string | null;
  channel: ChannelType;
  resendCountdown: number;
}
