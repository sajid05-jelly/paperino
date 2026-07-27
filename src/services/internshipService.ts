import { Internship, MatchedOpportunity } from "@/types/internship";

export const INITIAL_INTERNSHIPS: Internship[] = [
  {
    id: "int_unstop_001",
    title: "Frontend Developer Intern (React/Next.js)",
    company: "Vercel Partner Labs",
    companyLogo: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=120&h=120&fit=crop",
    location: "Remote",
    workType: "Remote",
    type: "Internship",
    stipend: "₹25,000 / month",
    duration: "3 Months",
    departmentEligibility: ["Computer Science", "Information Technology", "All"],
    minYear: 2,
    minCgpa: 6.5,
    requiredSkills: ["JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS"],
    targetRoles: ["Frontend Developer", "Full Stack Developer", "Web Developer", "Software Engineer"],
    applyUrl: "https://unstop.com/o/react-frontend-developer-internship-1084920",
    postedDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 25 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_002",
    title: "Backend & Systems Intern (Node.js/Go)",
    company: "Razorpay Tech",
    companyLogo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=120&h=120&fit=crop",
    location: "Bengaluru (Hybrid)",
    workType: "Hybrid",
    type: "Internship",
    stipend: "₹35,000 / month",
    duration: "6 Months",
    departmentEligibility: ["Computer Science", "Information Technology", "ECE"],
    minYear: 3,
    minCgpa: 7.0,
    requiredSkills: ["Node.js", "Go", "Express.js", "PostgreSQL", "Redis", "Docker", "REST API"],
    targetRoles: ["Backend Developer", "Software Engineer", "Systems Engineer"],
    applyUrl: "https://unstop.com/o/backend-systems-engineering-internship-1085201",
    postedDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 20 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_003",
    title: "AI & Machine Learning Engineering Intern",
    company: "Google Cloud AI Partner",
    companyLogo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&h=120&fit=crop",
    location: "Remote",
    workType: "Remote",
    type: "Internship",
    stipend: "₹40,000 / month",
    duration: "6 Months",
    departmentEligibility: ["Computer Science", "Information Technology", "AI & Data Science", "All"],
    minYear: 2,
    minCgpa: 7.5,
    requiredSkills: ["Python", "PyTorch", "TensorFlow", "FastAPI", "NLP", "Scikit-Learn"],
    targetRoles: ["AI Engineer", "Machine Learning Engineer", "Data Scientist"],
    applyUrl: "https://unstop.com/internships/ai-machine-learning-engineering-intern-google-partner-1093821",
    postedDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_004",
    title: "Full Stack Software Developer Intern",
    company: "Swiggy Engineering",
    companyLogo: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=120&h=120&fit=crop",
    location: "Bengaluru",
    workType: "Onsite",
    type: "Internship",
    stipend: "₹30,000 / month",
    duration: "4 Months",
    departmentEligibility: ["Computer Science", "Information Technology"],
    minYear: 3,
    minCgpa: 7.0,
    requiredSkills: ["React", "Node.js", "Java", "Spring Boot", "MySQL", "Git"],
    targetRoles: ["Full Stack Developer", "Software Engineer"],
    applyUrl: "https://unstop.com/o/full-stack-software-developer-internship-1087410",
    postedDate: Date.now() - 4 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 18 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_005",
    title: "Cyber Security & SOC Analyst Trainee",
    company: "Palo Alto Networks Campus",
    companyLogo: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=120&h=120&fit=crop",
    location: "Chennai (Onsite)",
    workType: "Onsite",
    type: "Internship",
    stipend: "₹22,000 / month",
    duration: "3 Months",
    departmentEligibility: ["Computer Science", "Information Technology", "Cyber Security", "ECE"],
    minYear: 2,
    minCgpa: 6.5,
    requiredSkills: ["Linux", "Networking", "Wireshark", "Python", "Ethical Hacking", "SIEM"],
    targetRoles: ["Cyber Security Analyst", "Security Engineer", "Network Engineer"],
    applyUrl: "https://unstop.com/o/cyber-security-soc-analyst-trainee-1088920",
    postedDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 14 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_006",
    title: "Embedded Systems & IoT Engineering Intern",
    company: "Bosch India Research",
    companyLogo: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&h=120&fit=crop",
    location: "Coimbatore",
    workType: "Onsite",
    type: "Internship",
    stipend: "₹20,000 / month",
    duration: "6 Months",
    departmentEligibility: ["ECE", "EEE", "Mechanical", "Robotics"],
    minYear: 3,
    minCgpa: 7.0,
    requiredSkills: ["C", "C++", "Embedded C", "MATLAB", "Microcontrollers", "RTOS", "Arduino"],
    targetRoles: ["Embedded Engineer", "IoT Developer", "Hardware Engineer"],
    applyUrl: "https://unstop.com/o/embedded-systems-iot-engineering-internship-1090123",
    postedDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 22 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_007",
    title: "Data Analyst & Business Intelligence Intern",
    company: "Zomato Analytics",
    companyLogo: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=120&h=120&fit=crop",
    location: "Gurugram (Hybrid)",
    workType: "Hybrid",
    type: "Internship",
    stipend: "₹28,000 / month",
    duration: "3 Months",
    departmentEligibility: ["Computer Science", "Information Technology", "AI & Data Science", "MBA"],
    minYear: 2,
    minCgpa: 6.5,
    requiredSkills: ["SQL", "Python", "Power BI", "Tableau", "Excel", "Pandas"],
    targetRoles: ["Data Analyst", "Business Analyst", "Data Engineer"],
    applyUrl: "https://unstop.com/internships/data-analyst-internship-zomato-1082194",
    postedDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 28 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_008",
    title: "Flutter & Mobile App Development Intern",
    company: "Cred Tech Labs",
    companyLogo: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=120&h=120&fit=crop",
    location: "Remote",
    workType: "Remote",
    type: "Internship",
    stipend: "₹30,000 / month",
    duration: "4 Months",
    departmentEligibility: ["Computer Science", "Information Technology", "All"],
    minYear: 2,
    minCgpa: 6.0,
    requiredSkills: ["Flutter", "Dart", "Firebase", "REST API", "Git", "State Management"],
    targetRoles: ["Mobile App Developer", "Flutter Developer", "Frontend Developer"],
    applyUrl: "https://unstop.com/o/flutter-mobile-app-developer-internship-1086540",
    postedDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 19 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_009",
    title: "UI/UX Product Design Intern",
    company: "Zeta Suite",
    companyLogo: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=120&h=120&fit=crop",
    location: "Remote",
    workType: "Remote",
    type: "Internship",
    stipend: "₹25,000 / month",
    duration: "3 Months",
    departmentEligibility: ["Design", "Computer Science", "Information Technology", "All"],
    minYear: 1,
    minCgpa: 6.0,
    requiredSkills: ["Figma", "User Research", "Wireframing", "Prototyping", "Design Systems"],
    targetRoles: ["UI/UX Designer", "Product Designer"],
    applyUrl: "https://unstop.com/internships/ui-ux-design-internship-zeta-1077421",
    postedDate: Date.now() - 6 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 12 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  },
  {
    id: "int_unstop_010",
    title: "Bioinformatics & Genomic Data Analytics Intern",
    company: "Biocon Research Institute",
    companyLogo: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=120&h=120&fit=crop",
    location: "Bengaluru",
    workType: "Onsite",
    type: "Internship",
    stipend: "₹20,000 / month",
    duration: "6 Months",
    departmentEligibility: ["Biotechnology", "Biomedical", "Bioinformatics"],
    minYear: 3,
    minCgpa: 7.0,
    requiredSkills: ["Python", "R", "Bioinformatics", "BLAST", "Genomics", "SQL"],
    targetRoles: ["Bioinformatics Engineer", "Biotech Researcher"],
    applyUrl: "https://unstop.com/internships/bioinformatics-genomic-data-analytics-intern-1098432",
    postedDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
    deadline: Date.now() + 27 * 24 * 60 * 60 * 1000,
    verified: true,
    source: "Unstop",
    active: true
  }
];

