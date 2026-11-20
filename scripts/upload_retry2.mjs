import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { google } from 'googleapis';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
admin.initializeApp({ credential });
const db = admin.firestore();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

const UPLOAD_DIR = 'C:/Users/SAJID/.gemini/antigravity/brain/55d8991d-3228-4c17-89bc-d2bf70dbffde/.user_uploaded';

const items = [
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794494735943_112606cd.pdf'),
    fileName: 'BA3361 – Strategic Management Question Bank.pdf',
    title: 'BA3361 – Strategic Management Question Bank',
    code: 'BA3361', subjectId: 'strategic-management', subjectName: 'Strategic Management'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794494735924_44269a54.pdf'),
    fileName: 'PBA505 – Services Operations Management Question Bank.pdf',
    title: 'PBA505 – Services Operations Management Question Bank',
    code: 'PBA505', subjectId: 'services-operations-management', subjectName: 'Services Operations Management'
  }
];

function saveLocalSection(section) {
  const filePath = path.join(process.cwd(), 'src', 'data', 'configured_sections.json');
  let sections = [];
  try { if (fs.existsSync(filePath)) sections = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (e) { sections = []; }
  const existingIdx = sections.findIndex(s => s.departmentId === section.departmentId && String(s.semesterId) === String(section.semesterId) && s.subjectId === section.subjectId && s.sectionType === section.sectionType);
  if (existingIdx >= 0) sections[existingIdx] = { ...sections[existingIdx], ...section };
  else sections.push(section);
  fs.writeFileSync(filePath, JSON.stringify(sections, null, 2), 'utf-8');
}

async function uploadWithRetry(item, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}: Uploading to Drive...`);
      const driveRes = await drive.files.create({
        requestBody: { name: `mba_sem3_${item.subjectId}_${item.fileName}`, parents: [folderId] },
        media: { mimeType: 'application/pdf', body: fs.createReadStream(item.localFile) },
        fields: 'id'
      });
      return driveRes.data.id;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`  Attempt ${attempt} failed (${err.code}). Waiting 3s before retry...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function uploadItem(item, idx, total) {
  console.log(`\n[${idx + 1}/${total}] ${item.title}`);
  const fileId = await uploadWithRetry(item);
  if (!fileId) throw new Error(`Drive upload failed for ${item.title}`);
  console.log(`  Drive fileId: ${fileId}`);

  try {
    await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
    console.log(`  ✅ Public permission set`);
  } catch (e) {
    console.warn(`  ⚠️ Perm warn: ${e.message}`);
    try { await new Promise(r => setTimeout(r, 1200)); await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } }); console.log(`  ✅ Perm (retry)`); } catch (e2) { console.warn(`  ⚠️ Perm retry failed`); }
  }

  const matRef = db.collection('materials').doc();
  await matRef.set({
    departmentId: 'mba', semesterId: '3', subjectId: item.subjectId,
    title: item.title, category: 'questions', fileId, fileName: item.fileName,
    status: 'approved', approvedAt: Date.now(), approvedBy: 'mohamedsajid.sa@gmail.com', createdAt: Date.now()
  });
  console.log(`  Firestore mat: ${matRef.id}`);

  const subDocId = `mba_sem3_${item.subjectId}`;
  await db.collection('dynamic_subjects').doc(subDocId).set({ code: item.code, sections: admin.firestore.FieldValue.arrayUnion('questions'), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  const secDocId = `mba_sem3_${item.subjectId}_questions`;
  await db.collection('subject_sections').doc(secDocId).set({ id: secDocId, subjectId: item.subjectId, subjectName: item.subjectName, subjectCode: item.code, departmentId: 'mba', departmentName: 'MBA', semesterId: '3', sectionType: 'questions', approvedByAdminId: 'admin', approvedByAdminEmail: 'mohamedsajid.sa@gmail.com', createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  saveLocalSection({ id: secDocId, subjectId: item.subjectId, subjectName: item.subjectName, subjectCode: item.code, departmentId: 'mba', departmentName: 'MBA', semesterId: '3', sectionType: 'questions', approvedByAdminId: 'admin', approvedByAdminEmail: 'mohamedsajid.sa@gmail.com', createdAt: new Date().toISOString() });

  return { title: item.title, fileId, materialId: matRef.id };
}

async function main() {
  console.log('================================================');
  console.log('🔄 MBA Sem 3 — Retry remaining 2 files');
  console.log('================================================');
  const results = [];
  for (let i = 0; i < items.length; i++) results.push(await uploadItem(items[i], i, items.length));
  console.log('\n================================================');
  console.log('🎉 DONE!');
  console.log('================================================');
  results.forEach((r, i) => console.log(`${i + 1}. ${r.title}\n   Drive: ${r.fileId} | Mat: ${r.materialId}`));
}

main().then(() => process.exit(0)).catch(err => { console.error('Fatal:', err.message); process.exit(1); });
