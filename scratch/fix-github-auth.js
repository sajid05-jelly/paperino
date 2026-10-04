
const fs = require("fs");
const path = "./src/app/github-intelligence/page.tsx";
let code = fs.readFileSync(path, "utf8");

// 1. Import useAuth
if (!code.includes("useAuth")) {
  code = code.replace(
    /import \{ usePlanGate \} from "@\/context\/PlanGateContext";/,
    `import { usePlanGate } from "@/context/PlanGateContext";\nimport { useAuth } from "@/context/AuthContext";`
  );
}

// 2. Add useAuth hook
if (!code.includes("loading: authLoading")) {
  code = code.replace(
    /const \{ showLimitGate \} = usePlanGate\(\);/,
    `const { showLimitGate } = usePlanGate();\n  const { user, loading: authLoading } = useAuth();`
  );
}

// 3. Update fetchAnalysis
if (!code.includes("user.getIdToken")) {
  code = code.replace(
    /const fetchAnalysis = async \(forceRefresh = false\) => \{[\s\n]*if \(!username\.trim\(\)\) \{[\s\n]*setError\("Please enter a valid GitHub username\."\);[\s\n]*return;[\s\n]*\}/,
    `const fetchAnalysis = async (forceRefresh = false) => {
    if (!username.trim()) {
      setError("Please enter a valid GitHub username.");
      return;
    }
    
    if (authLoading) return;
    
    if (!user) {
      setError("Your session has expired. Please sign in again.");
      return;
    }`
  );
}

// 4. Update the fetch call
if (!code.includes("Authorization: `Bearer ${idToken}`")) {
  code = code.replace(
    /const res = await fetch\(`\/api\/github-intelligence\?username=\$\{encodeURIComponent\(cleanUser\)\}\$\{forceRefresh \? "&refresh=true" : ""\}`\);/,
    `const idToken = await user.getIdToken();
      const res = await fetch(\`/api/github-intelligence?username=\${encodeURIComponent(cleanUser)}\${forceRefresh ? "&refresh=true" : ""}\`, {
        headers: {
          Authorization: \`Bearer \${idToken}\`
        }
      });`
  );
}

// 5. Update disabled={loading} to disabled={loading || authLoading}
code = code.replace(/disabled=\{loading\}/g, "disabled={loading || authLoading}");

fs.writeFileSync(path, code);
console.log("Updated github-intelligence/page.tsx with auth fixes");

