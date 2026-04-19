import * as OTPAuth from "otpauth";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { db } from "./db";
import { adminSettings } from "../shared/schema";
import { eq } from "drizzle-orm";

// DB keys
const KEY_PENDING = "totp_secret_pending"; // generated but not yet confirmed
const KEY_ACTIVE  = "totp_secret";          // confirmed and live

const SESSION_HOURS = 8;

let _cachedEnabled: boolean | null = null;
export function clearTwoFaCache() { _cachedEnabled = null; }

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(adminSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: adminSettings.key, set: { value, updatedAt: new Date() } });
}

async function deleteSetting(key: string) {
  await db.delete(adminSettings).where(eq(adminSettings.key, key));
}

// isTwoFaEnabled: only returns true when there is a CONFIRMED active secret
export async function isTwoFaEnabled(): Promise<boolean> {
  if (_cachedEnabled !== null) return _cachedEnabled;
  const active = await getSetting(KEY_ACTIVE);
  _cachedEnabled = active !== null;
  return _cachedEnabled;
}

// Generate a pending TOTP secret + QR code — does NOT activate 2FA yet
export async function generatePendingTotpSecret(): Promise<{
  secret: string;
  otpauthUri: string;
  qrDataUrl: string;
}> {
  const totp = new OTPAuth.TOTP({
    issuer: "FedTzuu",
    label: "Admin Console",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const secret = totp.secret.base32;
  const otpauthUri = totp.toString();
  await setSetting(KEY_PENDING, secret);

  const qrDataUrl = await QRCode.toDataURL(otpauthUri);
  return { secret, otpauthUri, qrDataUrl };
}

// Confirm the pending secret with a TOTP code → activates 2FA
export async function confirmAndActivateTwoFa(code: string): Promise<boolean> {
  const pending = await getSetting(KEY_PENDING);
  if (!pending) return false;

  const totp = new OTPAuth.TOTP({
    issuer: "FedTzuu",
    label: "Admin Console",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(pending),
  });

  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  if (delta === null) return false;

  await setSetting(KEY_ACTIVE, pending);
  await deleteSetting(KEY_PENDING);
  clearTwoFaCache();
  return true;
}

// Verify a TOTP code against the ACTIVE secret
export async function verifyTotpCode(code: string): Promise<boolean> {
  const secret = await getSetting(KEY_ACTIVE);
  if (!secret) return false;

  const totp = new OTPAuth.TOTP({
    issuer: "FedTzuu",
    label: "Admin Console",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  return delta !== null;
}

// Generate an 8-hour admin session JWT
export function generateAdminSession(): string {
  const secret = process.env.ADMIN_SECRET!;
  return jwt.sign({ sub: "admin", role: "admin" }, secret, { expiresIn: `${SESSION_HOURS}h` });
}

// Verify an admin session JWT
export function verifyAdminSession(token: string): boolean {
  try {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) return false;
    const payload = jwt.verify(token, secret) as { role?: string };
    return payload?.role === "admin";
  } catch {
    return false;
  }
}

// Disable 2FA — removes both active and pending secrets
export async function disableTwoFa(): Promise<void> {
  await deleteSetting(KEY_ACTIVE);
  await deleteSetting(KEY_PENDING);
  clearTwoFaCache();
}
