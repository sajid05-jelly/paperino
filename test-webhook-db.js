require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function check() {
  const hooks = await db.collection('webhook_events').orderBy('processedAt', 'desc').limit(5).get();
  console.log('--- RECENT WEBHOOK EVENTS ---');
  if (hooks.empty) console.log('None found.');
  hooks.forEach(doc => console.log(doc.id, doc.data()));

  const users = await db.collection('users').where('razorpaySubscriptionId', '!=', '').limit(5).get();
  console.log('--- USERS WITH RAZORPAY ID ---');
  if (users.empty) console.log('None found.');
  users.forEach(doc => console.log(doc.id, doc.data().plan, doc.data().razorpaySubscriptionId));
}
check().catch(console.error).finally(() => process.exit(0));
