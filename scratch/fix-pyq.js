const fs = require('fs');
let c = fs.readFileSync('src/app/api/pyq/route.ts', 'utf8');

c = c.replace(
  'import { checkAndGetCredits, incrementCreditUsage } from "@/lib/credits-manager";',
  'import { verifyFeatureAccess, consumeFeatureUsage, refundFeatureUsage } from "@/lib/server-entitlement";'
);

const topRegex = /\/\*\s*🛡️ Check Daily AI Credits 🛡️\s*\*\/[\s\S]*?status:\s*429\s*}\s*\);\s*}/m;
const topReplacement = `/* 🛡️ Check Entitlement 🛡️ */
  const authHeader = req.headers.get("authorization");
  const entitlement = await verifyFeatureAccess(authHeader, 'pyqAnalyzer');
  
  if (entitlement.status !== "ALLOWED") {
    const statusCode = entitlement.status === "LIMIT_REACHED" ? 429 : 403;
    return NextResponse.json(
      { 
        error: entitlement.error || "Access denied.",
        status: entitlement.status,
        plan: entitlement.plan || "free",
        limit: entitlement.limit || 0,
        used: entitlement.used || 0
      },
      { status: statusCode }
    );
  }`;
c = c.replace(topRegex, topReplacement);

const aiCallRegex = /try\s*{\s*const result = await analyzeLargePYQ\(fullText, subject\);\s*\/\/ Increment credit usage\s*if\s*\(creditCheck\.uid\)[\s\S]*?return NextResponse\.json\(result\);\s*}\s*catch\s*\(error:\s*any\)\s*{\s*console\.error\("\[PYQ\] Error:",\s*error\);/m;
const aiCallReplacement = `// CONSUME USAGE SAFELY BEFORE AI
    if (entitlement.uid && entitlement.limit !== Infinity) {
      const consumed = await consumeFeatureUsage(entitlement.uid, 'pyqAnalyzer');
      if (!consumed) {
         return NextResponse.json({ error: "Failed to allocate monthly usage limit." }, { status: 429 });
      }
    }

    try {
      const result = await analyzeLargePYQ(fullText, subject);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error("[PYQ] Error:", error);
      if (entitlement.uid && entitlement.limit !== Infinity) {
          await refundFeatureUsage(entitlement.uid, 'pyqAnalyzer');
      }`;
c = c.replace(aiCallRegex, aiCallReplacement);

fs.writeFileSync('src/app/api/pyq/route.ts', c);
console.log("Replaced PYQ Analyzer successfully");
