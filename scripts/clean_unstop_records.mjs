import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
} else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  credential = admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  });
}

if (!credential) {
  console.error("❌ Firebase Admin credentials missing.");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential });
}

const db = admin.firestore();

function isUnstopRecord(data) {
  const sName = (data.sourceName || '').toLowerCase();
  const source = (data.source || '').toLowerCase();
  const organizer = (data.organizer || '').toLowerCase();
  const link = (typeof data.link === 'string' ? data.link : '').toLowerCase();
  const sources = Array.isArray(data.sources) ? data.sources.join(' ').toLowerCase() : '';

  return (
    sName.includes('unstop') ||
    source.includes('unstop') ||
    organizer.includes('unstop') ||
    link.includes('unstop.com') ||
    sources.includes('unstop')
  );
}

async function cleanCollection(collectionName) {
  console.log(`\n🔍 Inspecting collection: "${collectionName}"...`);
  try {
    const snap = await db.collection(collectionName).get();
    console.log(`Found ${snap.docs.length} total documents in "${collectionName}".`);
    
    let deletedCount = 0;
    let preservedCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (isUnstopRecord(data)) {
        console.log(`🗑️ Deleting Unstop record: [${doc.id}] "${data.title}" (link: ${data.link})`);
        await doc.ref.delete();
        deletedCount++;
      } else {
        preservedCount++;
      }
    }

    console.log(`✅ "${collectionName}" summary: ${deletedCount} deleted, ${preservedCount} preserved.`);
    return { deletedCount, preservedCount };
  } catch (err) {
    if (err.message && err.message.includes('Quota exceeded')) {
      console.warn(`⚠️ Quota exceeded while reading "${collectionName}". Daily read limit is currently exhausted on Firebase Spark Plan.`);
      console.warn(`   The cleanup script is ready and can be rerun as soon as Firebase resets the quota window.`);
    } else {
      console.error(`❌ Error scanning "${collectionName}":`, err.message || err);
    }
    return { deletedCount: 0, preservedCount: 0, error: err.message };
  }
}

async function main() {
  console.log("==================================================");
  console.log("🧹 Paperino: Permanently Purge Unstop Records");
  console.log("==================================================");

  const updatesResult = await cleanCollection("pulse_updates");
  const queueResult = await cleanCollection("pulse_queue");

  console.log("\n==================================================");
  console.log("📊 Final Cleanup Report:");
  console.log(` - pulse_updates: ${updatesResult.deletedCount} Unstop records deleted (${updatesResult.preservedCount} non-Unstop preserved)`);
  console.log(` - pulse_queue:   ${queueResult.deletedCount} Unstop records deleted (${queueResult.preservedCount} non-Unstop preserved)`);
  console.log("==================================================");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
