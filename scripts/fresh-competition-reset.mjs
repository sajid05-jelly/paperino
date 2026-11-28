// scripts/fresh-competition-reset.mjs
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config({ path: '.env.local' });

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY missing in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function batchArchiveAndDelete(sourceCollection, targetCollection, batchSize = 400) {
  console.log(`Starting archive for ${sourceCollection} -> ${targetCollection}...`);
  let totalArchived = 0;
  
  while (true) {
    const snap = await db.collection(sourceCollection).limit(batchSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    snap.docs.forEach((doc) => {
      const data = doc.data();
      const targetRef = db.collection(targetCollection).doc(doc.id);
      batch.set(targetRef, {
        ...data,
        archivedAt: nowIso,
        originalCollection: sourceCollection
      }, { merge: true });
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalArchived += snap.size;
    console.log(`Archived ${totalArchived} documents from ${sourceCollection}...`);
  }

  console.log(`Finished archiving ${sourceCollection}: Total ${totalArchived} documents.`);
  return totalArchived;
}

async function main() {
  console.log('=== Fresh Competition Reset Starting ===');

  // 1. Archive challenge_results -> archived_challenge_results
  const resultsArchived = await batchArchiveAndDelete('challenge_results', 'archived_challenge_results');

  // 2. Archive challenge_sessions -> archived_challenge_sessions
  const sessionsArchived = await batchArchiveAndDelete('challenge_sessions', 'archived_challenge_sessions');

  // 3. Update settings/weeklyChallenges with fresh competition metadata
  const currentWeek = '2026-W48-mega';
  const settingsRef = db.collection('settings').doc('weeklyChallenges');
  const settingsSnap = await settingsRef.get();
  const existingSettings = settingsSnap.exists ? settingsSnap.data() : {};

  await settingsRef.set({
    ...existingSettings,
    competitionCycle: 'mega-fresh-2026-w48',
    currentWeek,
    officialAttempts: 1,
    leaderboardEnabled: true,
    enabled: true,
    maintenanceMode: false,
    lastResetAt: new Date().toISOString(),
    lastResetTimestamp: Date.now(),
    archivedResultsCount: resultsArchived,
    archivedSessionsCount: sessionsArchived
  }, { merge: true });

  console.log('Updated settings/weeklyChallenges for fresh competition: currentWeek =', currentWeek);
  console.log('=== Fresh Competition Reset Complete ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
