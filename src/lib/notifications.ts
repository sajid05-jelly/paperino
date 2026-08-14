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
 * Write a single notification to Firestore for a specific user (NO-OP: Legacy notification system removed).
 */
export async function createNotification(
  _db: any,
  _userId: string,
  _title: string,
  _message: string,
  _type: NotificationType
): Promise<void> {
  // No-op: Notifications collection writes disabled to save Firestore quota
}

export const notifyUser = createNotification;

/**
 * Broadcast a notification to all admins (NO-OP: Legacy notification system removed).
 */
export async function notifyAdmins(
  _db: any,
  _title: string,
  _message: string,
  _type: NotificationType
): Promise<void> {
  // No-op: Notifications collection writes disabled to save Firestore quota
}
