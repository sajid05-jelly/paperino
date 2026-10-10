const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Add usePlanGate and useRouter if not present
if (!content.includes('usePlanGate')) {
  content = content.replace(
    'import { useAuth } from "@/context/AuthContext";',
    'import { useAuth } from "@/context/AuthContext";\nimport { usePlanGate } from "@/context/PlanGateContext";\nimport { useRouter } from "next/navigation";'
  );
}

// 2. Destructure showPlanGate and router inside Navbar()
if (!content.includes('showPlanGate')) {
  content = content.replace(
    'export default function Navbar() {',
    'export default function Navbar() {\n  const { showPlanGate } = usePlanGate();\n  const router = useRouter();'
  );
}

// 3. Replace the Exam Emergency link precisely
const targetStr = `                  <Link
                    href="/exam-emergency"
                    onClick={() => setIsLabsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-bold group/item"
                  >
                    <ShieldAlert size={15} className="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] group-hover/item:text-cyan-400 transition-colors shrink-0" /> Exam Emergency
                  </Link>`;

const replacementStr = `                  <button
                    onClick={() => {
                      setIsLabsOpen(false);
                      if (plan === "free" || plan === "plus") {
                        showPlanGate("Exam Emergency Mode", "pro", "Upgrade to Pro to unlock Exam Emergency Mode.");
                      } else {
                        router.push("/exam-emergency");
                      }
                    }}
                    className="w-full flex items-center justify-start gap-2.5 px-3.5 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-bold group/item text-left"
                  >
                    <ShieldAlert size={15} className="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] group-hover/item:text-cyan-400 transition-colors shrink-0" /> Exam Emergency
                  </button>`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync('src/components/Navbar.tsx', content);
