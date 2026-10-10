const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function dryRun() {
  const snapshot = await db.collection('departments').get();
  let unapproved = [];
  let approved = [];
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.status !== 'approved') {
      unapproved.push(doc.id);
    } else {
      approved.push(doc.id);
    }
  }
  console.log(`Found ${approved.length} APPROVED courses:`, approved);
  console.log(`Found ${unapproved.length} UNAPPROVED courses:`, unapproved);
}

dryRun().catch(console.error);
