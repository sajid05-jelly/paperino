import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { google } from 'googleapis';
import crypto from 'crypto';

const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local'))
  ? path.resolve(process.cwd(), '.env.local')
  : path.resolve(process.cwd(), 'paperino', '.env.local');
dotenv.config({ path: envPath });

const credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
admin.initializeApp({ credential });
const db = admin.firestore();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

const UPLOAD_DIR = 'C:/Users/SAJID/.gemini/antigravity/brain/77a3d26f-938a-40a0-a194-392f2895277c/.user_uploaded';

const rawUploads = [
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794747448656_5ba2cf0e.pdf'),
    originalName: 'CP3261-INTERNET-OF-THINGS.pdf',
    fileName: 'CP3261 – Internet of Things Question Bank.pdf',
    title: 'CP3261 – Internet of Things Question Bank',
    code: 'CP3261',
    subjectId: 'internet-of-things',
    subjectName: 'Internet of Things',
    category: 'questions',
    semesterId: '2'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794747449049_edbb1faa.pdf'),
    originalName: 'CP3262-CLOUD-COMPUTING-TECHNOLOGIES.pdf',
    fileName: 'CP3262 – Cloud Computing Technologies Question Bank.pdf',
    title: 'CP3262 – Cloud Computing Technologies Question Bank',
    code: 'CP3262',
    subjectId: 'cloud-computing-technologies',
    subjectName: 'Cloud Computing Technologies',
    category: 'questions',
    semesterId: '2'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794747448659_ee86478d.pdf'),
    originalName: 'CP3263-ADVANCED-DATA-SCIENCE.pdf',
    fileName: 'CP3263 – Advanced Data Science Question Bank.pdf',
    title: 'CP3263 – Advanced Data Science Question Bank',
    code: 'CP3263',
    subjectId: 'advanced-data-science',
    subjectName: 'Advanced Data Science',
    category: 'questions',
    semesterId: '2'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794747448659_04aa5912.pdf'),
    originalName: 'PCP101-SOFTWARE-TESTING-AND-QUALITY-ASSURANCE.pdf',
    fileName: 'PCP101 – Software Testing and Quality Assurance Question Bank.pdf',
    title: 'PCP101 – Software Testing and Quality Assurance Question Bank',
    code: 'PCP101',
    subjectId: 'software-testing-and-quality-assurance',
    subjectName: 'Software Testing and Quality Assurance',
    category: 'questions',
    semesterId: '2'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794747449098_39603191.pdf'),
    originalName: 'DS3264-DEEP-LEARNING.pdf',
    fileName: 'DS3264 – Deep Learning Question Bank.pdf',
    title: 'DS3264 – Deep Learning Question Bank',
    code: 'DS3264',
    subjectId: 'deep-learning',
    subjectName: 'Deep Learning',
    category: 'questions',
    semesterId: '2'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794747448662_d9dcf7a2.pdf'),
    originalName: 'PDS104-WEB-DESIGN-AND-MANAGEMENT.pdf',
    fileName: 'PDS104 – Web Design and Management Question Bank.pdf',
    title: 'PDS104 – Web Design and Management Question Bank',
    code: 'PDS104',
    subjectId: 'web-design-and-management',
    subjectName: 'Web Design and Management',
    category: 'questions',
    semesterId: '2'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794747448634_1a8ad2af.pdf'),
    originalName: 'CP3264-ADVANCED-DATA-SCIENCE-LABORATORY-MANUAL.pdf',
    fileName: 'CP3264 – Advanced Data Science Laboratory Manual & Viva Questions.pdf',
    title: 'CP3264 – Advanced Data Science Laboratory Manual & Viva Questions',
    code: 'CP3264',
    subjectId: 'advanced-data-science-laboratory',
    subjectName: 'Advanced Data Science Laboratory',
    category: 'questions',
    semesterId: '2'
  }
];

function saveLocalSection(section) {
  const possiblePaths = [
    path.join(process.cwd(), 'src', 'data', 'configured_sections.json'),
    path.join(process.cwd(), 'paperino', 'src', 'data', 'configured_sections.json')
  ];
  const filePath = possiblePaths.find(p => fs.existsSync(path.dirname(p))) || possiblePaths[0];

  let sections = [];
  try {
    if (fs.existsSync(filePath)) sections = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    sections = [];
  }
  const existingIdx = sections.findIndex(
    s => s.departmentId === section.departmentId &&
         String(s.semesterId) === String(section.semesterId) &&
         s.subjectId === section.subjectId &&
         s.sectionType === section.sectionType
  );
  if (existingIdx >= 0) {
    sections[existingIdx] = { ...sections[existingIdx], ...section };
  } else {
    sections.push(section);
  }
  fs.writeFileSync(filePath, JSON.stringify(sections, null, 2), 'utf-8');
}

