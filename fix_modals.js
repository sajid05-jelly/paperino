const fs = require('fs');
const files = ['src/components/AvatarSelectorModal.tsx', 'src/components/FeedbackModal.tsx', 'src/components/QuickUploadModal.tsx', 'src/components/SuggestSubjectModal.tsx'];
files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('document.body.style.overflow =')) {
    const insert = 
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

;
    code = code.replace(/if\s*\(\!isOpen\)\s*return\s*null;/, match => insert + match);
    fs.writeFileSync(file, code);
    console.log('Updated ' + file);
  }
});
