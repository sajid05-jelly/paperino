const fs = require('fs');
const admin = require('firebase-admin');

const env = fs.readFileSync('.env.local', 'utf8');
let creds;
const keyMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*'([\s\S]*?)'/);
if (keyMatch) {
  creds = JSON.parse(keyMatch[1]);
} else {
  const dblMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*"([\s\S]*?)"/);
  if (dblMatch) {
    creds = JSON.parse(dblMatch[1].replace(/\\n/g, '\n'));
  }
}

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

async function run() {
  const snap = await db.collection('dynamic_subjects').where('departmentId', '==', 'btech').where('semesterId', '==', '5').get();
  console.log("Dynamic subjects found in Firestore:");
  snap.docs.forEach(doc => {
    console.log("- " + doc.data().name + " (ID: " + doc.id + ")");
  });
}
run();
