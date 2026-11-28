/**
 * PAPERINO ADS — Type Definitions & Contracts
 * Single source of truth for direct advertising campaigns, placements,
 * audience targeting, revenue, and public manifest payloads.
 */

export type AdPlacementId =
  | "home_top"
  | "home_featured"
  | "study_materials"
  | "desktop_sidebar"
  | "pulse_feed";

export type AdMediaType = "image" | "video";

export type AdCampaignStatus = "draft" | "published" | "disabled" | "archived";

export type AdPaymentStatus = "pending" | "partially_paid" | "paid" | "refunded";

export type AdUserTierTarget = "all" | "free_only" | "paid_only";

export interface AdPlacementInfo {
  id: AdPlacementId;
  name: string;
  page: string;
  locationDescription: string;
  recommendedRatio: string;
  dimensionsDescription: string;
  supportedMedia: ("image" | "video")[];
}

export const AD_PLACEMENTS: Record<AdPlacementId, AdPlacementInfo> = {
  home_top: {
    id: "home_top",
    name: "AD 01 — Homepage Top Banner",
    page: "Homepage (/)",
    locationDescription: "Directly below Navbar and above Hero title section.",
    recommendedRatio: "8:1",
    dimensionsDescription: "Desktop: 1200x150, Mobile: 600x120",
    supportedMedia: ["image"],
  },
  home_featured: {
    id: "home_featured",
    name: "AD 02 — Homepage Featured Showcase",
    page: "Homepage (/)",
    locationDescription: "Directly below Semester Statistics cards, above Colleges Directory.",
    recommendedRatio: "3:1 or 4:1",
    dimensionsDescription: "Desktop: 1200x350, Mobile: 600x200",
    supportedMedia: ["image", "video"],
  },
  study_materials: {
    id: "study_materials",
    name: "AD 03 — Study Materials Square Showcase",
    page: "All Subjects & Materials (/courses)",
    locationDescription: "Flanking square advertisements on the left and right sides of the All Subjects & Materials heading section.",
    recommendedRatio: "1:1 (Square)",
    dimensionsDescription: "Square (e.g. 300x300, 500x500)",
    supportedMedia: ["image"],
  },
  desktop_sidebar: {
    id: "desktop_sidebar",
    name: "AD 04 — Desktop Sidebar Rail",
    page: "Desktop pages with >=1280px viewports",
    locationDescription: "Fixed right-hand sidebar rail on supported desktop screens. Hidden on mobile.",
    recommendedRatio: "1:2 (Skyscraper)",
    dimensionsDescription: "Desktop: 300x600 (Strictly hidden below 1280px)",
    supportedMedia: ["image"],
  },
  pulse_feed: {
    id: "pulse_feed",
    name: "AD 05 — Paperino Pulse Sponsored Card",
    page: "Paperino Pulse (/pulse)",
    locationDescription: "Injected as a clearly marked sponsored opportunity in the feed.",
    recommendedRatio: "Feed Card (approx 3:1)",
    dimensionsDescription: "Desktop: 800x240, Mobile: 500x200",
    supportedMedia: ["image", "video"],
  },
};

/** Full Campaign Record (Admin & Database) */
export interface AdCampaign {
  id: string;
  title: string;
  brandName: string;
  contactEmail: string;
  contactPhone?: string;
  placementId: AdPlacementId;
  mediaType: AdMediaType;
  desktopCreativeUrl: string;
  mobileCreativeUrl?: string;
  videoPosterUrl?: string;
  destinationUrl: string;
  accessibleDescription: string;
  startAt: string; // ISO 8601 UTC
  expiresAt: string; // ISO 8601 UTC
  priority: number; // 1-100 (higher = prioritized on placement overlap)
  targetAudience: {
    userTier: AdUserTierTarget;
    allowedPlans?: string[]; // e.g. ["free"] or ["free", "plus"]
    colleges?: string[];
  };
  revenue: {
    amountInr: number;
    amountReceivedInr: number;
    outstandingInr: number;
    paymentStatus: AdPaymentStatus;
    paymentReference?: string;
    paymentDate?: string;
    internalNotes?: string;
  };
  status: AdCampaignStatus;
  archivedAt?: string;
  impressions?: number;
  clicks?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** Public Manifest Active Item (Safe: No private revenue, notes, or contact info) */
export interface PublicActiveAd {
  id: string;
  brandName: string;
  placementId: AdPlacementId;
  mediaType: AdMediaType;
  desktopCreativeUrl: string;
  mobileCreativeUrl?: string;
  videoPosterUrl?: string;
  destinationUrl: string;
  accessibleDescription: string;
  startAt: string; // ISO 8601 UTC
  expiresAt: string; // ISO 8601 UTC
  priority: number;
  targetAudience: {
    userTier: AdUserTierTarget;
    allowedPlans?: string[];
    colleges?: string[];
  };
}

/** Global Settings Document (system_settings/ads_config) */
export interface AdsGlobalConfig {
  enabled: boolean; // Master emergency kill switch (default: false)
  analyticsEnabled: boolean; // Emergency analytics kill switch (default: true)
  revalidationVersion: number;
  allowedPlacements: AdPlacementId[];
  maxVideoDurationSec: number; // 30
  maxVideoSizeMb: number; // 3
  updatedAt: string;
  updatedBy: string;
}

/** Consolidated Public Manifest Payload (system_settings/active_ads_manifest) */
export interface PublicAdsManifest {
  enabled: boolean;
  analyticsEnabled?: boolean;
  version: number;
  generatedAt: string; // ISO 8601 UTC
  campaigns: PublicActiveAd[];
}

/** Analytics Event Payload for /api/campaigns/analytics */
export interface AdAnalyticsEvent {
  campaignId: string;
  placementId: AdPlacementId;
  event: "impression" | "click";
  timestamp: number;
  eventToken?: string;
  sessionToken?: string;
}

/** Bounded Batch Analytics Payload */
export interface AnalyticsBatchPayload {
  events: AdAnalyticsEvent[];
  clientSessionId?: string;
  sentAt: number;
}

/** Aggregated Analytics Summary Document */
export interface AdCampaignAnalyticsSummary {
  campaignId: string;
  placementId: AdPlacementId;
  impressions: number;
  clicks: number;
  ctr: number; // calculated as (clicks / impressions)
  lastEventAt?: string;
}

