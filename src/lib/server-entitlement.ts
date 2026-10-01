import { adminDb, adminAuth } from './firebase-admin';
import { checkMonthlyUsage, checkAndConsumeMonthlyUsage } from './monthly-usage';
import { getEffectivePlan, getMonthlyLimit, PlanType, FeatureKey } from './subscription';

export type EntitlementStatus = 
  | "ALLOWED"
  | "LIMIT_REACHED"
  | "FEATURE_NOT_AVAILABLE_FOR_PLAN"
  | "USAGE_VERIFICATION_UNAVAILABLE";

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
    return { status: "USAGE_VERIFICATION_UNAVAILABLE", error: "Missing or invalid Authorization header." };
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // Apply server-side token claim override exactly like frontend
    let planClaim: PlanType | null = (decodedToken.plan as PlanType) || null;
    let effectivePlanObj = getEffectivePlan(userData);
    
    // Override db plan with token plan if token plan is higher/exists (similar to download API)
    if (planClaim && planClaim !== "free") {
        effectivePlanObj.plan = planClaim;
    }

    const { plan } = effectivePlanObj;

    // Admin bypass
    if (userData?.role === 'admin') {
      return { status: "ALLOWED", uid, role: 'admin', plan: "premium", used: 0, limit: Infinity };
    }

    const limit = getMonthlyLimit(plan, feature as any);

    if (limit <= 0) {
      return {
        status: "FEATURE_NOT_AVAILABLE_FOR_PLAN",
        uid,
        role: userData?.role || 'student',
        plan,
        used: 0,
        limit: 0,
        error: "Feature is not available on your current plan."
      };
    }

    // Check usage WITHOUT consuming
    const usageCheck = await checkMonthlyUsage(uid, feature as any);
    if (!usageCheck.allowed) {
      if (usageCheck.error && usageCheck.error.includes("System error")) {
        return {
          status: "USAGE_VERIFICATION_UNAVAILABLE",
          uid, plan, error: "Temporary system error while verifying usage limits."
        };
      }
      return {
        status: "LIMIT_REACHED",
        uid, role: userData?.role || 'student', plan,
        used: usageCheck.used, limit: usageCheck.limit,
        error: usageCheck.error || "Monthly limit reached."
      };
    }

    return {
      status: "ALLOWED",
      uid, role: userData?.role || 'student', plan,
      used: usageCheck.used, limit: usageCheck.limit
    };
  } catch (error) {
    console.error('[verifyFeatureAccess] Error:', error);
    return { status: "USAGE_VERIFICATION_UNAVAILABLE", error: "Failed to verify account or usage limits." };
  }
}

/**
 * Atomically consumes usage. Call this right before AI execution.
 */
export async function consumeFeatureUsage(uid: string, feature: FeatureKey): Promise<boolean> {
  try {
    const check = await checkAndConsumeMonthlyUsage(uid, feature as any);
    return check.allowed;
  } catch (e) {
    console.error("[consumeFeatureUsage] Error:", e);
    return false;
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
