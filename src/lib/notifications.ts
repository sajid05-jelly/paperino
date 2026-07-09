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
  | "subject_suggested";

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
];

/**
 * Broadcast a notification to all admins.
 * Looks up admin UIDs from the `users` collection (role == "admin")
 * and also from NEXT_PUBLIC_ADMIN_EMAILS env var.
 */
export async function notifyAdmins(
  db: Firestore,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  try {
    // Fetch UIDs of users with role == "admin"
    const adminQuery = query(
      collection(db, "users"),
      where("role", "==", "admin")
    );
    const snap = await getDocs(adminQuery);

    // Also fetch by hardcoded emails
    const emailQuery = query(
      collection(db, "users"),
      where("email", "in", HARDCODED_ADMIN_EMAILS)
    );
    const emailSnap = await getDocs(emailQuery);

    // Deduplicate UIDs
    const adminUids = new Set<string>();
    snap.forEach((d) => adminUids.add(d.id));
    emailSnap.forEach((d) => adminUids.add(d.id));

    // Write one notification per admin
    const writes = Array.from(adminUids).map((uid) =>
      createNotification(db, uid, title, message, type)
    );
    await Promise.all(writes);
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
