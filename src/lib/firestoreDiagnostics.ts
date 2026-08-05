/**
 * Development-only Firestore Read Diagnostic Logger with Aggregate Metrics
 */

interface CollectionMetric {
  calls: number;
  cacheHits: number;
  estimatedReads: number;
}

const metrics: Record<string, CollectionMetric> = {};

export function logFirestoreRead(targetCollection: string, details?: string, estimatedReads: number = 1) {
  if (process.env.NODE_ENV === "development") {
    if (!metrics[targetCollection]) {
      metrics[targetCollection] = { calls: 0, cacheHits: 0, estimatedReads: 0 };
    }
    metrics[targetCollection].calls += 1;
    metrics[targetCollection].estimatedReads += estimatedReads;

    const detailStr = details ? ` (${details})` : "";
    console.log(
      `\x1b[36m[FIRESTORE READ]\x1b[0m ${targetCollection}${detailStr} | Total Calls: ${metrics[targetCollection].calls}, Est. Reads: ${metrics[targetCollection].estimatedReads}`
    );
  }
}

export function logFirestoreCacheHit(targetCache: string, details?: string) {
  if (process.env.NODE_ENV === "development") {
    if (!metrics[targetCache]) {
      metrics[targetCache] = { calls: 0, cacheHits: 0, estimatedReads: 0 };
    }
    metrics[targetCache].cacheHits += 1;

    const detailStr = details ? ` (${details})` : "";
    console.log(
      `\x1b[32m[FIRESTORE CACHE HIT]\x1b[0m ${targetCache}${detailStr} | Total Hits: ${metrics[targetCache].cacheHits}`
    );
  }
}

export function getDiagnosticSummary() {
  return metrics;
}
