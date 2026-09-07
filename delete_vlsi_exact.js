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
  const idsToTry = [
    'btech_sem5_vlsi-design-technology',
    'btech_sem5_vlsi-design-and-technology',
    'btech_sem5_vlsidesigntechnology',
    'btech_sem5_vlsidesignandtechnology'
  ];
  
  for (const id of idsToTry) {
    console.log('Attempting to delete exact ID:', id);
    try {
      await db.collection('dynamic_subjects').doc(id).delete();
      console.log('Deleted successfully:', id);
    } catch (e) {
      console.error('Failed to delete', id, e.message);
    }
  }
}
run();
