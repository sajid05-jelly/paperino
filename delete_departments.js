const fs = require('fs');
const admin = require('firebase-admin');

const env = fs.readFileSync('.env.local', 'utf8');
let creds;

const keyMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*'([\s\S]*?)'/);
if (keyMatch) {
  creds = JSON.parse(keyMatch[1]);
} else {
  const dblMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*"([\s\S]*?)"/);
  if (dblMatch) {
    creds = JSON.parse(dblMatch[1]);
  } else {
    throw new Error("Could not parse FIREBASE_SERVICE_ACCOUNT_KEY from .env.local");
  }
}

admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

async function deleteByCodeOrName(code, nameStr) {
  console.log(`Searching for code="${code}" or name containing "${nameStr}"...`);
  const docsToDelete = new Map();

  try {
    const snap1 = await db.collection('departments').where('code', '==', code).get();
    snap1.forEach(d => docsToDelete.set(d.id, d.data()));
  } catch (e) {
    console.error(`Error querying by code ${code}:`, e.message);
  }

  try {
    const snap2 = await db.collection('departments').where('name', '==', nameStr).get();
    snap2.forEach(d => docsToDelete.set(d.id, d.data()));
  } catch (e) {
    console.error(`Error querying by name ${nameStr}:`, e.message);
  }

  for (const [id, data] of docsToDelete.entries()) {
    console.log(`Deleting department document ID: ${id} (Name: "${data.name}", Code: "${data.code}")...`);
    await db.collection('departments').doc(id).delete();
    console.log(`Deleted department document ${id}`);
  }
}

async function run() {
  console.log("--- Executing targeted department deletion ---");
  
  // 1. Computer network / COM
  await deleteByCodeOrName('COM', 'Computer network');
  await deleteByCodeOrName('com', 'Computer network');
  await deleteByCodeOrName('COM', 'computer network');

  // 2. btech cse aiml / BTE
  await deleteByCodeOrName('BTE', 'btech cse aiml');
  await deleteByCodeOrName('bte', 'btech cse aiml');
  await deleteByCodeOrName('BTE', 'Btech cse aiml');

  // 3. Biomedical Engineering / BME
  await deleteByCodeOrName('BME', 'Biomedical Engineering');
  await deleteByCodeOrName('BME', 'biomedical engineering');
  await deleteByCodeOrName('bme', 'biomedical engineering');
  await deleteByCodeOrName('BME', 'Biomedical engeerning');
  await deleteByCodeOrName('bme', 'biomedical engeerning');

  console.log("\nDone!");
}

run().catch(err => {
  console.error("Error executing targeted deletion script:", err);
  process.exit(1);
});
