const fs = require('fs');
let c = fs.readFileSync('src/app/api/assistant/route.ts', 'utf8');

c = `import { verifyFeatureAccess } from "@/lib/server-entitlement";\n` + c;

const replaceRegex = /export async function POST\(req: NextRequest\) {\n  \/\* [\s\S]*? \*\/\n  const guard = await runApiGuard\(req\);\n  if \(guard\.blocked\) return guard\.response;/;

const replacement = `export async function POST(req: NextRequest) {
  /* 🛡️ Security: require auth + enforce server-side limit 🛡️ */
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  /* 🛡️ Entitlement Check 🛡️ */
  const authHeader = req.headers.get("authorization");
  const entitlement = await verifyFeatureAccess(authHeader, 'seniorInsight');
  
  if (entitlement.status !== "ALLOWED") {
    const statusCode = entitlement.status === "LIMIT_REACHED" ? 429 : 403;
    return NextResponse.json(
      { 
        error: entitlement.error || "Senior Insight is available with Paperino Plus, Pro or Premium.",
        status: entitlement.status,
        plan: entitlement.plan || "free",
        limit: entitlement.limit || 0,
        used: entitlement.used || 0
      },
      { status: statusCode }
    );
  }`;

c = c.replace(replaceRegex, replacement);
fs.writeFileSync('src/app/api/assistant/route.ts', c);
console.log("Replaced Assistant route successfully");
