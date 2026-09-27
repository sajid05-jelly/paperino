import { adminDb, adminAuth } from './firebase-admin';
import { checkMonthlyUsage, incrementMonthlyUsage, checkAndConsumeMonthlyUsage } from './monthly-usage';
import { getCurrentMonthKey, getEffectivePlan, getMonthlyLimit } from './subscription';

export type ToolType = 'pyq' | 'ats';

export interface CreditCheckResult {
  allowed: boolean;
  uid?: string;
  role?: string;
  used?: number;
  limit?: number;
  error?: string;
}

export async function checkAndGetCredits(authHeader: string | null, tool: ToolType): Promise<CreditCheckResult> {
  if (!adminAuth || !adminDb) {
    return { allowed: false, error: 'Firebase Admin not initialized. Server misconfiguration.' };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { allowed: false, error: 'Missing or invalid Authorization header.' };
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const { plan } = getEffectivePlan(userData);

    // Admin bypass
    if (userData?.role === 'admin') {
      return { allowed: true, uid, role: 'admin', used: 0, limit: Infinity };
    }

    const featureKey = tool === 'pyq' ? 'pyqAnalyzer' : 'ats';
    const limit = getMonthlyLimit(plan, featureKey);

    if (limit <= 0) {
      const toolName = tool === 'pyq' ? 'PYQ Analyzer' : 'ATS';
      return {
        allowed: false,
        uid,
        role: userData?.role || 'student',
        used: 0,
        limit: 0,
        error: `${toolName} is not available on the Free plan. Upgrade to Paperino Plus or Pro to unlock.`
      };
    }

    const usageCheck = await checkAndConsumeMonthlyUsage(uid, featureKey);
    if (!usageCheck.allowed) {
      return {
        allowed: false,
        uid,
        role: userData?.role || 'student',
        used: usageCheck.used,
        limit: usageCheck.limit,
        error: usageCheck.error || `Monthly ${tool.toUpperCase()} limit reached (${usageCheck.limit}/month). Upgrade for higher limits.`
      };
    }

    return {
      allowed: true,
      uid,
      role: userData?.role || 'student',
      used: usageCheck.used,
      limit: usageCheck.limit
    };
  } catch (error) {
    console.error('Credit verification error:', error);
    return { allowed: false, error: 'Failed to verify account or usage limits due to a system error. Please try again later.' };
  }
}

export async function incrementCreditUsage(uid: string, tool: ToolType) {
  if (!adminDb) return;

  try {
    const featureKey = tool === 'pyq' ? 'pyqAnalyzer' : 'ats';
    const newCount = await incrementMonthlyUsage(uid, featureKey);

    // Also update user_credits document for real-time listener compatibility
    const monthKey = getCurrentMonthKey();
    const creditsRef = adminDb.collection('user_credits').doc(uid);
    await creditsRef.set({
      uid,
      [tool === 'pyq' ? 'pyqUsed' : 'atsUsed']: newCount,
      lastResetDate: monthKey,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to increment credit usage:', error);
  }
}
