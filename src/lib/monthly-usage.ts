import { adminDb } from "./firebase-admin";
import { getCurrentMonthKey, getEffectivePlan, getMonthlyLimit, PlanType } from "./subscription";

export type MonthlyFeature = "downloads" | "pyqAnalyzer" | "ats" | "examEmergency" | "githubIntelligence";

export interface MonthlyUsageCheck {
  allowed: boolean;
  plan: PlanType;
  used: number;
  limit: number;
  remaining: number;
  month: string;
  error?: string;
}

/**
 * Check if user is within monthly limit for a specific feature
 */
export async function checkMonthlyUsage(uid: string, feature: MonthlyFeature, resolvedPlan?: PlanType): Promise<MonthlyUsageCheck> {
  const month = getCurrentMonthKey();

  if (!adminDb) {
    return { 
      allowed: false, 
      plan: "free", 
      used: 0, 
      limit: 0, 
      remaining: 0, 
      month,
      error: "System configuration error. Please try again later."
    };
  }

  try {
    let plan: PlanType = resolvedPlan || "free";

    if (!resolvedPlan) {
      try {
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        plan = getEffectivePlan(userData).plan;
      } catch (fErr) {
        // Fallback to Firebase Auth Custom Claims when Firestore read quota is exhausted
        try {
          const { adminAuth } = await import("./firebase-admin");
          if (adminAuth) {
            const uRec = await adminAuth.getUser(uid);
            const claimPlan = uRec.customClaims?.plan as PlanType;
            if (claimPlan && ["plus", "pro", "premium"].includes(claimPlan)) {
              plan = claimPlan;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const limit = getMonthlyLimit(plan, feature);

    // If unlimited (Pro/Premium) - grant immediate access without needing to read usage
    if (limit === Infinity) {
      return { allowed: true, plan, used: 0, limit: Infinity, remaining: Infinity, month };
    }

    // If feature is disabled (0 limit)
    if (limit <= 0) {
      return {
        allowed: false,
        plan,
        used: 0,
        limit: 0,
        remaining: 0,
        month,
        error: `This feature is not available on the ${plan.toUpperCase()} plan. Please upgrade to unlock.`
      };
    }

    // 2. Fetch monthly usage doc (with graceful fallback if quota exhausted)
    let used = 0;
    try {
      const usageDocId = `${uid}_${month}`;
      const usageDoc = await adminDb.collection("user_monthly_usage").doc(usageDocId).get();
      const usageData = usageDoc.exists ? usageDoc.data() : {};
      used = usageData?.[feature] || 0;
    } catch (uErr) {
      console.warn(`[checkMonthlyUsage] Could not read user_monthly_usage (quota?):`, uErr);
      // If we cannot read usage counter due to quota, allow user to proceed rather than blocking
      used = 0;
    }

    if (used >= limit) {
      return {
        allowed: false,
        plan,
        used,
        limit,
        remaining: 0,
        month,
        error: `You have reached your monthly limit of ${limit} for this feature on the ${plan.toUpperCase()} plan.`
      };
    }

    return {
      allowed: true,
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      month
    };
  } catch (err: any) {
    console.error(`[checkMonthlyUsage] Error checking ${feature} for ${uid}:`, err);
    // If user is Pro or Premium, always allow
    if (resolvedPlan === "premium" || resolvedPlan === "pro") {
      return { allowed: true, plan: resolvedPlan, used: 0, limit: Infinity, remaining: Infinity, month };
    }
    return { 
      allowed: false, 
      plan: resolvedPlan || "free", 
      used: 0, 
      limit: getMonthlyLimit(resolvedPlan || "free", feature) || 5, 
      remaining: 0, 
      month,
      error: "Temporary system error while verifying usage limits. Please try again later."
    };
  }
}

/**
 * Increment monthly usage counter for a user
 */
export async function incrementMonthlyUsage(uid: string, feature: MonthlyFeature): Promise<number> {
  if (!adminDb) return 0;
  const month = getCurrentMonthKey();
  const usageDocId = `${uid}_${month}`;
  const usageRef = adminDb.collection("user_monthly_usage").doc(usageDocId);

  try {
    let newCount = 1;
    await adminDb.runTransaction(async (t) => {
      const snap = await t.get(usageRef);
      if (snap.exists) {
        const data = snap.data();
        newCount = (data?.[feature] || 0) + 1;
        t.update(usageRef, {
          [feature]: newCount,
          updatedAt: Date.now()
        });
      } else {
        newCount = 1;
        t.set(usageRef, {
          uid,
          month,
          downloads: feature === "downloads" ? 1 : 0,
          pyqAnalyzer: feature === "pyqAnalyzer" ? 1 : 0,
          ats: feature === "ats" ? 1 : 0,
          examEmergency: feature === "examEmergency" ? 1 : 0,
          githubIntelligence: feature === "githubIntelligence" ? 1 : 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    });
    return newCount;
  } catch (err: any) {
    console.error(`[incrementMonthlyUsage] Error incrementing ${feature} for ${uid}:`, err);
    return 0;
  }
}

/**
 * Atomically check and consume monthly usage to prevent race conditions.
 * MUST be called BEFORE executing expensive operations.
 */
export async function checkAndConsumeMonthlyUsage(uid: string, feature: MonthlyFeature, resolvedPlan?: PlanType): Promise<MonthlyUsageCheck> {
  const month = getCurrentMonthKey();

  if (!adminDb) {
    return { 
      allowed: false, plan: "free", used: 0, limit: 0, remaining: 0, month,
      error: "System configuration error. Please try again later."
    };
  }

  try {
    // 1. Determine plan and limit
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const { plan } = getEffectivePlan(userData);
    const limit = getMonthlyLimit(plan, feature);

    if (limit === Infinity) {
      return { allowed: true, plan, used: 0, limit: Infinity, remaining: Infinity, month };
    }
    if (limit <= 0) {
      return {
        allowed: false, plan, used: 0, limit: 0, remaining: 0, month,
        error: `This feature is not available on the ${plan.toUpperCase()} plan. Please upgrade to unlock.`
      };
    }

    // 2. Atomic read + increment
    const usageDocId = `${uid}_${month}`;
    const usageRef = adminDb.collection("user_monthly_usage").doc(usageDocId);

    const result = await adminDb.runTransaction(async (t) => {
      const snap = await t.get(usageRef);
      let used = 0;
      
      if (snap.exists) {
        used = snap.data()?.[feature] || 0;
      }

      if (used >= limit) {
        return {
          allowed: false, plan, used, limit, remaining: 0, month,
          error: `You have reached your monthly limit of ${limit} for this feature on the ${plan.toUpperCase()} plan.`
        };
      }

      // Safe to consume
      const newCount = used + 1;
      if (snap.exists) {
        t.update(usageRef, { [feature]: newCount, updatedAt: Date.now() });
      } else {
        t.set(usageRef, {
          uid, month,
          downloads: feature === "downloads" ? 1 : 0,
          pyqAnalyzer: feature === "pyqAnalyzer" ? 1 : 0,
          ats: feature === "ats" ? 1 : 0,
          examEmergency: feature === "examEmergency" ? 1 : 0,
          githubIntelligence: feature === "githubIntelligence" ? 1 : 0,
          createdAt: Date.now(), updatedAt: Date.now()
        });
      }

      return {
        allowed: true, plan, used: newCount, limit, remaining: limit - newCount, month
      };
    });

    return result;

  } catch (err: any) {
    console.error(`[checkAndConsumeMonthlyUsage] Error for ${uid}:`, err);
    // FAIL-CLOSED
    return { 
      allowed: false, plan: "free", used: 0, limit: 0, remaining: 0, month,
      error: "Temporary system error while verifying usage limits. Please try again later."
    };
  }
}
