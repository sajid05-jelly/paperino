/**
 * Paperino Subscription & Plan System
 * Single Source of Truth for plans, monthly usage limits, feature access, and contributor benefits.
 */

export type PlanType = "free" | "plus" | "pro" | "premium";

export type FeatureKey =
  | "downloads"
  | "gpaCalculator"
  | "cgpaCalculator"
  | "pdfPreview"
  | "challenges"
  | "paperinoPulse"
  | "pyqAnalyzer"
  | "ats"
  | "examEmergency"
  | "careerDna"
  | "attendanceShield"
  | "uploadMaterials"
  | "semesterCalculator"
  | "githubIntelligence"
  | "avatarChange"
  | "plusAvatarBadge"
  | "changeableColorTheme"
  | "profileFrame"
  | "proAvatarBadge"
  | "profileCompanions"
  | "premiumAvatarBadges"
  | "youtubeStudy";

export interface PlanLimits {
  downloads: number; // per month
  pyqAnalyzer: number; // per month
  ats: number; // per month
  examEmergency: number; // per month
  githubIntelligence: number; // per month
  pdfPreview: boolean;
  careerDna: boolean;
  semesterCalculator: boolean;
  avatarChange: boolean;
  plusAvatarBadge: boolean;
  changeableColorTheme: boolean;
  profileFrame: boolean;
  proAvatarBadge: boolean;
  profileCompanions: boolean;
  premiumAvatarBadges: boolean;
  gpaCalculator: boolean;
  cgpaCalculator: boolean;
  challenges: boolean;
  paperinoPulse: boolean;
  attendanceShield: boolean;
  uploadMaterials: boolean;
  youtubeStudy: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    downloads: 5,
    pyqAnalyzer: 0,
    ats: 2,
    examEmergency: 0,
    githubIntelligence: 2,
    pdfPreview: false,
    careerDna: false,
    semesterCalculator: false,
    avatarChange: false,
    plusAvatarBadge: false,
    changeableColorTheme: false,
    profileFrame: false,
    proAvatarBadge: false,
    profileCompanions: false,
    premiumAvatarBadges: false,
    gpaCalculator: true,
    cgpaCalculator: true,
    challenges: true,
    paperinoPulse: true,
    attendanceShield: true,
    uploadMaterials: true,
    youtubeStudy: false,
  },
  plus: {
    downloads: 10,
    pyqAnalyzer: 4,
    ats: 4,
    examEmergency: 0,
    githubIntelligence: 4,
    pdfPreview: true,
    careerDna: false,
    semesterCalculator: true,
    avatarChange: true,
    plusAvatarBadge: true,
    changeableColorTheme: false,
    profileFrame: false,
    proAvatarBadge: false,
    profileCompanions: false,
    premiumAvatarBadges: false,
    gpaCalculator: true,
    cgpaCalculator: true,
    challenges: true,
    paperinoPulse: true,
    attendanceShield: true,
    uploadMaterials: true,
    youtubeStudy: false,
  },
  pro: {
    downloads: Infinity,
    pyqAnalyzer: 11,
    ats: 11,
    examEmergency: 11,
    githubIntelligence: 11,
    pdfPreview: true,
    careerDna: true,
    semesterCalculator: true,
    avatarChange: true,
    plusAvatarBadge: true,
    changeableColorTheme: true,
    profileFrame: true,
    proAvatarBadge: true,
    profileCompanions: false,
    premiumAvatarBadges: false,
    gpaCalculator: true,
    cgpaCalculator: true,
    challenges: true,
    paperinoPulse: true,
    attendanceShield: true,
    uploadMaterials: true,
    youtubeStudy: true,
  },
  premium: {
    downloads: Infinity,
    pyqAnalyzer: Infinity,
    ats: Infinity,
    examEmergency: Infinity,
    githubIntelligence: Infinity,
    pdfPreview: true,
    careerDna: true,
    semesterCalculator: true,
    avatarChange: true,
    plusAvatarBadge: true,
    changeableColorTheme: true,
    profileFrame: true,
    proAvatarBadge: true,
    profileCompanions: true,
    premiumAvatarBadges: true,
    gpaCalculator: true,
    cgpaCalculator: true,
    challenges: true,
    paperinoPulse: true,
    attendanceShield: true,
    uploadMaterials: true,
    youtubeStudy: true,
  },
};

/**
 * Returns current calendar month key in IST (e.g. "2026-09")
 */
export function getCurrentMonthKey(): string {
  const date = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().slice(0, 7); // "YYYY-MM"
}

/**
 * Checks if user is eligible for Free Plus via approved contributions (>= 10 genuine approved materials)
 */
