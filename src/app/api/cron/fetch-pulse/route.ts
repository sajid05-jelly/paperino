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

// Check if a country is outside India
function isInternational(country: string): boolean {
  if (!country) return false;
  const c = country.toLowerCase().trim();
  if (c === "india" || c === "in") return false;
  return true;
}

export async function GET(req: Request) {
  // Ensure this is only called by Vercel Cron or authorized admin
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
          
          // Parse Mode (Offline / Online)
          const modeVal = (item.region || "").toLowerCase();
          const mode = modeVal === "online" ? "Online" : "Offline"; // Unstop usually has online/offline

          // Exclude Online-only hackathons
          if (mode === "Online") {
            return;
          }
          
          // Parse Location
          const city = item.address_with_country_logo?.city || "";
          const state = item.address_with_country_logo?.state || "";
          const country = item.address_with_country_logo?.country?.name || "India";

          // Exclude International
          if (isInternational(country)) {
            return;
          }

          // Parse Deadline
          const deadlineStr = item.regnRequirements?.end_regn_dt || item.end_date;
          const deadline = deadlineStr && !isNaN(Date.parse(deadlineStr)) ? new Date(deadlineStr) : null;
          
          // Validation: Skip Expired or Ended
          if (deadline && deadline < now) {
            stats.skippedExpired++;
            return;
          }
          if (item.regnRequirements?.reg_status === "ENDED") {
            stats.skippedExpired++;
            return;
          }

          // Check Blacklist
          const blacklistQuery = await adminDb.collection("pulse_blacklist").where("link", "==", link).get();
          if (!blacklistQuery.empty) {
            stats.skippedBlacklisted++;
            return;
          }
          
          // Check Duplicates
          const queueQuery = await adminDb.collection("pulse_queue").where("link", "==", link).get();
          const updatesQuery = await adminDb.collection("pulse_updates").where("link", "==", link).get();
          
          if (!queueQuery.empty || !updatesQuery.empty) {
            stats.skippedDuplicates++;
            return;
          }

          // Clean up HTML in details
          const cleanedDescription = cleanHtml(item.details || item.desc || item.seo_meta_description || item.tagline || "");

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
            location: city || "India",
            state: state || "",
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

          // Exclude Online-only hackathons
          if (mode === "Online") {
            return;
          }

          const country = item.country || "India";
          // Exclude International
          if (isInternational(country)) {
            return;
          }

          // Validation: Skip Expired
          if (deadline && deadline < now) {
            stats.skippedExpired++;
            return;
          }

          // Check Blacklist
          const blacklistQuery = await adminDb.collection("pulse_blacklist").where("link", "==", link).get();
          if (!blacklistQuery.empty) {
            stats.skippedBlacklisted++;
            return;
          }

          // Check Duplicates
          const queueQuery = await adminDb.collection("pulse_queue").where("link", "==", link).get();
          const updatesQuery = await adminDb.collection("pulse_updates").where("link", "==", link).get();

          if (!queueQuery.empty || !updatesQuery.empty) {
            stats.skippedDuplicates++;
            return;
          }

          await adminDb.collection("pulse_queue").add({
            title: title,
            description: item.desc || item.tagline || `A new hackathon on Devfolio: ${title}.`,
            category: "Hackathons",
            sourceName: "Devfolio",
            link: link,
            isPinned: false,
            status: "pending",
            createdAt: now,
            organizer: item.hackathon_setting?.subdomain || "Devfolio",
            deadline: deadline,
            location: item.city || "India",
            state: item.state || "",
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
