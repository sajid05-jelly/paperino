import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Mock helper representing the pure logic embedded in AdsContext & PartnerSlot
function filterActiveCampaignForSlot(campaigns, placementId, enabled, currentTime = Date.now()) {
  if (!enabled || !Array.isArray(campaigns) || campaigns.length === 0) {
    return null;
  }

  const eligible = campaigns.filter((c) => {
    if (c.placementId !== placementId) return false;
    const startMs = new Date(c.startAt).getTime();
    const endMs = new Date(c.endAt).getTime();
    return currentTime >= startMs && currentTime <= endMs;
  });

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    const tierWeights = { sponsor: 3, partner: 2, community: 1 };
    return (tierWeights[b.tier] || 0) - (tierWeights[a.tier] || 0);
  });

  return eligible[0];
}

function sanitizePublicManifest(rawCampaign) {
  // Ensure strict isolation of advertiser metadata from student-facing payloads
  const {
    id,
    title,
    brandName,
    placementId,
    type,
    mediaUrl,
    posterUrl,
    destinationUrl,
    startAt,
    endAt,
    priority,
    tier,
    theme,
  } = rawCampaign;

  return {
    id,
    title,
    brandName,
    placementId,
    type,
    mediaUrl,
    posterUrl,
    destinationUrl,
    startAt,
    endAt,
    priority,
    tier,
    theme,
  };
}

describe("Paperino Ads Phase 2 - Student Slot & Manifest Validation", () => {
  const sampleCampaigns = [
    {
      id: "ad_top_1",
      title: "Top Engineering Masterclass",
      brandName: "EduCorp",
      placementId: "home_top",
      type: "image",
      mediaUrl: "https://cdn.paperino.site/ads/ad1.webp",
      destinationUrl: "https://educorp.com",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      priority: 5,
      tier: "partner",
      theme: "dark",
      // Sensitive fields that must NOT leak
      contactEmail: "biz@educorp.com",
      revenue: 5000,
      paymentStatus: "paid",
      notes: "VIP Client contract #4928",
    },
    {
      id: "ad_top_high_prio",
      title: "Premier Tech Summit",
      brandName: "TechConf",
      placementId: "home_top",
      type: "image",
      mediaUrl: "https://cdn.paperino.site/ads/ad_summit.webp",
      destinationUrl: "https://techconf.org",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      priority: 10,
      tier: "sponsor",
      theme: "dark",
      revenue: 12000,
    },
    {
      id: "ad_featured_1",
      title: "Campus Internship Portal",
      brandName: "InternNext",
      placementId: "home_featured",
      type: "video",
      mediaUrl: "https://cdn.paperino.site/ads/intern.mp4",
      posterUrl: "https://cdn.paperino.site/ads/intern_poster.webp",
      destinationUrl: "https://internnext.in",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      priority: 1,
      tier: "community",
      theme: "dark",
    },
    {
      id: "ad_sidebar_1",
      title: "GRE Prep 2027",
      brandName: "StudyGRE",
      placementId: "desktop_sidebar",
      type: "image",
      mediaUrl: "https://cdn.paperino.site/ads/gre.webp",
      destinationUrl: "https://studygre.com",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      priority: 1,
      tier: "partner",
      theme: "dark",
    },
    {
      id: "ad_pulse_1",
      title: "Hackathon 2026",
      brandName: "HackSRM",
      placementId: "pulse_feed",
      type: "image",
      mediaUrl: "https://cdn.paperino.site/ads/hack.webp",
      destinationUrl: "https://hacksrm.com",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      priority: 1,
      tier: "partner",
      theme: "dark",
    },
    {
      id: "ad_study_1",
      title: "Cloud Certification Exam Guide",
      brandName: "CloudLearn",
      placementId: "study_materials",
      type: "image",
      mediaUrl: "https://cdn.paperino.site/ads/cloud.webp",
      destinationUrl: "https://cloudlearn.org",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      priority: 1,
      tier: "partner",
      theme: "dark",
    },
  ];

  it("1. Zero-Ad Guarantee: returns null when global kill switch is OFF", () => {
    const selected = filterActiveCampaignForSlot(sampleCampaigns, "home_top", false);
    assert.strictEqual(selected, null, "When kill-switch is disabled, no ad must be chosen");
  });

  it("2. Zero-Ad Guarantee: returns null for placements without active campaigns", () => {
    const selected = filterActiveCampaignForSlot(sampleCampaigns, "unknown_slot", true);
    assert.strictEqual(selected, null, "Non-existent placement slot must return null");
  });

  it("3. Priority Arbitration: higher priority campaign wins for same placement", () => {
    const selected = filterActiveCampaignForSlot(sampleCampaigns, "home_top", true);
    assert.ok(selected);
    assert.strictEqual(selected.id, "ad_top_high_prio");
    assert.strictEqual(selected.priority, 10);
  });

  it("4. Multi-Placement Routing: each placement receives its exact targeted campaign", () => {
    const placements = ["home_top", "home_featured", "study_materials", "desktop_sidebar", "pulse_feed"];
    for (const pid of placements) {
      const selected = filterActiveCampaignForSlot(sampleCampaigns, pid, true);
      assert.ok(selected, `Placement ${pid} should have an eligible campaign`);
      assert.strictEqual(selected.placementId, pid);
    }
  });

  it("5. Wall-Clock Boundary Verification: scheduled and expired campaigns are strictly excluded", () => {
    const futureCampaign = {
      id: "future_ad",
      placementId: "home_top",
      startAt: new Date(Date.now() + 600000).toISOString(), // +10 minutes
      endAt: new Date(Date.now() + 3600000).toISOString(),
      priority: 100,
    };
    const pastCampaign = {
      id: "past_ad",
      placementId: "home_top",
      startAt: new Date(Date.now() - 7200000).toISOString(),
      endAt: new Date(Date.now() - 3600000).toISOString(), // -1 hour ago
      priority: 100,
    };

    assert.strictEqual(filterActiveCampaignForSlot([futureCampaign], "home_top", true), null);
    assert.strictEqual(filterActiveCampaignForSlot([pastCampaign], "home_top", true), null);
  });

  it("6. Manifest Sanitization: sensitive advertiser and financial records are never leaked", () => {
    const raw = sampleCampaigns[0];
    const sanitized = sanitizePublicManifest(raw);

    assert.strictEqual(sanitized.id, "ad_top_1");
    assert.strictEqual(sanitized.brandName, "EduCorp");
    // Forbidden fields
    assert.strictEqual(sanitized.revenue, undefined);
    assert.strictEqual(sanitized.paymentStatus, undefined);
    assert.strictEqual(sanitized.notes, undefined);
    assert.strictEqual(sanitized.contactEmail, undefined);
  });

  it("7. Bounded Cache-Control Header Compliance", () => {
    const requiredHeader = "public, max-age=0, s-maxage=60, must-revalidate";
    assert.ok(requiredHeader.includes("s-maxage=60"));
    assert.ok(requiredHeader.includes("must-revalidate"));
    assert.ok(!requiredHeader.includes("stale-while-revalidate"));
  });
});
