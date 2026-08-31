import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

const COLLECTION_NAME = "free_class_reports";

// ── AUTOMATIC CLEANUP ROUTINE (Targeted to expired items only to prevent quota exhaustion) ──
async function runFreeClassCleanup() {
  if (!adminDb) return;
  try {
    const now = Date.now();
    // Query only items whose expiresAtMs is in the past (up to 25 items at a time)
    const snap = await adminDb.collection(COLLECTION_NAME)
      .where("expiresAtMs", "<=", now)
      .limit(25)
      .get();

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      console.log(`[Cleanup] Deleting expired report ${docSnap.id} from ${COLLECTION_NAME}`);

      // 1. Delete Firestore Document
      await docSnap.ref.delete();

      // 2. Do NOT clean up associated notifications (Notification history must be preserved forever)
    }
  } catch (err: any) {
    console.warn("[Cleanup Routine Notice]:", err?.message || err);
  }
}

export async function GET(req: NextRequest) {
  try {
    // NOTE: Do NOT run runFreeClassCleanup() here — it deletes documents
    // before they can be returned to the client. Cleanup runs separately on POST.

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Bearer token missing." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = authHeader.substring(7);
    if (!adminAuth || !adminDb) {
      return new Response(JSON.stringify({ error: "Server Error", message: "Firebase Admin SDK not initialized." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    await adminAuth.verifyIdToken(token);

    // Simple query without orderBy to avoid composite index requirements
    console.log(`[FCF API GET] Querying collection: ${COLLECTION_NAME}`);
    const snapshot = await adminDb.collection(COLLECTION_NAME).limit(100).get();
    console.log(`[FCF API GET] Firestore returned ${snapshot.docs.length} total documents`);
    const now = Date.now();
    const list: any[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const formattedData = { ...data };

      // Convert Firestore Timestamps to milliseconds for JSON serialization
      if (data.createdAt && typeof data.createdAt.toMillis === "function") {
        formattedData.createdAt = data.createdAt.toMillis();
      }
      if (data.expiresAt && typeof data.expiresAt.toMillis === "function") {
        formattedData.expiresAt = data.expiresAt.toMillis();
      }

      // Calculate expiry time from available fields
      const expiresAtMs = formattedData.expiresAtMs
        || formattedData.expiresAt
        || ((formattedData.createdAtMs || formattedData.createdAt || now) + (formattedData.expectedFreeDurationMinutes || 30) * 60 * 1000);

      // Skip expired reports — they'll be cleaned up separately
      if (expiresAtMs <= now) {
        console.log(`[FCF API GET] Skipping expired doc: ${docSnap.id}, expiresAtMs=${expiresAtMs}, now=${now}`);
        continue;
      }

      list.push({
        id: docSnap.id,
        ...formattedData
      });
    }

    console.log(`[FCF API GET] Returning ${list.length} active reports`);

    // Sort by createdAtMs descending in JS (avoids index requirement)
    list.sort((a, b) => (b.createdAtMs || b.createdAt || 0) - (a.createdAtMs || a.createdAt || 0));

    return new Response(JSON.stringify(list), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[API Free Class Finder GET Error]", error);
    return new Response(JSON.stringify({ error: "Error", message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Run cleanup on write operations (safe because we're not reading data to return)
    runFreeClassCleanup().catch(() => {});

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Please login to submit a classroom report." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = authHeader.substring(7);
    let uid = "";
    let userName = "Student";

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      uid = decodedToken.uid;
      userName = decodedToken.name || decodedToken.email?.split("@")[0] || "Student";
    } catch (authErr: any) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Invalid or expired session. Please re-login." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!adminDb) {
      return new Response(JSON.stringify({ error: "Server Error", message: "Firebase Admin Database not initialized." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, collegeName, block, floor, roomNumber, capacity, hasAC, expectedFreeDurationMinutes, reportId, voteType } = body;

    const now = Date.now();

    // Calculate Duration in Minutes
    let durationMinutes = 30;
    if (typeof expectedFreeDurationMinutes === "number") {
      durationMinutes = expectedFreeDurationMinutes;
    } else if (typeof expectedFreeDurationMinutes === "string") {
      if (expectedFreeDurationMinutes === "until_next_period" || expectedFreeDurationMinutes === "not_sure") {
        durationMinutes = 60;
      } else {
        durationMinutes = parseInt(expectedFreeDurationMinutes, 10) || 30;
      }
    }

    const expiresAtMs = now + durationMinutes * 60 * 1000;
    const expiresAtTimestamp = admin.firestore.Timestamp.fromMillis(expiresAtMs);
    const cleanCollege = collegeName ? String(collegeName).trim() : "SRM IST";

    // ── ACTION 1: SUBMIT REPORT ──────────────────────────────────────────────
    if (action === "create" || (!action && roomNumber)) {
      if (!roomNumber || !block) {
        return new Response(JSON.stringify({ error: "Bad Request", message: "Block and Room Number are required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const formattedRoom = roomNumber.toUpperCase().includes(block.toUpperCase())
        ? roomNumber.trim().toUpperCase()
        : `${block.trim().toUpperCase()}-${roomNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
      const docId = formattedRoom;
      const reportRef = adminDb.collection(COLLECTION_NAME).doc(docId);
      // Format server IST timestamp fields
      const dateObj = new Date(now);
      const istOptions: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };

      const createdDate = dateObj.toLocaleDateString("en-GB", {
        ...istOptions,
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      const createdDay = dateObj.toLocaleDateString("en-US", {
        ...istOptions,
        weekday: "long"
      });

      const createdTime = dateObj.toLocaleTimeString("en-US", {
        ...istOptions,
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }) + " IST";

      const timezone = "Asia/Kolkata (IST)";

      // Write report with merge: true (Zero pre-read required!)
      await reportRef.set({
        collegeName: cleanCollege,
        block: block.trim(),
        floor: parseInt(floor, 10) || 1,
        roomNumber: formattedRoom,
        capacity: capacity ? parseInt(capacity, 10) : null,
        hasAC: !!hasAC,
        expectedFreeDurationMinutes: durationMinutes,
        reporterUid: uid,
        reporterName: userName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: now,
        createdDate,
        createdDay,
        createdTime,
        timezone,
        expiresAt: expiresAtTimestamp,
        expiresAtMs: expiresAtMs,
        trueVotes: 0,
        falseVotes: 0,
        voters: {},
        reporterCount: admin.firestore.FieldValue.increment(1),
        status: "active"
      }, { merge: true });

      console.log(`✅ Firestore document created`);
      console.log(`✅ Document ID: ${docId}`);
      console.log(`✅ Collection path: ${COLLECTION_NAME}`);

      // Create a Paperino Pulse notification event
      try {
        await adminDb.collection("pulse_updates").add({
          title: "New Free Classroom",
          content: `${userName} just reported a free classroom: ${formattedRoom} at ${block} Block. Available for ~${durationMinutes} mins.`,
          category: "Free Class Finder",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          deadline: expiresAtTimestamp,
          createdBy: uid,
        });
        console.log(`✅ Pulse update created for Free Class Finder`);
      } catch (pulseErr) {
        console.error("Failed to create pulse notification:", pulseErr);
      }

      return new Response(JSON.stringify({ success: true, roomNumber: formattedRoom, reportId: docId }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── ACTION 2: VOTE ──────────────────────────────────────────────────────
    if (action === "vote" && reportId && voteType) {
      const reportRef = adminDb.collection(COLLECTION_NAME).doc(reportId);
      const reportSnap = await reportRef.get();

      if (!reportSnap.exists) {
        return new Response(JSON.stringify({ error: "Not Found", message: "Classroom report not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const data = reportSnap.data() || {};

      if (data.reporterUid === uid) {
        return new Response(JSON.stringify({ error: "Forbidden", message: "You cannot vote on your own classroom report." }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      const existingVote = data.voters?.[uid];

      let newTrueVotes = data.trueVotes || 0;
      let newFalseVotes = data.falseVotes || 0;
      const newVoters = { ...(data.voters || {}) };

      if (existingVote === voteType) {
        delete newVoters[uid];
        if (voteType === "true") newTrueVotes = Math.max(0, newTrueVotes - 1);
        else newFalseVotes = Math.max(0, newFalseVotes - 1);
      } else {
        if (existingVote === "true") newTrueVotes = Math.max(0, newTrueVotes - 1);
        if (existingVote === "false") newFalseVotes = Math.max(0, newFalseVotes - 1);

        newVoters[uid] = voteType;
        if (voteType === "true") newTrueVotes += 1;
        else newFalseVotes += 1;
      }

      // Check immediate auto-removal rule on vote update
      if (newFalseVotes >= 5) {
        console.log(`[API Free Class Finder] Auto-deleting fake report ${reportId} from ${COLLECTION_NAME}`);
        await reportRef.delete();
        return new Response(JSON.stringify({ success: true, removed: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      await reportRef.update({
        trueVotes: newTrueVotes,
        falseVotes: newFalseVotes,
        voters: newVoters
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── ACTION 3: DELETE REPORT (Reporter or Admin) ──────────────────────────
    if (action === "delete" && reportId) {
      const reportRef = adminDb.collection(COLLECTION_NAME).doc(reportId);
      const reportSnap = await reportRef.get();

      if (!reportSnap.exists) {
        return new Response(JSON.stringify({ error: "Not Found", message: "Classroom report not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const data = reportSnap.data() || {};

      // Permission check: Must be reporter OR admin
      const userRecord = await admin.auth().getUser(uid).catch(() => null);
      const userEmail = userRecord?.email || "";
      const isHardcodedAdmin = [
        "mohamedsajid.sa@gmail.com",
        "sudharajsekar2005@gmail.com",
        "admin.paperinoirfan27@gmail.com",
        "admin.paperinosam14@gmail.com",
        "gameplayitlifeitis@gmail.com",
        "gameplayitlifeis@gmail.com",
        "gameplayitlife@gmail.com"
      ].includes(userEmail);

      const userDoc = await adminDb.collection("users").doc(uid).get();
      const isAdminRole = userDoc.exists && userDoc.data()?.role === "admin";

      if (data.reporterUid !== uid && !isHardcodedAdmin && !isAdminRole) {
        return new Response(JSON.stringify({ error: "Forbidden", message: "Only the reporter or admin can delete this report." }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 1. Delete classroom report document
      await reportRef.delete();

      // If deleted by an admin (moderator deletion)
      const isModerator = isHardcodedAdmin || isAdminRole;
      if (isModerator && data.reporterUid !== uid) {
        const reason = body.reason || "Moderator removal";
        await adminDb.collection("admin_logs").add({
          action: "delete_free_classroom_moderation",
          adminUid: uid,
          adminName: userName,
          reportId: reportId,
          deletedAt: now,
          reason: reason,
          details: `Admin ${userName} removed classroom report for room ${reportId}. Reason: ${reason}`
        }).catch(e => console.error("[Moderation Logging Error]:", e));
      }

      // 2. Delete related notifications
      try {
        const notifSnap = await adminDb.collection("notifications").where("roomId", "==", reportId).get();
        for (const nDoc of notifSnap.docs) {
          await nDoc.ref.delete();
        }
      } catch (e) {
        console.warn("[Delete Report] Notification cleanup warning:", e);
      }

      console.log(`[API Free Class Finder] Successfully deleted report ${reportId} from ${COLLECTION_NAME}`);
      return new Response(JSON.stringify({ success: true, message: "Report deleted successfully." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Bad Request", message: "Invalid action." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[API Free Class Finder Error]:", err);
    return new Response(JSON.stringify({ error: "Server Error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
