import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import Razorpay from "razorpay";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface RestoredProfileData {
  paperinoAvatar?: string | null;
  avatarFrame?: string | null;
  avatarCompanion?: string | null;
  theme?: string | null;
  points?: number;
  contributionPoints?: number;
  uploads?: number;
  approvedUploads?: number;
  plan?: string;
  isContributorPlus?: boolean;
}

/** Helper to extract static backup uploads from configured_sections.json */
function getBackupSectionsForEmail(email: string): number {
  try {
    const filePath = path.join(process.cwd(), "src", "data", "configured_sections.json");
    if (!fs.existsSync(filePath)) return 0;
    const content = fs.readFileSync(filePath, "utf-8");
    const sections = JSON.parse(content);
    if (!Array.isArray(sections)) return 0;
    const cleanEmail = email.toLowerCase().trim();
    return sections.filter((s: any) => (s.creatorEmail || "").toLowerCase().trim() === cleanEmail).length;
  } catch {
    return 0;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser || !verifiedUser.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid, email } = verifiedUser;
    const cleanEmail = (email || "").toLowerCase().trim();

    let recoveredData: RestoredProfileData = {};
    let totalApprovedUploads = 0;
    let totalMaterialsCount = 0;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Scan Materials for Uploads Linked to UID or Email
    // ──────────────────────────────────────────────────────────────────────────
    if (adminDb) {
      try {
        const materialBatches: Promise<any>[] = [
          adminDb.collection("materials").where("uploaderId", "==", uid).get(),
        ];
        if (cleanEmail) {
          materialBatches.push(adminDb.collection("materials").where("uploaderEmail", "==", cleanEmail).get());
        }

        const [uidSnap, emailSnap] = await Promise.allSettled(materialBatches);
        const seenMaterialIds = new Set<string>();

        const processMaterialDoc = (docSnap: any) => {
          if (seenMaterialIds.has(docSnap.id)) return;
          seenMaterialIds.add(docSnap.id);
          totalMaterialsCount++;
          const data = docSnap.data();
          if (data.status === "approved" || !data.status) {
            totalApprovedUploads++;
          }
        };

        if (uidSnap.status === "fulfilled" && uidSnap.value) {
          uidSnap.value.docs.forEach(processMaterialDoc);
        }
        if (emailSnap && emailSnap.status === "fulfilled" && emailSnap.value) {
          emailSnap.value.docs.forEach(processMaterialDoc);
        }
      } catch (matErr: any) {
        console.warn("[Sync-Plan] Materials scan notice:", matErr?.message);
      }
    }

    // Supplement with configured_sections backup if database query hit quota or was empty
    const backupSectionCount = cleanEmail ? getBackupSectionsForEmail(cleanEmail) : 0;
    if (backupSectionCount > totalApprovedUploads) {
      totalApprovedUploads = backupSectionCount;
      totalMaterialsCount = Math.max(totalMaterialsCount, backupSectionCount);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Scan Users Collection for Existing Profile (by UID or Email)
    // ──────────────────────────────────────────────────────────────────────────
    if (adminDb) {
      try {
        const userDocRef = adminDb.collection("users").doc(uid);
        const currentDocSnap = await userDocRef.get();
        if (currentDocSnap.exists) {
          const d = currentDocSnap.data() || {};
          recoveredData.paperinoAvatar = d.paperinoAvatar || null;
          recoveredData.avatarFrame = d.avatarFrame || null;
          recoveredData.avatarCompanion = d.avatarCompanion || null;
          recoveredData.theme = d.theme || null;
          recoveredData.points = d.points || 0;
          recoveredData.contributionPoints = d.contributionPoints || 0;
          recoveredData.uploads = Math.max(d.uploads || 0, totalApprovedUploads);
          recoveredData.approvedUploads = Math.max(d.approvedUploads || 0, totalApprovedUploads);
          if (d.plan && d.plan !== "free") {
            recoveredData.plan = d.plan;
          }
        }

        // Check if an older profile document existed under this email (e.g. earlier UID)
        if (cleanEmail && (!recoveredData.paperinoAvatar || (recoveredData.uploads || 0) === 0)) {
          const oldUserQuery = await adminDb.collection("users").where("email", "==", cleanEmail).limit(5).get();
          oldUserQuery.docs.forEach((doc) => {
            const od = doc.data();
            if (!recoveredData.paperinoAvatar && od.paperinoAvatar) {
              recoveredData.paperinoAvatar = od.paperinoAvatar;
            }
            if (!recoveredData.avatarFrame && od.avatarFrame) {
              recoveredData.avatarFrame = od.avatarFrame;
            }
            if (!recoveredData.avatarCompanion && od.avatarCompanion) {
              recoveredData.avatarCompanion = od.avatarCompanion;
            }
            if (!recoveredData.theme && od.theme) {
              recoveredData.theme = od.theme;
            }
            if (typeof od.points === "number" && od.points > (recoveredData.points || 0)) {
              recoveredData.points = od.points;
            }
            if (typeof od.contributionPoints === "number" && od.contributionPoints > (recoveredData.contributionPoints || 0)) {
              recoveredData.contributionPoints = od.contributionPoints;
            }
            if (typeof od.uploads === "number" && od.uploads > (recoveredData.uploads || 0)) {
              recoveredData.uploads = od.uploads;
            }
            if (typeof od.approvedUploads === "number" && od.approvedUploads > (recoveredData.approvedUploads || 0)) {
              recoveredData.approvedUploads = od.approvedUploads;
            }
            if (!recoveredData.plan && od.plan && od.plan !== "free") {
              recoveredData.plan = od.plan;
            }
          });
        }
      } catch (userErr: any) {
        console.warn("[Sync-Plan] User profile scan notice:", userErr?.message);
      }
    }

    // Update calculated upload counts
    recoveredData.uploads = Math.max(recoveredData.uploads || 0, totalApprovedUploads);
    recoveredData.approvedUploads = Math.max(recoveredData.approvedUploads || 0, totalApprovedUploads);
    if (!recoveredData.contributionPoints && recoveredData.approvedUploads > 0) {
      recoveredData.contributionPoints = recoveredData.approvedUploads * 10;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Contributor Free Plus Milestone (10+ Approved Materials = Free Plus)
    // ──────────────────────────────────────────────────────────────────────────
    const allowedAdmins = [
      "mohamedsajid.sa@gmail.com",
      "sudharajsekar2005@gmail.com",
      "admin.paperinoirfan27@gmail.com",
      "admin.paperinosam14@gmail.com",
      "gameplayitlifeitis@gmail.com",
      "gameplayitlifeis@gmail.com",
      "gameplayitlife@gmail.com",
      "dejasvini28@gmail.com",
      "kaushika13official@gmail.com"
    ];
    const isAdminUser = verifiedUser.role === "admin" || (cleanEmail && allowedAdmins.includes(cleanEmail));

    const isFreePlusEligible = !isAdminUser && (recoveredData.approvedUploads || 0) >= 10;
    if (isAdminUser) {
      recoveredData.isContributorPlus = false;
      recoveredData.plan = "admin";
    } else if (isFreePlusEligible) {
      recoveredData.isContributorPlus = true;
      if (!recoveredData.plan || recoveredData.plan === "free") {
        recoveredData.plan = "plus";
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Check Razorpay for Paid Subscriptions (Takes precedence if Pro/Premium)
    // ──────────────────────────────────────────────────────────────────────────
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (key_id && key_secret && cleanEmail) {
      try {
        const rzp = new Razorpay({ key_id, key_secret });
        const payments = await rzp.payments.all({ count: 25 });
        const userPayments = (payments.items || []).filter(
          (p: any) => (p.email || "").toLowerCase() === cleanEmail && p.status === "captured"
        );

        if (userPayments.length > 0) {
          userPayments.sort((a: any, b: any) => b.created_at - a.created_at);
          const latestPayment = userPayments[0];

          let detectedPlan = "premium";
          const desc = (latestPayment.description || "").toLowerCase();
          const amount = latestPayment.amount; // in paise

          if (latestPayment.notes?.plan) {
            detectedPlan = latestPayment.notes.plan.toLowerCase();
          } else if (desc.includes("plus") || amount === 4900) {
            detectedPlan = "plus";
          } else if (desc.includes("pro") || amount === 7900) {
            detectedPlan = "pro";
          }

          recoveredData.plan = detectedPlan;
        }
      } catch (rzpErr: any) {
        console.warn("[Sync-Plan] Razorpay lookup warning:", rzpErr?.message);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Apply Restored Claims & Synchronize User Document
    // ──────────────────────────────────────────────────────────────────────────
    const activePlan = isAdminUser ? "admin" : (recoveredData.plan || (isFreePlusEligible ? "plus" : "free"));

    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUser(uid);
        const currentClaims = userRecord.customClaims || {};
        await adminAuth.setCustomUserClaims(uid, {
          ...currentClaims,
          ...(isAdminUser ? { role: "admin" } : {}),
          plan: activePlan,
          isContributorPlus: Boolean(recoveredData.isContributorPlus),
          uploads: recoveredData.approvedUploads || 0,
          autoHealedAt: Date.now(),
        });
      } catch (authErr: any) {
        console.warn("[Sync-Plan] AdminAuth custom claims update skipped:", authErr?.message);
      }
    }

    if (adminDb) {
      try {
        const syncPayload: Record<string, any> = {
          email: cleanEmail,
          plan: activePlan,
          ...(isAdminUser ? { role: "admin" } : {}),
          isContributorPlus: Boolean(recoveredData.isContributorPlus),
          uploads: recoveredData.uploads || 0,
          approvedUploads: recoveredData.approvedUploads || 0,
          contributionPoints: recoveredData.contributionPoints || 0,
          updatedAt: Date.now(),
        };

        if (recoveredData.paperinoAvatar) syncPayload.paperinoAvatar = recoveredData.paperinoAvatar;
        if (recoveredData.avatarFrame) syncPayload.avatarFrame = recoveredData.avatarFrame;
        if (recoveredData.avatarCompanion) syncPayload.avatarCompanion = recoveredData.avatarCompanion;
        if (recoveredData.theme) syncPayload.theme = recoveredData.theme;

        await adminDb.collection("users").doc(uid).set(syncPayload, { merge: true });
      } catch (dbErr: any) {
        console.warn("[Sync-Plan] Firestore profile consolidation notice:", dbErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      status: "auto_healed",
      plan: activePlan,
      isContributorPlus: Boolean(recoveredData.isContributorPlus),
      uploads: recoveredData.uploads || 0,
      approvedUploads: recoveredData.approvedUploads || 0,
      contributionPoints: recoveredData.contributionPoints || 0,
      paperinoAvatar: recoveredData.paperinoAvatar || null,
      avatarFrame: recoveredData.avatarFrame || null,
      avatarCompanion: recoveredData.avatarCompanion || null,
      theme: recoveredData.theme || null,
    });
  } catch (error: any) {
    console.error("Plan sync and recovery error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync plan" }, { status: 500 });
  }
}
