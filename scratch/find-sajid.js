const fs = require('fs');
const admin = require('firebase-admin');

const env = fs.readFileSync('.env.local', 'utf8');
let creds;

const keyMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*'([\s\S]*?)'/);
if (keyMatch) {
  creds = JSON.parse(keyMatch[1]);
} else {
  const dblMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*"([\s\S]*)"/);
  if (dblMatch) {
    creds = JSON.parse(dblMatch[1]);
  } else {
    throw new Error("Could not parse FIREBASE_SERVICE_ACCOUNT_KEY");
  }
}

admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

async function run() {
  const snap = await db.collection("users").where("email", "==", "mohamedsajid.sa@gmail.com").get();
  console.log(`Matching users: ${snap.size}`);
  snap.forEach(doc => {
    console.log(`UID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run().catch(console.error);
