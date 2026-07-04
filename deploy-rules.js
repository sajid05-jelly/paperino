const fs = require('fs');
const admin = require('firebase-admin');

const env = fs.readFileSync('.env.local', 'utf8');
let creds;

const keyMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*'([\s\S]*?)'/);
if (keyMatch) {
  creds = JSON.parse(keyMatch[1]);
} else {
  // Try matching double quotes or unquoted fallback
  const dblMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*"([\s\S]*?)"/);
  if (dblMatch) {
    creds = JSON.parse(dblMatch[1]);
  } else {
    throw new Error("Could not parse FIREBASE_SERVICE_ACCOUNT_KEY from .env.local");
  }
}

admin.initializeApp({ credential: admin.credential.cert(creds) });

const source = fs.readFileSync('firestore.rules', 'utf8');

const rulesFile = admin.securityRules().createRulesFileFromSource('firestore.rules', source);

admin.securityRules().createRuleset(rulesFile)
.then(ruleset => admin.securityRules().releaseFirestoreRuleset(ruleset))
.then(() => console.log('Rules deployed successfully!'))
.catch(err => {
  console.error('Error deploying rules:', err);
});
