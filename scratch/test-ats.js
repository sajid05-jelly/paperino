
require("dotenv").config();
const { verifyFeatureAccess, consumeFeatureUsage } = require("./src/lib/server-entitlement");
const { adminDb } = require("./src/lib/firebase-admin");

async function test() {
  console.log("Testing ATS limit enforcement...");
  const uid = "TEST_USER_123";
  const month = "2026-10";
  
  // Set up mock user
  await adminDb.collection("users").doc(uid).set({
    role: "student", plan: "free"
  });

  // Clear usage
  await adminDb.collection("user_monthly_usage").doc(`${uid}_${month}`).delete();

  // 1st request
  let consumed = await consumeFeatureUsage(uid, "ats");
  console.log("1st consume:", consumed);

  // 2nd request
  consumed = await consumeFeatureUsage(uid, "ats");
  console.log("2nd consume:", consumed);

  // 3rd request (should fail)
  consumed = await consumeFeatureUsage(uid, "ats");
  console.log("3rd consume:", consumed);

  // check verify
  const mockToken = "Bearer FAKE"; // we cant easily mock authHeader verifyIdToken here
}
test().catch(console.error);

