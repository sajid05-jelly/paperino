import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export interface KnowafestEvent {
  eventTitle: string;
  college: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  eventCategory: string; // Hackathons, Workshops, Events, Internships, etc.
  eventMode: "Online" | "Offline" | "Hybrid";
  eventDate: string | null;
  registrationDeadline: string | null;
  registrationLink: string | null; // Selected priority link (registrationUrl || officialEventUrl)
  officialEventUrl: string | null; // Specific detail URL e.g. https://www.knowafest.com/events/...
  registrationUrl: string | null; // External direct registration link e.g. google forms / unstop
  coverImage: string | null;
  description: string;
  organizer: string | null;
  prizePool: string | null;
  registrationFee: string | null;
  teamSize: string | null;
  eligibleBatches: string | null;
  tags: string[];
  sourceUrl: string;
}

export interface SyncLogDetail {
  title: string;
  action: "imported" | "updated" | "skipped";
  reason?: string;
  sourceUrl: string;
}

export interface SyncResult {
  lastSynced: string;
  httpStatus: number;
  foundCardsCount: number;
  eventsExtractedCount: number;
  eventsImported: number;
  eventsUpdated: number;
  eventsSkipped: number;
  failedEvents: number;
  extractedTitles: string[];
  logs: SyncLogDetail[];
  error?: string;
  failedSelectorReason?: string;
}

