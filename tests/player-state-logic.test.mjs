import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePlayerAttackState,
  computeAttackDecision,
  computeForcedMoveStep,
  computeNormalMoveStep,
  computeAttackAnchorPosition,
  normalizeMoveInput,
} from './helpers/player-state-logic.mjs';
import { computeLaunchPlan } from './helpers/gameplay-logic.mjs';

describe('computePlayerAttackState', () => {
  test('attack timer starts at attackDuration', () => {
    const result = computePlayerAttackState(0, 0.3, 0.016);
    assert.equal(result.timer, 0.3);
    assert.equal(result.justStarted, true);
  });

  test('attack timer decrements by dt each frame', () => {
    const result = computePlayerAttackState(0.3, 0.3, 0.1);
    assert.ok(Math.abs(result.timer - 0.2) < 1e-9);
    assert.equal(result.justEnded, false);
  });

  test('attack timer reaches 0 triggers justEnded', () => {
    const result = computePlayerAttackState(0.1, 0.3, 0.1);
    assert.equal(result.timer, 0);
    assert.equal(result.justEnded, true);
  });
});

describe('computeAttackDecision', () => {
  test('canAttack returns false while already attacking', () => {
    const result = computeAttackDecision(false, 0.2);
    assert.equal(result.canAttack, false);
  });

  test('canAttack returns false when paused', () => {
    const result = computeAttackDecision(true, 0);
    assert.equal(result.canAttack, false);
  });
});

describe('computeForcedMoveStep', () => {
  test('applies velocity * step as displacement', () => {
    const result = computeForcedMoveStep(400, 0, 0.2, 0.016);
    assert.ok(Math.abs(result.dx - 400 * 0.016) < 1e-9);
    assert.ok(Math.abs(result.dy - 0) < 1e-9);
    assert.equal(result.velocityCleared, false);
  });

  test('timer decrements to 0 then clears velocity', () => {
    const result = computeForcedMoveStep(400, 0, 0.01, 0.016);
    assert.ok(Math.abs(result.dx - 400 * 0.01) < 1e-9);
    assert.equal(result.nextTimer, 0);
    assert.equal(result.velocityCleared, true);
  });
});

describe('computeNormalMoveStep', () => {
  test('applies input * speed * dt', () => {
    const result = computeNormalMoveStep(1, 0, 200, 0.016);
    assert.ok(Math.abs(result.dx - 3.2) < 1e-9);
    assert.ok(Math.abs(result.dy - 0) < 1e-9);
  });
});

describe('normalizeMoveInput', () => {
  test('normalizes when length > 1', () => {
    const result = normalizeMoveInput(3, 4);
    assert.ok(Math.abs(result.x - 0.6) < 1e-9);
    assert.ok(Math.abs(result.y - 0.8) < 1e-9);
  });

  test('passes through when length <= 1', () => {
    const result = normalizeMoveInput(0.3, 0.4);
    assert.equal(result.x, 0.3);
    assert.equal(result.y, 0.4);
  });
});

describe('computeAttackAnchorPosition', () => {
  test('position equals facing * reach', () => {
    const result = computeAttackAnchorPosition(1, 0, 48);
    assert.equal(result.x, 48);
    assert.equal(result.y, 0);

    const diag = computeAttackAnchorPosition(0.5, -0.5, 60);
    assert.equal(diag.x, 30);
    assert.equal(diag.y, -30);
  });
});

describe('computeLaunchPlan integration', () => {
  test('launch velocity = normalized direction * distance / duration', () => {
    const plan = computeLaunchPlan(3, 4, 200, 0.5);
    assert.ok(plan);
    assert.equal(plan.instant, false);
    assert.ok(Math.abs(plan.velocity.x - 240) < 1e-9);
    assert.ok(Math.abs(plan.velocity.y - 320) < 1e-9);
  });

  test('launch with zero direction returns null', () => {
    assert.equal(computeLaunchPlan(0, 0, 200, 0.5), null);
  });

  test('launch with zero distance returns null', () => {
    assert.equal(computeLaunchPlan(1, 0, 0, 0.5), null);
  });
});
