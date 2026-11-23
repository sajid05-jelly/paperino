import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase safely
const app = (getApps().length === 0 && firebaseConfig.apiKey) ? initializeApp(firebaseConfig) : (getApps()[0] || null);

const auth = app ? getAuth(app) : (null as any);
const db = app ? getFirestore(app) : (null as any);

if (typeof window !== "undefined" && db) {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore multi-tab persistence failed:", err);
  });
}

// 🛡️ Firebase App Check: Protects Firestore from unauthorized scripts/console scrapers
let appCheck: any = null;
const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY;
if (typeof window !== "undefined" && app && recaptchaKey) {
  try {
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
    }
    // Registered under Fraud Defense (reCAPTCHA Enterprise) in Firebase Console
    const isV3 = process.env.NEXT_PUBLIC_USE_RECAPTCHA_V3 === "true";
    const provider = isV3
      ? new ReCaptchaV3Provider(recaptchaKey)
      : new ReCaptchaEnterpriseProvider(recaptchaKey);

    appCheck = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("[App Check] Initialization note:", err);
  }
}

const storage = app ? getStorage(app) : (null as any);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export { app, auth, db, storage, googleProvider, appCheck };
