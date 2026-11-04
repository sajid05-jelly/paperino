import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getEffectivePlan,
  getMonthlyLimit,
  isFeatureAllowed,
  isCountedMonthlyFeature
} from '../src/lib/subscription.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('PAPERINO – Critical Subscription & AI Features Verification', () => {

  describe('1. Authoritative Subscription Source & getEffectivePlan', () => {
    test('Active paid Premium user is recognized with unlimited benefits', () => {
      const userData = {
        plan: 'premium',
        razorpaySubscriptionStatus: 'active',
        razorpaySubscriptionId: 'sub_12345'
      };
      const result = getEffectivePlan(userData);
      assert.equal(result.plan, 'premium');
      assert.equal(result.isPaidPlan, true);
      assert.equal(result.isContributorPlus, false);
    });

    test('Active paid Pro user with Razorpay intermediate status (authenticated/captured/paid) is recognized as paid', () => {
      const statuses = ['authenticated', 'captured', 'authorized', 'paid', 'active', ''];
      for (const status of statuses) {
        const userData = {
          plan: 'pro',
          razorpaySubscriptionStatus: status
        };
        const result = getEffectivePlan(userData);
        assert.equal(result.plan, 'pro', `Failed for status: "${status}"`);
        assert.equal(result.isPaidPlan, true);
      }
    });

    test('Cancelled, halted, expired, or inactive subscriptions immediately revert to free', () => {
      const cancelledStatuses = ['cancelled', 'canceled', 'halted', 'completed', 'expired', 'inactive', 'failed', 'unpaid'];
      for (const status of cancelledStatuses) {
        const userData = {
          plan: 'premium',
          razorpaySubscriptionStatus: status,
          uploads: 2
        };
        const result = getEffectivePlan(userData);
        assert.equal(result.plan, 'free', `Expected free for status "${status}", got ${result.plan}`);
        assert.equal(result.isPaidPlan, false);
      }
    });

    test('Active time-limited pass (premiumEndDate in future) grants paid access', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const userData = {
        plan: 'pro',
        premiumEndDate: futureDate
      };
      const result = getEffectivePlan(userData);
      assert.equal(result.plan, 'pro');
      assert.equal(result.isPaidPlan, true);
    });

    test('Expired time-limited pass (premiumEndDate in past) reverts to free', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const userData = {
        plan: 'premium',
        premiumEndDate: pastDate,
        uploads: 1
      };
      const result = getEffectivePlan(userData);
      assert.equal(result.plan, 'free');
      assert.equal(result.isPaidPlan, false);
    });

    test('Contributor reward: 10+ approved uploads receives Free Plus, but NEVER Pro or Premium', () => {
      const userData = {
        uploads: 15,
        approvedUploads: 12,
        plan: 'free'
      };
      const result = getEffectivePlan(userData);
      assert.equal(result.plan, 'plus');
      assert.equal(result.isContributorPlus, true);
      assert.equal(result.isPaidPlan, false);
    });

    test('Admin role always receives full Premium access', () => {
      const userData = {
        role: 'admin',
        plan: 'free'
      };
      const result = getEffectivePlan(userData);
      assert.equal(result.plan, 'premium');
    });
  });

  describe('2. ATS Resume Analyzer Entitlements & Limits', () => {
    test('Premium subscriber has Infinity ATS uses (unlimited)', () => {
      const limit = getMonthlyLimit('premium', 'ats');
      assert.equal(limit, Infinity);
      assert.equal(isFeatureAllowed('premium', 'ats'), true);
    });

    test('Pro subscriber has 11 ATS uses', () => {
      const limit = getMonthlyLimit('pro', 'ats');
      assert.equal(limit, 11);
      assert.equal(isFeatureAllowed('pro', 'ats'), true);
    });

    test('Free user has configured limit of 2 ATS uses (never 0 uses)', () => {
      const limit = getMonthlyLimit('free', 'ats');
      assert.equal(limit, 2);
      assert.equal(isFeatureAllowed('free', 'ats'), true);
    });

    test('ATS is identified as a counted monthly feature', () => {
      assert.equal(isCountedMonthlyFeature('ats'), true);
    });

    test('ATS API route maps status codes correctly (never maps non-limit errors to 429)', () => {
      const atsRoutePath = path.join(__dirname, '../src/app/api/ats/route.ts');
      const atsSource = fs.readFileSync(atsRoutePath, 'utf8');
      assert.match(atsSource, /if\s*\(entitlement\.status === "LIMIT_REACHED"\)\s*statusCode = 429/);
      assert.match(atsSource, /if\s*\(entitlement\.status === "AUTH_REQUIRED"\)\s*statusCode = 401/);
      assert.match(atsSource, /if\s*\(entitlement\.status === "USAGE_VERIFICATION_UNAVAILABLE"\)\s*statusCode = 503/);
    });
  });

  describe('3. GitHub Intelligence Entitlements & Validation', () => {
    test('Premium subscriber has Infinity GitHub Intelligence uses', () => {
      const limit = getMonthlyLimit('premium', 'githubIntelligence');
      assert.equal(limit, Infinity);
      assert.equal(isFeatureAllowed('premium', 'githubIntelligence'), true);
    });

    test('Pro subscriber has 11 uses and Plus has 4 uses', () => {
      assert.equal(getMonthlyLimit('pro', 'githubIntelligence'), 11);
      assert.equal(getMonthlyLimit('plus', 'githubIntelligence'), 4);
    });

    test('Free user has 2 uses for GitHub Intelligence', () => {
      assert.equal(getMonthlyLimit('free', 'githubIntelligence'), 2);
      assert.equal(isFeatureAllowed('free', 'githubIntelligence'), true);
    });

    test('GitHub username validation regex accepts valid usernames and rejects invalid formats', () => {
      const GITHUB_USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/;

      // Valid
      assert.equal(GITHUB_USERNAME_REGEX.test('octocat'), true);
      assert.equal(GITHUB_USERNAME_REGEX.test('john-doe'), true);
      assert.equal(GITHUB_USERNAME_REGEX.test('developer123'), true);
      assert.equal(GITHUB_USERNAME_REGEX.test('a-b-c-d'), true);

      // Invalid
      assert.equal(GITHUB_USERNAME_REGEX.test('-octocat'), false, 'Leading hyphen disallowed');
      assert.equal(GITHUB_USERNAME_REGEX.test('octocat-'), false, 'Trailing hyphen disallowed');
      assert.equal(GITHUB_USERNAME_REGEX.test('octo--cat'), false, 'Consecutive hyphens disallowed');
      assert.equal(GITHUB_USERNAME_REGEX.test('octo cat'), false, 'Spaces disallowed');
      assert.equal(GITHUB_USERNAME_REGEX.test('octo@cat'), false, 'Special chars disallowed');
      assert.equal(GITHUB_USERNAME_REGEX.test(''), false, 'Empty disallowed');
    });

    test('GitHub Intelligence route validates username format and verifies server entitlement', () => {
      const ghRoutePath = path.join(__dirname, '../src/app/api/github-intelligence/route.ts');
      const ghSource = fs.readFileSync(ghRoutePath, 'utf8');
      assert.match(ghSource, /GITHUB_USERNAME_REGEX/);
      assert.match(ghSource, /verifyFeatureAccess\(authHeader,\s*'githubIntelligence'\)/);
    });
  });

  describe('4. Career DNA Entitlements & Sync AI Reliability', () => {
    test('Career DNA is an access-gated boolean feature (not counted monthly)', () => {
      assert.equal(isCountedMonthlyFeature('careerDna'), false);
    });

    test('Pro and Premium users are allowed Career DNA access', () => {
      assert.equal(isFeatureAllowed('pro', 'careerDna'), true);
      assert.equal(isFeatureAllowed('premium', 'careerDna'), true);
      // getMonthlyLimit returns Infinity for enabled boolean features
      assert.equal(getMonthlyLimit('pro', 'careerDna'), Infinity);
      assert.equal(getMonthlyLimit('premium', 'careerDna'), Infinity);
    });

    test('Free and Plus users are not allowed Career DNA access', () => {
      assert.equal(isFeatureAllowed('free', 'careerDna'), false);
      assert.equal(isFeatureAllowed('plus', 'careerDna'), false);
      assert.equal(getMonthlyLimit('free', 'careerDna'), 0);
      assert.equal(getMonthlyLimit('plus', 'careerDna'), 0);
    });

    test('Career DNA does not execute live Unstop scraping and has AI timeout safeguards', () => {
      const managerPath = path.join(__dirname, '../src/services/internshipProviders/manager.ts');
      const managerSource = fs.readFileSync(managerPath, 'utf8');
      assert.doesNotMatch(managerSource, /new UnstopProvider\(\)/);

      const routePath = path.join(__dirname, '../src/app/api/career-dna/route.ts');
      const routeSource = fs.readFileSync(routePath, 'utf8');
      assert.match(routeSource, /aiController = new AbortController\(\)/);
      assert.match(routeSource, /setTimeout\(\(\) => aiController\.abort\(\),\s*12000\)/);

      const pagePath = path.join(__dirname, '../src/app/career-dna/page.tsx');
      const pageSource = fs.readFileSync(pagePath, 'utf8');
      assert.match(pageSource, /const controller = new AbortController\(\)/);
      assert.match(pageSource, /setTimeout\(\(\) => controller\.abort\(\),\s*25000\)/);
    });
  });
});
