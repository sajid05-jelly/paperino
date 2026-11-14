/**
 * Paperino 48-Hour Premium Special Offer Configuration
 *
 * Offer details:
 * - Original Premium price: ₹99
 * - Special offer price: ₹79
 * - Discount: ₹20
 * - Duration: Exactly 48 hours
 * - Start: November 12, 2026, 6:01 PM IST (2026-11-12T18:01:00+05:30 -> 1794486660000 ms)
 * - Expiry: November 15, 2026, 3:01 AM IST (2026-11-15T03:01:00+05:30 -> 1794691860000 ms, extended by 9 hours)
 */

export const PREMIUM_OFFER = {
  START_TIMESTAMP: 1794486660000, // 2026-11-12T18:01:00+05:30
  EXPIRY_TIMESTAMP: 1794691860000, // 2026-11-15T03:01:00+05:30 (+9 hours)
  DURATION_HOURS: 57,
  ORIGINAL_PRICE: 99,
  ORIGINAL_PRICE_PAISE: 9900,
  OFFER_PRICE: 79,
  OFFER_PRICE_PAISE: 7900,
  DISCOUNT_AMOUNT: 20,
  BADGE_TEXT: "SPECIAL OFFER – 48 HOURS ONLY",
  STANDARD_PLAN_ID: process.env.RAZORPAY_PREMIUM_PLAN_ID || "plan_TfW2mTx4fBA2Fz",
  OFFER_PLAN_ID: process.env.RAZORPAY_PREMIUM_OFFER_PLAN_ID || "plan_TzGiB2DsvsVpjI",
} as const;

/**
 * Checks if the 48-hour special offer is currently active.
 * Enforces start and expiry boundaries on both frontend and backend.
 */
export function isSpecialOfferActive(nowMs: number = Date.now()): boolean {
  return nowMs >= PREMIUM_OFFER.START_TIMESTAMP && nowMs < PREMIUM_OFFER.EXPIRY_TIMESTAMP;
}

/**
 * Returns the effective plan ID to use for Razorpay subscription creation.
 * Returns the ₹79 offer plan while active, and automatically restores ₹99 after expiry.
 */
export function getPremiumRazorpayPlanId(nowMs: number = Date.now()): string {
  if (isSpecialOfferActive(nowMs)) {
    return process.env.RAZORPAY_PREMIUM_OFFER_PLAN_ID || PREMIUM_OFFER.OFFER_PLAN_ID;
  }
  return process.env.RAZORPAY_PREMIUM_PLAN_ID || PREMIUM_OFFER.STANDARD_PLAN_ID;
}

/**
 * Computes remaining time until the fixed offer expiry.
 */
export function getOfferRemainingTime(nowMs: number = Date.now()): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formatted: string;
} {
  const diffMs = PREMIUM_OFFER.EXPIRY_TIMESTAMP - nowMs;
  if (diffMs <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      formatted: "00:00:00",
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
    formatted,
  };
}
