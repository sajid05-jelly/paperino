import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "") // strip HTML tags
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

const INSTITUTION_MAP = [
  // Tamil Nadu Colleges
  { keys: ["srm institute", "srm university", "srmist", "srm ramapuram", "srm vadapalani"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["srm trichy", "srm ist trichy"], city: "Trichy", state: "Tamil Nadu" },
  { keys: ["sathyabama"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["vit chennai", "vit-c"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["vit vellore", "vellore institute of technology"], city: "Vellore", state: "Tamil Nadu" },
  { keys: ["anna university", "college of engineering guindy", "ceg", "mit chromepet"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["psg college", "psg tech", "psg itech"], city: "Coimbatore", state: "Tamil Nadu" },
  { keys: ["ssn college", "sri sivasubramaniya nadar"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["kumaraguru", "kct"], city: "Coimbatore", state: "Tamil Nadu" },
  { keys: ["coimbatore institute of technology", "cit coimbatore"], city: "Coimbatore", state: "Tamil Nadu" },
  { keys: ["kongu engineering", "kec"], city: "Erode", state: "Tamil Nadu" },
  { keys: ["kcg college", "kcg tech"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["rajalakshmi engineering", "rec chennai"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["velammal"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["panimalar"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["hindustan institute of technology", "hindustan university", "hits chennai"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["saveetha"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["karunya"], city: "Coimbatore", state: "Tamil Nadu" },
  { keys: ["thiagarajar college of engineering", "tce madurai"], city: "Madurai", state: "Tamil Nadu" },
  { keys: ["sastra university", "sastra decol", "sastra thanjavur"], city: "Thanjavur", state: "Tamil Nadu" },
  { keys: ["amrita vishwa vidyapeetham coimbatore", "amrita school of engineering coimbatore"], city: "Coimbatore", state: "Tamil Nadu" },
  { keys: ["amrita vishwa vidyapeetham chennai"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["amrita vishwa vidyapeetham bengaluru", "amrita bengaluru"], city: "Bengaluru", state: "Karnataka" },
  { keys: ["licet", "loyola icam"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["st. joseph's college of engineering", "st joseph's institute", "st. joseph’s"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["loyola college"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["madras christian college", "mcc chennai"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["bishop heber"], city: "Trichy", state: "Tamil Nadu" },
  { keys: ["national institute of technology trichy", "nit trichy", "nitt"], city: "Trichy", state: "Tamil Nadu" },
  { keys: ["indian institute of technology madras", "iit madras", "iitm"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["mepco schlenk"], city: "Sivakasi", state: "Tamil Nadu" },
  { keys: ["sri krishna college", "skcet", "skct"], city: "Coimbatore", state: "Tamil Nadu" },
  { keys: ["sona college"], city: "Salem", state: "Tamil Nadu" },
  { keys: ["kamarafar college", "kamaraj college"], city: "Tuticorin", state: "Tamil Nadu" },
  { keys: ["government college of technology coimbatore", "gct coimbatore"], city: "Coimbatore", state: "Tamil Nadu" },
  { keys: ["government college of engineering salem", "gce salem"], city: "Salem", state: "Tamil Nadu" },
  
  // Karnataka (South India)
  { keys: ["rv college of engineering", "rvce"], city: "Bengaluru", state: "Karnataka" },
  { keys: ["bms college of engineering", "bmsce"], city: "Bengaluru", state: "Karnataka" },
  { keys: ["ms ramaiah", "msrit", "ramaiah institute"], city: "Bengaluru", state: "Karnataka" },
  { keys: ["pes university", "pesit"], city: "Bengaluru", state: "Karnataka" },
  { keys: ["iiit bangalore", "iiitb", "iiit bengaluru"], city: "Bengaluru", state: "Karnataka" },
  { keys: ["christ university"], city: "Bengaluru", state: "Karnataka" },
  { keys: ["nitk surathkal", "national institute of technology karnataka"], city: "Surathkal", state: "Karnataka" },
  { keys: ["manipal institute", "mit manipal", "manipal academy"], city: "Manipal", state: "Karnataka" },
  { keys: ["sdm college"], city: "Dharwad", state: "Karnataka" },
  { keys: ["reva university"], city: "Bengaluru", state: "Karnataka" },

  // Kerala (South India)
  { keys: ["nit calicut", "nitc", "national institute of technology calicut"], city: "Calicut", state: "Kerala" },
  { keys: ["iit palakkad", "iitpkd"], city: "Palakkad", state: "Kerala" },
  { keys: ["college of engineering trivandrum", "cet trivandrum"], city: "Trivandrum", state: "Kerala" },
  { keys: ["model engineering college", "mec kochi", "gov model engineering"], city: "Kochi", state: "Kerala" },
  { keys: ["cusat", "cochin university"], city: "Kochi", state: "Kerala" },
  { keys: ["tkm college"], city: "Kollam", state: "Kerala" },

  // Telangana (South India)
  { keys: ["iiit hyderabad", "iiith", "international institute of information technology hyderabad"], city: "Hyderabad", state: "Telangana" },
  { keys: ["bits pilani hyderabad"], city: "Hyderabad", state: "Telangana" },
  { keys: ["iit hyderabad", "iith"], city: "Hyderabad", state: "Telangana" },
  { keys: ["nit warangal", "nitw", "national institute of technology warangal"], city: "Warangal", state: "Telangana" },
  { keys: ["osmania university"], city: "Hyderabad", state: "Telangana" },
  { keys: ["jntu hyderabad", "jntuh"], city: "Hyderabad", state: "Telangana" },
  { keys: ["vnr vignana jyothi", "vnrvjiet"], city: "Hyderabad", state: "Telangana" },
  { keys: ["chaitanya bharathi", "cbit"], city: "Hyderabad", state: "Telangana" },

  // Andhra Pradesh (South India)
  { keys: ["iit tirupati", "iitt"], city: "Tirupati", state: "Andhra Pradesh" },
  { keys: ["nit andhra", "nitap"], city: "Tadepalligudem", state: "Andhra Pradesh" },
  { keys: ["iiit sri city", "iiits"], city: "Sri City", state: "Andhra Pradesh" },
  { keys: ["gitam university vizag", "gitam visakhapatnam"], city: "Visakhapatnam", state: "Andhra Pradesh" },
  { keys: ["koneru lakshmaiah", "kl university", "klu vish"], city: "Vijayawada", state: "Andhra Pradesh" },

  // Madhya Pradesh / North India
  { keys: ["madhav institute", "mits gwalior"], city: "Gwalior", state: "Madhya Pradesh" },
  { keys: ["manit bhopal", "nit bhopal", "maulana azad national institute"], city: "Bhopal", state: "Madhya Pradesh" },
  { keys: ["sgsits", "shri govindram"], city: "Indore", state: "Madhya Pradesh" },
  { keys: ["ips academy"], city: "Indore", state: "Madhya Pradesh" },
  { keys: ["abv-iiitm", "iiit gwalior", "iiitm gwalior"], city: "Gwalior", state: "Madhya Pradesh" },
  { keys: ["iit indore", "iiti"], city: "Indore", state: "Madhya Pradesh" },
  
  // Other regions (useful to map and exclude correctly)
  { keys: ["bits pilani", "birla institute of technology and science pilani"], city: "Pilani", state: "Rajasthan" },
  { keys: ["iit bombay", "iitb"], city: "Mumbai", state: "Maharashtra" },
  { keys: ["iit delhi", "iitd"], city: "New Delhi", state: "Delhi" },
  { keys: ["iit kanpur", "iitk"], city: "Kanpur", state: "Uttar Pradesh" },
  { keys: ["iit kharagpur", "iitkgp"], city: "Kharagpur", state: "West Bengal" },
  { keys: ["iit roorkee", "iitr"], city: "Roorkee", state: "Uttarakhand" },
  { keys: ["iit guwahati", "iitg"], city: "Guwahati", state: "Assam" },
  { keys: ["iit bhu", "iit varanasi"], city: "Varanasi", state: "Uttar Pradesh" },
  { keys: ["bits pilani goa", "bits goa"], city: "Goa", state: "Goa" },
  { keys: ["nit rourkela", "nitr"], city: "Rourkela", state: "Odisha" },
  { keys: ["lnmiit", "lnm institute"], city: "Jaipur", state: "Rajasthan" },
  { keys: ["thapar university", "tiet"], city: "Patiala", state: "Punjab" },
  { keys: ["pec university", "pec chandigarh"], city: "Chandigarh", state: "Chandigarh" },
  { keys: ["nsut", "netaji subhas"], city: "New Delhi", state: "Delhi" },
  { keys: ["dtu", "delhi technological"], city: "New Delhi", state: "Delhi" },
  { keys: ["iiit delhi", "iiitd"], city: "New Delhi", state: "Delhi" },
  { keys: ["vjti"], city: "Mumbai", state: "Maharashtra" },
  { keys: ["coep", "college of engineering pune"], city: "Pune", state: "Maharashtra" },
  { keys: ["iiit pune", "iiitp"], city: "Pune", state: "Maharashtra" },
  { keys: ["jadavpur university"], city: "Kolkata", state: "West Bengal" },
  { keys: ["iiit kolkata", "iiitk"], city: "Kolkata", state: "West Bengal" }
];

const CITY_MAP = [
  // Tamil Nadu
  { keys: ["chennai", "madras"], city: "Chennai", state: "Tamil Nadu" },
  { keys: ["coimbatore", "kovai"], city: "Coimbatore", state: "Tamil Nadu" },
  { keys: ["trichy", "tiruchirappalli"], city: "Trichy", state: "Tamil Nadu" },
  { keys: ["madurai"], city: "Madurai", state: "Tamil Nadu" },
  { keys: ["salem"], city: "Salem", state: "Tamil Nadu" },
  { keys: ["erode"], city: "Erode", state: "Tamil Nadu" },
  { keys: ["vellore"], city: "Vellore", state: "Tamil Nadu" },
  { keys: ["tirunelveli"], city: "Tirunelveli", state: "Tamil Nadu" },
  { keys: ["thanjavur", "tanjore"], city: "Thanjavur", state: "Tamil Nadu" },
  { keys: ["kanchipuram", "conjeeveram"], city: "Kanchipuram", state: "Tamil Nadu" },
  { keys: ["hosur"], city: "Hosur", state: "Tamil Nadu" },
  { keys: ["tuticorin", "thoothukudi"], city: "Thoothukudi", state: "Tamil Nadu" },
  { keys: ["tiruppur", "tirupur"], city: "Tiruppur", state: "Tamil Nadu" },
  
  // South India
  { keys: ["bangalore", "bengaluru"], city: "Bengaluru", state: "Karnataka" },
  { keys: ["hyderabad"], city: "Hyderabad", state: "Telangana" },
  { keys: ["kochi", "cochin", "ernakulam"], city: "Kochi", state: "Kerala" },
  { keys: ["trivandrum", "thiruvananthapuram"], city: "Thiruvananthapuram", state: "Kerala" },
  { keys: ["calicut", "kozhikode"], city: "Kozhikode", state: "Kerala" },
  { keys: ["mysore", "mysuru"], city: "Mysuru", state: "Karnataka" },
  { keys: ["mangalore", "mangaluru"], city: "Mangaluru", state: "Karnataka" },
  { keys: ["warangal"], city: "Warangal", state: "Telangana" },
  { keys: ["visakhapatnam", "vizag"], city: "Visakhapatnam", state: "Andhra Pradesh" },
  { keys: ["vijayawada"], city: "Vijayawada", state: "Andhra Pradesh" },
  { keys: ["tirupati"], city: "Tirupati", state: "Andhra Pradesh" },

  // Rest of India
  { keys: ["gwalior"], city: "Gwalior", state: "Madhya Pradesh" },
  { keys: ["bhopal"], city: "Bhopal", state: "Madhya Pradesh" },
  { keys: ["indore"], city: "Indore", state: "Madhya Pradesh" },
  { keys: ["delhi", "new delhi", "noida", "gurugram", "gurgaon", "ghaziabad", "faridabad"], city: "New Delhi", state: "Delhi" },
  { keys: ["mumbai", "bombay", "navi mumbai", "thane"], city: "Mumbai", state: "Maharashtra" },
  { keys: ["pune"], city: "Pune", state: "Maharashtra" },
  { keys: ["kolkata", "calcutta"], city: "Kolkata", state: "West Bengal" },
  { keys: ["jaipur"], city: "Jaipur", state: "Rajasthan" },
  { keys: ["udaipur"], city: "Udaipur", state: "Rajasthan" },
  { keys: ["ahmedabad", "gandhinagar", "surat", "vadodara"], city: "Ahmedabad", state: "Gujarat" },
  { keys: ["ludhiana", "amritsar", "jalandhar", "patiala"], city: "Patiala", state: "Punjab" },
  { keys: ["chandigarh"], city: "Chandigarh", state: "Chandigarh" },
  { keys: ["lucknow", "kanpur", "agra", "varanasi", "ghaziabad"], city: "Lucknow", state: "Uttar Pradesh" },
  { keys: ["patna"], city: "Patna", state: "Bihar" },
  { keys: ["ranchi"], city: "Ranchi", state: "Jharkhand" },
  { keys: ["bhubaneswar", "rourkela"], city: "Bhubaneswar", state: "Odisha" },
  { keys: ["guwahati"], city: "Guwahati", state: "Assam" }
];

function detectLocationInfo(
  title: string,
  description: string,
  organizer: string,
  city: string,
  state: string,
  details: string
): { location: string; state: string } | null {
  const query = `${title} ${description} ${organizer} ${city} ${state} ${details}`.toLowerCase();

  // 1. Match Institutions first
  for (const inst of INSTITUTION_MAP) {
    for (const key of inst.keys) {
      if (query.includes(key)) {
        return { location: inst.city, state: inst.state };
      }
    }
  }

  // 2. Match Cities
  for (const item of CITY_MAP) {
    for (const key of item.keys) {
      if (query.includes(key)) {
        return { location: item.city, state: item.state };
      }
    }
  }

  // 3. Match generic states
  if (query.includes("tamil nadu") || query.includes("tamilnadu") || query.includes(" tn ")) {
    return { location: "Tamil Nadu", state: "Tamil Nadu" };
  }
  if (query.includes("karnataka")) {
    return { location: "Karnataka", state: "Karnataka" };
  }
  if (query.includes("kerala")) {
    return { location: "Kerala", state: "Kerala" };
  }
  if (query.includes("telangana")) {
    return { location: "Telangana", state: "Telangana" };
  }
  if (query.includes("andhra pradesh")) {
    return { location: "Andhra Pradesh", state: "Andhra Pradesh" };
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

// ── AUTOMATIC 24-HOUR USER NOTIFICATION CLEANUP ROUTINE ──────────────────────
async function cleanExpiredUserNotifications() {
  if (!adminDb) return;
  try {
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    
    // Fetch all admin user IDs from users collection so admin notifications are never touched
    const adminSnap = await adminDb.collection("users").where("role", "in", ["admin", "lead-admin", "lead_admin", "super-admin"]).get();
    const adminUids = new Set<string>(["ADMIN"]);
    adminSnap.docs.forEach(d => adminUids.add(d.id));

    const notifSnap = await adminDb.collection("notifications").get();
    let deletedCount = 0;

    for (const docSnap of notifSnap.docs) {
      const data = docSnap.data();
      const userId = data.userId || data.ownerUid;

      // CRITICAL DATA SAFETY: Bypasses Admin and Lead Admin notifications
      if (userId === "ADMIN" || (userId && adminUids.has(userId))) {
        continue;
      }

      let createdMs = 0;
      if (typeof data.createdAt === "number") {
        createdMs = data.createdAt;
      } else if (data.createdAt?.toMillis) {
        createdMs = data.createdAt.toMillis();
      } else if (data.createdAt?.seconds) {
        createdMs = data.createdAt.seconds * 1000;
      }

      if (createdMs > 0 && (now - createdMs) >= TWENTY_FOUR_HOURS_MS) {
        console.log(`[Cron Cleanup] Physically deleting expired user notification ${docSnap.id} (Created ${Math.round((now - createdMs) / 3600000)}h ago)`);
        await docSnap.ref.delete();
        deletedCount++;
      }
    }
    console.log(`[Cron Cleanup] Successfully deleted ${deletedCount} expired normal user notifications.`);
  } catch (e) {
    console.warn("[Cron Cleanup] User notification cleanup notice:", e);
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = adminDb;
  if (!db) {
    return NextResponse.json({ error: 'Firebase Admin DB not initialized' }, { status: 500 });
  }

  // 0. Run physical cleanup for expired normal user notifications
  await cleanExpiredUserNotifications();

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
          const blacklistQuery = await db.collection("pulse_blacklist").where("link", "==", link).get();
          if (!blacklistQuery.empty) {
            console.log(`Skipped: ${title} | Reason: Blacklisted`);
            stats.skippedBlacklisted++;
            return;
          }
          
          // Check Duplicates
          const queueQuery = await db.collection("pulse_queue").where("link", "==", link).get();
          const updatesQuery = await db.collection("pulse_updates").where("link", "==", link).get();
          
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

          await db.collection("pulse_queue").add({
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
          const blacklistQuery = await db.collection("pulse_blacklist").where("link", "==", link).get();
          if (!blacklistQuery.empty) {
            console.log(`Skipped: ${title} | Reason: Blacklisted`);
            stats.skippedBlacklisted++;
            return;
          }

          // Check Duplicates
          const queueQuery = await db.collection("pulse_queue").where("link", "==", link).get();
          const updatesQuery = await db.collection("pulse_updates").where("link", "==", link).get();

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

          await db.collection("pulse_queue").add({
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
