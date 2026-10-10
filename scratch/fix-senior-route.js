const fs = require('fs');

let content = fs.readFileSync('src/app/survival-notes/page.tsx', 'utf8');

// Ensure usePlanGate is imported
if (!content.includes('usePlanGate')) {
  content = content.replace(
    'import { useAuth } from "@/context/AuthContext";',
    'import { useAuth } from "@/context/AuthContext";\nimport { usePlanGate } from "@/context/PlanGateContext";'
  );
}

// Ensure showPlanGate is destructured
if (!content.includes('const { showPlanGate } = usePlanGate();')) {
  content = content.replace(
    'export default function SeniorInsightsPage() {',
    'export default function SeniorInsightsPage() {\n  const { showPlanGate } = usePlanGate();'
  );
}

// Ensure router is imported and destructured
if (!content.includes('useRouter')) {
  content = content.replace(
    'import Link from "next/link";',
    'import Link from "next/link";\nimport { useRouter } from "next/navigation";'
  );
  if (!content.includes('const router = useRouter();')) {
    content = content.replace(
      'export default function SeniorInsightsPage() {\n  const { showPlanGate } = usePlanGate();',
      'export default function SeniorInsightsPage() {\n  const { showPlanGate } = usePlanGate();\n  const router = useRouter();'
    );
  }
}

// Add early return for FREE
const earlyReturnCode = `
  // Route-level protection for direct access
  useEffect(() => {
    if (plan === "free") {
      showPlanGate("Senior Insights", "plus", "Upgrade to Plus to unlock Senior Insights.");
    }
  }, [plan, showPlanGate]);

  if (plan === "free") {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-[rgba(var(--primary-rgb),0.15)] via-[var(--background)] to-[var(--background)] text-white py-8 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:45px_45px]" />
        
        <div className="backdrop-blur-3xl bg-white/[0.04] border border-violet-500/30 rounded-3xl p-12 max-w-xl mx-auto relative overflow-hidden flex flex-col items-center justify-center text-center z-10 shadow-[0_0_55px_rgba(139,92,246,0.15)]">
           <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 blur-[80px] rounded-full pointer-events-none" />
           <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mb-6 border border-violet-500/30">
              <Lock className="w-8 h-8 text-violet-400" />
           </div>
           <h1 className="text-3xl font-bold text-white mb-4">Senior Insights</h1>
           <h2 className="text-xl font-semibold text-violet-300 mb-3">Locked Feature</h2>
           <p className="text-gray-400 mb-8 max-w-sm">This feature is exclusively available on Paperino Plus, Pro, and Premium.</p>
           
           <button 
             onClick={() => showPlanGate("Senior Insights", "plus", "Upgrade to Plus to unlock Senior Insights.")} 
             className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-105"
           >
             Upgrade to Plus
           </button>
        </div>
      </div>
    );
  }
`;

if (!content.includes('// Route-level protection for direct access')) {
  content = content.replace(
    '  const [selectedDept, setSelectedDept] = useState("");',
    earlyReturnCode + '\n  const [selectedDept, setSelectedDept] = useState("");'
  );
}

fs.writeFileSync('src/app/survival-notes/page.tsx', content);
console.log("Senior Insights page fixed with early return.");
