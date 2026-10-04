
const fs = require("fs");

// 1. Fix AuthContext.tsx
const authPath = "./src/context/AuthContext.tsx";
let authCode = fs.readFileSync(authPath, "utf8");

authCode = authCode.replace(
  /pyqUsed: number;\s*atsUsed: number;/,
  "pyqUsed: number;\n  atsUsed: number;\n  githubUsed: number;"
);

authCode = authCode.replace(
  /atsUsed: data\.ats \|\| 0,/,
  "atsUsed: data.ats || 0,\n              githubUsed: data.githubIntelligence || 0,"
);

authCode = authCode.replace(
  /setUserCredits\(\{ pyqUsed: 0, atsUsed: 0, lastResetDate: monthKey \}\);/,
  "setUserCredits({ pyqUsed: 0, atsUsed: 0, githubUsed: 0, lastResetDate: monthKey });"
);

fs.writeFileSync(authPath, authCode);
console.log("Updated AuthContext.tsx");

// 2. Fix AICreditsDisplay.tsx
const displayPath = "./src/components/AICreditsDisplay.tsx";
let displayCode = fs.readFileSync(displayPath, "utf8");

displayCode = displayCode.replace(
  /tool: "pyq" \| "ats";/,
  `tool: "pyq" | "ats" | "github";`
);

displayCode = displayCode.replace(
  /const featureKey = tool === "pyq" \? "pyqAnalyzer" : "ats";/,
  `const featureKey = tool === "pyq" ? "pyqAnalyzer" : tool === "github" ? "githubIntelligence" : "ats";`
);

displayCode = displayCode.replace(
  /used = tool === "pyq" \? \(userCredits\.pyqUsed \|\| 0\) : \(userCredits\.atsUsed \|\| 0\);/,
  `used = tool === "pyq" ? (userCredits.pyqUsed || 0) : tool === "github" ? (userCredits.githubUsed || 0) : (userCredits.atsUsed || 0);`
);

fs.writeFileSync(displayPath, displayCode);
console.log("Updated AICreditsDisplay.tsx");

