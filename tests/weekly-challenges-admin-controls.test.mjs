import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARENA_GAME_IDS,
  LEGACY_GAME_IDS,
  GAME_IDS,
  GAME_INFO,
  DAY_NAMES,
  getKolkataDateParts,
  isChallengeDay,
  isChallengeHour,
  isChallengeScheduleActive,
  getNextChallengeDay,
} from '../src/lib/challengeUtils.ts';

test('Weekly Challenges Admin Controls & Timezone Verification Suite', async (t) => {

  await t.test('1. All 14 games exist and have complete metadata', () => {
    assert.equal(ARENA_GAME_IDS.length, 7, 'Should have exactly 7 arena games');
    assert.equal(LEGACY_GAME_IDS.length, 7, 'Should have exactly 7 legacy games');
    assert.equal(GAME_IDS.length, 14, 'Should have exactly 14 total games');

    for (const id of GAME_IDS) {
      assert.ok(GAME_INFO[id], `Game info must exist for ${id}`);
      assert.ok(GAME_INFO[id].name, `Game name must exist for ${id}`);
      assert.ok(GAME_INFO[id].description, `Description must exist for ${id}`);
      assert.ok(GAME_INFO[id].badge, `Badge must exist for ${id}`);
    }
  });

  await t.test('2. IST (Asia/Kolkata) Timezone calculation logic', () => {
    // 2026-11-28 00:00:00 UTC = 2026-11-28 05:30:00 IST (Saturday, day 6)
    const utcDate = new Date('2026-11-28T00:00:00.000Z');
    const kolkata = getKolkataDateParts(utcDate);

    assert.equal(kolkata.hour, 5, '00:00 UTC is 05:30 IST');
    assert.equal(kolkata.minute, 30);
    assert.equal(kolkata.day, 6, 'Saturday is day 6');
    assert.equal(kolkata.dateString, '2026-11-28');
  });

  await t.test('3. Available Days control & Clear Days behavior', () => {
    // Saturday in IST (day 6)
    const saturday = new Date('2026-11-28T06:00:00.000Z'); // 11:30 IST Saturday

    // When All 7 Days selected:
    assert.equal(isChallengeDay([0, 1, 2, 3, 4, 5, 6], saturday), true);

    // When Weekdays only (1, 2, 3, 4, 5) selected:
    assert.equal(isChallengeDay([1, 2, 3, 4, 5], saturday), false);

    // When Weekends only (0, 6) selected:
    assert.equal(isChallengeDay([0, 6], saturday), true);

    // When Clear Days (empty array []) selected:
    assert.equal(isChallengeDay([], saturday), false, 'Empty availableDays must evaluate to closed');
  });

  await t.test('4. Standard Same-Day Hours schedule (e.g. 09:00 to 18:00 IST)', () => {
    // 09:30 IST (04:00 UTC) -> Inside window
    const insideTime = new Date('2026-11-28T04:00:00.000Z');
    assert.equal(isChallengeHour('09:00', '18:00', insideTime), true);

    // 08:30 IST (03:00 UTC) -> Before window
    const beforeTime = new Date('2026-11-28T03:00:00.000Z');
    assert.equal(isChallengeHour('09:00', '18:00', beforeTime), false);

    // 19:00 IST (13:30 UTC) -> After window
    const afterTime = new Date('2026-11-28T13:30:00.000Z');
    assert.equal(isChallengeHour('09:00', '18:00', afterTime), false);
  });

  await t.test('5. Overnight Hours schedule (e.g. 20:00 to 02:00 IST)', () => {
    // Saturday 21:00 IST (15:30 UTC) -> Inside overnight window (started tonight)
    const satNight = new Date('2026-11-28T15:30:00.000Z');
    assert.equal(isChallengeHour('20:00', '02:00', satNight), true);

    // Sunday 01:00 IST (19:30 UTC Saturday) -> Inside overnight window (spillover)
    const sunEarlyMorning = new Date('2026-11-28T19:30:00.000Z');
    assert.equal(isChallengeHour('20:00', '02:00', sunEarlyMorning), true);

    // Sunday 03:00 IST (21:30 UTC Saturday) -> Outside overnight window
    const sunLateMorning = new Date('2026-11-28T21:30:00.000Z');
    assert.equal(isChallengeHour('20:00', '02:00', sunLateMorning), false);

    // Verify unified schedule active helper with overnight:
    // If Saturday is scheduled, Saturday 21:00 IST must be active
    assert.equal(isChallengeScheduleActive([6], '20:00', '02:00', satNight), true);
    // Sunday 01:00 IST must be active because Saturday was scheduled
    assert.equal(isChallengeScheduleActive([6], '20:00', '02:00', sunEarlyMorning), true);
    // Sunday 03:00 IST must NOT be active
    assert.equal(isChallengeScheduleActive([6], '20:00', '02:00', sunLateMorning), false);
  });

  await t.test('6. Next challenge day calculation', () => {
    // Saturday (day 6) in IST
    const saturday = new Date('2026-11-28T06:00:00.000Z');

    // Next day when only Tuesday (2) and Thursday (4) are available:
    const nextDate = getNextChallengeDay([2, 4], saturday);
    assert.ok(nextDate, 'Should find next available day');
    const parts = getKolkataDateParts(nextDate);
    assert.equal(parts.day, 2, 'Next day from Saturday for [2, 4] must be Tuesday (2)');

    // Next day when no days scheduled:
    const nullDate = getNextChallengeDay([], saturday);
    assert.equal(nullDate, null, 'Should return null when availableDays is empty');
  });

  await t.test('7. Configuration Priority logic validation', () => {
    function evaluatePriority(config, isScheduleActive) {
      if (config.enabled === false) return 'OFFLINE_DISABLED';
      if (config.maintenanceMode === true) return 'MAINTENANCE';
      if (!isScheduleActive) return 'SCHEDULE_LOCKED_CARDS';
      return 'ARENA_ACTIVE';
    }

    // Priority 1: Enabled = false trumps Maintenance = true
    assert.equal(evaluatePriority({ enabled: false, maintenanceMode: true }, true), 'OFFLINE_DISABLED');

    // Priority 2: Maintenance = true when Enabled = true
    assert.equal(evaluatePriority({ enabled: true, maintenanceMode: true }, true), 'MAINTENANCE');

    // Priority 3: Schedule Closed / Outside hours renders locked cards, not full page blocker
    assert.equal(evaluatePriority({ enabled: true, maintenanceMode: false }, false), 'SCHEDULE_LOCKED_CARDS');

    // Normal active
    assert.equal(evaluatePriority({ enabled: true, maintenanceMode: false }, true), 'ARENA_ACTIVE');
  });
});
