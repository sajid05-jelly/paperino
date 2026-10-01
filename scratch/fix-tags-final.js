const fs = require('fs');
let c = fs.readFileSync('src/app/contributor/page.tsx', 'utf8');

const regex = /\{\/\* Editing Modal \*\/\}/;
const replacement = `        </div>
      )}

      {/* Editing Modal */}`;

c = c.replace(regex, replacement);

fs.writeFileSync('src/app/contributor/page.tsx', c);
console.log("Fixed missing closing tags again");
