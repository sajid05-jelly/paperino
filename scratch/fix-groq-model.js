const fs = require('fs');

let f = fs.readFileSync('src/services/groqService.ts', 'utf8');

f = f.replace(/const MODEL = "llama-3\.3-70b-versatile";/, 'const MODEL = "llama-3.1-70b-versatile";');
f = f.replace(/console\.log\("Using Groq Llama 3\.3 70B"\);/, 'console.log("Using Groq Llama 3.1 70B");');

fs.writeFileSync('src/services/groqService.ts', f);
console.log("Updated Groq model");
