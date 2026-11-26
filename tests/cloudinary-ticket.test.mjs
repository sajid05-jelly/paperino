import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { validateMediaUrl } from "../src/lib/adSecurity.ts";

test("Cloudinary Direct Signed Upload Ticket Generator", async (t) => {
  await t.test("Generates valid SHA-1 signature for Cloudinary upload", () => {
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

  await t.test("Cloudinary secure URL origin passes media validation", () => {
    const validCloudinaryUrl = "https://res.cloudinary.com/ykdgsee2/image/upload/v1700000000/paperino_ads/test_ad.webp";
    const res = validateMediaUrl(validCloudinaryUrl, "image");
    assert.equal(res.valid, true);

    const invalidCloudinaryUrl = "https://res.cloudinary.com/other_account/image/upload/v1700000000/paperino_ads/test_ad.webp";
    const invalidRes = validateMediaUrl(invalidCloudinaryUrl, "image");
    assert.equal(invalidRes.valid, false);
    assert.ok(invalidRes.error.includes("Unapproved media storage origin"));
  });
});
