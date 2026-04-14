import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateFlagGate,
  computeCheckpointFromPortal,
  computeCheckpointOverwrite,
  computeProgressFlagSet,
} from './helpers/checkpoint-logic.mjs';

test('flag gate ready when all required flags present', () => {
  const result = evaluateFlagGate(['key-a', 'key-b'], ['key-a', 'key-b', 'key-c']);
  assert.equal(result.isReady, true);
});

test('flag gate not ready when missing one flag', () => {
  const result = evaluateFlagGate(['key-a', 'key-b'], ['key-a']);
  assert.equal(result.isReady, false);
});

test('flag gate not ready when missing all flags', () => {
  const result = evaluateFlagGate(['key-a', 'key-b'], []);
  assert.equal(result.isReady, false);
});

test('flag gate ready with empty required flags array', () => {
  const result = evaluateFlagGate([], []);
  assert.equal(result.isReady, true);
});

test('portal creates checkpoint from target data', () => {
  const cp = computeCheckpointFromPortal('dungeon-hub', 'hub-entry', 100, 200);
  assert.deepEqual(cp, {
    sceneName: 'dungeon-hub',
    markerId: 'hub-entry',
    worldPosition: { x: 100, y: 200, z: 0 },
  });
});

test('BUG#5 regression: checkpoint overwrite detects when deeper checkpoint is replaced', () => {
  const current = { sceneName: 'dungeon-room-a', markerId: 'room-a-entry', worldPosition: { x: 0, y: 0, z: 0 } };
  const next = { sceneName: 'dungeon-room-b', markerId: 'room-b-entry', worldPosition: { x: 50, y: 80, z: 0 } };
  const result = computeCheckpointOverwrite(current, next);
  assert.equal(result.overwritten, true);
  assert.equal(result.previousScene, 'dungeon-room-a');
  assert.equal(result.newScene, 'dungeon-room-b');

  const fresh = computeCheckpointOverwrite(null, next);
  assert.equal(fresh.overwritten, false);
  assert.equal(fresh.previousScene, null);
  assert.equal(fresh.newScene, 'dungeon-room-b');
});

test('setting duplicate progress flag returns changed=false', () => {
  const result = computeProgressFlagSet(['key-a', 'key-b'], 'key-a');
  assert.equal(result.changed, false);
  assert.deepEqual(result.flags, ['key-a', 'key-b']);
});

test('setting new progress flag returns changed=true', () => {
  const result = computeProgressFlagSet(['key-a'], 'key-b');
  assert.equal(result.changed, true);
  assert.ok(result.flags.includes('key-a'));
  assert.ok(result.flags.includes('key-b'));
  assert.equal(result.flags.length, 2);
});

test('setting empty flag is rejected', () => {
  const result = computeProgressFlagSet(['key-a'], '');
  assert.equal(result.changed, false);
  assert.deepEqual(result.flags, ['key-a']);
});

test('setting whitespace-only flag is rejected', () => {
  const result = computeProgressFlagSet(['key-a'], '   ');
  assert.equal(result.changed, false);
  assert.deepEqual(result.flags, ['key-a']);

  const resultNull = computeProgressFlagSet([], null);
  assert.equal(resultNull.changed, false);
  assert.deepEqual(resultNull.flags, []);
});

test('flag gate with single flag works', () => {
  assert.equal(evaluateFlagGate(['boss-defeated'], ['boss-defeated']).isReady, true);
  assert.equal(evaluateFlagGate(['boss-defeated'], []).isReady, false);
});

test('portal checkpoint includes z coordinate', () => {
  const cp = computeCheckpointFromPortal('sky-level', 'sky-entry', 10, 20, 30);
  assert.deepEqual(cp.worldPosition, { x: 10, y: 20, z: 30 });

  const cpNoZ = computeCheckpointFromPortal('ground-level', 'ground-entry', 10, 20);
  assert.equal(cpNoZ.worldPosition.z, 0);
});
