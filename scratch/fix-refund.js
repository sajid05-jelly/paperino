const fs = require('fs');
let c = fs.readFileSync('src/lib/server-entitlement.ts', 'utf8');

c = c.replace(/adminDb as any/g, 'adminDb');

const regex = /export async function refundFeatureUsage\(uid: string, feature: FeatureKey\): Promise<void> \{\n\s*if \(!adminDb\) return;\n\s*const \{ getCurrentMonthKey \} = require\('\.\/subscription'\);\n\s*const month = getCurrentMonthKey\(\);\n\s*const usageDocId = `\$\{uid\}_\$\{month\}`;\n\s*try \{\n\s*await adminDb\.runTransaction\(async \(t\) => \{\n\s*const usageRef = adminDb\.collection\("user_monthly_usage"\)\.doc\(usageDocId\);/m;

const replacement = `export async function refundFeatureUsage(uid: string, feature: FeatureKey): Promise<void> {
  const db = adminDb;
  if (!db) return;
  const { getCurrentMonthKey } = require('./subscription');
  const month = getCurrentMonthKey();
  const usageDocId = \`\${uid}_\${month}\`;
  
  try {
    await db.runTransaction(async (t) => {
      const usageRef = db.collection("user_monthly_usage").doc(usageDocId);`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/lib/server-entitlement.ts', c);
console.log("Fixed refundFeatureUsage");