/**
 * Calculates a comprehensive 0-100% match score for a student profile against an Unstop internship opportunity.
 */
export function calculateMatchScore(profile: any, internship: Internship): {
  score: number;
  level: "High Match" | "Medium Match" | "Stretch Opportunity";
  reasons: string[];
  missingSkills: string[];
  suggestions: string[];
} {
  const dreamRole = (profile.dreamRole || "").toLowerCase();
  const studentSkills = new Set(
    [
      ...(profile.languages || []),
      ...(profile.languagesKnown || []),
      ...(profile.frameworks || []),
      ...(profile.tools || []),
    ].map((s: string) => s.toLowerCase().trim())
  );

  if (profile.resumeText) {
    const textLower = profile.resumeText.toLowerCase();
    (internship.requiredSkills || []).forEach(sk => {
      if (textLower.includes(sk.toLowerCase())) {
        studentSkills.add(sk.toLowerCase());
      }
    });
  }

  let roleScore = 0;
  const targetRoles = (internship.targetRoles || []).map(r => r.toLowerCase());
  const titleLower = internship.title.toLowerCase();

  if (targetRoles.some(r => dreamRole.includes(r) || r.includes(dreamRole)) || titleLower.includes(dreamRole)) {
    roleScore = 30;
  } else if (dreamRole.length > 0) {
    roleScore = 15;
  } else {
    roleScore = 20;
  }

  let matchedSkillsCount = 0;
  const reqSkills = internship.requiredSkills || [];
  const missingSkills: string[] = [];

  reqSkills.forEach(sk => {
    if (studentSkills.has(sk.toLowerCase())) {
      matchedSkillsCount++;
    } else {
      missingSkills.push(sk);
    }
  });

  const skillsScore = reqSkills.length > 0 ? Math.round((matchedSkillsCount / reqSkills.length) * 30) : 25;

  let deptScore = 0;
  const studentDept = profile.department || "";
  const allowedDepts = internship.departmentEligibility || [];

  if (allowedDepts.includes("All") || allowedDepts.some(d => d.toLowerCase() === studentDept.toLowerCase())) {
    deptScore = 15;
  } else {
    deptScore = 8;
  }

  let yearScore = 0;
  const currentYear = profile.currentYear || 1;
  if (currentYear >= internship.minYear) {
    yearScore = 10;
  } else {
    yearScore = 5;
  }

  let cgpaScore = 0;
  const cgpa = profile.cgpa || 8.0;
  if (cgpa >= internship.minCgpa) {
    cgpaScore = 10;
  } else {
    cgpaScore = 4;
  }

  let locationScore = 5;
  if (profile.preferredLocation && profile.preferredLocation.toLowerCase() !== "any") {
    const pref = profile.preferredLocation.toLowerCase();
    const loc = internship.location.toLowerCase();
    if (loc.includes(pref) || (pref.includes("remote") && internship.workType === "Remote")) {
      locationScore = 5;
    } else {
      locationScore = 3;
    }
  }

  const rawScore = roleScore + skillsScore + deptScore + yearScore + cgpaScore + locationScore;
  const score = Math.min(100, Math.max(10, rawScore));

  let level: "High Match" | "Medium Match" | "Stretch Opportunity" = "Stretch Opportunity";
  if (score >= 80) {
    level = "High Match";
  } else if (score >= 65) {
    level = "Medium Match";
  }

  const reasons: string[] = [];
  if (roleScore >= 25) {
    reasons.push(`✔ Target role matches "${internship.title}"`);
  }
  if (matchedSkillsCount > 0) {
    reasons.push(`✔ Matched ${matchedSkillsCount} required skill(s): ${reqSkills.filter(sk => studentSkills.has(sk.toLowerCase())).join(", ")}`);
  }
  if (cgpa >= internship.minCgpa) {
    reasons.push(`✔ CGPA requirement met (${cgpa} / ${internship.minCgpa})`);
  }
  if (currentYear >= internship.minYear) {
    reasons.push(`✔ Year criteria satisfied (${currentYear}th Year Eligible)`);
  }
  if (deptScore === 15) {
    reasons.push(`✔ Open to ${studentDept || "all academic"} departments`);
  }

  const suggestions: string[] = [];
  if (missingSkills.length > 0) {
    suggestions.push(`Learn ${missingSkills.slice(0, 2).join(" & ")} to boost match percentage`);
  }
  if (cgpa < internship.minCgpa) {
    suggestions.push(`Improve CGPA target above ${internship.minCgpa}`);
  }

  return {
    score,
    level,
    reasons,
    missingSkills,
    suggestions
  };
}

/**
 * Ranks Unstop internship opportunities for a student's profile.
 * Strictly excludes any opportunity lacking a valid Unstop URL or non-Unstop provider.
 */
export function rankOpportunitiesForUser(profile: any, internships: Internship[]): MatchedOpportunity[] {
  const now = Date.now();
  const seenKeys = new Set<string>();

  return internships
    .filter(i => {
      if (!i.active || (i.deadline && i.deadline <= now)) return false;
      if (!i.applyUrl || !i.applyUrl.toLowerCase().includes("unstop.com")) return false;
      const uniqueKey = `${(i.company || "").toLowerCase().trim()}_${(i.title || "").toLowerCase().trim()}`;
      if (seenKeys.has(uniqueKey) || seenKeys.has(i.id)) return false;
      seenKeys.add(uniqueKey);
      seenKeys.add(i.id);
      return true;
    })
    .map((internship) => {
      const match = calculateMatchScore(profile, internship);
      return {
        ...internship,
        source: "Unstop",
        matchScore: match.score,
        matchLevel: match.level,
        matchReasons: match.reasons,
        missingSkills: match.missingSkills,
        actionSuggestions: match.suggestions
      };
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return b.postedDate - a.postedDate;
    });
}
