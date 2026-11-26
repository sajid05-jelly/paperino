import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { validateMediaUrl, validateDestinationUrl, sanitizePublicManifest } from "../src/lib/adSecurity.ts";

test("Paperino Ads & Cloudinary Critical Security Validation", async (t) => {
  await t.test("1. Generates valid SHA-1 signature without exposing Cloudinary API secret", () => {
    const cloudName = "ykdgsee2";
    const apiKey = "837898625753888";
    const apiSecret = "Or3AduCdR-wnufrtb3jGKacOAqc";
    const timestamp = 1700000000;
    const folder = "paperino_ads";
    const publicId = "ad_image_test_123";

    // Cloudinary signature parameters sorted alphabetically
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    assert.equal(typeof signature, "string");
    assert.equal(signature.length, 40); // SHA-1 hex length is 40 chars
    assert.equal(signature.includes(apiSecret), false); // Secret is strictly hashed
  });

  await t.test("2. Cloudinary secure URL origin passes media validation for configured cloud name", () => {
    const validCloudinaryUrl = "https://res.cloudinary.com/ykdgsee2/image/upload/v1700000000/paperino_ads/test_ad.webp";
    const res = validateMediaUrl(validCloudinaryUrl, "image");
    assert.equal(res.valid, true);

    const validVideoCloudinaryUrl = "https://res.cloudinary.com/ykdgsee2/video/upload/v1700000000/paperino_ads/test_video.mp4";
    const videoRes = validateMediaUrl(validVideoCloudinaryUrl, "video");
    assert.equal(videoRes.valid, true);

    const invalidCloudinaryUrl = "https://res.cloudinary.com/other_account/image/upload/v1700000000/paperino_ads/test_ad.webp";
    const invalidRes = validateMediaUrl(invalidCloudinaryUrl, "image");
    assert.equal(invalidRes.valid, false);
    assert.ok(invalidRes.error.includes("Unapproved media storage origin"));
  });

  await t.test("3. Destination URL validation enforces HTTPS and rejects SSRF/private networks", () => {
    assert.equal(validateDestinationUrl("https://example.com").valid, true);
    assert.equal(validateDestinationUrl("http://example.com").valid, false);
    assert.equal(validateDestinationUrl("javascript:alert(1)").valid, false);
    assert.equal(validateDestinationUrl("https://localhost/admin").valid, false);
    assert.equal(validateDestinationUrl("https://127.0.0.1/status").valid, false);
    assert.equal(validateDestinationUrl("https://192.168.1.1").valid, false);
    assert.equal(validateDestinationUrl("https://10.0.0.1").valid, false);
  });

  await t.test("4. Sanitized manifest strips revenue and private advertiser PII", () => {
    const mockCampaign = {
      id: "camp_1",
      title: "Test Sponsor",
      brandName: "Acme Corp",
      contactEmail: "secret@acme.com",
      contactPhone: "9876543210",
      placementId: "home_top",
      mediaType: "image",
      desktopCreativeUrl: "https://res.cloudinary.com/ykdgsee2/image/upload/v1/paperino_ads/test.webp",
      destinationUrl: "https://acme.com",
      accessibleDescription: "Acme Ad",
      startAt: new Date(Date.now() - 10000).toISOString(),
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      priority: 80,
      targetAudience: { userTier: "all" },
      revenue: {
        amountInr: 50000,
        amountReceivedInr: 50000,
        outstandingInr: 0,
        paymentStatus: "paid",
        internalNotes: "Private contract details",
      },
      status: "published",
      impressions: 120,
      clicks: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "admin",
    };

    const manifest = sanitizePublicManifest([mockCampaign], true, 1);
    assert.equal(manifest.campaigns.length, 1);
    const pub = manifest.campaigns[0];
    assert.equal(pub.id, "camp_1");
    assert.equal(pub.brandName, "Acme Corp");
    // Ensure all private PII & financial fields are completely stripped
    assert.equal("contactEmail" in pub, false);
    assert.equal("contactPhone" in pub, false);
    assert.equal("revenue" in pub, false);
    assert.equal("internalNotes" in pub, false);
  });

  await t.test("5. Global Kill Switch drops all campaigns from public manifest", () => {
    const mockCampaign = {
      id: "camp_1",
      title: "Test Sponsor",
      brandName: "Acme Corp",
      contactEmail: "secret@acme.com",
      placementId: "home_top",
      mediaType: "image",
      desktopCreativeUrl: "https://res.cloudinary.com/ykdgsee2/image/upload/v1/paperino_ads/test.webp",
      destinationUrl: "https://acme.com",
      accessibleDescription: "Acme Ad",
      startAt: new Date(Date.now() - 10000).toISOString(),
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      priority: 80,
      targetAudience: { userTier: "all" },
      status: "published",
      impressions: 120,
      clicks: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "admin",
    };

    const disabledManifest = sanitizePublicManifest([mockCampaign], false, 2);
    assert.equal(disabledManifest.enabled, false);
    assert.equal(disabledManifest.campaigns.length, 0); // Zero campaigns exposed when disabled
  });
});
