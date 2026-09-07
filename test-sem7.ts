import { adminDb } from "./src/lib/firebase-admin";

async function run() {
  if (!adminDb) {
    console.error("adminDb is null");
    return;
  }
  try {
    const snap = await adminDb.collection("dynamic_subjects").where("departmentId", "==", "btech").get();
    console.log("Total dynamic subjects in btech:", snap.docs.length);
    const sem7 = snap.docs.filter(d => String(d.data().semesterId) === "7");
    console.log("Semester 7 dynamic subjects:", JSON.stringify(sem7.map(d => ({id: d.id, ...d.data()})), null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
