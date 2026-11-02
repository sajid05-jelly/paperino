import fs from 'fs';
import admin from 'firebase-admin';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='({[\s\S]*?})'/);
const serviceAccount = JSON.parse(keyMatch[1]);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function deleteCollection(collectionName) {
  console.log(`Checking collection ${collectionName}...`);
  try {
    const docRefs = await db.collection(collectionName).listDocuments();
    console.log(`Found ${docRefs.length} documents in ${collectionName}`);
    let deleted = 0;
    for (const ref of docRefs) {
      await ref.delete();
      deleted++;
    }
    console.log(`Deleted ${deleted} documents in ${collectionName}`);
  } catch (err) {
    console.warn(`Could not delete collection ${collectionName}:`, err.message);
  }
}

async function run() {
  await deleteCollection('survival_notes');
  await deleteCollection('free_class_reports');
  await deleteCollection('freeClassrooms');
  try {
    await db.collection('platform_config').doc('free_class_finder').delete();
    console.log('Deleted platform_config/free_class_finder');
  } catch (err) {
    console.warn('Could not delete platform_config/free_class_finder:', err.message);
  }
  process.exit(0);
}

run();
