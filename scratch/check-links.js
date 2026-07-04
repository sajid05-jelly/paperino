const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const keyMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*'([\s\S]*?)'/);
const serviceAccount = JSON.parse(keyMatch[1]);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

db.collection('pulse_queue').get()
  .then(async (snap) => {
    console.log(`Checking ${snap.size} links from pulse_queue...`);
    for (const doc of snap.docs) {
      const link = doc.data().link;
      const title = doc.data().title;
      
      const blacklistQuery = await db.collection("pulse_blacklist").where("link", "==", link).get();
      const queueQuery = await db.collection("pulse_queue").where("link", "==", link).get();
      const updatesQuery = await db.collection("pulse_updates").where("link", "==", link).get();
      
      console.log(`Link: ${link} | Title: ${title}`);
      console.log(`  - Blacklist Match: ${!blacklistQuery.empty} (size: ${blacklistQuery.size})`);
      console.log(`  - Queue Match: ${!queueQuery.empty} (size: ${queueQuery.size})`);
      console.log(`  - Updates Match: ${!updatesQuery.empty} (size: ${updatesQuery.size})`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
