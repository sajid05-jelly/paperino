import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { generateR2PresignedPutUrl } from "@/lib/adSecurity";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin" && user.role !== "lead_admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const { filename, contentType, fileSize, mediaType } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Filename and content-type are required" }, { status: 400 });
    }

    // Media type validation
    const isImage = contentType.startsWith("image/");
    const isVideo = contentType === "video/mp4";

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Unsupported media format. Only WebP, JPEG, PNG, and MP4 (H.264) are permitted." },
        { status: 400 }
      );
    }

    // File size constraints
    const maxSizeBytes = isVideo ? 3 * 1024 * 1024 : 2 * 1024 * 1024;
    if (fileSize && fileSize > maxSizeBytes) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size (${isVideo ? "3 MB for video" : "2 MB for images"})` },
        { status: 400 }
      );
    }

    // 1. Check Cloudinary credentials first (Instant Global Media CDN, zero billing friction)
    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
    const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const randomHex = crypto.randomBytes(6).toString("hex");
      const cleanName = filename.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
      const publicId = `ad_${mediaType || (isImage ? "image" : "video")}_${Date.now()}_${randomHex}_${cleanName}`;
      const folder = "paperino_ads";
      const resourceType = isVideo ? "video" : "image";

      // Cloudinary signature parameters sorted alphabetically: folder, public_id, timestamp
      const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${cloudinaryApiSecret}`;
      const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

      return NextResponse.json({
        success: true,
        configured: true,
        storageProvider: "cloudinary",
        uploadEndpoint: `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${resourceType}/upload`,
        cloudName: cloudinaryCloudName,
        apiKey: cloudinaryApiKey,
        timestamp,
        folder,
        publicId,
        signature,
      });
    }

    // 2. Check Cloudflare R2 credentials
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || "paperino-ads";

    if (accountId && accessKeyId && secretAccessKey) {
      // Generate immutable, cryptographically unique object key
      const randomHex = crypto.randomBytes(6).toString("hex");
      const cleanName = filename.toLowerCase().replace(/[^a-z0-9.-]/g, "_");
      const objectKey = `ads/${mediaType || (isImage ? "image" : "video")}/${Date.now()}_${randomHex}_${cleanName}`;

      const { uploadUrl, publicUrl } = generateR2PresignedPutUrl({
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        objectKey,
        contentType,
        expiresInSeconds: 300,
      });

      return NextResponse.json({
        success: true,
        configured: true,
        storageProvider: "r2",
        uploadUrl,
        publicUrl,
        objectKey,
      });
    }

    return NextResponse.json({
      configured: false,
      message: "Media storage credentials (Cloudinary or Cloudflare R2) not yet configured in environment variables.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate upload ticket";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
