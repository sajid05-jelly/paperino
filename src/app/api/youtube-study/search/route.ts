import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse } from "@/services/groqService";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Simple in-memory cache to avoid repeated identical YouTube API calls
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanCache() {
  const now = Date.now();
  for (const [key, val] of searchCache.entries()) {
    if (now - val.timestamp > CACHE_TTL_MS) searchCache.delete(key);
  }
}

/**
 * POST /api/youtube-study/search
 * Body: { subject: string, topic: string, language: "tamil" | "english" | "both" }
 */
// Simple in-memory cache for siteConfig to save Firestore read quota
let siteConfigCache: { youtubeStudyEnabled: boolean; timestamp: number } | null = null;
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    if (adminDb) {
      let youtubeStudyEnabled = true;

      // Check cache first
      if (siteConfigCache && Date.now() - siteConfigCache.timestamp < CONFIG_CACHE_TTL_MS) {
        youtubeStudyEnabled = siteConfigCache.youtubeStudyEnabled;
      } else {
        try {
          const snap = await adminDb.collection("settings").doc("siteConfig").get();
          if (snap.exists) {
            youtubeStudyEnabled = snap.data()?.youtubeStudy !== false;
            // Update cache
            siteConfigCache = { youtubeStudyEnabled, timestamp: Date.now() };
          }
        } catch (e: any) {
          console.warn("[YouTube Study] Failed to read siteConfig:", e.message);
          // Fail closed if we cannot verify the setting
          return NextResponse.json(
            { error: "Unable to verify system settings right now. Please try again later." },
            { status: 503 }
          );
        }
      }

      if (!youtubeStudyEnabled) {
        return NextResponse.json({ error: "YouTube Study is currently disabled by the administrators." }, { status: 403 });
      }
    }

    const body = await req.json();
    const { subject, topic, language } = body;

    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return NextResponse.json({ error: "Topic must be at least 2 characters." }, { status: 400 });
    }
    if (topic.trim().length > 200) {
      return NextResponse.json({ error: "Topic is too long. Please keep it under 200 characters." }, { status: 400 });
    }
    const validLanguages = ["tamil", "english", "both"];
    const lang = validLanguages.includes(language) ? language : "both";

    const subjectClean = subject.trim();
    const topicClean = topic.trim();

    // Step 1: Use AI to normalize the topic into clean academic search queries
    let searchQueries: string[] = [];
    let normalizedTopic = topicClean;

    try {
      const aiPrompt = `A student wants to learn about a topic in their academic subject. Convert their input into the best possible YouTube search queries for educational videos.

Subject: ${subjectClean}
Student's Topic Input: "${topicClean}"
Language Preference: ${lang}

Rules:
1. Understand the academic intent even if the student uses informal language, Tanglish, or abbreviations.
2. Generate 2-3 focused YouTube search queries that would find the BEST educational explanation videos.
3. Include the subject name contextually in queries where it helps disambiguation.
4. If language is "tamil", add "Tamil" to queries. If "english", add "English explanation". If "both", generate a mix.
5. Keep queries concise and search-engine friendly.
6. Also provide the normalized academic topic name.

Respond ONLY with this JSON format:
{
  "normalizedTopic": "Clean academic topic name",
  "queries": ["query1", "query2", "query3"]
}`;

      const aiResponse = await generateChatResponse(
        "You are an academic search query optimizer. Respond ONLY with valid JSON. No markdown, no explanation.",
        aiPrompt
      );

      const cleaned = aiResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      if (parsed.queries && Array.isArray(parsed.queries)) {
        searchQueries = parsed.queries.slice(0, 3);
      }
      if (parsed.normalizedTopic) {
        normalizedTopic = parsed.normalizedTopic;
      }
    } catch (aiErr) {
      console.warn("[YouTube Study] AI normalization failed, using fallback queries:", (aiErr as Error).message);
    }

    // Fallback: construct queries deterministically if AI failed
    if (searchQueries.length === 0) {
      if (lang === "tamil") {
        searchQueries = [
          `${topicClean} ${subjectClean} Tamil explanation`,
          `${topicClean} ${subjectClean} Tamil`,
        ];
      } else if (lang === "english") {
        searchQueries = [
          `${topicClean} ${subjectClean} explanation`,
          `${topicClean} ${subjectClean} tutorial English`,
        ];
      } else {
        searchQueries = [
          `${topicClean} ${subjectClean} explanation`,
          `${topicClean} ${subjectClean} Tamil`,
          `${topicClean} ${subjectClean} tutorial`,
        ];
      }
    }

    // Step 2: Search YouTube
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube search is not configured. Please contact the administrator." },
        { status: 503 }
      );
    }

    cleanCache();

    // Deduplicate videos across queries
    const allVideos: any[] = [];
    const seenIds = new Set<string>();

    for (const q of searchQueries) {
      const cacheKey = q.toLowerCase().trim();
      let items: any[] = [];

      if (searchCache.has(cacheKey)) {
        items = searchCache.get(cacheKey)!.data;
      } else {
        try {
          const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search");
          ytUrl.searchParams.set("part", "snippet");
          ytUrl.searchParams.set("q", q);
          ytUrl.searchParams.set("type", "video");
          ytUrl.searchParams.set("maxResults", "5");
          ytUrl.searchParams.set("relevanceLanguage", lang === "tamil" ? "ta" : "en");
          ytUrl.searchParams.set("safeSearch", "strict");
          ytUrl.searchParams.set("videoCategoryId", "27"); // Education category
          ytUrl.searchParams.set("key", YOUTUBE_API_KEY);

          const ytRes = await fetch(ytUrl.toString());
          if (!ytRes.ok) {
            console.error(`[YouTube Study] YouTube API error for query "${q}":`, ytRes.status);
            continue;
          }
          const ytData = await ytRes.json();
          items = ytData.items || [];
          searchCache.set(cacheKey, { data: items, timestamp: Date.now() });
        } catch (fetchErr) {
          console.error(`[YouTube Study] Fetch error for query "${q}":`, fetchErr);
          continue;
        }
      }

      for (const item of items) {
        const videoId = item.id?.videoId;
        if (videoId && !seenIds.has(videoId)) {
          seenIds.add(videoId);
          allVideos.push(item);
        }
      }
    }

    if (allVideos.length === 0) {
      return NextResponse.json({
        normalizedTopic,
        videos: [],
        message: "No relevant videos found. Try a different topic or language.",
      });
    }

    // Step 3: Get video durations via videos API
    const videoIds = allVideos.map((v: any) => v.id.videoId).join(",");
    let durationMap: Record<string, string> = {};
    let embeddableMap: Record<string, boolean> = {};
    try {
      const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      detailsUrl.searchParams.set("part", "contentDetails,statistics,status");
      detailsUrl.searchParams.set("id", videoIds);
      detailsUrl.searchParams.set("key", YOUTUBE_API_KEY);

      const detailsRes = await fetch(detailsUrl.toString());
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        for (const item of (detailsData.items || [])) {
          durationMap[item.id] = item.contentDetails?.duration || "";
          embeddableMap[item.id] = item.status?.embeddable ?? true;
        }
      }
    } catch (dErr) {
      console.warn("[YouTube Study] Failed to fetch video details:", dErr);
    }

    // Step 4: Score and rank videos
    const topicLower = normalizedTopic.toLowerCase();
    const subjectLower = subjectClean.toLowerCase();
    const topicWords = topicLower.split(/\s+/);

    const scoredVideos = allVideos.map((item: any) => {
      const title = (item.snippet?.title || "").toLowerCase();
      const description = (item.snippet?.description || "").toLowerCase();
      const channelTitle = item.snippet?.channelTitle || "";
      const videoId = item.id.videoId;
      const rawDuration = durationMap[videoId] || "";
      
      let score = 0;
      const reasons: string[] = [];

      // Exact topic match in title
      if (title.includes(topicLower)) {
        score += 40;
        reasons.push("Exact topic match in title");
      } else {
        // Partial word matches
        const wordMatches = topicWords.filter(w => w.length > 2 && title.includes(w));
        if (wordMatches.length > 0) {
          score += Math.min(25, wordMatches.length * 8);
          reasons.push("Topic keywords found in title");
        }
      }

      // Subject match
      if (title.includes(subjectLower) || description.includes(subjectLower)) {
        score += 15;
        reasons.push(`${subjectClean} focused`);
      }

      // Topic in description
      if (description.includes(topicLower)) {
        score += 10;
        reasons.push("Topic mentioned in description");
      }

      // Language detection
      const tamilIndicators = ["tamil", "தமிழ்", "tamizh"];
      const isTamil = tamilIndicators.some(t => title.includes(t) || channelTitle.toLowerCase().includes(t));
      const isEnglish = !isTamil; // simplified

      if (lang === "tamil" && isTamil) {
        score += 15;
        reasons.push("Tamil explanation");
      } else if (lang === "english" && isEnglish) {
        score += 10;
        reasons.push("English explanation");
      } else if (lang === "both") {
        score += 5;
      }

      // Duration scoring - prefer 5-30 min educational videos
      const durationMinutes = parseDurationToMinutes(rawDuration);
      if (durationMinutes >= 5 && durationMinutes <= 30) {
        score += 10;
        reasons.push("Suitable duration for learning");
      } else if (durationMinutes > 30 && durationMinutes <= 60) {
        score += 5;
      }

      // Educational keywords
      const eduKeywords = ["explain", "tutorial", "lecture", "concept", "learn", "class", "lesson", "chapter"];
      if (eduKeywords.some(k => title.includes(k) || description.includes(k))) {
        score += 5;
        reasons.push("Educational content");
      }

      return {
        videoId,
        title: item.snippet?.title || "",
        channelTitle,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        publishedAt: item.snippet?.publishedAt || "",
        duration: rawDuration,
        durationFormatted: formatDuration(rawDuration),
        durationMinutes,
        detectedLanguage: isTamil ? "Tamil" : "English",
        embeddable: embeddableMap[videoId] ?? true,
        score,
        reasons,
      };
    });

    // Sort by score descending, take top 5
    scoredVideos.sort((a: any, b: any) => b.score - a.score);
    const topVideos = scoredVideos.slice(0, 5);

    // Add rank labels
    topVideos.forEach((v: any, i: number) => {
      if (i === 0) v.rankLabel = "Best Match";
      else if (i === 1) v.rankLabel = "Highly Relevant";
      else v.rankLabel = "Relevant";
    });

    return NextResponse.json({
      normalizedTopic,
      videos: topVideos,
    });

  } catch (err: any) {
    console.error("[YouTube Study] Server error:", err);
    return NextResponse.json(
      { error: "Unable to search for videos right now. Please try again." },
      { status: 500 }
    );
  }
}

/** Parse ISO 8601 duration to minutes */
function parseDurationToMinutes(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 60 + minutes + (seconds > 30 ? 1 : 0);
}

/** Format ISO 8601 duration to human readable */
function formatDuration(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds}s`;
}
