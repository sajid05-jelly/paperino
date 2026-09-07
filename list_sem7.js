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
  console.log("Checking dynamic_subjects for btech sem 7...");
  const snap = await db.collection('dynamic_subjects').where('departmentId', '==', 'btech').where('semesterId', '==', '7').get();
  console.log("Subjects found:", snap.docs.length);
  snap.docs.forEach(doc => {
    console.log("- " + doc.data().name + " (ID: " + doc.id + ") Status: " + doc.data().status);
  });
}
run().catch(console.error);
