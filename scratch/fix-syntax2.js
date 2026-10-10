const fs = require('fs');

let content = fs.readFileSync('src/app/exam-emergency/page.tsx', 'utf8');

if (!content.includes('usePlanGate')) {
  content = content.replace(
    'import { getCurrentMonthKey } from "@/lib/subscription";',
    'import { getCurrentMonthKey } from "@/lib/subscription";\nimport { usePlanGate } from "@/context/PlanGateContext";'
  );
}

if (!content.includes('const { showPlanGate } = usePlanGate();')) {
  content = content.replace(
    'export default function ExamEmergencyPage() {',
    'export default function ExamEmergencyPage() {\n  const { showPlanGate } = usePlanGate();'
  );
}

const search = `            {/* Selector Card */}
            <div className="backdrop-blur-3xl bg-white/[0.04] border border-violet-500/20 hover:border-violet-500/40 transition-all duration-500 rounded-3xl p-8 shadow-[0_0_55px_rgba(var(--primary-rgb),0.15)] max-w-xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[rgba(var(--primary-rgb),0.06)] blur-[80px] rounded-full pointer-events-none" />`;

const replacement = `            {/* Selector Card */}
            {!isEmergencyAllowed ? (
              <div className="backdrop-blur-3xl bg-white/[0.04] border border-purple-500/30 hover:border-purple-500/50 transition-all duration-500 rounded-3xl p-12 shadow-[0_0_55px_rgba(var(--primary-rgb),0.15)] max-w-xl mx-auto relative overflow-hidden flex flex-col items-center justify-center text-center">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-[rgba(var(--primary-rgb),0.06)] blur-[80px] rounded-full pointer-events-none" />
                 
                 <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 border border-purple-500/30">
                    <Lock className="w-8 h-8 text-purple-400" />
                 </div>
                 
                 <h2 className="text-2xl font-bold text-white mb-3">Locked Feature</h2>
                 <p className="text-gray-400 mb-8 max-w-sm">Exam Emergency Mode is available with Paperino Pro and Premium.</p>
                 
                 <button 
                   onClick={() => showPlanGate("Exam Emergency Mode", "pro", "Upgrade to Pro to unlock Exam Emergency Mode.")} 
                   className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:scale-105"
                 >
                   Upgrade to Pro
                 </button>
              </div>
            ) : (
            <div className="backdrop-blur-3xl bg-white/[0.04] border border-violet-500/20 hover:border-violet-500/40 transition-all duration-500 rounded-3xl p-8 shadow-[0_0_55px_rgba(var(--primary-rgb),0.15)] max-w-xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[rgba(var(--primary-rgb),0.06)] blur-[80px] rounded-full pointer-events-none" />`;

content = content.replace(search, replacement);

const searchEnd = `                <span className="relative z-10 tracking-wide uppercase text-sm">Activate Emergency Mode</span>
              </button>
            </div>
          </div>
        ) : (`;

const replacementEnd = `                <span className="relative z-10 tracking-wide uppercase text-sm">Activate Emergency Mode</span>
              </button>
            </div>
            )}
          </div>
        ) : (`;

content = content.replace(searchEnd, replacementEnd);

fs.writeFileSync('src/app/exam-emergency/page.tsx', content);
