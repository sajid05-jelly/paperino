import catalogData from "@/data/comprehensive_catalog.json";

export interface StaticSubject {
  id: string;
  name: string;
}

export interface CatalogSubject {
  id: string;
  name: string;
  code?: string;
  departmentId: string;
  semesterId: string;
  sections?: string[];
  status?: string;
  contributorId?: string;
  contributorName?: string;
}

export interface StaticDepartment {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
  status: "approved" | "pending" | "rejected";
}

export const DEFAULT_DEPARTMENTS: StaticDepartment[] = [
  { id: "btech", name: "Bachelor of Technology", code: "B.Tech", totalSemesters: 8, status: "approved" },
  { id: "be", name: "Bachelor of Engineering", code: "B.E", totalSemesters: 8, status: "approved" },
  { id: "mca", name: "Master of Computer Applications", code: "MCA", totalSemesters: 4, status: "approved" },
  { id: "mba", name: "Master of Business Administration", code: "MBA", totalSemesters: 4, status: "approved" },
  { id: "me-cse", name: "M.E Computer Science and Engineering", code: "M.E CSE", totalSemesters: 4, status: "approved" },
  { id: "me-se", name: "M.E Structural Engineering", code: "M.E SE", totalSemesters: 4, status: "approved" },
  { id: "science", name: "Faculty of Science and Humanities", code: "B.Sc", totalSemesters: 6, status: "approved" },
  { id: "commerce", name: "School of Commerce", code: "B.Com", totalSemesters: 6, status: "approved" },
  { id: "allied-health-sciences", name: "Allied Health Sciences", code: "AHS", totalSemesters: 8, status: "approved" },
  { id: "bsc-cardio-perfusion-technology", name: "B.Sc Cardio Perfusion Technology", code: "CPT", totalSemesters: 8, status: "approved" },
];

/**
 * Robust department normalization matching:
 * Matches slug, name, and standard abbreviations (e.g. "bachelor-of-technology" <-> "btech", "B.Tech", "bachelor of technology")
 */
export function isMatchingDepartment(reqDept?: string | null, docDept?: string | null): boolean {
  if (!reqDept || reqDept === "all" || !docDept) return true;
  const d1 = String(reqDept).toLowerCase().replace(/[^a-z0-9]/g, "");
  const d2 = String(docDept).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (d1 === d2) return true;

  const isBtechOrEngg1 = d1.includes("btech") || d1.includes("bachelor") || d1.includes("technology") || d1.includes("be") || d1.includes("engineering");
  const isBtechOrEngg2 = d2.includes("btech") || d2.includes("bachelor") || d2.includes("technology") || d2.includes("be") || d2.includes("engineering") || d2.includes("mtech");
  if (isBtechOrEngg1 && isBtechOrEngg2) return true;

  const isMca1 = d1.includes("mca") || d1.includes("computerapplication");
  const isMca2 = d2.includes("mca") || d2.includes("computerapplication");
  if (isMca1 && isMca2) return true;

  const isMba1 = d1.includes("mba") || d1.includes("businessadmin");
  const isMba2 = d2.includes("mba") || d2.includes("businessadmin");
  if (isMba1 && isMba2) return true;

  const isCommerce1 = d1.includes("commerce") || d1.includes("bcom");
  const isCommerce2 = d2.includes("commerce") || d2.includes("bcom");
  if (isCommerce1 && isCommerce2) return true;

  const isScience1 = d1.includes("science") || d1.includes("bsc");
  const isScience2 = d2.includes("science") || d2.includes("bsc");
  if (isScience1 && isScience2) return true;

  return false;
}

export const COMPREHENSIVE_CATALOG: CatalogSubject[] = catalogData as CatalogSubject[];

export const SUBJECTS: Record<string, StaticSubject[]> = {
  "1": [
    { id: "calc", name: "Calculus And Linear Algebra" },
    { id: "chem", name: "Chemistry" },
    { id: "poe", name: "Philosophy Of Engineering" },
    { id: "icb", name: "Introduction To Computational Biology" },
    { id: "pps", name: "Programming For Problem Solving" },
    { id: "foe", name: "Fundamental Of Economics (FOE)" },
    { id: "bs", name: "Biomedical Sensors" },
    { id: "fl", name: "Foreign Languages" },
    { id: "cb", name: "Cell Biology" },
    { id: "mb", name: "Microbiology" },
    { id: "pac", name: "Physical And Analytical Chemistry" },
    { id: "biochem", name: "Biochemistry" },
    { id: "bcmw", name: "Basic Civil & Mechanical Workshop" },
    { id: "bio", name: "Biology" },
    { id: "eg", name: "Engineering Graphics" },
    { id: "bce", name: "Basic Civil Engineering" },
    { id: "bme", name: "Basic Mechanical Engineering" },
    { id: "evs", name: "Environmental Science" }
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
    { id: "fds", name: "Foundation of Data Science (FDS)" },
    { id: "oops", name: "Object Oriented Programming" }
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
    { id: "bp7", name: "Behavioural Psychology" },
    { id: "cv7", name: "Computer Vision" },
    { id: "sw7", name: "Semantic Web" },
    { id: "soa7", name: "Service Oriented Architecture" },
    { id: "sss7", name: "Smart Sensor System" },
    { id: "bd7", name: "Big Data Analytics" },
    { id: "cs7", name: "Cyber Security" },
    { id: "dl7", name: "Deep Learning" }
  ],
  "8": [
    { id: "proj", name: "Major Project" },
    { id: "intern", name: "Internship" }
  ]
};
