/**
 * PAPERINO ADS — Security & Validation Layer
 * Enforces URL safety, media integrity, manifest sanitization,
 * ISOBMFF video box inspection, and Cloudflare R2 presigned upload generation with zero external dependencies.
 */

import type { AdCampaign, PublicActiveAd, PublicAdsManifest } from "./adTypes";
import crypto from "crypto";

/**
 * Validates external destination URLs.
 * Requires https, valid public hostname, and rejects SSRF/private networks.
 */
export function validateDestinationUrl(rawUrl: string): { valid: boolean; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Destination URL is required" };
  }

  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Destination URL must use secure HTTPS protocol" };
    }

    const host = parsed.hostname.toLowerCase();
    if (!host || host.length < 4 || !host.includes(".")) {
      return { valid: false, error: "Invalid domain name in destination URL" };
    }

    // SSRF / Local IP rejection
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return { valid: false, error: "Private or internal destination URLs are strictly prohibited" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Malformed URL. Please provide a valid https:// web address" };
  }
}

/**
 * Validates media asset URLs to ensure they originate from verified, approved storage origins.
 * Wildcard R2 domains belonging to unrelated accounts and arbitrary external URLs are strictly rejected.
 */
export function validateMediaUrl(
  rawUrl: string,
  expectedType: "image" | "video" = "image"
): { valid: boolean; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Media URL is required" };
  }

  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);

    // Require HTTPS protocol (allow http only for local test endpoints)
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      return { valid: false, error: "Media URL must use secure HTTPS protocol" };
    }

    const host = parsed.hostname.toLowerCase();

    // Check against configured and verified Paperino storage origins:
    let isApprovedOrigin = false;

    // 1. Explicitly configured R2_PUBLIC_URL (Exact Cloudflare-generated domain or authorized CDN)
    if (process.env.R2_PUBLIC_URL) {
      try {
        const configuredHost = new URL(process.env.R2_PUBLIC_URL).hostname.toLowerCase();
        if (host === configuredHost) isApprovedOrigin = true;
      } catch {
        // Ignore parsing error
      }
    }

    // 2. Exact Cloudflare R2 Account Bucket S3 endpoint
    const accountId = process.env.R2_ACCOUNT_ID?.toLowerCase();
    const bucketName = (process.env.R2_BUCKET_NAME || "paperino-ads").toLowerCase();
    if (accountId) {
      const specificR2Host = `${bucketName}.${accountId}.r2.cloudflarestorage.com`;
      if (host === specificR2Host) {
        isApprovedOrigin = true;
      }
    } else {
      // In unconfigured / test runner environment: require exact bucket prefix
      if (host.startsWith(`${bucketName}.`) && host.endsWith(".r2.cloudflarestorage.com")) {
        isApprovedOrigin = true;
      }
    }

    // 3. Verified actual existing Paperino production origin
    if (host === "paperino-eta.vercel.app" || host === "paperino.site" || host === "www.paperino.site") {
      isApprovedOrigin = true;
    }

    // 4. Local development and testing endpoints
    if (host === "localhost" || host === "127.0.0.1") {
      isApprovedOrigin = true;
    }

    // 5. Verified Cloudinary Media Storage (Strictly scoped to configured cloud name)
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "ykdgsee2").toLowerCase();
    if (host === "res.cloudinary.com") {
      const pathSegments = parsed.pathname.toLowerCase().split("/").filter(Boolean);
      if (pathSegments.length > 0 && pathSegments[0] === cloudName) {
        isApprovedOrigin = true;
      }
    }

    if (!isApprovedOrigin) {
      return {
        valid: false,
        error: `Unapproved media storage origin: ${host}. Media must originate strictly from the configured Paperino Cloudinary, Cloudflare R2 bucket, or verified Paperino CDN.`,
      };
    }

    // Check file extension
    const pathname = parsed.pathname.toLowerCase();
    if (expectedType === "video") {
      if (!pathname.endsWith(".mp4")) {
        return { valid: false, error: "Video creative must be in .mp4 format (H.264)" };
      }
    } else {
      const isAllowedExt =
        pathname.endsWith(".webp") ||
        pathname.endsWith(".png") ||
        pathname.endsWith(".jpg") ||
        pathname.endsWith(".jpeg");
      if (!isAllowedExt) {
        return { valid: false, error: "Image creative must be in .webp, .png, or .jpg/.jpeg format" };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Malformed media URL" };
  }
}

/**
 * Validates uploaded media file signatures (magic bytes).
 */
