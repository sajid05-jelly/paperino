import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export interface DiscoveredHackathon {
  title: string;
  description: string;
  category: "Hackathons";
  link: string;
  officialEventUrl: string;
  registrationUrl?: string | null;
  sourceName: "Devfolio" | "Devpost" | "MLH" | "HackerEarth" | "Knowafest" | string;
  source: string;
  organizer: string;
  location: string;
  mode: "Online" | "Offline" | "Hybrid";
  eventDate?: string | null;
  deadline?: Date | null;
  prizePool?: string | null;
  registrationFee?: string | null;
  teamSize?: string | null;
  tags: string[];
}

export interface SourceStats {
  source: string;
  status: "success" | "failed" | "skipped";
  discovered: number;
  valid: number;
  expired: number;
  error?: string;
}

export interface HackathonSyncResult {
  lastSynced: string;
  sourcesChecked: string[];
  totalDiscovered: number;
  validActive: number;
  imported: number;
  updated: number;
  skippedDuplicates: number;
  expiredSkipped: number;
  sourceBreakdown: Record<string, SourceStats>;
  sampleTitles: string[];
  error?: string;
}

function normalizeTitle(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl);
    return (parsed.origin + parsed.pathname).toLowerCase().replace(/\/+$/, "");
  } catch {
    return rawUrl.toLowerCase().trim().replace(/\/+$/, "");
  }
}

/**
 * Strict Unstop Exclusion Filter
 * Guarantees no Unstop hackathon can be ingested or synced.
 */
function isUnstopEvent(link?: string | null, sourceName?: string | null, title?: string | null): boolean {
  const l = (link || "").toLowerCase();
  const s = (sourceName || "").toLowerCase();
  const t = (title || "").toLowerCase();
  return (
    l.includes("unstop.com") ||
    l.includes("unstop.io") ||
    s.includes("unstop") ||
    t.includes("unstop")
  );
}

const COMMON_REQ_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/html, application/xhtml+xml, */*;q=0.8",
  "Cache-Control": "no-cache",
};

/**
 * 1. Fetch Devfolio Hackathons (Multi-Page API)
 * Covers verified student, community, and university hackathons across India & globally.
 */
