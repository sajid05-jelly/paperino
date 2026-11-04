import { adminDb, adminAuth } from './firebase-admin';
import { checkMonthlyUsage, checkAndConsumeMonthlyUsage } from './monthly-usage';
import { getEffectivePlan, getMonthlyLimit, isFeatureAllowed, isCountedMonthlyFeature, PlanType, FeatureKey } from './subscription';

export type EntitlementStatus = 
  | "ALLOWED"
  | "LIMIT_REACHED"
  | "FEATURE_NOT_AVAILABLE_FOR_PLAN"
  | "USAGE_VERIFICATION_UNAVAILABLE"
  | "AUTH_REQUIRED";

export interface EntitlementResult {
  status: EntitlementStatus;
  uid?: string;
  role?: string;
  plan?: PlanType;
  used?: number;
  limit?: number;
  error?: string;
}

export async function verifyFeatureAccess(
  authHeader: string | null,
  feature: FeatureKey
): Promise<EntitlementResult> {
  if (!adminAuth || !adminDb) {
    return { status: "USAGE_VERIFICATION_UNAVAILABLE", error: "Firebase Admin not initialized." };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { status: "AUTH_REQUIRED", error: "Missing or invalid Authorization header." };
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const roleClaim = (decodedToken.role as string) || "";
    const planClaim = (decodedToken.plan as PlanType) || null;
    const claimSubStatus = ((decodedToken.razorpaySubscriptionStatus as string) || "").toLowerCase();
    const isClaimCancelled = ["cancelled", "canceled", "halted", "completed", "expired", "inactive", "failed", "unpaid"].includes(claimSubStatus);

    // Fast-path 1: Immediate admin bypass
    if (roleClaim === 'admin') {
      return { status: "ALLOWED", uid, role: 'admin', plan: "premium", used: 0, limit: Infinity };
    }

    // Fast-path 2: If custom claims explicitly certify an active Premium subscriber, grant immediate unlimited access
    // This provides 100% resilience against Firestore Spark read quota exhaustion
    if (!isClaimCancelled && planClaim === "premium") {
      return { status: "ALLOWED", uid, role: roleClaim || 'student', plan: "premium", used: 0, limit: Infinity };
    }

    // Resilient Firestore user doc lookup
    let userData: any = null;
    try {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      userData = userDoc.exists ? userDoc.data() : null;
    } catch (dbErr) {
      console.warn('[verifyFeatureAccess] Firestore user fetch skipped due to quota or network:', dbErr);
    }

    // Determine effective plan combining Firestore and token claims
    let effectivePlanObj = getEffectivePlan(userData);
    const userDbSubStatus = ((userData?.razorpaySubscriptionStatus as string) || (userData?.subscriptionStatus as string) || "").toLowerCase();
    const isDbCancelled = ["cancelled", "canceled", "halted", "completed", "expired", "inactive", "failed", "unpaid"].includes(userDbSubStatus);

    if (!isClaimCancelled && !isDbCancelled && planClaim && planClaim !== "free") {
      effectivePlanObj.plan = planClaim;
    }

    const { plan } = effectivePlanObj;

    // Admin check from user doc
    if (userData?.role === 'admin') {
      return { status: "ALLOWED", uid, role: 'admin', plan: "premium", used: 0, limit: Infinity };
    }

    // ── BOOLEAN FEATURE CHECK (e.g. careerDna, pdfPreview, etc.) ──
    if (!isCountedMonthlyFeature(feature as string)) {
      const allowed = isFeatureAllowed(plan, feature);
      if (!allowed) {
        return {
          status: "FEATURE_NOT_AVAILABLE_FOR_PLAN",
          uid,
          role: userData?.role || roleClaim || 'student',
          plan,
          used: 0,
          limit: 0,
          error: "Career DNA is available with Paperino Pro or Premium."
        };
      }
      return {
        status: "ALLOWED",
        uid,
        role: userData?.role || roleClaim || 'student',
        plan,
        used: 0,
        limit: Infinity
      };
    }

    // ── COUNTED MONTHLY FEATURE CHECK (ats, githubIntelligence, etc.) ──
    const limit = getMonthlyLimit(plan, feature);

    // Unlimited plans (e.g. Premium for all tools, Pro for downloads) bypass usage check completely
    if (limit === Infinity) {
      return {
        status: "ALLOWED",
        uid,
        role: userData?.role || roleClaim || 'student',
        plan,
        used: 0,
        limit: Infinity
      };
    }

    if (limit <= 0) {
      return {
        status: "FEATURE_NOT_AVAILABLE_FOR_PLAN",
        uid,
        role: userData?.role || roleClaim || 'student',
        plan,
        used: 0,
        limit: 0,
        error: "Feature is not available on your current plan."
      };
    }

    // Check usage WITHOUT consuming for metered plans
    const usageCheck = await checkMonthlyUsage(uid, feature as any, plan);
    if (!usageCheck.allowed) {
      if (usageCheck.error && usageCheck.error.includes("System error")) {
        return {
          status: "USAGE_VERIFICATION_UNAVAILABLE",
          uid, plan, error: "Temporary system error while verifying usage limits."
        };
      }
      return {
        status: "LIMIT_REACHED",
        uid, role: userData?.role || roleClaim || 'student', plan,
        used: usageCheck.used, limit: usageCheck.limit,
        error: usageCheck.error || "Monthly limit reached."
      };
    }

    return {
      status: "ALLOWED",
      uid, role: userData?.role || roleClaim || 'student', plan,
      used: usageCheck.used, limit: usageCheck.limit
    };
  } catch (error: any) {
    console.error('[verifyFeatureAccess] Error:', error);
    if (error.code && String(error.code).startsWith('auth/')) {
      return { status: "AUTH_REQUIRED", error: "Your session has expired. Please sign in again." };
    }
    return { status: "USAGE_VERIFICATION_UNAVAILABLE", error: "Unable to verify your usage right now. Please try again." };
  }
}

/**
 * Atomically consumes usage. Call this right before AI execution.
 */
export async function consumeFeatureUsage(uid: string, feature: FeatureKey, resolvedPlan?: PlanType) {
  // Premium users have unlimited access - skip counter consumption entirely
  if (resolvedPlan === "premium") {
    return {
      allowed: true,
      plan: "premium" as PlanType,
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      month: "",
    };
  }

  try {
    return await checkAndConsumeMonthlyUsage(uid, feature as any, resolvedPlan);
  } catch (e: any) {
    console.error("[consumeFeatureUsage] Error:", e);
    return {
      allowed: false,
      plan: resolvedPlan || "free" as PlanType,
      used: 0,
      limit: 0,
      remaining: 0,
      month: "",
      error: "Temporary system error while verifying usage limits. Please try again later."
    };
  }
}

/**
 * Refunds usage if AI fails after consumption
 */
export async function refundFeatureUsage(uid: string, feature: FeatureKey): Promise<void> {
  const db = adminDb;
  if (!db) return;
  const { getCurrentMonthKey } = require('./subscription');
  const month = getCurrentMonthKey();
  const usageDocId = `${uid}_${month}`;
  
  try {
    await db.runTransaction(async (t) => {
      const usageRef = db.collection("user_monthly_usage").doc(usageDocId);
      const snap = await t.get(usageRef);
      if (snap.exists) {
        const current = snap.data()?.[feature] || 0;
        if (current > 0) {
          t.update(usageRef, { [feature]: current - 1 });
        }
      }
    });
  } catch (e) {
    console.error("[refundFeatureUsage] Error:", e);
  }
}
