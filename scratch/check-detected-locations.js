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
  .then(snap => {
    console.log(`Successfully fetched ${snap.size} active queue items:`);
    let unknownCount = 0;
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.title} | Source: ${data.sourceName} | Location: ${data.location} | State: ${data.state} | Mode: ${data.mode}`);
      if (data.location === "Location Unknown") {
        unknownCount++;
      }
    });
    console.log(`Total items: ${snap.size} | Unknown Location count: ${unknownCount} (${((unknownCount / snap.size) * 100).toFixed(1)}%)`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
