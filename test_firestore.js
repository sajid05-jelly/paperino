const admin = require('firebase-admin');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envLocal.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([^']+)'/);
if (keyMatch) {
  const serviceAccount = JSON.parse(keyMatch[1]);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  admin.firestore().collection('settings').doc('siteConfig').get()
    .then(doc => {
      console.log('Success:', doc.exists);
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
} else {
  console.error('Key not found');
}
