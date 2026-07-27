import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { StandardInternship, InternshipProvider } from "./types";
import { UnstopProvider } from "./unstopProvider";

// Strict Apply URL Verification Helper (ONLY Unstop URLs permitted)
async function verifyApplyUrl(url: string): Promise<boolean> {
  if (!url || !url.startsWith("http")) return false;
  if (!url.toLowerCase().includes("unstop.com")) return false;
  return true;
}

export class InternshipManager {
  private providers: InternshipProvider[] = [
    new UnstopProvider()
  ];

  async getAggregatedInternships(forceSync = false): Promise<StandardInternship[]> {
    const CACHE_EXPIRATION_MS = 45 * 60 * 1000; // Cache for 45 minutes
    const cacheDocRef = adminDb?.collection("unstop_cache").doc("aggregated_internships");

    // 1. Try to read from Firestore cache unless forceSync is true
    if (!forceSync && cacheDocRef) {
      try {
        const cacheSnap = await cacheDocRef.get();
        if (cacheSnap.exists) {
          const cacheData = cacheSnap.data();
          const updatedAt = cacheData?.updatedAt?.toMillis?.() || 0;
          if (Date.now() - updatedAt < CACHE_EXPIRATION_MS) {
            console.log("[InternshipManager] Returning fresh cached Unstop aggregated results");
            return cacheData?.items || [];
          }
        }
      } catch (err) {
        console.warn("[InternshipManager] Cache read skipped:", err);
      }
    }

    // 2. Fetch directly from Unstop API
    console.log("[InternshipManager] Fetching fresh opportunities from Unstop API...");
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

    // 3. Strict Apply URL Verification Filter (ONLY Unstop links allowed)
    console.log(`[InternshipManager] Validating Unstop URLs for ${aggregatedList.length} opportunities...`);
    const validatedList: StandardInternship[] = [];
    const validationPromises = aggregatedList.map(async (opp) => {
      const isValid = await verifyApplyUrl(opp.applyUrl);
      if (isValid) {
        validatedList.push(opp);
      } else {
        console.warn(`[InternshipManager URL Reject] Excluded non-Unstop link for ${opp.title} at ${opp.company}: ${opp.applyUrl}`);
      }
    });

    await Promise.all(validationPromises);
    console.log(`[InternshipManager] Unstop URL validation completed. ${validatedList.length} verified Unstop opportunities retained.`);

    // 4. Save aggregated results back to Firestore cache
    if (cacheDocRef && validatedList.length > 0) {
      try {
        await cacheDocRef.set({
          items: validatedList,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[InternshipManager] Cached ${validatedList.length} validated Unstop internships.`);
      } catch (err) {
        console.warn("[InternshipManager] Cache write skipped:", err);
      }
    }

    return validatedList;
  }
}
