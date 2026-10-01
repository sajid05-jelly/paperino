const fs = require('fs');
let c = fs.readFileSync('src/app/api/github-intelligence/route.ts', 'utf8');

// Also need to import verifyFeatureAccess, consumeFeatureUsage, refundFeatureUsage
c = c.replace(
  'import { checkAndConsumeMonthlyUsage, checkMonthlyUsage } from "@/lib/monthly-usage";',
  'import { verifyFeatureAccess, consumeFeatureUsage, refundFeatureUsage } from "@/lib/server-entitlement";'
);

const regex = /\/\/\s*Monthly usage check for authenticated users[\s\S]*?didConsumeUsage\s*=\s*true;\s*}/;

const replacement = `      const authHeader = req.headers.get("authorization");
      const entitlement = await verifyFeatureAccess(authHeader, 'githubIntelligence');
      if (entitlement.status !== "ALLOWED") {
         const statusCode = entitlement.status === "LIMIT_REACHED" ? 429 : 403;
         return NextResponse.json({
            error: entitlement.error || "Access denied.",
            status: entitlement.status,
            plan: entitlement.plan,
            limit: entitlement.limit,
            used: entitlement.used
         }, { status: statusCode });
      }

      if (username.includes("github.com/")) {
        const parts = username.split("github.com/")[1].split("/").filter(Boolean);
        username = parts[0] || username;
      }
      username = username.toLowerCase();
      const cacheKey = \`github-intelligence:v6:\${username}\`;

      const now = Date.now();
      if (!forceFresh && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        if (
          cached.version === "v6" &&
          cached.data.analysisComplete === true &&
          cached.data.analysisConfidence !== "LOW" &&
          (now - cached.timestamp < CACHE_TTL_MS)
        ) {
          console.log(\`[GitHub Intelligence Server Log] User: @\${username} | Cache hit\`);
          return NextResponse.json({ ...cached.data, fromCache: true });
        }
      }

      // CONSUME USAGE SAFELY BEFORE API/AI
      let didConsumeUsage = false;
      if (entitlement.uid && entitlement.limit !== Infinity) {
          const consumed = await consumeFeatureUsage(entitlement.uid, 'githubIntelligence');
          if (!consumed) {
              return NextResponse.json({ error: "Failed to allocate usage." }, { status: 429 });
          }
          didConsumeUsage = true;
      }`;

c = c.replace(regex, replacement);

fs.writeFileSync('src/app/api/github-intelligence/route.ts', c);
console.log("Replaced Github Intelligence");
