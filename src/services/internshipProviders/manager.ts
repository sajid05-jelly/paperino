import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { StandardInternship, InternshipProvider } from "./types";
import { UnstopProvider } from "./unstopProvider";
import { FallbackProvider } from "./fallbackProvider";

export class InternshipManager {
  private providers: InternshipProvider[] = [
    new UnstopProvider(),
    new FallbackProvider()
  ];

  async getAggregatedInternships(): Promise<StandardInternship[]> {
    const CACHE_EXPIRATION_MS = 45 * 60 * 1000; // Cache for 45 minutes
    const cacheDocRef = adminDb?.collection("unstop_cache").doc("aggregated_internships");

    // 1. Try to read from Firestore cache
    if (cacheDocRef) {
      try {
        const cacheSnap = await cacheDocRef.get();
        if (cacheSnap.exists) {
          const cacheData = cacheSnap.data();
          const updatedAt = cacheData?.updatedAt?.toMillis?.() || 0;
          if (Date.now() - updatedAt < CACHE_EXPIRATION_MS) {
            console.log("[InternshipManager] Returning fresh cached aggregated results");
            return cacheData?.items || [];
          }
        }
      } catch (err) {
        console.warn("[InternshipManager] Cache read skipped:", err);
      }
    }

    // 2. Cache expired or not found: Fetch from providers in parallel
    console.log("[InternshipManager] Caches expired or missing. Fetching from providers...");
    const promises = this.providers.map(async (provider) => {
      try {
        return await provider.fetchInternships();
      } catch (e) {
        console.error(`[InternshipManager] Provider ${provider.name} failed:`, e);
        return [];
      }
    });

    const results = await Promise.allSettled(promises);
    const aggregatedList: StandardInternship[] = [];

    results.forEach((res) => {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        aggregatedList.push(...res.value);
      }
    });

    // 3. Save aggregated results back to Firestore cache
    if (cacheDocRef && aggregatedList.length > 0) {
      try {
        await cacheDocRef.set({
          items: aggregatedList,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[InternshipManager] Cached ${aggregatedList.length} aggregated internships.`);
      } catch (err) {
        console.warn("[InternshipManager] Cache write skipped:", err);
      }
    }

    return aggregatedList;
  }
}
