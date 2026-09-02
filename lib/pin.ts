import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

// Vérifie un PIN à l'aide du sel contenu dans le hash stocké (comparaison à temps constant).
export function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const candidate = scryptSync(pin, salt, KEY_LENGTH);
  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(candidate, expected);
}
