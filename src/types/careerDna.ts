export interface CareerDnaProfile {
  fullName: string;
  college: string;
  department: string;
  currentYear: number;
  graduationYear: number;
  
  dreamRole: string;
  dreamCompany: string;
  goal: "internship" | "placement" | "higher_studies";
  preferredLocation: string;
  
  cgpa: number;
  tenthPercentage: number;
  twelfthPercentage: number;
  activeBacklogs: number;
  
  languages: string[];
  languagesKnown: string[];
  frameworks: string[];
  tools: string[];
  certifications: string[];
  projects: string[];
  github: string;
  linkedin: string;
  portfolio: string;
  resumeUrl?: string;
  resumeText?: string;
  
  updatedAt?: any;
}

export interface CareerOpportunity {
  id: string;
  role: string;
  company: string;
  companyLogo?: string;
  location: string;
  workType?: "Remote" | "Hybrid" | "Onsite";
  type: string;
  stipend?: string;
  duration?: string;
  matchLevel: "High Match" | "Medium Match" | "Stretch Opportunity";
  matchScore: number; // 0-100 match percentage
  matchReasons: string[];
  matchedSkills?: string[];
  requiredSkills?: string[];
  missingSkills: string[];
  applyLink: string;
  postedDate?: number;
  deadline?: number;
  verified?: boolean;
  source?: string;
  sources?: string[];
  eligibilityBreakdown: {
    isEligible: boolean;
    reasons: string[];
    suggestions: string[];
  };
}

export interface CareerAnalysisResult {
  readinessLevel: number;
  suggestions: string[];
  opportunities: CareerOpportunity[];
  lastSyncedAt?: number;
}
