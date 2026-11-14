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

const ME_PARENT_ID = 'master-of-engineering';

const branches = [
  {
    id: 'me-structural-engineering',
    name: 'M.E Structural Engineering',
    code: 'M.E SE',
    parentCourse: ME_PARENT_ID,
    totalSemesters: 3,
    status: 'approved',
    createdBy: 'EzEITZCSUKfGUWUkwgRGYtpS85Y2',
    contributorName: 'mohamedsajid s'
  },
  {
    id: 'me-computer-science-engineering',
    name: 'M.E Computer Science and Engineering',
    code: 'M.E CSE',
    parentCourse: ME_PARENT_ID,
    totalSemesters: 3,
    status: 'approved',
    createdBy: 'EzEITZCSUKfGUWUkwgRGYtpS85Y2',
    contributorName: 'mohamedsajid s'
  },
  {
    id: 'me-communication-engineering',
    name: 'M.E Communication Engineering',
    code: 'M.E CE',
    parentCourse: ME_PARENT_ID,
    totalSemesters: 3,
    status: 'approved',
    createdBy: 'EzEITZCSUKfGUWUkwgRGYtpS85Y2',
    contributorName: 'mohamedsajid s'
  },
  {
    id: 'me-power-systems',
    name: 'M.E Power Systems',
    code: 'M.E PS',
    parentCourse: ME_PARENT_ID,
    totalSemesters: 3,
    status: 'approved',
    createdBy: 'EzEITZCSUKfGUWUkwgRGYtpS85Y2',
    contributorName: 'mohamedsajid s'
  },
  {
    id: 'me-control-and-instrumentation',
    name: 'M.E Control and Instrumentation Engineering',
    code: 'M.E CIE',
    parentCourse: ME_PARENT_ID,
    totalSemesters: 3,
    status: 'approved',
    createdBy: 'EzEITZCSUKfGUWUkwgRGYtpS85Y2',
    contributorName: 'mohamedsajid s'
  },
  {
    id: 'me-industrial-safety-engineering',
    name: 'M.E Industrial Safety Engineering',
    code: 'M.E ISE',
    parentCourse: ME_PARENT_ID,
    totalSemesters: 3,
    status: 'approved',
    createdBy: 'EzEITZCSUKfGUWUkwgRGYtpS85Y2',
    contributorName: 'mohamedsajid s'
  }
];

async function run() {
  console.log(`Setting up 6 M.E Specializations under parent '${ME_PARENT_ID}'...`);

  for (const branch of branches) {
    const docRef = db.collection('departments').doc(branch.id);
    await docRef.set({
      name: branch.name,
      code: branch.code,
      parentCourse: branch.parentCourse,
      totalSemesters: branch.totalSemesters,
      status: branch.status,
      createdBy: branch.createdBy,
      contributorName: branch.contributorName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✓ Created/Updated branch: [${branch.id}] -> ${branch.name} (${branch.code}) - ${branch.totalSemesters} Semesters`);
  }

  console.log('\nAll 6 M.E branches successfully created and approved in Firestore!');
}

run().then(() => process.exit(0)).catch(err => {
  console.error('Error creating branches:', err);
  process.exit(1);
});
