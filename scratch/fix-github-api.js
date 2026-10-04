
const fs = require("fs");
const path = "./src/app/api/github-intelligence/route.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  /return NextResponse\.json\(\{ error: "Failed to allocate usage\." \}, \{ status: 429 \}\);/g,
  `return NextResponse.json({ error: "Failed to allocate usage.", limit: entitlement.limit, plan: entitlement.plan }, { status: 429 });`
);

fs.writeFileSync(path, code);
console.log("Updated github-intelligence API route");

