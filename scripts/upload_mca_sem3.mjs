import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { google } from 'googleapis';

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

const items = [
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763592_bcba4800.pdf'),
    fileName: 'PMC505 – Cyber Forensics Question Bank.pdf',
    title: 'PMC505 – Cyber Forensics Question Bank',
    code: 'PMC505',
    subjectId: 'cyber-forensics',
    subjectName: 'Cyber Forensics'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763591_6176f865.pdf'),
    fileName: 'MC4362 – Internet of Things Question Bank.pdf',
    title: 'MC4362 – Internet of Things Question Bank',
    code: 'MC4362',
    subjectId: 'internet-of-things',
    subjectName: 'Internet of Things'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763592_14284e1e.pdf'),
    fileName: 'PMC503 – Cryptography and Cyber Security Question Bank.pdf',
    title: 'PMC503 – Cryptography and Cyber Security Question Bank',
    code: 'PMC503',
    subjectId: 'cryptography-and-cyber-security',
    subjectName: 'Cryptography and Cyber Security'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763592_eb60b4b0.pdf'),
    fileName: 'MC4361 – Machine Learning Question Bank.pdf',
    title: 'MC4361 – Machine Learning Question Bank',
    code: 'MC4361',
    subjectId: 'machine-learning',
    subjectName: 'Machine Learning'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763593_6054e0bd.pdf'),
    fileName: 'EN4348 – Communication Skills Enhancement-II Lab Manual and Question Bank.pdf',
    title: 'EN4348 – Communication Skills Enhancement - II Question Bank & Lab Manual',
    code: 'EN4348',
    subjectId: 'communication-skills-enhancement-ii',
    subjectName: 'Communication Skills Enhancement - II'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763593_d829d432.pdf'),
    fileName: 'MC4364 – Internet of Things Laboratory Lab Manual.pdf',
    title: 'MC4364 – Internet of Things Laboratory Lab Manual',
    code: 'MC4364',
    subjectId: 'internet-of-things-laboratory',
    subjectName: 'Internet of Things Laboratory'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763594_bc89c8a9.pdf'),
    fileName: 'MC4363 – Machine Learning Laboratory Lab Manual.pdf',
    title: 'MC4363 – Machine Learning Laboratory Lab Manual',
    code: 'MC4363',
    subjectId: 'machine-learning-laboratory',
    subjectName: 'Machine Learning Laboratory'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763594_5d5c6ec7.pdf'),
    fileName: 'PMC502 – Operating Systems and Security Question Bank.pdf',
    title: 'PMC502 – Operating Systems and Security Question Bank',
    code: 'PMC502',
    subjectId: 'operating-systems-and-security',
    subjectName: 'Operating Systems and Security'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763594_6807378e.pdf'),
    fileName: 'PMC504 – Engineering Secure Software Systems Question Bank.pdf',
    title: 'PMC504 – Engineering Secure Software Systems Question Bank',
    code: 'PMC504',
    subjectId: 'engineering-secure-software-systems',
    subjectName: 'Engineering Secure Software Systems'
  },
  {
    localFile: path.join(UPLOAD_DIR, 'media_1794578763593_310ef4d1.pdf'),
    fileName: 'PMC103 – Data Analytics and Computing Question Bank.pdf',
    title: 'PMC103 – Data Analytics and Computing Question Bank',
    code: 'PMC103',
    subjectId: 'data-analytics-and-computing',
    subjectName: 'Data Analytics and Computing'
  }
];

function saveLocalSection(section) {
  const filePath = fs.existsSync(path.join(process.cwd(), 'src', 'data', 'configured_sections.json'))
    ? path.join(process.cwd(), 'src', 'data', 'configured_sections.json')
    : path.join(process.cwd(), 'paperino', 'src', 'data', 'configured_sections.json');

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
        requestBody: { name: `mca_sem3_${item.subjectId}_${item.fileName}`, parents: [folderId] },
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

async function uploadItem(item, idx, total) {
  console.log(`\n[${idx + 1}/${total}] ${item.title}`);
  if (!fs.existsSync(item.localFile)) throw new Error(`File not found: ${item.localFile}`);
  console.log(`  Size: ${(fs.statSync(item.localFile).size / 1024).toFixed(1)} KB`);

  // 1. Dynamic Subject handling (Create or Merge)
  const subDocId = `mca_sem3_${item.subjectId}`;
  const subDocRef = db.collection('dynamic_subjects').doc(subDocId);
  const subSnap = await subDocRef.get();

  if (!subSnap.exists) {
    await subDocRef.set({
      subjectId: item.subjectId,
      name: item.subjectName,
      code: item.code,
      departmentId: 'mca',
      semesterId: '3',
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

  // 2. Upload to Drive
  const fileId = await uploadWithRetry(item);
  if (!fileId) throw new Error(`Drive upload failed for ${item.title}`);
  console.log(`  Drive fileId: ${fileId}`);

  // 3. Set public permission
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

  // 4. Firestore: materials
  const matRef = db.collection('materials').doc();
  await matRef.set({
    departmentId: 'mca',
    semesterId: '3',
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

  // 5. Firestore: subject_sections
  const secDocId = `mca_sem3_${item.subjectId}_questions`;
  await db.collection('subject_sections').doc(secDocId).set({
    id: secDocId,
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    subjectCode: item.code,
    departmentId: 'mca',
    departmentName: 'MCA',
    semesterId: '3',
    sectionType: 'questions',
    approvedByAdminId: 'admin',
    approvedByAdminEmail: 'mohamedsajid.sa@gmail.com',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // 6. Local cache configured_sections.json
  saveLocalSection({
    id: secDocId,
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    subjectCode: item.code,
    departmentId: 'mca',
    departmentName: 'MCA',
    semesterId: '3',
    sectionType: 'questions',
    approvedByAdminId: 'admin',
    approvedByAdminEmail: 'mohamedsajid.sa@gmail.com',
    createdAt: new Date().toISOString()
  });

  return { title: item.title, fileId, materialId: matRef.id, subjectDocId: subDocId };
}

async function main() {
  console.log('================================================');
  console.log('🚀 MCA Semester 3 — Uploading 10 Question Banks & Materials');
  console.log('================================================');

  const results = [];
  for (let i = 0; i < items.length; i++) {
    results.push(await uploadItem(items[i], i, items.length));
  }

  console.log('\n================================================');
  console.log('🎉 ALL 10 MCA SEMESTER 3 MATERIALS UPLOADED SUCCESSFULLY!');
  console.log('================================================');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}\n   Subject: ${r.subjectDocId} | Drive: ${r.fileId} | Material ID: ${r.materialId}`);
  });
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal Upload Error:', err);
  process.exit(1);
});
