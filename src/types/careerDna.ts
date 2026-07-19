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
  location: string;
  type: "Internship" | "Placement" | "Higher Studies";
  matchLevel: "High Match" | "Medium Match" | "Stretch Opportunity";
  matchScore: number; // 0-100 hidden readiness indicator
  matchReasons: string[];
  missingSkills: string[];
  applyLink: string;
  eligibilityBreakdown: {
    isEligible: boolean;
    reasons: string[];
    suggestions: string[];
  };
}

export interface CareerAnalysisResult {
  readinessLevel: "High Ready" | "Medium Ready" | "Beginner";
  suggestions: string[];
  opportunities: CareerOpportunity[];
}
