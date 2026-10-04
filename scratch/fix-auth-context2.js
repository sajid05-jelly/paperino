
const fs = require("fs");
const path = "./src/context/AuthContext.tsx";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  /const creditsRef = doc\(db, "user_credits", currentUser.uid\);[\s\S]*?console.warn\("\[AuthContext\] Credits listener error:", err\);\r?\n\s*\}\);/g,
  `const monthKey = getCurrentMonthKey();
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
        });`
);
fs.writeFileSync(path, code);
console.log("Updated AuthContext.tsx using regex");

