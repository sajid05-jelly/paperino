
const fs = require("fs");
const path = "./src/app/github-intelligence/page.tsx";
let code = fs.readFileSync(path, "utf8");

// Import AICreditsDisplay
if (!code.includes("AICreditsDisplay")) {
  code = code.replace(
    /import \{ usePlanGate \} from "@\/context\/PlanGateContext";/,
    `import { usePlanGate } from "@/context/PlanGateContext";\nimport AICreditsDisplay from "@/components/AICreditsDisplay";`
  );
}

// Add the credits display below the description
if (!code.includes("<AICreditsDisplay tool=\"github\" />")) {
  code = code.replace(
    /<p className="text-gray-300 text-base md:text-lg leading-relaxed font-light">\s*Analyze your GitHub profile and discover your real developer strengths\.\s*<\/p>/,
    `<p className="text-gray-300 text-base md:text-lg leading-relaxed font-light">
            Analyze your GitHub profile and discover your real developer strengths.
          </p>
          <div className="mt-4">
            <AICreditsDisplay tool="github" />
          </div>`
  );
}

fs.writeFileSync(path, code);
console.log("Updated github-intelligence/page.tsx");

