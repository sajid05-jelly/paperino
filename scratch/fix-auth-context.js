
const fs = require("fs");
const path = "./src/context/AuthContext.tsx";
let code = fs.readFileSync(path, "utf8");

// Add getCurrentMonthKey to imports
code = code.replace(
  `import { PlanType, FeatureKey, getEffectivePlan, isFeatureAllowed } from "@/lib/subscription";`,
  `import { PlanType, FeatureKey, getEffectivePlan, isFeatureAllowed, getCurrentMonthKey } from "@/lib/subscription";`
);

// Replace creditsRef logic
const target = `// Subscribe to real-time user credits
        const creditsRef = doc(db, "user_credits", currentUser.uid);
        unsubCreditsDoc = onSnapshot(creditsRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserCredits({
              pyqUsed: data.pyqUsed || 0,
              atsUsed: data.atsUsed || 0,
              lastResetDate: data.lastResetDate || "",
            });
          } else {
            setUserCredits({ pyqUsed: 0, atsUsed: 0, lastResetDate: "" });
          }
        }, (err) => {
          console.warn("[AuthContext] Credits listener error:", err);
        });`;

const replacement = `// Subscribe to real-time user usage (single source of truth)
        const monthKey = getCurrentMonthKey();
        const usageRef = doc(db, "user_monthly_usage", \`\${currentUser.uid}_\${monthKey}\`);
        unsubCreditsDoc = onSnapshot(usageRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserCredits({
              pyqUsed: data.pyqAnalyzer || 0,
              atsUsed: data.ats || 0,
              lastResetDate: monthKey,
            });
          } else {
            setUserCredits({ pyqUsed: 0, atsUsed: 0, lastResetDate: monthKey });
          }
        }, (err) => {
          console.warn("[AuthContext] Usage listener error:", err);
        });`;

code = code.replace(target, replacement);
fs.writeFileSync(path, code);
console.log("Updated AuthContext.tsx");

