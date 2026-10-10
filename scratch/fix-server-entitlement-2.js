const fs = require('fs');
let content = fs.readFileSync('src/lib/server-entitlement.ts', 'utf8');

content = content.replace(
  'return await checkAndConsumeMonthlyUsage(uid, feature as any);',
  'return await checkAndConsumeMonthlyUsage(uid, feature as any, resolvedPlan);'
);

// Also let's fix the comment I accidentally left behind earlier
content = content.replace(
  /\/\/ Pass the resolved plan from token[^]*?\/\/ Actually, consumeFeatureUsage only takes uid and feature. We should update its signature too.\r?\n\s*/,
  ''
);

fs.writeFileSync('src/lib/server-entitlement.ts', content);
