import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config({ path: path.resolve('paperino', '.env.local') });

const credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
admin.initializeApp({ credential });
const db = admin.firestore();

// Import static B.Tech subjects
import { SUBJECTS as STATIC_BTECH_SUBJECTS } from '../src/lib/subjects.ts';

async function audit() {
  console.log('Fetching all departments, dynamic_subjects, and materials from Firestore...');

  // 1. Fetch all departments
  const deptsSnap = await db.collection('departments').get();
  const departments = new Map();
  
  // Add btech as default
  departments.set('btech', {
    id: 'btech',
    name: 'Bachelor of Technology',
    code: 'B.Tech',
    totalSemesters: 8,
    parentCourse: 'bachelor-of-technology'
  });

  deptsSnap.forEach(doc => {
    departments.set(doc.id, { id: doc.id, ...doc.data() });
  });

  console.log(`Loaded ${departments.size} departments.`);

  // 2. Fetch all materials
  const matSnap = await db.collection('materials').get();
  console.log(`Loaded ${matSnap.size} total material documents.`);

  // Index materials by:
  // key1: `${deptId}__${semId}__${subjectId}`
  // key2: `${semId}__${subjectId}` (for legacy btech where deptId might be missing or 'btech')
  const materialsBySubject = new Map();

  matSnap.forEach(doc => {
    const data = doc.data();
    const deptId = (data.departmentId || 'btech').toLowerCase().trim();
    const semId = String(data.semesterId || '').trim();
    const subId = String(data.subjectId || '').toLowerCase().trim();
    const status = data.status || 'approved';

    // We count approved materials (and also track pending if any)
    const exactKey = `${deptId}__${semId}__${subId}`;
    if (!materialsBySubject.has(exactKey)) {
      materialsBySubject.set(exactKey, []);
    }
    materialsBySubject.get(exactKey).push({ id: doc.id, ...data });

    // Also index for btech without deptId
    if (deptId === 'btech' || !data.departmentId) {
      const btechKey = `btech__${semId}__${subId}`;
      if (!materialsBySubject.has(btechKey)) {
        materialsBySubject.set(btechKey, []);
      }
      if (exactKey !== btechKey) {
        materialsBySubject.get(btechKey).push({ id: doc.id, ...data });
      }
    }
  });

  // 3. Collect all subjects from both dynamic_subjects and STATIC_BTECH_SUBJECTS
  const allSubjects = [];
  const subjectKeySet = new Set();

  // 3A. Static B.Tech subjects
  Object.entries(STATIC_BTECH_SUBJECTS).forEach(([semId, subs]) => {
    subs.forEach(s => {
      const subId = s.id.toLowerCase().trim();
      const key = `btech__${semId}__${subId}`;
      subjectKeySet.add(key);
      allSubjects.push({
        source: 'static_lib_subjects',
        docId: null,
        departmentId: 'btech',
        semesterId: semId,
        subjectId: s.id,
        name: s.name,
        code: ''
      });
    });
  });

  // 3B. Dynamic subjects from Firestore
  const dynSubSnap = await db.collection('dynamic_subjects').get();
  console.log(`Loaded ${dynSubSnap.size} dynamic_subjects documents.`);

  dynSubSnap.forEach(doc => {
    const data = doc.data();
    const deptId = (data.departmentId || 'btech').toLowerCase().trim();
    const semId = String(data.semesterId || '').trim();
    const subId = (data.subjectId || doc.id).toLowerCase().trim();
    const key = `${deptId}__${semId}__${subId}`;

    // If already recorded from static with same key, update or mark as dynamic
    const existing = allSubjects.find(s => s.departmentId === deptId && String(s.semesterId) === semId && s.subjectId.toLowerCase() === subId);
    if (existing) {
      existing.source = 'both_static_and_dynamic';
      existing.docId = doc.id;
      existing.code = data.code || existing.code;
      existing.name = data.name || existing.name;
    } else {
      subjectKeySet.add(key);
      allSubjects.push({
        source: 'dynamic_subjects',
        docId: doc.id,
        departmentId: deptId,
        semesterId: semId,
        subjectId: data.subjectId || doc.id,
        name: data.name || doc.id,
        code: data.code || ''
      });
    }
  });

  console.log(`Total unique subjects catalogued across all sources: ${allSubjects.length}`);

  // 4. Audit each subject
  const subjectsWithMaterials = [];
  const emptySubjects = [];

  for (const sub of allSubjects) {
    const deptId = sub.departmentId;
    const semId = String(sub.semesterId);
    const subId = sub.subjectId.toLowerCase().trim();

    const exactKey = `${deptId}__${semId}__${subId}`;
    let mats = materialsBySubject.get(exactKey) || [];

    // Fallback: check if materials exist where subjectId matches case-insensitively or normalized
    if (mats.length === 0) {
      for (const [k, v] of materialsBySubject.entries()) {
        const [d, s, subKey] = k.split('__');
        if (d === deptId && s === semId) {
          if (subKey === subId || subKey.replace(/-/g, '') === subId.replace(/-/g, '')) {
            mats = v;
            break;
          }
        }
      }
    }

    const deptInfo = departments.get(deptId) || { name: deptId, code: deptId, parentCourse: '' };

    const entry = {
      ...sub,
      departmentName: deptInfo.name,
      departmentCode: deptInfo.code,
      parentCourse: deptInfo.parentCourse || '',
      materialsCount: mats.length,
      materials: mats.map(m => ({
        id: m.id,
        title: m.title,
        category: m.category,
        fileName: m.fileName
      }))
    };

    if (mats.length > 0) {
      subjectsWithMaterials.push(entry);
    } else {
      emptySubjects.push(entry);
    }
  }

  // 5. Generate Audit Report
  console.log('\n======================================================');
  console.log(`📊 AUDIT SUMMARY:`);
  console.log(`======================================================`);
  console.log(`Total Catalogued Subjects: ${allSubjects.length}`);
  console.log(`Subjects WITH Materials:    ${subjectsWithMaterials.length}`);
  console.log(`EMPTY Subjects (0 Materials): ${emptySubjects.length}`);
  console.log(`======================================================\n`);

  // Group empty subjects by department
  const emptyByDept = {};
  for (const s of emptySubjects) {
    const dKey = `${s.departmentName} (${s.departmentCode}) [${s.departmentId}]`;
    if (!emptyByDept[dKey]) emptyByDept[dKey] = {};
    const semKey = `Semester ${s.semesterId}`;
    if (!emptyByDept[dKey][semKey]) emptyByDept[dKey][semKey] = [];
    emptyByDept[dKey][semKey].push(s);
  }

  // Save audit data to JSON for reference
  const outDir = path.resolve('paperino', 'scratch');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'audit_empty_subjects.json'), JSON.stringify({
    summary: {
      totalSubjects: allSubjects.length,
      withMaterials: subjectsWithMaterials.length,
      emptySubjects: emptySubjects.length
    },
    emptySubjects,
    subjectsWithMaterials
  }, null, 2));

  console.log(`Full JSON saved to ${path.join(outDir, 'audit_empty_subjects.json')}`);
}

audit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
