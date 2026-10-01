const fs = require('fs');

let c = fs.readFileSync('src/context/BadgeContext.tsx', 'utf8');

c = c.replace(/\/\/ Contributor \/ User Dashboard Status Notifications & Badge[\s\S]*?refreshUserStatusUpdates: \(\) => Promise<void>;/, '');
c = c.replace(/userStatusUpdates: \[\],/, '');
c = c.replace(/dashboardUnreadCount: 0,/, '');
c = c.replace(/markDashboardSeen: \(\) => \{\},/, '');
c = c.replace(/refreshUserStatusUpdates: async \(\) => \{\},/, '');
c = c.replace(/\/\/ 2\. USER DASHBOARD STATUS NOTIFICATIONS[\s\S]*?const markDashboardSeen = useCallback\(\(\) => \{[\s\S]*?\}, \[user\]\);/, '');

c = c.replace(/userStatusUpdates,/, '');
c = c.replace(/dashboardUnreadCount,/, '');
c = c.replace(/markDashboardSeen,/, '');
c = c.replace(/refreshUserStatusUpdates: fetchUserStatusUpdates,/, '');
c = c.replace(/export interface UserStatusUpdate \{[\s\S]*?\}\n/, '');

fs.writeFileSync('src/context/BadgeContext.tsx', c);
console.log("Cleaned BadgeContext.tsx");
