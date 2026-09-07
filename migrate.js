require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  console.log("Fetching completed subject requests...");
  const snapshot = await db.collection("subject_requests").where("status", "==", "completed").get();
  console.log(`Found ${snapshot.size} completed requests.`);

  let migratedCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Check if this belongs to a valid request structure
    if (!data.subjectName || !data.departmentId || !data.semesterId) {
      console.log(`Skipping doc ${doc.id}: Missing required fields.`);
      continue;
    }

    const name = data.subjectName;
    const code = data.subjectCode;
    const deptId = data.departmentId;
    const semId = data.semesterId;
    
    const generatedId = code 
      ? code.toLowerCase().trim().replace(/[^a-z0-9]/g, "") 
      : name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
      
    const docId = `${deptId}_sem${semId}_${generatedId}`;

    // Verify if it already exists to not blindly overwrite everything 
    // unless necessary, but we do want to ensure they are created.
    // Merge: true is safe.
    
    await db.collection("dynamic_subjects").doc(docId).set({
      subjectId: generatedId,
      name: name.trim(),
      code: code ? code.trim() : "",
      departmentId: deptId,
      semesterId: semId,
      createdBy: "system_admin_accept_migration",
      contributorId: data.requestedBy || null,
      contributorName: data.userEmail ? data.userEmail.split('@')[0] : "Contributor",
      status: "approved",
      createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    migratedCount++;
    console.log(`Migrated: ${name} -> ${docId}`);
  }
  
  console.log(`Migration complete. Successfully migrated ${migratedCount} subjects.`);
}

migrate().catch(console.error).finally(() => process.exit(0));
