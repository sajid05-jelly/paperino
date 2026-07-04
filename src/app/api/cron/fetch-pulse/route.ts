import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "") // strip tags
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function isInternational(country: string): boolean {
  if (!country) return false;
  const c = country.toLowerCase().trim();
  if (c === "india" || c === "in") return false;
  return true;
}

function detectLocationInfo(
  title: string,
  description: string,
  organizer: string,
  city: string,
  state: string,
  details: string
): { location: string; state: string } | null {
  const query = `${title} ${description} ${organizer} ${city} ${state} ${details}`.toLowerCase();

  const tnCities = [
    { name: "Chennai", state: "Tamil Nadu" },
    { name: "Coimbatore", state: "Tamil Nadu" },
    { name: "Trichy", state: "Tamil Nadu" },
    { name: "Tiruchirappalli", state: "Tamil Nadu" },
    { name: "Madurai", state: "Tamil Nadu" },
    { name: "Salem", state: "Tamil Nadu" },
    { name: "Erode", state: "Tamil Nadu" },
    { name: "Tirunelveli", state: "Tamil Nadu" },
    { name: "Vellore", state: "Tamil Nadu" },
    { name: "Thanjavur", state: "Tamil Nadu" },
    { name: "Kanchipuram", state: "Tamil Nadu" },
    { name: "Hosur", state: "Tamil Nadu" }
  ];

  const tnColleges = [
    { name: "SRM", city: "Chennai", state: "Tamil Nadu" },
    { name: "Sathyabama", city: "Chennai", state: "Tamil Nadu" },
    { name: "VIT Chennai", city: "Chennai", state: "Tamil Nadu" },
    { name: "Anna University", city: "Chennai", state: "Tamil Nadu" },
    { name: "PSG", city: "Coimbatore", state: "Tamil Nadu" },
    { name: "SSN", city: "Chennai", state: "Tamil Nadu" },
    { name: "Kongu", city: "Erode", state: "Tamil Nadu" },
    { name: "KCG", city: "Chennai", state: "Tamil Nadu" },
    { name: "Rajalakshmi", city: "Chennai", state: "Tamil Nadu" },
    { name: "Velammal", city: "Chennai", state: "Tamil Nadu" },
    { name: "Panimalar", city: "Chennai", state: "Tamil Nadu" },
    { name: "Hindustan", city: "Chennai", state: "Tamil Nadu" },
    { name: "Saveetha", city: "Chennai", state: "Tamil Nadu" },
    { name: "Karunya", city: "Coimbatore", state: "Tamil Nadu" },
    { name: "Thiagarajar", city: "Madurai", state: "Tamil Nadu" }
  ];

  const southCities = [
    { name: "Bangalore", state: "Karnataka" },
    { name: "Bengaluru", state: "Karnataka" },
    { name: "Hyderabad", state: "Telangana" },
    { name: "Kochi", state: "Kerala" },
    { name: "Cochin", state: "Kerala" },
    { name: "Trivandrum", state: "Kerala" },
    { name: "Thiruvananthapuram", state: "Kerala" },
    { name: "Amaravati", state: "Andhra Pradesh" },
    { name: "Visakhapatnam", state: "Andhra Pradesh" }
  ];

  // 1. Check TN Colleges
  for (const col of tnColleges) {
    if (query.includes(col.name.toLowerCase())) {
      return { location: col.city, state: col.state };
    }
  }

  // 2. Check TN Cities
  for (const c of tnCities) {
    if (query.includes(c.name.toLowerCase())) {
      return { location: c.name, state: c.state };
    }
  }

  if (query.includes("tamil nadu") || query.includes("tamilnadu") || query.includes(" tn ")) {
    return { location: "Tamil Nadu", state: "Tamil Nadu" };
  }

  // 3. Check South India Cities
  for (const c of southCities) {
    if (query.includes(c.name.toLowerCase())) {
      return { location: c.name, state: c.state };
    }
  }

  // 4. Default parsed locations from APIs if valid
  if (city && city.toLowerCase() !== "india" && city.toLowerCase() !== "location unknown") {
    return { location: city, state: state || "" };
  }

  return null;
}

