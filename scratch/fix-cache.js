const fs = require('fs');

let content = fs.readFileSync('src/context/SubjectsContext.tsx', 'utf8');

// Replace localStorage with sessionStorage and change key to bust existing cache
content = content.replace(/localStorage\.getItem\("paperino_cached_departments"\)/g, 'sessionStorage.getItem("paperino_cached_depts_v2")');
content = content.replace(/localStorage\.getItem\("paperino_cached_departments_ts"\)/g, 'sessionStorage.getItem("paperino_cached_depts_ts_v2")');
content = content.replace(/localStorage\.setItem\("paperino_cached_departments"/g, 'sessionStorage.setItem("paperino_cached_depts_v2"');
content = content.replace(/localStorage\.setItem\("paperino_cached_departments_ts"/g, 'sessionStorage.setItem("paperino_cached_depts_ts_v2"');

fs.writeFileSync('src/context/SubjectsContext.tsx', content);
