import { InternshipProvider, StandardInternship } from "./types";

export class UnstopProvider implements InternshipProvider {
  name = "Unstop";

  async fetchInternships(): Promise<StandardInternship[]> {
    try {
      console.log("[UnstopProvider] Fetching from Unstop Public API...");
      const res = await fetch("https://unstop.com/api/public/opportunity/search-result?opportunity=internships&page=1", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Unstop API returned status ${res.status}`);
      }

      const json = await res.json();
      const rawItems = json?.data?.data || [];

      return rawItems
        .filter((i: any) => i.title && i.public_url)
        .map((i: any) => {
          // Parse skills
          const skills = (i.skills || []).map((s: any) => String(s.name || s).toLowerCase().trim());
          
          return {
            id: `unstop_${i.id || Math.random().toString(36).substr(2, 9)}`,
            title: i.title,
            company: i.organisation?.name || "Unstop Partner",
            companyLogo: i.organisation?.logoUrl || "",
            location: i.address_with_country_logo?.city || "Remote",
            opportunityType: "Internship",
            skills,
            eligibility: {
              minCgpa: 7.0, // Default threshold
              maxBacklogs: 0,
              targetYears: [2, 3], // Internships usually for years 2 & 3
              departments: ["cse", "it", "ece", "mca", "btech"]
            },
            registrationStatus: i.regnRequirements?.reg_status || "OPEN",
            deadline: i.regnRequirements?.end_regn_dt || i.end_date || "",
            applyUrl: i.short_url || `https://unstop.com/${i.public_url}`,
            source: "Unstop",
            lastUpdated: new Date().toISOString()
          };
        });
    } catch (err: any) {
      console.error("[UnstopProvider] Failed to fetch internships:", err.message);
      // Fail gracefully and return empty array to prevent breaking the manager
      return [];
    }
  }
}
