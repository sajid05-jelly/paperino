export interface StandardInternship {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  opportunityType: "Internship" | "Placement" | "Higher Studies" | "Other";
  skills: string[];
  eligibility: {
    minCgpa?: number;
    maxBacklogs?: number;
    targetYears?: number[];
    departments?: string[];
  };
  registrationStatus?: string;
  deadline?: string;
  applyUrl: string;
  source: string;
  lastUpdated: string;
}

export interface InternshipProvider {
  name: string;
  fetchInternships(): Promise<StandardInternship[]>;
}
