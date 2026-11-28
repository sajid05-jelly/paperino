const fs = require('fs');

const driveFiles = JSON.parse(fs.readFileSync('src/data/drive_materials_catalog.json', 'utf8'));
const configuredSections = JSON.parse(fs.readFileSync('src/data/configured_sections.json', 'utf8'));

// Build section map to enhance titles or metadata
const sectionLookup = new Map();
configuredSections.forEach(s => {
  const key = `${s.departmentId}_${s.semesterId}_${s.subjectId}_${s.sectionType}`.toLowerCase();
  sectionLookup.set(key, s);
});

const verifiedMaterials = [];
const seenFileIds = new Set();

driveFiles.forEach(file => {
  if (seenFileIds.has(file.id)) return;
  seenFileIds.add(file.id);

  const rawName = file.name;
  
  // Format: dept_semX_subjectId_title.ext
  const match = rawName.match(/^([a-z0-9_-]+)_sem(\d+)_([^_]+)_(.+)$/i);
  if (!match) return;

  let rawDept = match[1].toLowerCase();
  let dept = rawDept.split('_')[0]; // Clean up if double prefixed like btech_sem4_...
  let sem = match[2];
  let subjectId = match[3].toLowerCase();
  let rawTitle = match[4];

  // Determine category from filename
  const lowerName = rawName.toLowerCase();
  let category = 'notes';
  if (lowerName.includes('pyq') || lowerName.includes('question paper') || lowerName.includes('exam paper') || lowerName.includes('cla2') || lowerName.includes('degree exam') || lowerName.includes('set a') || lowerName.includes('set b')) {
    category = 'pyq';
  } else if (lowerName.includes('question bank') || lowerName.includes('important question') || lowerName.includes('important topics') || lowerName.includes('repeated questions') || lowerName.includes('mcq') || lowerName.includes('questions')) {
    category = 'questions';
  } else {
    category = 'notes';
  }

  // Format clean human-readable title
  let cleanTitle = rawTitle
    .replace(/\.[^/.]+$/, '') // remove extension
    .replace(/- paperinoi?$/i, '')
    .replace(/ - paperinoi?$/i, '')
    .replace(/_paperinoi?$/i, '')
    .replace(/_No_Watermark/gi, '')
    .replace(/ - Kalrav/gi, '')
    .replace(/_/g, ' ')
    .trim();

  // If title is just an image timestamp or UUID, give it a better name
  if (/^(img-\d+|\d+-[a-f0-9-]+|[0-9a-f]{8}-[0-9a-f]{4})/i.test(cleanTitle)) {
    const catLabel = category === 'pyq' ? 'Past Question Paper' : category === 'questions' ? 'Important Questions' : 'Lecture Notes';
    cleanTitle = `${subjectId.toUpperCase()} — ${catLabel}`;
  }

  const createdTime = file.createdTime ? new Date(file.createdTime).getTime() : Date.now();

  verifiedMaterials.push({
    id: `mat_${file.id}`,
    title: cleanTitle,
    fileName: rawName,
    fileId: file.id,
    fileUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view?usp=sharing`,
    departmentId: dept,
    semesterId: String(sem),
    subjectId: subjectId,
    category: category,
    status: 'approved',
    creatorName: 'Paperino Verified Contributor',
    createdAt: createdTime,
    fileSize: file.size ? parseInt(file.size, 10) : undefined,
    mimeType: file.mimeType,
    isLocalVerified: true
  });
});

console.log('Total verified materials compiled:', verifiedMaterials.length);
fs.writeFileSync('src/data/verified_materials.json', JSON.stringify(verifiedMaterials, null, 2));
console.log('Saved to src/data/verified_materials.json');
