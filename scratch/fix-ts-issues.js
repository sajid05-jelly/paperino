const fs = require('fs');

let c = fs.readFileSync('src/app/api/ats/route.ts', 'utf8');
c = c.replace(/const entitlement = await checkAndGetCredits\(authHeader, 'ats'\);/g, "const entitlement = await verifyFeatureAccess(authHeader, 'ats');");
c = c.replace(/if \(!entitlement\.allowed\)/g, 'if (entitlement.status !== "ALLOWED")');
fs.writeFileSync('src/app/api/ats/route.ts', c);

let pyq = fs.readFileSync('src/app/api/pyq/route.ts', 'utf8');
pyq = pyq.replace(/const creditCheck = await checkAndGetCredits\(authHeader, 'pyq'\);/g, "const entitlement = await verifyFeatureAccess(authHeader, 'pyqAnalyzer');");
pyq = pyq.replace(/if \(!creditCheck\.allowed\)/g, 'if (entitlement.status !== "ALLOWED")');
pyq = pyq.replace(/creditCheck\.error/g, 'entitlement.error');
pyq = pyq.replace(/creditCheck\.plan/g, 'entitlement.plan');
pyq = pyq.replace(/creditCheck\.limit/g, 'entitlement.limit');
pyq = pyq.replace(/creditCheck\.used/g, 'entitlement.used');
fs.writeFileSync('src/app/api/pyq/route.ts', pyq);

let entitlement = fs.readFileSync('src/lib/server-entitlement.ts', 'utf8');
entitlement = entitlement.replace(/adminDb!/g, '(adminDb as any)');
fs.writeFileSync('src/lib/server-entitlement.ts', entitlement);

console.log("Fixed files");
