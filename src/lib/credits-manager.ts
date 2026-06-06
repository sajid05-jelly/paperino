import { adminDb, adminAuth } from './firebase-admin';

export type ToolType = 'pyq' | 'ats';

export interface CreditCheckResult {
  allowed: boolean;
  uid?: string;
  role?: string;
  used?: number;
  limit?: number;
  error?: string;
}

// Ensure timezone is IST
const getISTDateString = () => {
  const date = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
};

const getLimits = (role: string) => {
  if (role === 'admin') return { pyq: Infinity, ats: Infinity };
  if (role === 'contributor') return { pyq: 9, ats: 9 };
  return { pyq: 3, ats: 3 }; // Default for 'student' or undefined
};

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
    const role = decodedToken.role || 'student'; // Assuming role is set in custom claims, else fallback

    // Even if custom claims aren't set, we can check the users collection for the role
    let actualRole = role;
    if (!decodedToken.role) {
       const userDoc = await adminDb.collection('users').doc(uid).get();
       if (userDoc.exists) {
         actualRole = userDoc.data()?.role || 'student';
       }
    }

    const limits = getLimits(actualRole);
    const toolLimit = tool === 'pyq' ? limits.pyq : limits.ats;

    if (toolLimit === Infinity) {
      return { allowed: true, uid, role: actualRole, used: 0, limit: Infinity };
    }

    const todayIST = getISTDateString();
    const creditsRef = adminDb.collection('user_credits').doc(uid);
    const creditsDoc = await creditsRef.get();

    let used = 0;

    if (creditsDoc.exists) {
      const data = creditsDoc.data()!;
      if (data.lastResetDate === todayIST) {
        used = tool === 'pyq' ? (data.pyqUsed || 0) : (data.atsUsed || 0);
      } else {
        // Different day, resets to 0 (we don't write to DB yet, we write it when they actually use a credit)
        used = 0;
      }
    }

    if (used >= toolLimit) {
      return { allowed: false, error: 'Daily credit limit reached.', uid, role: actualRole, used, limit: toolLimit };
    }

    return { allowed: true, uid, role: actualRole, used, limit: toolLimit };
  } catch (error) {
    console.error('Credit verification error:', error);
    return { allowed: false, error: 'Invalid authentication token.' };
  }
}

export async function incrementCreditUsage(uid: string, tool: ToolType) {
  if (!adminDb) return;

  try {
    const todayIST = getISTDateString();
    const creditsRef = adminDb.collection('user_credits').doc(uid);
    
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(creditsRef);
      
      let pyqUsed = 0;
      let atsUsed = 0;

      if (doc.exists) {
        const data = doc.data()!;
        if (data.lastResetDate === todayIST) {
          pyqUsed = data.pyqUsed || 0;
          atsUsed = data.atsUsed || 0;
        }
      }

      if (tool === 'pyq') pyqUsed++;
      if (tool === 'ats') atsUsed++;

      transaction.set(creditsRef, {
        uid,
        pyqUsed,
        atsUsed,
        lastResetDate: todayIST,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
  } catch (error) {
    console.error('Failed to increment credit usage:', error);
  }
}
