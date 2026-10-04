const fs = require('fs');
const path = './src/lib/server-entitlement.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /\| "USAGE_VERIFICATION_UNAVAILABLE";/,
  `| "USAGE_VERIFICATION_UNAVAILABLE"\n  | "AUTH_REQUIRED";`
);

code = code.replace(
  /return \{ status: "USAGE_VERIFICATION_UNAVAILABLE", error: "Missing or invalid Authorization header\." \};/,
  `return { status: "AUTH_REQUIRED", error: "Missing or invalid Authorization header." };`
);

code = code.replace(
  /\} catch \(error\) \{\s*console\.error\('\[verifyFeatureAccess\] Error:', error\);\s*return \{ status: "USAGE_VERIFICATION_UNAVAILABLE", error: "Failed to verify account or usage limits\." \};\s*\}/,
  `} catch (error: any) {
    console.error('[verifyFeatureAccess] Error:', error);
    if (error.code && String(error.code).startsWith('auth/')) {
      return { status: "AUTH_REQUIRED", error: "Your session has expired. Please sign in again." };
    }
    return { status: "USAGE_VERIFICATION_UNAVAILABLE", error: "Unable to verify your usage right now. Please try again." };
  }`
);

code = code.replace(
  /export async function consumeFeatureUsage\(uid: string, feature: FeatureKey\): Promise<boolean> \{\s*try \{\s*const check = await checkAndConsumeMonthlyUsage\(uid, feature as any\);\s*return check\.allowed;\s*\} catch \(e\) \{\s*console\.error\("\[consumeFeatureUsage\] Error:", e\);\s*return false;\s*\}\s*\}/,
  `export async function consumeFeatureUsage(uid: string, feature: FeatureKey) {
  try {
    return await checkAndConsumeMonthlyUsage(uid, feature as any);
  } catch (e: any) {
    console.error("[consumeFeatureUsage] Error:", e);
    return {
      allowed: false,
      plan: "free" as PlanType,
      used: 0,
      limit: 0,
      remaining: 0,
      month: "",
      error: "Temporary system error while verifying usage limits. Please try again later."
    };
  }
}`
);

fs.writeFileSync(path, code);
console.log('Updated server-entitlement.ts');