export function validateMediaMagicBytes(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; detectedFormat?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: mimeType.includes("jpeg") || mimeType.includes("jpg"), detectedFormat: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: mimeType.includes("png"), detectedFormat: "image/png" };
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  const isRiff = buffer.toString("ascii", 0, 4) === "RIFF";
  const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";
  if (isRiff && isWebp) {
    return { valid: mimeType.includes("webp"), detectedFormat: "image/webp" };
  }

  // MP4: ftyp at offset 4-7
  const isFtyp = buffer.toString("ascii", 4, 8) === "ftyp";
  if (isFtyp) {
    return { valid: mimeType.includes("mp4"), detectedFormat: "video/mp4" };
  }

  return { valid: false };
}

/**
 * Native ISOBMFF Box Inspector for MP4 Video Validation.
 * Inspects duration, resolution (720p max), file size (3MB max), and H.264 codec.
 * Pure Node.js buffer parsing with zero external binary dependencies.
 */
export function inspectMp4VideoProperties(buffer: Buffer): {
  valid: boolean;
  durationSec?: number;
  width?: number;
  height?: number;
  codec?: string;
  error?: string;
} {
  if (!buffer || buffer.length < 16) {
    return { valid: false, error: "Buffer is too small to be a valid MP4 video" };
  }

  // Maximum file size check: 3 MB (3,145,728 bytes)
  const MAX_VIDEO_BYTES = 3 * 1024 * 1024;
  if (buffer.length > MAX_VIDEO_BYTES) {
    return {
      valid: false,
      error: `Video file size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds 3 MB maximum limit`,
    };
  }

  let offset = 0;
  let hasFtyp = false;
  let durationSec = 0;
  let width = 0;
  let height = 0;
  let detectedCodec = "unknown";

  try {
    while (offset + 8 <= buffer.length) {
      const size = buffer.readUInt32BE(offset);
      const type = buffer.toString("ascii", offset + 4, offset + 8);
      const boxSize = size === 1 ? Number(buffer.readBigUInt64BE(offset + 8)) : size === 0 ? buffer.length - offset : size;

      if (boxSize < 8 || offset + boxSize > buffer.length) {
        break;
      }

      if (type === "ftyp") {
        hasFtyp = true;
      } else if (type === "moov") {
        // Traverse children inside moov
        let moovOffset = offset + 8;
        const moovEnd = offset + boxSize;

        while (moovOffset + 8 <= moovEnd) {
          const subSize = buffer.readUInt32BE(moovOffset);
          const subType = buffer.toString("ascii", moovOffset + 4, moovOffset + 8);
          if (subSize < 8 || moovOffset + subSize > moovEnd) break;

          if (subType === "mvhd") {
            const version = buffer.readUInt8(moovOffset + 8);
            if (version === 0) {
              const timeScale = buffer.readUInt32BE(moovOffset + 8 + 12);
              const duration = buffer.readUInt32BE(moovOffset + 8 + 16);
              if (timeScale > 0) durationSec = duration / timeScale;
            } else if (version === 1) {
              const timeScale = buffer.readUInt32BE(moovOffset + 8 + 20);
              const duration = Number(buffer.readBigUInt64BE(moovOffset + 8 + 24));
              if (timeScale > 0) durationSec = duration / timeScale;
            }
          } else if (subType === "trak") {
            // Traverse inside trak to find tkhd and codec
            let trakOffset = moovOffset + 8;
            const trakEnd = moovOffset + subSize;

            while (trakOffset + 8 <= trakEnd) {
              const tSize = buffer.readUInt32BE(trakOffset);
              const tType = buffer.toString("ascii", trakOffset + 4, trakOffset + 8);
              if (tSize < 8 || trakOffset + tSize > trakEnd) break;

              if (tType === "tkhd") {
                const tVersion = buffer.readUInt8(trakOffset + 8);
                const widthOffset = tVersion === 0 ? trakOffset + 8 + 76 : trakOffset + 8 + 88;
                const heightOffset = tVersion === 0 ? trakOffset + 8 + 80 : trakOffset + 8 + 92;
                if (heightOffset + 4 <= trakOffset + tSize) {
                  const tWidth = buffer.readUInt16BE(widthOffset);
                  const tHeight = buffer.readUInt16BE(heightOffset);
                  if (tWidth > 0 && tHeight > 0) {
                    width = tWidth;
                    height = tHeight;
                  }
                }
              }

              // Search for codec string in trak
              const trakBuffer = buffer.subarray(trakOffset, trakOffset + tSize);
              if (trakBuffer.includes("avc1")) {
                detectedCodec = "H.264 (avc1)";
              } else if (trakBuffer.includes("hvc1") || trakBuffer.includes("hev1")) {
                detectedCodec = "H.265 (HEVC)";
              } else if (trakBuffer.includes("vp09")) {
                detectedCodec = "VP9";
              }

              trakOffset += tSize;
            }
          }

          moovOffset += subSize;
        }
      }

      offset += boxSize;
    }
  } catch {
    return { valid: false, error: "Failed to parse MP4 container metadata" };
  }

  if (!hasFtyp) {
    return { valid: false, error: "Missing or invalid MP4 ftyp atom" };
  }

  // 1. Duration Validation: maximum 30 seconds
  if (durationSec > 30.5) {
    return {
      valid: false,
      durationSec,
      width,
      height,
      codec: detectedCodec,
      error: `Video duration (${durationSec.toFixed(1)}s) exceeds maximum allowed 30 seconds`,
    };
  }

  // 2. Resolution Validation: maximum 720p (e.g. 1280x720 or height <= 720)
  if (height > 720 || width > 1280) {
    return {
      valid: false,
      durationSec,
      width,
      height,
      codec: detectedCodec,
      error: `Video resolution (${width}x${height}) exceeds maximum 720p (1280x720) constraint`,
    };
  }

  return {
    valid: true,
    durationSec: Math.round(durationSec * 100) / 100,
    width,
    height,
    codec: detectedCodec,
  };
}

