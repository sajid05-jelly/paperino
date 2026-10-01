const fs = require('fs');
let c = fs.readFileSync('src/app/contributor/page.tsx', 'utf8');

const regex = /          \{editingMat && \(\n        <div className="fixed inset-0/;
const replacement = `        </div>
      )}

      {/* Editing Modal */}
      {editingMat && (
        <div className="fixed inset-0`;

c = c.replace(regex, replacement);

fs.writeFileSync('src/app/contributor/page.tsx', c);
console.log("Fixed missing closing tags");
