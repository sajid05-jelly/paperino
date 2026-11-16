// src/lib/challengeResolver.ts
import { adminDb } from '@/lib/firebase-admin';

/**
 * Returns the canonical challenge identifier for a given game based on the
 * current admin configuration. This identifier is used for all challengeId
 * fields and deterministic result document IDs.
 */
export async function getCanonicalChallengeId(gameId: string, _authUser?: any): Promise<string> {
  const now = new Date();
  const challengeDate = now.toISOString().split('T')[0];
  let challengeId = `${gameId}-${challengeDate}`; // Default fallback

  if (adminDb) {
    try {
      const configSnap = await adminDb.collection('settings').doc('weeklyChallenges').get();
      if (configSnap && configSnap.exists) {
        const cfg = configSnap.data() ?? {};
        if (cfg.currentWeek) {
          challengeId = `${gameId}-${cfg.currentWeek}`;
        }
      }
    } catch (error) {
      console.warn("challengeResolver: Failed to read settings, using fallback challengeId", error);
    }
  }

  return challengeId;
}
