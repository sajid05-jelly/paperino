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
export async function checkMonthlyUsage(uid: string, feature: MonthlyFeature): Promise<MonthlyUsageCheck> {
  const month = getCurrentMonthKey();

  if (!adminDb) {
    return { allowed: true, plan: "free", used: 0, limit: 5, remaining: 5, month };
  }

  try {
    // 1. Fetch user doc to determine plan
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const { plan } = getEffectivePlan(userData);

    const limit = getMonthlyLimit(plan, feature);

    // If unlimited (Pro/Premium)
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

    // 2. Fetch monthly usage doc
    const usageDocId = `${uid}_${month}`;
    const usageDoc = await adminDb.collection("user_monthly_usage").doc(usageDocId).get();
    const usageData = usageDoc.exists ? usageDoc.data() : {};
    const used = usageData?.[feature] || 0;

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
    // On unexpected error, do not completely crash
    return { allowed: true, plan: "free", used: 0, limit: 1, remaining: 1, month };
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
