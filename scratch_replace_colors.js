const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Violet
    content = content.replace(/rgba\(139,\s*92,\s*246,/g, 'rgba(var(--primary-rgb),');
    content = content.replace(/rgba\(167,\s*139,\s*250,/g, 'rgba(var(--primary-rgb),');
    content = content.replace(/rgba\(168,\s*85,\s*247,/g, 'rgba(var(--primary-rgb),');

    // Fuchsia
    content = content.replace(/rgba\(217,\s*70,\s*239,/g, 'rgba(var(--secondary-rgb),');
    content = content.replace(/rgba\(192,\s*38,\s*211,/g, 'rgba(var(--secondary-rgb),');

    // Cyan
    content = content.replace(/rgba\(6,\s*182,\s*212,/g, 'rgba(var(--accent-rgb),');
    
    // Some ThemeSelector ones were recently added as explicit RGBs, let's keep ThemeSelector intact so previews work
    if (!filePath.includes('ThemeSelector.tsx')) {
        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated: ' + filePath);
        }
    }
  }
});
console.log("Done!");
