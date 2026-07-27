/**
 * notifications.ts
 * Central service for creating Paperino notifications in Firestore.
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Firestore,
} from "firebase/firestore";

export type NotificationType =
  | "application_submitted"
  | "application_approved"
  | "application_rejected"
  | "material_uploaded"
  | "material_approved"
  | "material_rejected"
  | "department_suggested"
  | "subject_suggested"
  | "feedback_submitted"
  | "department_approved"
  | "department_rejected"
  | "subject_approved"
  | "subject_rejected"
  | "premium_unlocked";

export interface PaperinoNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: number;
}

/**
 * Write a single notification to Firestore for a specific user.
 */
export async function createNotification(
  db: Firestore,
  userId: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: Date.now(),
    });
  } catch (err) {
    // Non-fatal — don't let notification errors break the main flow
    console.error("[Notifications] Failed to create notification:", err);
  }
}

// Hardcoded admin emails — kept in sync with AuthContext
const HARDCODED_ADMIN_EMAILS = [
  "mohamedsajid.sa@gmail.com",
  "sudharajsekar2005@gmail.com",
  "admin.paperinoirfan27@gmail.com",
  "admin.paperinosam14@gmail.com",
  "gameplayitlifeitis@gmail.com",
];

/**
 * Broadcast a notification to all admins.
 * Looks up admin UIDs from the `users` collection (role == "admin")
 * and also from hardcoded admin emails.
 */
export async function notifyAdmins(
  db: Firestore,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  try {
    const adminUids = new Set<string>();

    // 1. Fetch UIDs of users with role == "admin"
    try {
      const adminQuery = query(
        collection(db, "users"),
        where("role", "==", "admin")
      );
      const snap = await getDocs(adminQuery);
      snap.forEach((d) => adminUids.add(d.id));
    } catch (e) {
      console.warn("[Notifications] Query by role==admin skipped:", e);
    }

    // 2. Also fetch by hardcoded admin emails
    try {
      const emailQuery = query(
        collection(db, "users"),
        where("email", "in", HARDCODED_ADMIN_EMAILS)
      );
      const emailSnap = await getDocs(emailQuery);
      emailSnap.forEach((d) => adminUids.add(d.id));
    } catch (e) {
      console.warn("[Notifications] Query by hardcoded emails skipped:", e);
    }

    // 3. Fallback: query all users if adminUids set is empty and check email/role client-side
    if (adminUids.size === 0) {
      try {
        const allUsersSnap = await getDocs(collection(db, "users"));
        allUsersSnap.forEach((docSnap) => {
          const u = docSnap.data();
          if (
            u.role === "admin" ||
            (u.email && HARDCODED_ADMIN_EMAILS.includes(u.email.toLowerCase()))
          ) {
            adminUids.add(docSnap.id);
          }
        });
      } catch (e) {
        console.warn("[Notifications] Fallback all users scan skipped:", e);
      }
    }

    // Write one notification per admin UID
    const writes = Array.from(adminUids).map((uid) =>
      createNotification(db, uid, title, message, type)
    );
    await Promise.all(writes);
    console.log(`[Notifications] Broadcasted "${title}" to ${adminUids.size} admin(s).`);
  } catch (err) {
    console.error("[Notifications] Failed to notify admins:", err);
  }
}

/**
 * Send a notification to a specific user.
 */
export async function notifyUser(
  db: Firestore,
  userId: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  if (!userId) return;
  await createNotification(db, userId, title, message, type);
}
