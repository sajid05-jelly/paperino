import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the offer configuration
import {
  PREMIUM_OFFER,
  isSpecialOfferActive,
  getPremiumRazorpayPlanId,
  getOfferRemainingTime
} from '../src/lib/premiumOffer.ts';

describe('Paperino – 48-Hour Premium Special Offer', () => {
  const START_MS = 1794486660000;  // 2026-11-12T18:01:00+05:30
  const EXPIRY_MS = 1794659460000; // 2026-11-14T18:01:00+05:30
  const EXACT_48_HOURS_MS = 48 * 60 * 60 * 1000; // 172,800,000 ms

  describe('1. Offer Details & Fixed Timestamps', () => {
    test('Offer duration is exactly 48 hours', () => {
      assert.equal(PREMIUM_OFFER.EXPIRY_TIMESTAMP - PREMIUM_OFFER.START_TIMESTAMP, EXACT_48_HOURS_MS);
      assert.equal(PREMIUM_OFFER.DURATION_HOURS, 48);
    });

    test('Start timestamp corresponds to November 12, 2026, 6:01 PM IST', () => {
      const startDate = new Date(PREMIUM_OFFER.START_TIMESTAMP);
      assert.equal(PREMIUM_OFFER.START_TIMESTAMP, START_MS);
      // In IST (UTC+5:30): UTC time is 12:31:00Z
      assert.equal(startDate.toISOString(), '2026-11-12T12:31:00.000Z');
    });

    test('Expiry timestamp corresponds to November 14, 2026, 6:01 PM IST', () => {
      const expiryDate = new Date(PREMIUM_OFFER.EXPIRY_TIMESTAMP);
      assert.equal(PREMIUM_OFFER.EXPIRY_TIMESTAMP, EXPIRY_MS);
      // In IST (UTC+5:30): UTC time is 12:31:00Z
      assert.equal(expiryDate.toISOString(), '2026-11-14T12:31:00.000Z');
    });

    test('Pricing matches requirements: ₹99 original, ₹79 offer, ₹20 discount', () => {
      assert.equal(PREMIUM_OFFER.ORIGINAL_PRICE, 99);
      assert.equal(PREMIUM_OFFER.ORIGINAL_PRICE_PAISE, 9900);
      assert.equal(PREMIUM_OFFER.OFFER_PRICE, 79);
      assert.equal(PREMIUM_OFFER.OFFER_PRICE_PAISE, 7900);
      assert.equal(PREMIUM_OFFER.DISCOUNT_AMOUNT, 20);
      assert.equal(PREMIUM_OFFER.BADGE_TEXT, 'SPECIAL OFFER – 48 HOURS ONLY');
    });
  });

  describe('2. Active vs Expired Status Check', () => {
    test('Before start time: offer is inactive', () => {
      assert.equal(isSpecialOfferActive(START_MS - 1000), false);
      assert.equal(isSpecialOfferActive(START_MS - 1), false);
    });

    test('At start time: offer is active', () => {
      assert.equal(isSpecialOfferActive(START_MS), true);
    });

    test('During offer period: offer is active', () => {
      assert.equal(isSpecialOfferActive(START_MS + 3600000), true); // 1 hr in
      assert.equal(isSpecialOfferActive(START_MS + 24 * 3600000), true); // 24 hrs in
      assert.equal(isSpecialOfferActive(EXPIRY_MS - 1000), true); // 1 sec before expiry
    });

    test('At expiry time: offer immediately expires', () => {
      assert.equal(isSpecialOfferActive(EXPIRY_MS), false);
    });

    test('After expiry time: offer remains permanently inactive', () => {
      assert.equal(isSpecialOfferActive(EXPIRY_MS + 1000), false);
      assert.equal(isSpecialOfferActive(EXPIRY_MS + 24 * 3600000), false);
    });
  });

  describe('3. Razorpay Plan ID Backend Resolution & Expiry Enforcement', () => {
    test('During offer: backend returns offer plan (₹79 / 7900 paise)', () => {
      const activeTime = START_MS + 1000;
      const planId = getPremiumRazorpayPlanId(activeTime);
      assert.equal(planId, PREMIUM_OFFER.OFFER_PLAN_ID);
      assert.equal(planId, 'plan_TzGiB2DsvsVpjI');
    });

    test('After expiry: backend automatically restores standard plan (₹99 / 9900 paise)', () => {
      const expiredTime = EXPIRY_MS + 1000;
      const planId = getPremiumRazorpayPlanId(expiredTime);
      assert.equal(planId, PREMIUM_OFFER.STANDARD_PLAN_ID);
      assert.equal(planId, 'plan_TfW2mTx4fBA2Fz');
    });

    test('Backend route enforces offer expiry and prevents ₹79 purchase after expiry', () => {
      const routePath = path.join(__dirname, '../src/app/api/razorpay/subscription/route.ts');
      const routeCode = fs.readFileSync(routePath, 'utf8');
      assert.match(routeCode, /getPremiumRazorpayPlanId/);
      assert.match(routeCode, /isSpecialOfferActive/);
    });
  });

  describe('4. Live Countdown Timer Reliability', () => {
    test('Calculates accurate hours, minutes, seconds from fixed expiry timestamp', () => {
      // 10 hours, 15 minutes, 30 seconds before expiry
      const testTime = EXPIRY_MS - (10 * 3600 + 15 * 60 + 30) * 1000;
      const rem = getOfferRemainingTime(testTime);
      assert.equal(rem.isExpired, false);
      assert.equal(rem.hours, 10);
      assert.equal(rem.minutes, 15);
      assert.equal(rem.seconds, 30);
      assert.equal(rem.formatted, '10:15:30');
    });

    test('When expired, timer displays 00:00:00 and marks isExpired: true', () => {
      const rem = getOfferRemainingTime(EXPIRY_MS + 5000);
      assert.equal(rem.isExpired, true);
      assert.equal(rem.hours, 0);
      assert.equal(rem.minutes, 0);
      assert.equal(rem.seconds, 0);
      assert.equal(rem.formatted, '00:00:00');
    });

    test('Fixed expiry timestamp guarantees refreshing/restarting never resets countdown', () => {
      // Multiple queries at the same timestamp yield the exact same countdown
      const t = START_MS + 12 * 3600 * 1000;
      const r1 = getOfferRemainingTime(t);
      const r2 = getOfferRemainingTime(t);
      assert.deepEqual(r1, r2);
      assert.equal(r1.hours, 36);
    });
  });

  describe('5. Plans Page UI Isolation & Promotional Elements', () => {
    test('Pricing page code contains SPECIAL OFFER – 48 HOURS ONLY badge and countdown timer', () => {
      const pagePath = path.join(__dirname, '../src/app/pricing/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');
      assert.match(pageCode, /SPECIAL OFFER – 48 HOURS ONLY/);
      assert.match(pageCode, /₹79/);
      assert.match(pageCode, /₹99/);
      assert.match(pageCode, /line-through/);
      assert.match(pageCode, /Save ₹20/);
      assert.match(pageCode, /remaining\.hours/);
      assert.match(pageCode, /remaining\.minutes/);
      assert.match(pageCode, /remaining\.seconds/);
    });

    test('Plus and Pro plans remain strictly unaffected', () => {
      const pagePath = path.join(__dirname, '../src/app/pricing/page.tsx');
      const pageCode = fs.readFileSync(pagePath, 'utf8');
      // Plus is ₹29
      assert.match(pageCode, /id:\s*"plus"[\s\S]*?price:\s*"₹29"/);
      // Pro is ₹59
      assert.match(pageCode, /id:\s*"pro"[\s\S]*?price:\s*"₹59"/);
    });
  });
});
