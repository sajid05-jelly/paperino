import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

const storage = app ? getStorage(app) : (null as any);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export { app, auth, db, storage, googleProvider };