export async function fetchDevfolioHackathons(): Promise<{ hackathons: DiscoveredHackathon[]; stats: SourceStats }> {
  const stats: SourceStats = { source: "Devfolio", status: "success", discovered: 0, valid: 0, expired: 0 };
  const hackathons: DiscoveredHackathon[] = [];
  const now = new Date();

  // Multi-page query (fetch pages 1 & 2 for 100 items)
  for (let page = 1; page <= 2; page++) {
    try {
      const res = await fetch(`https://api.devfolio.co/api/hackathons?page=${page}&limit=50`, {
        headers: COMMON_REQ_HEADERS,
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        if (page === 1) stats.status = "failed";
        continue;
      }

      const data = await res.json();
      const items = data?.result || [];

      for (const item of items) {
        if (!item.name || !item.slug) continue;
        stats.discovered++;

        const link = `https://${item.slug}.devfolio.co`;
        if (isUnstopEvent(link, "Devfolio", item.name)) continue;

        const deadline = item.ends_at && !isNaN(Date.parse(item.ends_at)) ? new Date(item.ends_at) : null;
        const startDate = item.starts_at && !isNaN(Date.parse(item.starts_at)) ? new Date(item.starts_at) : null;

        // Skip expired
        if (deadline && deadline < now) {
          stats.expired++;
          continue;
        }

        let mode: "Online" | "Offline" | "Hybrid" = "Offline";
        if (item.is_online) mode = "Online";
        else if (item.hackathon_setting?.is_hybrid) mode = "Hybrid";

        const locParts = [item.city, item.state, item.country].filter(Boolean);
        const location = item.is_online ? "Online" : (locParts.join(", ") || "Location TBA");

        const teamSize = item.team_min && item.team_size ? `${item.team_min} - ${item.team_size} Members` : null;
        const prizeInfo = item.prizes_count ? `${item.prizes_count} Prizes` : null;

        hackathons.push({
          title: item.name.trim(),
          description: item.desc || item.tagline || `${item.name} hackathon hosted on Devfolio.`,
          category: "Hackathons",
          sourceName: "Devfolio",
          source: "devfolio",
          link,
          officialEventUrl: link,
          organizer: item.hackathon_setting?.subdomain || item.name,
          location,
          mode,
          deadline,
          eventDate: startDate ? startDate.toISOString() : (deadline ? deadline.toISOString() : null),
          prizePool: prizeInfo,
          teamSize,
          registrationFee: "Free",
          tags: ["hackathon", "devfolio", mode.toLowerCase()],
        });
        stats.valid++;
      }
    } catch (err: any) {
      console.warn(`[Devfolio Scraper Page ${page} Error]:`, err?.message);
      if (page === 1) {
        stats.status = "failed";
        stats.error = err?.message;
      }
    }
  }

  return { hackathons, stats };
}

/**
 * 2. Fetch Devpost Hackathons (Multi-Page Public API)
 * Covers international software, AI, open-source, and enterprise hackathons with prize pools.
 */
export async function fetchDevpostHackathons(): Promise<{ hackathons: DiscoveredHackathon[]; stats: SourceStats }> {
  const stats: SourceStats = { source: "Devpost", status: "success", discovered: 0, valid: 0, expired: 0 };
  const hackathons: DiscoveredHackathon[] = [];

  // Multi-page query (fetch pages 1, 2, 3)
  for (let page = 1; page <= 3; page++) {
    try {
      const res = await fetch(`https://devpost.com/api/hackathons?page=${page}`, {
        headers: {
          ...COMMON_REQ_HEADERS,
          "Accept": "application/json",
        },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        if (page === 1) stats.status = "failed";
        continue;
      }

      const data = await res.json();
      const items = data?.hackathons || [];

      for (const item of items) {
        if (!item.title || !item.url) continue;
        stats.discovered++;

        if (isUnstopEvent(item.url, "Devpost", item.title)) continue;

        // Clean prize text from HTML spans: $<span data-currency-value>67,500</span> -> $67,500
        const rawPrize = item.prize_amount ? item.prize_amount.replace(/<[^>]*>/g, '').trim() : null;

        let mode: "Online" | "Offline" | "Hybrid" = "Online";
        let loc = item.displayed_location?.location || "Online";
        if (loc.toLowerCase() !== "online") {
          mode = "Offline";
        }

        const themes = (item.themes || []).map((t: any) => t.name).filter(Boolean);
        const tags = ["hackathon", "devpost", mode.toLowerCase(), ...themes.slice(0, 3).map((t: string) => t.toLowerCase())];

        hackathons.push({
          title: item.title.trim(),
          description: `Devpost Hackathon: ${item.title}. Themes: ${themes.join(', ') || 'Developer Tools, AI & Web'}. Organized by ${item.organization_name || 'Devpost'}.${rawPrize ? ` Prize Pool: ${rawPrize}.` : ''}`,
          category: "Hackathons",
          sourceName: "Devpost",
          source: "devpost",
          link: item.url,
          officialEventUrl: item.url,
          organizer: item.organization_name || "Devpost Organizer",
          location: loc,
          mode,
          deadline: null,
          eventDate: item.submission_period_dates || null,
          prizePool: rawPrize,
          registrationFee: "Free",
          tags,
        });
        stats.valid++;
      }
    } catch (err: any) {
      console.warn(`[Devpost Scraper Page ${page} Error]:`, err?.message);
      if (page === 1) {
        stats.status = "failed";
        stats.error = err?.message;
      }
    }
  }

  return { hackathons, stats };
}

/**
 * 3. Fetch Major League Hacking (MLH) Upcoming Collegiate Hackathons
 * Extracts official upcoming events directly from MLH's public JSON dataset.
 */
export async function fetchMlhHackathons(): Promise<{ hackathons: DiscoveredHackathon[]; stats: SourceStats }> {
  const stats: SourceStats = { source: "MLH", status: "success", discovered: 0, valid: 0, expired: 0 };
  const hackathons: DiscoveredHackathon[] = [];
  const now = new Date();

  try {
    const res = await fetch("https://www.mlh.com/events", {
      headers: COMMON_REQ_HEADERS,
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      stats.status = "failed";
      stats.error = `HTTP ${res.status}`;
      return { hackathons, stats };
    }

    const html = await res.text();
    const scriptMatch = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);

    if (scriptMatch) {
      const parsed = JSON.parse(scriptMatch[1]);
      const upcoming = parsed.props?.upcomingEvents || [];

      for (const ev of upcoming) {
        if (!ev.name) continue;
        stats.discovered++;

        const link = ev.websiteUrl || (ev.url ? `https://www.mlh.com${ev.url}` : "https://mlh.io");
        if (isUnstopEvent(link, "MLH", ev.name)) continue;

        const starts = ev.startsAt ? new Date(ev.startsAt) : null;
        const ends = ev.endsAt ? new Date(ev.endsAt) : null;

        // Skip expired
        if (ends && ends < now) {
          stats.expired++;
          continue;
        }

        let mode: "Online" | "Offline" | "Hybrid" = "Offline";
        if (ev.formatType === "digital") mode = "Online";
        else if (ev.formatType === "hybrid") mode = "Hybrid";

        const loc = ev.location || (mode === "Online" ? "Online" : "Location TBA");

        hackathons.push({
          title: ev.name.trim(),
          description: `Official Major League Hacking Event: ${ev.name}. Collegiate hackathon scheduled for ${ev.dateRange || 'Upcoming'}. Format: ${mode}. Location: ${loc}.`,
          category: "Hackathons",
          sourceName: "MLH",
          source: "mlh",
          link,
          officialEventUrl: link,
          organizer: "Major League Hacking (MLH)",
          location: loc,
          mode,
          deadline: ends,
          eventDate: starts ? starts.toISOString() : (ev.dateRange || null),
          registrationFee: "Free",
          tags: ["hackathon", "mlh", "collegiate", mode.toLowerCase()],
        });
        stats.valid++;
      }
    }
  } catch (err: any) {
    console.warn("[MLH Scraper Error]:", err?.message);
    stats.status = "failed";
    stats.error = err?.message;
  }

  return { hackathons, stats };
}

/**
 * 4. Fetch HackerEarth Hackathons
 * Discovers active and upcoming hackathons and challenges on HackerEarth.
 */
export async function fetchHackerEarthHackathons(): Promise<{ hackathons: DiscoveredHackathon[]; stats: SourceStats }> {
  const stats: SourceStats = { source: "HackerEarth", status: "success", discovered: 0, valid: 0, expired: 0 };
  const hackathons: DiscoveredHackathon[] = [];
  const now = new Date();

  try {
    const res = await fetch("https://www.hackerearth.com/chrome-extension/events/", {
      headers: COMMON_REQ_HEADERS,
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      stats.status = "failed";
      stats.error = `HTTP ${res.status}`;
      return { hackathons, stats };
    }

    const data = await res.json();
    const events = data?.response || [];

    for (const ev of events) {
      const title = ev.title;
      if (!title || !ev.url) continue;

      const isHackathon =
        (ev.challenge_type && ev.challenge_type.toLowerCase().includes("hackathon")) ||
        title.toLowerCase().includes("hackathon");

      if (!isHackathon) continue;
      stats.discovered++;

      if (isUnstopEvent(ev.url, "HackerEarth", title)) continue;

      const deadline = ev.end_tz ? new Date(ev.end_tz) : null;
      const starts = ev.start_tz ? new Date(ev.start_tz) : null;

      if (deadline && deadline < now) {
        stats.expired++;
        continue;
      }

      hackathons.push({
        title: title.trim(),
        description: ev.description || `${title} competitive hackathon hosted on HackerEarth. Status: ${ev.status}.`,
        category: "Hackathons",
        sourceName: "HackerEarth",
        source: "hackerearth",
        link: ev.url,
        officialEventUrl: ev.url,
        organizer: "HackerEarth",
        location: "Online",
        mode: "Online",
        deadline,
        eventDate: starts ? starts.toISOString() : null,
        registrationFee: "Free",
        tags: ["hackathon", "hackerearth", "online"],
      });
      stats.valid++;
    }
  } catch (err: any) {
    console.warn("[HackerEarth Scraper Error]:", err?.message);
    stats.status = "failed";
    stats.error = err?.message;
  }

  return { hackathons, stats };
}

/**
 * Discovers and de-duplicates hackathons across all legitimate sources concurrently.
 */
export async function discoverAllHackathons(): Promise<{
  hackathons: DiscoveredHackathon[];
  stats: {
    totalDiscovered: number;
    validActive: number;
    expiredSkipped: number;
    duplicatesSkipped: number;
    sourceBreakdown: Record<string, SourceStats>;
  };
}> {
  const [devfolioRes, devpostRes, mlhRes, hackerEarthRes] = await Promise.allSettled([
    fetchDevfolioHackathons(),
    fetchDevpostHackathons(),
    fetchMlhHackathons(),
    fetchHackerEarthHackathons(),
  ]);

  const sourceBreakdown: Record<string, SourceStats> = {};
  const rawList: DiscoveredHackathon[] = [];

  const handleResult = (
    res: PromiseSettledResult<{ hackathons: DiscoveredHackathon[]; stats: SourceStats }>,
    name: string
  ) => {
    if (res.status === "fulfilled") {
      sourceBreakdown[name] = res.value.stats;
      rawList.push(...res.value.hackathons);
    } else {
      sourceBreakdown[name] = {
        source: name,
        status: "failed",
        discovered: 0,
        valid: 0,
        expired: 0,
        error: res.reason?.message || "Unknown network failure",
      };
    }
  };

  handleResult(devfolioRes, "Devfolio");
  handleResult(devpostRes, "Devpost");
  handleResult(mlhRes, "MLH");
  handleResult(hackerEarthRes, "HackerEarth");

  let totalDiscovered = 0;
  let expiredSkipped = 0;
  for (const s of Object.values(sourceBreakdown)) {
    totalDiscovered += s.discovered;
    expiredSkipped += s.expired;
  }

  // De-duplicate across sources using normalized titles and normalized URLs
  const deduplicated: DiscoveredHackathon[] = [];
  const seenTitles = new Set<string>();
  const seenUrls = new Set<string>();
  let duplicatesSkipped = 0;

  for (const h of rawList) {
    const normT = normalizeTitle(h.title);
    const normU = normalizeUrl(h.link);

    if (seenTitles.has(normT) || (normU && seenUrls.has(normU))) {
      duplicatesSkipped++;
      continue;
    }

    seenTitles.add(normT);
    if (normU) seenUrls.add(normU);
    deduplicated.push(h);
  }

  return {
    hackathons: deduplicated,
    stats: {
      totalDiscovered,
      validActive: deduplicated.length,
      expiredSkipped,
      duplicatesSkipped,
      sourceBreakdown,
    },
  };
}

/**
 * Merge & Upsert Hackathons into Firestore pulse_updates collection.
 * Uses selective queries to minimize Firestore reads and bounded batching.
 */
export async function syncHackathonsToFirestore(): Promise<HackathonSyncResult> {
  if (!adminDb) {
    throw new Error("Firebase Admin DB not initialized");
  }

  const { hackathons, stats } = await discoverAllHackathons();
  const now = admin.firestore.Timestamp.now();

  let imported = 0;
  let updated = 0;
  let skippedDuplicates = stats.duplicatesSkipped;

  // Prefetch existing hackathons in pulse_updates (limit to 100 recent to conserve reads)
  let existingHackathons: any[] = [];
  try {
    const existingSnap = await adminDb
      .collection("pulse_updates")
      .where("category", "==", "Hackathons")
      .select("title", "link", "sourceUrl", "sourceName", "source", "sources")
      .limit(100)
      .get();

    existingHackathons = existingSnap.docs.map(d => ({
      docId: d.id,
      ...d.data(),
    }));
  } catch (err: any) {
    console.warn("[Hackathon Sync] Existing pulse_updates prefetch warning:", err?.message);
  }

  for (const h of hackathons) {
    // Extra safety barrier: strictly exclude any unstop hackathon
    if (isUnstopEvent(h.link, h.sourceName, h.title)) continue;

    try {
      const normT = normalizeTitle(h.title);
      const normU = normalizeUrl(h.link);

      const existingMatch = existingHackathons.find((ex: any) => {
        if (ex.link && normalizeUrl(ex.link) === normU) return true;
        if (ex.sourceUrl && normalizeUrl(ex.sourceUrl) === normU) return true;
        if (ex.title && normalizeTitle(ex.title) === normT) return true;
        return false;
      });

      if (existingMatch) {
        // Record exists: update sync timestamp and active source metadata
        const existingSources: string[] = Array.isArray(existingMatch.sources)
          ? existingMatch.sources
          : [existingMatch.sourceName || existingMatch.source || h.source];

        if (!existingSources.includes(h.source)) {
          existingSources.push(h.source);
        }

        await adminDb.collection("pulse_updates").doc(existingMatch.docId).update({
          sources: existingSources,
          lastSynced: now,
          updatedAt: now,
          deadline: h.deadline ? admin.firestore.Timestamp.fromDate(h.deadline) : (existingMatch.deadline || null),
          location: h.location || existingMatch.location || null,
          mode: h.mode || existingMatch.mode || "Offline",
        });
        updated++;
        skippedDuplicates++;
      } else {
        // Insert new hackathon record
        const newRecord: any = {
          title: h.title,
          description: h.description,
          category: "Hackathons",
          link: h.link,
          officialEventUrl: h.officialEventUrl,
          registrationUrl: h.registrationUrl || h.link,
          priority: "normal",
          isPinned: false,
          createdByRole: "system",
          isCreatedByAdmin: false,
          verifiedSource: true,
          sourceName: h.sourceName,
          source: h.source,
          sources: [h.source],
          primarySource: h.source,
          location: h.location,
          mode: h.mode,
          organizer: h.organizer,
          eventDate: h.eventDate || null,
          deadline: h.deadline ? admin.firestore.Timestamp.fromDate(h.deadline) : null,
          prizePool: h.prizePool || null,
          registrationFee: h.registrationFee || "Free",
          teamSize: h.teamSize || null,
          tags: h.tags || ["hackathon"],
          createdAt: now,
          updatedAt: now,
          scrapedAt: now,
          lastSynced: now,
        };

        await adminDb.collection("pulse_updates").add(newRecord);
        imported++;
      }
    } catch (writeErr: any) {
      console.error(`[Hackathon Sync Write Error] "${h.title}":`, writeErr?.message);
    }
  }

  const result: HackathonSyncResult = {
    lastSynced: new Date().toISOString(),
    sourcesChecked: Object.keys(stats.sourceBreakdown),
    totalDiscovered: stats.totalDiscovered,
    validActive: stats.validActive,
    imported,
    updated,
    skippedDuplicates,
    expiredSkipped: stats.expiredSkipped,
    sourceBreakdown: stats.sourceBreakdown,
    sampleTitles: hackathons.slice(0, 10).map(h => `[${h.sourceName}] ${h.title}`),
  };

  // Record stats in system_settings
  try {
    await adminDb.collection("system_settings").doc("hackathon_sync").set(result, { merge: true });
  } catch (logErr) {}

  return result;
}
