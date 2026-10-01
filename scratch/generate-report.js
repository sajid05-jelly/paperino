const admin = require('firebase-admin');
const fs = require('fs');

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  require('dotenv').config({ path: '.env.local' });
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

const STATIC_SUBJECTS = {
  "1": [
    { id: "calc", name: "Calculus And Linear Algebra" },
    { id: "chem", name: "Chemistry" },
    { id: "poe", name: "Philosophy Of Engineering" },
    { id: "icb", name: "Introduction To Computational Biology" },
    { id: "pps", name: "Programming For Problem Solving" },
    { id: "foe", name: "Fundamental Of Economics (FOE)" },
    { id: "bs", name: "Biomedical Sensors" },
    { id: "fl", name: "Foreign Languages" },
    { id: "cb", "name": "Cell Biology" },
    { id: "mb", "name": "Microbiology" },
    { id: "pac", "name": "Physical And Analytical Chemistry" },
    { id: "biochem", "name": "Biochemistry" },
    { id: "bcmw", "name": "Basic Civil & Mechanical Workshop" },
    { id: "bio", "name": "Biology" }
  ],
  "2": [
    { id: "acca", name: "Advanced Calculus And Complex Analysis" },
    { id: "eee", name: "Electrical And Electronics Engineering" },
    { id: "spcm", name: "Semiconductor Physics And Computational Methods" },
    { id: "pm", name: "Physics-Mechanics" },
    { id: "oodp", name: "Object Oriented Design And Programming" },
    { id: "ce", name: "Communicative English" },
    { id: "ep", name: "Electromagnetic Physics" },
    { id: "em", name: "Engineering Mechanics" },
    { id: "espcb", name: "Electronic System And PCB Design" },
    { id: "bmtbe", name: "Building Materials In The Built Environment" },
    { id: "bac", name: "Basic Of Accounting And Costing" },
    { id: "ps", name: "Probability And Statistics" }
  ],
  "3": [
    { id: "dsa", name: "Data Structures And Algorithm" },
    { id: "coa", name: "Computer Organization And Architecture" },
    { id: "os", name: "Operating Systems" },
    { id: "tbvp", name: "Transforms And Boundary Value Problems" },
    { id: "app", name: "Advanced Programming Practice" },
    { id: "dtm", name: "Design Thinking And Methodology" },
    { id: "dld", name: "Digital Logic Design" },
    { id: "ssd", name: "Solid State Devices" },
    { id: "biochem3", name: "Biochemistry" },
    { id: "eti", name: "Electromagnetic Theory And Interference" },
    { id: "bce", name: "Basic Chemical Engineering" },
    { id: "bp", name: "Bioprocess Principles" },
    { id: "gc", name: "Genetics And Cytogenetics" },
    { id: "microbio3", name: "Microbiology" },
    { id: "se", name: "Social Engineering" },
    { id: "nma", name: "Numerical Methods & Analysis" },
    { id: "fds", name: "Foundation of Data Science (FDS)" }
  ],
  "4": [
    { id: "daa", name: "Design And Analysis Of Algorithms" },
    { id: "dbms4", name: "Database Management Systems" },
    { id: "ai4", name: "Artificial Intelligence" },
    { id: "pqt", name: "Probability And Queueing Theory" },
    { id: "se4", name: "Social Engineering" },
    { id: "bpe", name: "Bioprocess Engineering" },
    { id: "ccs", name: "Cell Communication And Signaling" },
    { id: "sp", name: "Software Process" },
    { id: "cep", name: "Chemical Engineering Principles" },
    { id: "mb4", name: "Molecular Biology" },
    { id: "iot4", name: "Internet Of Things (IOT)" },
    { id: "pas", name: "Probability & Applied Statistics" },
    { id: "dip", name: "Digital Image Processing" },
    { id: "sigp", name: "Signal Processing" },
    { id: "cga", name: "CGA" },
    { id: "pft", name: "Programming for Financial Technologies [Honours]" },
    { id: "qc", name: "Quantum Computing [Honours]" },
    { id: "bdtt", name: "Big Data Tools And Techniques" }
  ],
  "5": [
    { id: "dm", name: "Discrete Mathematics" },
    { id: "fla", name: "Formal Language And Automata" },
    { id: "cn5", name: "Computer Networks" },
    { id: "ml5", name: "Machine Learning" },
    { id: "fswd", name: "Full Stack Web Development" },
    { id: "wtwtw", name: "Waste To Wealth To Wheels" },
    { id: "iaf", name: "Indian Art Form" },
    { id: "cc5", name: "Community Connect" }
  ],
  "6": [
    { id: "sepm", name: "Software Engineering And Project Management" },
    { id: "cd6", name: "Compiler Design" },
    { id: "ds6", name: "Data Science" },
    { id: "nlp", name: "Natural Language Processing" },
    { id: "cc6", name: "Cloud Computing" },
    { id: "proj6", name: "Project" },
    { id: "tqmre", name: "TQM And Reliability Engineering" },
    { id: "itk", name: "Indian Traditional Knowledge" },
    { id: "pb", name: "Plant Biotechnology" },
    { id: "ab", name: "Animal Biotechnology" },
    { id: "mt", name: "Marine Technology" }
  ],
  "7": [
  ],
  "8": [
    { id: "proj", name: "Major Project" },
    { id: "intern", name: "Internship" }
  ]
};

