
const fs = require("fs");
const path = "./src/app/api/ats/route.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  /return NextResponse\.json\(\{ error: "Failed to allocate monthly usage limit\." \}, \{ status: 429 \}\);/g,
  `return NextResponse.json({ error: "Failed to allocate monthly usage limit.", limit: entitlement.limit, plan: entitlement.plan }, { status: 429 });`
);

fs.writeFileSync(path, code);
console.log("Updated ats API route");

