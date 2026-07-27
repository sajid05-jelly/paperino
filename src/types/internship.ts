export interface Internship {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workType: "Remote" | "Hybrid" | "Onsite";
  type: "Internship" | "Full-time" | "Project";
  stipend: string;
  duration: string;
  departmentEligibility: string[];
  minYear: number;
  minCgpa: number;
  requiredSkills: string[];
  targetRoles: string[];
  applyUrl: string;
  postedDate: number;
  deadline: number;
  verified: boolean;
  source: string;
  active: boolean;
}

export interface MatchedOpportunity extends Internship {
  matchScore: number;
  matchLevel: "High Match" | "Medium Match" | "Stretch Opportunity";
  matchReasons: string[];
  missingSkills: string[];
  actionSuggestions: string[];
}
