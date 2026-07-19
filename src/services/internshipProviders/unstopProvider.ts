import { InternshipProvider, StandardInternship } from "./types";
import { runStats, resetStats } from "./stats";

export class UnstopProvider implements InternshipProvider {
  name = "Unstop";

  async fetchInternships(): Promise<StandardInternship[]> {
    resetStats();
    const allInternships: StandardInternship[] = [];
    const seenIds = new Set<string>();
    const MAX_PAGES = 10;

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        console.log(`[UnstopProvider] Fetching page ${page} from Unstop Public API...`);
        const res = await fetch(`https://unstop.com/api/public/opportunity/search-result?opportunity=internships&page=${page}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
          },
          cache: 'no-store'
        });

        if (!res.ok) {
          console.warn(`[UnstopProvider] Page ${page} failed with status ${res.status}`);
          continue;
        }

        const json = await res.json();
        const rawItems = json?.data?.data || [];
        
        const pageKey = `page${page}`;
        runStats.fetchStats[pageKey] = rawItems.length;
        runStats.fetchStats.totalFetched += rawItems.length;

        if (rawItems.length === 0) {
          console.log(`[UnstopProvider] No more items found on page ${page}. Stopping.`);
          break;
        }

        const now = new Date();
        const parsed = rawItems
          .filter((i: any) => {
            if (!i.title) return false;

            if (!i.short_url && !i.public_url) {
              runStats.filterStats.invalidUrlRemoved += 1;
              return false;
            }
            
            const regStatus = i.regnRequirements?.reg_status;
            if (regStatus === "ENDED") {
              runStats.filterStats.expiredRemoved += 1;
              return false;
            }

            const deadlineStr = i.regnRequirements?.end_regn_dt || i.end_date;
            if (deadlineStr) {
              const deadline = new Date(deadlineStr);
              if (deadline < now) {
                runStats.filterStats.expiredRemoved += 1;
                return false;
              }
            }

            return true;
          })
          .map((i: any) => {
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
                minCgpa: 7.0,
                maxBacklogs: 0,
                targetYears: [2, 3],
                departments: ["cse", "it", "ece", "mca", "btech"]
              },
              registrationStatus: i.regnRequirements?.reg_status || "OPEN",
              deadline: i.regnRequirements?.end_regn_dt || i.end_date || "",
              applyUrl: i.short_url || `https://unstop.com/${i.public_url}`,
              source: "Unstop",
              lastUpdated: new Date().toISOString()
            };
          });

        parsed.forEach((item: StandardInternship) => {
          if (seenIds.has(item.id)) {
            runStats.filterStats.duplicateRemoved += 1;
          } else {
            seenIds.add(item.id);
            allInternships.push(item);
          }
        });
      } catch (pageErr: any) {
        console.error(`[UnstopProvider] Failed to fetch page ${page}:`, pageErr.message);
      }
    }

    runStats.filterStats.remaining = allInternships.length;
    console.log(`[UnstopProvider] Complete pagination fetch resolved. Total unique active: ${allInternships.length}`);
    return allInternships;
  }
}
