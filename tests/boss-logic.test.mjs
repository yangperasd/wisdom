import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeShieldPhaseState,
  computeShieldTimerStep,
  computeShieldActionOnExpiry,
  computeEncounterState,
  computeEncounterAfterBossDepleted,
  computeRespawnBossState,
  computeTouchDamageWindowBudget,
} from './helpers/boss-logic.mjs';

const projectRoot = process.cwd();

function loadBossArenaTimingConfig() {
  const scene = JSON.parse(fs.readFileSync(path.join(projectRoot, 'assets', 'scenes', 'BossArena.scene'), 'utf-8'));
  const shield = scene.find((item) =>
    item
    && typeof item.vulnerableSeconds === 'number'
    && typeof item.dangerMoveSpeed === 'number'
    && typeof item.vulnerableMoveSpeed === 'number'
    && item.bossHealth?.__id__ != null
  );
  const bossHealth = scene[shield?.bossHealth?.__id__];
  const player = scene.find((item) =>
    item
    && typeof item.attackDuration === 'number'
    && typeof item.attackReach === 'number'
    && item.attackAnchor?.__id__ != null
  );

  assert.ok(shield, 'BossArena should include a BossShieldPhaseController-like component');
  assert.ok(bossHealth, 'BossArena shield controller should reference boss health');
  assert.ok(player, 'BossArena should include a PlayerController-like component');

  return {
    bossHealth: bossHealth.maxHealth,
    vulnerableSeconds: shield.vulnerableSeconds,
    playerAttackDuration: player.attackDuration,
    targetInvulnerableSeconds: bossHealth.invulnerableSeconds,
  };
}

test('alive when bossHealth > 0', () => {
  const state = computeShieldPhaseState({ bossHealth: 5 });
  assert.equal(state.alive, true);
});

test('not alive when bossHealth = 0', () => {
  const state = computeShieldPhaseState({ bossHealth: 0 });
  assert.equal(state.alive, false);
});

test('vulnerable when alive + shieldBroken + timer > 0', () => {
  const state = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: true,
    vulnerableTimer: 2.0,
  });
  assert.equal(state.vulnerable, true);
});

test('not vulnerable when shield not broken', () => {
  const state = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: false,
    vulnerableTimer: 2.0,
  });
  assert.equal(state.vulnerable, false);
});

test('not vulnerable when timer = 0', () => {
  const state = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: true,
    vulnerableTimer: 0,
  });
  assert.equal(state.vulnerable, false);
});

test('danger when alive and not vulnerable', () => {
  const state = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: false,
    vulnerableTimer: 0,
  });
  assert.equal(state.danger, true);
  assert.equal(state.alive, true);
  assert.equal(state.vulnerable, false);
});

test('damage accepted only when vulnerable', () => {
  const vulnerable = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: true,
    vulnerableTimer: 1.5,
  });
  assert.equal(vulnerable.damageAccepted, true);

  const danger = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: false,
    vulnerableTimer: 0,
  });
  assert.equal(danger.damageAccepted, false);
});

test('contact damage enabled when danger, disabled when vulnerable', () => {
  const danger = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: false,
  });
  assert.equal(danger.contactDamageEnabled, true);

  const vulnerable = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: true,
    vulnerableTimer: 3.2,
  });
  assert.equal(vulnerable.contactDamageEnabled, false);
});

test('move speed = vulnerableMoveSpeed when vulnerable', () => {
  const state = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: true,
    vulnerableTimer: 1.0,
    vulnerableMoveSpeed: 22,
    dangerMoveSpeed: 84,
  });
  assert.equal(state.moveSpeed, 22);
});

test('move speed = dangerMoveSpeed when danger', () => {
  const state = computeShieldPhaseState({
    bossHealth: 10,
    shieldBroken: false,
    vulnerableTimer: 0,
    vulnerableMoveSpeed: 22,
    dangerMoveSpeed: 84,
  });
  assert.equal(state.moveSpeed, 84);
});

test('shield timer decrements by dt', () => {
  const result = computeShieldTimerStep(3.2, 1.0);
  assert.ok(Math.abs(result.nextTimer - 2.2) < 1e-9);
  assert.equal(result.expired, false);
});

test('shield timer expired triggers shouldResetShield when alive + broken', () => {
  const step = computeShieldTimerStep(0.5, 1.0);
  assert.equal(step.nextTimer, 0);
  assert.equal(step.expired, true);

  const action = computeShieldActionOnExpiry(true, true);
  assert.equal(action.shouldResetShield, true);
});

test('shield timer expired does NOT reset when boss dead', () => {
  const step = computeShieldTimerStep(0.5, 1.0);
  assert.equal(step.expired, true);

  const action = computeShieldActionOnExpiry(true, false);
  assert.equal(action.shouldResetShield, false);
});

test('respawn sets vulnerableTimer to 0', () => {
  const result = computeRespawnBossState(3, 10);
  assert.equal(result.vulnerableTimer, 0);
});

test('encounter applyState: isCleared=true deactivates bossRoot', () => {
  const cleared = computeEncounterState(true);
  assert.equal(cleared.bossRootActive, false);
  assert.equal(cleared.clearedNodesActive, true);
  assert.equal(cleared.nonClearedNodesActive, false);

  const active = computeEncounterState(false);
  assert.equal(active.bossRootActive, true);
  assert.equal(active.clearedNodesActive, false);
  assert.equal(active.nonClearedNodesActive, true);
});

test('BUG#4 regression: respawn does NOT reset boss health (known bug)', () => {
  // BUG#4: BossShieldPhaseController.onRespawnRequested zeroes the
  // vulnerableTimer but never restores bossHealth to its max value.
  // This test documents the current (buggy) behaviour so that a future
  // fix will intentionally break it.
  const result = computeRespawnBossState(3, 10);
  assert.equal(result.health, 3, 'health stays at current value instead of max');
  assert.notEqual(result.health, 10, 'health is NOT reset to max (known bug)');
});

test('BossArena damage window has touch-first timing budget without changing combat tuning', () => {
  const config = loadBossArenaTimingConfig();
  const budget = computeTouchDamageWindowBudget(config);

  assert.equal(config.bossHealth, 8);
  assert.equal(config.vulnerableSeconds, 3.2);
  assert.equal(config.playerAttackDuration, 0.18);
  assert.equal(config.targetInvulnerableSeconds, 0.12);
  assert.ok(
    budget.attacksPerWindow >= 4,
    `Boss window should support at least four deliberate touch attacks, got ${JSON.stringify(budget)}`,
  );
  assert.ok(
    budget.windowsToDefeat <= 2,
    `First Boss should fit into two shield windows under conservative touch cadence, got ${JSON.stringify(budget)}`,
  );
});
