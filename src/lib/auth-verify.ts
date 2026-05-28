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

  try {
    // 1. Verify Google/Firebase ID Token via tokeninfo endpoint
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!tokenInfoRes.ok) {
      console.error("Token verification failed at Google OAuth API.");
      return null;
    }

    const tokenData = await tokenInfoRes.json();

    // Verify audience matches the Firebase Project ID
    if (tokenData.aud !== projectId) {
      console.error("Token audience mismatch. Expected:", projectId, "Got:", tokenData.aud);
      return null;
    }

    const uid = tokenData.sub;
    const email = tokenData.email;

    if (!uid || !email) {
      console.error("Token payload missing UID or Email.");
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
      // Fallback: Check hardcoded admin list if Firestore fetch fails
      const allowedAdmins = [
        "mohamedsajid.sa@gmail.com",
        "sudharajsekar2005@gmail.com",
        "admin.paperinoirfan27@gmail.com",
        "admin.paperinosam14@gmail.com"
      ];
      if (allowedAdmins.includes(email.toLowerCase())) {
        role = "admin";
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
