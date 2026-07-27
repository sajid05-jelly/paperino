import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function logAdminAction(adminEmail: string, actionType: string, targetId: string, details: string) {
  try {
    await addDoc(collection(db, "admin_logs"), {
      adminEmail,
      actionType,
      targetId,
      details,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
}
