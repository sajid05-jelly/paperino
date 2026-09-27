
require("dotenv").config({ path: ".env.local" });
const Razorpay = require("razorpay");
const admin = require("firebase-admin");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const adminAuth = admin.auth();

async function fix() {
  const subs = await instance.subscriptions.all({ count: 100 });
  console.log("Found " + subs.items.length + " subscriptions...");
  
  for (const sub of subs.items) {
      if (sub.status === "active" && sub.notes && sub.notes.userId) {
          const userId = sub.notes.userId;
          const plan = sub.notes.plan;
          console.log("Fixing User: " + userId + ", Plan: " + plan);
          
          try {
             const userRecord = await adminAuth.getUser(userId);
             const claims = userRecord.customClaims || {};
             await adminAuth.setCustomUserClaims(userId, {
                 ...claims,
                 plan: plan,
                 razorpaySubscriptionId: sub.id,
                 razorpaySubscriptionStatus: "active"
             });
             console.log(" - Custom claims updated.");
          } catch(e) {
             console.error(" - Failed claims:", e.message);
          }
          
          try {
             await db.collection("users").doc(userId).update({
                 plan: plan,
                 razorpaySubscriptionId: sub.id,
                 razorpaySubscriptionStatus: "active",
                 updatedAt: Date.now()
             });
             console.log(" - Firestore updated.");
          } catch(e) {
             console.error(" - Failed firestore:", e.message);
          }
      }
  }
}
fix().catch(console.error).finally(() => process.exit(0));

