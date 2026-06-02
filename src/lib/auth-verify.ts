/**
 * Server-Side Firebase Auth ID Token Verifier
 * 
 * Verifies ID Tokens on the server using Google's public tokeninfo endpoint
 * and checks the user's role by reading their user profile document
 * from Firestore REST API in their authenticated context.
 */

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

  if (!apiKey) {
    console.error("Firebase API Key missing in environment variables.");
    return null;
  }

  try {
    // 1. Verify Firebase ID Token via Identity Toolkit endpoint
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

    const uid = userPayload.localId;
    const email = userPayload.email;

    if (!uid || !email) {
      console.error("Firebase lookup response missing localId or email.");
      return null;
    }

    // 2. Fetch User Role from Firestore using the user's Auth token (so rules allow it)
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
    const userDocRes = await fetch(firestoreUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    let role = "student"; // Default fallback

    if (userDocRes.ok) {
      const userDoc = await userDocRes.json();
      role = userDoc.fields?.role?.stringValue || "student";
    } else {
      console.warn(`Could not fetch Firestore user doc for ${uid}. Defaulting to 'student'. Status: ${userDocRes.status}`);
    }

    // Always enforce allowedAdmins hardcoded list for developers/super-admins
    const allowedAdmins = [
      "mohamedsajid.sa@gmail.com",
      "sudharajsekar2005@gmail.com",
      "admin.paperinoirfan27@gmail.com",
      "admin.paperinosam14@gmail.com"
    ];
    if (allowedAdmins.includes(email.toLowerCase())) {
      role = "admin";
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