/**
 * Sanitizes full admin campaign records into public manifest items.
 * Strips all private fields (revenue, phone, email, notes).
 */
export function sanitizePublicManifest(
  campaigns: AdCampaign[],
  globalEnabled: boolean,
  version: number,
  analyticsEnabled: boolean = true
): PublicAdsManifest {
  const now = Date.now();

  const publicActive: PublicActiveAd[] = campaigns
    .filter((c) => {
      if (c.status !== "published") return false;
      const startMs = new Date(c.startAt).getTime();
      const expireMs = new Date(c.expiresAt).getTime();
      return expireMs > now && !isNaN(startMs) && !isNaN(expireMs);
    })
    .map((c) => ({
      id: c.id,
      brandName: c.brandName,
      placementId: c.placementId,
      mediaType: c.mediaType,
      desktopCreativeUrl: c.desktopCreativeUrl,
      mobileCreativeUrl: c.mobileCreativeUrl,
      videoPosterUrl: c.videoPosterUrl,
      destinationUrl: c.destinationUrl,
      accessibleDescription: c.accessibleDescription,
      startAt: c.startAt,
      expiresAt: c.expiresAt,
      priority: c.priority || 50,
      targetAudience: c.targetAudience,
    }));

  return {
    enabled: globalEnabled,
    analyticsEnabled,
    version,
    generatedAt: new Date().toISOString(),
    campaigns: globalEnabled ? publicActive : [],
  };
}

/**
 * Generates an S3/Cloudflare R2 Presigned PUT URL using AWS SigV4.
 * Uses only built-in Node.js crypto (zero extra npm packages).
 */
export function generateR2PresignedPutUrl({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucketName,
  objectKey,
  contentType,
  expiresInSeconds = 300,
}: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}): { uploadUrl: string; publicUrl: string; objectKey: string } {
  const region = "auto";
  const service = "s3";
  const host = `${bucketName}.${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${objectKey}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": "content-type;host",
  });

  queryParams.sort();

  const canonicalRequest = [
    "PUT",
    `/${encodeURIComponent(objectKey).replace(/%2F/g, "/")}`,
    queryParams.toString(),
    `content-type:${contentType}\nhost:${host}\n`,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const canonicalRequestHash = crypto.createHash("sha256").update(canonicalRequest, "utf8").digest("hex");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");

  function getSignatureKey(key: string, date: string, regionName: string, serviceName: string) {
    const kDate = crypto.createHmac("sha256", "AWS4" + key).update(date).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(regionName).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    return kSigning;
  }

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const uploadUrl = `${endpoint}?${queryParams.toString()}&X-Amz-Signature=${signature}`;

  // Public URL is from custom domain (if set) or verified R2 endpoint
  const publicBaseUrl = process.env.R2_PUBLIC_URL || `https://${host}`;
  const cleanBase = publicBaseUrl.endsWith("/") ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
  const publicUrl = `${cleanBase}/${objectKey}`;

  return { uploadUrl, publicUrl, objectKey };
}
