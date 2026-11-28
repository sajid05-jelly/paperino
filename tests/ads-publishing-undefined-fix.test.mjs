import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDestinationUrl,
  validateMediaUrl,
  sanitizePublicManifest,
} from "../src/lib/adSecurity.ts";
import { AD_PLACEMENTS } from "../src/lib/adTypes.ts";

/** Helper to recursively assert that an object contains NO `undefined` values */
function assertNoUndefinedValues(obj, path = "") {
  if (obj === null || obj === undefined) {
    assert.notEqual(obj, undefined, `Found "undefined" at ${path}`);
    return;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      assert.notEqual(
        value,
        undefined,
        `Found "undefined" at field "${currentPath}" (Firestore rejects undefined)`
      );
      if (typeof value === "object" && value !== null) {
        assertNoUndefinedValues(value, currentPath);
      }
    }
  }
}

test("Paperino Ads — Campaign Publishing & Firestore Undefined-Value Prevention", async (t) => {
  await t.test("1. Publish with Desktop Image Only (Omitted Mobile Creative)", () => {
    const rawForm = {
      title: "SRM Semester Notes Banner",
      brandName: "Notes Hub",
      contactEmail: "",
      contactPhone: "",
      placementId: "home_top",
      mediaType: "image",
      desktopCreativeUrl: "https://res.cloudinary.com/paperino/image/upload/v12345/desktop.webp",
      mobileCreativeUrl: undefined,
      videoPosterUrl: undefined,
      destinationUrl: "https://noteshub.in/join",
      accessibleDescription: "Study materials banner",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      priority: 50,
      targetAudience: { userTier: "all" },
      revenue: {
        amountInr: 0,
        amountReceivedInr: 0,
        paymentStatus: "pending",
        paymentReference: "",
        internalNotes: "",
      },
      status: "published",
    };

    // Simulate backend payload construction in POST /api/admin/ads
    const campaignData = {
      title: rawForm.title.trim(),
      brandName: rawForm.brandName.trim(),
      contactEmail: rawForm.contactEmail?.trim() || "",
      contactPhone: rawForm.contactPhone?.trim() || "",
      placementId: rawForm.placementId,
      mediaType: rawForm.mediaType === "video" ? "video" : "image",
      desktopCreativeUrl: rawForm.desktopCreativeUrl.trim(),
      destinationUrl: rawForm.destinationUrl.trim(),
      accessibleDescription: rawForm.accessibleDescription?.trim() || `Advertisement from ${rawForm.brandName}`,
      startAt: new Date(rawForm.startAt).toISOString(),
      expiresAt: new Date(rawForm.expiresAt).toISOString(),
      priority: Number(rawForm.priority) || 50,
      targetAudience: { userTier: "all" },
      revenue: {
        amountInr: 0,
        amountReceivedInr: 0,
        outstandingInr: 0,
        paymentStatus: "pending",
        paymentReference: "",
        internalNotes: "",
      },
      status: rawForm.status || "draft",
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "admin@paperino.site",
    };

    if (rawForm.mobileCreativeUrl && typeof rawForm.mobileCreativeUrl === "string" && rawForm.mobileCreativeUrl.trim()) {
      campaignData.mobileCreativeUrl = rawForm.mobileCreativeUrl.trim();
    }
    if (rawForm.videoPosterUrl && typeof rawForm.videoPosterUrl === "string" && rawForm.videoPosterUrl.trim()) {
      campaignData.videoPosterUrl = rawForm.videoPosterUrl.trim();
    }

    // Verify ZERO undefined fields in payload
    assertNoUndefinedValues(campaignData);
    assert.equal("mobileCreativeUrl" in campaignData, false, "mobileCreativeUrl key must not exist on document");
    assert.equal("videoPosterUrl" in campaignData, false, "videoPosterUrl key must not exist on document");

    // Verify sanitization in active manifest
    const manifest = sanitizePublicManifest([{ ...campaignData, id: "test-c1" }], true, 1);
    assert.equal(manifest.campaigns.length, 1);
    const pubAd = manifest.campaigns[0];
    assertNoUndefinedValues(pubAd);
    assert.equal("mobileCreativeUrl" in pubAd, false);
    assert.equal("videoPosterUrl" in pubAd, false);
    assert.equal(pubAd.desktopCreativeUrl, rawForm.desktopCreativeUrl);
  });

  await t.test("2. Publish with Both Desktop and Mobile Images", () => {
    const rawForm = {
      title: "Paperino Pro Offer",
      brandName: "Paperino Pro",
      placementId: "home_featured",
      mediaType: "image",
      desktopCreativeUrl: "https://res.cloudinary.com/paperino/image/upload/v12345/hero-desktop.webp",
      mobileCreativeUrl: "https://res.cloudinary.com/paperino/image/upload/v12345/hero-mobile.webp",
      destinationUrl: "https://www.paperino.site/plans",
      accessibleDescription: "Upgrade to Paperino Pro",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      priority: 90,
      targetAudience: { userTier: "free_only" },
      status: "published",
    };

    const campaignData = {
      title: rawForm.title,
      brandName: rawForm.brandName,
      contactEmail: "",
      contactPhone: "",
      placementId: rawForm.placementId,
      mediaType: "image",
      desktopCreativeUrl: rawForm.desktopCreativeUrl,
      destinationUrl: rawForm.destinationUrl,
      accessibleDescription: rawForm.accessibleDescription,
      startAt: new Date(rawForm.startAt).toISOString(),
      expiresAt: new Date(rawForm.expiresAt).toISOString(),
      priority: rawForm.priority,
      targetAudience: rawForm.targetAudience,
      revenue: {
        amountInr: 5000,
        amountReceivedInr: 5000,
        outstandingInr: 0,
        paymentStatus: "paid",
        paymentReference: "UPI-TXN-12345",
        internalNotes: "Official in-house promo",
      },
      status: "published",
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "admin@paperino.site",
    };

    if (rawForm.mobileCreativeUrl) {
      campaignData.mobileCreativeUrl = rawForm.mobileCreativeUrl.trim();
    }

    assertNoUndefinedValues(campaignData);
    assert.equal(campaignData.mobileCreativeUrl, rawForm.mobileCreativeUrl);

    // Verify public manifest includes mobile URL
    const manifest = sanitizePublicManifest([{ ...campaignData, id: "test-c2" }], true, 1);
    const pubAd = manifest.campaigns[0];
    assertNoUndefinedValues(pubAd);
    assert.equal(pubAd.mobileCreativeUrl, rawForm.mobileCreativeUrl);
    assert.equal(pubAd.desktopCreativeUrl, rawForm.desktopCreativeUrl);
  });

  await t.test("3. Publish with Optional Fields Left Empty", () => {
    const rawForm = {
      title: "Minimal Ad",
      brandName: "Acme",
      placementId: "study_materials",
      mediaType: "image",
      desktopCreativeUrl: "https://res.cloudinary.com/paperino/image/upload/v12345/study.webp",
      mobileCreativeUrl: "",
      videoPosterUrl: "",
      destinationUrl: "https://acme.org",
      accessibleDescription: "",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      contactEmail: undefined,
      contactPhone: undefined,
      revenue: undefined,
      targetAudience: undefined,
      status: "published",
    };

    const cleanRevenue = {
      amountInr: 0,
      amountReceivedInr: 0,
      outstandingInr: 0,
      paymentStatus: "pending",
      paymentReference: "",
      internalNotes: "",
    };

    const campaignData = {
      title: rawForm.title.trim(),
      brandName: rawForm.brandName.trim(),
      contactEmail: rawForm.contactEmail?.trim() || "",
      contactPhone: rawForm.contactPhone?.trim() || "",
      placementId: rawForm.placementId,
      mediaType: "image",
      desktopCreativeUrl: rawForm.desktopCreativeUrl.trim(),
      destinationUrl: rawForm.destinationUrl.trim(),
      accessibleDescription: rawForm.accessibleDescription?.trim() || `Advertisement from ${rawForm.brandName}`,
      startAt: new Date(rawForm.startAt).toISOString(),
      expiresAt: new Date(rawForm.expiresAt).toISOString(),
      priority: 50,
      targetAudience: { userTier: "all" },
      revenue: cleanRevenue,
      status: "published",
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "admin@paperino.site",
    };

    if (rawForm.mobileCreativeUrl && rawForm.mobileCreativeUrl.trim()) {
      campaignData.mobileCreativeUrl = rawForm.mobileCreativeUrl.trim();
    }
    if (rawForm.videoPosterUrl && rawForm.videoPosterUrl.trim()) {
      campaignData.videoPosterUrl = rawForm.videoPosterUrl.trim();
    }

    assertNoUndefinedValues(campaignData);
    assert.equal("mobileCreativeUrl" in campaignData, false);
    assert.equal("videoPosterUrl" in campaignData, false);
    assert.equal(campaignData.contactEmail, "");
    assert.equal(campaignData.contactPhone, "");
  });

  await t.test("4. Publish Supported Video Advertisement", () => {
    const rawForm = {
      title: "SRM Tech Fest Video Teaser",
      brandName: "Milan Fest",
      placementId: "home_featured",
      mediaType: "video",
      desktopCreativeUrl: "https://res.cloudinary.com/paperino/video/upload/v12345/teaser.mp4",
      mobileCreativeUrl: "",
      videoPosterUrl: "https://res.cloudinary.com/paperino/image/upload/v12345/poster.jpg",
      destinationUrl: "https://milanfest.in",
      accessibleDescription: "Milan 2026 Video Teaser",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      priority: 85,
      status: "published",
    };

    const campaignData = {
      title: rawForm.title,
      brandName: rawForm.brandName,
      contactEmail: "",
      contactPhone: "",
      placementId: rawForm.placementId,
      mediaType: "video",
      desktopCreativeUrl: rawForm.desktopCreativeUrl,
      videoPosterUrl: rawForm.videoPosterUrl,
      destinationUrl: rawForm.destinationUrl,
      accessibleDescription: rawForm.accessibleDescription,
      startAt: new Date(rawForm.startAt).toISOString(),
      expiresAt: new Date(rawForm.expiresAt).toISOString(),
      priority: 85,
      targetAudience: { userTier: "all" },
      revenue: {
        amountInr: 20000,
        amountReceivedInr: 10000,
        outstandingInr: 10000,
        paymentStatus: "partially_paid",
        paymentReference: "INV-9901",
        internalNotes: "Balance payable post fest",
      },
      status: "published",
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "admin@paperino.site",
    };

    assertNoUndefinedValues(campaignData);
    assert.equal(campaignData.videoPosterUrl, rawForm.videoPosterUrl);
    assert.equal(campaignData.mediaType, "video");

    const manifest = sanitizePublicManifest([{ ...campaignData, id: "test-v1" }], true, 1);
    const pubAd = manifest.campaigns[0];
    assertNoUndefinedValues(pubAd);
    assert.equal(pubAd.mediaType, "video");
    assert.equal(pubAd.videoPosterUrl, rawForm.videoPosterUrl);
    assert.equal("mobileCreativeUrl" in pubAd, false);
  });

  await t.test("5. Edit Existing Campaign & Remove Optional Mobile Creative", () => {
    // Existing campaign in database with both desktop & mobile
    const existingDoc = {
      id: "camp-existing",
      title: "Original Title",
      brandName: "Acme",
      placementId: "desktop_sidebar",
      mediaType: "image",
      desktopCreativeUrl: "https://res.cloudinary.com/paperino/image/upload/v12345/d.webp",
      mobileCreativeUrl: "https://res.cloudinary.com/paperino/image/upload/v12345/m.webp",
      destinationUrl: "https://acme.org",
      startAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      priority: 50,
      status: "published",
    };

    // User edits: updates title, removes mobile creative
    const editPayload = {
      campaignId: existingDoc.id,
      title: "Updated Title for Placement",
      removeMobileCreative: true,
      mobileCreativeUrl: "",
    };

    // Mock FieldValue.delete() sentinel
    const DELETE_SENTINEL = Symbol("FieldValue.delete");

    const cleanUpdates = {
      updatedAt: new Date().toISOString(),
    };

    if (editPayload.title) {
      cleanUpdates.title = editPayload.title.trim();
    }

    if (editPayload.removeMobileCreative === true || editPayload.mobileCreativeUrl === "") {
      cleanUpdates.mobileCreativeUrl = DELETE_SENTINEL;
    }

    assert.equal(cleanUpdates.title, "Updated Title for Placement");
    assert.equal(cleanUpdates.mobileCreativeUrl, DELETE_SENTINEL);

    // After Firestore deletion, document in DB no longer has mobileCreativeUrl
    const updatedDocInDb = {
      ...existingDoc,
      title: cleanUpdates.title,
    };
    delete updatedDocInDb.mobileCreativeUrl;

    assert.equal("mobileCreativeUrl" in updatedDocInDb, false);
    assertNoUndefinedValues(updatedDocInDb);

    // Manifest generation after update
    const manifest = sanitizePublicManifest([updatedDocInDb], true, 2);
    assert.equal(manifest.campaigns[0].title, undefined); // title is admin only
    assert.equal("mobileCreativeUrl" in manifest.campaigns[0], false);
    assert.equal(manifest.campaigns[0].desktopCreativeUrl, existingDoc.desktopCreativeUrl);
  });

  await t.test("6. Verify All Five Advertisement Placements Are Valid & Supported", () => {
    const requiredPlacements = [
      "home_top",
      "home_featured",
      "study_materials",
      "desktop_sidebar",
      "pulse_feed",
    ];

    for (const pid of requiredPlacements) {
      assert.ok(AD_PLACEMENTS[pid], `Placement ${pid} must exist in AD_PLACEMENTS`);
      assert.ok(AD_PLACEMENTS[pid].name, `Placement ${pid} must have a name`);
      assert.ok(AD_PLACEMENTS[pid].supportedMedia.length > 0, `Placement ${pid} must support media`);
    }

    assert.equal(Object.keys(AD_PLACEMENTS).length, 5);
  });
});
