const fs = require('fs');
let content = fs.readFileSync('src/app/exam-emergency/page.tsx', 'utf8');

const regex = /<span className="relative z-10 tracking-wide uppercase text-sm">Activate Emergency Mode<\/span>\r?\n\s*<\/button>\r?\n\s*<\/div>\r?\n\s*<\/div>\r?\n\s*}\r?\n\r?\n\s*\) : \(/;
const replacement = `<span className="relative z-10 tracking-wide uppercase text-sm">Activate Emergency Mode</span>
              </button>
            </div>
            )}
          </div>
        ) : (`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/app/exam-emergency/page.tsx', content);
