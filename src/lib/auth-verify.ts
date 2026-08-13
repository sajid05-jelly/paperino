/**
 * Server-Side Firebase Auth ID Token Verifier
 * 
 * Verifies ID Tokens on the server using Google's public tokeninfo endpoint
 * and checks the user's role by reading their user profile document
 * from Firestore REST API in their authenticated context.
 */

import { adminAuth, adminDb } from "./firebase-admin";

interface VerifiedUser {
  uid: string;
  email: string;
  role: string;
}

export async function verifyServerAuth(authHeader: string | null): Promise<VerifiedUser | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("Authorization header missing or invalid format.");
    return null;
  }

  const token = authHeader.split(" ")[1];
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "paperino-data";
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  try {
    let uid = "";
    let email = "";

    // 1. Verify Firebase ID Token locally if adminAuth is initialized
    if (adminAuth) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        uid = decodedToken.uid;
        email = decodedToken.email || "";
      } catch (authErr) {
        console.error("Firebase Admin verifyIdToken failed:", authErr);
        return null;
      }
    } else {
      // Fallback: Verify via Google REST API if adminAuth is not configured
      if (!apiKey) {
        console.error("Firebase API Key missing in environment variables.");
        return null;
      }

      const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      });

      if (!lookupRes.ok) {
        console.error("Firebase ID Token verification failed at Identity Toolkit API.");
        return null;
      }

      const lookupData = await lookupRes.json();
      const userPayload = lookupData.users?.[0];

      if (!userPayload) {
        console.error("User payload missing in lookup response.");
        return null;
      }

      uid = userPayload.localId;
      email = userPayload.email;
    }

    if (!uid || !email) {
      console.error("Firebase lookup response missing localId or email.");
      return null;
    }

    // Check hardcoded admin list FIRST — skip Firestore role fetch if already known admin
    const allowedAdmins = [
      "mohamedsajid.sa@gmail.com",
      "sudharajsekar2005@gmail.com",
      "admin.paperinoirfan27@gmail.com",
      "admin.paperinosam14@gmail.com",
      "gameplayitlifeitis@gmail.com",
      "gameplayitlifeis@gmail.com",
      "gameplayitlife@gmail.com",
      "dejasvini28@gmail.com",
      "kaushika13official@gmail.com"
    ];

    if (allowedAdmins.includes(email.toLowerCase())) {
      // Known admin — no need to fetch role from Firestore
      return { uid, email, role: "admin" };
    }

    // 2. Fetch User Role from Firestore using Admin SDK (fast) or REST API fallback
    let role = "student"; // Default fallback

    if (adminDb) {
      try {
        const userSnap = await adminDb.collection('users').doc(uid).get();
        if (userSnap.exists) {
          role = userSnap.data()?.role || "student";
        }
      } catch (roleErr) {
        console.warn(`Could not fetch Firestore user doc for ${uid} via Admin SDK. Defaulting to 'student'.`, roleErr);
      }
    } else {
      // Fallback to REST API only if Admin SDK is not available
      try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
        const userDocRes = await fetch(firestoreUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (userDocRes.ok) {
          const userDoc = await userDocRes.json();
          role = userDoc.fields?.role?.stringValue || "student";
        } else {
          console.warn(`Could not fetch Firestore user doc for ${uid}. Defaulting to 'student'. Status: ${userDocRes.status}`);
        }
      } catch (roleErr) {
        console.warn(`REST API fetch failed for user ${uid}. Defaulting to 'student'.`, roleErr);
      }
    }

    return {
      uid,
      email,
      role,
    };
  } catch (error) {
    console.error("Error during server auth verification:", error);
    return null;
  }
}
