const fs = require('fs');

let content = fs.readFileSync('src/app/exam-emergency/page.tsx', 'utf8');

// Ensure usePlanGate is imported
if (!content.includes('usePlanGate')) {
  content = content.replace(
    'import { getCurrentMonthKey } from "@/lib/subscription";',
    'import { getCurrentMonthKey } from "@/lib/subscription";\nimport { usePlanGate } from "@/context/PlanGateContext";'
  );
}

// Ensure showPlanGate is destructured
if (!content.includes('const { showPlanGate } = usePlanGate();')) {
  content = content.replace(
    'export default function ExamEmergencyPage() {',
    'export default function ExamEmergencyPage() {\n  const { showPlanGate } = usePlanGate();'
  );
}

// Ensure router is imported and destructured
if (!content.includes('useRouter')) {
  content = content.replace(
    'import Link from "next/link";',
    'import Link from "next/link";\nimport { useRouter } from "next/navigation";'
  );
  content = content.replace(
    'export default function ExamEmergencyPage() {',
    'export default function ExamEmergencyPage() {\n  const router = useRouter();'
  );
}

// Add early return for FREE/PLUS
const earlyReturnCode = `
  // Route-level protection for direct access
  useEffect(() => {
    if (plan === "free" || plan === "plus") {
      showPlanGate("Exam Emergency Mode", "pro", "Upgrade to Pro to unlock Exam Emergency Mode.");
    }
  }, [plan, showPlanGate]);

  if (plan === "free" || plan === "plus") {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-[rgba(var(--primary-rgb),0.15)] via-[var(--background)] to-[var(--background)] text-white py-8 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:45px_45px]" />
        
        <div className="backdrop-blur-3xl bg-white/[0.04] border border-purple-500/30 rounded-3xl p-12 max-w-xl mx-auto relative overflow-hidden flex flex-col items-center justify-center text-center z-10 shadow-[0_0_55px_rgba(168,85,247,0.15)]">
           <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
           <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 border border-purple-500/30">
              <Lock className="w-8 h-8 text-purple-400" />
           </div>
           <h1 className="text-3xl font-bold text-white mb-4">Exam Emergency Mode</h1>
           <h2 className="text-xl font-semibold text-purple-300 mb-3">Locked Feature</h2>
           <p className="text-gray-400 mb-8 max-w-sm">This feature is exclusively available on Paperino Pro and Premium.</p>
           
           <button 
             onClick={() => showPlanGate("Exam Emergency Mode", "pro", "Upgrade to Pro to unlock Exam Emergency Mode.")} 
             className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:scale-105"
           >
             Upgrade to Pro
           </button>
        </div>
      </div>
    );
  }
`;

if (!content.includes('// Route-level protection for direct access')) {
  content = content.replace(
    '  const currentSubjectObj = allSubjectsFlatList().find(s => s.id === selectedSubject);',
    earlyReturnCode + '\n  const currentSubjectObj = allSubjectsFlatList().find(s => s.id === selectedSubject);'
  );
}

fs.writeFileSync('src/app/exam-emergency/page.tsx', content);
console.log("Exam Emergency page fixed with early return.");