async function uploadWithRetry(item, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}: Uploading to Drive...`);
      const driveRes = await drive.files.create({
        requestBody: { name: `me_cse_sem2_${item.subjectId}_${item.fileName}`, parents: [folderId] },
        media: { mimeType: 'application/pdf', body: fs.createReadStream(item.localFile) },
        fields: 'id'
      });
      return driveRes.data.id;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`  Attempt ${attempt} failed (${err.message}). Waiting 3s before retry...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function processItem(item, idx, total) {
  console.log(`\n[${idx + 1}/${total}] Processing: ${item.title}`);
  if (!fs.existsSync(item.localFile)) throw new Error(`File not found: ${item.localFile}`);
  console.log(`  Size: ${(fs.statSync(item.localFile).size / 1024).toFixed(1)} KB`);

  // 1. Dynamic Subject (Create or Merge) in Firestore
  const subDocId = `me-computer-science-engineering_sem2_${item.subjectId}`;
  const subDocRef = db.collection('dynamic_subjects').doc(subDocId);
  const subSnap = await subDocRef.get();

  if (!subSnap.exists) {
    await subDocRef.set({
      subjectId: item.subjectId,
      name: item.subjectName,
      code: item.code,
      departmentId: 'me-computer-science-engineering',
      semesterId: '2',
      sections: ['questions'],
      createdBy: 'EzEITZCSUKfGUWUkwgRGYtpS85Y2',
      contributorName: 'mohamedsajid s',
      status: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  🆕 Subject created: ${subDocId} (${item.subjectName} - ${item.code})`);
  } else {
    await subDocRef.set({
      code: item.code,
      name: item.subjectName,
      sections: admin.firestore.FieldValue.arrayUnion('questions'),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`  🔄 Subject updated: ${subDocId} (${item.code})`);
  }

  // 2. Upload PDF to Google Drive
  const fileId = await uploadWithRetry(item);
  if (!fileId) throw new Error(`Drive upload failed for ${item.title}`);
  console.log(`  Drive fileId: ${fileId}`);

  // 3. Make Drive file publicly readable
  try {
    await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
    console.log(`  ✅ Public permission set`);
  } catch (e) {
    console.warn(`  ⚠️ Permission warn: ${e.message} — retrying...`);
    try {
      await new Promise(r => setTimeout(r, 1500));
      await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
      console.log(`  ✅ Public permission set (retry)`);
    } catch (e2) {
      console.warn(`  ⚠️ Permission retry failed: ${e2.message}`);
    }
  }

  // 4. Firestore: materials collection
  const matRef = db.collection('materials').doc();
  await matRef.set({
    departmentId: 'me-computer-science-engineering',
    semesterId: '2',
    subjectId: item.subjectId,
    title: item.title,
    category: 'questions',
    fileId,
    fileName: item.fileName,
    status: 'approved',
    approvedAt: Date.now(),
    approvedBy: 'mohamedsajid.sa@gmail.com',
    createdAt: Date.now()
  });
  console.log(`  Firestore material created: ${matRef.id}`);

  // 5. Firestore: subject_sections collection
  const secDocId = `me-computer-science-engineering_sem2_${item.subjectId}_questions`;
  await db.collection('subject_sections').doc(secDocId).set({
    id: secDocId,
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    subjectCode: item.code,
    departmentId: 'me-computer-science-engineering',
    departmentName: 'M.E Computer Science and Engineering',
    semesterId: '2',
    sectionType: 'questions',
    approvedByAdminId: 'admin',
    approvedByAdminEmail: 'mohamedsajid.sa@gmail.com',
    createdAt: new Date().toISOString()
  });
  console.log(`  Firestore section registered: ${secDocId}`);

  // 6. Local cache configured_sections.json
  saveLocalSection({
    id: secDocId,
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    subjectCode: item.code,
    departmentId: 'me-computer-science-engineering',
    departmentName: 'M.E Computer Science and Engineering',
    semesterId: '2',
    sectionType: 'questions',
    approvedByAdminId: 'admin',
    approvedByAdminEmail: 'mohamedsajid.sa@gmail.com',
    createdAt: new Date().toISOString()
  });

  return { title: item.title, code: item.code, fileId, materialId: matRef.id, subjectDocId: subDocId };
}

async function main() {
  console.log('================================================================');
  console.log('🔍 ANALYZING UPLOADED FILES & DETECTING DUPLICATES (M.E CSE SEM 2)');
  console.log('================================================================');

  const seenHashes = new Map();
  const itemsToUpload = [];
  const duplicatesSkipped = [];

  for (const item of rawUploads) {
    const buf = fs.readFileSync(item.localFile);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (seenHashes.has(hash)) {
      const existing = seenHashes.get(hash);
      duplicatesSkipped.push({
        skippedFile: path.basename(item.localFile),
        title: item.title,
        duplicateOf: path.basename(existing.localFile),
        existingTitle: existing.title,
        hash
      });
      console.log(`⚠️ SKIPPING DUPLICATE: [${path.basename(item.localFile)}] matches [${path.basename(existing.localFile)}] (SHA-256: ${hash.slice(0, 16)}...)`);
    } else {
      seenHashes.set(hash, item);
      itemsToUpload.push(item);
      console.log(`✓ UNIQUE FILE: [${path.basename(item.localFile)}] ${item.code} - ${item.title}`);
    }
  }

  console.log(`\nFound ${itemsToUpload.length} unique files to upload, ${duplicatesSkipped.length} duplicate file(s) skipped.`);

  console.log('\n================================================================');
  console.log(`🚀 UPLOADING ${itemsToUpload.length} MATERIALS TO M.E CSE SEM 2`);
  console.log('================================================================');

  const results = [];
  for (let i = 0; i < itemsToUpload.length; i++) {
    const res = await processItem(itemsToUpload[i], i, itemsToUpload.length);
    results.push(res);
  }

  console.log('\n================================================================');
  console.log('🎉 UPLOAD COMPLETE SUMMARY (M.E CSE SEM 2):');
  console.log('================================================================');
  console.log('✅ Uploaded Subjects & Materials:');
  results.forEach((r, idx) => {
    console.log(` ${idx + 1}. [${r.code}] ${r.title}\n    Subject: ${r.subjectDocId} | Drive: ${r.fileId} | Material: ${r.materialId}`);
  });

  if (duplicatesSkipped.length > 0) {
    console.log('\n🚫 Skipped Duplicate Files:');
    duplicatesSkipped.forEach((d, idx) => {
      console.log(` ${idx + 1}. ${d.skippedFile} (${d.title}) -> Duplicate of ${d.duplicateOf}`);
    });
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal Upload Error:', err);
  process.exit(1);
});
