import crypto from "crypto";

export interface DownloadTokenPayload {
  uid: string;
  name: string;
  email: string;
  isAdmin: boolean;
  plan?: string;
  exp: number; // epoch ms
}

function getDownloadTokenSecret(): string {
  if (process.env.DOWNLOAD_TOKEN_SECRET) return process.env.DOWNLOAD_TOKEN_SECRET;
  if (process.env.RAZORPAY_KEY_SECRET) return process.env.RAZORPAY_KEY_SECRET;
  if (process.env.FIREBASE_PRIVATE_KEY) return process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      if (sa.private_key) return sa.private_key;
    } catch {}
  }
  return (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "paperino-secure-watermark-token-secret-key-2026"
  );
}

/**
 * Creates a tamper-proof cryptographically signed download token.
 * Embeds user identity (UID, Gmail name, email, admin claims) directly in the token,
 * eliminating brittle Firestore round-trips, replication delays, and quota exhaustion failures.
 */
export function createSignedDownloadToken(
  payload: Omit<DownloadTokenPayload, "exp">,
  expiresInMinutes = 15
): string {
  const data: DownloadTokenPayload = {
    ...payload,
    exp: Date.now() + expiresInMinutes * 60 * 1000,
  };
  const jsonStr = JSON.stringify(data);
  const base64Data = Buffer.from(jsonStr, "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getDownloadTokenSecret())
    .update(base64Data)
    .digest("base64url");
  return `${base64Data}.${signature}`;
}

/**
 * Verifies and decodes a signed download token.
 * Returns the validated payload or null if invalid, expired, or tampered with.
 */
export function verifySignedDownloadToken(tokenString?: string | null): DownloadTokenPayload | null {
  if (!tokenString || typeof tokenString !== "string" || !tokenString.includes(".")) {
    return null;
  }
  const parts = tokenString.split(".");
  if (parts.length !== 2) return null;
  const [base64Data, signature] = parts;
  if (!base64Data || !signature) return null;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", getDownloadTokenSecret())
      .update(base64Data)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const jsonStr = Buffer.from(base64Data, "base64url").toString("utf8");
    const payload: DownloadTokenPayload = JSON.parse(jsonStr);

    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired token
    }

    if (!payload.uid || payload.uid === "GUEST") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
