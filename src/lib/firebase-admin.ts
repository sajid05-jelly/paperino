import * as admin from 'firebase-admin';

const firebaseAdmin = (admin as any).default || admin;
const apps = firebaseAdmin?.apps || [];

if (!apps.length && firebaseAdmin?.credential) {
  try {
    let credential;

    // Check if the single JSON string environment variable exists
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = firebaseAdmin.credential.cert(serviceAccount);
    } 
    // Fallback to individual variables if available
    else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = firebaseAdmin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      console.warn("Firebase Admin SDK: Missing Service Account Credentials. Server-side auth will fail.");
    }

    if (credential) {
      firebaseAdmin.initializeApp({
        credential,
      });
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

const activeApps = firebaseAdmin?.apps || [];
const adminDb = activeApps.length ? firebaseAdmin.firestore() : null;
const adminAuth = activeApps.length ? firebaseAdmin.auth() : null;

export { adminDb, adminAuth };
