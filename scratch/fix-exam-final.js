const fs = require('fs');

let content = fs.readFileSync('src/app/exam-emergency/page.tsx', 'utf8');
// Normalize line endings for reliable replacing
content = content.replace(/\r\n/g, '\n');

// 1. Add usePlanGate import
if (!content.includes('usePlanGate')) {
  content = content.replace(
    'import { getCurrentMonthKey } from "@/lib/subscription";',
    'import { getCurrentMonthKey } from "@/lib/subscription";\nimport { usePlanGate } from "@/context/PlanGateContext";'
  );
}

// 2. Destructure showPlanGate
if (!content.includes('const { showPlanGate } = usePlanGate();')) {
  content = content.replace(
    'export default function ExamEmergencyPage() {',
    'export default function ExamEmergencyPage() {\n  const { showPlanGate } = usePlanGate();'
  );
}

// 3. The replacement for the Selector Card
// Instead of a giant exact string, let's use a regex that matches from {/* Selector Card */} up to {/* Department */}

const regex = /\{\/\*\s*Selector Card\s*\*\/\}\n\s*<div className="backdrop-blur-3xl bg-white\/\[0\.04\] border border-violet-500\/20 hover:border-violet-500\/40 transition-all duration-500 rounded-3xl p-8 shadow-\[0_0_55px_rgba\(var\(--primary-rgb\),0\.15\)\] max-w-xl mx-auto relative overflow-hidden">([\s\S]*?)\{\/\*\s*Department\s*\*\/\}/m;

const replacement = `{/* Selector Card */}
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
              <div className="absolute top-0 right-0 w-48 h-48 bg-[rgba(var(--primary-rgb),0.06)] blur-[80px] rounded-full pointer-events-none" />
              
              {/* Monthly usage indicator */}
              <div className="mb-8">
                {isAdmin || plan === "premium" ? (
                  <div className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold text-xs shadow-md">
                    <InfinityIcon size={14} className="text-violet-400" />
                    {isAdmin ? "Admin" : "Premium"}: Unlimited Access
                  </div>
                ) : (
                  <div className={\`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full border text-xs font-bold transition-all \${
                    getRemainingUses() === 0 
                      ? "bg-red-500/10 border-red-500/25 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                      : "bg-red-500/5 border-red-500/20 text-red-300/90 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                  }\`}>
                    <Zap size={14} className={getRemainingUses() === 0 ? "text-red-400 animate-pulse" : "text-red-400"} />
                    Emergency Uses Remaining: {getRemainingUses()}/{monthlyLimit} (Pro Plan)
                  </div>
                )}
              </div>

              <div className="space-y-5 text-left relative z-10">
                {/* Department */}`;

content = content.replace(regex, replacement);

const regexEnd = /<span className="relative z-10 tracking-wide uppercase text-sm">Activate Emergency Mode<\/span>\n\s*<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*\)\s*:\s*\(/;

const replacementEnd = `<span className="relative z-10 tracking-wide uppercase text-sm">Activate Emergency Mode</span>
              </button>
            </div>
            )}
          </div>
        ) : (`;

content = content.replace(regexEnd, replacementEnd);

fs.writeFileSync('src/app/exam-emergency/page.tsx', content);
console.log("Successfully fixed!");
