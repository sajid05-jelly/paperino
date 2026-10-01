const fs = require('fs');

let f = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Replace the destructured import from useBadges
f = f.replace(/dashboardUnreadCount\n\s*\} = useBadges\(\);/, '} = useBadges();\n  const dashboardUnreadCount = 0;');
f = f.replace(/,\s*dashboardUnreadCount\s*\} = useBadges\(\);/, '} = useBadges();\n  const dashboardUnreadCount = 0;');
f = f.replace(/dashboardUnreadCount,/g, '');

fs.writeFileSync('src/components/Navbar.tsx', f);
console.log("Fixed Navbar");
