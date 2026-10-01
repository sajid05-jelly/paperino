const fs = require('fs');
let f = fs.readFileSync('src/components/FloatingFeedback.tsx', 'utf8');
f = f.replace(/onClick=\{\(\) => playPop\(\)\}/g, '');
fs.writeFileSync('src/components/FloatingFeedback.tsx', f);

let s = fs.readFileSync('src/components/SuggestSubjectModal.tsx', 'utf8');
s = s.replace(/if \(playSuccess\)/g, '');
fs.writeFileSync('src/components/SuggestSubjectModal.tsx', s);

console.log("Fixed remaining sound traces");
