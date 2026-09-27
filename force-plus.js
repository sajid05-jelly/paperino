
require("dotenv").config({ path: ".env.local" });
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const adminAuth = admin.auth();

async function fix() {
  const userId = "zsbyh1OfdEfpQwWUnZXaTU6q4ma2";
  const plan = "plus";
  console.log("Forcing User: " + userId + " to " + plan);
  
  try {
     const userRecord = await adminAuth.getUser(userId);
     const claims = userRecord.customClaims || {};
     await adminAuth.setCustomUserClaims(userId, {
         ...claims,
         plan: plan,
         razorpaySubscriptionId: "sub_TghZjkdWUyV9Ni",
         razorpaySubscriptionStatus: "active"
     });
     console.log(" - Custom claims updated.");
  } catch(e) {
     console.error(" - Failed claims:", e.message);
  }
}
fix().catch(console.error).finally(() => process.exit(0));

