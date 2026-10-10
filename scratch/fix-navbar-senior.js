const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

const targetStr = `                  <Link
                    href="/survival-notes"
                    onClick={() => setIsLabsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-bold group/item"
                  >
                    <GraduationCap size={15} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] group-hover/item:text-cyan-400 transition-colors shrink-0" /> Senior Insights
                  </Link>`;

const replacementStr = `                  <button
                    onClick={() => {
                      setIsLabsOpen(false);
                      if (plan === "free") {
                        showPlanGate("Senior Insights", "plus", "Upgrade to Plus to unlock Senior Insights.");
                      } else {
                        router.push("/survival-notes");
                      }
                    }}
                    className="w-full flex items-center justify-start gap-2.5 px-3.5 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-bold group/item text-left"
                  >
                    <GraduationCap size={15} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] group-hover/item:text-cyan-400 transition-colors shrink-0" /> Senior Insights
                  </button>`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync('src/components/Navbar.tsx', content);
