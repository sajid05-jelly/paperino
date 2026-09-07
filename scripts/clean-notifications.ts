import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

try {
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (error) {
  // Ignore already initialized error
}

const db = getFirestore();

async function cleanNotifications() {
  const typesToRemove = [
    "department_approved",
    "department_rejected",
    "subject_approved",
    "subject_rejected"
  ];

  let totalDeleted = 0;

  for (const type of typesToRemove) {
    try {
      console.log(`Querying for type: ${type}`);
      const snapshot = await db.collection('notifications').where('type', '==', type).get();
      
      if (snapshot.empty) {
        console.log(`No notifications found for type: ${type}`);
        continue;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Deleted ${snapshot.size} notifications for type: ${type}`);
      totalDeleted += snapshot.size;
    } catch (e: any) {
      console.error(`Error deleting type ${type}:`, e.message);
    }
  }

  console.log(`\nTotal notifications deleted: ${totalDeleted}`);
}

cleanNotifications();
