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
  console.log("Deleting all documents from user_feedback...");
  const snap = await db.collection('user_feedback').get();
  console.log("Found " + snap.size + " feedback documents.");
  
  if (snap.size === 0) {
    console.log("Done.");
    return;
  }
  
  const batch = db.batch();
  snap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log("Successfully deleted " + snap.size + " feedback documents.");
}
run().catch(console.error);
