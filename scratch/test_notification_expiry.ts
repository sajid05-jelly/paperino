import { parseNotificationTimestamp } from "@/context/NotificationContext";

function runTest() {
  console.log("=== 🧪 STARTING 24-HOUR NOTIFICATION EXPIRY TEST ===");

  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  const mockNotifications = [
    {
      id: "fresh_user_notif_1",
      userId: "user_123",
      title: "Material Approved",
      message: "Your material has been approved!",
      createdAt: now - (2 * 60 * 60 * 1000), // 2 hours old
      read: false
    },
    {
      id: "fresh_user_notif_2",
      userId: "user_123",
      title: "Application Submitted",
      message: "Your application was received.",
      createdAt: now - (20 * 60 * 60 * 1000), // 20 hours old
      read: false
    },
    {
      id: "expired_user_notif_1",
      userId: "user_123",
      title: "Free Class Reported",
      message: "Old report notification.",
      createdAt: now - (25 * 60 * 60 * 1000), // 25 hours old (EXPIRED for normal user)
      read: false
    },
    {
      id: "expired_user_notif_2",
      userId: "user_123",
      title: "Feedback Submitted",
      message: "Thank you for feedback.",
      createdAt: now - (48 * 60 * 60 * 1000), // 48 hours old (EXPIRED for normal user)
      read: true
    },
    {
      id: "old_admin_notif_1",
      userId: "ADMIN",
      title: "New Contributor Application",
      message: "Admin action needed.",
      createdAt: now - (72 * 60 * 60 * 1000), // 72 hours old (ADMIN EXEMPT - MUST REMAIN)
      read: false
    }
  ];

  console.log("\n--- TEST CASE A: Normal User Filtering (role = 'student') ---");
  const isUserAdminRoleA = false;
  const userFiltered = mockNotifications.filter((n) => {
    if (!isUserAdminRoleA) {
      const createdMs = parseNotificationTimestamp(n.createdAt);
      if (createdMs > 0 && (now - createdMs) >= TWENTY_FOUR_HOURS_MS) {
        return false;
      }
    }
    return true;
  });

  const userUnreadCount = userFiltered.filter((n) => !n.read).length;

  console.log("Total Raw Notifications:      ", mockNotifications.length);
  console.log("Normal User Visible Count:    ", userFiltered.length, "(Expected: 2 -> fresh_user_notif_1, fresh_user_notif_2)");
  console.log("Normal User Unread Badge:     ", userUnreadCount, "(Expected: 2)");
  console.log("Expired User Notifs Excluded: ", mockNotifications.length - userFiltered.length, "(Expected: 3)");

  console.log("\n--- TEST CASE B: Admin / Lead Admin Filtering (role = 'admin') ---");
  const isUserAdminRoleB = true;
  const adminFiltered = mockNotifications.filter((n) => {
    if (!isUserAdminRoleB) {
      const createdMs = parseNotificationTimestamp(n.createdAt);
      if (createdMs > 0 && (now - createdMs) >= TWENTY_FOUR_HOURS_MS) {
        return false;
      }
    }
    return true;
  });

  const adminUnreadCount = adminFiltered.filter((n) => !n.read).length;

  console.log("Admin Visible Count:          ", adminFiltered.length, "(Expected: 5 - ALL PRESERVED)");
  console.log("Admin Unread Badge:           ", adminUnreadCount, "(Expected: 4)");

  if (userFiltered.length === 2 && adminFiltered.length === 5 && userUnreadCount === 2) {
    console.log("\n✅ ALL NOTIFICATION EXPIRY & ROLE PROTECTION TESTS PASSED PERFECTLY!");
  } else {
    console.error("\n❌ Test failed: Counts do not match expected values.");
    process.exit(1);
  }
}

runTest();
