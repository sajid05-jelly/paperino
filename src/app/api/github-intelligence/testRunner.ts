import { GET } from "./route";
import { NextRequest } from "next/server";

async function testProfile(username: string) {
  const req = new NextRequest(`http://localhost:3000/api/github-intelligence?username=${username}&refresh=true`);
  const res = await GET(req);
  const data = await res.json();

  console.log("==================================================");
  console.log(`V7 STRICT EVIDENCE SCORING AUDIT FOR @${username}`);
  console.log("==================================================");
  console.log("Public Repos:", data.publicReposCount);
  console.log("Followers:", data.followers);
  console.log("Meaningful Projects:", data.developerMetrics?.transparencyAudit?.meaningfulProjects);
  console.log("FINAL DEVELOPER SCORE:", data.developerMetrics?.score, "/ 100");
  console.log("Score Level:", data.developerMetrics?.level);
  console.log("Engine Version:", data.developerMetrics?.analysisVersion);
  console.log("--- CATEGORY BREAKDOWN ---");
  console.log("1. Flagship Project Quality:", data.developerMetrics?.scoreBreakdown?.bestProjectQuality?.score, "/", data.developerMetrics?.scoreBreakdown?.bestProjectQuality?.max);
  console.log("2. Overall Codebase Quality:", data.developerMetrics?.scoreBreakdown?.overallProjectQuality?.score, "/", data.developerMetrics?.scoreBreakdown?.overallProjectQuality?.max);
  console.log("3. Technical Depth:", data.developerMetrics?.scoreBreakdown?.technicalDepth?.score, "/", data.developerMetrics?.scoreBreakdown?.technicalDepth?.max);
  console.log("4. Engineering Practices:", data.developerMetrics?.scoreBreakdown?.engineeringPractices?.score, "/", data.developerMetrics?.scoreBreakdown?.engineeringPractices?.max);
  console.log("5. Completeness & Deployment:", data.developerMetrics?.scoreBreakdown?.portfolioDepth?.score, "/", data.developerMetrics?.scoreBreakdown?.portfolioDepth?.max);
  console.log("6. Documentation:", data.developerMetrics?.scoreBreakdown?.documentation?.score, "/", data.developerMetrics?.scoreBreakdown?.documentation?.max);
  console.log("7. Consistency:", data.developerMetrics?.scoreBreakdown?.maintenanceConsistency?.score, "/", data.developerMetrics?.scoreBreakdown?.maintenanceConsistency?.max);
  console.log("8. Collaboration / Open Source:", data.developerMetrics?.scoreBreakdown?.collaborationOpenSource?.score, "/", data.developerMetrics?.scoreBreakdown?.collaborationOpenSource?.max);
}

async function runAllTests() {
  await testProfile("sarcasticadmin");
  await testProfile("danujaya00");
}

runAllTests();
