require('dotenv').config({ path: '.env.local' });
const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function check() {
  const sub = await instance.subscriptions.fetch('sub_TghZjkdWUyV9Ni');
  console.log(sub);
}
check().catch(console.error);
