const fs = require('fs');

const files = [
  'src/app/api/github-intelligence/route.ts',
  'src/app/api/ats/route.ts',
  'src/app/api/pyq/route.ts',
  'src/app/api/exam-emergency/route.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Pass entitlement.plan to consumeFeatureUsage
    content = content.replace(
      /consumeFeatureUsage\((entitlement\.uid[^,]*),\s*([^,)]+)\)/g,
      'consumeFeatureUsage($1, $2, entitlement.plan)'
    );

    fs.writeFileSync(file, content);
  }
}
