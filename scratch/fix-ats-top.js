const fs = require('fs');
let c = fs.readFileSync('src/app/api/ats/route.ts', 'utf8');

const regex = /\/\*\s*🛡️ Check Daily AI Credits 🛡️\s*\*\/[\s\S]*?status:\s*429\s*}\s*\);\s*}/;
const replacement = `/* 🛡️ Entitlement Check 🛡️ */
  const authHeader = req.headers.get("authorization");
  const entitlement = await verifyFeatureAccess(authHeader, 'ats');
  
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

c = c.replace(regex, replacement);
fs.writeFileSync('src/app/api/ats/route.ts', c);
console.log("Fixed ATS top");
