import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";
import { AdCampaign, AdsGlobalConfig, AdPlacementId } from "@/lib/adTypes";
import { validateDestinationUrl, validateMediaUrl, sanitizePublicManifest } from "@/lib/adSecurity";

export const dynamic = "force-dynamic";

/** Helper: Regenerates the consolidated system_settings/active_ads_manifest document */
async function syncActiveManifest(globalEnabled: boolean, overrideAnalyticsEnabled?: boolean) {
  if (!adminDb) return;
  try {
    const snap = await adminDb.collection("campaigns").get();
    const allCampaigns: AdCampaign[] = snap.docs.map((d) => ({
      ...(d.data() as Omit<AdCampaign, "id">),
      id: d.id,
    }));

    const configRef = adminDb.collection("system_settings").doc("ads_config");
    const configSnap = await configRef.get();
    const currentVersion = (configSnap.data()?.revalidationVersion || 0) + 1;
    const analyticsEnabled =
      typeof overrideAnalyticsEnabled === "boolean"
        ? overrideAnalyticsEnabled
        : (configSnap.data()?.analyticsEnabled ?? true);

    const manifest = sanitizePublicManifest(allCampaigns, globalEnabled, currentVersion, analyticsEnabled);

    await adminDb.collection("system_settings").doc("active_ads_manifest").set(manifest);
    await configRef.set(
      {
        enabled: globalEnabled,
        analyticsEnabled,
        revalidationVersion: currentVersion,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Error synchronizing active ads manifest:", err);
  }
}

// GET: Fetch all campaigns, stats, and global config (Admin only)
export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin" && user.role !== "lead_admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    // 1. Fetch global config (defaults to enabled: false)
    const configRef = adminDb.collection("system_settings").doc("ads_config");
    const configSnap = await configRef.get();
    const configData = (configSnap.data() || {}) as Partial<AdsGlobalConfig>;
    const globalConfig: AdsGlobalConfig = configSnap.exists
      ? {
          enabled: configData.enabled ?? false,
          analyticsEnabled: configData.analyticsEnabled ?? true,
          revalidationVersion: configData.revalidationVersion ?? 1,
          allowedPlacements: configData.allowedPlacements ?? ["home_top", "home_featured", "study_materials", "desktop_sidebar", "pulse_feed"],
          maxVideoDurationSec: configData.maxVideoDurationSec ?? 30,
          maxVideoSizeMb: configData.maxVideoSizeMb ?? 3,
          updatedAt: configData.updatedAt ?? new Date().toISOString(),
          updatedBy: configData.updatedBy ?? "system",
        }
      : {
          enabled: false, // Default is OFF
          analyticsEnabled: true,
          revalidationVersion: 1,
          allowedPlacements: ["home_top", "home_featured", "study_materials", "desktop_sidebar", "pulse_feed"],
          maxVideoDurationSec: 30,
          maxVideoSizeMb: 3,
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
        };

    // 2. Fetch all campaigns
    const snap = await adminDb.collection("campaigns").orderBy("createdAt", "desc").get();
    const campaigns: AdCampaign[] = snap.docs.map((d) => ({
      ...(d.data() as Omit<AdCampaign, "id">),
      id: d.id,
    }));

    // 3. Compute stats
    const now = Date.now();
    let totalRevenue = 0;
    let totalReceived = 0;
    let totalOutstanding = 0;
    let activeCount = 0;
    let scheduledCount = 0;
    let expiredCount = 0;
    let disabledCount = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    for (const c of campaigns) {
      totalRevenue += c.revenue?.amountInr || 0;
      totalReceived += c.revenue?.amountReceivedInr || 0;
      totalOutstanding += c.revenue?.outstandingInr || 0;
      totalImpressions += c.impressions || 0;
      totalClicks += c.clicks || 0;

      if (c.status === "disabled" || c.status === "draft") {
        disabledCount++;
      } else if (c.status === "published") {
        const start = new Date(c.startAt).getTime();
        const expire = new Date(c.expiresAt).getTime();
        if (now < start) {
          scheduledCount++;
        } else if (now > expire) {
          expiredCount++;
        } else {
          activeCount++;
        }
      }
    }

    const overallCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      config: globalConfig,
      stats: {
        totalCampaigns: campaigns.length,
        active: activeCount,
        scheduled: scheduledCount,
        expired: expiredCount,
        disabled: disabledCount,
        totalImpressions,
        totalClicks,
        ctr: overallCtr,
        revenue: {
          totalInr: totalRevenue,
          receivedInr: totalReceived,
          outstandingInr: totalOutstanding,
        },
      },
      campaigns: campaigns.filter((c) => c.status !== "archived"),
      archivedCampaigns: campaigns.filter((c) => c.status === "archived"),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch campaigns";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// POST: Create a new advertisement campaign
export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin" && user.role !== "lead_admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      brandName,
      contactEmail,
      contactPhone,
      placementId,
      mediaType,
      desktopCreativeUrl,
      mobileCreativeUrl,
      videoPosterUrl,
      destinationUrl,
      accessibleDescription,
      startAt,
      expiresAt,
      priority,
      targetAudience,
      revenue,
      status,
    } = body;

    // Field Validations
    if (!title?.trim() || !brandName?.trim()) {
      return NextResponse.json({ error: "Title and Brand Name are required" }, { status: 400 });
    }

    if (!desktopCreativeUrl) {
      return NextResponse.json({ error: "Desktop creative URL is required" }, { status: 400 });
    }

    const desktopMediaCheck = validateMediaUrl(desktopCreativeUrl, mediaType);
    if (!desktopMediaCheck.valid) {
      return NextResponse.json({ error: desktopMediaCheck.error }, { status: 400 });
    }

    if (mobileCreativeUrl) {
      const mobileMediaCheck = validateMediaUrl(mobileCreativeUrl, mediaType);
      if (!mobileMediaCheck.valid) {
        return NextResponse.json({ error: mobileMediaCheck.error }, { status: 400 });
      }
    }

    if (mediaType === "video") {
      if (!videoPosterUrl) {
        return NextResponse.json({ error: "Poster image URL is mandatory for video advertisements" }, { status: 400 });
      }
      const posterCheck = validateMediaUrl(videoPosterUrl, "image");
      if (!posterCheck.valid) {
        return NextResponse.json({ error: posterCheck.error }, { status: 400 });
      }
    }

    const urlCheck = validateDestinationUrl(destinationUrl);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }

    const startMs = new Date(startAt).getTime();
    const expireMs = new Date(expiresAt).getTime();
    if (isNaN(startMs) || isNaN(expireMs) || expireMs <= startMs) {
      return NextResponse.json({ error: "Expiration date must be strictly after the start date" }, { status: 400 });
    }

    const allowedPlacements: AdPlacementId[] = [
      "home_top",
      "home_featured",
      "study_materials",
      "desktop_sidebar",
      "pulse_feed",
    ];
    if (!allowedPlacements.includes(placementId)) {
      return NextResponse.json({ error: "Invalid placement ID" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const cleanRevenue: Record<string, unknown> = {
      amountInr: Number(revenue?.amountInr) || 0,
      amountReceivedInr: Number(revenue?.amountReceivedInr) || 0,
      outstandingInr: Math.max(0, (Number(revenue?.amountInr) || 0) - (Number(revenue?.amountReceivedInr) || 0)),
      paymentStatus: revenue?.paymentStatus || "pending",
      paymentReference: revenue?.paymentReference || "",
      internalNotes: revenue?.internalNotes || "",
    };
    if (revenue?.paymentDate && typeof revenue.paymentDate === "string" && revenue.paymentDate.trim()) {
      cleanRevenue.paymentDate = new Date(revenue.paymentDate).toISOString();
    }

    const cleanTargetAudience: Record<string, unknown> = {
      userTier: targetAudience?.userTier || "all",
    };
    if (Array.isArray(targetAudience?.allowedPlans) && targetAudience.allowedPlans.length > 0) {
      cleanTargetAudience.allowedPlans = targetAudience.allowedPlans;
    }
    if (Array.isArray(targetAudience?.colleges) && targetAudience.colleges.length > 0) {
      cleanTargetAudience.colleges = targetAudience.colleges;
    }

    const campaignData: Record<string, unknown> = {
      title: title.trim(),
      brandName: brandName.trim(),
      contactEmail: contactEmail?.trim() || "",
      contactPhone: contactPhone?.trim() || "",
      placementId,
      mediaType: mediaType === "video" ? "video" : "image",
      desktopCreativeUrl: desktopCreativeUrl.trim(),
      destinationUrl: destinationUrl.trim(),
      accessibleDescription: accessibleDescription?.trim() || `Advertisement from ${brandName.trim()}`,
      startAt: new Date(startAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      priority: Number(priority) || 50,
      targetAudience: cleanTargetAudience,
      revenue: cleanRevenue,
      status: status || "draft",
      impressions: 0,
      clicks: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user.email || user.uid,
    };

    if (mobileCreativeUrl && typeof mobileCreativeUrl === "string" && mobileCreativeUrl.trim()) {
      campaignData.mobileCreativeUrl = mobileCreativeUrl.trim();
    }
    if (videoPosterUrl && typeof videoPosterUrl === "string" && videoPosterUrl.trim()) {
      campaignData.videoPosterUrl = videoPosterUrl.trim();
    }

    const docRef = await adminDb.collection("campaigns").add(campaignData);

    // Get current global kill-switch status and re-sync public manifest
    const configSnap = await adminDb.collection("system_settings").doc("ads_config").get();
    const isGloballyEnabled = configSnap.data()?.enabled ?? false;
    await syncActiveManifest(isGloballyEnabled);

    return NextResponse.json({
      success: true,
      message: "Campaign created successfully",
      id: docRef.id,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// PATCH: Update campaign or toggle global kill switch
export async function PATCH(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin" && user.role !== "lead_admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();

    // 1. Check if updating global kill switch
    if (typeof body.globalEnabled === "boolean") {
      const configRef = adminDb.collection("system_settings").doc("ads_config");
      await configRef.set(
        {
          enabled: body.globalEnabled,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email || user.uid,
        },
        { merge: true }
      );
      await syncActiveManifest(body.globalEnabled);
      return NextResponse.json({
        success: true,
        message: `Paperino Ads globally ${body.globalEnabled ? "ENABLED" : "DISABLED"}`,
        enabled: body.globalEnabled,
      });
    }

    // 2. Check if updating analytics emergency kill switch
    if (typeof body.analyticsEnabled === "boolean") {
      const configRef = adminDb.collection("system_settings").doc("ads_config");
      const configSnap = await configRef.get();
      const currentGlobalEnabled = configSnap.data()?.enabled ?? false;

      await configRef.set(
        {
          analyticsEnabled: body.analyticsEnabled,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email || user.uid,
        },
        { merge: true }
      );
      await syncActiveManifest(currentGlobalEnabled, body.analyticsEnabled);
      return NextResponse.json({
        success: true,
        message: `Paperino Ads Analytics ${body.analyticsEnabled ? "ACTIVATED" : "EMERGENCY DISABLED"}`,
        analyticsEnabled: body.analyticsEnabled,
      });
    }

    // 3. Otherwise update campaign
    const {
      campaignId,
      removeMobileCreative,
      removeVideoPoster,
      ...updates
    } = body;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    if (updates.destinationUrl) {
      const urlCheck = validateDestinationUrl(updates.destinationUrl);
      if (!urlCheck.valid) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 });
      }
    }

    if (updates.desktopCreativeUrl) {
      const check = validateMediaUrl(updates.desktopCreativeUrl, updates.mediaType || "image");
      if (!check.valid) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
    }

    if (updates.mobileCreativeUrl) {
      const check = validateMediaUrl(updates.mobileCreativeUrl, updates.mediaType || "image");
      if (!check.valid) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
    }

    if (updates.videoPosterUrl) {
      const check = validateMediaUrl(updates.videoPosterUrl, "image");
      if (!check.valid) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
    }

    const docRef = adminDb.collection("campaigns").doc(campaignId);
    const existingSnap = await docRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const cleanUpdates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    const allowedFields = [
      "title",
      "brandName",
      "contactEmail",
      "contactPhone",
      "placementId",
      "mediaType",
      "desktopCreativeUrl",
      "destinationUrl",
      "accessibleDescription",
      "status",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (typeof updates[field] === "string") {
          cleanUpdates[field] = updates[field].trim();
        } else {
          cleanUpdates[field] = updates[field];
        }
      }
    }

    if (updates.startAt) {
      cleanUpdates.startAt = new Date(updates.startAt).toISOString();
    }
    if (updates.expiresAt) {
      cleanUpdates.expiresAt = new Date(updates.expiresAt).toISOString();
    }
    if (updates.priority !== undefined) {
      cleanUpdates.priority = Number(updates.priority) || 50;
    }

    // Handle mobile creative: explicit remove or update
    if (removeMobileCreative === true || updates.mobileCreativeUrl === null || updates.mobileCreativeUrl === "") {
      cleanUpdates.mobileCreativeUrl = admin.firestore.FieldValue.delete();
    } else if (typeof updates.mobileCreativeUrl === "string" && updates.mobileCreativeUrl.trim()) {
      cleanUpdates.mobileCreativeUrl = updates.mobileCreativeUrl.trim();
    }

    // Handle video poster: explicit remove or update
    if (removeVideoPoster === true || updates.videoPosterUrl === null || (updates.videoPosterUrl === "" && updates.mediaType !== "video")) {
      cleanUpdates.videoPosterUrl = admin.firestore.FieldValue.delete();
    } else if (typeof updates.videoPosterUrl === "string" && updates.videoPosterUrl.trim()) {
      cleanUpdates.videoPosterUrl = updates.videoPosterUrl.trim();
    }

    // Target audience updates
    if (updates.targetAudience) {
      const cleanAudience: Record<string, unknown> = {
        userTier: updates.targetAudience.userTier || "all",
      };
      if (Array.isArray(updates.targetAudience.allowedPlans)) {
        cleanAudience.allowedPlans = updates.targetAudience.allowedPlans;
      }
      if (Array.isArray(updates.targetAudience.colleges)) {
        cleanAudience.colleges = updates.targetAudience.colleges;
      }
      cleanUpdates.targetAudience = cleanAudience;
    }

    // Revenue updates
    if (updates.revenue) {
      const amt = Number(updates.revenue.amountInr) || 0;
      const rec = Number(updates.revenue.amountReceivedInr) || 0;
      const cleanRev: Record<string, unknown> = {
        amountInr: amt,
        amountReceivedInr: rec,
        outstandingInr: Math.max(0, amt - rec),
        paymentStatus: updates.revenue.paymentStatus || "pending",
        paymentReference: updates.revenue.paymentReference || "",
        internalNotes: updates.revenue.internalNotes || "",
      };
      if (updates.revenue.paymentDate && typeof updates.revenue.paymentDate === "string" && updates.revenue.paymentDate.trim()) {
        cleanRev.paymentDate = new Date(updates.revenue.paymentDate).toISOString();
      }
      cleanUpdates.revenue = cleanRev;
    }

    await docRef.update(cleanUpdates);

    const configSnap = await adminDb.collection("system_settings").doc("ads_config").get();
    const isGloballyEnabled = configSnap.data()?.enabled ?? false;
    await syncActiveManifest(isGloballyEnabled);

    return NextResponse.json({
      success: true,
      message: "Campaign updated successfully",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update campaign";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// DELETE: Delete a campaign
export async function DELETE(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin" && user.role !== "lead_admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("id");
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    // Soft delete (archive) to preserve historical payment, advertiser, and revenue records
    await adminDb.collection("campaigns").doc(campaignId).set(
      {
        status: "archived",
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const configSnap = await adminDb.collection("system_settings").doc("ads_config").get();
    const isGloballyEnabled = configSnap.data()?.enabled ?? false;
    await syncActiveManifest(isGloballyEnabled);

    return NextResponse.json({
      success: true,
      message: "Campaign archived successfully",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete campaign";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
