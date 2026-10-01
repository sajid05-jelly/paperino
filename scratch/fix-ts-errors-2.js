const fs = require('fs');

// Fix Navbar
let navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
navbar = navbar.replace(/const \{[\s\S]*?dashboardUnreadCount[\s\S]*?\} = useBadges\(\);/, (match) => match.replace('dashboardUnreadCount,', ''));
navbar = navbar.replace(/dashboardUnreadCount > 0 \|\| /g, '');
navbar = navbar.replace(/\+ dashboardUnreadCount/g, '');
fs.writeFileSync('src/components/Navbar.tsx', navbar);

// Fix FloatingFeedback
let feedback = fs.readFileSync('src/components/FloatingFeedback.tsx', 'utf8');
feedback = feedback.replace(/playPop\(\);/g, '');
fs.writeFileSync('src/components/FloatingFeedback.tsx', feedback);

// Fix SuggestSubjectModal
let suggestModal = fs.readFileSync('src/components/SuggestSubjectModal.tsx', 'utf8');
suggestModal = suggestModal.replace(/playSuccess\(\);/g, '');
fs.writeFileSync('src/components/SuggestSubjectModal.tsx', suggestModal);

// Clean contributor page remaining pieces
let contrib = fs.readFileSync('src/app/contributor/page.tsx', 'utf8');
contrib = contrib.replace(/const handleSelectTab = \(tab: "overview" \| "uploads" \| "updates"\) => \{[\s\S]*?\};/, 'const handleSelectTab = (tab: "overview" | "uploads") => { setDashboardTab(tab); };');
// The Updates block
const updatesRegex = /\{\/\*\s*SUBMISSION UPDATES & STATUS NOTIFICATIONS TAB\s*\*\/\}[\s\S]*?(?=\{\/\*\s*Editing Modal\s*\*\/\}|<div className="fixed inset-0)/m;
contrib = contrib.replace(updatesRegex, '');
fs.writeFileSync('src/app/contributor/page.tsx', contrib);

console.log("Fixed TS errors");
