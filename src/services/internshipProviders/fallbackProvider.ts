import { InternshipProvider, StandardInternship } from "./types";

export class FallbackProvider implements InternshipProvider {
  name = "Curated";

  async fetchInternships(): Promise<StandardInternship[]> {
    const list: StandardInternship[] = [
      {
        id: "curated_netflix_fullstack",
        title: "Full Stack Developer Intern",
        company: "Netflix",
        location: "Chennai (Remote)",
        opportunityType: "Internship",
        skills: ["javascript", "react", "node.js", "git"],
        eligibility: {
          minCgpa: 8.0,
          maxBacklogs: 0,
          targetYears: [2, 3],
          departments: ["cse", "it", "ece", "mca", "btech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://jobs.netflix.com/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_google_swe",
        title: "Software Engineer Intern",
        company: "Google",
        location: "Chennai",
        opportunityType: "Internship",
        skills: ["java", "python", "c++", "data structures", "git"],
        eligibility: {
          minCgpa: 8.5,
          maxBacklogs: 0,
          targetYears: [2, 3],
          departments: ["cse", "it", "ece", "btech", "mtech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://www.google.com/about/careers/applications/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_orchestrix_frontend",
        title: "Frontend Developer Intern",
        company: "Orchestrix",
        location: "Chennai (Hybrid)",
        opportunityType: "Internship",
        skills: ["javascript", "react", "html", "css", "figma"],
        eligibility: {
          minCgpa: 7.5,
          maxBacklogs: 1,
          targetYears: [1, 2, 3],
          departments: ["cse", "it", "ece", "mca", "btech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://orchestrix.com/careers",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_walmart_datascience",
        title: "Data Science Intern",
        company: "Walmart Labs",
        location: "Bangalore (Remote)",
        opportunityType: "Internship",
        skills: ["python", "sql", "aws", "git"],
        eligibility: {
          minCgpa: 8.0,
          maxBacklogs: 0,
          targetYears: [2, 3],
          departments: ["cse", "it", "ece", "btech", "mtech", "mba"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://careers.walmart.com/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_aws_devops",
        title: "Cloud DevOps Intern",
        company: "Amazon Web Services",
        location: "Bangalore",
        opportunityType: "Internship",
        skills: ["python", "docker", "kubernetes", "aws", "git"],
        eligibility: {
          minCgpa: 8.2,
          maxBacklogs: 0,
          targetYears: [2, 3],
          departments: ["cse", "it", "ece", "btech", "mtech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://www.amazon.jobs/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_swiggy_mobile",
        title: "Mobile App Developer Intern",
        company: "Swiggy",
        location: "Bangalore",
        opportunityType: "Internship",
        skills: ["javascript", "react", "swift", "kotlin", "git"],
        eligibility: {
          minCgpa: 7.8,
          maxBacklogs: 1,
          targetYears: [2, 3],
          departments: ["cse", "it", "ece", "mca", "btech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://careers.swiggy.com/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      // Placements
      {
        id: "curated_microsoft_swe",
        title: "Graduate Software Engineer",
        company: "Microsoft",
        location: "Hyderabad",
        opportunityType: "Placement",
        skills: ["java", "c#", "c++", "data structures", "git", "aws"],
        eligibility: {
          minCgpa: 8.5,
          maxBacklogs: 0,
          targetYears: [4],
          departments: ["cse", "it", "ece", "btech", "mtech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://careers.microsoft.com/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_zoho_frontend",
        title: "Associate Frontend Developer",
        company: "Zoho Corporation",
        location: "Chennai",
        opportunityType: "Placement",
        skills: ["javascript", "react", "html", "css", "git"],
        eligibility: {
          minCgpa: 7.0,
          maxBacklogs: 1,
          targetYears: [4],
          departments: ["cse", "it", "ece", "mca", "btech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://www.zoho.com/careers/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_freshworks_fullstack",
        title: "Full Stack Engineer (L1)",
        company: "Freshworks",
        location: "Chennai",
        opportunityType: "Placement",
        skills: ["javascript", "react", "node.js", "sql", "git"],
        eligibility: {
          minCgpa: 7.8,
          maxBacklogs: 0,
          targetYears: [4],
          departments: ["cse", "it", "ece", "mca", "btech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://www.freshworks.com/company/careers/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_deloitte_analyst",
        title: "Data Analyst / Scientist",
        company: "Deloitte",
        location: "Bangalore",
        opportunityType: "Placement",
        skills: ["python", "sql", "aws", "git", "figma"],
        eligibility: {
          minCgpa: 7.5,
          maxBacklogs: 0,
          targetYears: [4],
          departments: ["cse", "it", "ece", "btech", "mtech", "mba", "mca"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://jobs.deloitte.com/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      },
      {
        id: "curated_cognizant_devops",
        title: "Systems DevOps Engineer",
        company: "Cognizant",
        location: "Coimbatore",
        opportunityType: "Placement",
        skills: ["python", "docker", "aws", "git"],
        eligibility: {
          minCgpa: 7.0,
          maxBacklogs: 2,
          targetYears: [4],
          departments: ["cse", "it", "ece", "mca", "btech"]
        },
        registrationStatus: "OPEN",
        applyUrl: "https://careers.cognizant.com/",
        source: "Curated Portal",
        lastUpdated: new Date().toISOString()
      }
    ];

    return list;
  }
}
