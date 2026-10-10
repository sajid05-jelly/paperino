const fs = require('fs');
let lines = fs.readFileSync('src/app/exam-emergency/page.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('          )}')) {
    if (lines[i+2].includes('        ) : (')) {
      // It is exactly here
      lines[i] = '            )}';
      lines[i-1] = '          </div>'; // The div that closes max-w-3xl
      lines[i-2] = '            </div>'; // The div that closes the Selector Card
      break;
    }
  }
}

fs.writeFileSync('src/app/exam-emergency/page.tsx', lines.join('\n'));
