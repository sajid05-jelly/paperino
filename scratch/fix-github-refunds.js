const fs = require('fs');
let c = fs.readFileSync('src/app/api/github-intelligence/route.ts', 'utf8');

c = c.replace(
  'return NextResponse.json({\n        error: "Unable to complete evidence-based analysis due to API rate limits. Please try again later.",',
  'if (entitlement.uid && entitlement.limit !== Infinity) { await refundFeatureUsage(entitlement.uid, "githubIntelligence"); }\n        return NextResponse.json({\n        error: "Unable to complete evidence-based analysis due to API rate limits. Please try again later.",'
);

c = c.replace(
  'return NextResponse.json({\n        error: "No accessible repositories found to analyze.',
  'if (entitlement.uid && entitlement.limit !== Infinity) { await refundFeatureUsage(entitlement.uid, "githubIntelligence"); }\n        return NextResponse.json({\n        error: "No accessible repositories found to analyze.'
);

c = c.replace(
  'return NextResponse.json({ error: "Failed to generate AI insights: " + err.message }, { status: 500 });',
  'if (entitlement.uid && entitlement.limit !== Infinity) { await refundFeatureUsage(entitlement.uid, "githubIntelligence"); }\n      return NextResponse.json({ error: "Failed to generate AI insights: " + err.message }, { status: 500 });'
);

fs.writeFileSync('src/app/api/github-intelligence/route.ts', c);
console.log("Added Github Intelligence refunds");
