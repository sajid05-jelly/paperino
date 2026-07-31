const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function deleteKnowafestUpdates() {
  console.log("Searching for Knowafest updates in pulse_updates...");
  
  const snap = await db.collection("pulse_updates").get();
  let count = 0;
  let batch = db.batch();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const source = data.source || data.sourceName || "";
    const sources = data.sources || [];
    const createdBy = data.createdBy || "";

    const isKnowafest = 
      source === "knowafest" || 
      sources.includes("knowafest") || 
      createdBy === "knowafest_bot";

    if (isKnowafest) {
      batch.delete(docSnap.ref);
      count++;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully deleted ${count} Knowafest updates from pulse_updates.`);
  } else {
    console.log("No Knowafest updates found to delete.");
  }

  // Reset sync log
  await db.collection("system_settings").doc("knowafest_sync").set({
    lastSynced: "Never",
    httpStatus: 200,
    foundCardsCount: 0,
    eventsExtractedCount: 0,
    eventsImported: 0,
    eventsUpdated: 0,
    eventsSkipped: 0,
    failedEvents: 0,
    extractedTitles: [],
    logs: []
  });
  console.log("Reset system_settings/knowafest_sync log.");
}

deleteKnowafestUpdates().catch(console.error);
