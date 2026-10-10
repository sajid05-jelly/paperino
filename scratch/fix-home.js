const fs = require('fs');

let content = fs.readFileSync('src/app/page.tsx', 'utf8');

if (!content.includes('usePlanGate')) {
  content = content.replace(
    'import Link from "next/link";',
    'import Link from "next/link";\nimport { useRouter } from "next/navigation";\nimport { useAuth } from "@/context/AuthContext";\nimport { usePlanGate } from "@/context/PlanGateContext";'
  );
}

if (!content.includes('const { plan } = useAuth();')) {
  content = content.replace(
    'export default function Home() {',
    'export default function Home() {\n  const router = useRouter();\n  const { plan } = useAuth();\n  const { showPlanGate } = usePlanGate();'
  );
}

const examCardRegex = /<Link\s+href="\/exam-emergency"\s+className="w-full\s+flex">([\s\S]*?)<\/Link>/;
const examCardReplacement = `<div 
            onClick={() => {
              if (plan === "free" || plan === "plus") {
                showPlanGate("Exam Emergency Mode", "pro", "Upgrade to Pro to unlock Exam Emergency Mode.");
              } else {
                router.push("/exam-emergency");
              }
            }} 
            className="w-full flex"
          >$1</div>`;

content = content.replace(examCardRegex, examCardReplacement);

fs.writeFileSync('src/app/page.tsx', content);
console.log("Home page fixed.");
