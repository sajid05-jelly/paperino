const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function listAll() {
  const snapshot = await db.collection('departments').get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Code: ${data.code} | Name: ${data.name} | Status: ${data.status}`);
  }
}

listAll().catch(console.error);
