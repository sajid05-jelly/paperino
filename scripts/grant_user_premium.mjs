import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';

dotenv.config({ path: path.resolve('paperino', '.env.local') });

const credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
admin.initializeApp({ credential });
const auth = admin.auth();
const db = admin.firestore();

async function grantPremium(email, months = 1) {
  console.log(`\n====================================================`);
  console.log(`🌟 GRANTING ${months}-MONTH PREMIUM ACCESS TO: ${email}`);
  console.log(`====================================================`);

  // 1. Get user record from Auth
  const userRecord = await auth.getUserByEmail(email);
  const uid = userRecord.uid;
  console.log(`✓ Found user in Firebase Auth. UID: ${uid}`);

  // 2. Calculate time boundaries (Exactly 1 Month from now)
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + months);

  console.log(`⏱️ Premium Start: ${now.toISOString()} (${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)`);
  console.log(`⏱️ Premium Expiry: ${endDate.toISOString()} (${endDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)`);

  // 3. Update Firebase Custom Claims for fast zero-quota bypass
  const currentClaims = userRecord.customClaims || {};
  const updatedClaims = {
    ...currentClaims,
    plan: 'premium',
    razorpaySubscriptionStatus: 'active',
    premiumStartDateMs: now.getTime(),
    premiumEndDateMs: endDate.getTime(),
    planActivatedAt: now.getTime()
  };

  await auth.setCustomUserClaims(uid, updatedClaims);
  console.log(`✓ Firebase Custom Claims successfully updated:`, updatedClaims);

  // 4. Update Firestore user doc
  const userRef = db.collection('users').doc(uid);
  const firestoreData = {
    plan: 'premium',
    isPremiumActive: true,
    subscriptionStatus: 'active',
    razorpaySubscriptionStatus: 'active',
    premiumStartDate: admin.firestore.Timestamp.fromDate(now),
    premiumEndDate: admin.firestore.Timestamp.fromDate(endDate),
    premiumDuration: `${months} month`,
    grantedBy: 'admin',
    grantedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await userRef.set(firestoreData, { merge: true });
  console.log(`✓ Firestore user document successfully updated with premium dates and status.`);

  // 5. Verification: Read back and confirm
  const verifyDoc = await userRef.get();
  const verifyData = verifyDoc.data();
  const verifyUser = await auth.getUser(uid);

  console.log(`\n====================================================`);
  console.log(`🎉 VERIFICATION COMPLETED:`);
  console.log(`====================================================`);
  console.log(`User: ${verifyData.displayName || userRecord.displayName} (${verifyData.email})`);
  console.log(`Plan: ${verifyData.plan}`);
  console.log(`Status: ${verifyData.subscriptionStatus}`);
  console.log(`Active: ${verifyData.isPremiumActive}`);
  console.log(`Start Date: ${verifyData.premiumStartDate.toDate().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  console.log(`Expiry Date: ${verifyData.premiumEndDate.toDate().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  console.log(`Auth Custom Claim Plan: ${verifyUser.customClaims?.plan}`);
  console.log(`Auth Custom Claim Expiry: ${new Date(verifyUser.customClaims?.premiumEndDateMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
}

grantPremium('jaswanthkumar4848@gmail.com', 1)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to grant premium access:', err);
    process.exit(1);
  });