async function main() {
  const departmentsMap = new Map();
  // We need department names for display. 
  // Let's fetch them
  const deptsSnap = await db.collection("departments").get();
  deptsSnap.forEach(d => {
    departmentsMap.set(d.id, { id: d.id, ...d.data() });
  });

  // Default dept
  if (!departmentsMap.has("btech")) {
    departmentsMap.set("btech", {
      id: "btech",
      name: "Bachelor of Technology",
      code: "B.Tech"
    });
  }

  const allSubjects = [];
  
  // 1. Add static subjects
  for (const [semId, subs] of Object.entries(STATIC_SUBJECTS)) {
    for (const sub of subs) {
      allSubjects.push({
        id: sub.id,
        name: sub.name,
        departmentId: "btech",
        semesterId: String(semId),
      });
    }
  }

  // 2. Add dynamic subjects
  const dynSubSnap = await db.collection("dynamic_subjects").get();
  dynSubSnap.forEach(doc => {
    const data = doc.data();
    allSubjects.push({
      id: doc.id,
      name: data.name,
      departmentId: data.departmentId,
      semesterId: String(data.semesterId),
    });
  });

  // 3. Fetch all approved materials
  const matSnap = await db.collection("materials").where("status", "==", "approved").get();
  const materials = [];
  matSnap.forEach(doc => {
    materials.push({ id: doc.id, ...doc.data() });
  });

  // Build structure: Dept -> Sem -> Subject
  const reportStructure = {};

  allSubjects.forEach(sub => {
    const dId = sub.departmentId || "UNKNOWN";
    const sId = sub.semesterId || "UNKNOWN";
    const deptObj = departmentsMap.get(dId);
    let deptDisplay = dId.toUpperCase();
    if (deptObj) {
      deptDisplay = deptObj.code || deptObj.name || dId.toUpperCase();
    }

    if (!reportStructure[deptDisplay]) {
      reportStructure[deptDisplay] = {};
    }
    if (!reportStructure[deptDisplay][sId]) {
      reportStructure[deptDisplay][sId] = [];
    }

    // Determine category availability
    // Categories are: 'pyq', 'notes', 'questions'
    const subjectMaterials = materials.filter(m => m.subjectId === sub.id && m.semesterId === String(sId));
    
    // Some materials might not have a departmentId, but if they do, we can strictly match
    // Actually, Paperino maps usually by subjectId & semesterId.
    const hasPyq = subjectMaterials.some(m => m.category === 'pyq');
    const hasNotes = subjectMaterials.some(m => m.category === 'notes');
    const hasQuestions = subjectMaterials.some(m => m.category === 'questions');

    reportStructure[deptDisplay][sId].push({
      subjectId: sub.id,
      name: sub.name,
      hasPyq,
      hasNotes,
      hasQuestions,
      totalCount: subjectMaterials.length,
      deptId: dId
    });
  });

  let report = `# MISSING MATERIALS REPORT\n\n`;

  let totalSubjects = 0;
  let allThree = 0;
  let missingAtLeastOne = 0;
  let zeroMaterials = 0;

  const missingPyqList = [];
  const missingNotesList = [];
  const missingQuestionsList = [];
  const zeroList = [];
  const fullTable = [];

  // Sort department names
  const deptNames = Object.keys(reportStructure).sort();

  deptNames.forEach(dept => {
    report += `DEPARTMENT: ${dept}\n\n`;
    const semesters = Object.keys(reportStructure[dept]).sort((a,b) => Number(a) - Number(b));
    
    semesters.forEach(sem => {
      report += `Semester ${sem}\n\n`;
      const subjects = reportStructure[dept][sem].sort((a,b) => a.name.localeCompare(b.name));
      
      subjects.forEach((sub, index) => {
        totalSubjects++;
        
        const cPyq = sub.hasPyq ? "✅" : "❌";
        const cNotes = sub.hasNotes ? "✅" : "❌";
        const cQ = sub.hasQuestions ? "✅" : "❌";

        report += `${index + 1}. ${sub.name}\n`;
        report += `   ${cPyq} Past Papers / PYQs\n`;
        report += `   ${cNotes} Syllabus & Notes\n`;
        report += `   ${cQ} Key Questions & Guides\n\n`;

        const missingCount = (!sub.hasPyq ? 1 : 0) + (!sub.hasNotes ? 1 : 0) + (!sub.hasQuestions ? 1 : 0);
        
        if (missingCount === 0) allThree++;
        if (missingCount > 0) missingAtLeastOne++;
        if (missingCount === 3) zeroMaterials++;

        const locationStr = `${dept} | Semester ${sem} | ${sub.name}`;
        
        if (!sub.hasPyq) missingPyqList.push(locationStr);
        if (!sub.hasNotes) missingNotesList.push(locationStr);
        if (!sub.hasQuestions) missingQuestionsList.push(locationStr);
        if (missingCount === 3) zeroList.push(locationStr);

        fullTable.push(`| ${dept} | ${sem} | ${sub.name} | ${cPyq} | ${cNotes} | ${cQ} | ${sub.totalCount} |`);
      });
    });
  });

  report += `==================================================\n`;
  report += `SUMMARY\n`;
  report += `==================================================\n\n`;
  report += `TOTAL SUBJECTS:\n${totalSubjects}\n\n`;
  report += `SUBJECTS WITH ALL 3 CATEGORIES AVAILABLE:\n${allThree}\n\n`;
  report += `SUBJECTS MISSING AT LEAST ONE CATEGORY:\n${missingAtLeastOne}\n\n`;
  report += `SUBJECTS WITH ZERO MATERIALS:\n${zeroMaterials}\n\n`;

  report += `==================================================\n`;
  report += `A. Subjects missing Past Papers / PYQs\n`;
  report += `==================================================\n`;
  missingPyqList.forEach(item => report += `${item}\n`);
  report += `\n`;

  report += `==================================================\n`;
  report += `B. Subjects missing Syllabus & Notes\n`;
  report += `==================================================\n`;
  missingNotesList.forEach(item => report += `${item}\n`);
  report += `\n`;

  report += `==================================================\n`;
  report += `C. Subjects missing Key Questions & Guides\n`;
  report += `==================================================\n`;
  missingQuestionsList.forEach(item => report += `${item}\n`);
  report += `\n`;

  report += `==================================================\n`;
  report += `D. Subjects with ZERO approved materials\n`;
  report += `==================================================\n`;
  zeroList.forEach(item => report += `${item}\n`);
  report += `\n`;

  report += `==================================================\n`;
  report += `FULL TABLE\n`;
  report += `==================================================\n\n`;
  report += `| Department | Semester | Subject | PYQs | Syllabus & Notes | Key Questions & Guides | Total Approved Materials |\n`;
  report += `|---|---|---|---|---|---|---|\n`;
  fullTable.forEach(row => report += `${row}\n`);

  fs.writeFileSync('scratch/missing-materials-report.md', report);
  console.log('Report generated at scratch/missing-materials-report.md');
}

main().catch(console.error);
