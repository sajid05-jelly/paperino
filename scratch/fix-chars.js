const fs = require('fs');
let content = fs.readFileSync('src/app/pyq/page.tsx', 'utf8');
content = content.replace(/<p className="text-gray-400 mb-8 text-lg">.*?<\/p>/, '<p className="text-gray-400 mb-8 text-lg">PYQ Analyzer is available on Paperino Plus and above.</p>');
fs.writeFileSync('src/app/pyq/page.tsx', content);
