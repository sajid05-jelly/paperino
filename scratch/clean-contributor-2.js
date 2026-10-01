const fs = require('fs');

let c = fs.readFileSync('src/app/contributor/page.tsx', 'utf8');

c = c.replace(/const \{ userStatusUpdates, dashboardUnreadCount, markDashboardSeen \} = useBadges\(\);\n?/, '');
c = c.replace(/const \{ showToast, dismissToast \} = useToast\(\);/, 'const { showToast, dismissToast } = useToast();\n  const dashboardUnreadCount = 0;');

c = c.replace(/<button\s+onClick=\{\(\) => handleSelectTab\("updates"\)\}[\s\S]*?<\/button>/m, '');
c = c.replace(/\{\/\* SUBMISSION UPDATES & STATUS NOTIFICATIONS TAB \*\/\}[\s\S]*?(?=\s*<\/div>\n\s*\)\}\n\n\s*\{\/\* Editing Modal \*\/)/m, '');

c = c.replace(/const \[dashboardTab, setDashboardTab\] = useState<"overview" \| "uploads" \| "updates">/g, 'const [dashboardTab, setDashboardTab] = useState<"overview" | "uploads">');
c = c.replace(/const handleSelectTab = \(tab: "overview" \| "uploads" \| "updates"\) => \{[\s\S]*?setDashboardTab\(tab\);\n\s*if \(tab === "updates"\) \{\n\s*markDashboardSeen\(\);\n\s*\}\n\s*\};/m, 'const handleSelectTab = (tab: "overview" | "uploads") => {\n    setDashboardTab(tab);\n  };');

fs.writeFileSync('src/app/contributor/page.tsx', c);
console.log("Properly cleaned contributor page");
