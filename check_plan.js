const Razorpay = require('razorpay');
require('dotenv').config({ path: '.env.local' });

async function checkPlan() {
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const plan = await instance.plans.fetch(process.env.RAZORPAY_PLUS_PLAN_ID);
    console.log("Plan details:", plan);
  } catch(e) {
    console.error("Error fetching plan:", e);
  }
}
checkPlan();
