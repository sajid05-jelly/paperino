// src/lib/challengeResolver.ts
import { adminDb } from '@/lib/firebase-admin';
import { verifyServerAuth } from '@/lib/auth-verify';

/**
 * Returns the canonical challenge identifier for a given game based on the
 * current admin configuration. This identifier is used for all challengeId
 * fields and deterministic result document IDs.
 */
export async function getCanonicalChallengeId(gameId: string, authUser: any): Promise<string> {
  const now = new Date();
  const challengeDate = now.toISOString().split('T')[0];
  let challengeId = `${gameId}-${challengeDate}`; // Fallback if admin config missing

  if (adminDb) {
    const configSnap = await adminDb.collection('settings').doc('weeklyChallenges').get();
    if (configSnap && configSnap.exists) {
      const cfg = configSnap.data() ?? {};
      const isUserAdmin =
        authUser.email?.toLowerCase() === 'mohamedsajid.sa@gmail.com' ||
        authUser.role === 'admin' ||
        (authUser as any).admin === true;
      const isAdminBypass = Boolean(isUserAdmin && cfg.adminTestMode === true);

      // When an active admin session exists, it takes precedence.
      if (!isAdminBypass) {
        if (cfg.challengeSessionId) {
          challengeId = `${gameId}-${cfg.challengeSessionId}`;
        } else if (cfg.currentChallengeId) {
          challengeId = `${gameId}-${cfg.currentChallengeId}`;
        } else if (cfg.currentWeek) {
          challengeId = `${gameId}-${cfg.currentWeek}`;
        }
      }
    }
  }

  return challengeId;
}

/** Helper to determine admin bypass */
export function isAdminBypass(authUser: any, cfg: any): boolean {
  const isUserAdmin =
    authUser.email?.toLowerCase() === 'mohamedsajid.sa@gmail.com' ||
    authUser.role === 'admin' ||
    (authUser as any).admin === true;
  return Boolean(isUserAdmin && cfg?.adminTestMode === true);
}
