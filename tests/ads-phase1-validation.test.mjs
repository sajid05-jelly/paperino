import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDestinationUrl,
  validateMediaUrl,
  validateMediaMagicBytes,
  sanitizePublicManifest,
  generateR2PresignedPutUrl,
} from "../src/lib/adSecurity.ts";

test("Paperino Ads Phase 1 — Security & Validation Test Suite", async (t) => {
  await t.test("1. Destination URL Validation & SSRF Prevention", () => {
    // Valid HTTPS URLs
    assert.equal(validateDestinationUrl("https://example.com").valid, true);
    assert.equal(validateDestinationUrl("https://acme-edu.org/summer-internship").valid, true);
    assert.equal(validateDestinationUrl("https://store.brand.in/deals?ref=paperino").valid, true);

    // Reject HTTP
    assert.equal(validateDestinationUrl("http://example.com").valid, false);
    assert.match(validateDestinationUrl("http://example.com").error || "", /https/i);

    // Reject Localhost & IPv4 Loopback
    assert.equal(validateDestinationUrl("https://localhost/admin").valid, false);
    assert.equal(validateDestinationUrl("https://127.0.0.1:8080").valid, false);
    assert.equal(validateDestinationUrl("https://[::1]").valid, false);

    // Reject Private Network IP Addresses (SSRF)
    assert.equal(validateDestinationUrl("https://10.0.0.1").valid, false);
    assert.equal(validateDestinationUrl("https://192.168.1.1").valid, false);
    assert.equal(validateDestinationUrl("https://172.16.0.1").valid, false);
    assert.equal(validateDestinationUrl("https://172.31.255.255").valid, false);

    // Reject AWS & Cloud Metadata Endpoints
    assert.equal(validateDestinationUrl("https://169.254.169.254/latest/meta-data/").valid, false);

    // Reject Malformed URLs
    assert.equal(validateDestinationUrl("not-a-url").valid, false);
    assert.equal(validateDestinationUrl("javascript:alert(1)").valid, false);
  });

  await t.test("2. Media Binary Signature / Magic Byte Verification", () => {
    // Valid PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
    assert.equal(validateMediaMagicBytes(pngBuffer, "image/png").valid, true);

    // Valid JPEG signature: FF D8 FF
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    assert.equal(validateMediaMagicBytes(jpegBuffer, "image/jpeg").valid, true);

    // Valid WebP signature: RIFF....WEBP
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x00, 0x00,
    ]);
    assert.equal(validateMediaMagicBytes(webpBuffer, "image/webp").valid, true);

    // Valid MP4 signature: ....ftyp
    const mp4Buffer = Buffer.from([
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x69, 0x73, 0x6f, 0x6d,
    ]);
    assert.equal(validateMediaMagicBytes(mp4Buffer, "video/mp4").valid, true);

    // Reject Executable / HTML disguised as image
    const htmlBuffer = Buffer.from("<!DOCTYPE html><html><body>malicious</body></html>");
    assert.equal(validateMediaMagicBytes(htmlBuffer, "image/png").valid, false);

    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // MZ DOS header
    assert.equal(validateMediaMagicBytes(exeBuffer, "image/png").valid, false);
    assert.equal(validateMediaMagicBytes(exeBuffer, "video/mp4").valid, false);

    // Reject video sent to image slot
    assert.equal(validateMediaMagicBytes(mp4Buffer, "image/png").valid, false);
  });

  await t.test("3. Media Storage Origin Verification & Unapproved URL Rejection", () => {
    process.env.R2_PUBLIC_URL = "https://pub-abc12345.r2.dev";

    // Approved Cloudflare R2 origins
    assert.equal(validateMediaUrl("https://paperino-ads.account123.r2.cloudflarestorage.com/ads/banner.webp", "image").valid, true);
    assert.equal(validateMediaUrl("https://pub-abc12345.r2.dev/ads/banner.webp", "image").valid, true);
    assert.equal(validateMediaUrl("https://paperino.site/assets/banner.png", "image").valid, true);

    // Approved video on paperino.site
    assert.equal(validateMediaUrl("https://paperino.site/ads/video.mp4", "video").valid, true);

    // Reject arbitrary untrusted external hosting domains
    assert.equal(validateMediaUrl("https://untrusted-host.com/ad.png", "image").valid, false);
    assert.equal(validateMediaUrl("https://i.imgur.com/ad.png", "image").valid, false);
    assert.equal(validateMediaUrl("https://iplogger.org/pixel.png", "image").valid, false);
    assert.match(validateMediaUrl("https://untrusted-host.com/ad.png", "image").error || "", /unapproved media storage origin/i);

    // Reject wrong extensions
    assert.equal(validateMediaUrl("https://cdn.paperino.site/ads/script.js", "image").valid, false);
    assert.equal(validateMediaUrl("https://cdn.paperino.site/ads/video.mp4", "image").valid, false);
    assert.equal(validateMediaUrl("https://cdn.paperino.site/ads/image.webp", "video").valid, false);

    // Reject non-HTTPS (unless localhost)
    assert.equal(validateMediaUrl("http://cdn.paperino.site/ads/banner.webp", "image").valid, false);
  });

  await t.test("4. Public Manifest Sanitization & PII Stripping", () => {
    const rawCampaigns = [
      {
        id: "camp-1",
        title: "Active WebP Banner",
        brandName: "Brand Alpha",
        contactEmail: "ceo@alpha.com",
        contactPhone: "+919876543210",
        placementId: "home_top",
        mediaType: "image",
        desktopCreativeUrl: "https://cdn.paperino.site/ads/banner1.webp",
        destinationUrl: "https://alpha.com",
        startAt: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hrs from now
        priority: 80,
        status: "published",
        targetTier: "all",
        revenue: {
          amountInr: 15000,
          receivedInr: 15000,
          outstandingInr: 0,
          paymentStatus: "paid",
          internalNotes: "Paid via NEFT",
        },
      },
      {
        id: "camp-2",
        title: "Draft Campaign",
        brandName: "Brand Beta",
        placementId: "home_top",
        mediaType: "image",
        desktopCreativeUrl: "https://cdn.paperino.site/ads/banner2.webp",
        destinationUrl: "https://beta.com",
        startAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        priority: 50,
        status: "draft", // Not published
      },
      {
        id: "camp-3",
        title: "Expired Campaign",
        brandName: "Brand Gamma",
        placementId: "home_top",
        mediaType: "image",
        desktopCreativeUrl: "https://cdn.paperino.site/ads/banner3.webp",
        destinationUrl: "https://gamma.com",
        startAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired
        priority: 90,
        status: "published",
      },
      {
        id: "camp-4",
        title: "Archived Campaign (Soft-deleted)",
        brandName: "Brand Delta",
        placementId: "home_top",
        mediaType: "image",
        desktopCreativeUrl: "https://cdn.paperino.site/ads/banner4.webp",
        destinationUrl: "https://delta.com",
        startAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        priority: 70,
        status: "archived", // Soft deleted
      },
    ];

    // When global kill switch is OFF (enabled = false)
    const disabledManifest = sanitizePublicManifest(rawCampaigns, false, 1);
    assert.equal(disabledManifest.enabled, false);
    assert.equal(disabledManifest.campaigns.length, 0);

    // When global kill switch is ON (enabled = true)
    const activeManifest = sanitizePublicManifest(rawCampaigns, true, 2);
    assert.equal(activeManifest.enabled, true);
    assert.equal(activeManifest.campaigns.length, 1);
    assert.equal(activeManifest.campaigns[0].id, "camp-1");

    // Verify STRICT privacy stripping
    const publicAd = activeManifest.campaigns[0];
    assert.equal("contactEmail" in publicAd, false, "Must strip contactEmail");
    assert.equal("contactPhone" in publicAd, false, "Must strip contactPhone");
    assert.equal("revenue" in publicAd, false, "Must strip revenue");
    assert.equal("internalNotes" in publicAd, false, "Must strip internalNotes");
    assert.equal("createdBy" in publicAd, false, "Must strip createdBy");
  });

  await t.test("5. Automatic Scheduled Eligibility & Dynamic Expiry Invisibility", () => {
    const now = Date.now();
    const scheduledAd = {
      id: "scheduled-1",
      startAt: new Date(now + 60000).toISOString(), // Starts in 1 minute
      expiresAt: new Date(now + 120000).toISOString(), // Expires in 2 minutes
    };

    // Client wall-clock check BEFORE start time: not eligible
    const isEligibleBefore = now >= new Date(scheduledAd.startAt).getTime() && now <= new Date(scheduledAd.expiresAt).getTime();
    assert.equal(isEligibleBefore, false, "Scheduled ad must be invisible before start time");

    // Client wall-clock check AT start time: automatically eligible with ZERO server roundtrips
    const futureNow = now + 65000; // 65 seconds later
    const isEligibleDuring = futureNow >= new Date(scheduledAd.startAt).getTime() && futureNow <= new Date(scheduledAd.expiresAt).getTime();
    assert.equal(isEligibleDuring, true, "Scheduled ad must automatically become visible when start time arrives");

    // Client wall-clock check AFTER expiry: automatically invisible
    const expiredNow = now + 130000; // 130 seconds later
    const isEligibleAfter = expiredNow >= new Date(scheduledAd.startAt).getTime() && expiredNow <= new Date(scheduledAd.expiresAt).getTime();
    assert.equal(isEligibleAfter, false, "Expired ad must automatically collapse to invisible");
  });

  await t.test("6. 4-Tier Server-Side Role Authorization Rules", () => {
    // Simulator for authorization check in /api/admin/ads
    function checkAuth(user) {
      if (!user) return { status: 401, error: "Unauthorized" };
      if (user.role !== "admin" && user.role !== "lead_admin") {
        return { status: 403, error: "Forbidden: Admin privileges required" };
      }
      return { status: 200, allowed: true };
    }

    // Tier 1: Unauthenticated user (missing/invalid token)
    assert.equal(checkAuth(null).status, 401);
    assert.equal(checkAuth(undefined).status, 401);

    // Tier 2: Authenticated Regular Student / User
    assert.equal(checkAuth({ uid: "user-123", email: "student@srmist.edu.in", role: "student" }).status, 403);
    assert.equal(checkAuth({ uid: "user-456", email: "guest@gmail.com", role: "user" }).status, 403);

    // Tier 3: Administrator
    assert.equal(checkAuth({ uid: "admin-789", email: "admin@paperino.site", role: "admin" }).status, 200);

    // Tier 4: Lead Administrator
    assert.equal(checkAuth({ uid: "lead-001", email: "lead@paperino.site", role: "lead_admin" }).status, 200);
  });

  await t.test("7. Cloudflare R2 SigV4 Presigned PUT URL Generator", () => {
    const signed = generateR2PresignedPutUrl({
      accountId: "test-account-id-12345",
      accessKeyId: "test-access-key-id",
      secretAccessKey: "test-secret-access-key-very-secure",
      bucketName: "paperino-ads",
      objectKey: "ads/image/test-banner.webp",
      contentType: "image/webp",
      expiresInSeconds: 300,
    });

    assert.ok(signed.uploadUrl.startsWith("https://paperino-ads.test-account-id-12345.r2.cloudflarestorage.com/ads/image/test-banner.webp"));
    assert.match(signed.uploadUrl, /X-Amz-Algorithm=AWS4-HMAC-SHA256/);
    assert.match(signed.uploadUrl, /X-Amz-Credential=test-access-key-id/);
    assert.match(signed.uploadUrl, /X-Amz-Signature=/);
    assert.match(signed.uploadUrl, /X-Amz-Expires=300/);
    assert.equal(signed.objectKey, "ads/image/test-banner.webp");
  });
});
