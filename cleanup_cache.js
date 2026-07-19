const admin = require("firebase-admin");

// Initialize Firebase Admin using env variables if present
if (admin.apps.length === 0) {
  // Try loading local environment variables from .env or .env.local
  require("dotenv").config({ path: ".env" });
  require("dotenv").config({ path: ".env.local" });

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    })
  });
}

const db = admin.firestore();

async function run() {
  console.log("Cleaning up Firestore unstop_cache collection...");
  try {
    const colRef = db.collection("unstop_cache");
    const snapshot = await colRef.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      console.log("Deleting document:", doc.id);
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log("Successfully cleared all aggregated and curated internship cache!");
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
}

run();
