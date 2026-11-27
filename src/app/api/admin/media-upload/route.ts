import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin" && user.role !== "lead_admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mediaType = (formData.get("mediaType") as string) || "image";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    const isImage = contentType.startsWith("image/");
    const isVideo = contentType === "video/mp4";

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: "Unsupported media format. Allowed: WebP, PNG, JPEG, MP4." },
        { status: 400 }
      );
    }

    const maxSizeBytes = isVideo ? 3 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { success: false, error: `File exceeds maximum allowed size (${isVideo ? "3 MB for video" : "2 MB for images"})` },
        { status: 400 }
      );
    }

    // Cloudinary Credentials (with verified production fallback)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "ykdgsee2";
    const apiKey = process.env.CLOUDINARY_API_KEY || "837898625753888";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "Or3AduCdR-wnufrtb3jGKacOAqc";

    const timestamp = Math.floor(Date.now() / 1000);
    const randomHex = crypto.randomBytes(6).toString("hex");
    const cleanName = (file.name || "upload").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
    const publicId = `ad_${mediaType || (isImage ? "image" : "video")}_${Date.now()}_${randomHex}_${cleanName}`;
    const folder = "paperino_ads";
    const resourceType = isVideo ? "video" : "image";

    // Cloudinary signature parameters sorted alphabetically: folder, public_id, timestamp
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    const fileBytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileBytes);

    const uploadFormData = new FormData();
    uploadFormData.append("file", new Blob([fileBuffer], { type: contentType }), file.name);
    uploadFormData.append("api_key", apiKey);
    uploadFormData.append("timestamp", String(timestamp));
    uploadFormData.append("signature", signature);
    uploadFormData.append("folder", folder);
    uploadFormData.append("public_id", publicId);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: "POST",
        body: uploadFormData,
      }
    );

    const cloudJson = await cloudRes.json();
    if (!cloudRes.ok || !cloudJson.secure_url) {
      console.error("[Cloudinary Server Upload Error]:", cloudJson);
      throw new Error(cloudJson?.error?.message || `Upload failed with status ${cloudRes.status}`);
    }

    const uploadedUrl = cloudJson.secure_url;
    const autoPosterUrl = isVideo ? uploadedUrl.replace(/\.[^/.]+$/, ".jpg") : undefined;

    return NextResponse.json({
      success: true,
      url: uploadedUrl,
      publicId: cloudJson.public_id,
      posterUrl: autoPosterUrl,
      fileName: file.name,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Media upload failed";
    console.error("[Media Upload API Route Error]:", err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
