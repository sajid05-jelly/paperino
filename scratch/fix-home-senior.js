const fs = require('fs');

let content = fs.readFileSync('src/app/page.tsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

const targetRegex = /<Link href="\/survival-notes" className="w-full flex">([\s\S]*?)<\/Link>/;

const replacementStr = `<div 
            onClick={() => {
              if (plan === "free") {
                showPlanGate("Senior Insights", "plus", "Upgrade to Plus to unlock Senior Insights.");
              } else {
                router.push("/survival-notes");
              }
            }} 
            className="w-full flex"
          >$1</div>`;

content = content.replace(targetRegex, replacementStr);

fs.writeFileSync('src/app/page.tsx', content);
