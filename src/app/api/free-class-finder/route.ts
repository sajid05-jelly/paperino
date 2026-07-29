import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

const COLLECTION_NAME = "freeClassrooms";

// ── AUTOMATIC CLEANUP ROUTINE ────────────────────────────────────────────────
async function runFreeClassCleanup() {
  if (!adminDb) return;
  try {
    const now = Date.now();
    const snap = await adminDb.collection(COLLECTION_NAME).get();

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const createdAt = data.createdAtMs || (data.createdAt?.toMillis ? data.createdAt.toMillis() : now);
      const durationMin = data.expectedFreeDurationMinutes || 30;
      const expiresAtMs = data.expiresAtMs || (data.expiresAt?.toMillis ? data.expiresAt.toMillis() : (createdAt + durationMin * 60 * 1000));
      const trueVotes = data.trueVotes || 0;
      const falseVotes = data.falseVotes || 0;

      const isExpired = expiresAtMs > 0 && expiresAtMs <= now;
      const isFake = falseVotes >= 5 || (falseVotes > trueVotes && falseVotes > 0);

      if (isExpired || isFake) {
        console.log(`[Cleanup] Deleting report ${docSnap.id} from ${COLLECTION_NAME} (Expired: ${isExpired}, Fake: ${isFake})`);

        // 1. Delete Firestore Document
        await docSnap.ref.delete();

        // 2. Clean up associated notifications
        try {
          const notifSnap = await adminDb.collection("notifications").where("roomId", "==", docSnap.id).get();
          for (const nDoc of notifSnap.docs) {
            await nDoc.ref.delete();
          }
        } catch (e) {
          console.warn("[Cleanup] Notification cleanup notice:", e);
        }

        // 3. Create Expired Notification if expired
        if (isExpired) {
          try {
            await adminDb.collection("notifications").add({
              userId: "ALL",
              title: "⏰ Free Classroom Report Expired",
              message: `Room ${docSnap.id} report has expired and was automatically cleaned up.`,
              type: "free_class_expired",
              roomId: docSnap.id,
              read: false,
              createdAt: now
            });
          } catch (e) {
            console.warn("[Cleanup] Expired notification notice:", e);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Cleanup Routine Error]:", err);
  }
}

export async function GET(req: NextRequest) {
  await runFreeClassCleanup();
  return new Response(JSON.stringify({ success: true, message: "Cleanup completed successfully." }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(req: NextRequest) {
  try {
    // Run automatic cleanup on incoming API actions
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
      const existingSnap = await reportRef.get();

      if (existingSnap.exists) {
        const existingData = existingSnap.data() || {};
        await reportRef.update({
          collegeName: cleanCollege,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAtMs: now,
          expiresAt: expiresAtTimestamp,
          expiresAtMs: expiresAtMs,
          expectedFreeDurationMinutes: durationMinutes,
          reporterCount: (existingData.reporterCount || 1) + 1,
          capacity: capacity ? parseInt(capacity, 10) : (existingData.capacity || null),
          hasAC: hasAC !== undefined ? !!hasAC : !!existingData.hasAC,
          status: "active"
        });
      } else {
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
          expiresAt: expiresAtTimestamp,
          expiresAtMs: expiresAtMs,
          trueVotes: 0,
          falseVotes: 0,
          voters: {},
          reporterCount: 1,
          status: "active"
        });
      }

      console.log(`✔ Firestore document created`);
      console.log(`✔ Document ID: ${docId}`);
      console.log(`✔ Collection path: ${COLLECTION_NAME}`);

      // ── Create Public Broadcast Notification for All Users ─────────────────────
      try {
        await adminDb.collection("notifications").add({
          userId: "ALL",
          ownerUid: "ALL",
          title: "📢 Free Classroom Available!",
          message: `Room ${formattedRoom} (${cleanCollege} - ${block.trim()}) is reported free! Click to view details.`,
          type: "free_class_reported",
          roomId: formattedRoom,
          read: false,
          isRead: false,
          createdAt: now
        });
      } catch (notifErr) {
        console.warn("[API Notifications Warning]:", notifErr);
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
      if (newFalseVotes >= 5 || (newFalseVotes > newTrueVotes && newFalseVotes > 0)) {
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
        "gameplayitlifeitis@gmail.com"
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
