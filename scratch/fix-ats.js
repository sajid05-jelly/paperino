const fs = require('fs');

let c = fs.readFileSync('src/app/api/ats/route.ts', 'utf8');

const regex1 = /let aiData;[\s\S]*?merge:\s*true\s*}\);\s*}\s*catch\s*\(e\)\s*{}\s*}\s*}/m;

const replacement1 = `  // CONSUME USAGE SAFELY BEFORE AI
  if (entitlement.uid && entitlement.limit !== Infinity) {
    const consumed = await consumeFeatureUsage(entitlement.uid, 'ats');
    if (!consumed) {
       return NextResponse.json({ error: "Failed to allocate monthly usage limit." }, { status: 429 });
    }
  }

  let aiData;
  try {
    console.log(\`[ATS] AI processing for semantic extraction via Groq...\`);
    aiData = await generateJSONResponse(prompt);
  } catch (err: any) {
    console.error(\`[ATS_ERROR_LOG] AI parsing failed: \${err.message}\`);
    if (entitlement.uid && entitlement.limit !== Infinity) {
        await refundFeatureUsage(entitlement.uid, 'ats');
    }
    return NextResponse.json({ error: "AI parsing failed. Please try again." }, { status: 504 });
  }

  // Phase 3: Deterministic Scoring Engine
  const finalResult = calculateFinalScores(extractionData, aiData);

  if (adminDb) {
    try {
      await adminDb.collection("platform_stats").doc("global").set({
        atsUsage: admin.firestore.FieldValue.increment(1)
      }, { merge: true });
    } catch (e) {}
  }`;

c = c.replace(regex1, replacement1);

const regex2 = /try\s*{\s*console\.log\("\[ATS\] Generating AI Career DNA parsing via Groq\.\.\."\);\s*const parsed = await generateJSONResponse\(prompt\);[\s\S]*?status:\s*500\s*}\);\s*}/m;

const replacement2 = `  // CONSUME USAGE SAFELY BEFORE AI
  if (entitlement.uid && entitlement.limit !== Infinity) {
    const consumed = await consumeFeatureUsage(entitlement.uid, 'ats');
    if (!consumed) {
       return NextResponse.json({ error: "Failed to allocate monthly usage limit." }, { status: 429 });
    }
  }

  try {
    console.log("[ATS] Generating AI Career DNA parsing via Groq...");
    const parsed = await generateJSONResponse(prompt);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("[ATS DNA Error]:", err.message);
    if (entitlement.uid && entitlement.limit !== Infinity) {
        await refundFeatureUsage(entitlement.uid, 'ats');
    }
    return NextResponse.json({ error: "Resume analysis failed: " + err.message }, { status: 500 });
  }`;

c = c.replace(regex2, replacement2);

fs.writeFileSync('src/app/api/ats/route.ts', c);
console.log("Replaced ATS successfully");
