const fs = require('fs');

let content = fs.readFileSync('src/lib/server-entitlement.ts', 'utf8');

// 1. Update checkMonthlyUsage call in verifyFeatureAccess
content = content.replace(
  'const usageCheck = await checkMonthlyUsage(uid, feature as any);',
  'const usageCheck = await checkMonthlyUsage(uid, feature as any, plan);'
);

// 2. Update checkAndConsumeMonthlyUsage call in consumeFeatureUsage
content = content.replace(
  'return await checkAndConsumeMonthlyUsage(uid, feature);',
  `// Pass the resolved plan from token if we can, but we only have uid here. 
  // We should fetch the effective plan properly or just let it fall back.
  // Actually, consumeFeatureUsage only takes uid and feature. We should update its signature too.
  return await checkAndConsumeMonthlyUsage(uid, feature);`
);

// Let's actually update consumeFeatureUsage signature to accept plan
content = content.replace(
  'export async function consumeFeatureUsage(uid: string, feature: FeatureKey) {',
  'export async function consumeFeatureUsage(uid: string, feature: FeatureKey, resolvedPlan?: PlanType) {'
);

content = content.replace(
  'return await checkAndConsumeMonthlyUsage(uid, feature);',
  'return await checkAndConsumeMonthlyUsage(uid, feature, resolvedPlan);'
);

fs.writeFileSync('src/lib/server-entitlement.ts', content);
