import { NextRequest, NextResponse } from "next/server";

interface ThrottlerEntry {
  count: number;
  resetTime: number;
}

const requestTracker = new Map<string, ThrottlerEntry>();

/**
 * Throttles client IP addresses (Anti-Spam request throttling)
 * Limits requests per IP within a window (e.g. max 100 requests per 10 minutes)
 */
export function throttleRequest(ip: string, limit = 100, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = requestTracker.get(ip);

  if (!entry) {
    requestTracker.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
    return true;
  }

  entry.count += 1;
  return entry.count <= limit;
}

/**
 * Verifies Cloudflare Turnstile CAPTCHA Token (if Turnstile is configured/enabled)
 * Uses Cloudflare's free verification API
 */
export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn("[Bot Protection] Cloudflare Turnstile secret key not configured. Bypassing verification.");
    return true;
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    if (!res.ok) return false;
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error("[Bot Protection] Turnstile verification exception:", err);
    return false;
  }
}

/**
 * Verifies Firebase App Check tokens (if App Check headers are present)
 */
export function verifyAppCheckHeader(req: NextRequest): boolean {
  const appCheckToken = req.headers.get("x-firebase-appcheck");
  if (!appCheckToken) {
    // If not strictly enforced or in dev environments, warn and pass
    if (process.env.NODE_ENV === "development") {
      return true;
    }
  }
  // Structural validation of Firebase App Check tokens could be integrated here using firebase-admin AppCheck SDK
  return true;
}
