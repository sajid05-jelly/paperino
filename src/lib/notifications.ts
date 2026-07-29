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
  | "premium_unlocked"
  | "free_class_reported"
  | "free_class_expired";

export interface PaperinoNotification {
  id: string;
  userId: string;
  ownerUid?: string;
  title: string;
  message: string;
  type: NotificationType;
  roomId?: string;
  read: boolean;
  isRead?: boolean;
  readAt?: any;
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
      ownerUid: userId,
      title,
      message,
      type,
      read: false,
      isRead: false,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("[Notifications] Failed to create notification:", err);
  }
}

export const notifyUser = createNotification;

// Hardcoded admin emails — kept in sync with AuthContext
const HARDCODED_ADMIN_EMAILS = [
  "mohamedsajid.sa@gmail.com",
  "sudharajsekar2005@gmail.com",
  "admin.paperinoirfan27@gmail.com",
  "admin.paperinosam14@gmail.com",
  "gameplayitlifeitis@gmail.com",
  "gameplayitlifeis@gmail.com",
  "gameplayitlife@gmail.com",
];

/**
 * Broadcast a notification to all admins.
 */
export async function notifyAdmins(
  db: Firestore,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  try {
    const adminUids = new Set<string>();

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

    if (adminUids.size === 0) {
      await createNotification(db, "ADMIN", title, message, type);
    } else {
      const promises = Array.from(adminUids).map((uid) =>
        createNotification(db, uid, title, message, type)
      );
      await Promise.all(promises);
    }
  } catch (err) {
    console.error("[Notifications] notifyAdmins failed:", err);
  }
}
