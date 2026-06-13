const fs = require('fs');
const admin = require('firebase-admin');

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) {
    let val = m[2].trim();
    if (val.startsWith("'") || val.startsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    process.env[m[1]] = val;
  }
});

let creds;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  creds = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  };
}

admin.initializeApp({ credential: admin.credential.cert(creds) });

const source = fs.readFileSync('firestore.rules', 'utf8');

admin.securityRules().createRuleset({
  source: { files: [{ name: 'firestore.rules', content: source }] }
})
.then(ruleset => admin.securityRules().releaseFirestoreRuleset(ruleset.name))
.then(() => console.log('Rules deployed successfully!'))
.catch(err => {
  console.error('Error deploying rules:', err);
});
