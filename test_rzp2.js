const Razorpay = require('razorpay');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const subscription = await instance.subscriptions.create({
    plan_id: process.env.RAZORPAY_PLUS_PLAN_ID,
    customer_notify: 0,
    total_count: 120,
    notes: {
      userId: 'test_uid_123',
      plan: 'plus',
    }
  });
  console.log("Sub with customer_notify 0:", subscription);
}
test();
