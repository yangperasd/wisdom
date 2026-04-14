import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EchoId,
  computeEchoUnlock,
  computeEchoSelect,
  computeEchoCycle,
  computeSpawnDecision,
  computeApplySaveState,
} from './helpers/echo-logic.mjs';

test('unlock adds new echo to set', () => {
  const result = computeEchoUnlock([EchoId.Box], EchoId.SpringFlower);
  assert.equal(result.changed, true);
  assert.deepEqual(result.nextUnlocked, [EchoId.Box, EchoId.SpringFlower]);
});

test('unlock Box is idempotent (already unlocked)', () => {
  const result = computeEchoUnlock([EchoId.Box], EchoId.Box);
  assert.equal(result.changed, false);
  assert.deepEqual(result.nextUnlocked, [EchoId.Box]);
});

test('unlock does not duplicate existing echoes', () => {
  const result = computeEchoUnlock(
    [EchoId.Box, EchoId.BombBug],
    EchoId.BombBug,
  );
  assert.equal(result.changed, false);
  assert.deepEqual(result.nextUnlocked, [EchoId.Box, EchoId.BombBug]);
});

test('select changes to requested echo', () => {
  const result = computeEchoSelect(
    [EchoId.Box, EchoId.SpringFlower],
    EchoId.Box,
    EchoId.SpringFlower,
  );
  assert.equal(result.changed, true);
  assert.equal(result.selectedId, EchoId.SpringFlower);
});

test('select fails for locked echo', () => {
  const result = computeEchoSelect(
    [EchoId.Box],
    EchoId.Box,
    EchoId.BombBug,
  );
  assert.equal(result.changed, false);
  assert.equal(result.selectedId, EchoId.Box);
});

test('select same echo is no-op', () => {
  const result = computeEchoSelect(
    [EchoId.Box, EchoId.SpringFlower],
    EchoId.Box,
    EchoId.Box,
  );
  assert.equal(result.changed, false);
  assert.equal(result.selectedId, EchoId.Box);
});

test('cycle forward wraps around', () => {
  const echoes = [EchoId.Box, EchoId.SpringFlower, EchoId.BombBug];
  assert.equal(computeEchoCycle(echoes, EchoId.BombBug, 1), EchoId.Box);
  assert.equal(computeEchoCycle(echoes, EchoId.Box, 1), EchoId.SpringFlower);
});

test('cycle backward wraps around', () => {
  const echoes = [EchoId.Box, EchoId.SpringFlower, EchoId.BombBug];
  assert.equal(computeEchoCycle(echoes, EchoId.Box, -1), EchoId.BombBug);
  assert.equal(computeEchoCycle(echoes, EchoId.SpringFlower, -1), EchoId.Box);
});

test('spawn blocked when current echo not unlocked', () => {
  const result = computeSpawnDecision(
    [EchoId.Box],
    EchoId.BombBug,
    0,
    3,
  );
  assert.equal(result.canSpawn, false);
});

test('spawn reclaims when at limit', () => {
  const result = computeSpawnDecision(
    [EchoId.Box, EchoId.SpringFlower],
    EchoId.Box,
    3,
    3,
  );
  assert.equal(result.canSpawn, true);
  assert.equal(result.shouldReclaim, true);
});

test('applySaveState defaults empty to [Box]', () => {
  const result = computeApplySaveState([], EchoId.SpringFlower);
  assert.deepEqual(result.unlockedSet, [EchoId.Box]);
  assert.equal(result.selectedId, EchoId.Box);
});

test('applySaveState forces Box in unlocked set', () => {
  const result = computeApplySaveState(
    [EchoId.SpringFlower, EchoId.BombBug],
    EchoId.SpringFlower,
  );
  assert.ok(result.unlockedSet.includes(EchoId.Box));
  assert.equal(result.selectedId, EchoId.SpringFlower);
});
