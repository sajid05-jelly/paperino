/**
 * src/lib/watermark.ts
 *
 * Helper utilities for resolving and formatting user downloader profile names
 * for dynamic PDF and material watermarking.
 */

import * as admin from "firebase-admin";

/**
 * Converts a raw name, username, or email handle to proper case (e.g. "sajid" -> "Sajid", "mohamed sajid" -> "Mohamed Sajid")
 */
export function formatProfileName(name?: string | null): string {
  if (!name || typeof name !== "string") return "";
  const cleaned = name.trim();
  if (!cleaned) return "";

  return cleaned
    .split(/\s+/)
    .map(word => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
}

/**
 * Authoritative name resolution for the person downloading study materials.
 * Priority order:
 * 1. Firestore users/{uid} profile (displayName -> username -> name)
 * 2. Authenticated user's Firebase Auth record (authRecord.displayName)
 * 3. Client-provided profile name (from active session)
 * 4. Token name claim
 * 5. Email handle prefix (e.g. "sajid" from "sajid@srmist.edu.in")
 * 6. Fallback: "Paperino User"
 */
export async function resolveUserDownloaderName(params: {
  uid?: string | null;
  providedName?: string | null;
  tokenName?: string | null;
  email?: string | null;
  adminDb?: FirebaseFirestore.Firestore | null;
}): Promise<string> {
  const { uid, providedName, tokenName, email, adminDb } = params;

  const isGeneric = (str?: string | null) => {
    if (!str || typeof str !== "string") return true;
    const s = str.trim().toLowerCase();
    return !s || s === "student" || s === "paperino user" || s === "user" || s === "guest" || s === "contributor";
  };

  // 1. Authoritative: Fetch from Firestore users/{uid} document
  if (adminDb && uid && uid !== "GUEST") {
    try {
      const uSnap = await adminDb.collection("users").doc(uid).get();
      if (uSnap.exists) {
        const uData = uSnap.data() || {};
        const profileDisplay = typeof uData.displayName === "string" ? uData.displayName.trim() : "";
        const profileUsername = typeof uData.username === "string" ? uData.username.trim() : "";
        const profileName = typeof uData.name === "string" ? uData.name.trim() : "";

        if (!isGeneric(profileDisplay)) {
          return formatProfileName(profileDisplay);
        }
        if (profileUsername) {
          return formatProfileName(profileUsername);
        }
        if (!isGeneric(profileName)) {
          return formatProfileName(profileName);
        }
      }
    } catch (err: any) {
      console.warn("[Downloader Name Resolver] Notice checking users collection:", err.message);
    }
  }

  // 2. Client-provided profile name (e.g. from active AuthContext session in request body)
  if (!isGeneric(providedName)) {
    return formatProfileName(providedName!);
  }

  // 3. Token name claim from decoded Firebase ID Token
  if (!isGeneric(tokenName)) {
    return formatProfileName(tokenName!);
  }

  // 4. Firebase Auth user record lookup via Admin SDK
  if (uid && uid !== "GUEST" && admin.apps?.length) {
    try {
      const authRecord = await admin.auth().getUser(uid);
      if (!isGeneric(authRecord.displayName)) {
        return formatProfileName(authRecord.displayName!);
      }
      if (authRecord.email && authRecord.email.toLowerCase() !== "student@paperino.app") {
        const prefix = authRecord.email.split("@")[0].replace(/[._-]/g, " ").trim();
        if (prefix) {
          return formatProfileName(prefix);
        }
      }
    } catch (err: any) {
      // Ignored if user not found in Firebase Auth
    }
  }

  // 5. Fallback to email handle prefix
  if (email && email.toLowerCase() !== "student@paperino.app") {
    const prefix = email.split("@")[0].replace(/[._-]/g, " ").trim();
    if (prefix) {
      return formatProfileName(prefix);
    }
  }

  // 6. Generic Fallback
  return "Paperino User";
}
