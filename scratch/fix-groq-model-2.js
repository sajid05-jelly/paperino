const fs = require('fs');

let f = fs.readFileSync('src/services/groqService.ts', 'utf8');

f = f.replace(/const MODEL = "llama-3\.1-70b-versatile";/, 'const MODEL = "openai/gpt-oss-120b";');
f = f.replace(/console\.log\("Using Groq Llama 3\.1 70B"\);/, 'console.log("Using Groq GPT-OSS 120B");');

fs.writeFileSync('src/services/groqService.ts', f);
console.log("Updated Groq model to openai/gpt-oss-120b");
