import { DeveloperMetrics, ClassifiedRepoInfo } from "../app/api/github-intelligence/route";

/**
 * Automated Verification Test for Evidence Consistency Invariants
 */
export function verifyEvidenceConsistency(metrics: DeveloperMetrics, repos: ClassifiedRepoInfo[]) {
  const violations: string[] = [];

  const skillsConfidence = metrics.skillsConfidence || {};
  const badges = metrics.badges || [];

  // Invariant 1: IF frontend-developer badge is unlocked THEN frontend skill must not be INSUFFICIENT EVIDENCE
  const feBadge = badges.find(b => b.id === "frontend-developer");
  if (feBadge?.unlocked && skillsConfidence.frontend?.confidence === "INSUFFICIENT EVIDENCE") {
    violations.push("INVARIANT VIOLATION: Frontend Developer achievement is unlocked but Frontend Skill is INSUFFICIENT EVIDENCE!");
  }

  // Invariant 2: IF backend-engineer badge is unlocked THEN backend skill must not be INSUFFICIENT EVIDENCE
  const beBadge = badges.find(b => b.id === "backend-engineer");
  if (beBadge?.unlocked && skillsConfidence.backend?.confidence === "INSUFFICIENT EVIDENCE") {
    violations.push("INVARIANT VIOLATION: Backend Engineer achievement is unlocked but Backend Skill is INSUFFICIENT EVIDENCE!");
  }

  // Invariant 3: IF documentation score > 0 THEN documentation skill must not be INSUFFICIENT EVIDENCE
  const docScore = metrics.scoreBreakdown?.documentation?.score || 0;
  if (docScore > 0 && skillsConfidence.documentation?.confidence === "INSUFFICIENT EVIDENCE") {
    violations.push("INVARIANT VIOLATION: Documentation Score > 0 but Documentation Skill is INSUFFICIENT EVIDENCE!");
  }

  // Invariant 4: IF verified test files exist THEN testing skill must not be INSUFFICIENT EVIDENCE
  const hasTests = repos.some(r => r.hasTest);
  if (hasTests && skillsConfidence.testing?.confidence === "INSUFFICIENT EVIDENCE") {
    violations.push("INVARIANT VIOLATION: Verified test files exist but Testing Skill is INSUFFICIENT EVIDENCE!");
  }

  // Invariant 5: IF verified projects > 0 THEN Portfolio Depth must be > 0
  const verifiedCount = metrics.transparencyAudit?.verifiedRepos || 0;
  if (verifiedCount > 0 && metrics.separateMetrics.portfolioDepth === 0) {
    violations.push("INVARIANT VIOLATION: Verified projects > 0 but Portfolio Depth is 0!");
  }

  // Invariant 6: Career Archetype must match top non-zero skills
  if (metrics.category === "Frontend Developer" && skillsConfidence.frontend?.confidence === "INSUFFICIENT EVIDENCE") {
    violations.push("INVARIANT VIOLATION: Career Archetype is Frontend Developer but Frontend Skill is INSUFFICIENT EVIDENCE!");
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
