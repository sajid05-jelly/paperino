const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const keyMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*'([\s\S]*?)'/);
const serviceAccount = JSON.parse(keyMatch[1]);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function clearCollections() {
  const collections = ['pulse_blacklist', 'pulse_queue'];
  for (const colName of collections) {
    const snap = await db.collection(colName).get();
    console.log(`Deleting ${snap.size} documents from ${colName}...`);
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log('Successfully cleared database queues and blacklists!');
}

clearCollections()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
