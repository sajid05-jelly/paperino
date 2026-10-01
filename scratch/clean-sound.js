const fs = require('fs');

const filesToClean = [
  'src/app/admin/courses/page.tsx',
  'src/components/CreateCourseModal.tsx',
  'src/components/FloatingFeedback.tsx',
  'src/components/QuickUploadModal.tsx',
  'src/components/SuggestSubjectModal.tsx'
];

filesToClean.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/import \{ useSound \} from "@\/hooks\/useSound";\n?/g, '');
    content = content.replace(/const \{ playSuccess \} = useSound\(\);\n?/g, '');
    content = content.replace(/const \{ playPop \} = useSound\(\);\n?/g, '');
    content = content.replace(/playSuccess\(\);\n?/g, '');
    content = content.replace(/playPop\(\);\n?/g, '');
    fs.writeFileSync(file, content);
  }
});

// Delete useSound.ts entirely
if (fs.existsSync('src/hooks/useSound.ts')) {
  fs.unlinkSync('src/hooks/useSound.ts');
}

console.log("Cleaned sound usages");
