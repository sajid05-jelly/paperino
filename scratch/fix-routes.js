const fs = require('fs');

function updateRoute(path, featureKey) {
  let code = fs.readFileSync(path, 'utf8');

  // Fix verifyFeatureAccess block
  code = code.replace(
    /if \(entitlement\.status !== "ALLOWED"\) \{\s*const statusCode = entitlement\.status === "LIMIT_REACHED" \? 429 : 403;\s*return NextResponse\.json\(\{\s*error: entitlement\.error \|\| "Access denied\.",\s*status: entitlement\.status,\s*plan: entitlement\.plan,\s*limit: entitlement\.limit,\s*used: entitlement\.used\s*\}, \{ status: statusCode \}\);\s*\}/g,
    `if (entitlement.status !== "ALLOWED") {
         let statusCode = 403;
         if (entitlement.status === "LIMIT_REACHED") statusCode = 429;
         else if (entitlement.status === "AUTH_REQUIRED") statusCode = 401;
         else if (entitlement.status === "USAGE_VERIFICATION_UNAVAILABLE") statusCode = 503;
         
         return NextResponse.json({
            error: entitlement.error || "Access denied.",
            status: entitlement.status,
            plan: entitlement.plan,
            limit: entitlement.limit,
            used: entitlement.used
         }, { status: statusCode });
      }`
  );

  // Fix consumeFeatureUsage block
  // First, change `!consumed` to `!consumed.allowed` (or equivalent since it used to be a boolean)
  // We'll replace the whole block dynamically
  
  const regex = new RegExp(
    `const consumed = await consumeFeatureUsage\\(entitlement\\.uid, '${featureKey}'\\);\\s*if \\(!consumed(?:\\.allowed)?\\) \\{\\s*return NextResponse\\.json\\(\\{ error: "[^"]+", limit: entitlement\\.limit, plan: entitlement\\.plan \\}, \\{ status: 429 \\}\\);\\s*\\}`,
    "g"
  );
  
  code = code.replace(
    regex,
    `const consumed = await consumeFeatureUsage(entitlement.uid, '${featureKey}');
            if (typeof consumed === 'boolean' ? !consumed : !consumed.allowed) {
                const errorMsg = (typeof consumed === 'object' ? consumed.error : null) || "Failed to allocate usage.";
                const isSystem = errorMsg.toLowerCase().includes("system error");
                return NextResponse.json({ 
                  error: errorMsg,
                  status: isSystem ? "USAGE_VERIFICATION_UNAVAILABLE" : "LIMIT_REACHED",
                  limit: entitlement.limit, 
                  plan: entitlement.plan 
                }, { status: isSystem ? 503 : 429 });
            }`
  );

  fs.writeFileSync(path, code);
  console.log('Updated ' + path);
}

updateRoute('./src/app/api/github-intelligence/route.ts', 'githubIntelligence');
updateRoute('./src/app/api/ats/route.ts', 'ats');
