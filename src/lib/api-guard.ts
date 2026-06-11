/**
 * api-guard.ts
 *
 * Server-side security guard for Paperino AI endpoints.
 *
 * Provides:
 *  - Firebase ID token verification (re-uses existing verifyServerAuth)
 *  - Server-side daily usage tracking in Firestore REST API
 *  - In-memory IP rate limiting (per-serverless-instance, best-effort)
 *  - Request size / payload validation helpers
 */

import { verifyServerAuth } from "./auth-verify";
import { NextRequest, NextResponse } from "next/server";

/* ─── Constants ────────────────────────────────────────────────────── */

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "paperino-data";

/** Daily AI call limit per authenticated user */
const DAILY_AI_LIMIT = 30;

/** Hard rate-limit: max requests from a single IP per minute */
const IP_RATE_LIMIT_PER_MINUTE = 20;

/** Firestore date key: YYYY-MM-DD in IST (UTC+5:30) */
function todayKey(): string {
  const now = new Date();
  // Shift to IST (+5:30 = 330 min)
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10); // "2025-06-03"
}

/* ─── In-Memory IP Rate Limiter ─────────────────────────────────────
   Simple sliding-window per serverless instance.
   Resets when the cold-start happens. Good enough to stop scripts.  */

interface IPRecord {
  count: number;
  windowStart: number;
}
const ipStore = new Map<string, IPRecord>();

function isIPRateLimited(ip: string): boolean {
  const now = Date.now();
  const WINDOW_MS = 60_000; // 1 minute

  const record = ipStore.get(ip);
  if (!record || now - record.windowStart > WINDOW_MS) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return false;
  }
  record.count += 1;
  if (record.count > IP_RATE_LIMIT_PER_MINUTE) return true;
  return false;
}

/** Extract best-effort client IP from request headers */
function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/* ─── Firestore Usage Tracking ──────────────────────────────────────
   Stores daily usage in:
   users/{uid}/ai_usage/{YYYY-MM-DD}  →  { count: number }          */

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getUsageCount(
  uid: string,
  date: string,
  idToken: string
): Promise<number> {
  const url = `${FIRESTORE_BASE}/users/${uid}/ai_usage/${date}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.fields?.count?.integerValue
      ? parseInt(data.fields.count.integerValue, 10)
      : 0;
  } catch {
    return 0;
  }
}

async function incrementUsageCount(
  uid: string,
  date: string,
  currentCount: number,
  idToken: string
): Promise<void> {
  const url = `${FIRESTORE_BASE}/users/${uid}/ai_usage/${date}?updateMask.fieldPaths=count`;
  try {
    await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          count: { integerValue: currentCount + 1 },
        },
      }),
    });
  } catch (err) {
    console.error("[api-guard] Failed to increment usage count:", err);
  }
}

/* ─── Main Guard Function ───────────────────────────────────────────

   Call at the top of every protected API route:

   const guard = await runApiGuard(req);
   if (guard.blocked) return guard.response;
   // safe to use: guard.uid, guard.idToken                           */

export interface GuardResult {
  blocked: false;
  uid: string;
  email: string;
  role: string;
  idToken: string;
}

export interface GuardBlocked {
  blocked: true;
  response: NextResponse;
}

export async function runApiGuard(
  req: NextRequest
): Promise<GuardResult | GuardBlocked> {

  /* 1. IP rate limit (before anything expensive) */
  const ip = getClientIP(req);
  if (isIPRateLimited(ip)) {
    console.warn(`[api-guard] IP rate-limited: ${ip}`);
    return {
      blocked: true,
      response: NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      ),
    };
  }

  /* 2. Require Authorization header */
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      blocked: true,
      response: NextResponse.json(
        { error: "Authentication required. Please log in to use this feature." },
        { status: 401 }
      ),
    };
  }

  const idToken = authHeader.split(" ")[1];

  /* 3. Verify Firebase ID token server-side */
  const verifiedUser = await verifyServerAuth(authHeader);
  if (!verifiedUser) {
    return {
      blocked: true,
      response: NextResponse.json(
        { error: "Invalid or expired session. Please log in again." },
        { status: 401 }
      ),
    };
  }

  /* 4. Check server-side daily usage limit */
  const date = todayKey();
  const usageCount = await getUsageCount(verifiedUser.uid, date, idToken);

  if (verifiedUser.role !== "admin" && usageCount >= DAILY_AI_LIMIT) {
    console.warn(
      `[api-guard] Daily limit reached for uid=${verifiedUser.uid} (${usageCount}/${DAILY_AI_LIMIT})`
    );
    return {
      blocked: true,
      response: NextResponse.json(
        {
          error: `Daily AI limit reached (${DAILY_AI_LIMIT} requests/day). Come back tomorrow!`,
          limitReached: true,
          limit: DAILY_AI_LIMIT,
          used: usageCount,
        },
        { status: 429 }
      ),
    };
  }

  /* 5. Increment usage counter (fire-and-forget; don't block the response) */
  incrementUsageCount(verifiedUser.uid, date, usageCount, idToken);

  return {
    blocked: false,
    uid: verifiedUser.uid,
    email: verifiedUser.email,
    role: verifiedUser.role,
    idToken,
  };
}