async function scrapeLocationFromUrl(url: string): Promise<{ location: string, state: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Detect from HTML content directly using the helper
    return detectLocationInfo("", "", "", "", "", html);
  } catch (e) {
    console.error("Error scraping location from url:", url, e);
  }
  return null;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Firebase Admin DB not initialized' }, { status: 500 });
  }

  const now = new Date();
  
  let stats = {
    totalFetched: 0,
    active: 0,
    skippedExpired: 0,
    skippedDuplicates: 0,
    skippedBlacklisted: 0
  };

  try {
    // --- 1. Fetch from Unstop ---
    try {
      const res = await fetch("https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=1", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        },
        cache: 'no-store'
      });
      
      if (res.ok) {
        const json = await res.json();
        const items = json?.data?.data || [];
        stats.totalFetched += items.length;

        await Promise.all(items.map(async (item: any) => {
          if (!item.title || !item.public_url) return;
          
          const link = item.short_url || `https://unstop.com/${item.public_url}`;
          const title = item.title;
          
          // Parse Mode
          const modeVal = (item.region || "").toLowerCase();
          const mode = modeVal === "online" ? "Online" : "Offline";

          // Parse Location
          const rawCity = item.address_with_country_logo?.city || "";
          const rawState = item.address_with_country_logo?.state || "";
          const country = item.address_with_country_logo?.country?.name || "";

          // Exclude International
          if (isInternational(country)) {
            console.log(`Skipped: ${title} | Reason: International Event`);
            return;
          }

          // Parse Deadline
          const deadlineStr = item.regnRequirements?.end_regn_dt || item.end_date;
          const deadline = deadlineStr && !isNaN(Date.parse(deadlineStr)) ? new Date(deadlineStr) : null;
          
          // Validation: Skip Expired or Ended
          if (deadline && deadline < now) {
            console.log(`Skipped: ${title} | Reason: Expired`);
            stats.skippedExpired++;
            return;
          }
          if (item.regnRequirements?.reg_status === "ENDED") {
            console.log(`Skipped: ${title} | Reason: Expired`);
            stats.skippedExpired++;
            return;
          }

          // Check Blacklist
          const blacklistQuery = await adminDb.collection("pulse_blacklist").where("link", "==", link).get();
          if (!blacklistQuery.empty) {
            console.log(`Skipped: ${title} | Reason: Blacklisted`);
            stats.skippedBlacklisted++;
            return;
          }
          
          // Check Duplicates
          const queueQuery = await adminDb.collection("pulse_queue").where("link", "==", link).get();
          const updatesQuery = await adminDb.collection("pulse_updates").where("link", "==", link).get();
          
          if (!queueQuery.empty || !updatesQuery.empty) {
            console.log(`Skipped: ${title} | Reason: Duplicate`);
            stats.skippedDuplicates++;
            return;
          }

          const cleanedDescription = cleanHtml(item.details || item.desc || item.seo_meta_description || item.tagline || "");

          // 1. Detect location using local properties
          let resolvedLocation = detectLocationInfo(title, cleanedDescription, item.organisation?.name || "", rawCity, rawState, "");
          
          // 2. Scrape target page if local detection failed
          if (!resolvedLocation && link) {
            resolvedLocation = await scrapeLocationFromUrl(link);
          }

          const finalLocation = resolvedLocation?.location || "Location Unknown";
          const finalState = resolvedLocation?.state || "";

          // Apply Exclusion Filter
          const exclusionQuery = `${title} ${cleanedDescription} ${item.organisation?.name || ""} ${finalLocation} ${finalState}`.toLowerCase();
          const exclusions = ["delhi", "mumbai", "pune", "kolkata", "gujarat", "rajasthan", "punjab"];
          const isExcluded = exclusions.some(e => exclusionQuery.includes(e));
          if (isExcluded) {
            console.log(`Skipped: ${title} | Reason: Excluded Location (${exclusions.filter(e => exclusionQuery.includes(e)).join(", ")})`);
            return;
          }

          await adminDb.collection("pulse_queue").add({
            title: title,
            description: cleanedDescription || `A new opportunity on Unstop: ${title}.`,
            category: "Hackathons",
            sourceName: "Unstop",
            link: link,
            isPinned: false,
            status: "pending",
            createdAt: now,
            organizer: item.organisation?.name || "Unstop",
            deadline: deadline,
            location: finalLocation,
            state: finalState,
            mode: mode
          });
          stats.active++;
        }));
      }
    } catch (e) {
      console.error("Unstop fetch error:", e);
    }

    // --- 2. Fetch from Devfolio ---
    try {
      const res = await fetch("https://api.devfolio.co/api/hackathons?page=1&limit=30", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const json = await res.json();
        const items = json?.result || [];
        stats.totalFetched += items.length;

        await Promise.all(items.map(async (item: any) => {
          if (!item.name || !item.slug) return;

          const link = `https://${item.slug}.devfolio.co`;
          const title = item.name;
          const deadline = item.ends_at && !isNaN(Date.parse(item.ends_at)) ? new Date(item.ends_at) : null;

          // Parse Mode
          let mode = "Offline";
          if (item.is_online) {
            mode = "Online";
          } else if (item.hackathon_setting?.is_hybrid) {
            mode = "Hybrid";
          }

          const country = item.country || "";
          // Exclude International
          if (isInternational(country)) {
            console.log(`Skipped: ${title} | Reason: International Event`);
            return;
          }

          // Validation: Skip Expired
          if (deadline && deadline < now) {
            console.log(`Skipped: ${title} | Reason: Expired`);
            stats.skippedExpired++;
            return;
          }

          // Check Blacklist
          const blacklistQuery = await adminDb.collection("pulse_blacklist").where("link", "==", link).get();
          if (!blacklistQuery.empty) {
            console.log(`Skipped: ${title} | Reason: Blacklisted`);
            stats.skippedBlacklisted++;
            return;
          }

          // Check Duplicates
          const queueQuery = await adminDb.collection("pulse_queue").where("link", "==", link).get();
          const updatesQuery = await adminDb.collection("pulse_updates").where("link", "==", link).get();

          if (!queueQuery.empty || !updatesQuery.empty) {
            console.log(`Skipped: ${title} | Reason: Duplicate`);
            stats.skippedDuplicates++;
            return;
          }

          const rawCity = item.city || "";
          const rawState = item.state || "";
          const rawDescription = item.desc || item.tagline || "";

          // 1. Detect location using local properties
          let resolvedLocation = detectLocationInfo(title, rawDescription, item.hackathon_setting?.subdomain || "", rawCity, rawState, "");

          // 2. Scrape target page if local detection failed
          if (!resolvedLocation && link) {
            resolvedLocation = await scrapeLocationFromUrl(link);
          }

          const finalLocation = resolvedLocation?.location || "Location Unknown";
          const finalState = resolvedLocation?.state || "";

          // Apply Exclusion Filter
          const exclusionQuery = `${title} ${rawDescription} ${item.hackathon_setting?.subdomain || ""} ${finalLocation} ${finalState}`.toLowerCase();
          const exclusions = ["delhi", "mumbai", "pune", "kolkata", "gujarat", "rajasthan", "punjab"];
          const isExcluded = exclusions.some(e => exclusionQuery.includes(e));
          if (isExcluded) {
            console.log(`Skipped: ${title} | Reason: Excluded Location (${exclusions.filter(e => exclusionQuery.includes(e)).join(", ")})`);
            return;
          }

          await adminDb.collection("pulse_queue").add({
            title: title,
            description: rawDescription || `A new hackathon on Devfolio: ${title}.`,
            category: "Hackathons",
            sourceName: "Devfolio",
            link: link,
            isPinned: false,
            status: "pending",
            createdAt: now,
            organizer: item.hackathon_setting?.subdomain || "Devfolio",
            deadline: deadline,
            location: finalLocation,
            state: finalState,
            mode: mode
          });
          stats.active++;
        }));
      }
    } catch (e) {
      console.error("Devfolio fetch error:", e);
    }

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error("Cron fetch-pulse error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