// Priority ranking (lower = higher priority)
const SOURCE_PRIORITY: Record<string, number> = {
  official_website: 1,
  unstop: 2,
  knowafest: 3,
  devfolio: 4,
  hack2skill: 5,
  devpost: 6,
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Scrape events directly from Knowafest directory pages.
 * Handles both <tr> schema.org/Event structures and fallback <a> blocks.
 */
/**
 * Scrape events directly from Knowafest.
 * Multi-layer strategy:
 * 1. Modern responsive event cards (<article class="event-card">) from directory pages.
 * 2. Official Knowafest RSS Feed (https://www.knowafest.com/feed.xml) for real-time live events.
 * 3. Fallback table rows (<tr itemprop="Event">) for legacy mirrors.
 */
export async function scrapeKnowafestEvents(): Promise<{
  events: KnowafestEvent[];
  httpStatus: number;
  foundCardsCount: number;
  failedSelectorReason?: string;
}> {
  const events: KnowafestEvent[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  const targetHtmlUrls = [
    "https://www.knowafest.com/explore/upcomingfests",
    "https://www.knowafest.com/events",
  ];

  let lastHttpStatus = 200;
  let totalCardsFound = 0;
  let selectorFailReason: string | undefined;

  const reqHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Cache-Control": "no-cache",
  };

  // ── STRATEGY 1: Parse Modern Event Cards from HTML Pages ────────────────
  for (const url of targetHtmlUrls) {
    try {
      console.log(`[Knowafest Scraper] Fetching ${url}...`);
      const res = await fetch(url, {
        headers: reqHeaders,
        next: { revalidate: 0 },
      });

      lastHttpStatus = res.status;
      if (!res.ok) {
        selectorFailReason = `HTTP ${res.status} returned from ${url}`;
        continue;
      }

      const html = await res.text();

      // Check for <article class="event-card">
      const cardRegex = /<article[^>]*class=["'][^"']*event-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi;
      let cardMatch: RegExpExecArray | null;

      while ((cardMatch = cardRegex.exec(html)) !== null) {
        totalCardsFound++;
        const cardHtml = cardMatch[1];

        const titleMatch = cardHtml.match(/<a[^>]*class=["'][^"']*card-title[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
        let officialUrl = titleMatch ? titleMatch[1].trim() : null;
        let title = titleMatch ? titleMatch[2].replace(/<[^>]+>/g, '').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : null;

        if (!officialUrl) {
          const anyLink = cardHtml.match(/href=["'](https?:\/\/[^"']*\/event\/[^"']+)["']/i);
          if (anyLink) officialUrl = anyLink[1];
        }

        if (!title && cardHtml.match(/alt=["']([^"']+)["']/i)) {
          const altMatch = cardHtml.match(/alt=["']([^"']+)["']/i);
          title = altMatch ? altMatch[1].trim() : null;
        }

        if (!title || !officialUrl) continue;
        const norm = normalizeTitle(title);
        if (seenTitles.has(norm) || seenUrls.has(officialUrl)) continue;

        const imgMatch = cardHtml.match(/<img[^>]*class=["'][^"']*event-card-image[^"']*["'][^>]*src=["']([^"']+)["']/i) || cardHtml.match(/<img[^>]*src=["']([^"']+)["']/i);
        const coverImage = imgMatch ? imgMatch[1].trim() : null;

        const tagMatch = cardHtml.match(/<span[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([^<]+)<\/span>/i);
        const rawTag = tagMatch ? tagMatch[1].trim() : "Events";

        let category = "Events";
        const tagLower = rawTag.toLowerCase();
        const titleLower = title.toLowerCase();
        if (tagLower.includes("hackathon") || titleLower.includes("hackathon")) category = "Hackathons";
        else if (tagLower.includes("workshop") || titleLower.includes("workshop") || tagLower.includes("fdp")) category = "Workshops";
        else if (tagLower.includes("internship") || titleLower.includes("internship")) category = "Internships";
        else if (tagLower.includes("conference") || titleLower.includes("conference")) category = "Conferences";
        else if (tagLower.includes("cultural") || tagLower.includes("cultural") || tagLower.includes("fest")) category = "Cultural";
        else if (tagLower.includes("technical") || tagLower.includes("symposium")) category = "Technical";
        else category = rawTag;

        let mode: "Online" | "Offline" | "Hybrid" = "Offline";
        if (cardHtml.toLowerCase().includes("online") || titleLower.includes("online") || titleLower.includes("virtual")) {
          mode = "Online";
        } else if (cardHtml.toLowerCase().includes("hybrid") || titleLower.includes("hybrid")) {
          mode = "Hybrid";
        }

        const collegeMatch = cardHtml.match(/<a[^>]*class=["'][^"']*college[^"']*["'][^>]*>([^<]+)<\/a>/i);
        const college = collegeMatch ? collegeMatch[1].replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim() : null;

        const metaMatches = [...cardHtml.matchAll(/<span>([◷⌖\s]*[^<]+)<\/span>/gi)].map(m => m[1].replace(/[◷⌖]/g, '').trim()).filter(Boolean);
        let eventDate: string | null = null;
        let city: string | null = null;
        for (const m of metaMatches) {
          if (/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(m) || /\d{4}/.test(m)) {
            eventDate = m;
          } else if (m.toLowerCase() !== "online" && m.toLowerCase() !== "offline" && m.toLowerCase() !== "hybrid" && m !== rawTag) {
            city = m;
          }
        }

        const feeMatch = cardHtml.match(/<div[^>]*class=["'][^"']*card-footer[^"']*["'][\s\S]*?<strong>([^<]+)<\/strong>/i);
        const registrationFee = feeMatch ? feeMatch[1].trim() : null;

        seenTitles.add(norm);
        seenUrls.add(officialUrl);

        events.push({
          eventTitle: title,
          college,
          city,
          state: null,
          country: "India",
          eventCategory: category,
          eventMode: mode,
          eventDate,
          registrationDeadline: eventDate,
          registrationLink: officialUrl,
          officialEventUrl: officialUrl,
          registrationUrl: null,
          coverImage,
          description: `${title}. Hosted by ${college || "Knowafest"}${city ? `, ${city}` : ""}. Category: ${category}. Date: ${eventDate || "TBA"}.${registrationFee ? ` Fee: ${registrationFee}.` : ""}`,
          organizer: college || "Knowafest Organizer",
          prizePool: null,
          registrationFee,
          teamSize: null,
          eligibleBatches: null,
          tags: ["knowafest", category.toLowerCase(), mode.toLowerCase()],
          sourceUrl: officialUrl,
        });

        if (events.length >= 35) break;
      }

      // Check legacy <tr> rows if no cards were found
      if (events.length === 0) {
        const trRegex = /<tr[^>]*itemtype=["']http:\/\/schema\.org\/Event["'][^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch: RegExpExecArray | null;
        while ((trMatch = trRegex.exec(html)) !== null) {
          totalCardsFound++;
          const trHtml = trMatch[0];
          const inner = trMatch[1];

          const onClickMatch = trHtml.match(/onClick=["']window\.open\(\s*['"]([^'"]+)['"]/i);
          const relLink = onClickMatch ? onClickMatch[1].trim() : null;
          const officialEventUrl = relLink ? (relLink.startsWith("http") ? relLink : `https://www.knowafest.com/${relLink.replace(/^\//, '')}`) : null;
          if (!officialEventUrl || officialEventUrl.endsWith("/events") || officialEventUrl.endsWith("/upcomingfests")) continue;

          const startDateMatch = inner.match(/itemprop=["']startDate["'][^>]*>([^<]+)</i);
          const startDate = startDateMatch ? startDateMatch[1].trim() : null;
          const endDateMatch = inner.match(/itemprop=["']endDate["'][^>]*>([^<]+)</i);
          const endDate = endDateMatch ? endDateMatch[1].trim() : null;

          const nameMatch = inner.match(/itemprop=["']name["'][^>]*>([\s\S]*?)<span/i) || inner.match(/itemprop=["']name["'][^>]*>([^<]+)</i);
          const title = nameMatch ? nameMatch[1].replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() : null;
          if (!title) continue;

          const norm = normalizeTitle(title);
          if (seenTitles.has(norm) || seenUrls.has(officialEventUrl)) continue;

          const typeMatch = inner.match(/<td\s*>([^<]+)<\/td>/i);
          const rawType = typeMatch ? typeMatch[1].trim() : "Event";
          const titleLower = title.toLowerCase();

          let category = "Events";
          if (rawType.toLowerCase().includes("internship") || titleLower.includes("internship")) category = "Internships";
          else if (rawType.toLowerCase().includes("hackathon") || titleLower.includes("hackathon")) category = "Hackathons";
          else if (rawType.toLowerCase().includes("workshop") || titleLower.includes("workshop")) category = "Workshops";
          else if (rawType.toLowerCase().includes("placement") || titleLower.includes("placement")) category = "Placements";

          const mode: "Online" | "Offline" | "Hybrid" =
            titleLower.includes("online") || titleLower.includes("virtual")
              ? "Online"
              : titleLower.includes("hybrid")
              ? "Hybrid"
              : "Offline";

          const locationNameMatch = inner.match(/<span\s+itemprop=["']location["'][\s\S]*?<span\s+itemprop=["']name["'][^>]*>([^<]+)</i);
          const addressMatch = inner.match(/itemprop=["']address["'][^>]*>([\s\S]*?)<\/span>/i);
          const organizer = locationNameMatch ? locationNameMatch[1].replace(/,$/, '').trim() : null;
          const addressRaw = addressMatch ? addressMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null;

          let city: string | null = null;
          let state: string | null = null;
          if (addressRaw && addressRaw.includes(",")) {
            const parts = addressRaw.split(",");
            city = parts[0].trim();
            state = parts[1].trim();
          } else if (addressRaw) {
            city = addressRaw.trim();
          }

          seenTitles.add(norm);
          seenUrls.add(officialEventUrl);

          events.push({
            eventTitle: title,
            college: organizer,
            city,
            state,
            country: "India",
            eventCategory: category,
            eventMode: mode,
            eventDate: startDate || endDate || null,
            registrationDeadline: endDate || startDate || null,
            registrationLink: officialEventUrl,
            officialEventUrl,
            registrationUrl: null,
            coverImage: null,
            description: `${title}. Hosted by ${organizer || "Knowafest"}${city ? `, ${city}` : ""}. Event Type: ${rawType}. Dates: ${startDate || "TBA"} to ${endDate || "TBA"}.`,
            organizer: organizer || "Knowafest Organizer",
            prizePool: null,
            registrationFee: null,
            teamSize: null,
            eligibleBatches: null,
            tags: ["knowafest", category.toLowerCase(), mode.toLowerCase()],
            sourceUrl: officialEventUrl,
          });
        }
      }
    } catch (err: any) {
      console.error(`[Knowafest Scraper Error] ${url}:`, err.message || err);
      selectorFailReason = err.message || "Failed to fetch Knowafest HTML";
    }
  }

  // ── STRATEGY 2: Official Knowafest RSS Feed (50 live events) ───────────
  try {
    console.log(`[Knowafest Scraper] Checking official RSS Feed https://www.knowafest.com/feed.xml...`);
    const feedRes = await fetch("https://www.knowafest.com/feed.xml", {
      headers: reqHeaders,
      next: { revalidate: 0 },
    });

    if (feedRes.ok) {
      const xml = await feedRes.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let itemMatch: RegExpExecArray | null;

      while ((itemMatch = itemRegex.exec(xml)) !== null) {
        totalCardsFound++;
        const itemContent = itemMatch[1];
        const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
        const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        const catMatch = itemContent.match(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/i);
        const dateMatch = itemContent.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);

        const title = titleMatch ? titleMatch[1].replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim() : null;
        const link = linkMatch ? linkMatch[1].trim() : null;
        const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim() : "";
        const rawCat = catMatch ? catMatch[1].trim() : "Events";
        const pubDate = dateMatch ? dateMatch[1].trim() : null;

        if (!title || !link) continue;
        const norm = normalizeTitle(title);
        if (seenTitles.has(norm) || seenUrls.has(link)) continue;

        let organizer: string | null = null;
        let city: string | null = null;
        const orgMatch = desc.match(/organized by ([^,\.]+)(?:,\s*([^,\.]+))?/i);
        if (orgMatch) {
          organizer = orgMatch[1].trim();
          if (orgMatch[2]) city = orgMatch[2].trim();
        }

        let category = "Events";
        const titleLower = title.toLowerCase();
        const catLower = rawCat.toLowerCase();
        if (catLower.includes("hackathon") || titleLower.includes("hackathon")) category = "Hackathons";
        else if (catLower.includes("workshop") || titleLower.includes("workshop") || catLower.includes("fdp")) category = "Workshops";
        else if (catLower.includes("internship") || titleLower.includes("internship")) category = "Internships";
        else if (catLower.includes("conference") || titleLower.includes("conference")) category = "Conferences";
        else if (catLower.includes("cultural") || titleLower.includes("cultural")) category = "Cultural";
        else if (catLower.includes("technical") || titleLower.includes("technical")) category = "Technical";
        else category = rawCat;

        const mode: "Online" | "Offline" | "Hybrid" =
          desc.toLowerCase().includes("online") || titleLower.includes("online")
            ? "Online"
            : desc.toLowerCase().includes("hybrid") || titleLower.includes("hybrid")
            ? "Hybrid"
            : "Offline";

        const formattedDate = pubDate ? new Date(pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

        seenTitles.add(norm);
        seenUrls.add(link);

        events.push({
          eventTitle: title,
          college: organizer,
          city,
          state: null,
          country: "India",
          eventCategory: category,
          eventMode: mode,
          eventDate: formattedDate,
          registrationDeadline: formattedDate,
          registrationLink: link,
          officialEventUrl: link,
          registrationUrl: null,
          coverImage: null,
          description: desc || `${title}. Hosted by ${organizer || "Knowafest"}.`,
          organizer: organizer || "Knowafest Organizer",
          prizePool: null,
          registrationFee: null,
          teamSize: null,
          eligibleBatches: null,
          tags: ["knowafest", category.toLowerCase(), mode.toLowerCase()],
          sourceUrl: link,
        });

        if (events.length >= 40) break;
      }
    }
  } catch (feedErr: any) {
    console.warn("[Knowafest Feed Warning]:", feedErr?.message || feedErr);
  }

  // ── STRATEGY 3: Optional fast external registration resolution for top items ─
  const enrichCount = Math.min(events.length, 5);
  for (let i = 0; i < enrichCount; i++) {
    const ev = events[i];
    if (!ev.officialEventUrl) continue;
    try {
      const detailRes = await fetch(ev.officialEventUrl, {
        headers: reqHeaders,
        signal: AbortSignal.timeout(2500),
      });
      if (detailRes.ok) {
        const detailHtml = await detailRes.text();
        const extLinks = detailHtml.match(/href=["'](https?:\/\/[^"']+)["']/gi) || [];
        for (const el of extLinks) {
          const uMatch = el.match(/href=["']([^"']+)["']/i);
          if (uMatch) {
            const linkVal = uMatch[1];
            const uLower = linkVal.toLowerCase();
            if (
              (uLower.includes("form") || uLower.includes("docs.google") || uLower.includes("registration") || uLower.includes("register") || uLower.includes("unstop") || uLower.includes("apply")) &&
              !uLower.includes("knowafest.com") &&
              !uLower.includes("sharethis")
            ) {
              ev.registrationUrl = linkVal;
              ev.registrationLink = linkVal;
              break;
            }
          }
        }
      }
    } catch {
      // Timeout or network error on detail page is safely ignored
    }
  }

  if (events.length === 0 && !selectorFailReason) {
    selectorFailReason = "Zero events extracted from Knowafest HTML cards and RSS feed.";
  } else if (events.length > 0) {
    selectorFailReason = undefined;
  }

  return {
    events,
    httpStatus: lastHttpStatus,
    foundCardsCount: totalCardsFound,
    failedSelectorReason: selectorFailReason,
  };
}

/**
 * Merge & Upsert Knowafest events into Firestore pulse_updates collection.
 */
export async function syncKnowafestToFirestore(): Promise<SyncResult> {
  if (!adminDb) {
    throw new Error("Firebase Admin DB not initialized");
  }

  const logs: SyncLogDetail[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const now = admin.firestore.Timestamp.now();

  try {
    const scrapeRes = await scrapeKnowafestEvents();

    console.log(`[Knowafest Pipeline] HTTP ${scrapeRes.httpStatus} | Found Cards: ${scrapeRes.foundCardsCount} | Extracted: ${scrapeRes.events.length}`);

    const extractedTitles = scrapeRes.events.map(e => e.eventTitle);

    if (scrapeRes.events.length === 0) {
      const syncResult: SyncResult = {
        lastSynced: new Date().toISOString(),
        httpStatus: scrapeRes.httpStatus,
        foundCardsCount: scrapeRes.foundCardsCount,
        eventsExtractedCount: 0,
        eventsImported: 0,
        eventsUpdated: 0,
        eventsSkipped: 0,
        failedEvents: 0,
        extractedTitles: [],
        logs: [],
        failedSelectorReason: scrapeRes.failedSelectorReason || "Zero events extracted from Knowafest HTML",
      };
      await adminDb.collection("system_settings").doc("knowafest_sync").set(syncResult, { merge: true });
      return syncResult;
    }

    // Fetch recent pulse updates for deduplication check (only needed fields, limit 50 to conserve reads)
    let existingDocs: any[] = [];
    try {
      const existingSnap = await adminDb
        .collection("pulse_updates")
        .select("title", "link", "sourceUrl", "sources", "sourceName", "source", "primarySource")
        .limit(50)
        .get();
      existingDocs = existingSnap.docs.map(d => ({
        docId: d.id,
        ...d.data(),
      }));
    } catch (fetchErr: any) {
      console.warn("[Knowafest Pipeline] pulse_updates query notice (Quota/Permission):", fetchErr?.message || fetchErr);
    }

    for (const ev of scrapeRes.events) {
      try {
        const normNew = normalizeTitle(ev.eventTitle);

        // Find existing match by normalized title or source link
        const matchDoc = existingDocs.find((ex: any) => {
          if (ex.link && ex.link === ev.sourceUrl) return true;
          if (ex.sourceUrl && ex.sourceUrl === ev.sourceUrl) return true;
          if (ex.title && normalizeTitle(ex.title) === normNew) return true;
          return false;
        });

        if (matchDoc) {
          const existingSources: string[] = Array.isArray((matchDoc as any).sources)
            ? (matchDoc as any).sources
            : [(matchDoc as any).sourceName || (matchDoc as any).source || "knowafest"];

          const alreadyHasKnowafest = existingSources.includes("knowafest");

          if (!alreadyHasKnowafest) {
            existingSources.push("knowafest");

            const currentPrimary = (matchDoc as any).primarySource || (matchDoc as any).sourceName || "knowafest";
            const currentRank = SOURCE_PRIORITY[currentPrimary.toLowerCase()] || 99;
            const knowafestRank = SOURCE_PRIORITY["knowafest"];
            const newPrimary = knowafestRank < currentRank ? "knowafest" : currentPrimary;

            const updatePayload: any = {
              sources: existingSources,
              primarySource: newPrimary,
              lastSynced: now,
              updatedAt: now,
              scrapedAt: now,
            };

            await adminDb.collection("pulse_updates").doc(matchDoc.docId).update(updatePayload);
            updated++;
            logs.push({ title: ev.eventTitle, action: "updated", sourceUrl: ev.sourceUrl });
          } else {
            skipped++;
            logs.push({ title: ev.eventTitle, action: "skipped", reason: "Already exists in Firestore", sourceUrl: ev.sourceUrl });
          }
        } else {
          // Insert new event card
          const newDoc = {
            title: ev.eventTitle,
            description: ev.description,
            category: ev.eventCategory,
            link: ev.registrationLink,
            officialEventUrl: ev.officialEventUrl,
            registrationUrl: ev.registrationUrl,
            priority: "normal",
            isPinned: false,
            createdBy: "knowafest_bot",
            createdByRole: "admin",
            isCreatedByAdmin: true,
            verifiedSource: true,
            sourceName: "knowafest",
            source: "knowafest",
            sources: ["knowafest"],
            primarySource: "knowafest",
            location: [ev.college, ev.city].filter(Boolean).join(", ") || null,
            mode: ev.eventMode,
            organizer: ev.organizer || ev.college || null,
            eventDate: ev.eventDate || null,
            deadline: ev.registrationDeadline ? admin.firestore.Timestamp.fromDate(new Date(ev.registrationDeadline)) : null,
            prizePool: ev.prizePool || null,
            registrationFee: ev.registrationFee || null,
            teamSize: ev.teamSize || null,
            eligibleBatches: ev.eligibleBatches || null,
            tags: ev.tags || ["knowafest"],
            createdAt: now,
            updatedAt: now,
            scrapedAt: now,
            lastSynced: now,
          };

          await adminDb.collection("pulse_updates").add(newDoc);
          
          // Also create a public notification so users see it in the notification bell
          try {
            const locStr = [ev.college, ev.city].filter(Boolean).join(", ");
            await adminDb.collection("notifications").add({
              userId: "ALL",
              title: `🎯 New Opportunity: ${ev.eventTitle}`,
              message: `${ev.eventCategory || "Opportunity"} hosted by ${ev.organizer || ev.college || "Partner"}. ${locStr ? `Location: ${locStr}` : "Mode: " + ev.eventMode}`,
              type: "pulse_new",
              read: false,
              isRead: false,
              createdAt: Date.now(),
            });
          } catch (notifErr) {
            console.warn("[Knowafest Notification Warning]:", notifErr);
          }

          imported++;
          logs.push({ title: ev.eventTitle, action: "imported", sourceUrl: ev.sourceUrl });
        }
      } catch (e: any) {
        console.error(`[Knowafest Firestore Write Error] "${ev.eventTitle}":`, e.message);
        failed++;
        logs.push({ title: ev.eventTitle, action: "skipped", reason: `Write failed: ${e.message}`, sourceUrl: ev.sourceUrl });
      }
    }

    const syncLog: SyncResult = {
      lastSynced: new Date().toISOString(),
      httpStatus: scrapeRes.httpStatus,
      foundCardsCount: scrapeRes.foundCardsCount,
      eventsExtractedCount: scrapeRes.events.length,
      eventsImported: imported,
      eventsUpdated: updated,
      eventsSkipped: skipped,
      failedEvents: failed,
      extractedTitles,
      logs: logs.slice(0, 30),
    };

    try {
      await adminDb.collection("system_settings").doc("knowafest_sync").set(syncLog, { merge: true });
    } catch (saveErr: any) {
      console.warn("[Knowafest Pipeline] system_settings save notice (Quota):", saveErr?.message || saveErr);
    }

    return syncLog;
  } catch (err: any) {
    console.error("[Knowafest Pipeline Critical Error]:", err.message || err);
    const syncLog: SyncResult = {
      lastSynced: new Date().toISOString(),
      httpStatus: 500,
      foundCardsCount: 0,
      eventsExtractedCount: 0,
      eventsImported: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      failedEvents: failed,
      extractedTitles: [],
      logs: [],
      error: err.message || "Failed to complete sync pipeline",
    };
    try {
      await adminDb.collection("system_settings").doc("knowafest_sync").set(syncLog, { merge: true });
    } catch {}
    return syncLog;
  }
}
