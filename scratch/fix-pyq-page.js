const fs = require('fs');

let pageContent = fs.readFileSync('src/app/pyq/page.tsx', 'utf8');

// 1. Add Lock to lucide-react imports if not there
if (!pageContent.includes('Lock,')) {
  pageContent = pageContent.replace(/import \{([^}]+)\} from "lucide-react";/, (match, p1) => {
    return `import { ${p1.trim()}, Lock } from "lucide-react";`;
  });
}

// 2. Destructure plan and showPlanGate
pageContent = pageContent.replace(
  /export default function PYQPredictorPage\(\) \{\s*const \{ showLimitGate \} = usePlanGate\(\);/,
  `export default function PYQPredictorPage() {
  const { plan, user } = useAuth();
  const { showLimitGate, showPlanGate } = usePlanGate();`
);

// 3. Add early return for free plan
const earlyReturn = `
  useEffect(() => {
    if (plan === "free") {
      showPlanGate("PYQ Analyzer", "plus", "Upgrade to Plus to unlock PYQ Analyzer.");
    }
  }, [plan, showPlanGate]);

  if (plan === "free") {
    return (
      <div className="w-full min-h-screen relative flex items-center justify-center overflow-hidden bg-[#050308]">
        {/* Background Gradients */}
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(109,40,217,0.14) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: "40%", right: "-10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(76,29,149,0.10) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(80px)" }} />
        
        <div className="relative z-10 text-center animate-in fade-in slide-in-from-bottom-5 duration-700 max-w-md px-6">
          <div className="mx-auto w-20 h-20 bg-violet-900/40 rounded-full flex items-center justify-center mb-6 border border-violet-500/30">
            <Lock className="w-10 h-10 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">PYQ Analyzer Locked</h1>
          <p className="text-gray-400 mb-8 text-lg">🔒 PYQ Analyzer is available on Paperino Plus and above.</p>
          <button 
            onClick={() => showPlanGate("PYQ Analyzer", "plus", "Upgrade to Plus to unlock PYQ Analyzer.")}
            className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-105"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }
`;

pageContent = pageContent.replace(
  /const handleDragOver = \(e: React.DragEvent\) => \{/,
  `${earlyReturn}\n  const handleDragOver = (e: React.DragEvent) => {`
);

fs.writeFileSync('src/app/pyq/page.tsx', pageContent);
console.log('Updated src/app/pyq/page.tsx');
