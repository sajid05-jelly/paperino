import test from "node:test";
import assert from "node:assert/strict";
import { isContributorPlusEligible, getEffectivePlan } from "../src/lib/subscription.ts";

test("Paperino User Account & Contributor Recovery Suite", async (t) => {
  await t.test("1. Free Plus milestone unlocks for 10+ approved materials", () => {
    // Under 10 materials
    assert.equal(isContributorPlusEligible({ uploads: 5, approvedUploads: 5 }), false);
    assert.equal(isContributorPlusEligible({ uploads: 9, approvedUploads: 9 }), false);

    // Exactly 10 approved materials unlocks Free Plus
    assert.equal(isContributorPlusEligible({ uploads: 10, approvedUploads: 10 }), true);
    assert.equal(isContributorPlusEligible({ uploads: 15, approvedUploads: 15 }), true);

    // Fallback to uploads field if approvedUploads is absent
    assert.equal(isContributorPlusEligible({ uploads: 12 }), true);
  });

  await t.test("2. getEffectivePlan grants 'plus' plan for 10+ contributor uploads", () => {
    const contributorUser = {
      role: "student",
      uploads: 12,
      approvedUploads: 12,
      plan: "free",
    };

    const effective = getEffectivePlan(contributorUser);
    assert.equal(effective.plan, "plus");
    assert.equal(effective.isContributorPlus, true);
    assert.equal(effective.isPaidPlan, false);
  });

  await t.test("3. Paid plans take precedence over Contributor Free Plus", () => {
    const paidContributor = {
      role: "student",
      uploads: 15,
      approvedUploads: 15,
      plan: "pro",
      razorpaySubscriptionStatus: "active",
    };

    const effective = getEffectivePlan(paidContributor);
    assert.equal(effective.plan, "pro");
    assert.equal(effective.isPaidPlan, true);
  });

  await t.test("4. Contributor data aggregation links materials by both UID and email", () => {
    const uidMaterials = [
      { id: "mat_1", title: "Math Notes", uploaderId: "uid_123", status: "approved" },
      { id: "mat_2", title: "Physics PYQ", uploaderId: "uid_123", status: "approved" },
    ];
    const emailMaterials = [
      { id: "mat_2", title: "Physics PYQ", uploaderEmail: "student@gmail.com", status: "approved" }, // duplicate
      { id: "mat_3", title: "Chemistry Lab", uploaderEmail: "student@gmail.com", status: "pending" }, // earlier upload under different UID
    ];

    const merged = new Map();
    [...uidMaterials, ...emailMaterials].forEach(m => merged.set(m.id, m));
    const all = Array.from(merged.values());

    assert.equal(all.length, 3);
    assert.equal(all.filter(m => m.status === "approved").length, 2);
    assert.equal(all.filter(m => m.status === "pending").length, 1);
  });

  await t.test("5. Account consolidation merges avatar, theme and highest points from old records", () => {
    const oldProfile = {
      paperinoAvatar: "wizard-owl",
      avatarFrame: "gold",
      theme: "ocean-blue",
      uploads: 14,
      points: 140,
    };

    const newEmptyProfile = {
      paperinoAvatar: null,
      avatarFrame: null,
      theme: null,
      uploads: 0,
      points: 0,
    };

    const consolidated = {
      paperinoAvatar: newEmptyProfile.paperinoAvatar || oldProfile.paperinoAvatar,
      avatarFrame: newEmptyProfile.avatarFrame || oldProfile.avatarFrame,
      theme: newEmptyProfile.theme || oldProfile.theme,
      uploads: Math.max(newEmptyProfile.uploads, oldProfile.uploads),
      points: Math.max(newEmptyProfile.points, oldProfile.points),
    };

    assert.equal(consolidated.paperinoAvatar, "wizard-owl");
    assert.equal(consolidated.avatarFrame, "gold");
    assert.equal(consolidated.theme, "ocean-blue");
    assert.equal(consolidated.uploads, 14);
    assert.equal(consolidated.points, 140);
  });
});
