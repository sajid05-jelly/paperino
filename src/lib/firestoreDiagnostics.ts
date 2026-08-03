/**
 * Development-only Firestore Read Diagnostic Logger
 */
export function logFirestoreRead(targetCollection: string, details?: string) {
  if (process.env.NODE_ENV === "development") {
    const detailStr = details ? ` (${details})` : "";
    console.log(`\x1b[36m[FIRESTORE READ]\x1b[0m ${targetCollection}${detailStr}`);
  }
}

export function logFirestoreCacheHit(targetCache: string, details?: string) {
  if (process.env.NODE_ENV === "development") {
    const detailStr = details ? ` (${details})` : "";
    console.log(`\x1b[32m[FIRESTORE CACHE HIT]\x1b[0m ${targetCache}${detailStr}`);
  }
}
