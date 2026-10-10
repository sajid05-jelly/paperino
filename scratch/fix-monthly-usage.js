const fs = require('fs');

let content = fs.readFileSync('src/lib/monthly-usage.ts', 'utf8');

// 1. Update checkMonthlyUsage
content = content.replace(
  'export async function checkMonthlyUsage(uid: string, feature: MonthlyFeature): Promise<MonthlyUsageCheck> {',
  'export async function checkMonthlyUsage(uid: string, feature: MonthlyFeature, resolvedPlan?: PlanType): Promise<MonthlyUsageCheck> {'
);

const checkLogicToReplace = `    // 1. Fetch user doc to determine plan
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const { plan } = getEffectivePlan(userData);`;

const checkLogicReplacement = `    // 1. Determine plan
    let plan = resolvedPlan;
    if (!plan) {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      plan = getEffectivePlan(userData).plan;
    }`;

content = content.replace(checkLogicToReplace, checkLogicReplacement);

// 2. Update checkAndConsumeMonthlyUsage
content = content.replace(
  'export async function checkAndConsumeMonthlyUsage(uid: string, feature: MonthlyFeature): Promise<MonthlyUsageCheck> {',
  'export async function checkAndConsumeMonthlyUsage(uid: string, feature: MonthlyFeature, resolvedPlan?: PlanType): Promise<MonthlyUsageCheck> {'
);

const consumeLogicToReplace = `    // 1. Determine plan and limit
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const { plan } = getEffectivePlan(userData);`;

const consumeLogicReplacement = `    // 1. Determine plan and limit
    let plan = resolvedPlan;
    if (!plan) {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      plan = getEffectivePlan(userData).plan;
    }`;

content = content.replace(consumeLogicToReplace, consumeLogicReplacement);

fs.writeFileSync('src/lib/monthly-usage.ts', content);
