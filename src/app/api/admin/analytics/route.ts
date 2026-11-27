import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";

export const dynamic = "force-dynamic";

const ALLOWED_ADMINS = [
  "mohamedsajid.sa@gmail.com",
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

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required." },
        { status: 401 }
      );
    }

    const isAdminUser =
      verifiedUser.role === "admin" ||
      (verifiedUser.email && ALLOWED_ADMINS.includes(verifiedUser.email.toLowerCase()));

    if (!isAdminUser) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required." },
        { status: 403 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 }
      );
    }

    // 24 hours rolling window for Daily Active Users
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Keep the requesting admin marked active in the database
    if (verifiedUser.uid) {
      adminDb.collection("users").doc(verifiedUser.uid).set({
        lastLogin: new Date()
      }, { merge: true }).catch(() => {});
    }

    const [
      materialsCountSnap,
      usersCountSnap,
      dailyUsersSnap24h,
      recentDownloadsSnap,
      recentChallengesSnap,
      pyqsSnap,
      notesSnap,
      questionsSnap,
      globalStatsSnap,
      topSubjectSnap,
      topDownloadSnap,
      deptsSnap,
      pendingDeptsSnap,
      approvedDeptsSnap,
      subjectsSnap
    ] = await Promise.allSettled([
      adminDb.collection("materials").count().get(),
      adminDb.collection("users").count().get(),
      adminDb.collection("users").where("lastLogin", ">=", twentyFourHoursAgo).select("lastLogin").get(),
      adminDb.collection("download_logs").where("downloadTime", ">=", twentyFourHoursAgo).select("userId").get(),
      adminDb.collection("challenge_sessions").where("startedAt", ">=", twentyFourHoursAgo).select("userId").get(),
      adminDb.collection("materials").where("category", "==", "pyq").count().get(),
      adminDb.collection("materials").where("category", "==", "notes").count().get(),
      adminDb.collection("materials").where("category", "==", "questions").count().get(),
      adminDb.collection("platform_stats").doc("global").get(),
      adminDb.collection("platform_stats").doc("subjects").collection("visits").orderBy("visits", "desc").limit(1).get(),
      adminDb.collection("platform_stats").doc("materials").collection("downloads").orderBy("downloads", "desc").limit(1).get(),
      adminDb.collection("departments").count().get(),
      adminDb.collection("departments").where("status", "==", "pending").count().get(),
      adminDb.collection("departments").where("status", "==", "approved").count().get(),
      adminDb.collection("dynamic_subjects").where("status", "==", "approved").count().get()
    ]);

    const getCount = (res: any, fallback = 0) => {
      if (res.status === "fulfilled" && res.value?.data) {
        return res.value.data().count ?? fallback;
      }
      return fallback;
    };

    const totalMaterials = getCount(materialsCountSnap, 0);
    const totalUsers = getCount(usersCountSnap, 0);

    // Aggregate true unique Daily Active Users across active logins, downloads, and challenge sessions in the last 24h
    const activeUserSet = new Set<string>();
    if (verifiedUser.uid) activeUserSet.add(verifiedUser.uid);

    if (dailyUsersSnap24h.status === "fulfilled" && dailyUsersSnap24h.value?.docs) {
      dailyUsersSnap24h.value.docs.forEach((d: any) => {
        if (d.id) activeUserSet.add(d.id);
      });
    }

    if (recentDownloadsSnap.status === "fulfilled" && recentDownloadsSnap.value?.docs) {
      recentDownloadsSnap.value.docs.forEach((d: any) => {
        const uid = d.data()?.userId;
        if (uid && uid !== "GUEST") activeUserSet.add(uid);
      });
    }

    if (recentChallengesSnap.status === "fulfilled" && recentChallengesSnap.value?.docs) {
      recentChallengesSnap.value.docs.forEach((d: any) => {
        const uid = d.data()?.userId;
        if (uid && uid !== "GUEST") activeUserSet.add(uid);
      });
    }

    const dailyActive = Math.max(activeUserSet.size, 1);
    const pyqs = getCount(pyqsSnap, 0);
    const notes = getCount(notesSnap, 0);
    const questions = getCount(questionsSnap, 0);
    const other = Math.max(0, totalMaterials - (pyqs + notes + questions));

    const totalDepts = getCount(deptsSnap, 1);
    const pendingDepts = getCount(pendingDeptsSnap, 0);
    const approvedDepts = getCount(approvedDeptsSnap, totalDepts);
    const totalSubjects = getCount(subjectsSnap, 75);

    let globalData: any = {};
    if (globalStatsSnap.status === "fulfilled" && globalStatsSnap.value?.exists) {
      globalData = globalStatsSnap.value.data() || {};
    }

    let mostVisited = "N/A";
    if (topSubjectSnap.status === "fulfilled" && !topSubjectSnap.value?.empty && topSubjectSnap.value?.docs?.length > 0) {
      const doc = topSubjectSnap.value.docs[0];
      mostVisited = doc.data().name || doc.id;
    }

    let highestDownloadedFile = "N/A";
    if (topDownloadSnap.status === "fulfilled" && !topDownloadSnap.value?.empty && topDownloadSnap.value?.docs?.length > 0) {
      const doc = topDownloadSnap.value.docs[0];
      highestDownloadedFile = doc.data().name || doc.id;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        dailyActive,
        totalMaterials,
        atsUsage: globalData.atsUsage || 0,
        aiUsage: globalData.aiUsage || 0,
        mostVisited,
        topDepartment: "B.Tech",
        highestDownloadedFile,
        totalDepts,
        pendingDepts,
        approvedDepts,
        totalSubjects
      },
      materialCounts: {
        pyqs,
        notes,
        manuals: 0,
        syllabus: 0,
        questions,
        other
      }
    });
  } catch (error: any) {
    console.error("[Admin Analytics API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load platform analytics" },
      { status: 500 }
    );
  }
}