export function isContributorPlusEligible(userData?: { uploads?: number; approvedUploads?: number } | null): boolean {
  if (!userData) return false;
  // Strictly requires 10 or more genuine approved materials
  const approved = userData.approvedUploads !== undefined ? userData.approvedUploads : (userData.uploads ?? 0);
  return approved >= 10;
}

/**
 * Calculates effective user plan considering admin status, verified paid subscription, and contributor eligibility.
 * Single source of truth across client, server, and entitlement checks.
 */
export function getEffectivePlan(userData?: any): {
  plan: PlanType;
  isContributorPlus: boolean;
  isPaidPlan: boolean;
} {
  if (!userData) {
    return { plan: "free", isContributorPlus: false, isPaidPlan: false };
  }

  // Admins receive full premium access
  if (userData.role === "admin") {
    return { plan: "premium", isContributorPlus: false, isPaidPlan: false };
  }

  const subStatus = (userData.razorpaySubscriptionStatus || userData.subscriptionStatus || "").toLowerCase();
  const rawPlan = (userData.plan || "").toLowerCase();
  const isCancelledOrInactive = [
    "cancelled",
    "canceled",
    "halted",
    "completed",
    "expired",
    "inactive",
    "failed",
    "unpaid",
  ].includes(subStatus);

  // Check if time-limited plan has expired
  if (userData.premiumEndDate) {
    const now = new Date();
    const endDate = userData.premiumEndDate.toDate
      ? userData.premiumEndDate.toDate()
      : (userData.premiumEndDate._seconds
        ? new Date(userData.premiumEndDate._seconds * 1000)
        : new Date(userData.premiumEndDate));
    if (now > endDate) {
      // Time-limited access has expired
      return isContributorPlusEligible(userData)
        ? { plan: "plus", isContributorPlus: true, isPaidPlan: false }
        : { plan: "free", isContributorPlus: false, isPaidPlan: false };
    } else if (!isCancelledOrInactive) {
      // Active time-limited paid plan
      const paidPlan: PlanType = (rawPlan === "plus" || rawPlan === "pro" || rawPlan === "premium") ? rawPlan : "premium";
      return { plan: paidPlan, isContributorPlus: false, isPaidPlan: true };
    }
  }

  // Active verified paid subscription takes precedence over contributor rewards
  // Non-cancelled statuses including active, authenticated, captured, authorized, paid, created, pending, or empty
  const isActiveSubStatus = ["active", "authenticated", "captured", "authorized", "paid", "created", "pending", ""].includes(subStatus);
  if (!isCancelledOrInactive && isActiveSubStatus) {
    if (rawPlan === "premium") {
      return { plan: "premium", isContributorPlus: false, isPaidPlan: true };
    }
    if (rawPlan === "pro") {
      return { plan: "pro", isContributorPlus: false, isPaidPlan: true };
    }
    if (rawPlan === "plus") {
      return { plan: "plus", isContributorPlus: false, isPaidPlan: true };
    }
  }

  // Contributor Free Plus Rule: exactly 10+ genuine approved materials get Plus plan FREE
  // Never grants Pro or Premium based on contributor uploads
  if (isContributorPlusEligible(userData)) {
    return { plan: "plus", isContributorPlus: true, isPaidPlan: false };
  }

  return { plan: "free", isContributorPlus: false, isPaidPlan: false };
}

/**
 * List of features that use monthly consumption counters
 */
export const COUNTED_MONTHLY_FEATURES = [
  "downloads",
  "pyqAnalyzer",
  "ats",
  "examEmergency",
  "githubIntelligence"
] as const;

export type CountedMonthlyFeature = typeof COUNTED_MONTHLY_FEATURES[number];

export function isCountedMonthlyFeature(feature: string): feature is CountedMonthlyFeature {
  return COUNTED_MONTHLY_FEATURES.includes(feature as CountedMonthlyFeature);
}

/**
 * Check if a plan allows a specific feature
 */
export function isFeatureAllowed(plan: PlanType, feature: FeatureKey): boolean {
  const limits = PLAN_LIMITS[plan];
  if (!limits) return false;
  const val = (limits as any)[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val > 0;
  return false;
}

/**
 * Get monthly limit for a counted feature (returns Infinity for boolean features that are true)
 */
export function getMonthlyLimit(plan: PlanType, feature: CountedMonthlyFeature | FeatureKey | string): number {
  const limits = PLAN_LIMITS[plan];
  if (!limits) return 0;
  const val = (limits as any)[feature];
  if (typeof val === "number") return val;
  if (typeof val === "boolean") return val ? Infinity : 0;
  return 0;
}
