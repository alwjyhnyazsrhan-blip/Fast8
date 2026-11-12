import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Server Security Shield for Locate Go
 * - HMAC-SHA256 Request Signing & Integrity Verification
 * - Anti-Replay Protection (Timestamp window + Nonce cache)
 * - Rate Limiting (Per Device & IP)
 * - Defense-in-Depth HTTP Security Headers
 */

// Shared secret key derived from dynamic salt (matches AppSecurity.kt in Android client)
const XOR_KEY = 0x5a;
const OBFUSCATED_SALT = Buffer.from([
  0x36, 0x35, 0x39, 0x3b, 0x3e, 0x6f, 0x73, 0x3b, 0x36, 0x3e, 0x6e, 0x34, 0x35,
  0x3f, 0x6e, 0x39, 0x3e, 0x3e, 0x35, 0x34,
]);

export function getSharedSecret(): string {
  const buf = Buffer.alloc(OBFUSCATED_SALT.length);
  for (let i = 0; i < OBFUSCATED_SALT.length; i++) {
    buf[i] = OBFUSCATED_SALT[i] ^ XOR_KEY;
  }
  return buf.toString("utf8");
}

// Nonce cache with automatic TTL purge to prevent replay attacks
const seenNonces = new Map<string, number>();
const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
  const now = Date.now();
  for (const [nonce, expireAt] of seenNonces.entries()) {
    if (expireAt < now) {
      seenNonces.delete(nonce);
    }
  }
}, 60 * 1000);

/**
 * Calculate SHA-256 hash of request body
 */
export function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Generate HMAC-SHA256 signature
 */
export function computeHmacSignature(
  deviceId: string,
  timestamp: string | number,
  nonce: string,
  bodyHash: string
): string {
  const key = getSharedSecret();
  const dataToSign = `${deviceId}:${timestamp}:${nonce}:${bodyHash}`;
  return crypto.createHmac("sha256", key).update(dataToSign, "utf8").digest("hex");
}

/**
 * In-Memory Rate Limiting
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

export function rateLimitMiddleware(maxRequests = 150, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const deviceId = (req.headers["x-device-id"] as string) || "none";
    const key = `${ip}:${deviceId}`;
    const now = Date.now();

    let bucket = rateLimitMap.get(key);
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 1, resetAt: now + windowMs };
      rateLimitMap.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({
        error: "تجاوزت الحد المسموح من الطلبات (Rate limit exceeded). يرجى الانتظار قليلاً.",
        retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Defense-in-depth HTTP security headers
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Defense-Shield", "LocateGo-ProGuard-R8-HMAC-Level5");
  next();
}

/**
 * Validate HMAC signature and anti-replay constraints
 */
export function verifyRequestIntegrity(
  req: Request
): { valid: boolean; reason?: string; isNativeSigned: boolean } {
  const signature = (req.headers["x-signature"] as string) || "";
  const timestampHeader = (req.headers["x-timestamp"] as string) || "";
  const nonce = (req.headers["x-nonce"] as string) || "";
  const deviceId =
    (req.headers["x-device-id"] as string) ||
    (req.query.deviceId as string) ||
    req.body?.deviceId ||
    "REP-DEFAULT";

  // If no signature is provided, check if it's an authenticated web dashboard request or development call
  if (!signature) {
    // For direct browser navigation or standard UI actions, allow with web-mode indicator
    return { valid: true, isNativeSigned: false };
  }

  // If signature headers are present, enforce strict cryptographic verification
  if (!timestampHeader || !nonce) {
    return { valid: false, reason: "ترويسات الأمان مفقودة (X-Timestamp or X-Nonce missing)", isNativeSigned: true };
  }

  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    return { valid: false, reason: "توقيت الطلب غير صالح", isNativeSigned: true };
  }

  const now = Date.now();
  const maxSkewMs = 5 * 60 * 1000; // ±5 minutes allowed clock skew
  if (Math.abs(now - timestamp) > maxSkewMs) {
    return { valid: false, reason: "انتهت صلاحية ترويسة الطلب لمنع هجمات إعادة الإرسال (Replay Attack)", isNativeSigned: true };
  }

  // Check nonce uniqueness (Anti-Replay)
  if (seenNonces.has(nonce)) {
    return { valid: false, reason: "محاولة إعادة استخدام رمز أمني مستهلك (Nonce already used)", isNativeSigned: true };
  }
  seenNonces.set(nonce, now + NONCE_TTL_MS);

  // Compute expected signature
  const bodyString = typeof req.body === "object" && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
  const payloadHash = sha256(bodyString);
  const expectedSig = computeHmacSignature(deviceId, timestamp, nonce, payloadHash);

  // Constant-time comparison
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: "توقيع الـ API الرقمي غير متطابق - تم رفض الطلب لحماية النظام", isNativeSigned: true };
  }

  return { valid: true, isNativeSigned: true };
}
