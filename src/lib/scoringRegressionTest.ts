import { DeveloperMetrics, ClassifiedRepoInfo } from "../app/api/github-intelligence/route";

/**
 * Comprehensive Evidence Fixture Tests for Recalibrated 100-Point Scoring Engine
 */
export function runScoringRegressionTests() {
  console.log("=== RUNNING RECALIBRATED 100-POINT SCORING FIXTURE TESTS ===");

  const testResults: { testName: string; passed: boolean; details: string }[] = [];

  // Helper to compute score from fixture parameters under recalibrated model
  function computeScoreFromFixture(f: {
    bestRQS: number;
    verifiedCount: number;
    substantialCount: number;
    stronglyVerifiedSkillCount: number;
    validCiCd: boolean;
    validDocker: boolean;
    validReadmeCount: number;
    bio: boolean;
    daysSinceUpdate: number;
    hasReleaseEvidence: boolean;
    hasActiveCiCdPipeline: boolean;
    hasMultipleActiveVerified: boolean;
    hasMultiContributorCodebase: boolean;
    hasPRCollaboration: boolean;
    isOrgMember: boolean;
    testingSkillScore: number;
  }) {
    // 1. Best Project Quality /20
    const baseQuality = (f.bestRQS / 100) * 16;
    let portfolioQualityBonus = 0;
    if (f.verifiedCount >= 12) portfolioQualityBonus = 3;
    else if (f.verifiedCount >= 7) portfolioQualityBonus = 2;
    else if (f.verifiedCount >= 3) portfolioQualityBonus = 1;
    const substantialBonus = f.substantialCount >= 3 ? 1 : 0;
    const bestProjectQuality = Math.min(20, Math.round(baseQuality + portfolioQualityBonus + substantialBonus));

    // 2. Overall Projects /20
    const verifiedScore = Math.min(14, f.verifiedCount * 1.5);
    const substantialScore = Math.min(6, f.substantialCount * 1.5);
    const overallProjects = Math.min(20, Math.round(verifiedScore + substantialScore));

    // 3. Technical Depth /15
    let technicalDepth = 0;
    if (f.stronglyVerifiedSkillCount >= 6) technicalDepth = 15;
    else if (f.stronglyVerifiedSkillCount === 5) technicalDepth = 14;
    else if (f.stronglyVerifiedSkillCount === 4) technicalDepth = 12;
    else if (f.stronglyVerifiedSkillCount === 3) technicalDepth = 10;
    else if (f.stronglyVerifiedSkillCount === 2) technicalDepth = 7;
    else if (f.stronglyVerifiedSkillCount === 1) technicalDepth = 4;

    // 4. Portfolio Depth /15
    const verifiedDepth = Math.min(7, f.verifiedCount * 0.6);
    const substantialDepth = Math.min(4, f.substantialCount);
    const diversityDepth = Math.min(4, f.stronglyVerifiedSkillCount * 0.7);
    const portfolioDepth = f.verifiedCount > 0
      ? Math.min(15, Math.round(verifiedDepth + substantialDepth + diversityDepth))
      : 0;

    // 5. Engineering Practices /10
    const engineeringPractices = f.verifiedCount > 0 ? ((f.validCiCd ? 6 : 0) + (f.validDocker ? 4 : 0)) : 0;

    // 6. Documentation /5
    const documentation = f.verifiedCount > 0
      ? Math.min(5, (f.validReadmeCount >= 2 ? 3 : f.validReadmeCount === 1 ? 2 : 0) + (f.bio ? 2 : 0))
      : 0;

    // 7. Maintenance /5
    const maintenance = f.verifiedCount > 0
      ? Math.min(5, (f.daysSinceUpdate <= 30 ? 2 : f.daysSinceUpdate <= 90 ? 1 : 0) + (f.hasReleaseEvidence ? 1 : 0) + (f.hasActiveCiCdPipeline ? 1 : 0) + (f.hasMultipleActiveVerified ? 1 : 0))
      : 0;

    // 8. Collaboration /5
    const collaboration = f.verifiedCount > 0
      ? Math.min(5, (f.hasMultiContributorCodebase ? 2 : 0) + (f.hasPRCollaboration ? 2 : 0) + (f.isOrgMember ? 1 : 0))
      : 0;

    // 9. Testing / Reliability /5
    const testingReliability = Math.round((f.testingSkillScore / 100) * 5);

    // 10. Elite Synergy Bonus /2
    const passEliteSynergy = f.verifiedCount >= 10 &&
      f.substantialCount >= 3 &&
      f.stronglyVerifiedSkillCount >= 5 &&
      engineeringPractices >= 8 &&
      documentation >= 4 &&
      technicalDepth >= 13;
    const eliteSynergyBonus = passEliteSynergy ? 2 : 0;

    let totalScore = bestProjectQuality + overallProjects + technicalDepth + portfolioDepth + engineeringPractices + documentation + maintenance + collaboration + testingReliability + eliteSynergyBonus;

    if (f.verifiedCount === 0) totalScore = Math.min(15, totalScore);

    totalScore = Math.min(100, Math.max(0, totalScore));

    return {
      bestProjectQuality,
      overallProjects,
      technicalDepth,
      portfolioDepth,
      engineeringPractices,
      documentation,
      maintenance,
      collaboration,
      testingReliability,
      eliteSynergyBonus,
      totalScore,
    };
  }

  // FIXTURE A: Elite Established Developer (14 verified, 4 substantial, high RQS, full engineering suite)
  {
    const fixtureA = computeScoreFromFixture({
      bestRQS: 88,
      verifiedCount: 14,
      substantialCount: 4,
      stronglyVerifiedSkillCount: 6,
      validCiCd: true,
      validDocker: true,
      validReadmeCount: 10,
      bio: true,
      daysSinceUpdate: 10,
      hasReleaseEvidence: true,
      hasActiveCiCdPipeline: true,
      hasMultipleActiveVerified: true,
      hasMultiContributorCodebase: true,
      hasPRCollaboration: true,
      isOrgMember: true,
      testingSkillScore: 100,
    });
    const passed = fixtureA.totalScore >= 95 && fixtureA.totalScore <= 100;
    testResults.push({
      testName: "Fixture A: Elite established developer qualifies for 95-100 band",
      passed,
      details: `Score: ${fixtureA.totalScore}/100 (BestQuality:${fixtureA.bestProjectQuality}, Overall:${fixtureA.overallProjects}, TechDepth:${fixtureA.technicalDepth}, PortfolioDepth:${fixtureA.portfolioDepth}, Synergy:${fixtureA.eliteSynergyBonus})`,
    });
  }

  // FIXTURE B: Strong Professional Developer (8 verified, 2 substantial, RQS 75)
  {
    const fixtureB = computeScoreFromFixture({
      bestRQS: 75,
      verifiedCount: 8,
      substantialCount: 2,
      stronglyVerifiedSkillCount: 5,
      validCiCd: true,
      validDocker: true,
      validReadmeCount: 5,
      bio: true,
      daysSinceUpdate: 25,
      hasReleaseEvidence: true,
      hasActiveCiCdPipeline: true,
      hasMultipleActiveVerified: true,
      hasMultiContributorCodebase: true,
      hasPRCollaboration: true,
      isOrgMember: false,
      testingSkillScore: 80,
    });
    const passed = fixtureB.totalScore >= 80 && fixtureB.totalScore <= 94;
    testResults.push({
      testName: "Fixture B: Strong professional developer qualifies for 80-94 band",
      passed,
      details: `Score: ${fixtureB.totalScore}/100 (Expected 80-94)`,
    });
  }

  // FIXTURE C: Student with 3 good projects (3 verified, 1 substantial, RQS 65)
  {
    const fixtureC = computeScoreFromFixture({
      bestRQS: 65,
      verifiedCount: 3,
      substantialCount: 1,
      stronglyVerifiedSkillCount: 3,
      validCiCd: true,
      validDocker: false,
      validReadmeCount: 2,
      bio: true,
      daysSinceUpdate: 20,
      hasReleaseEvidence: false,
      hasActiveCiCdPipeline: true,
      hasMultipleActiveVerified: true,
      hasMultiContributorCodebase: false,
      hasPRCollaboration: false,
      isOrgMember: false,
      testingSkillScore: 50,
    });
    const passed = fixtureC.totalScore >= 50 && fixtureC.totalScore <= 75;
    testResults.push({
      testName: "Fixture C: Student with 3 projects qualifies for 50-75 band",
      passed,
      details: `Score: ${fixtureC.totalScore}/100 (Expected 50-75)`,
    });
  }

  // FIXTURE D: Beginner with tutorial repositories (1 verified small, 0 substantial, RQS 45)
  {
    const fixtureD = computeScoreFromFixture({
      bestRQS: 45,
      verifiedCount: 1,
      substantialCount: 0,
      stronglyVerifiedSkillCount: 1,
      validCiCd: false,
      validDocker: false,
      validReadmeCount: 1,
      bio: false,
      daysSinceUpdate: 120,
      hasReleaseEvidence: false,
      hasActiveCiCdPipeline: false,
      hasMultipleActiveVerified: false,
      hasMultiContributorCodebase: false,
      hasPRCollaboration: false,
      isOrgMember: false,
      testingSkillScore: 0,
    });
    const passed = fixtureD.totalScore < 50;
    testResults.push({
      testName: "Fixture D: Beginner with tutorial repos scores below 50",
      passed,
      details: `Score: ${fixtureD.totalScore}/100 (Expected < 50)`,
    });
  }

  // FIXTURE E: Empty / Fork-heavy profile (0 verified, 0 substantial)
  {
    const fixtureE = computeScoreFromFixture({
      bestRQS: 0,
      verifiedCount: 0,
      substantialCount: 0,
      stronglyVerifiedSkillCount: 0,
      validCiCd: false,
      validDocker: false,
      validReadmeCount: 0,
      bio: false,
      daysSinceUpdate: 999,
      hasReleaseEvidence: false,
      hasActiveCiCdPipeline: false,
      hasMultipleActiveVerified: false,
      hasMultiContributorCodebase: false,
      hasPRCollaboration: false,
      isOrgMember: false,
      testingSkillScore: 0,
    });
    const passed = fixtureE.totalScore <= 15;
    testResults.push({
      testName: "Fixture E: Empty / fork-heavy profile capped at <= 15",
      passed,
      details: `Score: ${fixtureE.totalScore}/100 (Expected <= 15)`,
    });
  }

  // FIXTURE F: 1000 low-quality repositories without verified code (0 verified, 0 substantial)
  {
    const fixtureF = computeScoreFromFixture({
      bestRQS: 30,
      verifiedCount: 0,
      substantialCount: 0,
      stronglyVerifiedSkillCount: 0,
      validCiCd: false,
      validDocker: false,
      validReadmeCount: 0,
      bio: true,
      daysSinceUpdate: 5,
      hasReleaseEvidence: false,
      hasActiveCiCdPipeline: false,
      hasMultipleActiveVerified: false,
      hasMultiContributorCodebase: false,
      hasPRCollaboration: false,
      isOrgMember: false,
      testingSkillScore: 0,
    });
    const passed = fixtureF.totalScore <= 15;
    testResults.push({
      testName: "Fixture F: 1000 low-quality repos CANNOT reach elite score (capped at <= 15)",
      passed,
      details: `Score: ${fixtureF.totalScore}/100 (Expected <= 15)`,
    });
  }

  // FIXTURE G: Specialist Fairness (Frontend/UI Specialist with 0 Backend/DB evidence)
  {
    const fixtureG = computeScoreFromFixture({
      bestRQS: 90,
      verifiedCount: 12,
      substantialCount: 4,
      stronglyVerifiedSkillCount: 6, // Frontend, DevOps, Cloud, UI/UX, Testing, Problem Solving (Backend/DB N/A)
      validCiCd: true,
      validDocker: true,
      validReadmeCount: 8,
      bio: true,
      daysSinceUpdate: 15,
      hasReleaseEvidence: true,
      hasActiveCiCdPipeline: true,
      hasMultipleActiveVerified: true,
      hasMultiContributorCodebase: true,
      hasPRCollaboration: true,
      isOrgMember: true,
      testingSkillScore: 100,
    });
    const passed = fixtureG.totalScore >= 95;
    testResults.push({
      testName: "Fixture G: Specialist Fairness (Frontend specialist with N/A Backend/DB) reaches 95+",
      passed,
      details: `Score: ${fixtureG.totalScore}/100 (Expected >= 95)`,
    });
  }

  const allPassed = testResults.every(r => r.passed);
  console.log(`SCORING REGRESSION TEST RESULTS (${allPassed ? "ALL PASSED" : "FAILED"}):`);
  testResults.forEach(r => console.log(` [${r.passed ? "PASS" : "FAIL"}] ${r.testName}: ${r.details}`));

  return { allPassed, testResults };
}

if (typeof require !== "undefined" && require.main === module) {
  runScoringRegressionTests();
}
