import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Ensure this is only called by Vercel Cron or authorized admin
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let fetchedCount = 0;
    
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
        
        for (const item of items) {
          if (!item.title || !item.public_url) continue;
          
          const link = `https://unstop.com/${item.public_url}`;
          const title = item.title;
          
          // Check for duplicates in both collections
          const queueQuery = await adminDb.collection("pulse_queue").where("link", "==", link).get();
          const updatesQuery = await adminDb.collection("pulse_updates").where("link", "==", link).get();
          
          if (queueQuery.empty && updatesQuery.empty) {
            await adminDb.collection("pulse_queue").add({
              title: title,
              description: item.seo_meta_description || item.short_description || `A new opportunity on Unstop: ${title}.`,
              category: "Hackathons",
              sourceName: "Unstop",
              link: link,
              isPinned: false,
              status: "pending",
              createdAt: new Date(),
              organizer: item.organization?.name || "Unstop",
              deadline: item.regnRequirements?.end_regn_dt ? new Date(item.regnRequirements.end_regn_dt * 1000) : null
            });
            fetchedCount++;
          }
        }
      }
    } catch (e) {
      console.error("Unstop fetch error:", e);
    }

    // --- 2. Fetch from Devfolio ---
    try {
      const res = await fetch("https://api.devfolio.co/api/search/hackathons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: JSON.stringify({
          q: "",
          filter: { status: ["open"] }
        }),
        cache: 'no-store'
      });

      if (res.ok) {
        const json = await res.json();
        const items = json?.hits?.hits || [];
        
        for (const hit of items) {
          const item = hit._source;
          if (!item || !item.name || !item.slug) continue;

          const link = `https://${item.slug}.devfolio.co`;
          const title = item.name;

          const queueQuery = await adminDb.collection("pulse_queue").where("link", "==", link).get();
          const updatesQuery = await adminDb.collection("pulse_updates").where("link", "==", link).get();

          if (queueQuery.empty && updatesQuery.empty) {
            await adminDb.collection("pulse_queue").add({
              title: title,
              description: item.description || `A new hackathon on Devfolio: ${title}.`,
              category: "Hackathons",
              sourceName: "Devfolio",
              link: link,
              isPinned: false,
              status: "pending",
              createdAt: new Date(),
              organizer: item.hosted_by || "Devfolio",
              deadline: item.ends_at ? new Date(item.ends_at) : null
            });
            fetchedCount++;
          }
        }
      }
    } catch (e) {
      console.error("Devfolio fetch error:", e);
    }

    return NextResponse.json({ success: true, newItemsAdded: fetchedCount });
  } catch (error: any) {
    console.error("Cron fetch-pulse error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
