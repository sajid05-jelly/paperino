import fs from 'fs';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local')) 
  ? path.resolve(process.cwd(), '.env.local') 
  : path.resolve(process.cwd(), 'paperino', '.env.local');
dotenv.config({ path: envPath });
const credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
admin.initializeApp({ credential });
const db = admin.firestore();

async function run() {
  console.log('--- Checking dynamic_subjects for MCA Sem 3 ---');
  const snap = await db.collection('dynamic_subjects')
    .where('departmentId', '==', 'mca')
    .where('semesterId', '==', '3')
    .get();

  console.log(`Found ${snap.size} subjects for MCA Sem 3:`);
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`- ID: ${doc.id} | Name: ${d.name} | Code: ${d.code} | Status: ${d.status} | Sections:`, d.sections);
  });

  console.log('\n--- Checking existing materials for MCA Sem 3 ---');
  const matSnap = await db.collection('materials')
    .where('departmentId', '==', 'mca')
    .where('semesterId', '==', '3')
    .get();
  console.log(`Found ${matSnap.size} existing materials for MCA Sem 3:`);
  matSnap.forEach(doc => {
    const d = doc.data();
    console.log(`- Mat: ${doc.id} | Subject: ${d.subjectId} | Title: ${d.title} | File: ${d.fileName}`);
  });
}

run().then(() => process.exit(0)).catch(err => { console.error('Error:', err); process.exit(1); });
