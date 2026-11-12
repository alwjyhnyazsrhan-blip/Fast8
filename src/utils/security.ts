/**
 * Client-Side Security & HMAC Signing Utility
 * Generates cryptographic signatures compatible with server/security.ts and Android AppSecurity.kt
 */

const XOR_KEY = 0x5a;
const OBFUSCATED_SALT = [
  0x36, 0x35, 0x39, 0x3b, 0x3e, 0x6f, 0x73, 0x3b, 0x36, 0x3e, 0x6e, 0x34, 0x35,
  0x3f, 0x6e, 0x39, 0x3e, 0x3e, 0x35, 0x34,
];

function getClientSecret(): string {
  const chars = OBFUSCATED_SALT.map((b) => String.fromCharCode(b ^ XOR_KEY));
  return chars.join("");
}

/**
 * Compute SHA-256 in browser
 */
export async function sha256Browser(message: string): Promise<string> {
  if (!message) return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate HMAC-SHA256 signature in browser
 */
export async function generateClientHmacSignature(
  deviceId: string,
  timestamp: number,
  nonce: string,
  bodyContent: string
): Promise<string> {
  try {
    const keyString = getClientSecret();
    const payloadHash = await sha256Browser(bodyContent);
    const dataToSign = `${deviceId}:${timestamp}:${nonce}:${payloadHash}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString);
    const messageData = encoder.encode(dataToSign);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.error("Signature computation fallback:", err);
    return "BROWSER_SIG_FALLBACK";
  }
}

/**
 * Generate secure headers for API calls
 */
export async function getSecureApiHeaders(
  deviceId: string,
  bodyContent = ""
): Promise<Record<string, string>> {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const signature = await generateClientHmacSignature(deviceId, timestamp, nonce, bodyContent);

  return {
    "Content-Type": "application/json",
    "X-Device-Id": deviceId,
    "X-Timestamp": timestamp.toString(),
    "X-Nonce": nonce,
    "X-Signature": signature,
    "X-Client-Shield": "PROGUARD-R8-COMPATIBLE-CLIENT",
  };
}

export interface SecurityStatus {
  r8Obfuscation: string;
  optimizationPasses: number;
  stringMasking: string;
  hmacSignatureValidation: string;
  antiReplay: string;
  defenseShield: string;
  antiReverseEngineering?: {
    antiDebugger: string;
    antiRoot: string;
    antiHookFridaXposed: string;
    antiRepackaging: string;
  };
}
