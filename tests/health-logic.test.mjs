import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHealthAfterDamage,
  computeHealthAfterHeal,
  computeInvulnerabilityStep,
  computeHealthReset,
} from './helpers/health-logic.mjs';

describe('computeHealthAfterDamage', () => {
  test('reduces health by 1', () => {
    const result = computeHealthAfterDamage(3, 3, 1, 0, true);
    assert.equal(result.applied, true);
    assert.equal(result.nextHealth, 2);
  });

  test('reduces health by custom amount', () => {
    const result = computeHealthAfterDamage(3, 3, 2, 0, true);
    assert.equal(result.applied, true);
    assert.equal(result.nextHealth, 1);
  });

  test('returns false when amount is 0', () => {
    const result = computeHealthAfterDamage(3, 3, 0, 0, true);
    assert.equal(result.applied, false);
    assert.equal(result.nextHealth, 3);
  });

  test('returns false when amount is negative', () => {
    const result = computeHealthAfterDamage(3, 3, -1, 0, true);
    assert.equal(result.applied, false);
    assert.equal(result.nextHealth, 3);
  });

  test('returns false when invulnerable (timer > 0)', () => {
    const result = computeHealthAfterDamage(3, 3, 1, 0.2, true);
    assert.equal(result.applied, false);
    assert.equal(result.nextHealth, 3);
  });

  test('returns false when acceptDamage is false', () => {
    const result = computeHealthAfterDamage(3, 3, 1, 0, false);
    assert.equal(result.applied, false);
    assert.equal(result.nextHealth, 3);
  });

  test('returns false when currentHealth is already 0', () => {
    const result = computeHealthAfterDamage(0, 3, 1, 0, true);
    assert.equal(result.applied, false);
    assert.equal(result.nextHealth, 0);
  });

  test('does not reduce health below 0', () => {
    const result = computeHealthAfterDamage(1, 3, 5, 0, true);
    assert.equal(result.applied, true);
    assert.equal(result.nextHealth, 0);
  });

  test('triggers depleted when health reaches 0', () => {
    const result = computeHealthAfterDamage(1, 3, 1, 0, true);
    assert.equal(result.applied, true);
    assert.equal(result.nextHealth, 0);
    assert.equal(result.depleted, true);
  });

  test('sets invulnerableTimer to invulnerableSeconds', () => {
    const result = computeHealthAfterDamage(3, 3, 1, 0, true);
    assert.equal(result.applied, true);
    assert.equal(result.nextInvulnerableTimer, 0.4);
  });
});

describe('computeInvulnerabilityStep', () => {
  test('timer decrements by dt', () => {
    const next = computeInvulnerabilityStep(0.4, 0.1);
    assert.ok(Math.abs(next - 0.3) < 1e-9);
  });

  test('timer does not go below 0', () => {
    const next = computeInvulnerabilityStep(0.1, 0.5);
    assert.equal(next, 0);
  });
});

describe('computeHealthAfterHeal', () => {
  test('increases health', () => {
    const result = computeHealthAfterHeal(1, 3, 1);
    assert.equal(result.nextHealth, 2);
  });

  test('does not exceed maxHealth', () => {
    const result = computeHealthAfterHeal(3, 3, 2);
    assert.equal(result.nextHealth, 3);
  });

  test('does nothing when amount is 0', () => {
    const result = computeHealthAfterHeal(2, 3, 0);
    assert.equal(result.nextHealth, 2);
  });

  test('does nothing when amount is negative', () => {
    const result = computeHealthAfterHeal(2, 3, -1);
    assert.equal(result.nextHealth, 2);
  });
});

describe('computeHealthReset', () => {
  test('restores maxHealth and clears invulnerability', () => {
    const result = computeHealthReset(5);
    assert.equal(result.health, 5);
    assert.equal(result.invulnerableTimer, 0);
  });
});

describe('BUG#1 regression', () => {
  test('damage during invulnerability window is blocked by timer, not health state', () => {
    // First hit at full health applies damage and starts invulnerable timer
    const firstHit = computeHealthAfterDamage(3, 3, 1, 0, true);
    assert.equal(firstHit.applied, true);
    assert.equal(firstHit.nextHealth, 2);
    assert.equal(firstHit.nextInvulnerableTimer, 0.4);

    // Second hit while invulnerable timer is active should be blocked
    const secondHit = computeHealthAfterDamage(
      firstHit.nextHealth,
      3,
      1,
      firstHit.nextInvulnerableTimer,
      true,
    );
    assert.equal(secondHit.applied, false);
    assert.equal(secondHit.nextHealth, 2);

    // After timer expires, damage applies again even in hurt state
    const timerExpired = computeInvulnerabilityStep(firstHit.nextInvulnerableTimer, 0.5);
    assert.equal(timerExpired, 0);

    const thirdHit = computeHealthAfterDamage(2, 3, 1, timerExpired, true);
    assert.equal(thirdHit.applied, true);
    assert.equal(thirdHit.nextHealth, 1);
  });
});
