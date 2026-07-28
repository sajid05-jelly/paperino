import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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
    const durationMinutes = parseInt(expectedFreeDurationMinutes, 10) || 30;
    const expiresAt = now + durationMinutes * 60 * 1000;
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
      const reportRef = adminDb.collection("free_class_reports").doc(docId);
      const existingSnap = await reportRef.get();

      if (existingSnap.exists) {
        const existingData = existingSnap.data() || {};
        await reportRef.update({
          collegeName: cleanCollege,
          createdAt: now,
          expiresAt,
          expectedFreeDurationMinutes: durationMinutes,
          trueVotes: (existingData.trueVotes || 0) + 1,
          reporterCount: (existingData.reporterCount || 1) + 1,
          capacity: capacity ? parseInt(capacity, 10) : (existingData.capacity || null),
          hasAC: hasAC !== undefined ? !!hasAC : !!existingData.hasAC,
          voters: {
            ...(existingData.voters || {}),
            [uid]: "true"
          }
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
          createdAt: now,
          expiresAt,
          trueVotes: 1,
          falseVotes: 0,
          voters: {
            [uid]: "true"
          },
          reporterCount: 1,
          status: "active"
        });
      }

      console.log(`[API Free Class Finder] Successfully created/updated report for ${docId} (${cleanCollege}, ${durationMinutes} mins)`);
      return new Response(JSON.stringify({ success: true, roomNumber: formattedRoom, reportId: docId }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── ACTION 2: VOTE ──────────────────────────────────────────────────────
    if (action === "vote" && reportId && voteType) {
      const reportRef = adminDb.collection("free_class_reports").doc(reportId);
      const reportSnap = await reportRef.get();

      if (!reportSnap.exists) {
        return new Response(JSON.stringify({ error: "Not Found", message: "Classroom report not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const data = reportSnap.data() || {};
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

      await reportRef.update({
        trueVotes: newTrueVotes,
        falseVotes: newFalseVotes,
        voters: newVoters
      });

      console.log(`[API Free Class Finder] Registered community vote (${voteType}) for ${reportId}`);
      return new Response(JSON.stringify({ success: true }), {
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
